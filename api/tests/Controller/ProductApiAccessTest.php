<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ProductApiAccessTest extends WebTestCase
{
    public function testProductsListIsPublic(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/products');

        self::assertResponseIsSuccessful();
    }

    public function testEmployeeCannotCreateProduct(): void
    {
        $client = static::createClient();
        $token = $this->loginAsEmployee($client);

        $client->request(
            'POST',
            '/api/v1/products',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
            ],
            content: json_encode([
                'name' => 'Forbidden test',
                'sku' => 'FORBIDDEN-1',
                'price' => 12.5,
                'brandId' => 1,
                'categoryId' => 1,
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(403);
    }

    public function testAdminCanReachCreateValidation(): void
    {
        $client = static::createClient();
        $token = $this->loginAsAdmin($client);

        $client->request(
            'POST',
            '/api/v1/products',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
            ],
            content: '{}'
        );

        // Si l'acces role est correct, on tombe sur une erreur de validation, pas 403.
        self::assertResponseStatusCodeSame(400);
    }

    private function loginAsAdmin($client): string
    {
        $client->jsonRequest('POST', '/api/v1/auth/login', [
            'email' => 'admin@procuratio.local',
            'password' => 'Admin123!',
        ]);
        self::assertResponseIsSuccessful();
        $data = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        return (string) $data['token'];
    }

    private function loginAsEmployee($client): string
    {
        $client->jsonRequest('POST', '/api/v1/auth/login', [
            'email' => 'employee@procuratio.local',
            'password' => 'Employee123!',
        ]);
        self::assertResponseIsSuccessful();
        $data = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        return (string) $data['token'];
    }
}
