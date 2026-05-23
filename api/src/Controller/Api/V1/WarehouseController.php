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

        $pdf = $this->buildShippingNotePdf(
            $order,
            $customer->getFullName(),
            $customer->getUser()->getEmail(),
            $destination !== '' ? $destination : 'No destination recorded'
        );

        return new Response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => sprintf('attachment; filename="%s-shipping-note.pdf"', $order->getOrderNumber()),
        ]);
    }

    private function buildShippingNotePdf(Order $order, string $customerName, string $customerEmail, string $destination): string
    {
        $lineItems = [];
        foreach ($order->getItems() as $item) {
            $lineItems[] = sprintf(
                '%s | %s | Qty %d | %0.2f GBP',
                $item->getProductName(),
                $item->getProductSku(),
                $item->getQuantity(),
                (float) $item->getLineTotal()
            );
        }

        if ($lineItems === []) {
            $lineItems[] = 'No physical item recorded on this order.';
        }

        $lines = [
            'Shipping note',
            sprintf('Order: %s', $order->getOrderNumber()),
            sprintf('Customer: %s', $customerName),
            sprintf('Email: %s', $customerEmail),
            sprintf('Destination: %s', $destination),
            sprintf('Status: %s', $order->getStatus()),
            sprintf('Created at: %s', $order->getCreatedAt()->format('d/m/Y H:i')),
            '',
            'Items:',
            ...$lineItems,
        ];

        return $this->buildSimplePdfDocument($lines);
    }

    /**
     * Build a lightweight PDF document without introducing an external PDF library.
     *
     * @param list<string> $lines
     */
    private function buildSimplePdfDocument(array $lines): string
    {
        $contentLines = ['BT', '/F1 12 Tf', '50 790 Td', '14 TL'];
        foreach ($lines as $index => $line) {
            $escaped = $this->escapePdfText($line);
            if ($index === 0) {
                $contentLines[] = sprintf('(%s) Tj', $escaped);
                continue;
            }

            $contentLines[] = 'T*';
            $contentLines[] = sprintf('(%s) Tj', $escaped);
        }
        $contentLines[] = 'ET';
        $stream = implode("\n", $contentLines);

        $objects = [
            "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
            "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
            "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj",
            "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
            sprintf("5 0 obj\n<< /Length %d >>\nstream\n%s\nendstream\nendobj", strlen($stream), $stream),
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object . "\n";
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 " . (count($objects) + 1) . "\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); ++$i) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }

        $pdf .= "trailer\n";
        $pdf .= "<< /Size " . (count($objects) + 1) . " /Root 1 0 R >>\n";
        $pdf .= "startxref\n" . $xrefOffset . "\n%%EOF";

        return $pdf;
    }

    private function escapePdfText(string $value): string
    {
        $sanitized = preg_replace('/[^\x20-\x7E]/', ' ', $value) ?? $value;

        return str_replace(
            ['\\', '(', ')'],
            ['\\\\', '\\(', '\\)'],
            $sanitized
        );
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
