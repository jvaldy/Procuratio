<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class StoreApiTest extends WebTestCase
{
    public function testAdminCanCreateAndDeleteUnlinkedStore(): void
    {
        $client = static::createClient();
        $token = $this->loginAdmin($client);
        $headers = $this->authHeaders($token);

        $unique = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
        $name = 'Seanergy Test ' . $unique;
        $code = 'TEST-' . $unique;

        $client->request('POST', '/api/v1/admin/stores', [], [], $headers, json_encode([
            'name' => $name,
            'code' => $code,
            'city' => 'Paris',
            'country' => 'France',
            'status' => 'active',
            'themeColor' => 'soft',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);

        $created = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertTrue($created['canDelete']);
        self::assertSame(0, $created['linkCount']);

        $client->request('DELETE', sprintf('/api/v1/admin/stores/%d', $created['id']), [], [], $headers);
        self::assertResponseIsSuccessful();

        $client->request('GET', '/api/v1/admin/stores?page=1&perPage=100&q=' . urlencode($code), [], [], $headers);
        self::assertResponseIsSuccessful();
        $result = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(0, $result['data']);
    }

    public function testAdminCannotDeleteLinkedStore(): void
    {
        $client = static::createClient();
        $token = $this->loginAdmin($client);
        $headers = $this->authHeaders($token);

        $client->request('GET', '/api/v1/admin/stores?page=1&perPage=100', [], [], $headers);
        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $linkedStore = null;
        foreach ($payload['data'] as $store) {
            if (($store['linkCount'] ?? 0) > 0) {
                $linkedStore = $store;
                break;
            }
        }

        self::assertNotNull($linkedStore, 'At least one linked store is expected in fixtures.');
        self::assertFalse($linkedStore['canDelete']);

        $client->request('DELETE', sprintf('/api/v1/admin/stores/%d', $linkedStore['id']), [], [], $headers);
        self::assertResponseStatusCodeSame(400);

        self::assertStringContainsString(
            'cannot be deleted',
            (string) $client->getResponse()->getContent()
        );
    }

    private function loginAdmin($client): string
    {
        $client->request('POST', '/api/v1/auth/login', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email' => 'admin@procuratio.local',
            'password' => 'Admin123!',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        return (string) $payload['token'];
    }

    private function authHeaders(string $token): array
    {
        return [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ];
    }
}
