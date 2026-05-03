<?php

namespace App\Controller\Api\V1;

use App\Entity\Campaign;
use App\Entity\Customer;
use App\Entity\GiftVoucher;
use App\Entity\LoyaltyAccount;
use App\Entity\LoyaltyEvent;
use App\Entity\NotificationLog;
use App\Entity\ReminderRule;
use App\Service\CrmService;
use App\Service\GiftVoucherDocumentService;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1/crm', name: 'api_v1_crm_')]
#[IsGranted('ROLE_EMPLOYEE')]
class CrmController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CrmService $crmService,
        private readonly GiftVoucherDocumentService $voucherDocumentService,
    ) {
    }

    #[OA\Get(path: '/api/v1/crm/loyalty/accounts', tags: ['CRM'], summary: 'Lister les comptes fidelite')]
    #[Route('/loyalty/accounts', name: 'loyalty_accounts', methods: ['GET'])]
    public function loyaltyAccounts(): JsonResponse
    {
        $items = $this->em->getRepository(LoyaltyAccount::class)->findBy([], ['updatedAt' => 'DESC']);
        return $this->json(['data' => array_map(fn(LoyaltyAccount $a) => [
            'id' => $a->getId(),
            'customerId' => $a->getCustomer()->getId(),
            'customerName' => $a->getCustomer()->getFullName(),
            'pointsBalance' => $a->getPointsBalance(),
            'isActive' => $a->isActive(),
            'updatedAt' => $a->getUpdatedAt()->format(DATE_ATOM),
        ], $items)]);
    }

    #[OA\Post(path: '/api/v1/crm/loyalty/events', tags: ['CRM'], summary: 'Ajouter/consommer des points fidelite')]
    #[Route('/loyalty/events', name: 'loyalty_event', methods: ['POST'])]
    public function loyaltyEvent(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $customer = $this->resolveCustomer((int) ($payload['customerId'] ?? 0));
        $type = (string) ($payload['type'] ?? '');
        $points = (int) ($payload['points'] ?? 0);
        $reason = isset($payload['reason']) ? (string) $payload['reason'] : null;

        $event = match ($type) {
            LoyaltyEvent::TYPE_EARN => $this->crmService->addLoyaltyPoints($customer, $points, $reason),
            LoyaltyEvent::TYPE_REDEEM => $this->crmService->redeemLoyaltyPoints($customer, $points, $reason),
            default => throw new BadRequestHttpException('type invalide (earn/redeem).'),
        };

        return $this->json($this->serializeLoyaltyEvent($event), 201);
    }

    #[OA\Get(path: '/api/v1/crm/campaigns', tags: ['CRM'], summary: 'Lister les campagnes')]
    #[Route('/campaigns', name: 'campaigns_list', methods: ['GET'])]
    public function campaigns(): JsonResponse
    {
        $items = $this->em->getRepository(Campaign::class)->findBy([], ['createdAt' => 'DESC']);
        return $this->json(['data' => array_map(fn(Campaign $c) => $this->serializeCampaign($c), $items)]);
    }

    #[OA\Post(path: '/api/v1/crm/campaigns', tags: ['CRM'], summary: 'Creer une campagne')]
    #[Route('/campaigns', name: 'campaigns_create', methods: ['POST'])]
    public function createCampaign(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $name = trim((string) ($payload['name'] ?? ''));
        $channel = trim((string) ($payload['channel'] ?? ''));
        $message = trim((string) ($payload['messageTemplate'] ?? ''));
        $segment = is_array($payload['segment'] ?? null) ? $payload['segment'] : [];

        if ($name === '' || $channel === '' || $message === '') {
            throw new BadRequestHttpException('name, channel et messageTemplate sont requis.');
        }

        $campaign = (new Campaign())
            ->setName($name)
            ->setChannel($channel)
            ->setMessageTemplate($message)
            ->setSegment($segment);

        $this->em->persist($campaign);
        $this->em->flush();
        return $this->json($this->serializeCampaign($campaign), 201);
    }

    #[OA\Post(path: '/api/v1/crm/campaigns/{id}/launch', tags: ['CRM'], summary: 'Lancer une campagne')]
    #[Route('/campaigns/{id}/launch', name: 'campaigns_launch', methods: ['POST'])]
    public function launchCampaign(int $id): JsonResponse
    {
        $campaign = $this->em->getRepository(Campaign::class)->find($id);
        if (!$campaign instanceof Campaign) {
            throw new NotFoundHttpException('Campagne introuvable.');
        }

        $campaign = $this->crmService->launchCampaign($campaign);
        return $this->json($this->serializeCampaign($campaign));
    }

    #[OA\Get(path: '/api/v1/crm/gift-vouchers', tags: ['CRM'], summary: 'Lister les bons cadeaux')]
    #[Route('/gift-vouchers', name: 'gift_vouchers_list', methods: ['GET'])]
    public function giftVouchers(): JsonResponse
    {
        $items = $this->em->getRepository(GiftVoucher::class)->findBy([], ['createdAt' => 'DESC']);
        return $this->json(['data' => array_map(fn(GiftVoucher $v) => $this->serializeVoucher($v), $items)]);
    }

    #[OA\Post(path: '/api/v1/crm/gift-vouchers', tags: ['CRM'], summary: 'Creer un bon cadeau')]
    #[Route('/gift-vouchers', name: 'gift_vouchers_create', methods: ['POST'])]
    public function createGiftVoucher(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $amount = (float) ($payload['amount'] ?? 0);
        $customer = isset($payload['customerId']) ? $this->resolveCustomer((int) $payload['customerId']) : null;
        $expiresAt = isset($payload['expiresAt']) ? new \DateTimeImmutable((string) $payload['expiresAt']) : null;

        $voucher = $this->crmService->createGiftVoucher($amount, $customer, $expiresAt);
        return $this->json($this->serializeVoucher($voucher), 201);
    }

    #[OA\Post(path: '/api/v1/crm/gift-vouchers/{id}/consume', tags: ['CRM'], summary: 'Consommer un bon cadeau')]
    #[Route('/gift-vouchers/{id}/consume', name: 'gift_vouchers_consume', methods: ['POST'])]
    public function consumeGiftVoucher(int $id, Request $request): JsonResponse
    {
        $voucher = $this->em->getRepository(GiftVoucher::class)->find($id);
        if (!$voucher instanceof GiftVoucher) {
            throw new NotFoundHttpException('Bon cadeau introuvable.');
        }
        $payload = $this->decodeJson($request);
        $amount = (float) ($payload['amount'] ?? 0);
        $voucher = $this->crmService->consumeGiftVoucher($voucher, $amount);

        return $this->json($this->serializeVoucher($voucher));
    }

    #[OA\Get(path: '/api/v1/crm/gift-vouchers/{id}/print', tags: ['CRM'], summary: 'Imprimer un bon cadeau')]
    #[Route('/gift-vouchers/{id}/print', name: 'gift_vouchers_print', methods: ['GET'])]
    public function printGiftVoucher(int $id, Request $request): Response
    {
        $voucher = $this->em->getRepository(GiftVoucher::class)->find($id);
        if (!$voucher instanceof GiftVoucher) {
            throw new NotFoundHttpException('Bon cadeau introuvable.');
        }

        $html = $this->voucherDocumentService->buildPrintableHtml(
            $voucher,
            $request->query->get('recipientName'),
            $request->query->get('purchaserName'),
        );

        return new Response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    #[OA\Post(path: '/api/v1/crm/gift-vouchers/{id}/send', tags: ['CRM'], summary: 'Envoyer un bon cadeau par email')]
    #[Route('/gift-vouchers/{id}/send', name: 'gift_vouchers_send', methods: ['POST'])]
    public function sendGiftVoucher(int $id, Request $request): JsonResponse
    {
        $voucher = $this->em->getRepository(GiftVoucher::class)->find($id);
        if (!$voucher instanceof GiftVoucher) {
            throw new NotFoundHttpException('Bon cadeau introuvable.');
        }

        $payload = $this->decodeJson($request);
        $toEmail = trim((string) ($payload['toEmail'] ?? ''));
        $message = trim((string) ($payload['message'] ?? 'Voici votre bon cadeau Procuratio.'));
        if ($toEmail === '') {
            throw new BadRequestHttpException('toEmail est requis.');
        }

        $result = $this->crmService->sendGiftVoucherByEmail($voucher, $toEmail, $message);
        return $this->json([
            'status' => $result['ok'] ? 'sent' : 'failed',
            'error' => $result['error'],
            'voucher' => $this->serializeVoucher($voucher),
        ]);
    }

    #[OA\Get(path: '/api/v1/crm/reminder-rules', tags: ['CRM'], summary: 'Lister les regles de rappels')]
    #[Route('/reminder-rules', name: 'reminder_rules_list', methods: ['GET'])]
    public function reminderRules(): JsonResponse
    {
        $items = $this->em->getRepository(ReminderRule::class)->findBy([], ['offsetHours' => 'ASC']);
        return $this->json(['data' => array_map(fn(ReminderRule $r) => [
            'id' => $r->getId(),
            'name' => $r->getName(),
            'channel' => $r->getChannel(),
            'offsetHours' => $r->getOffsetHours(),
            'isActive' => $r->isActive(),
        ], $items)]);
    }

    #[OA\Post(path: '/api/v1/crm/reminder-rules', tags: ['CRM'], summary: 'Creer une regle de rappel')]
    #[Route('/reminder-rules', name: 'reminder_rules_create', methods: ['POST'])]
    public function createReminderRule(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $rule = (new ReminderRule())
            ->setName(trim((string) ($payload['name'] ?? '')))
            ->setChannel(trim((string) ($payload['channel'] ?? 'email')))
            ->setOffsetHours((int) ($payload['offsetHours'] ?? 24))
            ->setIsActive((bool) ($payload['isActive'] ?? true));

        if ($rule->getName() === '') {
            throw new BadRequestHttpException('name est requis.');
        }

        $this->em->persist($rule);
        $this->em->flush();

        return $this->json([
            'id' => $rule->getId(),
            'name' => $rule->getName(),
            'channel' => $rule->getChannel(),
            'offsetHours' => $rule->getOffsetHours(),
            'isActive' => $rule->isActive(),
        ], 201);
    }

    #[OA\Post(path: '/api/v1/crm/reminders/run', tags: ['CRM'], summary: 'Declencher les rappels planifies')]
    #[Route('/reminders/run', name: 'reminders_run', methods: ['POST'])]
    public function runReminders(): JsonResponse
    {
        $sent = $this->crmService->runScheduledReminders();
        return $this->json(['status' => 'ok', 'sent' => $sent]);
    }

    #[OA\Post(path: '/api/v1/crm/birthdays/run', tags: ['CRM'], summary: 'Declencher les offres anniversaire')]
    #[Route('/birthdays/run', name: 'birthdays_run', methods: ['POST'])]
    public function runBirthdays(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request, true);
        $channel = (string) ($payload['channel'] ?? 'email');
        $message = (string) ($payload['message'] ?? 'Joyeux anniversaire ! Une offre vous attend chez Procuratio.');
        $sent = $this->crmService->runBirthdayOffers($channel, $message);

        return $this->json(['status' => 'ok', 'sent' => $sent, 'channel' => $channel]);
    }

    #[OA\Get(path: '/api/v1/crm/notification-logs', tags: ['CRM'], summary: 'Lire les logs de notifications')]
    #[Route('/notification-logs', name: 'notification_logs', methods: ['GET'])]
    public function notificationLogs(): JsonResponse
    {
        $items = $this->em->getRepository(NotificationLog::class)->findBy([], ['createdAt' => 'DESC'], 200);
        return $this->json(['data' => array_map(fn(NotificationLog $log) => [
            'id' => $log->getId(),
            'kind' => $log->getKind(),
            'channel' => $log->getChannel(),
            'status' => $log->getStatus(),
            'customerId' => $log->getCustomer()?->getId(),
            'campaignId' => $log->getCampaign()?->getId(),
            'appointmentId' => $log->getAppointment()?->getId(),
            'payload' => $log->getPayload(),
            'errorMessage' => $log->getErrorMessage(),
            'createdAt' => $log->getCreatedAt()->format(DATE_ATOM),
        ], $items)]);
    }

    private function decodeJson(Request $request, bool $allowEmpty = false): array
    {
        if ($allowEmpty && trim($request->getContent()) === '') {
            return [];
        }
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Payload JSON invalide.');
        }
        return $payload;
    }

    private function resolveCustomer(int $id): Customer
    {
        $customer = $this->em->getRepository(Customer::class)->find($id);
        if (!$customer instanceof Customer) {
            throw new BadRequestHttpException('customerId invalide.');
        }
        return $customer;
    }

    private function serializeLoyaltyEvent(LoyaltyEvent $event): array
    {
        return [
            'id' => $event->getId(),
            'customerId' => $event->getCustomer()->getId(),
            'eventType' => $event->getEventType(),
            'pointsDelta' => $event->getPointsDelta(),
            'balanceAfter' => $event->getBalanceAfter(),
            'reason' => $event->getReason(),
            'createdAt' => $event->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    private function serializeCampaign(Campaign $campaign): array
    {
        return [
            'id' => $campaign->getId(),
            'name' => $campaign->getName(),
            'channel' => $campaign->getChannel(),
            'status' => $campaign->getStatus(),
            'segment' => $campaign->getSegment(),
            'messageTemplate' => $campaign->getMessageTemplate(),
            'targetCount' => $campaign->getTargetCount(),
            'sentCount' => $campaign->getSentCount(),
            'failedCount' => $campaign->getFailedCount(),
            'createdAt' => $campaign->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    private function serializeVoucher(GiftVoucher $voucher): array
    {
        return [
            'id' => $voucher->getId(),
            'code' => $voucher->getCode(),
            'customerId' => $voucher->getCustomer()?->getId(),
            'status' => $voucher->getStatus(),
            'initialAmount' => (float) $voucher->getInitialAmount(),
            'balanceAmount' => (float) $voucher->getBalanceAmount(),
            'expiresAt' => $voucher->getExpiresAt()?->format(DATE_ATOM),
            'createdAt' => $voucher->getCreatedAt()->format(DATE_ATOM),
        ];
    }
}
