<?php

namespace App\Command;

use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\Store;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:seed-stores', description: 'Seed demo stores for the multi-store experience')]
class SeedStoresCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $definitions = [
            ['PARIS-CENTRE', 'Seanergy Paris Centre', 'Paris', 'France', 'soft'],
            ['LYON-PRESQU', 'Seanergy Lyon Presquile', 'Lyon', 'France', 'ocean'],
            ['MARSEILLE-VX', 'Seanergy Marseille Vieux-Port', 'Marseille', 'France', 'sunset'],
            ['BORDEAUX-Q', 'Seanergy Bordeaux Quinconces', 'Bordeaux', 'France', 'dark'],
            ['LILLE-RIHO', 'Seanergy Lille Rihour', 'Lille', 'France', 'soft'],
            ['NANTES-GRAS', 'Seanergy Nantes Graslin', 'Nantes', 'France', 'ocean'],
            ['TOULOUSE-CA', 'Seanergy Toulouse Capitole', 'Toulouse', 'France', 'sunset'],
            ['NICE-MASSEN', 'Seanergy Nice Massena', 'Nice', 'France', 'dark'],
            ['STRASBOURG', 'Seanergy Strasbourg Centre', 'Strasbourg', 'France', 'soft'],
            ['MONTPELLIER', 'Seanergy Montpellier Comedie', 'Montpellier', 'France', 'ocean'],
            ['LONDON-SOHO', 'Seanergy London Soho', 'London', 'United Kingdom', 'dark'],
            ['NEWYORK-5TH', 'Seanergy New York Fifth Avenue', 'New York', 'United States', 'soft'],
            ['DUBAI-MARIN', 'Seanergy Dubai Marina', 'Dubai', 'United Arab Emirates', 'sunset'],
            ['TOKYO-GINZA', 'Seanergy Tokyo Ginza', 'Tokyo', 'Japan', 'ocean'],
            ['MADRID-SALA', 'Seanergy Madrid Salamanca', 'Madrid', 'Spain', 'soft'],
            ['ROME-NAVONA', 'Seanergy Rome Navona', 'Rome', 'Italy', 'sunset'],
            ['BERLIN-MITTE', 'Seanergy Berlin Mitte', 'Berlin', 'Germany', 'dark'],
            ['SYDNEY-CBD', 'Seanergy Sydney CBD', 'Sydney', 'Australia', 'ocean'],
            ['SINGAPORE-M', 'Seanergy Singapore Marina Bay', 'Singapore', 'Singapore', 'soft'],
            ['MONTREAL-PL', 'Seanergy Montreal Plateau', 'Montreal', 'Canada', 'dark'],
        ];

        $storeRepo = $this->em->getRepository(Store::class);
        $stores = [];

        foreach ($definitions as [$code, $name, $city, $country, $theme]) {
            $store = $storeRepo->findOneBy(['code' => $code]);
            if (!$store instanceof Store) {
                $store = (new Store())->setCode($code);
                $this->em->persist($store);
            }

            $store
                ->setName($name)
                ->setCity($city)
                ->setCountry($country)
                ->setStatus('active')
                ->setThemeColor($theme)
                ->setEmail(strtolower(str_replace(' ', '.', $code)).'@seanergy.example')
                ->setPhoneNumber(sprintf('+33 1 80 80 %02d %02d', (crc32($code) % 90) + 10, (crc32($city) % 90) + 10))
                ->setAddressLine1('1 Salon Avenue')
                ->setPostalCode('75000');
            $store->touch();
            $stores[] = $store;
        }

        $this->em->flush();

        $employees = $this->em->getRepository(Employee::class)->findBy([], ['id' => 'ASC']);
        foreach ($employees as $index => $employee) {
            $employee->setStore($stores[$index % count($stores)]);
        }

        $customers = $this->em->getRepository(Customer::class)->findBy([], ['id' => 'ASC']);
        foreach ($customers as $index => $customer) {
            if (!$customer->getPreferredStore()) {
                $customer->setPreferredStore($stores[$index % count($stores)]);
            }
        }

        $this->em->flush();
        $output->writeln(sprintf('<info>%d stores are ready for booking, pickup and loyalty flows.</info>', count($stores)));

        return Command::SUCCESS;
    }
}
