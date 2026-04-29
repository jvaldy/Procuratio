<?php

namespace App\Service;

class SaleCalculator
{
    /**
     * @param array<int, array{unitPrice: float, quantity: float, discountAmount?: float, taxRate?: float}> $lines
     * @return array{subTotal: float, discountTotal: float, taxTotal: float, total: float, lines: array<int, array<string, float>>}
     */
    public function compute(array $lines, float $globalDiscount = 0.0): array
    {
        $subTotal = 0.0;
        $discountTotal = max(0.0, $globalDiscount);
        $taxTotal = 0.0;
        $computedLines = [];

        foreach ($lines as $line) {
            $unitPrice = round($line['unitPrice'], 2);
            $quantity = round($line['quantity'], 2);
            $lineDiscount = max(0.0, (float) ($line['discountAmount'] ?? 0.0));
            $taxRate = max(0.0, (float) ($line['taxRate'] ?? 0.0));

            $rawLine = round($unitPrice * $quantity, 2);
            $subTotal += $rawLine;
            $discountTotal += $lineDiscount;

            // On protège le total de ligne contre les remises incohérentes pour éviter un ticket négatif.
            $lineNet = max(0.0, round($rawLine - $lineDiscount, 2));
            $lineTax = round($lineNet * ($taxRate / 100), 2);
            $lineTotal = round($lineNet + $lineTax, 2);
            $taxTotal += $lineTax;

            $computedLines[] = [
                'rawLine' => $rawLine,
                'lineNet' => $lineNet,
                'lineTax' => $lineTax,
                'lineTotal' => $lineTotal,
            ];
        }

        $total = max(0.0, round(($subTotal - $discountTotal) + $taxTotal, 2));

        return [
            'subTotal' => round($subTotal, 2),
            'discountTotal' => round($discountTotal, 2),
            'taxTotal' => round($taxTotal, 2),
            'total' => $total,
            'lines' => $computedLines,
        ];
    }
}

