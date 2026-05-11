<?php

namespace App\Controller\Api\V1;

use App\Entity\Appointment;
use App\Entity\AppointmentService;
use App\Entity\BusinessHour;
use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\EmployeeAvailability;
use App\Entity\Service;
use App\Entity\Store;
use App\Repository\AppointmentRepository;
use App\Repository\EmployeeAvailabilityRepository;
use App\Service\BookingService;
use App\Service\CrmService;
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
        private readonly BookingService $bookingService,
        private readonly CrmService $crmService,
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
        $store = $request->query->get('storeId') ? $this->resolveStore((int) $request->query->get('storeId')) : null;

        $items = $this->appointmentRepository->findByRange($from, $to, $employeeId, $store);

        return $this->json([
            'data' => array_map(fn(Appointment $a) => $this->serializeAppointment($a), $items),
            'meta' => [
                'view' => $view,
                'anchorDate' => $anchor->format('Y-m-d'),
                'from' => $this->formatCalendarDateTime($from),
                'to' => $this->formatCalendarDateTime($to),
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
        $this->planningValidator->assertCustomerAvailability($customer, $startAt, $endAt, null);
        $this->planningValidator->assertWithinAvailability($employee, $startAt, $endAt);

        $appointment = (new Appointment())
            ->setEmployee($employee)
            ->setStore($employee->getStore())
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
        $this->planningValidator->assertCustomerAvailability($customer, $startAt, $endAt, $appointment->getId());
        $this->planningValidator->assertWithinAvailability($employee, $startAt, $endAt);

        $appointment
            ->setEmployee($employee)
            ->setStore($employee->getStore())
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

    #[OA\Patch(path: '/api/v1/planning/appointments/{id}/status', tags: ['Planning'], summary: 'Changer le statut d un rendez-vous')]
    #[OA\RequestBody(content: new OA\JsonContent(properties: [new OA\Property(property: 'status', type: 'string', enum: ['scheduled', 'completed', 'cancelled'])]))]
    #[Route('/appointments/{id}/status', name: 'appointments_patch_status', methods: ['PATCH'])]
    public function updateStatus(int $id, Request $request): JsonResponse
    {
        $appointment = $this->appointmentRepository->find($id);
        if (!$appointment instanceof Appointment) {
            throw new NotFoundHttpException('Rendez-vous introuvable.');
        }

        $payload = $this->decodeJson($request);
        $status = (string) ($payload['status'] ?? '');
        $allowed = [Appointment::STATUS_SCHEDULED, Appointment::STATUS_COMPLETED, Appointment::STATUS_CANCELLED];
        $previousStatus = $appointment->getStatus();

        if (!\in_array($status, $allowed, true)) {
            throw new BadRequestHttpException('Statut invalide. Valeurs acceptees : scheduled, completed, cancelled.');
        }

        $appointment->setStatus($status)->touch();
        $this->em->flush();

        if (
            $previousStatus !== Appointment::STATUS_COMPLETED
            && $status === Appointment::STATUS_COMPLETED
            && $appointment->getCustomer() instanceof Customer
        ) {
            $this->crmService->registerCompletedVisit(
                $appointment->getCustomer(),
                sprintf('Completed appointment on %s', $appointment->getStartAt()->format('Y-m-d H:i'))
            );
        }

        return $this->json($this->serializeAppointment($appointment));
    }

    #[OA\Get(path: '/api/v1/planning/slots', tags: ['Planning'], summary: 'Rechercher les creneaux disponibles')]
    #[OA\Parameter(name: 'serviceId', in: 'query', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Parameter(name: 'from', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date'))]
    #[OA\Parameter(name: 'to', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date'))]
    #[OA\Parameter(name: 'employeeId', in: 'query', required: false, schema: new OA\Schema(type: 'integer'))]
    #[Route('/slots', name: 'slots_list', methods: ['GET'])]
    public function listSlots(Request $request): JsonResponse
    {
        $service = $this->em->getRepository(Service::class)->find((int) $request->query->get('serviceId', 0));
        if (!$service instanceof Service) {
            throw new BadRequestHttpException('serviceId invalide.');
        }

        $fromStr = (string) $request->query->get('from', (new \DateTimeImmutable())->format('Y-m-d'));
        $toStr = (string) $request->query->get('to', (new \DateTimeImmutable())->modify('+7 days')->format('Y-m-d'));

        $from = $this->parseDate($fromStr);
        $to = $this->parseDate($toStr);

        if ($to < $from) {
            throw new BadRequestHttpException('to doit etre superieur ou egal a from.');
        }

        if ($to > $from->modify('+30 days')) {
            throw new BadRequestHttpException('La plage de recherche ne peut pas depasser 31 jours.');
        }

        $employeeId = $request->query->get('employeeId') ? (int) $request->query->get('employeeId') : null;
        $employee = $employeeId ? $this->em->getRepository(Employee::class)->find($employeeId) : null;
        $store = $request->query->get('storeId') ? $this->resolveStore((int) $request->query->get('storeId')) : null;

        $inclusiveEnd = $to->modify('+1 day');
        $slots = $this->bookingService->listPublicSlots($service, $from, $inclusiveEnd, $employee instanceof Employee ? $employee : null, $store);

        return $this->json(['data' => $slots]);
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

        $this->planningValidator->assertAvailabilityWindowWithinBusinessHours(
            $dayOfWeek,
            $availability->getStartTime(),
            $availability->getEndTime()
        );

        $this->em->persist($availability);
        $this->em->flush();

        return $this->json($this->serializeAvailability($availability), 201);
    }

    #[OA\Delete(path: '/api/v1/planning/availabilities/{id}', tags: ['Planning'], summary: 'Supprimer une disponibilite employe')]
    #[Route('/availabilities/{id}', name: 'availability_delete', methods: ['DELETE'])]
    public function deleteAvailability(int $id): JsonResponse
    {
        $availability = $this->availabilityRepository->find($id);
        if (!$availability instanceof EmployeeAvailability) {
            throw new NotFoundHttpException('Disponibilite introuvable.');
        }

        $this->em->remove($availability);
        $this->em->flush();

        return $this->json(['status' => 'deleted']);
    }

    #[OA\Get(path: '/api/v1/planning/business-hours', tags: ['Planning'], summary: 'Lister les horaires generaux du salon')]
    #[Route('/business-hours', name: 'business_hours_list', methods: ['GET'])]
    public function listBusinessHours(): JsonResponse
    {
        $store = null;
        if (isset($_GET['storeId']) && $_GET['storeId'] !== '') {
            $store = $this->resolveStore((int) $_GET['storeId']);
        }
        $items = $this->em->getRepository(BusinessHour::class)->findForStore($store);

        return $this->json(array_map(fn(BusinessHour $item) => $this->serializeBusinessHour($item), $items));
    }

    #[OA\Put(path: '/api/v1/planning/business-hours', tags: ['Planning'], summary: 'Remplacer les horaires generaux du salon')]
    #[Route('/business-hours', name: 'business_hours_replace', methods: ['PUT'])]
    public function replaceBusinessHours(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $items = $payload['items'] ?? null;
        if (!is_array($items) || count($items) !== 7) {
            throw new BadRequestHttpException('items doit contenir 7 jours.');
        }
        $store = isset($payload['storeId']) && $payload['storeId'] !== null && $payload['storeId'] !== ''
            ? $this->resolveStore((int) $payload['storeId'])
            : null;

        $repository = $this->em->getRepository(BusinessHour::class);
        $existing = [];
        foreach ($repository->findForStore($store) as $businessHour) {
            $existing[$businessHour->getDayOfWeek()] = $businessHour;
        }

        foreach ($items as $item) {
            if (!is_array($item)) {
                throw new BadRequestHttpException('Ligne horaire invalide.');
            }

            $dayOfWeek = (int) ($item['dayOfWeek'] ?? 0);
            if ($dayOfWeek < 1 || $dayOfWeek > 7) {
                throw new BadRequestHttpException('dayOfWeek doit etre entre 1 et 7.');
            }

            $startTime = $this->parseTime((string) ($item['startTime'] ?? '09:00'));
            $endTime = $this->parseTime((string) ($item['endTime'] ?? '18:00'));
            if ($endTime <= $startTime) {
                throw new BadRequestHttpException('endTime doit etre apres startTime.');
            }

            if ((bool) ($item['isOpen'] ?? true)) {
                foreach ($this->availabilityRepository->findBy(['dayOfWeek' => $dayOfWeek]) as $availability) {
                    $availabilityStart = $availability->getStartTime()->format('H:i:s');
                    $availabilityEnd = $availability->getEndTime()->format('H:i:s');
                    if (
                        $availabilityStart < $startTime->format('H:i:s')
                        || $availabilityEnd > $endTime->format('H:i:s')
                    ) {
                        throw new BadRequestHttpException(sprintf(
                            'Impossible de reduire les horaires du salon sur %s tant qu une plage employe depasse encore cette amplitude.',
                            strtolower($this->dayOfWeekLabel($dayOfWeek))
                        ));
                    }
                }
            } elseif ($this->availabilityRepository->findBy(['dayOfWeek' => $dayOfWeek]) !== []) {
                throw new BadRequestHttpException(sprintf(
                    'Impossible de fermer %s tant que des horaires employe existent encore sur ce jour.',
                    strtolower($this->dayOfWeekLabel($dayOfWeek))
                ));
            }

            $businessHour = $existing[$dayOfWeek] ?? (new BusinessHour())->setDayOfWeek($dayOfWeek)->setStore($store);
            $businessHour
                ->setStartTime($startTime)
                ->setEndTime($endTime)
                ->setIsOpen((bool) ($item['isOpen'] ?? true));

            $this->em->persist($businessHour);
        }

        $this->em->flush();

        return $this->json(array_map(
            fn(BusinessHour $item) => $this->serializeBusinessHour($item),
            $repository->findForStore($store)
        ));
    }

    #[Route('/employees', name: 'employees_list', methods: ['GET'])]
    public function listEmployees(Request $request): JsonResponse
    {
        $qb = $this->em->getRepository(Employee::class)->createQueryBuilder('e')
            ->where('e.status = :status')
            ->setParameter('status', 'active')
            ->orderBy('e.fullName', 'ASC');
        if ($request->query->get('storeId')) {
            $qb->andWhere('e.store = :store')->setParameter('store', $this->resolveStore((int) $request->query->get('storeId')));
        }
        $items = $qb->getQuery()->getResult();
        return $this->json(array_map(fn(Employee $e) => [
            'id' => $e->getId(),
            'fullName' => $e->getFullName(),
            'storeId' => $e->getStore()?->getId(),
        ], $items));
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
        if (!$employee instanceof Employee || $employee->getStatus() !== 'active') {
            throw new BadRequestHttpException('employeeId invalide.');
        }

        return $employee;
    }

    private function resolveStore(int $id): Store
    {
        $store = $this->em->getRepository(Store::class)->find($id);
        if (!$store instanceof Store) {
            throw new BadRequestHttpException('storeId invalide.');
        }

        return $store;
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
                ->setDurationMinutes($lineDuration)
                ->setUnitPrice(number_format((float) $service->getPrice(), 2, '.', ''));
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

    private function parseDate(string $value): \DateTimeImmutable
    {
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date) {
            throw new BadRequestHttpException('Format de date invalide (YYYY-MM-DD attendu).');
        }

        return $date->setTime(0, 0);
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
            'bookingSource' => $a->getBookingSource(),
            'paymentMode' => $a->getPaymentMode(),
            'paymentStatus' => $a->getPaymentStatus(),
            'employee' => ['id' => $a->getEmployee()->getId(), 'fullName' => $a->getEmployee()->getFullName()],
            'store' => $a->getStore() ? ['id' => $a->getStore()?->getId(), 'name' => $a->getStore()?->getName()] : null,
            'customer' => $a->getCustomer() ? ['id' => $a->getCustomer()?->getId(), 'fullName' => $a->getCustomer()?->getFullName()] : null,
            'startAt' => $this->formatCalendarDateTime($a->getStartAt()),
            'endAt' => $this->formatCalendarDateTime($a->getEndAt()),
            'notes' => $a->getNotes(),
            'services' => array_map(fn(AppointmentService $aps) => [
                'serviceId' => $aps->getService()->getId(),
                'serviceName' => $aps->getService()->getName(),
                'quantity' => $aps->getQuantity(),
                'durationMinutes' => $aps->getDurationMinutes(),
                'unitPrice' => (float) $aps->getUnitPrice(),
                'lineTotal' => round((float) $aps->getUnitPrice() * $aps->getQuantity(), 2),
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

    private function serializeBusinessHour(BusinessHour $item): array
    {
        return [
            'id' => $item->getId(),
            'dayOfWeek' => $item->getDayOfWeek(),
            'storeId' => $item->getStore()?->getId(),
            'startTime' => $item->getStartTime()->format('H:i'),
            'endTime' => $item->getEndTime()->format('H:i'),
            'isOpen' => $item->isOpen(),
        ];
    }

    private function formatCalendarDateTime(\DateTimeImmutable $dateTime): string
    {
        return $dateTime->format('Y-m-d\TH:i:s');
    }

    private function dayOfWeekLabel(int $dayOfWeek): string
    {
        return match ($dayOfWeek) {
            1 => 'Lundi',
            2 => 'Mardi',
            3 => 'Mercredi',
            4 => 'Jeudi',
            5 => 'Vendredi',
            6 => 'Samedi',
            7 => 'Dimanche',
            default => 'Jour inconnu',
        };
    }
}
