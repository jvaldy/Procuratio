<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class SystemControllerTest extends WebTestCase
{
    public function testHealthIsPublic(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/health');

        self::assertResponseIsSuccessful();
    }

    public function testProtectedEndpointRequiresAuth(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/me');

        self::assertResponseStatusCodeSame(401);
    }
}
