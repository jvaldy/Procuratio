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

    public function testLoginCheckRouteExists(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/v1/auth/login', [], [], ['CONTENT_TYPE' => 'application/json'], '{}');

        self::assertResponseStatusCodeSame(400);
    }
}
