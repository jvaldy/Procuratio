<?php

namespace App\Service;

use App\Entity\Store;
use Doctrine\DBAL\Connection;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class StatsService
{
    public function __construct(private readonly Connection $connection)
    {
    }

    /**
     * @return array{from:\DateTimeImmutable,to:\DateTimeImmutable,granularity:string}
     */
    public function resolvePeriod(?string $fromRaw, ?string $toRaw, ?string $granularityRaw): array
    {
        $granularity = $granularityRaw ?: 'day';
        if (!in_array($granularity, ['day', 'week', 'month'], true)) {
            throw new BadRequestHttpException('granularity invalide. Valeurs autorisees: day, week, month.');
        }

        $today = new \DateTimeImmutable('today');
        $from = $fromRaw ? new \DateTimeImmutable($fromRaw) : $today->modify('first day of this month');
        $to = $toRaw ? new \DateTimeImmutable($toRaw) : $today->modify('last day of this month');

        $from = $from->setTime(0, 0, 0);
        $to = $to->setTime(23, 59, 59);

        if ($from > $to) {
            throw new BadRequestHttpException('La date de debut doit etre inferieure a la date de fin.');
        }

        return ['from' => $from, 'to' => $to, 'granularity' => $granularity];
    }

    /**
     * @return array<string,mixed>
     */
    public function overview(\DateTimeImmutable $from, \DateTimeImmutable $to, ?Store $store = null): array
    {
        $pos = $this->loadPosOverview($from, $to, $store);
        $ecommerce = $this->loadEcommerceOverview($from, $to, $store);
        $items = $this->loadItemBreakdown($from, $to, $store);

        $revenuePos = (float) ($pos['revenue'] ?? 0);
        $revenueEcommerce = (float) ($ecommerce['revenue'] ?? 0);
        $taxPos = (float) ($pos['tax'] ?? 0);
        $taxEcommerce = (float) ($ecommerce['tax'] ?? 0);
        $salesPaid = (int) ($pos['count'] ?? 0);
        $ordersPaid = (int) ($ecommerce['count'] ?? 0);
        $totalTransactions = $salesPaid + $ordersPaid;
        $revenueTotal = $revenuePos + $revenueEcommerce;

        // Estimated profit stays simple here because line-level purchase costs are not reliable yet.
        $profitEstimate = $revenueTotal - ($taxPos + $taxEcommerce);

        return [
            'revenueTotal' => round($revenueTotal, 2),
            'revenuePos' => round($revenuePos, 2),
            'revenueEcommerce' => round($revenueEcommerce, 2),
            'taxTotal' => round($taxPos + $taxEcommerce, 2),
            'profitEstimate' => round($profitEstimate, 2),
            'salesPaidCount' => $salesPaid,
            'ordersPaidCount' => $ordersPaid,
            'avgBasket' => $totalTransactions > 0 ? round($revenueTotal / $totalTransactions, 2) : 0.0,
            'productsSoldQty' => round((float) ($items['products_qty'] ?? 0), 2),
            'servicesSoldQty' => round((float) ($items['services_qty'] ?? 0), 2),
        ];
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function timeSeries(\DateTimeImmutable $from, \DateTimeImmutable $to, string $granularity, ?Store $store = null): array
    {
        $bucketExpression = match ($granularity) {
            'week' => "DATE_FORMAT(day_bucket, '%x-W%v')",
            'month' => "DATE_FORMAT(day_bucket, '%Y-%m')",
            default => "DATE_FORMAT(day_bucket, '%Y-%m-%d')",
        };

        $sql = <<<SQL
WITH daily_rows AS (
  SELECT
    DATE(s.created_at) AS day_bucket,
    SUM(CAST(s.total AS DECIMAL(12,2))) AS revenue,
    COUNT(*) AS sales_count,
    0 AS orders_count,
    SUM(CASE WHEN si.item_type = 'product' THEN CAST(si.quantity AS DECIMAL(12,2)) ELSE 0 END) AS products_qty,
    SUM(CASE WHEN si.item_type = 'service' THEN CAST(si.quantity AS DECIMAL(12,2)) ELSE 0 END) AS services_qty
  FROM sales s
  LEFT JOIN sale_items si ON si.sale_id = s.id
  WHERE s.payment_status = 'paid' AND s.created_at BETWEEN :from AND :to
    AND (:storeId IS NULL OR s.store_id = :storeId)
  GROUP BY DATE(s.created_at)

  UNION ALL

  SELECT
    DATE(o.created_at) AS day_bucket,
    SUM(CAST(o.total AS DECIMAL(12,2))) AS revenue,
    0 AS sales_count,
    COUNT(*) AS orders_count,
    SUM(CAST(oi.quantity AS DECIMAL(12,2))) AS products_qty,
    0 AS services_qty
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status IN ('paid', 'ready_for_pickup') AND o.created_at BETWEEN :from AND :to
    AND (:storeId IS NULL OR o.store_id = :storeId)
  GROUP BY DATE(o.created_at)
)
SELECT
  {$bucketExpression} AS bucket,
  SUM(revenue) AS revenue,
  SUM(sales_count) AS salesCount,
  SUM(orders_count) AS ordersCount,
  SUM(products_qty) AS productsQty,
  SUM(services_qty) AS servicesQty
FROM daily_rows
GROUP BY bucket
ORDER BY bucket ASC
SQL;

        $rows = $this->connection->executeQuery($sql, [
            'from' => $from->format('Y-m-d H:i:s'),
            'to' => $to->format('Y-m-d H:i:s'),
            'storeId' => $store?->getId(),
        ])->fetchAllAssociative();

        return array_map(static fn(array $row): array => [
            'bucket' => (string) ($row['bucket'] ?? ''),
            'revenue' => round((float) ($row['revenue'] ?? 0), 2),
            'salesCount' => (int) ($row['salesCount'] ?? 0),
            'ordersCount' => (int) ($row['ordersCount'] ?? 0),
            'productsQty' => round((float) ($row['productsQty'] ?? 0), 2),
            'servicesQty' => round((float) ($row['servicesQty'] ?? 0), 2),
        ], $rows);
    }

    /**
     * @return array<string,mixed>
     */
    private function loadPosOverview(\DateTimeImmutable $from, \DateTimeImmutable $to, ?Store $store = null): array
    {
        return $this->connection->executeQuery(
            "SELECT COUNT(*) AS count, COALESCE(SUM(CAST(total AS DECIMAL(12,2))), 0) AS revenue, COALESCE(SUM(CAST(tax_total AS DECIMAL(12,2))), 0) AS tax
            FROM sales
            WHERE payment_status = 'paid' AND created_at BETWEEN :from AND :to
              AND (:storeId IS NULL OR store_id = :storeId)",
            ['from' => $from->format('Y-m-d H:i:s'), 'to' => $to->format('Y-m-d H:i:s'), 'storeId' => $store?->getId()]
        )->fetchAssociative() ?: [];
    }

    /**
     * @return array<string,mixed>
     */
    private function loadEcommerceOverview(\DateTimeImmutable $from, \DateTimeImmutable $to, ?Store $store = null): array
    {
        return $this->connection->executeQuery(
            "SELECT COUNT(*) AS count, COALESCE(SUM(CAST(total AS DECIMAL(12,2))), 0) AS revenue, COALESCE(SUM(CAST(tax_total AS DECIMAL(12,2))), 0) AS tax
            FROM orders
            WHERE status IN ('paid', 'ready_for_pickup') AND created_at BETWEEN :from AND :to
              AND (:storeId IS NULL OR store_id = :storeId)",
            ['from' => $from->format('Y-m-d H:i:s'), 'to' => $to->format('Y-m-d H:i:s'), 'storeId' => $store?->getId()]
        )->fetchAssociative() ?: [];
    }

    /**
     * @return array<string,mixed>
     */
    private function loadItemBreakdown(\DateTimeImmutable $from, \DateTimeImmutable $to, ?Store $store = null): array
    {
        return $this->connection->executeQuery(
            "SELECT
              COALESCE(SUM(CASE WHEN si.item_type = 'product' THEN CAST(si.quantity AS DECIMAL(12,2)) ELSE 0 END), 0) AS products_qty,
              COALESCE(SUM(CASE WHEN si.item_type = 'service' THEN CAST(si.quantity AS DECIMAL(12,2)) ELSE 0 END), 0) AS services_qty
            FROM sales s
            INNER JOIN sale_items si ON si.sale_id = s.id
            WHERE s.payment_status = 'paid' AND s.created_at BETWEEN :from AND :to
              AND (:storeId IS NULL OR s.store_id = :storeId)",
            ['from' => $from->format('Y-m-d H:i:s'), 'to' => $to->format('Y-m-d H:i:s'), 'storeId' => $store?->getId()]
        )->fetchAssociative() ?: [];
    }
}
