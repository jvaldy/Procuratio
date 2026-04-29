<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class CatalogApiTest extends WebTestCase
{
    public function testCatalogListsArePublic(): void
    {
        $client = static::createClient();

        $client->request('GET', '/api/v1/catalog/brands');
        self::assertResponseIsSuccessful();

        $client->request('GET', '/api/v1/catalog/categories');
        self::assertResponseIsSuccessful();
    }

    public function testCreateBrandRequiresEmployee(): void
    {
        $client = static::createClient();
        $client->jsonRequest('POST', '/api/v1/catalog/brands', ['name' => 'Test Brand']);

        self::assertResponseStatusCodeSame(401);
    }

    public function testCreateBrandRejectsInvalidPayload(): void
    {
        $client = static::createClient();
        $token = $this->loginAsEmployee($client);

        $client->request(
            'POST',
            '/api/v1/catalog/brands',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
            ],
            content: json_encode(['name' => '   '], JSON_THROW_ON_ERROR)
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
