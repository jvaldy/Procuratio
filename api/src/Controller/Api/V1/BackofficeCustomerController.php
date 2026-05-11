<?php

namespace App\Controller\Api\V1;

use App\Entity\Appointment;
use App\Entity\AppointmentStatusHistory;
use App\Entity\Customer;
use App\Entity\GiftVoucher;
use App\Entity\LoyaltyAccount;
use App\Entity\LoyaltyEvent;
use App\Entity\NotificationLog;
use App\Entity\Order;
use App\Entity\OrderItem;
use App\Entity\Payment;
use App\Entity\Sale;
use App\Entity\SaleItem;
use App\Entity\Store;
use App\Entity\User;
use App\Repository\CustomerRepository;
use App\Repository\SaleRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[Route('/api/v1/backoffice/customers', name: 'api_v1_backoffice_customers_')]
#[IsGranted('ROLE_EMPLOYEE')]
class BackofficeCustomerController extends AbstractController
{
    public function __construct(
        private readonly CustomerRepository $customerRepository,
        private readonly SaleRepository $saleRepository,
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
    }

    #[OA\Get(path: '/api/v1/backoffice/customers', tags: ['Customers'], summary: 'List back-office customers')]
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('perPage', 20)));
        $term = $request->query->get('q');

        $result = $this->customerRepository->searchPaginated(is_string($term) ? $term : null, $page, $perPage);

        return $this->json([
            'data' => array_map(fn(Customer $customer) => $this->serializeCustomerListItem($customer), $result['items']),
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $perPage),
            ],
        ]);
    }

    #[OA\Get(path: '/api/v1/backoffice/customers/{id}', tags: ['Customers'], summary: 'Read a unified customer file')]
    #[Route('/{id}', name: 'detail', methods: ['GET'])]
    public function detail(int $id): JsonResponse
    {
        $customer = $this->customerRepository->find($id);
        if (!$customer instanceof Customer) {
            throw new NotFoundHttpException('Customer not found.');
        }

        $sales = $this->saleRepository->findCustomerHistory($customer->getId(), 1, 20)['items'];
        $orders = $this->em->getRepository(Order::class)->findBy(['customer' => $customer], ['createdAt' => 'DESC'], 20);
        $appointmentsUpcoming = $this->em->getRepository(Appointment::class)->createQueryBuilder('a')
            ->leftJoin('a.employee', 'e')->addSelect('e')
            ->leftJoin('a.services', 'aps')->addSelect('aps')
            ->leftJoin('aps.service', 'svc')->addSelect('svc')
            ->where('a.customer = :customer')
            ->andWhere('a.startAt >= :now')
            ->setParameter('customer', $customer)
            ->setParameter('now', new \DateTimeImmutable())
            ->orderBy('a.startAt', 'ASC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult();
        $appointmentsPast = $this->em->getRepository(Appointment::class)->createQueryBuilder('a')
            ->leftJoin('a.employee', 'e')->addSelect('e')
            ->leftJoin('a.services', 'aps')->addSelect('aps')
            ->leftJoin('aps.service', 'svc')->addSelect('svc')
            ->where('a.customer = :customer')
            ->andWhere('a.startAt < :now')
            ->setParameter('customer', $customer)
            ->setParameter('now', new \DateTimeImmutable())
            ->orderBy('a.startAt', 'DESC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult();
        $appointmentHistory = $this->em->getRepository(AppointmentStatusHistory::class)->findBy(['customer' => $customer], ['createdAt' => 'DESC'], 20);
        $loyaltyAccount = $this->em->getRepository(LoyaltyAccount::class)->findOneBy(['customer' => $customer]);
        $loyaltyEvents = $this->em->getRepository(LoyaltyEvent::class)->findBy(['customer' => $customer], ['createdAt' => 'DESC'], 20);
        $giftVouchers = $this->em->getRepository(GiftVoucher::class)->findBy(['customer' => $customer], ['createdAt' => 'DESC'], 20);
        $notificationLogs = $this->em->getRepository(NotificationLog::class)->findBy(['customer' => $customer], ['createdAt' => 'DESC'], 20);

        return $this->json([
            'customer' => $this->serializeCustomerListItem($customer),
            'summary' => [
                'salesCount' => count($sales),
                'ordersCount' => count($orders),
                'upcomingAppointmentsCount' => count($appointmentsUpcoming),
                'pastAppointmentsCount' => count($appointmentsPast),
                'loyaltyPoints' => $loyaltyAccount?->getPointsBalance() ?? 0,
                'giftVoucherCount' => count($giftVouchers),
            ],
            'sales' => array_map(fn(Sale $sale) => $this->serializeSale($sale), $sales),
            'orders' => array_map(fn(Order $order) => $this->serializeOrder($order), $orders),
            'appointments' => [
                'upcoming' => array_map(fn(Appointment $appointment) => $this->serializeAppointment($appointment), $appointmentsUpcoming),
                'past' => array_map(fn(Appointment $appointment) => $this->serializeAppointment($appointment), $appointmentsPast),
                'history' => array_map(fn(AppointmentStatusHistory $entry) => [
                    'id' => $entry->getId(),
                    'fromStatus' => $entry->getFromStatus(),
                    'toStatus' => $entry->getToStatus(),
                    'changedBy' => $entry->getChangedBy(),
                    'reason' => $entry->getReason(),
                    'createdAt' => $entry->getCreatedAt()->format(DATE_ATOM),
                ], $appointmentHistory),
            ],
            'loyalty' => [
                'account' => $loyaltyAccount ? [
                    'id' => $loyaltyAccount->getId(),
                    'pointsBalance' => $loyaltyAccount->getPointsBalance(),
                    'isActive' => $loyaltyAccount->isActive(),
                    'subscriptionName' => $loyaltyAccount->getSubscriptionName(),
                    'subscriptionStatus' => $loyaltyAccount->getSubscriptionStatus(),
                    'subscriptionStartedAt' => $loyaltyAccount->getSubscriptionStartedAt()?->format(DATE_ATOM),
                    'subscriptionEndsAt' => $loyaltyAccount->getSubscriptionEndsAt()?->format(DATE_ATOM),
                    'visitCardName' => $loyaltyAccount->getVisitCardName(),
                    'visitCardTarget' => $loyaltyAccount->getVisitCardTarget(),
                    'visitCardUsed' => $loyaltyAccount->getVisitCardUsed(),
                    'visitCardActive' => $loyaltyAccount->isVisitCardActive(),
                    'updatedAt' => $loyaltyAccount->getUpdatedAt()->format(DATE_ATOM),
                ] : null,
                'events' => array_map(fn(LoyaltyEvent $event) => [
                    'id' => $event->getId(),
                    'eventType' => $event->getEventType(),
                    'pointsDelta' => $event->getPointsDelta(),
                    'balanceAfter' => $event->getBalanceAfter(),
                    'reason' => $event->getReason(),
                    'createdAt' => $event->getCreatedAt()->format(DATE_ATOM),
                ], $loyaltyEvents),
            ],
            'giftVouchers' => array_map(fn(GiftVoucher $voucher) => [
                'id' => $voucher->getId(),
                'code' => $voucher->getCode(),
                'status' => $voucher->getStatus(),
                'purchaserName' => $voucher->getPurchaserName(),
                'recipientName' => $voucher->getRecipientName(),
                'serviceLabel' => $voucher->getServiceLabel(),
                'initialAmount' => (float) $voucher->getInitialAmount(),
                'balanceAmount' => (float) $voucher->getBalanceAmount(),
                'effectiveAt' => $voucher->getEffectiveAt()?->format(DATE_ATOM),
                'expiresAt' => $voucher->getExpiresAt()?->format(DATE_ATOM),
                'createdAt' => $voucher->getCreatedAt()->format(DATE_ATOM),
            ], $giftVouchers),
            'notifications' => array_map(fn(NotificationLog $log) => [
                'id' => $log->getId(),
                'kind' => $log->getKind(),
                'channel' => $log->getChannel(),
                'status' => $log->getStatus(),
                'createdAt' => $log->getCreatedAt()->format(DATE_ATOM),
            ], $notificationLogs),
        ]);
    }

    #[OA\Post(path: '/api/v1/backoffice/customers', tags: ['Customers'], summary: 'Create a new customer file')]
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }

        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $fullName = trim((string) ($payload['fullName'] ?? ''));
        $password = (string) ($payload['password'] ?? '');

        if ($email === '' || $fullName === '' || $password === '') {
            throw new BadRequestHttpException('Email, full name and password are required.');
        }

        $user = (new User())
            ->setEmail($email)
            ->setRoles(['ROLE_CUSTOMER']);
        $user->setPassword($this->passwordHasher->hashPassword($user, $password));

        $store = null;
        if (!empty($payload['preferredStoreId'])) {
            $store = $this->em->getRepository(Store::class)->find((int) $payload['preferredStoreId']);
            if (!$store instanceof Store) {
                throw new BadRequestHttpException('Invalid preferred store.');
            }
        }

        $customer = (new Customer())
            ->setUser($user)
            ->setFullName($fullName)
            ->setPhoneNumber(isset($payload['phoneNumber']) && $payload['phoneNumber'] !== '' ? (string) $payload['phoneNumber'] : null)
            ->setPreferredStore($store instanceof Store ? $store : null);

        if (!empty($payload['birthDate'])) {
            $customer->setBirthDate(new \DateTimeImmutable((string) $payload['birthDate']));
        }

        $this->em->persist($user);
        $this->em->persist($customer);
        $this->em->flush();

        return $this->json($this->serializeCustomerListItem($customer), 201);
    }

    private function serializeCustomerListItem(Customer $customer): array
    {
        return [
            'id' => $customer->getId(),
            'fullName' => $customer->getFullName(),
            'email' => $customer->getUser()->getEmail(),
            'phoneNumber' => $customer->getPhoneNumber(),
            'birthDate' => $customer->getBirthDate()?->format('Y-m-d'),
            'preferredStore' => $customer->getPreferredStore() ? [
                'id' => $customer->getPreferredStore()?->getId(),
                'name' => $customer->getPreferredStore()?->getName(),
            ] : null,
        ];
    }

    private function serializeSale(Sale $sale): array
    {
        return [
            'id' => $sale->getId(),
            'receiptNumber' => $sale->getReceiptNumber(),
            'status' => $sale->getStatus(),
            'paymentStatus' => $sale->getPaymentStatus(),
            'total' => (float) $sale->getTotal(),
            'sellerEmail' => $sale->getSeller()?->getEmail(),
            'createdAt' => $sale->getCreatedAt()->format(DATE_ATOM),
            'items' => array_map(fn(SaleItem $item) => [
                'id' => $item->getId(),
                'label' => $item->getLabel(),
                'itemType' => $item->getItemType(),
                'quantity' => (float) $item->getQuantity(),
                'lineTotal' => (float) $item->getLineTotal(),
            ], $sale->getItems()->toArray()),
            'payments' => array_map(fn(Payment $payment) => [
                'id' => $payment->getId(),
                'method' => $payment->getMethod(),
                'amount' => (float) $payment->getAmount(),
                'status' => $payment->getStatus(),
                'paidAt' => $payment->getPaidAt()->format(DATE_ATOM),
            ], $sale->getPayments()->toArray()),
        ];
    }

    private function serializeOrder(Order $order): array
    {
        return [
            'id' => $order->getId(),
            'orderNumber' => $order->getOrderNumber(),
            'status' => $order->getStatus(),
            'total' => (float) $order->getTotal(),
            'pickupInStore' => $order->isPickupInStore(),
            'pickupSlot' => $order->getPickupSlot(),
            'giftVoucherAmount' => (float) $order->getGiftVoucherAmount(),
            'createdAt' => $order->getCreatedAt()->format(DATE_ATOM),
            'items' => array_map(fn(OrderItem $item) => [
                'id' => $item->getId(),
                'productName' => $item->getProductName(),
                'quantity' => $item->getQuantity(),
                'lineTotal' => (float) $item->getLineTotal(),
            ], $order->getItems()->toArray()),
        ];
    }

    private function serializeAppointment(Appointment $appointment): array
    {
        return [
            'id' => $appointment->getId(),
            'status' => $appointment->getStatus(),
            'paymentMode' => $appointment->getPaymentMode(),
            'paymentStatus' => $appointment->getPaymentStatus(),
            'startAt' => $appointment->getStartAt()->format(DATE_ATOM),
            'endAt' => $appointment->getEndAt()->format(DATE_ATOM),
            'notes' => $appointment->getNotes(),
            'employee' => [
                'id' => $appointment->getEmployee()->getId(),
                'fullName' => $appointment->getEmployee()->getFullName(),
            ],
            'services' => array_map(fn($item) => [
                'id' => $item->getId(),
                'serviceName' => $item->getService()->getName(),
                'quantity' => $item->getQuantity(),
                'durationMinutes' => $item->getService()->getDurationMinutes(),
            ], $appointment->getServices()->toArray()),
        ];
    }
}
