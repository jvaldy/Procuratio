<?php

namespace App\Service;

use App\Entity\Cart;
use App\Entity\Customer;
use App\Entity\Order;
use App\Entity\OrderItem;
use App\Entity\Product;
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

        return [
            'subTotal' => $subTotal,
            'taxTotal' => $taxTotal,
            'total' => round($subTotal + $taxTotal, 2),
            'lines' => $lines,
        ];
    }

    public function buildOrderFromCart(
        Cart $cart,
        bool $pickupInStore = false,
        ?string $pickupSlot = null,
        ?string $pickupNote = null,
    ): Order {
        $computed = $this->computeCart($cart);
        if ($computed['lines'] === []) {
            throw new BadRequestHttpException('Le panier est vide.');
        }

        $order = (new Order())
            ->setCustomer($cart->getCustomer())
            ->setOrderNumber('ORD-' . strtoupper(bin2hex(random_bytes(4))))
            ->setStatus(Order::STATUS_PENDING)
            ->setCurrency($cart->getCurrency())
            ->setSubTotal(number_format($computed['subTotal'], 2, '.', ''))
            ->setTaxTotal(number_format($computed['taxTotal'], 2, '.', ''))
            ->setTotal(number_format($computed['total'], 2, '.', ''))
            ->setPickupInStore($pickupInStore)
            ->setPickupSlot($pickupSlot ? trim($pickupSlot) : null)
            ->setPickupNote($pickupNote ? trim($pickupNote) : null);

        foreach ($computed['lines'] as $line) {
            /** @var Product $product */
            $product = $line['product'];
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

    private function findProduct(int $id): Product
    {
        $product = $this->productRepository->find($id);
        if (!$product instanceof Product || !$product->isActive()) {
            throw new BadRequestHttpException('Produit invalide dans le panier.');
        }

        return $product;
    }
}

