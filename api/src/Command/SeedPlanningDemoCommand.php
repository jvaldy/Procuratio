<?php

namespace App\Command;

use App\Entity\Appointment;
use App\Entity\AppointmentService;
use App\Entity\BusinessHour;
use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\EmployeeAvailability;
use App\Entity\Service;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(name: 'app:seed-planning-demo', description: 'Ajoute des employes et un planning de demonstration plus riche.')]
class SeedPlanningDemoCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $customers = $this->em->getRepository(Customer::class)->findBy([], ['id' => 'ASC']);
        $services = $this->em->getRepository(Service::class)->findBy(['isActive' => true], ['id' => 'ASC']);

        if (count($customers) < 5 || count($services) < 5) {
            $output->writeln('<error>Le seed planning requiert au moins 5 clients et 5 services existants.</error>');

            return Command::FAILURE;
        }

        $businessHours = [
            1 => ['09:00', '18:00', true],
            2 => ['09:00', '18:00', true],
            3 => ['09:00', '18:00', true],
            4 => ['09:00', '18:00', true],
            5 => ['09:00', '18:00', true],
            6 => ['09:00', '16:00', true],
            7 => ['09:00', '18:00', false],
        ];
        $this->upsertBusinessHours($businessHours);

        $employeeDefinitions = [
            ['employee01@procuratio.local', 'Camille Martin'],
            ['employee02@procuratio.local', 'Nora Benali'],
            ['employee03@procuratio.local', 'Lucas Perrin'],
            ['employee04@procuratio.local', 'Maya Costa'],
        ];

        $employees = [];
        foreach ($employeeDefinitions as [$email, $fullName]) {
            $employees[] = $this->upsertEmployee($email, $fullName);
        }

        $this->em->flush();

        foreach ($employees as $employee) {
            $this->replaceEmployeeAvailability($employee);
        }

        $this->removeOldPlanningDemoAppointments($employees);
        $this->createPlanningWeekAppointments($employees, $customers, $services);

        $this->em->flush();

        $output->writeln(sprintf(
            '<info>Planning de demonstration enrichi: %d employes et %d rendez-vous ajoutes.</info>',
            count($employees),
            count($employees) * 5
        ));
        $output->writeln('<comment>Comptes employe ajoutes: employee01 à employee04 / mot de passe Employee123!</comment>');

        return Command::SUCCESS;
    }

    /**
     * @param array<int, array{0:string,1:string,2:bool}> $hoursByDay
     */
    private function upsertBusinessHours(array $hoursByDay): void
    {
        $repository = $this->em->getRepository(BusinessHour::class);

        foreach ($hoursByDay as $dayOfWeek => [$start, $end, $isOpen]) {
            $item = $repository->findOneBy(['dayOfWeek' => $dayOfWeek]) ?? (new BusinessHour())->setDayOfWeek($dayOfWeek);
            $item
                ->setStartTime(new \DateTimeImmutable($start))
                ->setEndTime(new \DateTimeImmutable($end))
                ->setIsOpen($isOpen);

            $this->em->persist($item);
        }
    }

    private function upsertEmployee(string $email, string $fullName): Employee
    {
        $userRepository = $this->em->getRepository(User::class);
        $employeeRepository = $this->em->getRepository(Employee::class);

        $user = $userRepository->findOneBy(['email' => $email]);
        if (!$user instanceof User) {
            $user = (new User())
                ->setEmail($email)
                ->setRoles(['ROLE_EMPLOYEE']);
            $user->setPassword($this->passwordHasher->hashPassword($user, 'Employee123!'));
            $this->em->persist($user);
        }

        $employee = $employeeRepository->findOneBy(['user' => $user]);
        if (!$employee instanceof Employee) {
            $employee = (new Employee())
                ->setUser($user)
                ->setFullName($fullName);
            $this->em->persist($employee);
        } else {
            $employee->setFullName($fullName);
        }

        return $employee;
    }

    private function replaceEmployeeAvailability(Employee $employee): void
    {
        $availabilityRepository = $this->em->getRepository(EmployeeAvailability::class);
        foreach ($availabilityRepository->findBy(['employee' => $employee]) as $existing) {
            $this->em->remove($existing);
        }

        $weeklyRules = [
            [1, '09:00', '18:00', true],
            [2, '09:00', '18:00', true],
            [3, '09:00', '18:00', true],
            [4, '09:00', '18:00', true],
            [5, '09:00', '18:00', true],
            [6, '09:00', '16:00', true],
        ];

        foreach ($weeklyRules as [$dayOfWeek, $startTime, $endTime, $isAvailable]) {
            $availability = (new EmployeeAvailability())
                ->setEmployee($employee)
                ->setDayOfWeek($dayOfWeek)
                ->setStartTime(new \DateTimeImmutable($startTime))
                ->setEndTime(new \DateTimeImmutable($endTime))
                ->setIsAvailable($isAvailable);
            $this->em->persist($availability);
        }
    }

    /**
     * @param Employee[] $employees
     */
    private function removeOldPlanningDemoAppointments(array $employees): void
    {
        $appointmentRepository = $this->em->getRepository(Appointment::class);

        foreach ($employees as $employee) {
            foreach ($appointmentRepository->findBy(['employee' => $employee]) as $appointment) {
                if (is_string($appointment->getNotes()) && str_contains($appointment->getNotes(), '[planning-demo]')) {
                    $this->em->remove($appointment);
                }
            }
        }
    }

    /**
     * @param Employee[] $employees
     * @param Customer[] $customers
     * @param Service[] $services
     */
    private function createPlanningWeekAppointments(array $employees, array $customers, array $services): void
    {
        $serviceByName = [];
        foreach ($services as $service) {
            $serviceByName[$service->getName()] = $service;
        }

        $templates = [
            ['start' => '09:00', 'services' => ['Coloration Racines', 'Patine Gloss']],
            ['start' => '11:00', 'services' => ['Coupe Femme Signature', 'Brushing Lisse']],
            ['start' => '13:15', 'services' => ['Diagnostic Capillaire', 'Soin Profond Keratine']],
            ['start' => '15:00', 'services' => ['Coupe Homme Degrade', 'Barbe Entretien']],
            ['start' => '16:00', 'services' => ['Pose Extensions']],
        ];

        $weekStart = new \DateTimeImmutable('monday this week');
        $now = new \DateTimeImmutable();

        foreach ($employees as $employeeIndex => $employee) {
            for ($dayOffset = 0; $dayOffset < 5; $dayOffset++) {
                $template = $templates[$dayOffset];
                $startAt = (new \DateTimeImmutable(sprintf(
                    '%s %s',
                    $weekStart->modify(sprintf('+%d days', $dayOffset))->format('Y-m-d'),
                    $template['start']
                )));

                $customer = $customers[($employeeIndex * 5 + $dayOffset) % count($customers)];
                $appointment = (new Appointment())
                    ->setEmployee($employee)
                    ->setCustomer($customer)
                    ->setStartAt($startAt)
                    ->setStatus($startAt < $now ? Appointment::STATUS_COMPLETED : Appointment::STATUS_SCHEDULED)
                    ->setBookingSource(Appointment::SOURCE_INTERNAL)
                    ->setPaymentMode(Appointment::PAYMENT_MODE_IN_STORE)
                    ->setPaymentStatus($startAt < $now ? Appointment::PAYMENT_STATUS_PAID : Appointment::PAYMENT_STATUS_PENDING)
                    ->setNotes(sprintf('[planning-demo] Rendez-vous de demonstration %s.', $customer->getFullName()));

                $duration = 0;
                foreach ($template['services'] as $serviceName) {
                    $service = $serviceByName[$serviceName] ?? null;
                    if (!$service instanceof Service) {
                        continue;
                    }

                    $line = (new AppointmentService())
                        ->setService($service)
                        ->setQuantity(1)
                        ->setDurationMinutes($service->getDurationMinutes());
                    $appointment->addService($line);
                    $duration += $service->getDurationMinutes();
                }

                $appointment->setEndAt($startAt->modify(sprintf('+%d minutes', max(30, $duration))));
                $this->em->persist($appointment);
            }
        }
    }
}
