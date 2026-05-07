<?php

namespace App\Tests\Controller;

use App\Entity\Customer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class CrmApiTest extends WebTestCase
{
    public function testLoyaltyCampaignVoucherAndReminderFlow(): void
    {
        $client = static::createClient();
        $token = $this->loginEmployee($client);
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $token];

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $customer = $em->getRepository(Customer::class)->findOneBy([]);
        self::assertNotNull($customer);
        $customerId = (int) $customer->getId();

        $client->request('POST', '/api/v1/crm/loyalty/events', [], [], $headers, json_encode([
            'customerId' => $customerId,
            'type' => 'earn',
            'points' => 30,
            'reason' => 'Test sprint 6',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);

        $client->request('POST', '/api/v1/crm/campaigns', [], [], $headers, json_encode([
            'name' => 'Relance CRM test',
            'channel' => 'email',
            'messageTemplate' => 'Bonjour, offre de fidelite.',
            'segment' => ['minPoints' => 1],
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $campaign = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $client->request('POST', sprintf('/api/v1/crm/campaigns/%d/launch', $campaign['id']), [], [], $headers);
        self::assertResponseIsSuccessful();

        $client->request('POST', '/api/v1/crm/gift-vouchers', [], [], $headers, json_encode([
            'amount' => 50,
            'customerId' => $customerId,
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $voucher = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $client->request('POST', sprintf('/api/v1/crm/gift-vouchers/%d/consume', $voucher['id']), [], [], $headers, json_encode([
            'amount' => 10,
        ], JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();

        $client->request('POST', '/api/v1/crm/reminder-rules', [], [], $headers, json_encode([
            'name' => 'Rappel J-1',
            'channel' => 'email',
            'offsetHours' => 24,
            'isActive' => true,
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);

        $client->request('POST', '/api/v1/crm/reminders/run', [], [], $headers);
        self::assertResponseIsSuccessful();
    }

    public function testSmsCampaignAndBirthdayOfferFlow(): void
    {
        $client = static::createClient();
        $token = $this->loginEmployee($client);
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $token];

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $customer = $em->getRepository(Customer::class)->findOneBy([]);
        self::assertNotNull($customer);
        $customerId = (int) $customer->getId();

        $client->request('POST', '/api/v1/crm/loyalty/events', [], [], $headers, json_encode([
            'customerId' => $customerId,
            'type' => 'earn',
            'points' => 10,
            'reason' => 'Activation segment SMS',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);

        $client->request('POST', '/api/v1/crm/campaigns', [], [], $headers, json_encode([
            'name' => 'Campagne SMS test',
            'channel' => 'sms',
            'messageTemplate' => 'Bonjour, offre SMS de test.',
            'segment' => ['minPoints' => 1],
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $campaign = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $client->request('POST', sprintf('/api/v1/crm/campaigns/%d/launch', $campaign['id']), [], [], $headers);
        self::assertResponseIsSuccessful();

        $client->request('POST', '/api/v1/crm/birthdays/run', [], [], $headers, json_encode([
            'channel' => 'sms',
            'message' => 'Joyeux anniversaire depuis le test SMS.',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();
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
}
