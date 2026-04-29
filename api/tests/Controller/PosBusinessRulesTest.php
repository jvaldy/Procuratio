<?php

namespace App\Tests\Controller;

use App\Entity\Product;
use App\Entity\Service;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class PosBusinessRulesTest extends WebTestCase
{
    public function testCannotResumeNonSuspendedSale(): void
    {
        $client = static::createClient();
        $token = $this->loginEmployee($client);
        [$productId, $serviceId] = $this->resolveItemIds();

        $saleId = $this->createSale($client, $token, $productId, $serviceId);
        $client->request('POST', sprintf('/api/v1/pos/sales/%d/resume', $saleId), [], [], $this->authHeaders($token));

        self::assertResponseStatusCodeSame(400);
    }

    public function testCannotPayWithInvalidMethod(): void
    {
        $client = static::createClient();
        $token = $this->loginEmployee($client);
        [$productId, $serviceId] = $this->resolveItemIds();

        $saleId = $this->createSale($client, $token, $productId, $serviceId);
        $client->request('POST', sprintf('/api/v1/pos/sales/%d/payments', $saleId), [], [], $this->authHeaders($token), json_encode([
            'method' => 'crypto',
            'amount' => 10,
        ], JSON_THROW_ON_ERROR));

        self::assertResponseStatusCodeSame(400);
    }

    public function testCannotPayTwice(): void
    {
        $client = static::createClient();
        $token = $this->loginEmployee($client);
        [$productId, $serviceId] = $this->resolveItemIds();

        $saleId = $this->createSale($client, $token, $productId, $serviceId);
        $this->paySale($client, $token, $saleId, 50.00);
        $this->paySale($client, $token, $saleId, 50.00);

        self::assertResponseStatusCodeSame(400);
    }

    private function authHeaders(string $token): array
    {
        return [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ];
    }

    private function createSale($client, string $token, int $productId, int $serviceId): int
    {
        $client->request('POST', '/api/v1/pos/sales', [], [], $this->authHeaders($token), json_encode([
            'items' => [
                ['itemType' => 'product', 'itemId' => $productId, 'quantity' => 1, 'taxRate' => 20],
                ['itemType' => 'service', 'itemId' => $serviceId, 'quantity' => 1, 'taxRate' => 20],
            ],
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        return (int) $payload['id'];
    }

    private function paySale($client, string $token, int $saleId, float $amount): void
    {
        $client->request('POST', sprintf('/api/v1/pos/sales/%d/payments', $saleId), [], [], $this->authHeaders($token), json_encode([
            'method' => 'cash',
            'amount' => $amount,
        ], JSON_THROW_ON_ERROR));
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

    private function resolveItemIds(): array
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $product = $em->getRepository(Product::class)->findOneBy([]);
        $service = $em->getRepository(Service::class)->findOneBy([]);

        self::assertNotNull($product);
        self::assertNotNull($service);

        return [$product->getId(), $service->getId()];
    }
}

