<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ProductPayloadTest extends WebTestCase
{
    public function testCreateProductValidation(): void
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
                'name' => '',
                'sku' => '',
                'price' => -1,
                'brandId' => 99999,
                'categoryId' => 99999,
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(400);
    }

    public function testStockAdjustmentRequiresEmployee(): void
    {
        $client = static::createClient();
        $client->jsonRequest('POST', '/api/v1/products/1/stock-adjustments', [
            'type' => 'adjust',
            'quantity' => 1,
            'reason' => 'test',
        ]);

        self::assertResponseStatusCodeSame(401);
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
