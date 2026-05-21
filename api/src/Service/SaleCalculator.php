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
        $discountTotal = 0.0;
        $taxableNetTotal = 0.0;
        $computedLines = [];

        foreach ($lines as $line) {
            $unitPrice = round($line['unitPrice'], 2);
            $quantity = round($line['quantity'], 2);
            $lineDiscount = max(0.0, (float) ($line['discountAmount'] ?? 0.0));
            $taxRate = max(0.0, (float) ($line['taxRate'] ?? 0.0));

            $rawLine = round($unitPrice * $quantity, 2);
            $subTotal += $rawLine;
            $discountTotal += $lineDiscount;

            // Protect the line total against incoherent discounts so the sale never goes negative.
            $lineNetBeforeGlobalDiscount = max(0.0, round($rawLine - $lineDiscount, 2));
            $taxableNetTotal += $lineNetBeforeGlobalDiscount;

            $computedLines[] = [
                'rawLine' => $rawLine,
                'lineNet' => $lineNetBeforeGlobalDiscount,
                'taxRate' => $taxRate,
            ];
        }

        $appliedGlobalDiscount = min(max(0.0, round($globalDiscount, 2)), round($taxableNetTotal, 2));
        $discountTotal += $appliedGlobalDiscount;

        $taxTotal = 0.0;
        $total = 0.0;
        $distributedGlobalDiscount = 0.0;
        $lineCount = count($computedLines);

        foreach ($computedLines as $index => &$computedLine) {
            $remainingDiscount = round($appliedGlobalDiscount - $distributedGlobalDiscount, 2);
            $lineGlobalDiscount = 0.0;

            if ($remainingDiscount > 0.0 && $taxableNetTotal > 0.0) {
                if ($index === $lineCount - 1) {
                    $lineGlobalDiscount = $remainingDiscount;
                } else {
                    $lineGlobalDiscount = min(
                        $computedLine['lineNet'],
                        round($appliedGlobalDiscount * ($computedLine['lineNet'] / $taxableNetTotal), 2)
                    );
                }
            }

            $distributedGlobalDiscount += $lineGlobalDiscount;
            $lineNet = max(0.0, round($computedLine['lineNet'] - $lineGlobalDiscount, 2));
            $lineTax = round($lineNet * ($computedLine['taxRate'] / 100), 2);
            $lineTotal = round($lineNet + $lineTax, 2);

            $computedLine['globalDiscountAmount'] = round($lineGlobalDiscount, 2);
            $computedLine['lineNet'] = $lineNet;
            $computedLine['lineTax'] = $lineTax;
            $computedLine['lineTotal'] = $lineTotal;

            $taxTotal += $lineTax;
            $total += $lineTotal;
        }
        unset($computedLine);

        return [
            'subTotal' => round($subTotal, 2),
            'discountTotal' => round($discountTotal, 2),
            'taxTotal' => round($taxTotal, 2),
            'total' => round($total, 2),
            'lines' => $computedLines,
        ];
    }
}
