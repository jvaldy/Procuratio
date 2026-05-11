<?php

namespace App\Controller\Api\V1;

use App\Entity\Order;
use App\Entity\OrderItem;
use App\Entity\Store;
use App\Repository\OrderRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1/warehouse', name: 'api_v1_warehouse_')]
class WarehouseController extends AbstractController
{
    public function __construct(
        private readonly OrderRepository $orderRepository,
        private readonly EntityManagerInterface $em,
    )
    {
    }

    #[OA\Get(path: '/api/v1/warehouse/orders', tags: ['Warehouse'], summary: 'Lister les commandes pour le back-office')]
    #[Route('/orders', name: 'orders_list', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function listOrders(Request $request): JsonResponse
    {
        if (!$this->isGranted('ROLE_EMPLOYEE') && !$this->isGranted('ROLE_ADMIN')) {
            throw new AccessDeniedHttpException('Acces reserve au back-office.');
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('perPage', 20)));
        $search = is_string($request->query->get('search')) ? $request->query->get('search') : null;
        $status = is_string($request->query->get('status')) ? $request->query->get('status') : null;
        $store = $request->query->get('storeId') ? $this->resolveStore((int) $request->query->get('storeId')) : null;

        $result = $this->orderRepository->findForWarehouse($page, $perPage, $search, $status, $store);

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

    #[Route('/orders/{id}/status', name: 'orders_status', methods: ['PATCH'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function updateOrderStatus(int $id, Request $request): JsonResponse
    {
        $order = $this->orderRepository->find($id);
        if (!$order instanceof Order) {
            throw new NotFoundHttpException('Order not found.');
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }

        $status = trim((string) ($payload['status'] ?? ''));
        $allowed = [
            Order::STATUS_PENDING,
            Order::STATUS_VALIDATED,
            Order::STATUS_PROCESSING,
            Order::STATUS_SHIPPED,
            Order::STATUS_PAID,
            Order::STATUS_READY_FOR_PICKUP,
            Order::STATUS_FAILED,
            Order::STATUS_CANCELLED,
        ];

        if (!in_array($status, $allowed, true)) {
            throw new BadRequestHttpException('This order status is not supported.');
        }

        $order->setStatus($status)->touch();
        $this->em->flush();

        return $this->json($this->serializeOrder($order));
    }

    #[Route('/orders/{id}/shipping-note', name: 'orders_shipping_note', methods: ['GET'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function shippingNote(int $id): Response
    {
        $order = $this->orderRepository->find($id);
        if (!$order instanceof Order) {
            throw new NotFoundHttpException('Order not found.');
        }

        $lines = [];
        foreach ($order->getItems() as $item) {
            $lines[] = sprintf(
                '<tr><td>%s</td><td>%s</td><td style="text-align:right">%d</td><td style="text-align:right">%0.2f EUR</td></tr>',
                htmlspecialchars($item->getProductName(), ENT_QUOTES),
                htmlspecialchars($item->getProductSku(), ENT_QUOTES),
                $item->getQuantity(),
                (float) $item->getLineTotal()
            );
        }

        $customer = $order->getCustomer();
        $destination = $order->isPickupInStore()
            ? 'Store pickup'
            : trim(implode(', ', array_filter([
                $order->getDeliveryFullName(),
                $order->getDeliveryAddressLine1(),
                $order->getDeliveryAddressLine2(),
                $order->getDeliveryPostalCode(),
                $order->getDeliveryCity(),
                $order->getDeliveryCountry(),
            ])));

        $html = sprintf(
            '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Shipping note %s</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1d2746}h1{margin-bottom:8px}table{width:100%%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #dbe2ff;padding:10px 12px;text-align:left}th{background:#f5f7ff}small{color:#61739d}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0}.box{border:1px solid #dbe2ff;border-radius:14px;padding:14px;background:#fff}</style></head><body><h1>Shipping note</h1><small>Order %s</small><div class="meta"><div class="box"><strong>Customer</strong><div>%s</div><div>%s</div></div><div class="box"><strong>Destination</strong><div>%s</div><div>Status: %s</div></div></div><table><thead><tr><th>Item</th><th>Reference</th><th>Qty</th><th>Line total</th></tr></thead><tbody>%s</tbody></table></body></html>',
            htmlspecialchars($order->getOrderNumber(), ENT_QUOTES),
            htmlspecialchars($order->getOrderNumber(), ENT_QUOTES),
            htmlspecialchars($customer->getFullName(), ENT_QUOTES),
            htmlspecialchars($customer->getUser()->getEmail(), ENT_QUOTES),
            htmlspecialchars($destination !== '' ? $destination : 'No destination recorded', ENT_QUOTES),
            htmlspecialchars($order->getStatus(), ENT_QUOTES),
            implode('', $lines) !== '' ? implode('', $lines) : '<tr><td colspan="4">No physical item recorded on this order.</td></tr>'
        );

        return new Response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
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
            ] : null,
            'pickupSlot' => $order->getPickupSlot(),
            'pickupNote' => $order->getPickupNote(),
            'deliveryAddress' => [
                'fullName' => $order->getDeliveryFullName(),
                'line1' => $order->getDeliveryAddressLine1(),
                'line2' => $order->getDeliveryAddressLine2(),
                'postalCode' => $order->getDeliveryPostalCode(),
                'city' => $order->getDeliveryCity(),
                'country' => $order->getDeliveryCountry(),
                'instructions' => $order->getDeliveryInstructions(),
            ],
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

    private function resolveStore(int $id): Store
    {
        $store = $this->em->getRepository(Store::class)->find($id);
        if (!$store instanceof Store) {
            throw new NotFoundHttpException('Store not found.');
        }

        return $store;
    }
}
