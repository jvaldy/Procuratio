<?php

namespace App\Command;

use App\Entity\Customer;
use App\Entity\LoyaltyEvent;
use App\Service\CrmService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:seed-crm-demo', description: 'Populate demo loyalty memberships and visit cards')]
class SeedCrmDemoCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CrmService $crmService,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $customers = $this->em->getRepository(Customer::class)->findBy([], ['id' => 'ASC'], 5);
        if ($customers === []) {
            $output->writeln('<error>No customer found to seed CRM demo data.</error>');

            return Command::FAILURE;
        }

        $profiles = [
            ['subscriptionName' => 'Premium Color Club', 'visitCardName' => '10 Haircut visits', 'points' => 480, 'visitTarget' => 10, 'visitUsed' => 4],
            ['subscriptionName' => 'Glow Facial Pass', 'visitCardName' => '6 Facial visits', 'points' => 920, 'visitTarget' => 6, 'visitUsed' => 2],
            ['subscriptionName' => 'Blow Dry Monthly', 'visitCardName' => '8 Blow-dry visits', 'points' => 250, 'visitTarget' => 8, 'visitUsed' => 5],
        ];

        foreach ($customers as $index => $customer) {
            $profile = $profiles[$index % count($profiles)];
            $account = $this->crmService->configureLoyaltyProgram($customer, [
                'subscriptionName' => $profile['subscriptionName'],
                'subscriptionStatus' => 'active',
                'subscriptionStartedAt' => new \DateTimeImmutable('first day of this month 09:00'),
                'subscriptionEndsAt' => new \DateTimeImmutable('last day of next month 19:00'),
                'visitCardName' => $profile['visitCardName'],
                'visitCardTarget' => $profile['visitTarget'],
                'visitCardUsed' => $profile['visitUsed'],
                'visitCardActive' => true,
            ]);

            $eventsCount = $this->em->getRepository(LoyaltyEvent::class)->count(['customer' => $customer]);
            if ($account->getPointsBalance() < $profile['points']) {
                $this->crmService->addLoyaltyPoints($customer, $profile['points'] - $account->getPointsBalance(), 'Demo loyalty balance');
            }

            if ($eventsCount === 0) {
                $this->crmService->registerCompletedVisit($customer, 'Demo visit card progress');
            }
        }

        $output->writeln(sprintf('<info>CRM demo data prepared for %d customers.</info>', count($customers)));

        return Command::SUCCESS;
    }
}
