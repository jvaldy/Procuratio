<?php

namespace App\Controller\Api\V1;

use App\Entity\Appointment;
use App\Entity\AppointmentService;
use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\EmployeeAvailability;
use App\Entity\Service;
use App\Repository\AppointmentRepository;
use App\Repository\EmployeeAvailabilityRepository;
use App\Service\PlanningValidator;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1/planning', name: 'api_v1_planning_')]
#[IsGranted('ROLE_EMPLOYEE')]
class PlanningController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AppointmentRepository $appointmentRepository,
        private readonly EmployeeAvailabilityRepository $availabilityRepository,
        private readonly PlanningValidator $planningValidator,
    ) {
    }

    #[OA\Get(path: '/api/v1/planning/appointments', tags: ['Planning'], summary: 'Lister les rendez-vous')]
    #[OA\Parameter(name: 'view', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['day', 'week', 'month', 'year'], default: 'week'))]
    #[OA\Parameter(name: 'date', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date'))]
    #[OA\Parameter(name: 'employeeId', in: 'query', required: false, schema: new OA\Schema(type: 'integer'))]
    #[Route('/appointments', name: 'appointments_list', methods: ['GET'])]
    public function listAppointments(Request $request): JsonResponse
    {
        [$from, $to, $view, $anchor] = $this->resolveRange(
            (string) $request->query->get('view', 'week'),
            (string) $request->query->get('date', (new \DateTimeImmutable())->format('Y-m-d'))
        );
        $employeeId = $request->query->get('employeeId') ? (int) $request->query->get('employeeId') : null;

        $items = $this->appointmentRepository->findByRange($from, $to, $employeeId);

        return $this->json([
            'data' => array_map(fn(Appointment $a) => $this->serializeAppointment($a), $items),
            'meta' => [
                'view' => $view,
                'anchorDate' => $anchor->format('Y-m-d'),
                'from' => $from->format(DATE_ATOM),
                'to' => $to->format(DATE_ATOM),
            ],
        ]);
    }

    #[OA\Post(path: '/api/v1/planning/appointments', tags: ['Planning'], summary: 'Creer un rendez-vous')]
    #[Route('/appointments', name: 'appointments_create', methods: ['POST'])]
    public function createAppointment(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $employee = $this->resolveEmployee((int) ($payload['employeeId'] ?? 0));
        $customer = $this->resolveCustomer($payload['customerId'] ?? null);
        $startAt = $this->parseDateTime((string) ($payload['startAt'] ?? ''));
        $servicesPayload = $payload['services'] ?? [];

        if (!is_array($servicesPayload) || $servicesPayload === []) {
            throw new BadRequestHttpException('services est requis.');
        }

        [$appointmentServices, $durationMinutes] = $this->buildAppointmentServices($servicesPayload);
        $endAt = $startAt->modify(sprintf('+%d minutes', $durationMinutes));

        $this->planningValidator->assertNoConflict($employee, $startAt, $endAt, null);
        $this->planningValidator->assertWithinAvailability($employee, $startAt, $endAt);

        $appointment = (new Appointment())
            ->setEmployee($employee)
            ->setCustomer($customer)
            ->setStartAt($startAt)
            ->setEndAt($endAt)
            ->setStatus(Appointment::STATUS_SCHEDULED)
            ->setNotes(isset($payload['notes']) ? trim((string) $payload['notes']) : null);

        foreach ($appointmentServices as $aps) {
            $appointment->addService($aps);
        }

        $this->em->persist($appointment);
        $this->em->flush();

        return $this->json($this->serializeAppointment($appointment), 201);
    }

    #[OA\Put(path: '/api/v1/planning/appointments/{id}', tags: ['Planning'], summary: 'Modifier un rendez-vous')]
    #[Route('/appointments/{id}', name: 'appointments_update', methods: ['PUT'])]
    public function updateAppointment(int $id, Request $request): JsonResponse
    {
        $appointment = $this->appointmentRepository->find($id);
        if (!$appointment instanceof Appointment) {
            throw new NotFoundHttpException('Rendez-vous introuvable.');
        }

        $payload = $this->decodeJson($request);
        $employee = $this->resolveEmployee((int) ($payload['employeeId'] ?? $appointment->getEmployee()->getId()));
        $customer = array_key_exists('customerId', $payload) ? $this->resolveCustomer($payload['customerId']) : $appointment->getCustomer();
        $startAt = array_key_exists('startAt', $payload) ? $this->parseDateTime((string) $payload['startAt']) : $appointment->getStartAt();

        $servicesPayload = $payload['services'] ?? null;
        if ($servicesPayload !== null && !is_array($servicesPayload)) {
            throw new BadRequestHttpException('services doit etre un tableau.');
        }

        if ($servicesPayload !== null) {
            [$appointmentServices, $durationMinutes] = $this->buildAppointmentServices($servicesPayload);
            $appointment->clearServices();
            foreach ($appointmentServices as $aps) {
                $appointment->addService($aps);
            }
        } else {
            $durationMinutes = array_reduce(
                $appointment->getServices()->toArray(),
                fn(int $sum, AppointmentService $aps) => $sum + $aps->getDurationMinutes(),
                0
            );
        }

        $endAt = $startAt->modify(sprintf('+%d minutes', $durationMinutes));
        $this->planningValidator->assertNoConflict($employee, $startAt, $endAt, $appointment->getId());
        $this->planningValidator->assertWithinAvailability($employee, $startAt, $endAt);

        $appointment
            ->setEmployee($employee)
            ->setCustomer($customer)
            ->setStartAt($startAt)
            ->setEndAt($endAt)
            ->setNotes(array_key_exists('notes', $payload) ? (string) $payload['notes'] : $appointment->getNotes());

        $appointment->touch();
        $this->em->flush();

        return $this->json($this->serializeAppointment($appointment));
    }

    #[OA\Post(path: '/api/v1/planning/appointments/{id}/cancel', tags: ['Planning'], summary: 'Annuler un rendez-vous')]
    #[Route('/appointments/{id}/cancel', name: 'appointments_cancel', methods: ['POST'])]
    public function cancelAppointment(int $id): JsonResponse
    {
        $appointment = $this->appointmentRepository->find($id);
        if (!$appointment instanceof Appointment) {
            throw new NotFoundHttpException('Rendez-vous introuvable.');
        }

        $appointment->setStatus(Appointment::STATUS_CANCELLED);
        $appointment->touch();
        $this->em->flush();

        return $this->json($this->serializeAppointment($appointment));
    }

    #[OA\Get(path: '/api/v1/planning/availabilities', tags: ['Planning'], summary: 'Lister les disponibilites employe')]
    #[OA\Parameter(name: 'employeeId', in: 'query', required: true, schema: new OA\Schema(type: 'integer'))]
    #[Route('/availabilities', name: 'availability_list', methods: ['GET'])]
    public function listAvailability(Request $request): JsonResponse
    {
        $employee = $this->resolveEmployee((int) $request->query->get('employeeId', 0));
        $items = $this->availabilityRepository->findBy(['employee' => $employee], ['dayOfWeek' => 'ASC', 'startTime' => 'ASC']);

        return $this->json(array_map(fn(EmployeeAvailability $a) => $this->serializeAvailability($a), $items));
    }

    #[OA\Post(path: '/api/v1/planning/availabilities', tags: ['Planning'], summary: 'Creer une disponibilite employe')]
    #[Route('/availabilities', name: 'availability_create', methods: ['POST'])]
    public function createAvailability(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $employee = $this->resolveEmployee((int) ($payload['employeeId'] ?? 0));
        $dayOfWeek = (int) ($payload['dayOfWeek'] ?? 0);
        if ($dayOfWeek < 1 || $dayOfWeek > 7) {
            throw new BadRequestHttpException('dayOfWeek doit etre entre 1 et 7.');
        }

        $availability = (new EmployeeAvailability())
            ->setEmployee($employee)
            ->setDayOfWeek($dayOfWeek)
            ->setStartTime($this->parseTime((string) ($payload['startTime'] ?? '')))
            ->setEndTime($this->parseTime((string) ($payload['endTime'] ?? '')))
            ->setIsAvailable((bool) ($payload['isAvailable'] ?? true));

        if ($availability->getEndTime() <= $availability->getStartTime()) {
            throw new BadRequestHttpException('endTime doit etre apres startTime.');
        }

        $this->em->persist($availability);
        $this->em->flush();

        return $this->json($this->serializeAvailability($availability), 201);
    }

    #[Route('/employees', name: 'employees_list', methods: ['GET'])]
    public function listEmployees(): JsonResponse
    {
        $items = $this->em->getRepository(Employee::class)->findBy([], ['fullName' => 'ASC']);
        return $this->json(array_map(fn(Employee $e) => ['id' => $e->getId(), 'fullName' => $e->getFullName()], $items));
    }

    private function decodeJson(Request $request): array
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Payload JSON invalide.');
        }

        return $payload;
    }

    private function resolveEmployee(int $id): Employee
    {
        $employee = $this->em->getRepository(Employee::class)->find($id);
        if (!$employee instanceof Employee) {
            throw new BadRequestHttpException('employeeId invalide.');
        }

        return $employee;
    }

    private function resolveCustomer(mixed $customerId): ?Customer
    {
        if ($customerId === null || $customerId === '') {
            return null;
        }
        $customer = $this->em->getRepository(Customer::class)->find((int) $customerId);
        if (!$customer instanceof Customer) {
            throw new BadRequestHttpException('customerId invalide.');
        }

        return $customer;
    }

    /**
     * @param array<int, mixed> $servicesPayload
     * @return array{0: array<int, AppointmentService>, 1: int}
     */
    private function buildAppointmentServices(array $servicesPayload): array
    {
        $out = [];
        $duration = 0;

        foreach ($servicesPayload as $item) {
            if (!is_array($item)) {
                throw new BadRequestHttpException('service invalide.');
            }
            $service = $this->em->getRepository(Service::class)->find((int) ($item['serviceId'] ?? 0));
            if (!$service instanceof Service) {
                throw new BadRequestHttpException('serviceId invalide.');
            }
            $quantity = max(1, (int) ($item['quantity'] ?? 1));
            $serviceDuration = max(5, (int) ($item['durationMinutes'] ?? $service->getDurationMinutes()));
            $lineDuration = $quantity * $serviceDuration;

            $aps = (new AppointmentService())
                ->setService($service)
                ->setQuantity($quantity)
                ->setDurationMinutes($lineDuration);
            $out[] = $aps;
            $duration += $lineDuration;
        }

        return [$out, $duration];
    }

    private function parseDateTime(string $value): \DateTimeImmutable
    {
        try {
            return new \DateTimeImmutable($value);
        } catch (\Throwable) {
            throw new BadRequestHttpException('Format startAt invalide.');
        }
    }

    private function parseTime(string $value): \DateTimeImmutable
    {
        $dt = \DateTimeImmutable::createFromFormat('H:i', $value) ?: \DateTimeImmutable::createFromFormat('H:i:s', $value);
        if (!$dt) {
            throw new BadRequestHttpException('Format heure invalide.');
        }

        return $dt;
    }

    /**
     * @return array{0: \DateTimeImmutable, 1: \DateTimeImmutable, 2: string, 3: \DateTimeImmutable}
     */
    private function resolveRange(string $view, string $date): array
    {
        $anchor = new \DateTimeImmutable($date);
        $start = $anchor->setTime(0, 0);
        $mode = in_array($view, ['day', 'week', 'month', 'year'], true) ? $view : 'week';

        if ($mode === 'day') {
            $end = $start->modify('+1 day');
        } elseif ($mode === 'week') {
            $start = $start->modify('monday this week');
            $end = $start->modify('+7 days');
        } elseif ($mode === 'month') {
            $start = $start->modify('first day of this month');
            $end = $start->modify('+1 month');
        } else {
            $start = $start->setDate((int) $start->format('Y'), 1, 1);
            $end = $start->modify('+1 year');
        }

        return [$start, $end, $mode, $anchor];
    }

    private function serializeAppointment(Appointment $a): array
    {
        return [
            'id' => $a->getId(),
            'status' => $a->getStatus(),
            'employee' => ['id' => $a->getEmployee()->getId(), 'fullName' => $a->getEmployee()->getFullName()],
            'customer' => $a->getCustomer() ? ['id' => $a->getCustomer()?->getId(), 'fullName' => $a->getCustomer()?->getFullName()] : null,
            'startAt' => $a->getStartAt()->format(DATE_ATOM),
            'endAt' => $a->getEndAt()->format(DATE_ATOM),
            'notes' => $a->getNotes(),
            'services' => array_map(fn(AppointmentService $aps) => [
                'serviceId' => $aps->getService()->getId(),
                'serviceName' => $aps->getService()->getName(),
                'quantity' => $aps->getQuantity(),
                'durationMinutes' => $aps->getDurationMinutes(),
            ], $a->getServices()->toArray()),
        ];
    }

    private function serializeAvailability(EmployeeAvailability $a): array
    {
        return [
            'id' => $a->getId(),
            'employeeId' => $a->getEmployee()->getId(),
            'dayOfWeek' => $a->getDayOfWeek(),
            'startTime' => $a->getStartTime()->format('H:i'),
            'endTime' => $a->getEndTime()->format('H:i'),
            'isAvailable' => $a->isAvailable(),
        ];
    }
}

