<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class EcommerceApiTest extends WebTestCase
{
    public function testCustomerCanAddToCartAndCheckout(): void
    {
        $client = static::createClient();
        $token = $this->loginCustomer($client);
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $token];

        $client->request('GET', '/api/v1/catalog/products?page=1&perPage=1');
        self::assertResponseIsSuccessful();
        $catalog = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $productId = (int) $catalog['data'][0]['id'];

        $client->request('POST', '/api/v1/cart/items', [], [], $headers, json_encode([
            'productId' => $productId,
            'quantity' => 2,
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);

        $client->request('GET', '/api/v1/cart', [], [], $headers);
        self::assertResponseIsSuccessful();
        $cart = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertNotEmpty($cart['items']);

        $client->request('POST', '/api/v1/checkout', [], [], $headers, json_encode([
            'pickupInStore' => true,
            'pickupSlot' => '2026-05-07 14:00',
            'pickupNote' => 'Test retrait',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $checkout = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('pending', $checkout['order']['status']);
        self::assertNotEmpty($checkout['paymentIntent']['clientSecret']);
    }

    private function loginCustomer($client): string
    {
        $client->request('POST', '/api/v1/auth/login', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email' => 'customer@procuratio.local',
            'password' => 'Customer123!',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        return (string) $payload['token'];
    }
}

