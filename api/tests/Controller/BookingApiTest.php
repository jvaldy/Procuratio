<?php

namespace App\Tests\Controller;

use App\Entity\Employee;
use App\Entity\Service;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class BookingApiTest extends WebTestCase
{
    public function testCustomerBookingFlowAndHistory(): void
    {
        $client = static::createClient();
        $employeeToken = $this->login($client, 'employee@procuratio.local', 'Employee123!');
        $customerToken = $this->login($client, 'customer@procuratio.local', 'Customer123!');
        $employeeHeaders = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $employeeToken];
        $customerHeaders = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $customerToken];

        [$employeeId, $serviceId] = $this->resolveEmployeeAndServiceIds();
        $startAt = $this->buildSlot(3, 36);
        $this->configureBusinessHours($client, $employeeHeaders);
        $this->ensureAvailability($client, $employeeHeaders, $employeeId, 3);

        $client->request('GET', sprintf('/api/v1/public/booking/slots?serviceId=%d&from=%s&to=%s&employeeId=%d', $serviceId, $startAt->format('Y-m-d'), $startAt->format('Y-m-d'), $employeeId));
        self::assertResponseIsSuccessful();
        $slotsPayload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertNotEmpty($slotsPayload['data']);

        $session = $this->openSessionOnFreeSlot($client, $customerHeaders, $serviceId, $employeeId, $startAt);

        $client->request('POST', sprintf('/api/v1/bookings/sessions/%s/confirm', $session['token']), [], [], $customerHeaders, json_encode([
            'notes' => 'Rendez-vous test client',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $confirmation = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('scheduled', $confirmation['appointment']['status']);

        $client->request('GET', sprintf('/api/v1/client/appointments/%d', $confirmation['appointment']['id']), [], [], $customerHeaders);
        self::assertResponseIsSuccessful();
        $detail = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertNotEmpty($detail['history']);
    }

    public function testSecondConfirmationOnSameSlotIsRejected(): void
    {
        $client = static::createClient();
        $employeeToken = $this->login($client, 'employee@procuratio.local', 'Employee123!');
        $customerToken = $this->login($client, 'customer@procuratio.local', 'Customer123!');
        $employeeHeaders = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $employeeToken];
        $customerHeaders = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $customerToken];

        [$employeeId, $serviceId] = $this->resolveEmployeeAndServiceIds();
        $startAt = $this->buildSlot(4, 36);
        $this->configureBusinessHours($client, $employeeHeaders);
        $this->ensureAvailability($client, $employeeHeaders, $employeeId, 4);

        [$sessionA, $sessionB] = $this->openTwoSessionsOnFreeSlot($client, $customerHeaders, $serviceId, $employeeId, $startAt);

        $client->request('POST', sprintf('/api/v1/bookings/sessions/%s/confirm', $sessionA['token']), [], [], $customerHeaders, '{}');
        self::assertResponseStatusCodeSame(201);

        $client->request('POST', sprintf('/api/v1/bookings/sessions/%s/confirm', $sessionB['token']), [], [], $customerHeaders, '{}');
        self::assertResponseStatusCodeSame(400);
    }

    public function testPublicSlotSearchIncludesEndDate(): void
    {
        $client = static::createClient();
        $employeeToken = $this->login($client, 'employee@procuratio.local', 'Employee123!');
        $employeeHeaders = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $employeeToken];

        [$employeeId, $serviceId] = $this->resolveEmployeeAndServiceIds();
        $targetDay = $this->buildSlot(5, 40);
        $this->configureBusinessHours($client, $employeeHeaders);
        $this->ensureAvailability($client, $employeeHeaders, $employeeId, 5);

        $from = $targetDay->modify('-1 day')->format('Y-m-d');
        $to = $targetDay->format('Y-m-d');

        $client->request('GET', sprintf('/api/v1/public/booking/slots?serviceId=%d&from=%s&to=%s&employeeId=%d', $serviceId, $from, $to, $employeeId));
        self::assertResponseIsSuccessful();

        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertNotEmpty($payload['data']);
        self::assertContains(
            $targetDay->format('Y-m-d'),
            array_map(
                static fn(array $slot): string => substr((string) $slot['startAt'], 0, 10),
                $payload['data']
            )
        );
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

    private function openSession($client, array $headers, int $serviceId, int $employeeId, \DateTimeImmutable $startAt): array
    {
        $client->request('POST', '/api/v1/bookings/sessions', [], [], $headers, json_encode([
            'serviceId' => $serviceId,
            'employeeId' => $employeeId,
            'startAt' => $startAt->format(DATE_ATOM),
            'paymentMode' => 'in_store',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        return json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }

    private function openSessionOnFreeSlot($client, array $headers, int $serviceId, int $employeeId, \DateTimeImmutable $seed): array
    {
        for ($i = 0; $i < 10; $i++) {
            // On garde le meme jour de semaine pour reutiliser la disponibilite ajoutee au debut du test.
            $candidate = $seed->modify(sprintf('+%d weeks', $i));
            $session = $this->tryOpenSession($client, $headers, $serviceId, $employeeId, $candidate);
            if ($session !== null) {
                return $session;
            }
        }

        self::fail('Impossible de trouver un creneau libre pour creer une session de booking.');
    }

    private function tryOpenSession($client, array $headers, int $serviceId, int $employeeId, \DateTimeImmutable $startAt): ?array
    {
        $client->request('POST', '/api/v1/bookings/sessions', [], [], $headers, json_encode([
            'serviceId' => $serviceId,
            'employeeId' => $employeeId,
            'startAt' => $startAt->format(DATE_ATOM),
            'paymentMode' => 'in_store',
        ], JSON_THROW_ON_ERROR));

        if ($client->getResponse()->getStatusCode() !== 201) {
            return null;
        }

        return json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }

    private function openTwoSessionsOnFreeSlot($client, array $headers, int $serviceId, int $employeeId, \DateTimeImmutable $seed): array
    {
        for ($i = 0; $i < 10; $i++) {
            // On decale de semaine en semaine pour conserver le meme dayOfWeek couvert par la disponibilite du test.
            $candidate = $seed->modify(sprintf('+%d weeks', $i));
            $sessionA = $this->tryOpenSession($client, $headers, $serviceId, $employeeId, $candidate);
            if ($sessionA === null) {
                continue;
            }
            $sessionB = $this->tryOpenSession($client, $headers, $serviceId, $employeeId, $candidate);
            if ($sessionB === null) {
                continue;
            }

            return [$sessionA, $sessionB];
        }

        self::fail('Impossible de trouver un creneau libre pour le test de double confirmation.');
    }

    private function ensureAvailability($client, array $headers, int $employeeId, int $dayOfWeek): void
    {
        $client->request('POST', '/api/v1/planning/availabilities', [], [], $headers, json_encode([
            'employeeId' => $employeeId,
            'dayOfWeek' => $dayOfWeek,
            'startTime' => '09:00',
            'endTime' => '18:00',
            'isAvailable' => true,
        ], JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();
    }

    private function configureBusinessHours($client, array $headers): void
    {
        $items = [];
        for ($day = 1; $day <= 7; $day++) {
            $items[] = [
                'dayOfWeek' => $day,
                'startTime' => '00:00',
                'endTime' => '23:59',
                'isOpen' => true,
            ];
        }

        $client->request('PUT', '/api/v1/planning/business-hours', [], [], $headers, json_encode([
            'items' => $items,
        ], JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();
    }

    private function buildSlot(int $isoDay, int $futureDays): \DateTimeImmutable
    {
        $offset = ((int) (microtime(true) * 1000) % 17) + (getmypid() % 5);
        $base = (new \DateTimeImmutable(sprintf('+%d days', $futureDays + $offset)))
            ->modify('monday this week')
            ->modify(sprintf('+%d days', $isoDay - 1));
        $minute = ((int) (microtime(true) * 1000)) % 30;
        return $base->setTime(10, $minute);
    }
}
