<?php

namespace App\Controller\Api\V1;

use App\Entity\Appointment;
use App\Entity\AppointmentService;
use App\Entity\AppointmentStatusHistory;
use App\Entity\BookingSession;
use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\Service;
use App\Entity\User;
use App\Repository\AppointmentRepository;
use App\Repository\AppointmentStatusHistoryRepository;
use App\Repository\BookingSessionRepository;
use App\Service\BookingService;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1', name: 'api_v1_booking_')]
class ClientBookingController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly BookingService $bookingService,
        private readonly BookingSessionRepository $bookingSessionRepository,
        private readonly AppointmentRepository $appointmentRepository,
        private readonly AppointmentStatusHistoryRepository $historyRepository,
    ) {
    }

    #[OA\Get(path: '/api/v1/public/booking/slots', tags: ['Booking client'], summary: 'Lister les creneaux disponibles')]
    #[Route('/public/booking/slots', name: 'public_slots', methods: ['GET'])]
    public function listPublicSlots(Request $request): JsonResponse
    {
        $service = $this->resolveService((int) $request->query->get('serviceId', 0));
        $employee = $request->query->get('employeeId') ? $this->resolveEmployee((int) $request->query->get('employeeId')) : null;
        $from = $this->parseDate((string) $request->query->get('from', (new \DateTimeImmutable())->format('Y-m-d')));
        $to = $this->parseDate((string) $request->query->get('to', $from->modify('+7 days')->format('Y-m-d')))->setTime(23, 59);

        if ($to <= $from) {
            throw new BadRequestHttpException('to doit etre apres from.');
        }

        return $this->json([
            'data' => $this->bookingService->listPublicSlots($service, $from, $to, $employee),
            'meta' => [
                'serviceId' => $service->getId(),
                'employeeId' => $employee?->getId(),
                'from' => $from->format(DATE_ATOM),
                'to' => $to->format(DATE_ATOM),
            ],
        ]);
    }

    #[OA\Get(path: '/api/v1/public/booking/employees', tags: ['Booking client'], summary: 'Lister les employes reservables')]
    #[Route('/public/booking/employees', name: 'public_employees', methods: ['GET'])]
    public function listPublicEmployees(): JsonResponse
    {
        $employees = $this->em->getRepository(Employee::class)->findBy([], ['fullName' => 'ASC']);
        return $this->json([
            'data' => array_map(fn(Employee $employee) => [
                'id' => $employee->getId(),
                'fullName' => $employee->getFullName(),
            ], $employees),
        ]);
    }

    #[OA\Post(path: '/api/v1/bookings/sessions', tags: ['Booking client'], summary: 'Ouvrir une session de reservation')]
    #[Route('/bookings/sessions', name: 'sessions_create', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function openSession(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $customer = $this->resolveCurrentCustomer();
        $employee = $this->resolveEmployee((int) ($payload['employeeId'] ?? 0));
        $service = $this->resolveService((int) ($payload['serviceId'] ?? 0));
        $startAt = $this->parseDateTime((string) ($payload['startAt'] ?? ''));
        $paymentMode = (string) ($payload['paymentMode'] ?? Appointment::PAYMENT_MODE_IN_STORE);

        $session = $this->bookingService->openBookingSession($customer, $employee, $service, $startAt, $paymentMode);
        return $this->json($this->serializeSession($session), 201);
    }

    #[OA\Post(path: '/api/v1/bookings/sessions/{token}/confirm', tags: ['Booking client'], summary: 'Confirmer une reservation')]
    #[Route('/bookings/sessions/{token}/confirm', name: 'sessions_confirm', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function confirmSession(string $token, Request $request): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $session = $this->bookingSessionRepository->findOneBy(['sessionToken' => $token]);
        if (!$session instanceof BookingSession || $session->getCustomer()->getId() !== $customer->getId()) {
            throw new NotFoundHttpException('Session de reservation introuvable.');
        }

        $payload = $this->decodeJson($request, true);
        $appointment = $this->bookingService->confirmBookingSession($session, isset($payload['notes']) ? (string) $payload['notes'] : null);

        return $this->json($this->serializeAppointment($appointment), 201);
    }

    #[OA\Get(path: '/api/v1/client/appointments', tags: ['Booking client'], summary: 'Lister mes rendez-vous')]
    #[Route('/client/appointments', name: 'client_appointments', methods: ['GET'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function listCustomerAppointments(Request $request): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $status = (string) $request->query->get('status', 'upcoming');
        $now = new \DateTimeImmutable();

        $qb = $this->em->getRepository(Appointment::class)->createQueryBuilder('a')
            ->leftJoin('a.employee', 'e')->addSelect('e')
            ->leftJoin('a.services', 'aps')->addSelect('aps')
            ->leftJoin('aps.service', 's')->addSelect('s')
            ->where('a.customer = :customer')
            ->setParameter('customer', $customer);

        if ($status === 'cancelled') {
            $qb->andWhere('a.status = :cancelled')->setParameter('cancelled', Appointment::STATUS_CANCELLED);
        } elseif ($status === 'past') {
            $qb->andWhere('a.endAt < :now')->andWhere('a.status != :cancelled')->setParameter('now', $now)->setParameter('cancelled', Appointment::STATUS_CANCELLED);
        } else {
            $qb->andWhere('a.startAt >= :now')->andWhere('a.status != :cancelled')->setParameter('now', $now)->setParameter('cancelled', Appointment::STATUS_CANCELLED);
        }

        $items = $qb->orderBy('a.startAt', $status === 'past' ? 'DESC' : 'ASC')->setMaxResults(200)->getQuery()->getResult();

        return $this->json([
            'data' => array_map(fn(Appointment $a) => $this->serializeAppointment($a), $items),
            'meta' => ['status' => $status],
        ]);
    }

    #[OA\Get(path: '/api/v1/client/appointments/{id}', tags: ['Booking client'], summary: 'Detail d un rendez-vous client')]
    #[Route('/client/appointments/{id}', name: 'client_appointments_detail', methods: ['GET'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function getCustomerAppointment(int $id): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $appointment = $this->appointmentRepository->find($id);
        if (!$appointment instanceof Appointment || !$appointment->getCustomer() || $appointment->getCustomer()->getId() !== $customer->getId()) {
            throw new NotFoundHttpException('Rendez-vous introuvable.');
        }

        $history = $this->historyRepository->findBy(['appointment' => $appointment], ['createdAt' => 'ASC']);

        return $this->json([
            'appointment' => $this->serializeAppointment($appointment),
            'history' => array_map(fn(AppointmentStatusHistory $item) => $this->serializeHistory($item), $history),
        ]);
    }

    #[OA\Post(path: '/api/v1/client/appointments/{id}/reschedule', tags: ['Booking client'], summary: 'Replanifier un rendez-vous client')]
    #[Route('/client/appointments/{id}/reschedule', name: 'client_appointments_reschedule', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function reschedule(int $id, Request $request): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $appointment = $this->appointmentRepository->find($id);
        if (!$appointment instanceof Appointment) {
            throw new NotFoundHttpException('Rendez-vous introuvable.');
        }

        $payload = $this->decodeJson($request);
        $employee = $this->resolveEmployee((int) ($payload['employeeId'] ?? $appointment->getEmployee()->getId()));
        $startAt = $this->parseDateTime((string) ($payload['startAt'] ?? ''));
        $updated = $this->bookingService->rescheduleCustomerAppointment($appointment, $customer, $employee, $startAt);

        return $this->json($this->serializeAppointment($updated));
    }

    #[OA\Post(path: '/api/v1/client/appointments/{id}/cancel', tags: ['Booking client'], summary: 'Annuler un rendez-vous client')]
    #[Route('/client/appointments/{id}/cancel', name: 'client_appointments_cancel', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function cancel(int $id, Request $request): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $appointment = $this->appointmentRepository->find($id);
        if (!$appointment instanceof Appointment) {
            throw new NotFoundHttpException('Rendez-vous introuvable.');
        }

        $payload = $this->decodeJson($request, true);
        $cancelled = $this->bookingService->cancelCustomerAppointment($appointment, $customer, isset($payload['reason']) ? (string) $payload['reason'] : null);

        return $this->json($this->serializeAppointment($cancelled));
    }

    private function decodeJson(Request $request, bool $allowEmpty = false): array
    {
        if ($allowEmpty && trim($request->getContent()) === '') {
            return [];
        }
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Payload JSON invalide.');
        }

        return $payload;
    }

    private function resolveCurrentCustomer(): Customer
    {
        /** @var User|null $user */
        $user = $this->getUser();
        if (!$user) {
            throw new AccessDeniedHttpException('Utilisateur non connecte.');
        }
        $customer = $this->em->getRepository(Customer::class)->findOneBy(['user' => $user]);
        if (!$customer instanceof Customer) {
            throw new AccessDeniedHttpException('Compte client requis.');
        }

        return $customer;
    }

    private function resolveEmployee(int $id): Employee
    {
        $employee = $this->em->getRepository(Employee::class)->find($id);
        if (!$employee instanceof Employee) {
            throw new BadRequestHttpException('employeeId invalide.');
        }

        return $employee;
    }

    private function resolveService(int $id): Service
    {
        $service = $this->em->getRepository(Service::class)->find($id);
        if (!$service instanceof Service || !$service->isActive()) {
            throw new BadRequestHttpException('serviceId invalide.');
        }

        return $service;
    }

    private function parseDate(string $value): \DateTimeImmutable
    {
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date) {
            throw new BadRequestHttpException('Format date invalide (attendu: YYYY-MM-DD).');
        }

        return $date->setTime(0, 0);
    }

    private function parseDateTime(string $value): \DateTimeImmutable
    {
        try {
            return new \DateTimeImmutable($value);
        } catch (\Throwable) {
            throw new BadRequestHttpException('Format startAt invalide.');
        }
    }

    private function serializeSession(BookingSession $session): array
    {
        return [
            'token' => $session->getSessionToken(),
            'status' => $session->getStatus(),
            'paymentMode' => $session->getPaymentMode(),
            'paymentStatus' => $session->getPaymentStatus(),
            'employee' => [
                'id' => $session->getEmployee()->getId(),
                'fullName' => $session->getEmployee()->getFullName(),
            ],
            'service' => [
                'id' => $session->getService()->getId(),
                'name' => $session->getService()->getName(),
            ],
            'startAt' => $this->formatCalendarDateTime($session->getStartAt()),
            'endAt' => $this->formatCalendarDateTime($session->getEndAt()),
            'expiresAt' => $this->formatCalendarDateTime($session->getExpiresAt()),
        ];
    }

    private function serializeAppointment(Appointment $appointment): array
    {
        return [
            'id' => $appointment->getId(),
            'status' => $appointment->getStatus(),
            'bookingSource' => $appointment->getBookingSource(),
            'paymentMode' => $appointment->getPaymentMode(),
            'paymentStatus' => $appointment->getPaymentStatus(),
            'employee' => [
                'id' => $appointment->getEmployee()->getId(),
                'fullName' => $appointment->getEmployee()->getFullName(),
            ],
            'customer' => $appointment->getCustomer() ? [
                'id' => $appointment->getCustomer()?->getId(),
                'fullName' => $appointment->getCustomer()?->getFullName(),
            ] : null,
            'startAt' => $this->formatCalendarDateTime($appointment->getStartAt()),
            'endAt' => $this->formatCalendarDateTime($appointment->getEndAt()),
            'notes' => $appointment->getNotes(),
            'services' => array_map(fn(AppointmentService $aps) => [
                'serviceId' => $aps->getService()->getId(),
                'serviceName' => $aps->getService()->getName(),
                'quantity' => $aps->getQuantity(),
                'durationMinutes' => $aps->getDurationMinutes(),
            ], $appointment->getServices()->toArray()),
        ];
    }

    private function serializeHistory(AppointmentStatusHistory $item): array
    {
        return [
            'id' => $item->getId(),
            'fromStatus' => $item->getFromStatus(),
            'toStatus' => $item->getToStatus(),
            'changedBy' => $item->getChangedBy(),
            'reason' => $item->getReason(),
            'createdAt' => $this->formatCalendarDateTime($item->getCreatedAt()),
        ];
    }

    private function formatCalendarDateTime(\DateTimeImmutable $dateTime): string
    {
        return $dateTime->format('Y-m-d\TH:i:s');
    }
}
