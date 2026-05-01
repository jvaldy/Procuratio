<?php

namespace App\Service;

final class StripeService
{
    public function __construct(
        private readonly string $secretKey,
        private readonly bool $mockMode = true,
    ) {
    }

    public function createPaymentIntent(int $amountCents, string $currency, array $metadata = []): array
    {
        if ($amountCents <= 0) {
            throw new \InvalidArgumentException('Le montant Stripe doit etre strictement positif.');
        }

        if ($this->mockMode) {
            $id = 'pi_mock_' . bin2hex(random_bytes(8));

            return [
                'id' => $id,
                'client_secret' => $id . '_secret_' . bin2hex(random_bytes(10)),
                'status' => 'requires_payment_method',
                'amount' => $amountCents,
                'currency' => strtolower($currency),
                'metadata' => $metadata,
            ];
        }

        $payload = http_build_query([
            'amount' => $amountCents,
            'currency' => strtolower($currency),
            'automatic_payment_methods[enabled]' => 'true',
            ...$this->flattenMetadata($metadata),
        ]);

        $opts = [
            'http' => [
                'method' => 'POST',
                'header' => "Authorization: Bearer {$this->secretKey}\r\nContent-Type: application/x-www-form-urlencoded\r\n",
                'content' => $payload,
                'ignore_errors' => true,
            ],
        ];
        $response = @file_get_contents('https://api.stripe.com/v1/payment_intents', false, stream_context_create($opts));
        if ($response === false) {
            throw new \RuntimeException('Impossible de creer un PaymentIntent Stripe.');
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded) || isset($decoded['error'])) {
            $error = $decoded['error']['message'] ?? 'Erreur Stripe inconnue.';
            throw new \RuntimeException((string) $error);
        }

        return $decoded;
    }

    public function isWebhookSignatureValid(string $payload, ?string $signatureHeader, string $webhookSecret): bool
    {
        if (!$signatureHeader || $webhookSecret === '') {
            return false;
        }

        $parts = [];
        foreach (explode(',', $signatureHeader) as $rawPart) {
            [$k, $v] = array_pad(explode('=', trim($rawPart), 2), 2, null);
            if ($k && $v) {
                $parts[$k][] = $v;
            }
        }

        $timestamp = $parts['t'][0] ?? null;
        $signatures = $parts['v1'] ?? [];
        if (!$timestamp || $signatures === []) {
            return false;
        }

        $signedPayload = $timestamp . '.' . $payload;
        $expected = hash_hmac('sha256', $signedPayload, $webhookSecret);

        foreach ($signatures as $signature) {
            if (hash_equals($expected, $signature)) {
                return true;
            }
        }

        return false;
    }

    private function flattenMetadata(array $metadata): array
    {
        $flat = [];
        foreach ($metadata as $k => $v) {
            $flat['metadata[' . $k . ']'] = (string) $v;
        }

        return $flat;
    }
}

