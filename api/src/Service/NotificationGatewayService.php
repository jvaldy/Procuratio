<?php

namespace App\Service;

use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class NotificationGatewayService
{
    public function __construct(
        private readonly string $emailMode = 'log',
        private readonly string $smsMode = 'log',
        private readonly string $mailFrom = 'no-reply@procuratio.local',
        private readonly string $smsWebhookUrl = '',
        private readonly string $smsWebhookToken = '',
    ) {
    }

    /**
     * @return array{ok:bool,error:?string}
     */
    public function sendEmail(string $to, string $subject, string $message): array
    {
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'error' => 'Adresse email invalide.'];
        }

        if ($this->emailMode !== 'mail') {
            return ['ok' => true, 'error' => null];
        }

        $headers = sprintf("From: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n", $this->mailFrom);
        $ok = @mail($to, $subject, $message, $headers);
        return $ok ? ['ok' => true, 'error' => null] : ['ok' => false, 'error' => 'Echec envoi email via mail().'];
    }

    /**
     * @return array{ok:bool,error:?string}
     */
    public function sendSms(string $to, string $message): array
    {
        if ($to === '') {
            return ['ok' => false, 'error' => 'Numero de telephone manquant.'];
        }

        if ($this->smsMode !== 'webhook') {
            return ['ok' => true, 'error' => null];
        }

        if ($this->smsWebhookUrl === '') {
            throw new BadRequestHttpException('SMS_WEBHOOK_URL manquant pour le mode webhook.');
        }

        $payload = json_encode(['to' => $to, 'message' => $message], JSON_THROW_ON_ERROR);
        $headers = "Content-Type: application/json\r\n";
        if ($this->smsWebhookToken !== '') {
            $headers .= sprintf("Authorization: Bearer %s\r\n", $this->smsWebhookToken);
        }

        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => $headers,
                'content' => $payload,
                'timeout' => 8,
            ],
        ]);

        $result = @file_get_contents($this->smsWebhookUrl, false, $ctx);
        if ($result === false) {
            return ['ok' => false, 'error' => 'Echec appel provider SMS webhook.'];
        }

        return ['ok' => true, 'error' => null];
    }
}

