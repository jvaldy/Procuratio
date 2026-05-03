<?php

namespace App\Service;

use App\Entity\GiftVoucher;

class GiftVoucherDocumentService
{
    public function buildPrintableHtml(GiftVoucher $voucher, ?string $recipientName = null, ?string $purchaserName = null): string
    {
        $recipient = $recipientName ?: 'Destinataire';
        $purchaser = $purchaserName ?: 'Acheteur';
        $expiresAt = $voucher->getExpiresAt()?->format('d/m/Y') ?? 'Sans date limite';

        return sprintf(
            '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bon cadeau %s</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1f2a44}.card{border:2px solid #4a45ff;border-radius:16px;padding:20px;max-width:640px}.k{color:#667;display:block;margin-top:10px}.v{font-size:20px;font-weight:700}</style></head><body><div class="card"><h1>Bon cadeau Procuratio</h1><span class="k">Code</span><div class="v">%s</div><span class="k">Montant initial</span><div class="v">%0.2f EUR</div><span class="k">Solde actuel</span><div class="v">%0.2f EUR</div><span class="k">Bénéficiaire</span><div>%s</div><span class="k">Acheteur</span><div>%s</div><span class="k">Validité</span><div>%s</div></div></body></html>',
            $voucher->getCode(),
            $voucher->getCode(),
            (float) $voucher->getInitialAmount(),
            (float) $voucher->getBalanceAmount(),
            htmlspecialchars($recipient, ENT_QUOTES),
            htmlspecialchars($purchaser, ENT_QUOTES),
            $expiresAt,
        );
    }
}

