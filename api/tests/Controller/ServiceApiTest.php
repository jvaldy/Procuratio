<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ServiceApiTest extends WebTestCase
{
    public function testServicesListIsPublic(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/services');

        self::assertResponseIsSuccessful();
    }

    public function testCreateServiceRequiresEmployee(): void
    {
        $client = static::createClient();
        $client->jsonRequest('POST', '/api/v1/services', [
            'name' => 'Massage test',
            'price' => 50,
        ]);

        self::assertResponseStatusCodeSame(401);
    }

    public function testCreateServiceValidation(): void
    {
        $client = static::createClient();
        $token = $this->loginAsEmployee($client);

        $client->request(
            'POST',
            '/api/v1/services',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
            ],
            content: json_encode(['name' => '', 'price' => -2], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(400);
    }

    private function loginAsEmployee($client): string
    {
        $client->jsonRequest('POST', '/api/v1/auth/login', [
            'email' => 'employee@procuratio.local',
            'password' => 'Employee123!',
        ]);

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);

        return $data['token'];
    }
}
