<?php

namespace App\Service;

use App\Entity\Appointment;
use App\Entity\Campaign;
use App\Entity\Customer;
use App\Entity\GiftVoucher;
use App\Entity\LoyaltyAccount;
use App\Entity\LoyaltyEvent;
use App\Entity\NotificationLog;
use App\Entity\ReminderRule;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class CrmService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function ensureLoyaltyAccount(Customer $customer): LoyaltyAccount
    {
        $account = $this->em->getRepository(LoyaltyAccount::class)->findOneBy(['customer' => $customer]);
        if ($account instanceof LoyaltyAccount) {
            return $account;
        }

        $account = (new LoyaltyAccount())->setCustomer($customer)->setPointsBalance(0);
        $this->em->persist($account);
        $this->em->flush();
        return $account;
    }

    public function addLoyaltyPoints(Customer $customer, int $points, ?string $reason = null): LoyaltyEvent
    {
        if ($points <= 0) {
            throw new BadRequestHttpException('Le nombre de points a ajouter doit etre positif.');
        }

        $account = $this->ensureLoyaltyAccount($customer);
        $newBalance = $account->getPointsBalance() + $points;
        $account->setPointsBalance($newBalance)->touch();

        $event = (new LoyaltyEvent())
            ->setCustomer($customer)
            ->setAccount($account)
            ->setEventType(LoyaltyEvent::TYPE_EARN)
            ->setPointsDelta($points)
            ->setBalanceAfter($newBalance)
            ->setReason($reason);

        $this->em->persist($event);
        $this->em->flush();

        return $event;
    }

    public function redeemLoyaltyPoints(Customer $customer, int $points, ?string $reason = null): LoyaltyEvent
    {
        if ($points <= 0) {
            throw new BadRequestHttpException('Le nombre de points a consommer doit etre positif.');
        }
        $account = $this->ensureLoyaltyAccount($customer);
        if ($account->getPointsBalance() < $points) {
            throw new BadRequestHttpException('Solde de points insuffisant.');
        }

        $newBalance = $account->getPointsBalance() - $points;
        $account->setPointsBalance($newBalance)->touch();

        $event = (new LoyaltyEvent())
            ->setCustomer($customer)
            ->setAccount($account)
            ->setEventType(LoyaltyEvent::TYPE_REDEEM)
            ->setPointsDelta(-$points)
            ->setBalanceAfter($newBalance)
            ->setReason($reason);

        $this->em->persist($event);
        $this->em->flush();
        return $event;
    }

    public function createGiftVoucher(float $amount, ?Customer $customer = null, ?\DateTimeImmutable $expiresAt = null): GiftVoucher
    {
        if ($amount <= 0) {
            throw new BadRequestHttpException('Le montant initial du bon cadeau doit etre positif.');
        }

        $voucher = (new GiftVoucher())
            ->setCode('GV-' . strtoupper(bin2hex(random_bytes(4))))
            ->setCustomer($customer)
            ->setInitialAmount(number_format($amount, 2, '.', ''))
            ->setBalanceAmount(number_format($amount, 2, '.', ''))
            ->setStatus(GiftVoucher::STATUS_ACTIVE)
            ->setExpiresAt($expiresAt);

        $this->em->persist($voucher);
        $this->em->flush();
        return $voucher;
    }

    public function consumeGiftVoucher(GiftVoucher $voucher, float $amount): GiftVoucher
    {
        if ($voucher->getStatus() !== GiftVoucher::STATUS_ACTIVE) {
            throw new BadRequestHttpException('Ce bon cadeau ne peut pas etre utilise dans son etat actuel.');
        }
        if ($voucher->getExpiresAt() && $voucher->getExpiresAt() < new \DateTimeImmutable()) {
            $voucher->setStatus(GiftVoucher::STATUS_EXPIRED)->touch();
            $this->em->flush();
            throw new BadRequestHttpException('Ce bon cadeau est expire.');
        }
        if ($amount <= 0) {
            throw new BadRequestHttpException('Le montant de consommation doit etre positif.');
        }

        $balance = (float) $voucher->getBalanceAmount();
        if ($amount > $balance) {
            throw new BadRequestHttpException('Le montant depasse le solde du bon cadeau.');
        }

        $newBalance = $balance - $amount;
        $voucher->setBalanceAmount(number_format($newBalance, 2, '.', ''));
        if ($newBalance <= 0.0001) {
            $voucher->setStatus(GiftVoucher::STATUS_REDEEMED);
        }
        $voucher->touch();
        $this->em->flush();

        return $voucher;
    }

    public function launchCampaign(Campaign $campaign): Campaign
    {
        if (!in_array($campaign->getStatus(), [Campaign::STATUS_DRAFT, Campaign::STATUS_RUNNING], true)) {
            throw new BadRequestHttpException('Cette campagne ne peut pas etre relancee.');
        }

        $customers = $this->resolveCampaignTargets($campaign->getSegment());
        $campaign->setStatus(Campaign::STATUS_RUNNING);
        $campaign->setTargetCount(count($customers));

        $sent = 0;
        $failed = 0;

        foreach ($customers as $customer) {
            // En MVP on simule l'envoi et on journalise tout; l'integration provider viendra ensuite.
            $ok = true;
            $log = (new NotificationLog())
                ->setKind('campaign')
                ->setChannel($campaign->getChannel())
                ->setCampaign($campaign)
                ->setCustomer($customer)
                ->setPayload([
                    'message' => $campaign->getMessageTemplate(),
                    'segment' => $campaign->getSegment(),
                ])
                ->setStatus($ok ? NotificationLog::STATUS_SENT : NotificationLog::STATUS_FAILED)
                ->setErrorMessage($ok ? null : 'Provider indisponible');
            $this->em->persist($log);
            $ok ? $sent++ : $failed++;
        }

        $campaign
            ->setSentCount($sent)
            ->setFailedCount($failed)
            ->setStatus(Campaign::STATUS_COMPLETED)
            ->touch();
        $this->em->flush();

        return $campaign;
    }

    public function runScheduledReminders(): int
    {
        $rules = $this->em->getRepository(ReminderRule::class)->findBy(['isActive' => true]);
        if ($rules === []) {
            return 0;
        }

        $now = new \DateTimeImmutable();
        $sent = 0;

        foreach ($rules as $rule) {
            $targetHour = $now->modify(sprintf('+%d hours', $rule->getOffsetHours()));
            $from = $targetHour->setTime((int) $targetHour->format('H'), 0, 0);
            $to = $from->modify('+1 hour');

            $appointments = $this->em->getRepository(Appointment::class)->createQueryBuilder('a')
                ->where('a.startAt >= :from')
                ->andWhere('a.startAt < :to')
                ->andWhere('a.status = :status')
                ->andWhere('a.customer IS NOT NULL')
                ->setParameter('from', $from)
                ->setParameter('to', $to)
                ->setParameter('status', Appointment::STATUS_SCHEDULED)
                ->getQuery()
                ->getResult();

            foreach ($appointments as $appointment) {
                /** @var Appointment $appointment */
                $already = $this->em->getRepository(NotificationLog::class)->findOneBy([
                    'kind' => 'appointment_reminder',
                    'channel' => $rule->getChannel(),
                    'appointment' => $appointment,
                ]);
                if ($already) {
                    continue;
                }

                $log = (new NotificationLog())
                    ->setKind('appointment_reminder')
                    ->setChannel($rule->getChannel())
                    ->setCustomer($appointment->getCustomer())
                    ->setAppointment($appointment)
                    ->setStatus(NotificationLog::STATUS_SENT)
                    ->setPayload([
                        'rule' => $rule->getName(),
                        'offsetHours' => $rule->getOffsetHours(),
                        'appointmentStartAt' => $appointment->getStartAt()->format(DATE_ATOM),
                    ]);
                $this->em->persist($log);
                $sent++;
            }
        }

        $this->em->flush();
        return $sent;
    }

    /**
     * @return Customer[]
     */
    private function resolveCampaignTargets(array $segment): array
    {
        $qb = $this->em->getRepository(Customer::class)->createQueryBuilder('c');
        $minPoints = isset($segment['minPoints']) ? (int) $segment['minPoints'] : null;

        if ($minPoints !== null) {
            $qb->leftJoin(LoyaltyAccount::class, 'la', 'ON', 'la.customer = c')
                ->andWhere('la.pointsBalance >= :minPoints')
                ->setParameter('minPoints', $minPoints);
        }

        return $qb->getQuery()->getResult();
    }
}
