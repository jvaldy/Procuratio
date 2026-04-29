<?php

namespace App\Tests\Service;

use App\Service\SaleCalculator;
use PHPUnit\Framework\TestCase;

class SaleCalculatorTest extends TestCase
{
    public function testComputeTotalsWithTaxAndDiscount(): void
    {
        $calculator = new SaleCalculator();

        $result = $calculator->compute([
            ['unitPrice' => 10.0, 'quantity' => 2, 'discountAmount' => 1.0, 'taxRate' => 20.0],
            ['unitPrice' => 5.0, 'quantity' => 1, 'discountAmount' => 0.0, 'taxRate' => 10.0],
        ], 2.0);

        self::assertSame(25.0, $result['subTotal']);
        self::assertSame(3.0, $result['discountTotal']);
        self::assertSame(4.3, $result['taxTotal']);
        self::assertSame(26.3, $result['total']);
    }
}

