<?php

namespace App\Tests\Controller;

use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\Service;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class PlanningApiTest extends WebTestCase
{
    public function testCreateAppointmentAndRejectConflict(): void
    {
        $client = static::createClient();
        $token = $this->loginEmployee($client);
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $token];

        [$employeeId, $customerId, $serviceId] = $this->resolveFixtureIds();
        $startAt = $this->buildUniqueSlot(1);

        $payload = [
            'employeeId' => $employeeId,
            'customerId' => $customerId,
            'startAt' => $startAt,
            'services' => [['serviceId' => $serviceId, 'quantity' => 1]],
            'notes' => 'Test sprint 3',
        ];
        $this->ensureAvailability($client, $headers, $employeeId, 1);

        $client->request('POST', '/api/v1/planning/appointments', [], [], $headers, json_encode($payload, JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);

        $client->request('POST', '/api/v1/planning/appointments', [], [], $headers, json_encode($payload, JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(400);
    }

    public function testCancelAppointment(): void
    {
        $client = static::createClient();
        $token = $this->loginEmployee($client);
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $token];
        [$employeeId, $customerId, $serviceId] = $this->resolveFixtureIds();

        $payload = [
            'employeeId' => $employeeId,
            'customerId' => $customerId,
            'startAt' => $this->buildUniqueSlot(2),
            'services' => [['serviceId' => $serviceId, 'quantity' => 1]],
        ];
        $this->ensureAvailability($client, $headers, $employeeId, 2);

        $client->request('POST', '/api/v1/planning/appointments', [], [], $headers, json_encode($payload, JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $appointmentId = (int) json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR)['id'];

        $client->request('POST', sprintf('/api/v1/planning/appointments/%d/cancel', $appointmentId), [], [], $headers);
        self::assertResponseIsSuccessful();
        $data = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('cancelled', $data['status']);
    }

    public function testRestoreCancelledFutureAppointmentViaStatusPatch(): void
    {
        $client = static::createClient();
        $token = $this->loginEmployee($client);
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $token];
        [$employeeId, $customerId, $serviceId] = $this->resolveFixtureIds();

        $payload = [
            'employeeId' => $employeeId,
            'customerId' => $customerId,
            'startAt' => $this->buildUniqueSlot(3),
            'services' => [['serviceId' => $serviceId, 'quantity' => 1]],
        ];
        $this->ensureAvailability($client, $headers, $employeeId, 3);

        $client->request('POST', '/api/v1/planning/appointments', [], [], $headers, json_encode($payload, JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $appointmentId = (int) json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR)['id'];

        $client->request('POST', sprintf('/api/v1/planning/appointments/%d/cancel', $appointmentId), [], [], $headers);
        self::assertResponseStatusCodeSame(200);

        $client->request('PATCH', sprintf('/api/v1/planning/appointments/%d/status', $appointmentId), [], [], $headers, json_encode([
            'status' => 'scheduled',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(200);
        $data = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('scheduled', $data['status']);
    }

    public function testRejectAvailabilityOutsideSalonHours(): void
    {
        $client = static::createClient();
        $token = $this->loginEmployee($client);
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $token];
        [$employeeId] = $this->resolveFixtureIds();

        $client->request('POST', '/api/v1/planning/availabilities', [], [], $headers, json_encode([
            'employeeId' => $employeeId,
            'dayOfWeek' => 1,
            'startTime' => '08:00',
            'endTime' => '19:00',
            'isAvailable' => true,
        ], JSON_THROW_ON_ERROR));

        self::assertResponseStatusCodeSame(400);
    }

    private function loginEmployee($client): string
    {
        $client->request('POST', '/api/v1/auth/login', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email' => 'employee@procuratio.local',
            'password' => 'Employee123!',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        return (string) $payload['token'];
    }

    private function resolveFixtureIds(): array
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $employeeUser = $em->getRepository(User::class)->findOneBy(['email' => 'employee@procuratio.local']);
        self::assertNotNull($employeeUser);
        $employee = $em->getRepository(Employee::class)->findOneBy(['user' => $employeeUser]);
        $customer = $em->getRepository(Customer::class)->findOneBy([]);
        $service = $em->getRepository(Service::class)->findOneBy([]);

        self::assertNotNull($employee);
        self::assertNotNull($customer);
        self::assertNotNull($service);

        return [$employee->getId(), $customer->getId(), $service->getId()];
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

    private function buildUniqueSlot(int $isoDayOfWeek): string
    {
        $base = new \DateTimeImmutable(sprintf('next %s', match ($isoDayOfWeek) {
            1 => 'monday',
            2 => 'tuesday',
            3 => 'wednesday',
            4 => 'thursday',
            5 => 'friday',
            6 => 'saturday',
            default => 'sunday',
        }));
        // On decale la date et l'heure pour limiter les collisions quand la base n'est pas reinitialisee entre deux runs.
        $weekOffset = ((int) floor(microtime(true)) % 6) + (getmypid() % 3);
        $hour = 9 + ((getmypid() + $weekOffset) % 8);
        $minute = ((int) (microtime(true) * 1000)) % 60;

        return $base->modify(sprintf('+%d weeks', $weekOffset))->setTime($hour, $minute)->format(DATE_ATOM);
    }
}
