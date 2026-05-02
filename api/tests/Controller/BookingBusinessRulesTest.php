<?php

namespace App\Tests\Controller;

use App\Entity\Employee;
use App\Entity\Service;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class BookingBusinessRulesTest extends WebTestCase
{
    public function testCancellationTooLateIsRejected(): void
    {
        $client = static::createClient();
        $employeeToken = $this->login($client, 'employee@procuratio.local', 'Employee123!');
        $customerToken = $this->login($client, 'customer@procuratio.local', 'Customer123!');
        $employeeHeaders = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $employeeToken];
        $customerHeaders = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $customerToken];

        [$employeeId, $serviceId] = $this->resolveEmployeeAndServiceIds();
        $startAt = $this->buildShortNoticeSlot();
        $this->ensureAvailability($client, $employeeHeaders, $employeeId, (int) $startAt->format('N'));
        $appointmentId = $this->createAndConfirm($client, $customerHeaders, $serviceId, $employeeId, $startAt);

        $client->request('POST', sprintf('/api/v1/client/appointments/%d/cancel', $appointmentId), [], [], $customerHeaders, '{}');
        self::assertResponseStatusCodeSame(400);
    }

    private function login($client, string $email, string $password): string
    {
        $client->request('POST', '/api/v1/auth/login', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email' => $email,
            'password' => $password,
        ], JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        return (string) $payload['token'];
    }

    private function createAndConfirm($client, array $headers, int $serviceId, int $employeeId, \DateTimeImmutable $startAt): int
    {
        for ($i = 0; $i < 400; $i++) {
            // On balaie une large fenetre (<24h) pour absorber les collisions sur des environnements deja charges.
            $candidate = $startAt->modify(sprintf('+%d minutes', $i * 3));
            if ($candidate > new \DateTimeImmutable('+23 hours')) {
                break;
            }

            $client->request('POST', '/api/v1/bookings/sessions', [], [], $headers, json_encode([
                'serviceId' => $serviceId,
                'employeeId' => $employeeId,
                'startAt' => $candidate->format(DATE_ATOM),
                'paymentMode' => 'in_store',
            ], JSON_THROW_ON_ERROR));
            if ($client->getResponse()->getStatusCode() !== 201) {
                continue;
            }
            $session = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

            $client->request('POST', sprintf('/api/v1/bookings/sessions/%s/confirm', $session['token']), [], [], $headers, '{}');
            if ($client->getResponse()->getStatusCode() !== 201) {
                continue;
            }

            $appointment = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
            return (int) $appointment['id'];
        }

        self::fail('Impossible de creer un rendez-vous de test sans conflit.');
    }

    private function resolveEmployeeAndServiceIds(): array
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $employeeUser = $em->getRepository(User::class)->findOneBy(['email' => 'employee@procuratio.local']);
        self::assertNotNull($employeeUser);
        $employee = $em->getRepository(Employee::class)->findOneBy(['user' => $employeeUser]);
        $service = $em->getRepository(Service::class)->findOneBy(['isActive' => true]);
        self::assertNotNull($employee);
        self::assertNotNull($service);
        return [$employee->getId(), $service->getId()];
    }

    private function ensureAvailability($client, array $headers, int $employeeId, int $dayOfWeek): void
    {
        $client->request('POST', '/api/v1/planning/availabilities', [], [], $headers, json_encode([
            'employeeId' => $employeeId,
            'dayOfWeek' => $dayOfWeek,
            'startTime' => '00:00',
            'endTime' => '23:59',
            'isAvailable' => true,
        ], JSON_THROW_ON_ERROR));
    }

    private function buildShortNoticeSlot(): \DateTimeImmutable
    {
        $candidate = new \DateTimeImmutable('+6 hours');
        $hour = (int) $candidate->format('H');
        $minute = ((int) (microtime(true) * 1000)) % 50;

        if ($hour < 8) {
            return $candidate->setTime(9, $minute);
        }

        if ($hour > 18) {
            return $candidate->modify('+1 day')->setTime(10, $minute);
        }

        return $candidate->setTime($hour, $minute);
    }
}
