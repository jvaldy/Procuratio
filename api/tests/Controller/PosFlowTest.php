<?php

namespace App\Tests\Controller;

use App\Entity\Customer;
use App\Entity\Product;
use App\Entity\Service;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class PosFlowTest extends WebTestCase
{
    public function testEndToEndPosFlow(): void
    {
        $client = static::createClient();
        $token = $this->loginEmployee($client);
        $customerId = $this->resolveCustomerId();
        $productId = $this->resolveProductId();
        $serviceId = $this->resolveServiceId();

        $headers = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ];

        $client->request('POST', '/api/v1/pos/sales', [], [], $headers, json_encode([
            'customerId' => $customerId,
            'items' => [
                ['itemType' => 'product', 'itemId' => $productId, 'quantity' => 1, 'taxRate' => 20],
                ['itemType' => 'service', 'itemId' => $serviceId, 'quantity' => 1, 'taxRate' => 20],
            ],
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $sale = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $saleId = (int) $sale['id'];

        $client->request('POST', sprintf('/api/v1/pos/sales/%d/suspend', $saleId), [], [], $headers, json_encode(['reason' => 'Pause'], JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();

        $client->request('POST', sprintf('/api/v1/pos/sales/%d/resume', $saleId), [], [], $headers);
        self::assertResponseIsSuccessful();

        $client->request('POST', sprintf('/api/v1/pos/sales/%d/suspend', $saleId), [], [], $headers, json_encode(['reason' => 'Second pause'], JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();

        $client->request('POST', sprintf('/api/v1/pos/sales/%d/resume', $saleId), [], [], $headers);
        self::assertResponseIsSuccessful();

        $client->request('POST', sprintf('/api/v1/pos/sales/%d/payments', $saleId), [], [], $headers, json_encode([
            'method' => 'cash',
            'amount' => $sale['total'],
        ], JSON_THROW_ON_ERROR));
        self::assertResponseIsSuccessful();

        $client->request('GET', sprintf('/api/v1/customers/%d/sales?page=1&perPage=10', $customerId), [], [], $headers);
        self::assertResponseIsSuccessful();
        $history = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertNotEmpty($history['data']);
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

    private function resolveCustomerId(): int
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $customer = $em->getRepository(Customer::class)->findOneBy([]);
        self::assertNotNull($customer);

        return $customer->getId();
    }

    private function resolveProductId(): int
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $product = $em->getRepository(Product::class)->findOneBy([]);
        self::assertNotNull($product);

        return $product->getId();
    }

    private function resolveServiceId(): int
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $service = $em->getRepository(Service::class)->findOneBy([]);
        self::assertNotNull($service);

        return $service->getId();
    }
}
