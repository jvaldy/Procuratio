<?php

namespace App\Command;

use App\Entity\BusinessHour;
use App\Entity\Campaign;
use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\GiftVoucher;
use App\Entity\LoyaltyAccount;
use App\Entity\LoyaltyEvent;
use App\Entity\NotificationLog;
use App\Entity\OrderItem;
use App\Entity\Product;
use App\Entity\ProductReservation;
use App\Entity\ProductReview;
use App\Entity\ReminderRule;
use App\Entity\StockMovement;
use App\Entity\Store;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:cleanup-e2e-data',
    description: 'Remove persistent E2E fixtures created by Playwright runs.',
)]
class CleanupE2eDataCommand extends Command
{
    private const E2E_EMAIL_PATTERN = 'e2e.%@procuratio.local';
    private const E2E_NAME_PREFIX = 'E2E %';
    private const E2E_STORE_CODE_PREFIX = 'E2E-%';
    private const E2E_VOUCHER_MARKER = '2099-01-01T00:00:00+00:00';
    private const E2E_PRODUCT_SKU_PREFIX = 'TEST-IMG-%';
    private const E2E_PRODUCT_NAME_PREFIX = 'Produit test image%';

    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $removedCampaigns = $this->removeCampaigns();
        $removedReminderRules = $this->removeReminderRules();
        $removedCustomerFixtures = $this->removeCustomerFixtures();
        $removedEmployeeFixtures = $this->removeEmployeeFixtures();
        $removedUserFixtures = $this->removeUserFixtures();
        $removedStoreFixtures = $this->removeStoreFixtures();
        ['removed' => $removedProductFixtures, 'archived' => $archivedProductFixtures] = $this->removeProductFixtures();

        $io->success(sprintf(
            'E2E cleanup completed: %d campaign(s), %d reminder rule(s), %d customer fixture(s), %d employee fixture(s), %d user fixture(s), %d store fixture(s), %d product fixture(s) removed, %d linked product fixture(s) archived.',
            $removedCampaigns,
            $removedReminderRules,
            $removedCustomerFixtures,
            $removedEmployeeFixtures,
            $removedUserFixtures,
            $removedStoreFixtures,
            $removedProductFixtures,
            $archivedProductFixtures,
        ));

        return Command::SUCCESS;
    }

    private function removeCampaigns(): int
    {
        $items = $this->em->getRepository(Campaign::class)
            ->createQueryBuilder('campaign')
            ->where('campaign.name LIKE :prefix')
            ->setParameter('prefix', self::E2E_NAME_PREFIX)
            ->getQuery()
            ->getResult();

        foreach ($items as $campaign) {
            $this->em->remove($campaign);
        }

        $this->em->flush();

        return count($items);
    }

    private function removeReminderRules(): int
    {
        $items = $this->em->getRepository(ReminderRule::class)
            ->createQueryBuilder('rule')
            ->where('rule.name LIKE :prefix')
            ->setParameter('prefix', self::E2E_NAME_PREFIX)
            ->getQuery()
            ->getResult();

        foreach ($items as $rule) {
            $this->em->remove($rule);
        }

        $this->em->flush();

        return count($items);
    }

    private function removeCustomerFixtures(): int
    {
        $customers = $this->em->getRepository(Customer::class)
            ->createQueryBuilder('customer')
            ->join('customer.user', 'user')
            ->where('user.email LIKE :pattern')
            ->setParameter('pattern', self::E2E_EMAIL_PATTERN)
            ->getQuery()
            ->getResult();

        if ($customers === []) {
            $this->removeMarkedGiftVouchers();
            return 0;
        }

        $this->removeMarkedGiftVouchers($customers);

        $loyaltyEvents = $this->em->getRepository(LoyaltyEvent::class)
            ->createQueryBuilder('event')
            ->where('event.customer IN (:customers)')
            ->setParameter('customers', $customers)
            ->getQuery()
            ->getResult();
        foreach ($loyaltyEvents as $event) {
            $this->em->remove($event);
        }

        $loyaltyAccounts = $this->em->getRepository(LoyaltyAccount::class)
            ->createQueryBuilder('account')
            ->where('account.customer IN (:customers)')
            ->setParameter('customers', $customers)
            ->getQuery()
            ->getResult();
        foreach ($loyaltyAccounts as $account) {
            $this->em->remove($account);
        }

        $notificationLogs = $this->em->getRepository(NotificationLog::class)
            ->createQueryBuilder('log')
            ->where('log.customer IN (:customers)')
            ->setParameter('customers', $customers)
            ->getQuery()
            ->getResult();
        foreach ($notificationLogs as $log) {
            $this->em->remove($log);
        }

        foreach ($customers as $customer) {
            $this->em->remove($customer);
        }

        $this->em->flush();

        return count($customers);
    }

    private function removeEmployeeFixtures(): int
    {
        $employees = $this->em->getRepository(Employee::class)
            ->createQueryBuilder('employee')
            ->join('employee.user', 'user')
            ->where('user.email LIKE :pattern')
            ->setParameter('pattern', self::E2E_EMAIL_PATTERN)
            ->getQuery()
            ->getResult();

        foreach ($employees as $employee) {
            $this->em->remove($employee);
        }

        $this->em->flush();

        return count($employees);
    }

    private function removeUserFixtures(): int
    {
        $users = $this->em->getRepository(User::class)
            ->createQueryBuilder('user')
            ->where('user.email LIKE :pattern')
            ->setParameter('pattern', self::E2E_EMAIL_PATTERN)
            ->getQuery()
            ->getResult();

        foreach ($users as $user) {
            $this->em->remove($user);
        }

        $this->em->flush();

        return count($users);
    }

    private function removeStoreFixtures(): int
    {
        $stores = $this->em->getRepository(Store::class)
            ->createQueryBuilder('store')
            ->where('store.code LIKE :codePrefix OR store.name LIKE :namePrefix')
            ->setParameter('codePrefix', self::E2E_STORE_CODE_PREFIX)
            ->setParameter('namePrefix', self::E2E_NAME_PREFIX)
            ->getQuery()
            ->getResult();

        if ($stores === []) {
            return 0;
        }

        $businessHours = $this->em->getRepository(BusinessHour::class)
            ->createQueryBuilder('hour')
            ->where('hour.store IN (:stores)')
            ->setParameter('stores', $stores)
            ->getQuery()
            ->getResult();
        foreach ($businessHours as $businessHour) {
            $this->em->remove($businessHour);
        }

        foreach ($stores as $store) {
            $this->em->remove($store);
        }

        $this->em->flush();

        return count($stores);
    }

    /**
     * @return array{removed:int,archived:int}
     */
    private function removeProductFixtures(): array
    {
        $products = $this->em->getRepository(Product::class)
            ->createQueryBuilder('product')
            ->where('product.sku LIKE :skuPrefix OR product.name LIKE :namePrefix')
            ->setParameter('skuPrefix', self::E2E_PRODUCT_SKU_PREFIX)
            ->setParameter('namePrefix', self::E2E_PRODUCT_NAME_PREFIX)
            ->getQuery()
            ->getResult();

        if ($products === []) {
            return ['removed' => 0, 'archived' => 0];
        }

        $removed = 0;
        $archived = 0;

        foreach ($products as $product) {
            $orderItemCount = $this->em->getRepository(OrderItem::class)->count(['product' => $product]);
            if ($orderItemCount > 0) {
                $product->setIsActive(false);
                $product->touch();
                $archived++;
                continue;
            }

            $this->removeProductDependents($product);
            $this->em->remove($product);
            $removed++;
        }

        $this->em->flush();

        return ['removed' => $removed, 'archived' => $archived];
    }

    /**
     * @param Customer[] $customers
     */
    private function removeMarkedGiftVouchers(array $customers = []): void
    {
        $builder = $this->em->getRepository(GiftVoucher::class)
            ->createQueryBuilder('voucher')
            ->where('voucher.expiresAt >= :markerDate')
            ->setParameter('markerDate', new \DateTimeImmutable(self::E2E_VOUCHER_MARKER));

        if ($customers !== []) {
            $builder->orWhere('voucher.customer IN (:customers)')
                ->setParameter('customers', $customers);
        }

        $giftVouchers = $builder->getQuery()->getResult();
        foreach ($giftVouchers as $voucher) {
            $this->em->remove($voucher);
        }
    }

    private function removeProductDependents(Product $product): void
    {
        $reservations = $this->em->getRepository(ProductReservation::class)->findBy(['product' => $product]);
        foreach ($reservations as $reservation) {
            $this->em->remove($reservation);
        }

        $reviews = $this->em->getRepository(ProductReview::class)->findBy(['product' => $product]);
        foreach ($reviews as $review) {
            $this->em->remove($review);
        }

        $stockMovements = $this->em->getRepository(StockMovement::class)->findBy(['product' => $product]);
        foreach ($stockMovements as $stockMovement) {
            $this->em->remove($stockMovement);
        }
    }
}
