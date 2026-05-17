<?php

namespace App\Command;

use App\Demo\DemoBeautyCatalog;
use App\Entity\Appointment;
use App\Entity\AppointmentService;
use App\Entity\Brand;
use App\Entity\BusinessHour;
use App\Entity\Campaign;
use App\Entity\Cart;
use App\Entity\Category;
use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\EmployeeAvailability;
use App\Entity\GiftVoucher;
use App\Entity\LoyaltyAccount;
use App\Entity\LoyaltyEvent;
use App\Entity\NotificationLog;
use App\Entity\Order;
use App\Entity\OrderItem;
use App\Entity\Payment;
use App\Entity\PaymentEvent;
use App\Entity\Product;
use App\Entity\ProductReservation;
use App\Entity\ReminderRule;
use App\Entity\Sale;
use App\Entity\SaleItem;
use App\Entity\Service;
use App\Entity\StockMovement;
use App\Entity\Store;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(name: 'app:seed-full-year-demo', description: 'Populate the whole database with realistic full-year demo data.')]
class SeedFullYearDemoCommand extends Command
{
    private const CUSTOMER_COUNT = 180;
    private const EMPLOYEES_PER_STORE = 2;
    private const APPOINTMENTS_PER_EMPLOYEE_PER_MONTH = 6;
    private const ORDERS_PER_STORE = 24;
    private const SALES_PER_STORE = 28;
    private const RESERVATIONS_PER_STORE = 8;
    private const GIFT_VOUCHERS_COUNT = 90;

    private array $firstNames = [
        'Emma', 'Jade', 'Chloe', 'Camille', 'Sarah', 'Lina', 'Lea', 'Nora', 'Maya', 'Julie',
        'Yasmine', 'Sofia', 'Ines', 'Clara', 'Zoey', 'Olivia', 'Mila', 'Noa', 'Laura', 'Amina',
        'Lucas', 'Hugo', 'Nathan', 'Theo', 'Adam', 'Noah', 'Jules', 'Leo', 'Louis', 'Ethan',
        'Karim', 'Yanis', 'Julien', 'Rayan', 'Tom', 'Paul', 'Liam', 'Arthur', 'Maxime', 'Enzo',
    ];

    private array $lastNames = [
        'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
        'Simon', 'Laurent', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel',
        'Andre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'Francois', 'Martinez', 'Legrand', 'Garnier', 'Faure',
    ];

    private array $jobTitles = [
        'Senior Stylist', 'Color Specialist', 'Barber', 'Beauty Therapist', 'Salon Manager', 'Hairdresser',
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('year', null, InputOption::VALUE_REQUIRED, 'Target year to populate.', (string) (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')))->format('Y'));
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $year = max(2024, (int) $input->getOption('year'));
        $yearMarker = sprintf('Y%s', substr((string) $year, -2));

        mt_srand($year);

        if ($this->yearAlreadySeeded($yearMarker)) {
            $output->writeln(sprintf('<comment>The full-year demo dataset for %d is already present. Nothing to add.</comment>', $year));

            return Command::SUCCESS;
        }

        $output->writeln(sprintf('<info>Preparing full-year demo dataset for %d...</info>', $year));

        [$brands, $categories] = $this->ensureCatalogTaxonomy();
        $stores = $this->ensureStores();
        $services = $this->ensureServices($categories);
        $products = $this->ensureProducts($brands, $categories);
        $employees = $this->ensureEmployees($stores, $yearMarker);
        $customers = $this->ensureCustomers($stores, $yearMarker);

        $this->ensureBusinessHours();
        $this->ensureEmployeeAvailability($employees);
        $this->ensureReminderRules();
        $this->ensureCampaigns($year, $customers);
        $this->ensureLoyalty($customers, $year, $yearMarker);
        $giftVouchers = $this->ensureGiftVouchers($customers, $services, $year, $yearMarker);
        $this->ensureCarts($customers, $products, $giftVouchers, $year);
        $this->ensureReservations($customers, $products, $stores, $year, $yearMarker);
        $appointments = $this->ensureAppointments($employees, $customers, $services, $stores, $year, $yearMarker);
        $this->ensureOrders($customers, $products, $stores, $giftVouchers, $appointments, $year, $yearMarker);
        $this->ensureSales($customers, $employees, $products, $services, $stores, $year, $yearMarker);
        $this->ensureStockMovements($products, $year, $yearMarker);
        $this->ensureNotificationLogs($customers, $appointments, $year, $yearMarker);

        $this->em->flush();

        $output->writeln('<info>Full-year demo dataset created successfully.</info>');
        $output->writeln(sprintf('<comment>Stores: %d | Employees: %d | Customers: %d | Products: %d | Services: %d</comment>', count($stores), count($employees), count($customers), count($products), count($services)));

        return Command::SUCCESS;
    }

    private function yearAlreadySeeded(string $yearMarker): bool
    {
        $count = (int) $this->em->getConnection()->fetchOne(
            'SELECT COUNT(*) FROM orders WHERE order_number LIKE :prefix',
            ['prefix' => $yearMarker.'-%']
        );

        return $count > 0;
    }

    /**
     * @return array{0: Brand[], 1: Category[]}
     */
    private function ensureCatalogTaxonomy(): array
    {
        $brands = [];
        foreach (DemoBeautyCatalog::brandNames() as $name) {
            $brand = $this->em->getRepository(Brand::class)->findOneBy(['name' => $name]) ?? (new Brand())->setName($name);
            $brand->setIsActive(true);
            $this->em->persist($brand);
            $brands[$name] = $brand;
        }

        $categories = [];
        foreach (DemoBeautyCatalog::categoryNames() as $name) {
            $category = $this->em->getRepository(Category::class)->findOneBy(['name' => $name]) ?? (new Category())->setName($name);
            $category->setIsActive(true);
            $this->em->persist($category);
            $categories[$name] = $category;
        }

        $this->em->flush();

        return [array_values($brands), array_values($categories)];
    }

    /**
     * @return Store[]
     */
    private function ensureStores(): array
    {
        $definitions = [
            ['PARIS-CENTRE', 'Seanergy Paris Centre', 'Paris', 'France', 'soft', '12 Rue de Rivoli', '75001'],
            ['LYON-PRESQU', 'Seanergy Lyon Presquile', 'Lyon', 'France', 'ocean', '8 Rue Merciere', '69002'],
            ['MARSEILLE-VX', 'Seanergy Marseille Vieux-Port', 'Marseille', 'France', 'sunset', '2 Quai du Port', '13002'],
            ['BORDEAUX-Q', 'Seanergy Bordeaux Quinconces', 'Bordeaux', 'France', 'dark', '10 Cours du Chapeau Rouge', '33000'],
            ['LILLE-RIHO', 'Seanergy Lille Rihour', 'Lille', 'France', 'soft', '5 Place Rihour', '59000'],
            ['NANTES-GRAS', 'Seanergy Nantes Graslin', 'Nantes', 'France', 'ocean', '18 Rue Crebillon', '44000'],
            ['TOULOUSE-CA', 'Seanergy Toulouse Capitole', 'Toulouse', 'France', 'sunset', '4 Rue d Alsace Lorraine', '31000'],
            ['NICE-MASSEN', 'Seanergy Nice Massena', 'Nice', 'France', 'dark', '25 Avenue Jean Medecin', '06000'],
            ['STRASBOURG', 'Seanergy Strasbourg Centre', 'Strasbourg', 'France', 'soft', '6 Rue des Francs Bourgeois', '67000'],
            ['MONTPELLIER', 'Seanergy Montpellier Comedie', 'Montpellier', 'France', 'ocean', '14 Place de la Comedie', '34000'],
            ['LONDON-SOHO', 'Seanergy London Soho', 'London', 'United Kingdom', 'dark', '19 Carnaby Street', 'W1F 9PX'],
            ['NEWYORK-5TH', 'Seanergy New York Fifth Avenue', 'New York', 'United States', 'soft', '515 5th Avenue', '10017'],
            ['DUBAI-MARIN', 'Seanergy Dubai Marina', 'Dubai', 'United Arab Emirates', 'sunset', 'Dubai Marina Walk', '00000'],
            ['TOKYO-GINZA', 'Seanergy Tokyo Ginza', 'Tokyo', 'Japan', 'ocean', '3 Chome Ginza', '104-0061'],
            ['MADRID-SALA', 'Seanergy Madrid Salamanca', 'Madrid', 'Spain', 'soft', '33 Calle de Serrano', '28001'],
            ['ROME-NAVONA', 'Seanergy Rome Navona', 'Rome', 'Italy', 'sunset', '8 Piazza Navona', '00186'],
            ['BERLIN-MITTE', 'Seanergy Berlin Mitte', 'Berlin', 'Germany', 'dark', '15 Friedrichstrasse', '10117'],
            ['SYDNEY-CBD', 'Seanergy Sydney CBD', 'Sydney', 'Australia', 'ocean', '10 Market Street', '2000'],
            ['SINGAPORE-M', 'Seanergy Singapore Marina Bay', 'Singapore', 'Singapore', 'soft', '1 Bayfront Avenue', '018971'],
            ['MONTREAL-PL', 'Seanergy Montreal Plateau', 'Montreal', 'Canada', 'dark', '77 Saint Laurent Blvd', 'H2T 1S5'],
        ];

        $stores = [];
        foreach ($definitions as [$code, $name, $city, $country, $theme, $address, $postalCode]) {
            $store = $this->em->getRepository(Store::class)->findOneBy(['code' => $code]) ?? (new Store())->setCode($code);
            $store
                ->setName($name)
                ->setCity($city)
                ->setCountry($country)
                ->setThemeColor($theme)
                ->setStatus('active')
                ->setAddressLine1($address)
                ->setPostalCode($postalCode)
                ->setEmail(strtolower($code).'@seanergy.example')
                ->setPhoneNumber(sprintf('+33 1 8%02d %02d %02d %02d', mt_rand(10, 99), mt_rand(10, 99), mt_rand(10, 99), mt_rand(10, 99)));
            $store->touch();
            $this->em->persist($store);
            $stores[] = $store;
        }

        $this->em->flush();

        return $stores;
    }

    /**
     * @param Category[] $categories
     * @return Service[]
     */
    private function ensureServices(array $categories): array
    {
        $byCategory = [];
        foreach ($categories as $category) {
            $byCategory[$category->getName()] = $category;
        }

        $definitions = [
            ['Signature Women Cut', 'Shampoo, cut and blow-dry tailored to the face shape.', 'cut + blow-dry', '49.00', 60, 'Styling'],
            ['Men Fade Cut', 'Classic or progressive fade with styling finish.', 'cut + styling', '26.00', 35, 'Styling'],
            ['Express Blow-Dry', 'Quick smooth blow-dry for short or medium lengths.', 'blow-dry', '19.00', 30, 'Styling'],
            ['Root Color Refresh', 'Root touch-up with color protection finish.', 'color + care', '52.00', 75, 'Color'],
            ['Full Gloss Toner', 'Glossing service for extra shine and tone correction.', 'gloss + shine', '34.00', 45, 'Color'],
            ['Keratin Repair Ritual', 'Deep repair treatment for weakened hair.', 'keratin + mask', '42.00', 50, 'Treatment'],
            ['Hydration Facial', 'Hydration protocol with cleansing and massage.', 'cleanse + mask + massage', '58.00', 50, 'Skincare'],
            ['Scalp Detox', 'Purifying scalp service with exfoliation and massage.', 'scrub + mask', '29.00', 25, 'Scalp care'],
            ['Beard Grooming', 'Beard shaping and contouring.', 'trim + contour', '18.00', 25, 'Beard care'],
            ['Hair Diagnosis', 'Professional hair and routine consultation.', 'diagnosis', '12.00', 20, 'Treatment'],
            ['Balayage Session', 'Lightening service with custom glossing.', 'lightener + gloss', '110.00', 150, 'Color'],
            ['Bridal Hair Trial', 'Formal event hairstyle trial session.', 'trial styling', '95.00', 90, 'Styling'],
            ['Premium Blowout', 'Long-lasting blowout with volume finish.', 'wash + blowout', '28.00', 40, 'Styling'],
            ['Express Hands Ritual', 'Nourishing hand care and polish finish.', 'care + polish', '22.00', 25, 'Skincare'],
            ['Anti-Frizz Shield', 'Smoothing and anti-humidity treatment.', 'anti-frizz care', '37.00', 35, 'Treatment'],
            ['Extensions Refit', 'Maintenance refit for hair extensions.', 'refit', '78.00', 90, 'Tools'],
        ];

        $services = [];
        foreach ($definitions as [$name, $description, $composition, $price, $duration, $categoryName]) {
            $service = $this->em->getRepository(Service::class)->findOneBy(['name' => $name]) ?? (new Service())->setName($name);
            $service
                ->setCategory($byCategory[$categoryName] ?? null)
                ->setDescription($description)
                ->setComposition($composition)
                ->setPrice($price)
                ->setDurationMinutes($duration)
                ->setIsActive(true);
            $this->em->persist($service);
            $services[] = $service;
        }

        $this->em->flush();

        return $services;
    }

    /**
     * @param Brand[] $brands
     * @param Category[] $categories
     * @return Product[]
     */
    private function ensureProducts(array $brands, array $categories): array
    {
        $brandPool = [];
        foreach ($brands as $brand) {
            $brandPool[$brand->getName()] = $brand;
        }

        $categoryPool = [];
        foreach ($categories as $category) {
            $categoryPool[$category->getName()] = $category;
        }

        $definitions = DemoBeautyCatalog::sequentialProducts();

        $products = [];
        foreach ($definitions as $index => $definition) {
            $sku = sprintf('YR-%04d', 2000 + $index);
            $product = $this->em->getRepository(Product::class)->findOneBy(['sku' => $sku]) ?? (new Product())->setSku($sku);
            $product
                ->setName($definition['name'])
                ->setDescription($definition['description'])
                ->setPrice($definition['price'])
                ->setStock(mt_rand(18, 220))
                ->setBrand($brandPool[$definition['brand']] ?? reset($brandPool))
                ->setCategory($categoryPool[$definition['category']] ?? reset($categoryPool))
                ->setImageUrl($definition['image'])
                ->setIsActive(true);
            $product->touch();
            $this->em->persist($product);
            $products[] = $product;
        }

        $this->em->flush();

        return $products;
    }

    /**
     * @param Store[] $stores
     * @return Employee[]
     */
    private function ensureEmployees(array $stores, string $yearMarker): array
    {
        $employees = [];
        $employeeIndex = 1;

        foreach ($stores as $store) {
            for ($slot = 0; $slot < self::EMPLOYEES_PER_STORE; $slot++) {
                $email = sprintf('seed.%s.employee%03d@procuratio.local', strtolower($yearMarker), $employeeIndex);
                $user = $this->em->getRepository(User::class)->findOneBy(['email' => $email]) ?? (new User())
                    ->setEmail($email)
                    ->setRoles(['ROLE_EMPLOYEE']);
                if ($user->getId() === null) {
                    $user->setPassword($this->passwordHasher->hashPassword($user, 'Employee123!'));
                }
                $this->em->persist($user);

                $employee = $this->em->getRepository(Employee::class)->findOneBy(['user' => $user]) ?? (new Employee())->setUser($user);
                $employee
                    ->setFullName($this->randomPersonName())
                    ->setJobTitle($this->jobTitles[$employeeIndex % count($this->jobTitles)])
                    ->setPhoneNumber(sprintf('+336%08d', 10000000 + $employeeIndex))
                    ->setStatus('active')
                    ->setIsBookable(true)
                    ->setArchivedAt(null)
                    ->setStore($store);
                $this->em->persist($employee);
                $employees[] = $employee;
                $employeeIndex++;
            }
        }

        $this->em->flush();

        return $employees;
    }

    /**
     * @param Store[] $stores
     * @return Customer[]
     */
    private function ensureCustomers(array $stores, string $yearMarker): array
    {
        $customers = [];

        for ($i = 1; $i <= self::CUSTOMER_COUNT; $i++) {
            $email = sprintf('seed.%s.customer%03d@procuratio.local', strtolower($yearMarker), $i);
            $user = $this->em->getRepository(User::class)->findOneBy(['email' => $email]) ?? (new User())
                ->setEmail($email)
                ->setRoles(['ROLE_CUSTOMER']);
            if ($user->getId() === null) {
                $user->setPassword($this->passwordHasher->hashPassword($user, 'Customer123!'));
            }
            $this->em->persist($user);

            $customer = $this->em->getRepository(Customer::class)->findOneBy(['user' => $user]) ?? (new Customer())->setUser($user);
            $customer
                ->setFullName($this->randomPersonName())
                ->setPhoneNumber(sprintf('+336%08d', 30000000 + $i))
                ->setBirthDate(new \DateTimeImmutable(sprintf('%d-%02d-%02d', 1975 + ($i % 25), (($i - 1) % 12) + 1, (($i * 3) % 27) + 1)))
                ->setPreferredStore($stores[$i % count($stores)]);
            $this->em->persist($customer);
            $customers[] = $customer;
        }

        $this->em->flush();

        return $customers;
    }

    private function ensureBusinessHours(): void
    {
        for ($day = 1; $day <= 7; $day++) {
            $hour = $this->em->getRepository(BusinessHour::class)->findOneBy(['dayOfWeek' => $day]) ?? (new BusinessHour())->setDayOfWeek($day);
            $isOpen = $day !== 7;
            $start = $day === 6 ? '09:00' : '09:00';
            $end = $day === 6 ? '17:00' : '18:30';

            $hour
                ->setStore(null)
                ->setIsOpen($isOpen)
                ->setStartTime(new \DateTimeImmutable($start))
                ->setEndTime(new \DateTimeImmutable($end));
            $this->em->persist($hour);
        }
    }

    /**
     * @param Employee[] $employees
     */
    private function ensureEmployeeAvailability(array $employees): void
    {
        foreach ($employees as $index => $employee) {
            if ($this->em->getRepository(EmployeeAvailability::class)->count(['employee' => $employee]) > 0) {
                continue;
            }

            for ($day = 1; $day <= 6; $day++) {
                $start = $day === 6 ? '09:00' : ($index % 2 === 0 ? '09:00' : '10:00');
                $end = $day === 6 ? '16:00' : ($index % 2 === 0 ? '18:00' : '19:00');
                $availability = (new EmployeeAvailability())
                    ->setEmployee($employee)
                    ->setDayOfWeek($day)
                    ->setStartTime(new \DateTimeImmutable($start))
                    ->setEndTime(new \DateTimeImmutable($end))
                    ->setIsAvailable(true);
                $this->em->persist($availability);
            }
        }
    }

    private function ensureReminderRules(): void
    {
        $definitions = [
            ['24h email reminder', 'email', 24, true],
            ['2h sms reminder', 'sms', 2, true],
            ['72h email reminder', 'email', 72, false],
            ['Birthday sms greeting', 'sms', 168, false],
        ];

        foreach ($definitions as [$name, $channel, $offset, $active]) {
            $rule = $this->em->getRepository(ReminderRule::class)->findOneBy(['name' => $name]) ?? (new ReminderRule())->setName($name);
            $rule->setChannel($channel)->setOffsetHours($offset)->setIsActive($active);
            $this->em->persist($rule);
        }
    }

    /**
     * @param Customer[] $customers
     */
    private function ensureCampaigns(int $year, array $customers): void
    {
        $definitions = [
            ['[YEAR-SEED-'.$year.'] Mother Day Offer', 'email', ['minPoints' => 100], 'Celebrate Mother Day with an exclusive treatment offer.'],
            ['[YEAR-SEED-'.$year.'] Summer Hair Rescue', 'sms', ['minPoints' => 0], 'Your summer hair rescue offer is now available.'],
            ['[YEAR-SEED-'.$year.'] Holiday Gift Card Push', 'email', ['minPoints' => 250], 'Offer a Seanergy gift voucher for the holidays.'],
        ];

        foreach ($definitions as [$name, $channel, $segment, $message]) {
            $campaign = $this->em->getRepository(Campaign::class)->findOneBy(['name' => $name]) ?? (new Campaign())->setName($name);
            $campaign
                ->setChannel($channel)
                ->setSegment($segment)
                ->setMessageTemplate($message)
                ->setStatus(Campaign::STATUS_COMPLETED)
                ->setTargetCount(min(count($customers), 120))
                ->setSentCount((int) floor(min(count($customers), 120) * 0.94))
                ->setFailedCount((int) floor(min(count($customers), 120) * 0.06));
            $campaign->touch();
            $this->em->persist($campaign);
        }
    }

    /**
     * @param Customer[] $customers
     */
    private function ensureLoyalty(array $customers, int $year, string $yearMarker): void
    {
        $subscriptions = ['Premium Color Club', 'Glow Ritual Pass', 'Blow Dry Monthly', 'Beauty Insider Plus'];
        $visitCards = ['10 Haircut visits', '6 Facial visits', '8 Blow-dry visits', '12 Barber visits'];

        foreach ($customers as $index => $customer) {
            $account = $this->em->getRepository(LoyaltyAccount::class)->findOneBy(['customer' => $customer]) ?? (new LoyaltyAccount())->setCustomer($customer);
            $points = 150 + (($index * 37) % 2200);
            $target = [6, 8, 10, 12][$index % 4];
            $used = $index % ($target + 1);

            $account
                ->setPointsBalance($points)
                ->setIsActive(true)
                ->setSubscriptionName($subscriptions[$index % count($subscriptions)])
                ->setSubscriptionStatus($index % 8 === 0 ? 'expired' : 'active')
                ->setSubscriptionStartedAt(new \DateTimeImmutable(sprintf('%d-%02d-01 09:00:00', $year, (($index % 12) + 1))))
                ->setSubscriptionEndsAt(new \DateTimeImmutable(sprintf('%d-%02d-28 19:00:00', $year, (($index % 12) + 1))))
                ->setVisitCardName($visitCards[$index % count($visitCards)])
                ->setVisitCardTarget($target)
                ->setVisitCardUsed($used)
                ->setVisitCardActive($used < $target);
            $account->touch();
            $this->em->persist($account);

            if ($this->em->getRepository(LoyaltyEvent::class)->count(['customer' => $customer]) > 0) {
                continue;
            }

            $balance = 0;
            for ($month = 1; $month <= 12; $month++) {
                $delta = 20 + (($index + $month) % 90);
                $balance += $delta;
                $event = (new LoyaltyEvent())
                    ->setCustomer($customer)
                    ->setAccount($account)
                    ->setEventType(LoyaltyEvent::TYPE_EARN)
                    ->setPointsDelta($delta)
                    ->setBalanceAfter($balance)
                    ->setReason(sprintf('[%s] Earn after web or POS payment', $yearMarker));
                $this->setPrivateDate($event, 'createdAt', new \DateTimeImmutable(sprintf('%d-%02d-%02d 12:00:00', $year, $month, min(25, 2 + ($index % 20)))));
                $this->em->persist($event);
            }
        }
    }

    /**
     * @param Customer[] $customers
     * @param Service[] $services
     * @return GiftVoucher[]
     */
    private function ensureGiftVouchers(array $customers, array $services, int $year, string $yearMarker): array
    {
        $vouchers = [];

        for ($i = 1; $i <= self::GIFT_VOUCHERS_COUNT; $i++) {
            $code = sprintf('%sGV-%04d', $yearMarker, $i);
            $voucher = $this->em->getRepository(GiftVoucher::class)->findOneBy(['code' => $code]) ?? (new GiftVoucher())->setCode($code);
            $customer = $customers[$i % count($customers)];
            $amount = (float) [25, 40, 50, 60, 75, 100][($i - 1) % 6];
            $effectiveAt = new \DateTimeImmutable(sprintf('%d-%02d-%02d 10:00:00', $year, (($i - 1) % 12) + 1, (($i * 2) % 25) + 1));
            $status = $i % 9 === 0 ? GiftVoucher::STATUS_REDEEMED : ($i % 7 === 0 ? GiftVoucher::STATUS_EXPIRED : GiftVoucher::STATUS_ACTIVE);
            $expiresAt = $effectiveAt->modify('+365 days');
            $balance = $status === GiftVoucher::STATUS_REDEEMED
                ? '0.00'
                : ($status === GiftVoucher::STATUS_EXPIRED
                    ? number_format(max(0, $amount - 10), 2, '.', '')
                    : number_format($amount, 2, '.', ''));

            $voucher
                ->setCustomer($customer)
                ->setPurchaserName($this->randomPersonName())
                ->setRecipientName($customer->getFullName())
                ->setServiceLabel($services[$i % count($services)]->getName())
                ->setInitialAmount(number_format($amount, 2, '.', ''))
                ->setBalanceAmount($balance)
                ->setStatus($status)
                ->setEffectiveAt($effectiveAt)
                ->setExpiresAt($expiresAt)
                ->setDurationDays(365);
            $this->setPrivateDate($voucher, 'createdAt', $effectiveAt->modify('-2 days'));
            $this->setPrivateDate($voucher, 'updatedAt', $effectiveAt);
            $this->em->persist($voucher);
            $vouchers[] = $voucher;
        }

        return $vouchers;
    }

    /**
     * @param Customer[] $customers
     * @param Product[] $products
     * @param GiftVoucher[] $giftVouchers
     */
    private function ensureCarts(array $customers, array $products, array $giftVouchers, int $year): void
    {
        foreach (array_slice($customers, 0, 30) as $index => $customer) {
            $cart = $this->em->getRepository(Cart::class)->findOneBy(['customer' => $customer, 'status' => Cart::STATUS_OPEN]) ?? (new Cart())->setCustomer($customer);
            $cart
                ->setStatus(Cart::STATUS_OPEN)
                ->setCurrency('eur')
                ->setItems([
                    ['productId' => (int) $products[$index % count($products)]->getId(), 'quantity' => 1 + ($index % 3)],
                    ['productId' => (int) $products[($index + 7) % count($products)]->getId(), 'quantity' => 1],
                ])
                ->setAppliedGiftVoucher($index % 4 === 0 ? $giftVouchers[$index % count($giftVouchers)] : null);
            $this->setPrivateDate($cart, 'createdAt', new \DateTimeImmutable(sprintf('%d-%02d-%02d 15:00:00', $year, (($index % 12) + 1), (($index * 2) % 27) + 1)));
            $this->setPrivateDate($cart, 'updatedAt', new \DateTimeImmutable(sprintf('%d-%02d-%02d 17:00:00', $year, (($index % 12) + 1), (($index * 2) % 27) + 1)));
            $this->em->persist($cart);
        }
    }

    /**
     * @param Customer[] $customers
     * @param Product[] $products
     * @param Store[] $stores
     */
    private function ensureReservations(array $customers, array $products, array $stores, int $year, string $yearMarker): void
    {
        for ($storeIndex = 0; $storeIndex < count($stores); $storeIndex++) {
            for ($i = 0; $i < self::RESERVATIONS_PER_STORE; $i++) {
                $customer = $customers[($storeIndex * self::RESERVATIONS_PER_STORE + $i) % count($customers)];
                $product = $products[($storeIndex * 3 + $i) % count($products)];
                $reservation = new ProductReservation();
                $createdAt = new \DateTimeImmutable(sprintf('%d-%02d-%02d 14:%02d:00', $year, (($i + $storeIndex) % 12) + 1, (($i * 3 + $storeIndex) % 26) + 1, ($i % 2) * 30));
                $statusPool = [ProductReservation::STATUS_ACTIVE, ProductReservation::STATUS_PICKED_UP, ProductReservation::STATUS_CANCELLED, ProductReservation::STATUS_EXPIRED];
                $status = $statusPool[($i + $storeIndex) % count($statusPool)];

                $reservation
                    ->setCustomer($customer)
                    ->setProduct($product)
                    ->setStore($stores[$storeIndex])
                    ->setQuantity(1 + ($i % 2))
                    ->setStatus($status)
                    ->setExpiresAt($createdAt->modify('+3 days'))
                    ->touch();
                $this->setPrivateDate($reservation, 'createdAt', $createdAt);
                $this->setPrivateDate($reservation, 'updatedAt', $createdAt->modify('+1 day'));
                $this->em->persist($reservation);
            }
        }
    }

    /**
     * @param Employee[] $employees
     * @param Customer[] $customers
     * @param Service[] $services
     * @param Store[] $stores
     * @return Appointment[]
     */
    private function ensureAppointments(array $employees, array $customers, array $services, array $stores, int $year, string $yearMarker): array
    {
        $appointments = [];

        foreach ($employees as $employeeIndex => $employee) {
            for ($month = 1; $month <= 12; $month++) {
                for ($slot = 0; $slot < self::APPOINTMENTS_PER_EMPLOYEE_PER_MONTH; $slot++) {
                    $customer = $customers[($employeeIndex * 11 + $month + $slot) % count($customers)];
                    $day = min(27, 2 + (($employeeIndex + $slot * 3) % 24));
                    $hourPool = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];
                    $startAt = new \DateTimeImmutable(sprintf('%d-%02d-%02d %s:00', $year, $month, $day, $hourPool[$slot % count($hourPool)]));
                    $status = $startAt < new \DateTimeImmutable() ? Appointment::STATUS_COMPLETED : Appointment::STATUS_SCHEDULED;
                    if (($slot + $month + $employeeIndex) % 13 === 0) {
                        $status = Appointment::STATUS_CANCELLED;
                    }
                    $store = $employee->getStore() ?? $stores[$employeeIndex % count($stores)];
                    $appointment = (new Appointment())
                        ->setEmployee($employee)
                        ->setCustomer($customer)
                        ->setStore($store)
                        ->setStatus($status)
                        ->setBookingSource(($slot + $month) % 3 === 0 ? Appointment::SOURCE_WEB : Appointment::SOURCE_INTERNAL)
                        ->setPaymentMode(($slot + $employeeIndex) % 4 === 0 ? Appointment::PAYMENT_MODE_ONLINE : Appointment::PAYMENT_MODE_IN_STORE)
                        ->setPaymentStatus($status === Appointment::STATUS_COMPLETED ? Appointment::PAYMENT_STATUS_PAID : Appointment::PAYMENT_STATUS_PENDING)
                        ->setNotes(sprintf('[year-seed:%d] %s visit for %s', $year, $employee->getJobTitle() ?? 'Salon', $customer->getFullName()))
                        ->setStartAt($startAt);

                    $serviceCount = ($slot + $month) % 4 === 0 ? 2 : 1;
                    $duration = 0;
                    $basePrice = 0.0;
                    for ($serviceIndex = 0; $serviceIndex < $serviceCount; $serviceIndex++) {
                        $service = $services[($employeeIndex + $month + $slot + $serviceIndex) % count($services)];
                        $line = (new AppointmentService())
                            ->setService($service)
                            ->setQuantity(1)
                            ->setDurationMinutes($service->getDurationMinutes())
                            ->setUnitPrice(number_format((float) $service->getPrice(), 2, '.', ''));
                        $appointment->addService($line);
                        $duration += $service->getDurationMinutes();
                        $basePrice += (float) $service->getPrice();
                    }

                    $appointment->setEndAt($startAt->modify(sprintf('+%d minutes', max(30, $duration))));
                    $this->setPrivateDate($appointment, 'createdAt', $startAt->modify('-7 days'));
                    $this->setPrivateDate($appointment, 'updatedAt', $startAt->modify('-2 days'));
                    $this->em->persist($appointment);
                    $appointments[] = $appointment;
                }
            }
        }

        return $appointments;
    }

    /**
     * @param Customer[] $customers
     * @param Product[] $products
     * @param Store[] $stores
     * @param GiftVoucher[] $giftVouchers
     * @param Appointment[] $appointments
     */
    private function ensureOrders(array $customers, array $products, array $stores, array $giftVouchers, array $appointments, int $year, string $yearMarker): void
    {
        $orderIndex = 1;
        foreach ($stores as $storeIndex => $store) {
            for ($i = 0; $i < self::ORDERS_PER_STORE; $i++) {
                $customer = $customers[($storeIndex * self::ORDERS_PER_STORE + $i) % count($customers)];
                $order = new Order();
                $orderNumber = sprintf('%s-%s-%04d', $yearMarker, preg_replace('/[^A-Z]/', '', substr($store->getCode(), 0, 4)), $orderIndex);
                $createdAt = new \DateTimeImmutable(sprintf('%d-%02d-%02d %02d:%02d:00', $year, (($i + $storeIndex) % 12) + 1, (($i * 2 + $storeIndex) % 27) + 1, 9 + ($i % 8), ($i % 2) * 30));
                $statusPool = [
                    Order::STATUS_PAID,
                    Order::STATUS_SHIPPED,
                    Order::STATUS_VALIDATED,
                    Order::STATUS_PROCESSING,
                    Order::STATUS_READY_FOR_PICKUP,
                    Order::STATUS_FAILED,
                    Order::STATUS_CANCELLED,
                    Order::STATUS_PENDING,
                ];
                $status = $statusPool[($i + $storeIndex) % count($statusPool)];
                $pickup = ($i % 3) === 0;

                $subTotal = 0.0;
                $itemCount = 1 + ($i % 3);
                for ($itemOffset = 0; $itemOffset < $itemCount; $itemOffset++) {
                    $product = $products[($storeIndex * 7 + $i + $itemOffset) % count($products)];
                    $quantity = 1 + (($i + $itemOffset) % 2);
                    $lineTotal = (float) $product->getPrice() * $quantity;
                    $subTotal += $lineTotal;

                    $item = (new OrderItem())
                        ->setProduct($product)
                        ->setProductName($product->getName())
                        ->setProductSku($product->getSku())
                        ->setQuantity($quantity)
                        ->setUnitPrice(number_format((float) $product->getPrice(), 2, '.', ''))
                        ->setLineTotal(number_format($lineTotal * 1.2, 2, '.', ''));
                    $order->addItem($item);
                }

                $tax = round($subTotal * 0.2, 2);
                $total = round($subTotal + $tax, 2);
                $appliedVoucher = ($i % 7 === 0) ? $giftVouchers[($storeIndex + $i) % count($giftVouchers)] : null;
                $voucherAmount = $appliedVoucher ? min((float) $appliedVoucher->getBalanceAmount(), round($total * 0.35, 2)) : 0.0;

                $order
                    ->setCustomer($customer)
                    ->setStore($store)
                    ->setOrderNumber($orderNumber)
                    ->setStatus($status)
                    ->setCurrency('eur')
                    ->setSubTotal(number_format($subTotal, 2, '.', ''))
                    ->setTaxTotal(number_format($tax, 2, '.', ''))
                    ->setTotal(number_format(max(0, $total - $voucherAmount), 2, '.', ''))
                    ->setGiftVoucher($appliedVoucher)
                    ->setGiftVoucherAmount(number_format($voucherAmount, 2, '.', ''))
                    ->setPickupInStore($pickup)
                    ->setPickupSlot($pickup ? $createdAt->modify('+2 days')->format('Y-m-d H:i') : null)
                    ->setPickupNote($pickup ? 'Front desk pickup window' : null)
                    ->setStripePaymentIntentId(sprintf('pi_%s_%04d', strtolower($yearMarker), $orderIndex))
                    ->setStripeClientSecret(sprintf('pi_%s_%04d_secret_demo', strtolower($yearMarker), $orderIndex));

                if (!$pickup) {
                    $order
                        ->setDeliveryFullName($customer->getFullName())
                        ->setDeliveryAddressLine1('24 Avenue Demo')
                        ->setDeliveryAddressLine2($i % 4 === 0 ? 'Building B' : null)
                        ->setDeliveryPostalCode(sprintf('%05d', 10000 + $storeIndex * 10 + $i))
                        ->setDeliveryCity($store->getCity())
                        ->setDeliveryCountry($store->getCountry())
                        ->setDeliveryInstructions($i % 5 === 0 ? 'Leave at reception' : null);
                }

                if (($i % 8) === 0) {
                    $voucher = $giftVouchers[($orderIndex * 2) % count($giftVouchers)];
                    $order
                        ->setPurchasedGiftVoucher($voucher)
                        ->setGiftVoucherDeliveryEmail($customer->getUser()->getEmail());
                }

                if (($i % 6) === 0 && isset($appointments[($orderIndex * 3) % count($appointments)])) {
                    $order->setAppointment($appointments[($orderIndex * 3) % count($appointments)]);
                }

                $this->setPrivateDate($order, 'createdAt', $createdAt);
                $this->setPrivateDate($order, 'updatedAt', $createdAt->modify('+1 day'));
                $this->em->persist($order);

                $paymentEvent = (new PaymentEvent())
                    ->setOrder($order)
                    ->setProvider('stripe')
                    ->setProviderEventId(sprintf('evt_%s_%04d', strtolower($yearMarker), $orderIndex))
                    ->setEventType($status === Order::STATUS_FAILED ? 'payment_intent.payment_failed' : 'payment_intent.succeeded')
                    ->setSignatureValid(true)
                    ->setPayload([
                        'marker' => $yearMarker,
                        'status' => $status,
                        'orderNumber' => $orderNumber,
                    ]);
                $this->setPrivateDate($paymentEvent, 'createdAt', $createdAt->modify('+2 hours'));
                $this->em->persist($paymentEvent);

                $orderIndex++;
            }
        }
    }

    /**
     * @param Customer[] $customers
     * @param Employee[] $employees
     * @param Product[] $products
     * @param Service[] $services
     * @param Store[] $stores
     */
    private function ensureSales(array $customers, array $employees, array $products, array $services, array $stores, int $year, string $yearMarker): void
    {
        $receiptIndex = 1;
        foreach ($stores as $storeIndex => $store) {
            $storeEmployees = array_values(array_filter($employees, static fn (Employee $employee): bool => $employee->getStore()?->getId() === $store->getId()));
            if ($storeEmployees === []) {
                continue;
            }

            for ($i = 0; $i < self::SALES_PER_STORE; $i++) {
                $customer = $customers[($storeIndex * self::SALES_PER_STORE + $i) % count($customers)];
                $employee = $storeEmployees[$i % count($storeEmployees)];
                $sale = (new Sale())
                    ->setCustomer($customer)
                    ->setSeller($employee->getUser())
                    ->setStore($store)
                    ->setStatus(($i % 11) === 0 ? Sale::STATUS_SUSPENDED : Sale::STATUS_COMPLETED)
                    ->setPaymentStatus(($i % 11) === 0 ? Sale::PAYMENT_PENDING : Sale::PAYMENT_PAID)
                    ->setReceiptNumber(sprintf('RCT-%s-%04d', $yearMarker, $receiptIndex));

                $createdAt = new \DateTimeImmutable(sprintf('%d-%02d-%02d %02d:%02d:00', $year, (($i + $storeIndex * 2) % 12) + 1, (($i * 5 + $storeIndex) % 27) + 1, 10 + ($i % 7), ($i % 2) * 30));
                $itemCount = 2 + ($i % 2);
                $subTotal = 0.0;

                for ($itemOffset = 0; $itemOffset < $itemCount; $itemOffset++) {
                    if ($itemOffset % 2 === 0) {
                        $product = $products[($storeIndex * 5 + $i + $itemOffset) % count($products)];
                        $quantity = 1 + (($i + $itemOffset) % 2);
                        $lineBase = (float) $product->getPrice() * $quantity;
                        $item = (new SaleItem())
                            ->setItemType('product')
                            ->setItemId((int) $product->getId())
                            ->setLabel($product->getName())
                            ->setUnitPrice(number_format((float) $product->getPrice(), 2, '.', ''))
                            ->setQuantity(number_format((float) $quantity, 2, '.', ''))
                            ->setDiscountAmount('0.00')
                            ->setTaxRate('20.00')
                            ->setLineTotal(number_format($lineBase * 1.2, 2, '.', ''));
                    } else {
                        $service = $services[($storeIndex * 3 + $i + $itemOffset) % count($services)];
                        $lineBase = (float) $service->getPrice();
                        $item = (new SaleItem())
                            ->setItemType('service')
                            ->setItemId((int) $service->getId())
                            ->setLabel($service->getName())
                            ->setUnitPrice(number_format((float) $service->getPrice(), 2, '.', ''))
                            ->setQuantity('1.00')
                            ->setDiscountAmount(($i % 9) === 0 ? '5.00' : '0.00')
                            ->setTaxRate('20.00')
                            ->setLineTotal(number_format(max(0, ($lineBase - (($i % 9) === 0 ? 5 : 0)) * 1.2), 2, '.', ''));
                    }

                    $sale->addItem($item);
                    $subTotal += $lineBase;
                }

                $discount = ($i % 9) === 0 ? 5.0 : 0.0;
                $tax = round(max(0, $subTotal - $discount) * 0.2, 2);
                $total = round(max(0, $subTotal - $discount) + $tax, 2);
                $sale
                    ->setSubTotal(number_format($subTotal, 2, '.', ''))
                    ->setDiscountTotal(number_format($discount, 2, '.', ''))
                    ->setTaxTotal(number_format($tax, 2, '.', ''))
                    ->setTotal(number_format($total, 2, '.', ''))
                    ->setLoyaltyPointsEarned(max(1, (int) floor($total)));

                $this->setPrivateDate($sale, 'createdAt', $createdAt);
                $this->setPrivateDate($sale, 'updatedAt', $createdAt->modify('+1 hour'));
                $this->em->persist($sale);

                if ($sale->getPaymentStatus() === Sale::PAYMENT_PAID) {
                    $payment = (new Payment())
                        ->setSale($sale)
                        ->setMethod($i % 3 === 0 ? Payment::METHOD_CASH : Payment::METHOD_CARD)
                        ->setAmount(number_format($total, 2, '.', ''))
                        ->setStatus(Payment::STATUS_ACCEPTED)
                        ->setExternalRef(sprintf('PAY-%s-%04d', $yearMarker, $receiptIndex));
                    $this->setPrivateDate($payment, 'paidAt', $createdAt->modify('+15 minutes'));
                    $this->em->persist($payment);
                }

                $receiptIndex++;
            }
        }
    }

    /**
     * @param Product[] $products
     */
    private function ensureStockMovements(array $products, int $year, string $yearMarker): void
    {
        foreach ($products as $index => $product) {
            for ($month = 1; $month <= 6; $month++) {
                $delta = 12 + (($index + $month) % 24);
                $movement = (new StockMovement())
                    ->setProduct($product)
                    ->setMovementType($month % 2 === 0 ? 'delivery' : 'adjustment')
                    ->setQuantity($delta)
                    ->setPreviousStock(max(0, $product->getStock() - $delta))
                    ->setNewStock($product->getStock())
                    ->setReason(sprintf('[%s] Warehouse replenishment', $yearMarker))
                    ->setComment('Generated annual demo inventory flow');
                $this->setPrivateDate($movement, 'createdAt', new \DateTimeImmutable(sprintf('%d-%02d-%02d 08:00:00', $year, $month, (($index * 2) % 25) + 1)));
                $this->em->persist($movement);
            }
        }
    }

    /**
     * @param Customer[] $customers
     * @param Appointment[] $appointments
     */
    private function ensureNotificationLogs(array $customers, array $appointments, int $year, string $yearMarker): void
    {
        foreach (array_slice($appointments, 0, 220) as $index => $appointment) {
            $log = (new NotificationLog())
                ->setKind('appointment_reminder')
                ->setChannel($index % 2 === 0 ? 'email' : 'sms')
                ->setCustomer($appointment->getCustomer())
                ->setAppointment($appointment)
                ->setStatus($index % 17 === 0 ? NotificationLog::STATUS_FAILED : NotificationLog::STATUS_SENT)
                ->setPayload([
                    'marker' => $yearMarker,
                    'appointmentStartAt' => $appointment->getStartAt()->format(DATE_ATOM),
                    'template' => 'appointment-reminder',
                ])
                ->setErrorMessage($index % 17 === 0 ? 'Simulated provider timeout' : null);
            $this->setPrivateDate($log, 'createdAt', $appointment->getStartAt()->modify('-1 day'));
            $this->em->persist($log);
        }

        foreach (array_slice($customers, 0, 80) as $index => $customer) {
            $log = (new NotificationLog())
                ->setKind('birthday_offer')
                ->setChannel($index % 2 === 0 ? 'email' : 'sms')
                ->setCustomer($customer)
                ->setStatus(NotificationLog::STATUS_SENT)
                ->setPayload([
                    'marker' => $yearMarker,
                    'message' => 'Happy birthday from Seanergy.',
                ]);
            $this->setPrivateDate($log, 'createdAt', new \DateTimeImmutable(sprintf('%d-%02d-%02d 09:00:00', $year, (($index % 12) + 1), (($index * 3) % 27) + 1)));
            $this->em->persist($log);
        }
    }

    private function randomPersonName(): string
    {
        return $this->firstNames[array_rand($this->firstNames)].' '.$this->lastNames[array_rand($this->lastNames)];
    }

    private function setPrivateDate(object $entity, string $property, \DateTimeImmutable $value): void
    {
        $reflection = new \ReflectionProperty($entity, $property);
        $reflection->setAccessible(true);
        $reflection->setValue($entity, $value);
    }
}
