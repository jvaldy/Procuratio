<?php

namespace App\Controller\Api\V1;

use App\Entity\Cart;
use App\Entity\Customer;
use App\Entity\Order;
use App\Entity\OrderItem;
use App\Entity\PaymentEvent;
use App\Entity\Product;
use App\Entity\User;
use App\Repository\CustomerRepository;
use App\Repository\OrderRepository;
use App\Repository\PaymentEventRepository;
use App\Repository\ProductRepository;
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
    public function __construct(
        private readonly ProductRepository $productRepository,
        private readonly CustomerRepository $customerRepository,
        private readonly OrderRepository $orderRepository,
        private readonly PaymentEventRepository $paymentEventRepository,
        private readonly EcommerceService $ecommerceService,
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
            throw new NotFoundHttpException('Produit introuvable.');
        }

        return $this->json($this->serializeCatalogProduct($product, true));
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
        $order = $this->ecommerceService->buildOrderFromCart(
            $cart,
            (bool) ($payload['pickupInStore'] ?? false),
            isset($payload['pickupSlot']) ? (string) $payload['pickupSlot'] : null,
            isset($payload['pickupNote']) ? (string) $payload['pickupNote'] : null,
        );

        $intent = $this->stripeService->createPaymentIntent(
            (int) round(((float) $order->getTotal()) * 100),
            $order->getCurrency(),
            ['order_number' => $order->getOrderNumber()]
        );

        $order
            ->setStripePaymentIntentId((string) ($intent['id'] ?? null))
            ->setStripeClientSecret((string) ($intent['client_secret'] ?? null));

        // On ferme le panier au checkout pour figer le contenu qui part au paiement.
        $cart->setStatus(Cart::STATUS_CHECKED_OUT)->touch();
        $this->em->persist($order);
        $this->em->flush();

        return $this->json([
            'order' => $this->serializeOrder($order),
            'paymentIntent' => [
                'id' => $order->getStripePaymentIntentId(),
                'clientSecret' => $order->getStripeClientSecret(),
                'status' => (string) ($intent['status'] ?? 'requires_payment_method'),
            ],
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
            throw new NotFoundHttpException('Commande introuvable.');
        }

        return $this->json($this->serializeOrder($order));
    }

    #[OA\Post(path: '/api/v1/payments/stripe/webhook', tags: ['E-commerce'], summary: 'Recevoir les evenements Stripe')]
    #[Route('/payments/stripe/webhook', name: 'stripe_webhook', methods: ['POST'])]
    public function stripeWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $event = json_decode($payload, true);
        if (!is_array($event)) {
            throw new BadRequestHttpException('Payload webhook invalide.');
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
            return $this->json(['status' => 'ignored', 'message' => 'Event deja traite.']);
        }

        if (!$isValid) {
            throw new AccessDeniedHttpException('Signature Stripe invalide.');
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
                foreach ($order->getItems() as $item) {
                    $product = $item->getProduct();
                    $newStock = $product->getStock() - $item->getQuantity();
                    if ($newStock < 0) {
                        $order->setStatus(Order::STATUS_FAILED)->touch();
                        $this->em->flush();
                        throw new BadRequestHttpException('Stock insuffisant pour finaliser la commande.');
                    }
                    $product->setStock($newStock)->touch();
                }

                $order->setStatus($order->isPickupInStore() ? Order::STATUS_READY_FOR_PICKUP : Order::STATUS_PAID);
                $order->touch();
                $this->em->flush();
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
            throw new AccessDeniedHttpException('Compte client requis.');
        }

        return $customer;
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

    private function serializeCatalogProduct(Product $product, bool $withStock = false): array
    {
        $data = [
            'id' => $product->getId(),
            'name' => $product->getName(),
            'sku' => $product->getSku(),
            'price' => (float) $product->getPrice(),
            'brand' => ['id' => $product->getBrand()->getId(), 'name' => $product->getBrand()->getName()],
            'category' => ['id' => $product->getCategory()->getId(), 'name' => $product->getCategory()->getName()],
            'isActive' => $product->isActive(),
        ];

        if ($withStock) {
            $data['stock'] = $product->getStock();
        }

        return $data;
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
            ],
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
            'pickupSlot' => $order->getPickupSlot(),
            'pickupNote' => $order->getPickupNote(),
            'paymentIntentId' => $order->getStripePaymentIntentId(),
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
}

