<?php

namespace App\Service;

use App\Entity\Cart;
use App\Entity\Customer;
use App\Entity\GiftVoucher;
use App\Entity\Order;
use App\Entity\OrderItem;
use App\Entity\Product;
use App\Entity\ProductReservation;
use App\Entity\Store;
use App\Repository\CartRepository;
use App\Repository\ProductRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

final class EcommerceService
{
    public function __construct(
        private readonly CartRepository $cartRepository,
        private readonly ProductRepository $productRepository,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function getOrCreateOpenCart(Customer $customer): Cart
    {
        $cart = $this->cartRepository->findOpenByCustomer($customer);
        if ($cart instanceof Cart) {
            return $cart;
        }

        $cart = (new Cart())
            ->setCustomer($customer)
            ->setStatus(Cart::STATUS_OPEN)
            ->setCurrency('eur')
            ->setItems([]);
        $this->em->persist($cart);
        $this->em->flush();

        return $cart;
    }

    public function addItem(Cart $cart, int $productId, int $quantity): Cart
    {
        if ($quantity <= 0) {
            throw new BadRequestHttpException('La quantite doit etre positive.');
        }
        $product = $this->findProduct($productId);
        $items = $cart->getItems();
        $found = false;

        foreach ($items as &$item) {
            if ((int) $item['productId'] === $productId) {
                $item['quantity'] = (int) $item['quantity'] + $quantity;
                $found = true;
                break;
            }
        }
        unset($item);

        if (!$found) {
            $items[] = ['productId' => $productId, 'quantity' => $quantity];
        }

        $requested = array_reduce($items, static function (int $carry, array $line) use ($productId): int {
            return $carry + (((int) $line['productId'] === $productId) ? (int) $line['quantity'] : 0);
        }, 0);
        if ($requested > $this->availableStockForCustomer($product, $cart->getCustomer())) {
            throw new BadRequestHttpException('Stock insuffisant pour la quantite demandee.');
        }

        $cart->setItems($items);
        $cart->touch();
        $this->em->flush();

        return $cart;
    }

    public function updateItem(Cart $cart, int $productId, int $quantity): Cart
    {
        if ($quantity < 0) {
            throw new BadRequestHttpException('La quantite ne peut pas etre negative.');
        }
        $items = $cart->getItems();
        $kept = [];
        $found = false;

        foreach ($items as $item) {
            if ((int) $item['productId'] === $productId) {
                $found = true;
                if ($quantity > 0) {
                    $kept[] = ['productId' => $productId, 'quantity' => $quantity];
                }
                continue;
            }
            $kept[] = $item;
        }

        if (!$found) {
            throw new BadRequestHttpException('Article non present dans le panier.');
        }

        $product = $this->findProduct($productId);
        if ($quantity > $this->availableStockForCustomer($product, $cart->getCustomer())) {
            throw new BadRequestHttpException('Stock insuffisant pour la quantite demandee.');
        }

        $cart->setItems($kept);
        $cart->touch();
        $this->em->flush();

        return $cart;
    }

    public function removeItem(Cart $cart, int $productId): Cart
    {
        $items = array_values(array_filter(
            $cart->getItems(),
            fn(array $item) => (int) $item['productId'] !== $productId
        ));
        $cart->setItems($items);
        $cart->touch();
        $this->em->flush();

        return $cart;
    }

    public function applyGiftVoucher(Cart $cart, Customer $customer, string $code): Cart
    {
        $normalizedCode = strtoupper(trim($code));
        if ($normalizedCode === '') {
            throw new BadRequestHttpException('Gift voucher code is required.');
        }

        /** @var GiftVoucher|null $voucher */
        $voucher = $this->em->getRepository(GiftVoucher::class)->findOneBy(['code' => $normalizedCode]);
        if (!$voucher instanceof GiftVoucher) {
            throw new BadRequestHttpException('This gift voucher could not be found.');
        }

        $this->assertGiftVoucherCanBeApplied($voucher, $customer);

        $cart->setAppliedGiftVoucher($voucher);
        $cart->touch();
        $this->em->flush();

        return $cart;
    }

    public function removeGiftVoucher(Cart $cart): Cart
    {
        $cart->setAppliedGiftVoucher(null);
        $cart->touch();
        $this->em->flush();

        return $cart;
    }

    /**
     * @return array{subTotal:float,taxTotal:float,total:float,lines:array<int,array{product:Product,quantity:int,unitPrice:float,lineTotal:float}>}
     */
    public function computeCart(Cart $cart): array
    {
        $subTotal = 0.0;
        $taxTotal = 0.0;
        $lines = [];

        foreach ($cart->getItems() as $item) {
            $product = $this->findProduct((int) $item['productId']);
            $quantity = max(1, (int) $item['quantity']);
            $unitPrice = (float) $product->getPrice();
            $lineSub = round($unitPrice * $quantity, 2);
            $lineTax = round($lineSub * 0.2, 2);

            $subTotal += $lineSub;
            $taxTotal += $lineTax;

            $lines[] = [
                'product' => $product,
                'quantity' => $quantity,
                'unitPrice' => $unitPrice,
                'lineTotal' => round($lineSub + $lineTax, 2),
            ];
        }

        $subTotal = round($subTotal, 2);
        $taxTotal = round($taxTotal, 2);
        $grossTotal = round($subTotal + $taxTotal, 2);
        $giftVoucherDiscount = 0.0;
        $appliedGiftVoucher = $cart->getAppliedGiftVoucher();

        if ($appliedGiftVoucher instanceof GiftVoucher) {
            $this->assertGiftVoucherCanBeApplied($appliedGiftVoucher, $cart->getCustomer());
            $giftVoucherDiscount = min((float) $appliedGiftVoucher->getBalanceAmount(), $grossTotal);
            $giftVoucherDiscount = round($giftVoucherDiscount, 2);
        }

        return [
            'subTotal' => $subTotal,
            'taxTotal' => $taxTotal,
            'total' => $grossTotal,
            'giftVoucherDiscount' => $giftVoucherDiscount,
            'payableTotal' => round(max(0.0, $grossTotal - $giftVoucherDiscount), 2),
            'appliedGiftVoucher' => $appliedGiftVoucher,
            'lines' => $lines,
        ];
    }

    public function buildOrderFromCart(
        Cart $cart,
        bool $pickupInStore = false,
        ?string $pickupSlot = null,
        ?string $pickupNote = null,
        array $deliveryAddress = [],
        ?Store $store = null,
    ): Order {
        $computed = $this->computeCart($cart);
        if ($computed['lines'] === []) {
            throw new BadRequestHttpException('Le panier est vide.');
        }

        $normalizedDeliveryAddress = $this->normalizeDeliveryAddress($deliveryAddress);
        if (!$pickupInStore && $normalizedDeliveryAddress === null) {
            throw new BadRequestHttpException('L adresse de livraison est requise pour une commande a domicile.');
        }

        $order = (new Order())
            ->setCustomer($cart->getCustomer())
            ->setStore($store ?? $cart->getCustomer()->getPreferredStore())
            ->setOrderNumber('ORD-' . strtoupper(bin2hex(random_bytes(4))))
            ->setStatus(Order::STATUS_PENDING)
            ->setCurrency($cart->getCurrency())
            ->setSubTotal(number_format($computed['subTotal'], 2, '.', ''))
            ->setTaxTotal(number_format($computed['taxTotal'], 2, '.', ''))
            ->setTotal(number_format($computed['total'], 2, '.', ''))
            ->setPickupInStore($pickupInStore)
            ->setPickupSlot($pickupSlot ? trim($pickupSlot) : null)
            ->setPickupNote($pickupNote ? trim($pickupNote) : null)
            ->setDeliveryFullName($normalizedDeliveryAddress['fullName'] ?? null)
            ->setDeliveryAddressLine1($normalizedDeliveryAddress['line1'] ?? null)
            ->setDeliveryAddressLine2($normalizedDeliveryAddress['line2'] ?? null)
            ->setDeliveryPostalCode($normalizedDeliveryAddress['postalCode'] ?? null)
            ->setDeliveryCity($normalizedDeliveryAddress['city'] ?? null)
            ->setDeliveryCountry($normalizedDeliveryAddress['country'] ?? null)
            ->setDeliveryInstructions($normalizedDeliveryAddress['instructions'] ?? null)
            ->setGiftVoucher($computed['appliedGiftVoucher'] instanceof GiftVoucher ? $computed['appliedGiftVoucher'] : null)
            ->setGiftVoucherAmount(number_format((float) $computed['giftVoucherDiscount'], 2, '.', ''));

        foreach ($computed['lines'] as $line) {
            /** @var Product $product */
            $product = $line['product'];
            if ($line['quantity'] > $this->availableStockForCustomer($product, $cart->getCustomer())) {
                throw new BadRequestHttpException(sprintf('Stock insuffisant pour le produit %s.', $product->getName()));
            }
            $item = (new OrderItem())
                ->setOrder($order)
                ->setProduct($product)
                ->setProductName($product->getName())
                ->setProductSku($product->getSku())
                ->setQuantity($line['quantity'])
                ->setUnitPrice(number_format($line['unitPrice'], 2, '.', ''))
                ->setLineTotal(number_format($line['lineTotal'], 2, '.', ''));
            $order->addItem($item);
        }

        return $order;
    }

    /**
     * @param array<string, mixed> $deliveryAddress
     * @return array<string, string>|null
     */
    private function normalizeDeliveryAddress(array $deliveryAddress): ?array
    {
        if ($deliveryAddress === []) {
            return null;
        }

        $normalized = [
            'fullName' => trim((string) ($deliveryAddress['fullName'] ?? '')),
            'line1' => trim((string) ($deliveryAddress['line1'] ?? '')),
            'line2' => trim((string) ($deliveryAddress['line2'] ?? '')),
            'postalCode' => trim((string) ($deliveryAddress['postalCode'] ?? '')),
            'city' => trim((string) ($deliveryAddress['city'] ?? '')),
            'country' => trim((string) ($deliveryAddress['country'] ?? '')),
            'instructions' => trim((string) ($deliveryAddress['instructions'] ?? '')),
        ];

        foreach (['fullName', 'line1', 'postalCode', 'city', 'country'] as $requiredField) {
            if ($normalized[$requiredField] === '') {
                throw new BadRequestHttpException('L adresse de livraison est incomplete.');
            }
        }

        return $normalized;
    }

    private function findProduct(int $id): Product
    {
        $product = $this->productRepository->find($id);
        if (!$product instanceof Product || !$product->isActive()) {
            throw new BadRequestHttpException('Produit invalide dans le panier.');
        }

        return $product;
    }

    public function reserveProduct(Customer $customer, Product $product, int $quantity, int $durationMinutes, ?Store $store = null): ProductReservation
    {
        if ($quantity <= 0) {
            throw new BadRequestHttpException('La quantite de reservation doit etre positive.');
        }
        if ($durationMinutes < 5 || $durationMinutes > 24 * 60) {
            throw new BadRequestHttpException('durationMinutes doit etre compris entre 5 et 1440.');
        }

        $this->expireReservations();
        if ($quantity > $this->availableStockForCustomer($product, $customer)) {
            throw new BadRequestHttpException('Stock insuffisant pour cette reservation.');
        }

        $reservation = (new ProductReservation())
            ->setCustomer($customer)
            ->setProduct($product)
            ->setStore($store ?? $customer->getPreferredStore())
            ->setQuantity($quantity)
            ->setStatus(ProductReservation::STATUS_ACTIVE)
            ->setExpiresAt((new \DateTimeImmutable())->modify(sprintf('+%d minutes', $durationMinutes)));

        $this->em->persist($reservation);
        $this->em->flush();

        return $reservation;
    }

    public function cancelReservation(ProductReservation $reservation, Customer $customer): ProductReservation
    {
        if ($reservation->getCustomer()->getId() !== $customer->getId()) {
            throw new BadRequestHttpException('Reservation non autorisee.');
        }
        if ($reservation->getStatus() !== ProductReservation::STATUS_ACTIVE) {
            return $reservation;
        }

        $reservation->setStatus(ProductReservation::STATUS_CANCELLED);
        $reservation->touch();
        $this->em->flush();

        return $reservation;
    }

    public function markReservationPickedUp(ProductReservation $reservation): ProductReservation
    {
        if ($reservation->getStatus() !== ProductReservation::STATUS_ACTIVE) {
            throw new BadRequestHttpException('Seules les reservations actives peuvent etre cloturees.');
        }
        if ($reservation->getExpiresAt() <= new \DateTimeImmutable()) {
            $reservation->setStatus(ProductReservation::STATUS_EXPIRED);
            $reservation->touch();
            $this->em->flush();
            throw new BadRequestHttpException('Cette reservation est expiree.');
        }

        $product = $reservation->getProduct();
        $newStock = $product->getStock() - $reservation->getQuantity();
        if ($newStock < 0) {
            throw new BadRequestHttpException('Stock insuffisant pour finaliser ce retrait.');
        }

        $product->setStock($newStock)->touch();
        $reservation->setStatus(ProductReservation::STATUS_PICKED_UP);
        $reservation->touch();
        $this->em->flush();

        return $reservation;
    }

    public function expireReservations(): int
    {
        $expired = $this->em->createQueryBuilder()
            ->select('r')
            ->from(ProductReservation::class, 'r')
            ->where('r.status = :active')
            ->andWhere('r.expiresAt <= :now')
            ->setParameter('active', ProductReservation::STATUS_ACTIVE)
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->getResult();

        $count = 0;
        foreach ($expired as $reservation) {
            /** @var ProductReservation $reservation */
            $reservation->setStatus(ProductReservation::STATUS_EXPIRED);
            $reservation->touch();
            $count++;
        }
        if ($count > 0) {
            $this->em->flush();
        }

        return $count;
    }

    public function availableStockForCustomer(Product $product, Customer $customer): int
    {
        $this->expireReservations();
        $reservedByOthers = (int) $this->em->createQueryBuilder()
            ->select('COALESCE(SUM(r.quantity), 0)')
            ->from(ProductReservation::class, 'r')
            ->where('r.product = :product')
            ->andWhere('r.status = :active')
            ->andWhere('r.customer != :customer')
            ->setParameter('product', $product)
            ->setParameter('active', ProductReservation::STATUS_ACTIVE)
            ->setParameter('customer', $customer)
            ->getQuery()
            ->getSingleScalarResult();

        return max(0, $product->getStock() - $reservedByOthers);
    }

    private function assertGiftVoucherCanBeApplied(GiftVoucher $voucher, Customer $customer): void
    {
        if (!$voucher->getCustomer() instanceof Customer || $voucher->getCustomer()->getId() !== $customer->getId()) {
            throw new BadRequestHttpException('This gift voucher is not linked to your account.');
        }

        if ($voucher->getStatus() !== GiftVoucher::STATUS_ACTIVE) {
            throw new BadRequestHttpException('This gift voucher is not active anymore.');
        }

        if ($voucher->getEffectiveAt() instanceof \DateTimeImmutable && $voucher->getEffectiveAt() > new \DateTimeImmutable()) {
            throw new BadRequestHttpException('This gift voucher is not active yet.');
        }

        if ($voucher->getExpiresAt() instanceof \DateTimeImmutable && $voucher->getExpiresAt() < new \DateTimeImmutable()) {
            throw new BadRequestHttpException('This gift voucher has expired.');
        }

        if ((float) $voucher->getBalanceAmount() <= 0) {
            throw new BadRequestHttpException('This gift voucher has no available balance anymore.');
        }
    }
}
