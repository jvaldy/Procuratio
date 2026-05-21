<?php

namespace App\Controller\Api\V1;

use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\Payment;
use App\Entity\Product;
use App\Entity\Sale;
use App\Entity\SaleItem;
use App\Entity\Service;
use App\Entity\Store;
use App\Entity\SuspendedTicket;
use App\Repository\CustomerRepository;
use App\Repository\ProductRepository;
use App\Repository\SaleRepository;
use App\Repository\ServiceRepository;
use App\Service\CrmService;
use App\Service\SaleCalculator;
use App\Service\StockManager;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1', name: 'api_v1_pos_')]
class PosController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ProductRepository $productRepository,
        private readonly ServiceRepository $serviceRepository,
        private readonly SaleRepository $saleRepository,
        private readonly CustomerRepository $customerRepository,
        private readonly SaleCalculator $calculator,
        private readonly StockManager $stockManager,
        private readonly CrmService $crmService,
    ) {
    }

    #[OA\Post(
        path: '/api/v1/pos/sales',
        tags: ['POS'],
        summary: 'Creer un ticket de caisse',
        description: 'Cree une vente avec lignes produits/services, calcule les montants et retourne le ticket initialise.'
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['items'],
            properties: [
                new OA\Property(property: 'customerId', type: 'integer', nullable: true, example: 1),
                new OA\Property(property: 'globalDiscount', type: 'number', format: 'float', minimum: 0, example: 2.50),
                new OA\Property(
                    property: 'items',
                    type: 'array',
                    items: new OA\Items(
                        required: ['itemType', 'itemId', 'quantity'],
                        properties: [
                            new OA\Property(property: 'itemType', type: 'string', enum: ['product', 'service'], example: 'product'),
                            new OA\Property(property: 'itemId', type: 'integer', example: 1),
                            new OA\Property(property: 'quantity', type: 'number', format: 'float', minimum: 0.01, example: 1),
                            new OA\Property(property: 'discountAmount', type: 'number', format: 'float', minimum: 0, example: 0),
                            new OA\Property(property: 'taxRate', type: 'number', format: 'float', minimum: 0, example: 20)
                        ],
                        type: 'object'
                    )
                )
            ],
            type: 'object'
        )
    )]
    #[OA\Response(response: 201, description: 'Ticket cree avec succes')]
    #[OA\Response(response: 400, description: 'Payload invalide ou reference metier introuvable')]
    #[OA\Response(response: 401, description: 'Authentification requise')]
    #[OA\Response(response: 403, description: 'Role employe requis')]
    #[Route('/pos/sales', name: 'create_sale', methods: ['POST'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function createSale(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $items = $payload['items'] ?? null;
        if (!is_array($items) || $items === []) {
            throw new BadRequestHttpException('items est requis.');
        }

        $sale = new Sale();
        $sale->setCustomer($this->resolveCustomer($payload['customerId'] ?? null));
        $sale->setSeller($this->getUser());
        $sale->setStore($this->resolveSaleStore($payload['storeId'] ?? null));
        $sale->setStatus(Sale::STATUS_OPEN);
        $sale->setPaymentStatus(Sale::PAYMENT_PENDING);

        $normalized = [];
        foreach ($items as $itemPayload) {
            $normalized[] = $this->createSaleItem($sale, $itemPayload);
        }

        $globalDiscount = max(0.0, (float) ($payload['globalDiscount'] ?? 0));
        $totals = $this->calculator->compute($normalized, $globalDiscount);

        $this->applyTotals($sale, $totals);
        $this->em->persist($sale);
        $this->em->flush();

        return $this->json($this->serializeSale($sale), 201);
    }

    #[OA\Post(
        path: '/api/v1/pos/sales/{id}/suspend',
        tags: ['POS'],
        summary: 'Suspendre un ticket',
        description: 'Place un ticket en attente pour reprise ulterieure sans perte de lignes.'
    )]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer', minimum: 1))]
    #[OA\RequestBody(
        required: false,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'reason', type: 'string', nullable: true, example: 'Client absent temporairement')
            ],
            type: 'object'
        )
    )]
    #[OA\Response(response: 200, description: 'Ticket suspendu')]
    #[OA\Response(response: 400, description: 'Vente deja finalisee')]
    #[OA\Response(response: 404, description: 'Vente introuvable')]
    #[Route('/pos/sales/{id}/suspend', name: 'suspend_sale', methods: ['POST'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function suspendSale(int $id, Request $request): JsonResponse
    {
        $sale = $this->findSaleOrFail($id);
        if ($sale->getStatus() === Sale::STATUS_COMPLETED) {
            throw new BadRequestHttpException('Une vente finalisee ne peut pas etre suspendue.');
        }

        $payload = $this->decodeJson($request, true);
        $ticket = new SuspendedTicket();
        $ticket->setSale($sale);
        $ticket->setReason(isset($payload['reason']) ? trim((string) $payload['reason']) : null);

        $sale->setStatus(Sale::STATUS_SUSPENDED);
        $sale->touch();

        $this->em->persist($ticket);
        $this->em->flush();

        return $this->json($this->serializeSale($sale));
    }

    #[OA\Post(
        path: '/api/v1/pos/sales/{id}/resume',
        tags: ['POS'],
        summary: 'Reprendre un ticket suspendu',
        description: 'Remet un ticket suspendu en statut ouvert pour reprise de vente.'
    )]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer', minimum: 1))]
    #[OA\Response(response: 200, description: 'Ticket repris')]
    #[OA\Response(response: 400, description: 'Le ticket n est pas suspendu')]
    #[OA\Response(response: 404, description: 'Vente introuvable')]
    #[Route('/pos/sales/{id}/resume', name: 'resume_sale', methods: ['POST'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function resumeSale(int $id): JsonResponse
    {
        $sale = $this->findSaleOrFail($id);
        if ($sale->getStatus() !== Sale::STATUS_SUSPENDED) {
            throw new BadRequestHttpException('Ce ticket n est pas suspendu.');
        }

        $ticket = $this->em->getRepository(SuspendedTicket::class)->findOneBy(['sale' => $sale, 'resumedAt' => null]);
        if ($ticket instanceof SuspendedTicket) {
            $ticket->setResumedAt(new \DateTimeImmutable());
        }

        $sale->setStatus(Sale::STATUS_OPEN);
        $sale->touch();
        $this->em->flush();

        return $this->json($this->serializeSale($sale));
    }

    #[OA\Post(
        path: '/api/v1/pos/sales/{id}/payments',
        tags: ['POS'],
        summary: 'Encaisser un ticket',
        description: 'Enregistre un paiement et finalise la vente dans une transaction atomique.'
    )]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer', minimum: 1))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['method', 'amount'],
            properties: [
                new OA\Property(property: 'method', type: 'string', enum: ['cash', 'card'], example: 'cash'),
                new OA\Property(property: 'amount', type: 'number', format: 'float', minimum: 0.01, example: 57.48),
                new OA\Property(property: 'externalRef', type: 'string', nullable: true, example: 'TPE-REF-2026-0001')
            ],
            type: 'object'
        )
    )]
    #[OA\Response(response: 200, description: 'Paiement accepte et vente finalisee')]
    #[OA\Response(response: 400, description: 'Regle metier paiement invalide')]
    #[OA\Response(response: 404, description: 'Vente introuvable')]
    #[Route('/pos/sales/{id}/payments', name: 'pay_sale', methods: ['POST'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function paySale(int $id, Request $request): JsonResponse
    {
        $sale = $this->findSaleOrFail($id);
        if ($sale->getStatus() === Sale::STATUS_COMPLETED) {
            throw new BadRequestHttpException('La vente est deja payee.');
        }

        $payload = $this->decodeJson($request);
        $method = (string) ($payload['method'] ?? '');
        $amount = round((float) ($payload['amount'] ?? 0), 2);
        if (!in_array($method, [Payment::METHOD_CASH, Payment::METHOD_CARD], true)) {
            throw new BadRequestHttpException('Methode de paiement invalide.');
        }
        if ($amount <= 0) {
            throw new BadRequestHttpException('Le montant doit etre positif.');
        }
        if ($amount < (float) $sale->getTotal()) {
            throw new BadRequestHttpException('Le montant encaisse ne couvre pas le total du ticket.');
        }

        // Le paiement et l'etat de la vente sont ecrits ensemble pour eviter une vente "payee" sans trace de reglement.
        $this->em->getConnection()->transactional(function () use ($sale, $method, $amount, $payload): void {
            $payment = (new Payment())
                ->setSale($sale)
                ->setMethod($method)
                ->setAmount(number_format($amount, 2, '.', ''))
                ->setStatus(Payment::STATUS_ACCEPTED)
                ->setExternalRef(isset($payload['externalRef']) ? trim((string) $payload['externalRef']) : null);

            if ($sale->getReceiptNumber() === null) {
                $sale->setReceiptNumber($this->generateReceiptNumber($sale));
            }

            foreach ($sale->getItems() as $item) {
                if ($item->getItemType() !== 'product') {
                    continue;
                }

                $product = $this->productRepository->find($item->getItemId());
                if ($product instanceof Product) {
                    if ($product->getStock() < (int) round((float) $item->getQuantity())) {
                        throw new BadRequestHttpException(sprintf(
                            'Stock insuffisant pour "%s".',
                            $product->getName()
                        ));
                    }

                    // On decremente le stock seulement a l'encaissement valide pour eviter de reserver du stock trop tot.
                    $this->stockManager->applyMovement(
                        $product,
                        'out',
                        (int) round((float) $item->getQuantity()),
                        'POS sale payment',
                        sprintf('Sale #%d / %s', $sale->getId(), $sale->getReceiptNumber() ?? 'pending-receipt'),
                        true
                    );
                }
            }

            $sale->setPaymentStatus(Sale::PAYMENT_PAID);
            $sale->setStatus(Sale::STATUS_COMPLETED);
            $sale->touch();

            $this->em->persist($payment);
            $this->em->flush();
        });

        if ($sale->getCustomer() instanceof Customer) {
            $event = $this->crmService->earnPointsFromPaidAmount($sale->getCustomer(), (float) $sale->getTotal());
            $sale->setLoyaltyPointsEarned($event->getPointsDelta());
            $this->em->flush();
        }

        return $this->json($this->serializeSale($sale));
    }

    #[OA\Get(
        path: '/api/v1/pos/sales/{id}/receipt',
        tags: ['POS'],
        summary: 'Lire le recu de vente',
        description: 'Retourne le ticket finalise avec vendeur, paiement et lignes pour impression ou consultation.'
    )]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer', minimum: 1))]
    #[OA\Response(response: 200, description: 'Recu retourne')]
    #[OA\Response(response: 404, description: 'Vente introuvable')]
    #[Route('/pos/sales/{id}/receipt', name: 'sale_receipt', methods: ['GET'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function saleReceipt(int $id): JsonResponse
    {
        $sale = $this->findSaleOrFail($id);

        return $this->json([
            'receipt' => $this->serializeSale($sale),
        ]);
    }

    #[OA\Get(
        path: '/api/v1/customers/search',
        tags: ['Clients'],
        summary: 'Rechercher un client pour la caisse',
        description: 'Recherche rapide par nom, email ou numero de telephone.'
    )]
    #[OA\Parameter(name: 'q', in: 'query', required: true, schema: new OA\Schema(type: 'string', minLength: 2))]
    #[OA\Response(response: 200, description: 'Clients trouves')]
    #[Route('/customers/search', name: 'customer_search', methods: ['GET'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function searchCustomers(Request $request): JsonResponse
    {
        $term = trim((string) $request->query->get('q', ''));
        if (strlen($term) < 2) {
            return $this->json(['data' => []]);
        }

        $items = $this->customerRepository->searchByTerm($term, 8);

        return $this->json([
            'data' => array_map(fn(Customer $customer) => [
                'id' => $customer->getId(),
                'fullName' => $customer->getFullName(),
                'email' => $customer->getUser()->getEmail(),
                'phoneNumber' => $customer->getPhoneNumber(),
            ], $items),
        ]);
    }

    #[OA\Get(
        path: '/api/v1/pos/suspended-sales',
        tags: ['POS'],
        summary: 'Lister les tickets suspendus',
        description: 'Retourne les ventes suspendues a reprendre depuis la caisse.'
    )]
    #[OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, default: 1))]
    #[OA\Parameter(name: 'perPage', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20))]
    #[OA\Response(response: 200, description: 'Tickets suspendus retournes')]
    #[Route('/pos/suspended-sales', name: 'suspended_sales', methods: ['GET'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function suspendedSales(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('perPage', 20)));
        $result = $this->saleRepository->findSuspendedSales($page, $perPage);

        return $this->json([
            'data' => array_map(fn(Sale $sale) => $this->serializeSale($sale), $result['items']),
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $perPage),
            ],
        ]);
    }

    #[OA\Get(
        path: '/api/v1/pos/issued-sales',
        tags: ['POS'],
        summary: 'Lister les ventes encaissees',
        description: 'Retourne les ventes finalisees avec recu emis. Peut etre filtre par client.'
    )]
    #[OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, default: 1))]
    #[OA\Parameter(name: 'perPage', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20))]
    #[OA\Parameter(name: 'customerId', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, nullable: true))]
    #[OA\Response(response: 200, description: 'Ventes encaissees retournees')]
    #[OA\Response(response: 404, description: 'Client introuvable')]
    #[Route('/pos/issued-sales', name: 'issued_sales', methods: ['GET'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function issuedSales(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('perPage', 20)));
        $customerId = $request->query->get('customerId');
        $customer = null;

        if ($customerId !== null && $customerId !== '') {
            $customer = $this->em->getRepository(Customer::class)->find((int) $customerId);
            if (!$customer instanceof Customer) {
                throw new NotFoundHttpException('Client introuvable.');
            }
        }

        $result = $this->saleRepository->findIssuedSales($page, $perPage, null, $customer);

        return $this->json([
            'data' => array_map(fn(Sale $sale) => $this->serializeSale($sale), $result['items']),
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $perPage),
            ],
        ]);
    }

    #[OA\Get(
        path: '/api/v1/customers/{id}/sales',
        tags: ['Clients'],
        summary: 'Lister l historique d achats d un client',
        description: 'Retourne la liste paginee des ventes rattachees a un client.'
    )]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer', minimum: 1))]
    #[OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, default: 1))]
    #[OA\Parameter(name: 'perPage', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20))]
    #[OA\Response(response: 200, description: 'Historique client retourne')]
    #[OA\Response(response: 404, description: 'Client introuvable')]
    #[Route('/customers/{id}/sales', name: 'customer_sales', methods: ['GET'])]
    #[IsGranted('ROLE_EMPLOYEE')]
    public function customerSales(int $id, Request $request): JsonResponse
    {
        $customer = $this->em->getRepository(Customer::class)->find($id);
        if (!$customer instanceof Customer) {
            throw new NotFoundHttpException('Client introuvable.');
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('perPage', 20)));
        $result = $this->saleRepository->findCustomerHistory($customer->getId(), $page, $perPage);

        return $this->json([
            'data' => array_map(fn(Sale $sale) => $this->serializeSale($sale), $result['items']),
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $perPage),
            ],
        ]);
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

    private function createSaleItem(Sale $sale, mixed $itemPayload): array
    {
        if (!is_array($itemPayload)) {
            throw new BadRequestHttpException('Ligne de ticket invalide.');
        }

        $itemType = (string) ($itemPayload['itemType'] ?? '');
        $itemId = (int) ($itemPayload['itemId'] ?? 0);
        $quantity = round((float) ($itemPayload['quantity'] ?? 0), 2);
        if (!in_array($itemType, ['product', 'service'], true) || $itemId <= 0 || $quantity <= 0) {
            throw new BadRequestHttpException('itemType, itemId et quantity sont obligatoires.');
        }

        if ($itemType === 'product') {
            $product = $this->productRepository->find($itemId);
            if (!$product instanceof Product) {
                throw new BadRequestHttpException('Produit introuvable.');
            }
            if (!$product->isActive()) {
                throw new BadRequestHttpException('Ce produit est inactif et ne peut pas etre ajoute au ticket.');
            }
            $label = $product->getName();
            $unitPrice = (float) $product->getPrice();
        } else {
            $service = $this->serviceRepository->find($itemId);
            if (!$service instanceof Service) {
                throw new BadRequestHttpException('Service introuvable.');
            }
            if (!$service->isActive()) {
                throw new BadRequestHttpException('Ce service est inactif et ne peut pas etre ajoute au ticket.');
            }
            $label = $service->getName();
            $unitPrice = (float) $service->getPrice();
        }

        $discountAmount = max(0.0, (float) ($itemPayload['discountAmount'] ?? 0));
        $taxRate = max(0.0, (float) ($itemPayload['taxRate'] ?? 0));
        $lineTotals = $this->calculator->compute([[
            'unitPrice' => $unitPrice,
            'quantity' => $quantity,
            'discountAmount' => $discountAmount,
            'taxRate' => $taxRate,
        ]])['lines'][0];

        $saleItem = (new SaleItem())
            ->setSale($sale)
            ->setItemType($itemType)
            ->setItemId($itemId)
            ->setLabel($label)
            ->setUnitPrice(number_format($unitPrice, 2, '.', ''))
            ->setQuantity(number_format($quantity, 2, '.', ''))
            ->setDiscountAmount(number_format($discountAmount, 2, '.', ''))
            ->setTaxRate(number_format($taxRate, 2, '.', ''))
            ->setLineTotal(number_format($lineTotals['lineTotal'], 2, '.', ''));

        $sale->addItem($saleItem);

        return [
            'unitPrice' => $unitPrice,
            'quantity' => $quantity,
            'discountAmount' => $discountAmount,
            'taxRate' => $taxRate,
        ];
    }

    private function resolveSaleStore(mixed $storeId): ?Store
    {
        if ($storeId !== null && $storeId !== '') {
            $store = $this->em->getRepository(Store::class)->find((int) $storeId);
            if (!$store instanceof Store) {
                throw new BadRequestHttpException('storeId invalide.');
            }

            return $store;
        }

        $employee = $this->em->getRepository(Employee::class)->findOneBy(['user' => $this->getUser()]);
        if ($employee instanceof Employee) {
            return $employee->getStore();
        }

        return null;
    }

    private function applyTotals(Sale $sale, array $totals): void
    {
        $sale
            ->setSubTotal(number_format($totals['subTotal'], 2, '.', ''))
            ->setDiscountTotal(number_format($totals['discountTotal'], 2, '.', ''))
            ->setTaxTotal(number_format($totals['taxTotal'], 2, '.', ''))
            ->setTotal(number_format($totals['total'], 2, '.', ''));
    }

    private function findSaleOrFail(int $id): Sale
    {
        $sale = $this->saleRepository->find($id);
        if (!$sale instanceof Sale) {
            throw new NotFoundHttpException('Vente introuvable.');
        }

        return $sale;
    }

    private function generateReceiptNumber(Sale $sale): string
    {
        return sprintf(
            'RCT-%s-%06d',
            (new \DateTimeImmutable())->format('Ymd'),
            (int) $sale->getId()
        );
    }

    private function serializeSale(Sale $sale): array
    {
        return [
            'id' => $sale->getId(),
            'status' => $sale->getStatus(),
            'paymentStatus' => $sale->getPaymentStatus(),
            'receiptNumber' => $sale->getReceiptNumber(),
            'customer' => $sale->getCustomer() ? [
                'id' => $sale->getCustomer()?->getId(),
                'fullName' => $sale->getCustomer()?->getFullName(),
            ] : null,
            'seller' => $sale->getSeller() ? [
                'id' => $sale->getSeller()?->getId(),
                'email' => $sale->getSeller()?->getEmail(),
            ] : null,
            'store' => $sale->getStore() ? [
                'id' => $sale->getStore()?->getId(),
                'name' => $sale->getStore()?->getName(),
            ] : null,
            'subTotal' => (float) $sale->getSubTotal(),
            'discountTotal' => (float) $sale->getDiscountTotal(),
            'taxTotal' => (float) $sale->getTaxTotal(),
            'total' => (float) $sale->getTotal(),
            'loyalty' => $sale->getCustomer() ? [
                'pointsBalance' => $this->crmService->ensureLoyaltyAccount($sale->getCustomer())->getPointsBalance(),
                'pointsEarned' => $sale->getLoyaltyPointsEarned(),
                'subscriptionName' => $this->crmService->ensureLoyaltyAccount($sale->getCustomer())->getSubscriptionName(),
                'visitCardName' => $this->crmService->ensureLoyaltyAccount($sale->getCustomer())->getVisitCardName(),
                'visitCardUsed' => $this->crmService->ensureLoyaltyAccount($sale->getCustomer())->getVisitCardUsed(),
                'visitCardTarget' => $this->crmService->ensureLoyaltyAccount($sale->getCustomer())->getVisitCardTarget(),
            ] : null,
            'items' => array_map(
                fn(SaleItem $item) => [
                    'id' => $item->getId(),
                    'itemType' => $item->getItemType(),
                    'itemId' => $item->getItemId(),
                    'label' => $item->getLabel(),
                    'unitPrice' => (float) $item->getUnitPrice(),
                    'quantity' => (float) $item->getQuantity(),
                    'discountAmount' => (float) $item->getDiscountAmount(),
                    'taxRate' => (float) $item->getTaxRate(),
                    'lineTotal' => (float) $item->getLineTotal(),
                ],
                $sale->getItems()->toArray()
            ),
            'payments' => array_map(
                fn(Payment $payment) => [
                    'id' => $payment->getId(),
                    'method' => $payment->getMethod(),
                    'amount' => (float) $payment->getAmount(),
                    'status' => $payment->getStatus(),
                    'paidAt' => $payment->getPaidAt()->format(DATE_ATOM),
                    'externalRef' => $payment->getExternalRef(),
                ],
                $sale->getPayments()->toArray()
            ),
            'createdAt' => $sale->getCreatedAt()->format(DATE_ATOM),
        ];
    }
}
