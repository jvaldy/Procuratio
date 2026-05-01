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
        $this->ensureAvailability($client, $employeeHeaders, $employeeId, 3);

        $client->request('GET', sprintf('/api/v1/public/booking/slots?serviceId=%d&from=%s&to=%s&employeeId=%d', $serviceId, $startAt->format('Y-m-d'), $startAt->format('Y-m-d'), $employeeId));
        self::assertResponseIsSuccessful();

        $client->request('POST', '/api/v1/bookings/sessions', [], [], $customerHeaders, json_encode([
            'serviceId' => $serviceId,
            'employeeId' => $employeeId,
            'startAt' => $startAt->format(DATE_ATOM),
            'paymentMode' => 'in_store',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $session = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $client->request('POST', sprintf('/api/v1/bookings/sessions/%s/confirm', $session['token']), [], [], $customerHeaders, json_encode([
            'notes' => 'Rendez-vous test client',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $appointment = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('scheduled', $appointment['status']);

        $client->request('GET', sprintf('/api/v1/client/appointments/%d', $appointment['id']), [], [], $customerHeaders);
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
        $this->ensureAvailability($client, $employeeHeaders, $employeeId, 4);

        $sessionA = $this->openSession($client, $customerHeaders, $serviceId, $employeeId, $startAt);
        $sessionB = $this->openSession($client, $customerHeaders, $serviceId, $employeeId, $startAt);

        $client->request('POST', sprintf('/api/v1/bookings/sessions/%s/confirm', $sessionA['token']), [], [], $customerHeaders, '{}');
        self::assertResponseStatusCodeSame(201);

        $client->request('POST', sprintf('/api/v1/bookings/sessions/%s/confirm', $sessionB['token']), [], [], $customerHeaders, '{}');
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

    private function ensureAvailability($client, array $headers, int $employeeId, int $dayOfWeek): void
    {
        $client->request('POST', '/api/v1/planning/availabilities', [], [], $headers, json_encode([
            'employeeId' => $employeeId,
            'dayOfWeek' => $dayOfWeek,
            'startTime' => '09:00',
            'endTime' => '18:00',
            'isAvailable' => true,
        ], JSON_THROW_ON_ERROR));
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
