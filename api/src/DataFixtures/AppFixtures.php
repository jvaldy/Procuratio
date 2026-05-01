<?php

namespace App\DataFixtures;

use App\Entity\Brand;
use App\Entity\Category;
use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\EmployeeAvailability;
use App\Entity\Order;
use App\Entity\OrderItem;
use App\Entity\Payment;
use App\Entity\PaymentEvent;
use App\Entity\Product;
use App\Entity\Sale;
use App\Entity\SaleItem;
use App\Entity\Service;
use App\Entity\Cart;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    public function __construct(private readonly UserPasswordHasherInterface $passwordHasher)
    {
    }

    public function load(ObjectManager $manager): void
    {
        $brands = [];
        foreach (['Luminea', 'BarberPro', 'DermaLab', 'StyleNova', 'Capiluxe'] as $name) {
            $brand = (new Brand())->setName($name)->setIsActive(true);
            $brands[] = $brand;
            $manager->persist($brand);
        }

        $categories = [];
        foreach (['Shampooing', 'Coloration', 'Soin', 'Accessoire', 'Coiffage'] as $name) {
            $category = (new Category())->setName($name)->setIsActive(true);
            $categories[] = $category;
            $manager->persist($category);
        }

        $admin = (new User())
            ->setEmail('admin@procuratio.local')
            ->setRoles(['ROLE_ADMIN']);
        $admin->setPassword($this->passwordHasher->hashPassword($admin, 'Admin123!'));
        $manager->persist($admin);

        $employeeUser = (new User())
            ->setEmail('employee@procuratio.local')
            ->setRoles(['ROLE_EMPLOYEE']);
        $employeeUser->setPassword($this->passwordHasher->hashPassword($employeeUser, 'Employee123!'));
        $manager->persist($employeeUser);

        $customerUser = (new User())
            ->setEmail('customer@procuratio.local')
            ->setRoles(['ROLE_CUSTOMER']);
        $customerUser->setPassword($this->passwordHasher->hashPassword($customerUser, 'Customer123!'));
        $manager->persist($customerUser);

        $employee = (new Employee())->setUser($employeeUser)->setFullName('Employee Demo');
        $manager->persist($employee);

        $mainCustomer = (new Customer())->setUser($customerUser)->setFullName('Customer Demo');
        $manager->persist($mainCustomer);

        $customers = [$mainCustomer];
        $customerNames = [
            'Sarah B.', 'Nadia L.', 'Amina T.', 'Julien R.', 'Karim M.', 'Lina D.', 'Sonia K.', 'Yasmine C.',
        ];
        foreach ($customerNames as $i => $fullName) {
            $user = (new User())
                ->setEmail(sprintf('client%02d@procuratio.local', $i + 1))
                ->setRoles(['ROLE_CUSTOMER']);
            $user->setPassword($this->passwordHasher->hashPassword($user, 'Client123!'));
            $manager->persist($user);

            $customer = (new Customer())->setUser($user)->setFullName($fullName);
            $customers[] = $customer;
            $manager->persist($customer);
        }

        $products = [];
        $productRows = [
            ['Shampooing Eclat', 'PROD-1001', '14.90', 30, 0, 0],
            ['Masque Nutrition+', 'PROD-1002', '22.50', 18, 2, 2],
            ['Gel Sculptant Fix', 'PROD-1003', '11.20', 42, 4, 4],
            ['Spray Volume Pro', 'PROD-1004', '16.80', 27, 1, 4],
            ['Huile Protectrice', 'PROD-1005', '19.30', 15, 2, 2],
            ['Brosse Céramique XL', 'PROD-1006', '29.90', 12, 3, 3],
            ['Crème Boucles Soft', 'PROD-1007', '13.70', 21, 0, 4],
            ['Sérum Pointes', 'PROD-1008', '17.40', 19, 2, 2],
            ['Poudre Texturisante', 'PROD-1009', '15.60', 24, 4, 4],
            ['Shampooing Purifiant', 'PROD-1010', '13.20', 36, 1, 0],
            ['Lisseur Mini', 'PROD-1011', '49.00', 8, 3, 3],
            ['Peigne Antistatique', 'PROD-1012', '9.50', 55, 3, 3],
        ];
        foreach ($productRows as [$name, $sku, $price, $stock, $brandIdx, $catIdx]) {
            $product = (new Product())
                ->setName($name)
                ->setSku($sku)
                ->setBrand($brands[$brandIdx])
                ->setCategory($categories[$catIdx])
                ->setPrice($price)
                ->setStock($stock)
                ->setIsActive(true);
            $products[] = $product;
            $manager->persist($product);
        }

        $services = [];
        $serviceRows = [
            ['Coupe Femme Signature', '35.00', 'Coupe et mise en forme', 4],
            ['Coupe Homme Dégradé', '22.00', 'Dégradé classique ou progressif', 4],
            ['Brushing Lisse', '18.00', 'Brushing cheveux courts à mi-longs', 4],
            ['Coloration Racines', '45.00', 'Retouche racines uniquement', 1],
            ['Patine Gloss', '28.00', 'Neutralisation et brillance', 1],
            ['Soin Profond Kératine', '39.00', 'Soin reconstructeur intensif', 2],
            ['Barbe Entretien', '15.00', 'Contour et taille barbe', 4],
            ['Forfait Mariage Essai', '120.00', 'Coiffure cérémonie avec essai', 4],
            ['Diagnostic Capillaire', '12.00', 'Analyse et conseil routine', 2],
            ['Pose Extensions', '95.00', 'Pose complète hors mèches', 4],
        ];
        foreach ($serviceRows as [$name, $price, $description, $catIdx]) {
            $service = (new Service())
                ->setName($name)
                ->setCategory($categories[$catIdx])
                ->setDescription($description)
                ->setPrice($price)
                ->setDurationMinutes(match ($name) {
                    'Coupe Femme Signature' => 45,
                    'Coupe Homme Dégradé' => 30,
                    'Brushing Lisse' => 30,
                    'Coloration Racines' => 60,
                    'Patine Gloss' => 35,
                    'Soin Profond Kératine' => 50,
                    'Barbe Entretien' => 25,
                    'Forfait Mariage Essai' => 120,
                    'Diagnostic Capillaire' => 20,
                    default => 90,
                })
                ->setIsActive(true);
            $services[] = $service;
            $manager->persist($service);
        }

        $manager->flush();

        // On garde des ventes de démonstration pour que la fiche client soit exploitable dès le premier lancement.
        for ($i = 0; $i < 6; $i++) {
            $customer = $customers[$i % count($customers)];
            $product = $products[$i % count($products)];
            $service = $services[$i % count($services)];

            $sale = (new Sale())
                ->setCustomer($customer)
                ->setStatus(Sale::STATUS_COMPLETED)
                ->setPaymentStatus(Sale::PAYMENT_PAID);

            $productItemTotal = (float) $product->getPrice();
            $serviceItemTotal = (float) $service->getPrice();
            $subTotal = $productItemTotal + $serviceItemTotal;
            $taxTotal = round($subTotal * 0.2, 2);
            $total = round($subTotal + $taxTotal, 2);

            $sale
                ->setSubTotal(number_format($subTotal, 2, '.', ''))
                ->setDiscountTotal('0.00')
                ->setTaxTotal(number_format($taxTotal, 2, '.', ''))
                ->setTotal(number_format($total, 2, '.', ''));

            $saleItemProduct = (new SaleItem())
                ->setSale($sale)
                ->setItemType('product')
                ->setItemId((int) $product->getId())
                ->setLabel($product->getName())
                ->setUnitPrice($product->getPrice())
                ->setQuantity('1.00')
                ->setDiscountAmount('0.00')
                ->setTaxRate('20.00')
                ->setLineTotal(number_format($productItemTotal * 1.2, 2, '.', ''));

            $saleItemService = (new SaleItem())
                ->setSale($sale)
                ->setItemType('service')
                ->setItemId((int) $service->getId())
                ->setLabel($service->getName())
                ->setUnitPrice($service->getPrice())
                ->setQuantity('1.00')
                ->setDiscountAmount('0.00')
                ->setTaxRate('20.00')
                ->setLineTotal(number_format($serviceItemTotal * 1.2, 2, '.', ''));

            $sale->addItem($saleItemProduct);
            $sale->addItem($saleItemService);

            $payment = (new Payment())
                ->setSale($sale)
                ->setMethod(Payment::METHOD_CASH)
                ->setAmount(number_format($total, 2, '.', ''))
                ->setStatus(Payment::STATUS_ACCEPTED);

            $manager->persist($sale);
            $manager->persist($payment);
        }

        for ($day = 1; $day <= 6; $day++) {
            $availability = (new EmployeeAvailability())
                ->setEmployee($employee)
                ->setDayOfWeek($day)
                ->setStartTime(new \DateTimeImmutable('09:00'))
                ->setEndTime(new \DateTimeImmutable('18:00'))
                ->setIsAvailable(true);
            $manager->persist($availability);
        }

        // Sprint 4: on attache un contexte e-commerce concret au compte client principal.
        $openCart = (new Cart())
            ->setCustomer($mainCustomer)
            ->setStatus(Cart::STATUS_OPEN)
            ->setCurrency('eur')
            ->setItems([
                ['productId' => (int) $products[0]->getId(), 'quantity' => 2],
                ['productId' => (int) $products[3]->getId(), 'quantity' => 1],
            ]);
        $manager->persist($openCart);

        $paidOrder = (new Order())
            ->setCustomer($mainCustomer)
            ->setOrderNumber('ORD-DEMO-PAID-001')
            ->setStatus(Order::STATUS_PAID)
            ->setCurrency('eur')
            ->setSubTotal('46.60')
            ->setTaxTotal('9.32')
            ->setTotal('55.92')
            ->setStripePaymentIntentId('pi_demo_paid_001')
            ->setStripeClientSecret('pi_demo_paid_001_secret_demo')
            ->setPickupInStore(false);

        $paidOrderItemA = (new OrderItem())
            ->setOrder($paidOrder)
            ->setProduct($products[0])
            ->setProductName($products[0]->getName())
            ->setProductSku($products[0]->getSku())
            ->setQuantity(2)
            ->setUnitPrice($products[0]->getPrice())
            ->setLineTotal('35.76');
        $paidOrder->addItem($paidOrderItemA);

        $paidOrderItemB = (new OrderItem())
            ->setOrder($paidOrder)
            ->setProduct($products[3])
            ->setProductName($products[3]->getName())
            ->setProductSku($products[3]->getSku())
            ->setQuantity(1)
            ->setUnitPrice($products[3]->getPrice())
            ->setLineTotal('20.16');
        $paidOrder->addItem($paidOrderItemB);
        $manager->persist($paidOrder);

        $pickupOrder = (new Order())
            ->setCustomer($mainCustomer)
            ->setOrderNumber('ORD-DEMO-PICKUP-002')
            ->setStatus(Order::STATUS_READY_FOR_PICKUP)
            ->setCurrency('eur')
            ->setSubTotal('29.90')
            ->setTaxTotal('5.98')
            ->setTotal('35.88')
            ->setStripePaymentIntentId('pi_demo_pickup_002')
            ->setStripeClientSecret('pi_demo_pickup_002_secret_demo')
            ->setPickupInStore(true)
            ->setPickupSlot('2026-05-10 11:00')
            ->setPickupNote('Retrait comptoir principal');

        $pickupOrderItem = (new OrderItem())
            ->setOrder($pickupOrder)
            ->setProduct($products[5])
            ->setProductName($products[5]->getName())
            ->setProductSku($products[5]->getSku())
            ->setQuantity(1)
            ->setUnitPrice($products[5]->getPrice())
            ->setLineTotal('35.88');
        $pickupOrder->addItem($pickupOrderItem);
        $manager->persist($pickupOrder);

        $failedOrder = (new Order())
            ->setCustomer($mainCustomer)
            ->setOrderNumber('ORD-DEMO-FAILED-003')
            ->setStatus(Order::STATUS_FAILED)
            ->setCurrency('eur')
            ->setSubTotal('13.20')
            ->setTaxTotal('2.64')
            ->setTotal('15.84')
            ->setStripePaymentIntentId('pi_demo_failed_003')
            ->setStripeClientSecret('pi_demo_failed_003_secret_demo')
            ->setPickupInStore(false);

        $failedOrderItem = (new OrderItem())
            ->setOrder($failedOrder)
            ->setProduct($products[9])
            ->setProductName($products[9]->getName())
            ->setProductSku($products[9]->getSku())
            ->setQuantity(1)
            ->setUnitPrice($products[9]->getPrice())
            ->setLineTotal('15.84');
        $failedOrder->addItem($failedOrderItem);
        $manager->persist($failedOrder);

        $eventPaid = (new PaymentEvent())
            ->setOrder($paidOrder)
            ->setProvider('stripe')
            ->setProviderEventId('evt_demo_paid_001')
            ->setEventType('payment_intent.succeeded')
            ->setSignatureValid(true)
            ->setPayload(['id' => 'evt_demo_paid_001', 'type' => 'payment_intent.succeeded']);
        $manager->persist($eventPaid);

        $eventPickup = (new PaymentEvent())
            ->setOrder($pickupOrder)
            ->setProvider('stripe')
            ->setProviderEventId('evt_demo_pickup_002')
            ->setEventType('payment_intent.succeeded')
            ->setSignatureValid(true)
            ->setPayload(['id' => 'evt_demo_pickup_002', 'type' => 'payment_intent.succeeded']);
        $manager->persist($eventPickup);

        $eventFailed = (new PaymentEvent())
            ->setOrder($failedOrder)
            ->setProvider('stripe')
            ->setProviderEventId('evt_demo_failed_003')
            ->setEventType('payment_intent.payment_failed')
            ->setSignatureValid(true)
            ->setPayload(['id' => 'evt_demo_failed_003', 'type' => 'payment_intent.payment_failed']);
        $manager->persist($eventFailed);

        $manager->flush();
    }
}
