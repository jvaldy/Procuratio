<?php

namespace App\Controller\Api\V1;

use App\Entity\Cart;
use App\Entity\Customer;
use App\Entity\GiftVoucher;
use App\Entity\Order;
use App\Entity\OrderItem;
use App\Entity\PaymentEvent;
use App\Entity\Product;
use App\Entity\ProductReview;
use App\Entity\ProductReservation;
use App\Entity\Store;
use App\Entity\StoreReview;
use App\Entity\User;
use App\Repository\BusinessHourRepository;
use App\Repository\CustomerRepository;
use App\Repository\OrderRepository;
use App\Repository\PaymentEventRepository;
use App\Repository\ProductRepository;
use App\Service\CrmService;
use App\Service\EcommerceService;
use App\Service\StripeService;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
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

#[Route('/api/v1', name: 'api_v1_ecom_')]
class EcommerceController extends AbstractController
{
    private const MSG_CUSTOMER_ACCOUNT_REQUIRED = 'A customer account is required.';
    private const MSG_GIFT_VOUCHER_AMOUNT_TOO_LOW = 'Gift voucher amount must be at least £10.00.';
    private const MSG_INVALID_JSON = 'Invalid JSON payload.';
    private const MSG_INVALID_STRIPE_SIGNATURE = 'Invalid Stripe signature.';
    private const MSG_INVALID_WEBHOOK_PAYLOAD = 'Invalid webhook payload.';
    private const MSG_ORDER_NOT_FOUND = 'Order not found.';
    private const MSG_ORDER_NO_LONGER_CANCELLABLE = 'This order can no longer be cancelled.';
    private const MSG_OUT_OF_STOCK_FOR_ORDER = 'Insufficient stock to complete the order.';
    private const MSG_PRODUCT_NOT_FOUND = 'Product not found.';
    private const MSG_RECIPIENT_EMAIL_REQUIRED = 'Recipient email is required.';
    private const MSG_RECIPIENT_NAME_REQUIRED = 'Recipient name is required.';
    private const MSG_RESERVATION_NOT_FOUND = 'Reservation not found.';
    private const MSG_STORE_NOT_FOUND = 'Store not found.';
    private const MSG_WEBHOOK_EVENT_ALREADY_PROCESSED = 'Webhook event already processed.';

    public function __construct(
        private readonly ProductRepository $productRepository,
        private readonly CustomerRepository $customerRepository,
        private readonly BusinessHourRepository $businessHourRepository,
        private readonly OrderRepository $orderRepository,
        private readonly PaymentEventRepository $paymentEventRepository,
        private readonly EcommerceService $ecommerceService,
        private readonly CrmService $crmService,
        private readonly StripeService $stripeService,
        private readonly EntityManagerInterface $em,
        private readonly string $stripeWebhookSecret = '',
    ) {
    }

    #[OA\Get(path: '/api/v1/catalog/products', tags: ['E-commerce'], summary: 'Lister le catalogue client')]
    #[Route('/catalog/products', name: 'catalog_products', methods: ['GET'])]
    public function catalogProducts(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('perPage', 20)));
        $filters = [
            'name' => $request->query->get('name'),
            'category' => $request->query->get('category'),
            'brand' => $request->query->get('brand'),
            'active' => 'true',
            'minPrice' => $request->query->get('minPrice'),
            'maxPrice' => $request->query->get('maxPrice'),
        ];
        $sort = (string) $request->query->get('sort', 'createdAt');
        $order = (string) $request->query->get('order', 'DESC');

        $result = $this->productRepository->search($filters, $sort, $order, $page, $perPage);

        return $this->json([
            'data' => array_map(fn(Product $p) => $this->serializeCatalogProduct($p), $result['items']),
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $perPage),
            ],
        ]);
    }

    #[OA\Get(path: '/api/v1/catalog/products/{id}', tags: ['E-commerce'], summary: 'Lire un produit du catalogue')]
    #[Route('/catalog/products/{id}', name: 'catalog_product_detail', methods: ['GET'])]
    public function catalogProductDetail(int $id): JsonResponse
    {
        $product = $this->productRepository->find($id);
        if (!$product instanceof Product || !$product->isActive()) {
            throw new NotFoundHttpException(self::MSG_PRODUCT_NOT_FOUND);
        }

        return $this->json($this->serializeCatalogProduct($product, true));
    }

    #[OA\Post(path: '/api/v1/catalog/products/{id}/reservations', tags: ['E-commerce'], summary: 'Reserver un produit pour retrait magasin')]
    #[Route('/catalog/products/{id}/reservations', name: 'catalog_product_reserve', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function reserveCatalogProduct(int $id, Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request, true);
        $customer = $this->resolveCurrentCustomer();
        $store = !empty($payload['storeId']) ? $this->resolveStore((int) $payload['storeId']) : $customer->getPreferredStore();
        $product = $this->productRepository->find($id);
        if (!$product instanceof Product || !$product->isActive()) {
            throw new NotFoundHttpException(self::MSG_PRODUCT_NOT_FOUND);
        }
        if ($store instanceof Store) {
            $customer->setPreferredStore($store);
        }

        $reservation = $this->ecommerceService->reserveProduct(
            $customer,
            $product,
            (int) ($payload['quantity'] ?? 1),
            (int) ($payload['durationMinutes'] ?? 120),
            $store instanceof Store ? $store : null,
        );

        return $this->json($this->serializeReservation($reservation), 201);
    }

    #[OA\Get(path: '/api/v1/reservations/me', tags: ['E-commerce'], summary: 'Lister mes reservations produits')]
    #[Route('/reservations/me', name: 'reservations_me', methods: ['GET'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function myReservations(): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $this->ecommerceService->expireReservations();
        $items = $this->em->getRepository(ProductReservation::class)->findBy(
            ['customer' => $customer],
            ['createdAt' => 'DESC'],
            200
        );

        return $this->json(['data' => array_map(fn(ProductReservation $r) => $this->serializeReservation($r), $items)]);
    }

    #[OA\Post(path: '/api/v1/reservations/{id}/cancel', tags: ['E-commerce'], summary: 'Annuler une reservation produit')]
    #[Route('/reservations/{id}/cancel', name: 'reservations_cancel', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function cancelReservation(int $id): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $reservation = $this->em->getRepository(ProductReservation::class)->find($id);
        if (!$reservation instanceof ProductReservation) {
            throw new NotFoundHttpException(self::MSG_RESERVATION_NOT_FOUND);
        }

        $reservation = $this->ecommerceService->cancelReservation($reservation, $customer);
        return $this->json($this->serializeReservation($reservation));
    }

    #[OA\Post(path: '/api/v1/reservations/{id}/picked-up', tags: ['E-commerce'], summary: 'Marquer une reservation retiree en magasin')]
    #[Route('/reservations/{id}/picked-up', name: 'reservations_picked_up', methods: ['POST'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function markReservationPickedUp(int $id): JsonResponse
    {
        $reservation = $this->em->getRepository(ProductReservation::class)->find($id);
        if (!$reservation instanceof ProductReservation) {
            throw new NotFoundHttpException(self::MSG_RESERVATION_NOT_FOUND);
        }

        $reservation = $this->ecommerceService->markReservationPickedUp($reservation);
        return $this->json($this->serializeReservation($reservation));
    }

    #[OA\Get(path: '/api/v1/cart', tags: ['E-commerce'], summary: 'Lire le panier courant')]
    #[Route('/cart', name: 'cart_get', methods: ['GET'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function getCart(): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $cart = $this->ecommerceService->getOrCreateOpenCart($customer);

        return $this->json($this->serializeCart($cart));
    }

    #[OA\Get(path: '/api/v1/loyalty/me', tags: ['E-commerce'], summary: 'Lire mon compte fidelite web')]
    #[Route('/loyalty/me', name: 'loyalty_me', methods: ['GET'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function myLoyalty(): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $account = $this->crmService->ensureLoyaltyAccount($customer);
        $events = $this->em->getRepository(\App\Entity\LoyaltyEvent::class)->findBy(
            ['customer' => $customer],
            ['createdAt' => 'DESC'],
            100
        );

        return $this->json([
            'account' => [
                'pointsBalance' => $account->getPointsBalance(),
                'isActive' => $account->isActive(),
                'subscriptionName' => $account->getSubscriptionName(),
                'subscriptionStatus' => $account->getSubscriptionStatus(),
                'subscriptionStartedAt' => $account->getSubscriptionStartedAt()?->format(DATE_ATOM),
                'subscriptionEndsAt' => $account->getSubscriptionEndsAt()?->format(DATE_ATOM),
                'visitCardName' => $account->getVisitCardName(),
                'visitCardTarget' => $account->getVisitCardTarget(),
                'visitCardUsed' => $account->getVisitCardUsed(),
                'visitCardActive' => $account->isVisitCardActive(),
                'updatedAt' => $account->getUpdatedAt()->format(DATE_ATOM),
            ],
            'events' => array_map(static fn(\App\Entity\LoyaltyEvent $event): array => [
                'eventType' => $event->getEventType(),
                'pointsDelta' => $event->getPointsDelta(),
                'balanceAfter' => $event->getBalanceAfter(),
                'reason' => $event->getReason(),
                'createdAt' => $event->getCreatedAt()->format(DATE_ATOM),
            ], $events),
        ]);
    }

    #[OA\Get(path: '/api/v1/gift-vouchers/me', tags: ['E-commerce'], summary: 'Read my gift vouchers')]
    #[Route('/gift-vouchers/me', name: 'gift_vouchers_me', methods: ['GET'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function giftVouchersMe(): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $items = $this->em->getRepository(GiftVoucher::class)->findBy(['customer' => $customer], ['createdAt' => 'DESC']);
        $emailDeliveredOrders = $this->orderRepository->createQueryBuilder('o')
            ->andWhere('o.customer = :customer')
            ->andWhere('o.giftVoucherDeliveryEmail = :email')
            ->andWhere('o.purchasedGiftVoucher IS NOT NULL')
            ->setParameter('customer', $customer)
            ->setParameter('email', $customer->getUser()->getEmail())
            ->orderBy('o.createdAt', 'DESC')
            ->getQuery()
            ->getResult();

        $voucherIndex = [];
        foreach ($items as $voucher) {
            if ($voucher instanceof GiftVoucher) {
                $voucherIndex[$voucher->getId()] = ['voucher' => $voucher, 'linkedByEmail' => false];
            }
        }

        foreach ($emailDeliveredOrders as $order) {
            if (!$order instanceof Order || !$order->getPurchasedGiftVoucher() instanceof GiftVoucher) {
                continue;
            }

            $voucher = $order->getPurchasedGiftVoucher();
            $voucherIndex[$voucher->getId()] = ['voucher' => $voucher, 'linkedByEmail' => true];
        }

        $items = array_values($voucherIndex);
        usort($items, static fn (array $left, array $right): int => $right['voucher']->getCreatedAt() <=> $left['voucher']->getCreatedAt());

        return $this->json([
            'data' => array_map(
                fn (array $item) => $this->serializeGiftVoucher($item['voucher'], $item['linkedByEmail']),
                $items
            ),
        ]);
    }

    #[OA\Post(path: '/api/v1/gift-vouchers/activate', tags: ['E-commerce'], summary: 'Activate a gift voucher from the customer area')]
    #[Route('/gift-vouchers/activate', name: 'gift_vouchers_activate_customer', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function activateCustomerGiftVoucher(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $customer = $this->resolveCurrentCustomer();
        $voucher = $this->crmService->activateGiftVoucherForCustomer((string) ($payload['code'] ?? ''), $customer);

        return $this->json($this->serializeGiftVoucher($voucher));
    }

    #[OA\Post(path: '/api/v1/gift-vouchers/purchase', tags: ['E-commerce'], summary: 'Buy a gift voucher from the online shop')]
    #[Route('/gift-vouchers/purchase', name: 'gift_vouchers_purchase', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function purchaseGiftVoucher(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $customer = $this->resolveCurrentCustomer();

        $amount = round((float) ($payload['amount'] ?? 0), 2);
        if ($amount < 10) {
            throw new BadRequestHttpException(self::MSG_GIFT_VOUCHER_AMOUNT_TOO_LOW);
        }

        $recipientName = trim((string) ($payload['recipientName'] ?? ''));
        $purchaserName = trim((string) ($payload['purchaserName'] ?? $customer->getFullName()));
        $recipientEmail = trim((string) ($payload['recipientEmail'] ?? $customer->getUser()->getEmail()));
        $serviceLabel = trim((string) ($payload['serviceLabel'] ?? ''));
        $durationDays = isset($payload['durationDays']) && $payload['durationDays'] !== ''
            ? (int) $payload['durationDays']
            : null;
        $effectiveAt = isset($payload['effectiveAt']) && $payload['effectiveAt'] !== ''
            ? new \DateTimeImmutable((string) $payload['effectiveAt'])
            : new \DateTimeImmutable();

        if ($recipientName === '') {
            throw new BadRequestHttpException(self::MSG_RECIPIENT_NAME_REQUIRED);
        }
        if ($recipientEmail === '') {
            throw new BadRequestHttpException(self::MSG_RECIPIENT_EMAIL_REQUIRED);
        }

        $voucher = $this->crmService->createGiftVoucher(
            $amount,
            $customer,
            null,
            [
                'purchaserName' => $purchaserName,
                'recipientName' => $recipientName,
                'serviceLabel' => $serviceLabel !== '' ? $serviceLabel : null,
                'effectiveAt' => $effectiveAt,
                'durationDays' => $durationDays,
                'initialStatus' => GiftVoucher::STATUS_DRAFT,
            ]
        );

        $tax = round($amount * 0.2, 2);
        $total = round($amount + $tax, 2);
        $order = (new Order())
            ->setCustomer($customer)
            ->setOrderNumber('ORD-' . strtoupper(bin2hex(random_bytes(4))))
            ->setStatus(Order::STATUS_PENDING)
            ->setCurrency('eur')
            ->setSubTotal(number_format($amount, 2, '.', ''))
            ->setTaxTotal(number_format($tax, 2, '.', ''))
            ->setTotal(number_format($total, 2, '.', ''))
            ->setPurchasedGiftVoucher($voucher)
            ->setGiftVoucherDeliveryEmail($recipientEmail);

        $intent = $this->stripeService->createPaymentIntent(
            (int) round($total * 100),
            $order->getCurrency(),
            ['order_number' => $order->getOrderNumber(), 'gift_voucher_id' => (string) $voucher->getId()]
        );

        $order
            ->setStripePaymentIntentId((string) ($intent['id'] ?? null))
            ->setStripeClientSecret((string) ($intent['client_secret'] ?? null));

        $this->em->persist($order);
        $this->em->flush();

        return $this->json([
            'order' => $this->serializeOrder($order),
            'giftVoucher' => $this->serializeGiftVoucher($voucher),
            'paymentIntent' => [
                'id' => $order->getStripePaymentIntentId(),
                'clientSecret' => $order->getStripeClientSecret(),
                'status' => (string) ($intent['status'] ?? 'requires_payment_method'),
            ],
        ], 201);
    }

    #[OA\Post(path: '/api/v1/cart/gift-voucher', tags: ['E-commerce'], summary: 'Apply an activated gift voucher to the current cart')]
    #[Route('/cart/gift-voucher', name: 'cart_apply_gift_voucher', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function applyCartGiftVoucher(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $customer = $this->resolveCurrentCustomer();
        $cart = $this->ecommerceService->getOrCreateOpenCart($customer);
        $cart = $this->ecommerceService->applyGiftVoucher($cart, $customer, (string) ($payload['code'] ?? ''));

        return $this->json($this->serializeCart($cart));
    }

    #[OA\Delete(path: '/api/v1/cart/gift-voucher', tags: ['E-commerce'], summary: 'Remove the applied gift voucher from the current cart')]
    #[Route('/cart/gift-voucher', name: 'cart_remove_gift_voucher', methods: ['DELETE'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function removeCartGiftVoucher(): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $cart = $this->ecommerceService->getOrCreateOpenCart($customer);
        $cart = $this->ecommerceService->removeGiftVoucher($cart);

        return $this->json($this->serializeCart($cart));
    }

    #[OA\Post(path: '/api/v1/cart/items', tags: ['E-commerce'], summary: 'Ajouter un article au panier')]
    #[Route('/cart/items', name: 'cart_add_item', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function addCartItem(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $customer = $this->resolveCurrentCustomer();
        $cart = $this->ecommerceService->getOrCreateOpenCart($customer);
        $cart = $this->ecommerceService->addItem(
            $cart,
            (int) ($payload['productId'] ?? 0),
            (int) ($payload['quantity'] ?? 0),
        );

        return $this->json($this->serializeCart($cart), 201);
    }

    #[OA\Put(path: '/api/v1/cart/items/{productId}', tags: ['E-commerce'], summary: 'Modifier la quantite d un article')]
    #[Route('/cart/items/{productId}', name: 'cart_update_item', methods: ['PUT'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function updateCartItem(int $productId, Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $customer = $this->resolveCurrentCustomer();
        $cart = $this->ecommerceService->getOrCreateOpenCart($customer);
        $cart = $this->ecommerceService->updateItem($cart, $productId, (int) ($payload['quantity'] ?? -1));

        return $this->json($this->serializeCart($cart));
    }

    #[OA\Delete(path: '/api/v1/cart/items/{productId}', tags: ['E-commerce'], summary: 'Retirer un article du panier')]
    #[Route('/cart/items/{productId}', name: 'cart_remove_item', methods: ['DELETE'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function removeCartItem(int $productId): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $cart = $this->ecommerceService->getOrCreateOpenCart($customer);
        $cart = $this->ecommerceService->removeItem($cart, $productId);

        return $this->json($this->serializeCart($cart));
    }

    #[OA\Post(path: '/api/v1/checkout', tags: ['E-commerce'], summary: 'Passer commande et creer l intention de paiement Stripe')]
    #[Route('/checkout', name: 'checkout', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function checkout(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request, true);
        $customer = $this->resolveCurrentCustomer();
        $cart = $this->ecommerceService->getOrCreateOpenCart($customer);
        $store = !empty($payload['storeId']) ? $this->resolveStore((int) $payload['storeId']) : $customer->getPreferredStore();
        if ($store instanceof Store) {
            $customer->setPreferredStore($store);
        }
        $order = $this->ecommerceService->buildOrderFromCart(
            $cart,
            (bool) ($payload['pickupInStore'] ?? false),
            isset($payload['pickupSlot']) ? (string) $payload['pickupSlot'] : null,
            isset($payload['pickupNote']) ? (string) $payload['pickupNote'] : null,
            is_array($payload['deliveryAddress'] ?? null) ? $payload['deliveryAddress'] : [],
            $store instanceof Store ? $store : null,
        );

        $redeemPoints = max(0, (int) ($payload['redeemPoints'] ?? 0));
        $grossTotal = (float) $order->getTotal();
        $redeem = $this->crmService->redeemPointsForWebCheckout($customer, $grossTotal, $redeemPoints);
        $discountFromPoints = $redeem['redeemedPoints'] / 100.0;
        $giftVoucherAmount = min((float) $order->getGiftVoucherAmount(), max(0.0, $grossTotal - $discountFromPoints));
        $giftVoucherAmount = round($giftVoucherAmount, 2);
        $order->setGiftVoucherAmount(number_format($giftVoucherAmount, 2, '.', ''));
        $finalTotal = max(0.0, round($grossTotal - $discountFromPoints - $giftVoucherAmount, 2));
        $order->setTotal(number_format($finalTotal, 2, '.', ''));
        $intent = null;

        if ($finalTotal > 0.0) {
            $intent = $this->stripeService->createPaymentIntent(
                (int) round($finalTotal * 100),
                $order->getCurrency(),
                ['order_number' => $order->getOrderNumber()]
            );

            $order
                ->setStripePaymentIntentId((string) ($intent['id'] ?? null))
                ->setStripeClientSecret((string) ($intent['client_secret'] ?? null));
        } else {
            if ($order->getGiftVoucher() instanceof GiftVoucher && $giftVoucherAmount > 0.0) {
                $this->crmService->consumeGiftVoucher($order->getGiftVoucher(), $giftVoucherAmount);
            }
            $order->setStatus($order->isPickupInStore() ? Order::STATUS_READY_FOR_PICKUP : Order::STATUS_PAID);
            $order->touch();
        }

        // On ferme le panier au checkout pour figer le contenu qui part au paiement.
        $cart->setStatus(Cart::STATUS_CHECKED_OUT)->touch();
        $this->em->persist($order);
        $this->em->flush();

        return $this->json([
            'order' => $this->serializeOrder($order),
            'loyalty' => [
                'redeemedPoints' => $redeem['redeemedPoints'],
                'discountAmount' => $discountFromPoints,
            ],
            'paymentIntent' => $intent ? [
                'id' => $order->getStripePaymentIntentId(),
                'clientSecret' => $order->getStripeClientSecret(),
                'status' => (string) ($intent['status'] ?? 'requires_payment_method'),
            ] : null,
        ], 201);
    }

    #[OA\Get(path: '/api/v1/orders/me', tags: ['E-commerce'], summary: 'Lister mes commandes')]
    #[Route('/orders/me', name: 'orders_me', methods: ['GET'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function myOrders(Request $request): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('perPage', 20)));
        $result = $this->orderRepository->findByCustomer($customer, $page, $perPage);

        return $this->json([
            'data' => array_map(fn(Order $order) => $this->serializeOrder($order), $result['items']),
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $perPage),
            ],
        ]);
    }

    #[OA\Get(path: '/api/v1/orders/{orderNumber}', tags: ['E-commerce'], summary: 'Lire une commande')]
    #[Route('/orders/{orderNumber}', name: 'orders_get', methods: ['GET'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function orderByNumber(string $orderNumber): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $order = $this->orderRepository->findOneBy(['orderNumber' => $orderNumber]);
        if (!$order instanceof Order || $order->getCustomer()->getId() !== $customer->getId()) {
            throw new NotFoundHttpException(self::MSG_ORDER_NOT_FOUND);
        }

        return $this->json($this->serializeOrder($order));
    }

    #[OA\Post(path: '/api/v1/orders/{orderNumber}/cancel', tags: ['E-commerce'], summary: 'Cancel one of my orders before shipment')]
    #[Route('/orders/{orderNumber}/cancel', name: 'orders_cancel', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function cancelOrder(string $orderNumber): JsonResponse
    {
        $customer = $this->resolveCurrentCustomer();
        $order = $this->orderRepository->findOneBy(['orderNumber' => $orderNumber]);
        if (!$order instanceof Order || $order->getCustomer()->getId() !== $customer->getId()) {
            throw new NotFoundHttpException(self::MSG_ORDER_NOT_FOUND);
        }

        if (!$this->ecommerceService->canCustomerCancelOrder($order) || $order->getAppointment() !== null || $order->getPurchasedGiftVoucher() !== null) {
            throw new BadRequestHttpException(self::MSG_ORDER_NO_LONGER_CANCELLABLE);
        }

        $cancelledOrder = $this->ecommerceService->cancelCustomerOrder($order, $customer);

        return $this->json($this->serializeOrder($cancelledOrder));
    }

    #[Route('/catalog/products/{id}/reviews', name: 'product_reviews', methods: ['GET'])]
    public function productReviews(int $id): JsonResponse
    {
        $product = $this->productRepository->find($id);
        if (!$product instanceof Product || !$product->isActive()) {
            throw new NotFoundHttpException(self::MSG_PRODUCT_NOT_FOUND);
        }

        $items = $this->em->getRepository(ProductReview::class)->findBy(['product' => $product], ['createdAt' => 'DESC'], 50);
        return $this->json(['data' => array_map(fn(ProductReview $review) => $this->serializeProductReview($review), $items)]);
    }

    #[Route('/catalog/products/{id}/reviews', name: 'product_reviews_create', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function createProductReview(int $id, Request $request): JsonResponse
    {
        $product = $this->productRepository->find($id);
        if (!$product instanceof Product || !$product->isActive()) {
            throw new NotFoundHttpException(self::MSG_PRODUCT_NOT_FOUND);
        }

        $payload = $this->decodeJson($request);
        $customer = $this->resolveCurrentCustomer();
        $review = (new ProductReview())
            ->setProduct($product)
            ->setCustomer($customer)
            ->setRating((int) ($payload['rating'] ?? 5))
            ->setComment((string) ($payload['comment'] ?? ''));

        $this->em->persist($review);
        $this->em->flush();

        return $this->json($this->serializeProductReview($review), 201);
    }

    #[Route('/stores/{id}/reviews', name: 'store_reviews', methods: ['GET'])]
    public function storeReviews(int $id): JsonResponse
    {
        $store = $this->resolveStore($id);
        $items = $this->em->getRepository(StoreReview::class)->findBy(['store' => $store], ['createdAt' => 'DESC'], 50);
        return $this->json(['data' => array_map(fn(StoreReview $review) => $this->serializeStoreReview($review), $items)]);
    }

    #[Route('/stores/{id}/reviews', name: 'store_reviews_create', methods: ['POST'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function createStoreReview(int $id, Request $request): JsonResponse
    {
        $store = $this->resolveStore($id);
        $payload = $this->decodeJson($request);
        $customer = $this->resolveCurrentCustomer();
        $review = (new StoreReview())
            ->setStore($store)
            ->setCustomer($customer)
            ->setRating((int) ($payload['rating'] ?? 5))
            ->setComment((string) ($payload['comment'] ?? ''));

        $this->em->persist($review);
        $this->em->flush();

        return $this->json($this->serializeStoreReview($review), 201);
    }

    #[OA\Get(path: '/api/v1/pickup-hours', tags: ['E-commerce'], summary: 'Lire les horaires magasin pour le retrait')]
    #[Route('/pickup-hours', name: 'pickup_hours', methods: ['GET'])]
    #[IsGranted('ROLE_CUSTOMER')]
    public function pickupHours(Request $request): JsonResponse
    {
        $storeId = $request->query->get('storeId');
        $store = $storeId !== null && $storeId !== ''
            ? $this->resolveStore((int) $storeId)
            : null;
        $items = $this->businessHourRepository->findForStore($store);

        return $this->json([
            'data' => array_map(static fn(\App\Entity\BusinessHour $item): array => [
                'dayOfWeek' => $item->getDayOfWeek(),
                'storeId' => $item->getStore()?->getId(),
                'startTime' => $item->getStartTime()->format('H:i'),
                'endTime' => $item->getEndTime()->format('H:i'),
                'isOpen' => $item->isOpen(),
            ], $items),
        ]);
    }

    #[OA\Post(path: '/api/v1/payments/stripe/webhook', tags: ['E-commerce'], summary: 'Recevoir les evenements Stripe')]
    #[Route('/payments/stripe/webhook', name: 'stripe_webhook', methods: ['POST'])]
    public function stripeWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $event = json_decode($payload, true);
        if (!is_array($event)) {
            throw new BadRequestHttpException(self::MSG_INVALID_WEBHOOK_PAYLOAD);
        }

        $signature = $request->headers->get('Stripe-Signature');
        $isValid = $this->stripeService->isWebhookSignatureValid($payload, $signature, $this->stripeWebhookSecret);

        $eventId = isset($event['id']) ? (string) $event['id'] : null;
        $eventType = (string) ($event['type'] ?? 'unknown');
        $intentId = (string) ($event['data']['object']['id'] ?? '');

        $paymentEvent = (new PaymentEvent())
            ->setProvider('stripe')
            ->setProviderEventId($eventId)
            ->setEventType($eventType)
            ->setSignatureValid($isValid)
            ->setPayload($event);

        if ($intentId !== '') {
            $order = $this->orderRepository->findOneBy(['stripePaymentIntentId' => $intentId]);
            if ($order instanceof Order) {
                $paymentEvent->setOrder($order);
            }
        }

        try {
            $this->em->persist($paymentEvent);
            $this->em->flush();
        } catch (UniqueConstraintViolationException) {
            return $this->json(['status' => 'ignored', 'message' => self::MSG_WEBHOOK_EVENT_ALREADY_PROCESSED]);
        }

        if (!$isValid) {
            throw new AccessDeniedHttpException(self::MSG_INVALID_STRIPE_SIGNATURE);
        }

        if ($paymentEvent->getOrder() instanceof Order) {
            $this->applyPaymentEvent($paymentEvent->getOrder(), $eventType);
        }

        return $this->json(['status' => 'ok']);
    }

    private function applyPaymentEvent(Order $order, string $eventType): void
    {
        $this->em->getConnection()->transactional(function () use ($order, $eventType): void {
            if ($eventType === 'payment_intent.succeeded' && !in_array($order->getStatus(), [Order::STATUS_PAID, Order::STATUS_READY_FOR_PICKUP], true)) {
                if ($order->getPurchasedGiftVoucher() instanceof GiftVoucher) {
                    $voucher = $order->getPurchasedGiftVoucher();
                    if ($voucher->getStatus() === GiftVoucher::STATUS_DRAFT) {
                        // Regenerate a fresh public code only after payment confirmation.
                        $voucher
                            ->setCode($this->generateGiftVoucherCode())
                            ->setStatus(GiftVoucher::STATUS_ACTIVE)
                            ->touch();
                    }
                }

                foreach ($order->getItems() as $item) {
                    $product = $item->getProduct();
                    $newStock = $product->getStock() - $item->getQuantity();
                    if ($newStock < 0) {
                        $order->setStatus(Order::STATUS_FAILED)->touch();
                        $this->em->flush();
                        throw new BadRequestHttpException(self::MSG_OUT_OF_STOCK_FOR_ORDER);
                    }
                    $product->setStock($newStock)->touch();
                }

                if ($order->getGiftVoucher() instanceof GiftVoucher && (float) $order->getGiftVoucherAmount() > 0.0) {
                    $this->crmService->consumeGiftVoucher($order->getGiftVoucher(), (float) $order->getGiftVoucherAmount());
                }

                if ($order->getAppointment() instanceof \App\Entity\Appointment) {
                    $order->getAppointment()
                        ->setPaymentStatus(\App\Entity\Appointment::PAYMENT_STATUS_PAID)
                        ->touch();
                }

                $order->setStatus(
                    $order->getAppointment() instanceof \App\Entity\Appointment
                        ? Order::STATUS_PAID
                        : ($order->isPickupInStore() ? Order::STATUS_READY_FOR_PICKUP : Order::STATUS_PAID)
                );
                $order->touch();
                $this->em->flush();

                // La fidelite est creditee apres confirmation du paiement pour eviter d attribuer des points sur une commande echouee.
                $this->crmService->earnPointsFromPaidAmount($order->getCustomer(), (float) $order->getTotal());

                if ($order->getPurchasedGiftVoucher() instanceof GiftVoucher && $order->getGiftVoucherDeliveryEmail()) {
                    $this->crmService->sendGiftVoucherByEmail(
                        $order->getPurchasedGiftVoucher(),
                        $order->getGiftVoucherDeliveryEmail(),
                        'Your gift voucher purchase is confirmed. You can print or forward this voucher right away.'
                    );
                }
            }

            if ($eventType === 'payment_intent.payment_failed') {
                $order->setStatus(Order::STATUS_FAILED)->touch();
                $this->em->flush();
            }
        });
    }

    private function resolveCurrentCustomer(): Customer
    {
        /** @var User $user */
        $user = $this->getUser();
        $customer = $this->customerRepository->findOneBy(['user' => $user]);
        if (!$customer instanceof Customer) {
            throw new AccessDeniedHttpException(self::MSG_CUSTOMER_ACCOUNT_REQUIRED);
        }

        return $customer;
    }

    private function resolveStore(int $id): Store
    {
        $store = $this->em->getRepository(Store::class)->find($id);
        if (!$store instanceof Store) {
            throw new NotFoundHttpException(self::MSG_STORE_NOT_FOUND);
        }

        return $store;
    }

    private function decodeJson(Request $request, bool $allowEmpty = false): array
    {
        if ($allowEmpty && trim($request->getContent()) === '') {
            return [];
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException(self::MSG_INVALID_JSON);
        }

        return $payload;
    }

    private function serializeCatalogProduct(Product $product, bool $withStock = false): array
    {
        $availableStock = $product->getStock();
        if ($user = $this->getUser()) {
            if ($user instanceof User) {
                $customer = $this->customerRepository->findOneBy(['user' => $user]);
                if ($customer instanceof Customer) {
                    $availableStock = $this->ecommerceService->availableStockForCustomer($product, $customer);
                }
            }
        }

        if ($withStock) {
            $user = $this->getUser();
            if ($user instanceof User) {
                $customer = $this->customerRepository->findOneBy(['user' => $user]);
                if ($customer instanceof Customer) {
                    $availableStock = $this->ecommerceService->availableStockForCustomer($product, $customer);
                }
            }
        }

        $data = [
            'id' => $product->getId(),
            'name' => $product->getName(),
            'sku' => $product->getSku(),
            'barcode' => preg_replace('/[^A-Z0-9]/', '', strtoupper($product->getSku())),
            'price' => (float) $product->getPrice(),
            'description' => $product->getDescription(),
            'imageUrl' => $product->getImageUrl(),
            'brand' => ['id' => $product->getBrand()->getId(), 'name' => $product->getBrand()->getName()],
            'category' => ['id' => $product->getCategory()->getId(), 'name' => $product->getCategory()->getName()],
            'isActive' => $product->isActive(),
            'availableStock' => $availableStock,
            'reviews' => $this->productReviewSummary($product),
        ];

        if ($withStock) {
            $data['stock'] = $product->getStock();
        }

        return $data;
    }

    private function serializeReservation(ProductReservation $reservation): array
    {
        return [
            'id' => $reservation->getId(),
            'productId' => $reservation->getProduct()->getId(),
            'productName' => $reservation->getProduct()->getName(),
            'quantity' => $reservation->getQuantity(),
            'status' => $reservation->getStatus(),
            'store' => $reservation->getStore() ? [
                'id' => $reservation->getStore()?->getId(),
                'name' => $reservation->getStore()?->getName(),
            ] : null,
            'expiresAt' => $reservation->getExpiresAt()->format(DATE_ATOM),
            'createdAt' => $reservation->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    private function serializeGiftVoucher(GiftVoucher $voucher, bool $linkedByEmail = false): array
    {
        $isPendingActivation = $voucher->getStatus() === GiftVoucher::STATUS_DRAFT;

        return [
            'id' => $voucher->getId(),
            'code' => $isPendingActivation ? null : $voucher->getCode(),
            'status' => $voucher->getStatus(),
            'isCodeAvailable' => !$isPendingActivation,
            'linkedByEmail' => $linkedByEmail,
            'purchaserName' => $voucher->getPurchaserName(),
            'recipientName' => $voucher->getRecipientName(),
            'serviceLabel' => $voucher->getServiceLabel(),
            'initialAmount' => (float) $voucher->getInitialAmount(),
            'balanceAmount' => (float) $voucher->getBalanceAmount(),
            'effectiveAt' => $voucher->getEffectiveAt()?->format(DATE_ATOM),
            'expiresAt' => $voucher->getExpiresAt()?->format(DATE_ATOM),
            'durationDays' => $voucher->getDurationDays(),
            'createdAt' => $voucher->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    private function generateGiftVoucherCode(): string
    {
        return 'GV-' . strtoupper(bin2hex(random_bytes(4)));
    }

    private function serializeCart(Cart $cart): array
    {
        $computed = $this->ecommerceService->computeCart($cart);

        return [
            'id' => $cart->getId(),
            'status' => $cart->getStatus(),
            'currency' => $cart->getCurrency(),
            'items' => array_map(
                fn(array $line) => [
                    'productId' => $line['product']->getId(),
                    'name' => $line['product']->getName(),
                    'sku' => $line['product']->getSku(),
                    'quantity' => $line['quantity'],
                    'unitPrice' => $line['unitPrice'],
                    'lineTotal' => $line['lineTotal'],
                ],
                $computed['lines']
            ),
            'totals' => [
                'subTotal' => $computed['subTotal'],
                'taxTotal' => $computed['taxTotal'],
                'total' => $computed['total'],
                'giftVoucherDiscount' => $computed['giftVoucherDiscount'],
                'payableTotal' => $computed['payableTotal'],
            ],
            'appliedGiftVoucher' => $computed['appliedGiftVoucher'] instanceof GiftVoucher ? $this->serializeGiftVoucher($computed['appliedGiftVoucher']) : null,
            'updatedAt' => $cart->getUpdatedAt()->format(DATE_ATOM),
        ];
    }

    private function serializeOrder(Order $order): array
    {
        return [
            'id' => $order->getId(),
            'orderNumber' => $order->getOrderNumber(),
            'status' => $order->getStatus(),
            'currency' => $order->getCurrency(),
            'subTotal' => (float) $order->getSubTotal(),
            'taxTotal' => (float) $order->getTaxTotal(),
            'total' => (float) $order->getTotal(),
            'pickupInStore' => $order->isPickupInStore(),
            'store' => $order->getStore() ? [
                'id' => $order->getStore()?->getId(),
                'name' => $order->getStore()?->getName(),
                'city' => $order->getStore()?->getCity(),
            ] : null,
            'pickupSlot' => $order->getPickupSlot(),
            'pickupNote' => $order->getPickupNote(),
            'giftVoucherAmount' => (float) $order->getGiftVoucherAmount(),
            'giftVoucher' => $order->getGiftVoucher() instanceof GiftVoucher ? $this->serializeGiftVoucher($order->getGiftVoucher()) : null,
            'purchasedGiftVoucher' => $order->getPurchasedGiftVoucher() instanceof GiftVoucher ? $this->serializeGiftVoucher($order->getPurchasedGiftVoucher()) : null,
            'appointmentBooking' => $order->getAppointment() ? [
                'id' => $order->getAppointment()?->getId(),
                'startAt' => $order->getAppointment()?->getStartAt()->format(DATE_ATOM),
                'endAt' => $order->getAppointment()?->getEndAt()->format(DATE_ATOM),
                'employee' => [
                    'id' => $order->getAppointment()?->getEmployee()->getId(),
                    'fullName' => $order->getAppointment()?->getEmployee()->getFullName(),
                ],
                'services' => array_map(
                    static fn(\App\Entity\AppointmentService $line): array => [
                        'serviceId' => $line->getService()->getId(),
                        'serviceName' => $line->getService()->getName(),
                        'quantity' => $line->getQuantity(),
                        'durationMinutes' => $line->getDurationMinutes(),
                        'unitPrice' => (float) $line->getUnitPrice(),
                        'lineTotal' => round((float) $line->getUnitPrice() * $line->getQuantity(), 2),
                    ],
                    $order->getAppointment()?->getServices()->toArray() ?? []
                ),
            ] : null,
            'giftVoucherDeliveryEmail' => $order->getGiftVoucherDeliveryEmail(),
            'deliveryAddress' => [
                'fullName' => $order->getDeliveryFullName(),
                'line1' => $order->getDeliveryAddressLine1(),
                'line2' => $order->getDeliveryAddressLine2(),
                'postalCode' => $order->getDeliveryPostalCode(),
                'city' => $order->getDeliveryCity(),
                'country' => $order->getDeliveryCountry(),
                'instructions' => $order->getDeliveryInstructions(),
            ],
            'paymentIntentId' => $order->getStripePaymentIntentId(),
            'paymentClientSecret' => $order->getStripeClientSecret(),
            'stockStillAvailable' => array_reduce(
                $order->getItems()->toArray(),
                fn(bool $carry, OrderItem $item) => $carry && $this->ecommerceService->availableStockForCustomer($item->getProduct(), $order->getCustomer()) >= $item->getQuantity(),
                true
            ),
            'canCancel' => $this->ecommerceService->canCustomerCancelOrder($order)
                && $order->getAppointment() === null
                && $order->getPurchasedGiftVoucher() === null,
            'items' => array_map(
                fn(OrderItem $item) => [
                    'id' => $item->getId(),
                    'productId' => $item->getProduct()->getId(),
                    'productName' => $item->getProductName(),
                    'productSku' => $item->getProductSku(),
                    'quantity' => $item->getQuantity(),
                    'unitPrice' => (float) $item->getUnitPrice(),
                    'lineTotal' => (float) $item->getLineTotal(),
                ],
                $order->getItems()->toArray()
            ),
            'createdAt' => $order->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    private function productReviewSummary(Product $product): array
    {
        $items = $this->em->getRepository(ProductReview::class)->findBy(['product' => $product], ['createdAt' => 'DESC'], 50);
        $count = count($items);
        $average = $count > 0
            ? round(array_reduce($items, fn(float $sum, ProductReview $review) => $sum + $review->getRating(), 0.0) / $count, 1)
            : 0.0;

        return ['count' => $count, 'average' => $average];
    }

    private function serializeProductReview(ProductReview $review): array
    {
        return [
            'id' => $review->getId(),
            'rating' => $review->getRating(),
            'comment' => $review->getComment(),
            'customerName' => $review->getCustomer()->getFullName(),
            'createdAt' => $review->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    private function serializeStoreReview(StoreReview $review): array
    {
        return [
            'id' => $review->getId(),
            'rating' => $review->getRating(),
            'comment' => $review->getComment(),
            'customerName' => $review->getCustomer()->getFullName(),
            'createdAt' => $review->getCreatedAt()->format(DATE_ATOM),
        ];
    }
}
