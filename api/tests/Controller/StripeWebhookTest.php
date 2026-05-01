<?php

namespace App\Tests\Controller;

use App\Entity\Order;
use App\Entity\Product;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class StripeWebhookTest extends WebTestCase
{
    public function testStripeWebhookValidSignatureUpdatesOrderAndStock(): void
    {
        $client = static::createClient();
        $token = $this->loginCustomer($client);
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $token];

        $client->request('GET', '/api/v1/catalog/products?page=1&perPage=1');
        $catalog = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $productId = (int) $catalog['data'][0]['id'];

        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);
        /** @var Product $productBefore */
        $productBefore = $em->getRepository(Product::class)->find($productId);
        $initialStock = $productBefore->getStock();

        $client->request('POST', '/api/v1/cart/items', [], [], $headers, json_encode([
            'productId' => $productId,
            'quantity' => 1,
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);

        $client->request('POST', '/api/v1/checkout', [], [], $headers, json_encode([
            'pickupInStore' => false,
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(201);
        $checkout = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $intentId = (string) $checkout['paymentIntent']['id'];
        $orderNumber = (string) $checkout['order']['orderNumber'];

        $event = [
            'id' => 'evt_test_' . uniqid(),
            'type' => 'payment_intent.succeeded',
            'data' => ['object' => ['id' => $intentId]],
        ];
        $payload = json_encode($event, JSON_THROW_ON_ERROR);
        $signature = $this->buildStripeSignature($payload, $this->webhookSecret());

        $client->request('POST', '/api/v1/payments/stripe/webhook', [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => $signature,
        ], $payload);
        self::assertResponseIsSuccessful();

        // On renvoie le meme event: il doit etre ignore sans effet secondaire.
        $client->request('POST', '/api/v1/payments/stripe/webhook', [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => $signature,
        ], $payload);
        self::assertResponseIsSuccessful();
        $second = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('ignored', $second['status']);

        /** @var Order $order */
        $order = $em->getRepository(Order::class)->findOneBy(['orderNumber' => $orderNumber]);
        self::assertNotNull($order);
        self::assertSame(Order::STATUS_PAID, $order->getStatus());

        /** @var Product $productAfter */
        $productAfter = $em->getRepository(Product::class)->find($productId);
        self::assertNotNull($productAfter);
        self::assertSame($initialStock - 1, $productAfter->getStock());
    }

    public function testStripeWebhookInvalidSignatureIsRejected(): void
    {
        $client = static::createClient();
        $payload = json_encode([
            'id' => 'evt_invalid_' . uniqid(),
            'type' => 'payment_intent.succeeded',
            'data' => ['object' => ['id' => 'pi_fake']],
        ], JSON_THROW_ON_ERROR);

        $client->request('POST', '/api/v1/payments/stripe/webhook', [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't=1,v1=invalid',
        ], $payload);
        self::assertResponseStatusCodeSame(403);
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

    private function buildStripeSignature(string $payload, string $secret): string
    {
        $timestamp = (string) time();
        $signedPayload = $timestamp . '.' . $payload;
        $hash = hash_hmac('sha256', $signedPayload, $secret);

        return sprintf('t=%s,v1=%s', $timestamp, $hash);
    }

    private function webhookSecret(): string
    {
        $secret = (string) ($_SERVER['STRIPE_WEBHOOK_SECRET'] ?? $_ENV['STRIPE_WEBHOOK_SECRET'] ?? getenv('STRIPE_WEBHOOK_SECRET'));

        return $secret !== '' ? $secret : 'whsec_test_dummy';
    }
}
