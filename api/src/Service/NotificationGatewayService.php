<?php

namespace App\Service;

use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class NotificationGatewayService
{
    public function __construct(
        private readonly string $emailMode = 'log',
        private readonly string $smsMode = 'log',
        private readonly string $mailFrom = 'no-reply@procuratio.local',
        private readonly string $mailReplyTo = 'no-reply@procuratio.local',
        private readonly string $brevoApiKey = '',
        private readonly string $smsSender = 'Procuratio',
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

        if ($this->brevoApiKey !== '') {
            $brevoResult = $this->sendEmailViaBrevoApi($to, $subject, $message);
            if ($brevoResult['ok']) {
                return $brevoResult;
            }
        }

        $headers = sprintf(
            "From: %s\r\nReply-To: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n",
            $this->mailFrom,
            $this->mailReplyTo !== '' ? $this->mailReplyTo : $this->mailFrom
        );
        $ok = @mail($to, $subject, $message, $headers);
        return $ok ? ['ok' => true, 'error' => null] : ['ok' => false, 'error' => 'Echec envoi email via mail().'];
    }

    /**
     * @return array{ok:bool,error:?string}
     */
    private function sendEmailViaBrevoApi(string $to, string $subject, string $message): array
    {
        $payload = json_encode([
            'sender' => [
                'email' => $this->mailFrom,
                'name' => 'Procuratio',
            ],
            'to' => [['email' => $to]],
            'replyTo' => ['email' => $this->mailReplyTo !== '' ? $this->mailReplyTo : $this->mailFrom],
            'subject' => $subject,
            'textContent' => $message,
        ], JSON_THROW_ON_ERROR);

        $headers = sprintf(
            "accept: application/json\r\ncontent-type: application/json\r\napi-key: %s\r\n",
            $this->brevoApiKey
        );

        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => $headers,
                'content' => $payload,
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);

        $result = @file_get_contents('https://api.brevo.com/v3/smtp/email', false, $ctx);
        if ($result === false) {
            $statusLine = $http_response_header[0] ?? 'HTTP unknown';
            return ['ok' => false, 'error' => sprintf('Echec envoi email via API Brevo (%s).', $statusLine)];
        }

        $statusLine = $http_response_header[0] ?? '';
        if (!str_contains($statusLine, '200') && !str_contains($statusLine, '201') && !str_contains($statusLine, '202')) {
            $trimmed = trim($result);
            $shortBody = substr($trimmed, 0, 180);
            return ['ok' => false, 'error' => sprintf('Brevo API rejet: %s %s', $statusLine, $shortBody)];
        }

        return ['ok' => true, 'error' => null];
    }

    /**
     * @return array{ok:bool,error:?string}
     */
    public function sendSms(string $to, string $message): array
    {
        $normalizedPhoneNumber = $this->normalizePhoneNumber($to);
        if ($normalizedPhoneNumber === null) {
            return ['ok' => false, 'error' => 'Numero de telephone manquant.'];
        }

        if ($this->smsMode === 'log') {
            return ['ok' => true, 'error' => null];
        }

        if ($this->smsMode === 'brevo') {
            return $this->sendSmsViaBrevoApi($normalizedPhoneNumber, $message);
        }

        if ($this->smsMode !== 'webhook') {
            return ['ok' => false, 'error' => 'Mode SMS non supporte.'];
        }

        if ($this->smsWebhookUrl === '') {
            throw new BadRequestHttpException('SMS_WEBHOOK_URL manquant pour le mode webhook.');
        }

        $payload = json_encode([
            'to' => $normalizedPhoneNumber,
            'message' => $message,
            'sender' => $this->smsSender,
        ], JSON_THROW_ON_ERROR);
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

        $statusLine = $http_response_header[0] ?? '';
        if (!str_contains($statusLine, '200') && !str_contains($statusLine, '201') && !str_contains($statusLine, '202')) {
            $trimmed = trim($result);
            $shortBody = substr($trimmed, 0, 180);
            return ['ok' => false, 'error' => sprintf('Provider SMS webhook rejet: %s %s', $statusLine, $shortBody)];
        }

        return ['ok' => true, 'error' => null];
    }

    /**
     * On normalise le numero ici pour eviter que chaque flux CRM recode ses
     * propres regles. Le provider recoit toujours un format international simple.
     */
    private function normalizePhoneNumber(string $phoneNumber): ?string
    {
        $trimmed = trim($phoneNumber);
        if ($trimmed === '') {
            return null;
        }

        $normalized = preg_replace('/(?!^\+)[^\d]/', '', $trimmed);
        if ($normalized === null || $normalized === '') {
            return null;
        }

        if ($normalized[0] !== '+' && str_starts_with($normalized, '00')) {
            $normalized = '+' . substr($normalized, 2);
        }

        if ($normalized[0] !== '+') {
            $normalized = '+' . ltrim($normalized, '0');
        }

        return strlen($normalized) >= 8 ? $normalized : null;
    }

    /**
     * @return array{ok:bool,error:?string}
     */
    private function sendSmsViaBrevoApi(string $to, string $message): array
    {
        if ($this->brevoApiKey === '') {
            throw new BadRequestHttpException('BREVO_API_KEY manquant pour le mode sms brevo.');
        }

        $payload = json_encode([
            'sender' => $this->smsSender,
            'recipient' => $to,
            'content' => $message,
            'type' => 'transactional',
        ], JSON_THROW_ON_ERROR);

        $headers = sprintf(
            "accept: application/json\r\ncontent-type: application/json\r\napi-key: %s\r\n",
            $this->brevoApiKey
        );

        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => $headers,
                'content' => $payload,
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);

        $result = @file_get_contents('https://api.brevo.com/v3/transactionalSMS/sms', false, $ctx);
        if ($result === false) {
            $statusLine = $http_response_header[0] ?? 'HTTP unknown';
            return ['ok' => false, 'error' => sprintf('Echec envoi SMS via API Brevo (%s).', $statusLine)];
        }

        $statusLine = $http_response_header[0] ?? '';
        if (!str_contains($statusLine, '200') && !str_contains($statusLine, '201') && !str_contains($statusLine, '202')) {
            $trimmed = trim($result);
            $shortBody = substr($trimmed, 0, 180);
            return ['ok' => false, 'error' => sprintf('Brevo SMS API rejet: %s %s', $statusLine, $shortBody)];
        }

        return ['ok' => true, 'error' => null];
    }
}
