import type { PosItemPayload, Sale } from '../../../types/pos';
import { formatEuro } from '../../../utils/pricing';

export type DraftLine = PosItemPayload & {
  name: string;
  unitPrice: number;
};

export type CatalogEntry = {
  id: number;
  type: 'product' | 'service';
  name: string;
  price: number;
  stock: number | null;
  isAvailable: boolean;
  imageUrl: string | null;
  subtitle: string;
  imageMode: 'cover' | 'contain';
};

export type CurrentLine = {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  lineTotal: number;
};

export type SaleDiscountBreakdown = {
  lineDiscountExclVat: number;
  globalDiscountExclVat: number;
  globalDiscountPct: number;
  totalDiscountInclVat: number;
};

export function servicePreviewImage(name: string): string {
  const label = name.slice(0, 18).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#eef7ff"/>
          <stop offset="100%" stop-color="#dff5f6"/>
        </linearGradient>
      </defs>
      <rect width="240" height="160" rx="20" fill="url(#g)"/>
      <circle cx="72" cy="78" r="34" fill="#ffffff" opacity="0.95"/>
      <circle cx="72" cy="78" r="16" fill="#22bcce" opacity="0.35"/>
      <rect x="122" y="52" width="70" height="14" rx="7" fill="#ffffff" opacity="0.95"/>
      <rect x="122" y="74" width="54" height="10" rx="5" fill="#ffffff" opacity="0.8"/>
      <rect x="122" y="92" width="62" height="10" rx="5" fill="#ffffff" opacity="0.68"/>
      <text x="20" y="142" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="800" fill="#28708a">SERVICE</text>
      <text x="220" y="142" text-anchor="end" font-family="Manrope, Arial, sans-serif" font-size="11" font-weight="700" fill="#28708a" opacity="0.8">${label}</text>
    </svg>
  `)}`;
}

export function formatPosCurrency(value: number): string {
  return formatEuro(value);
}

export function paymentMethodLabel(method: string): string {
  return method === 'card' ? 'Card' : 'Cash';
}

export function formatPercentageInput(value: number): string {
  const rounded = roundCurrency(Math.max(0, value));

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

export function sellerLabel(sale: Sale | null): string {
  if (!sale?.seller?.email) {
    return 'Unknown seller';
  }

  const localPart = sale.seller.email.split('@')[0] ?? sale.seller.email;

  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function computeDraftTotals(lines: DraftLine[], globalDiscountPctTtc: number) {
  const normalizedLines = lines.map((line) => {
    const rawLine = roundCurrency(line.unitPrice * line.quantity);
    const taxRate = Math.max(0, line.taxRate ?? 0);
    const rawLineInclVat = priceInclTax(rawLine, taxRate);
    const lineDiscountInclVat = roundCurrency(Math.min(rawLineInclVat, Math.max(0, line.discountAmount ?? 0)));
    const lineTotalInclVat = roundCurrency(Math.max(0, rawLineInclVat - lineDiscountInclVat));
    const lineNet = roundCurrency(lineTotalInclVat / (1 + (taxRate / 100)));
    const lineTax = roundCurrency(lineTotalInclVat - lineNet);

    return {
      rawLine,
      lineDiscountInclVat,
      lineNet,
      taxRate,
      lineTax,
      lineTotalInclVat,
    };
  });

  const subTotal = roundCurrency(normalizedLines.reduce((sum, line) => sum + line.rawLine, 0));
  const lineDiscountTotal = roundCurrency(normalizedLines.reduce((sum, line) => sum + line.lineDiscountInclVat, 0));
  const netTotalBeforeGlobalDiscount = roundCurrency(normalizedLines.reduce((sum, line) => sum + line.lineNet, 0));
  const totalInclVatBeforeGlobalDiscount = roundCurrency(normalizedLines.reduce((sum, line) => sum + line.lineTotalInclVat, 0));
  const appliedGlobalDiscountPct = Math.max(0, globalDiscountPctTtc);
  const globalDiscountInclVat = roundCurrency(totalInclVatBeforeGlobalDiscount * (appliedGlobalDiscountPct / 100));
  const effectiveTaxRate = netTotalBeforeGlobalDiscount > 0
    ? normalizedLines.reduce((sum, line) => sum + line.lineTax, 0) / netTotalBeforeGlobalDiscount
    : 0;
  const globalDiscountExclVat = roundCurrency(globalDiscountInclVat / (1 + effectiveTaxRate));
  const cappedGlobalDiscountExclVat = Math.min(netTotalBeforeGlobalDiscount, globalDiscountExclVat);

  let distributedDiscount = 0;
  let taxTotal = 0;
  let total = 0;

  normalizedLines.forEach((line, index) => {
    const remainingDiscount = roundCurrency(cappedGlobalDiscountExclVat - distributedDiscount);
    let lineGlobalDiscount = 0;

    if (remainingDiscount > 0 && netTotalBeforeGlobalDiscount > 0) {
      if (index === normalizedLines.length - 1) {
        lineGlobalDiscount = remainingDiscount;
      } else {
        lineGlobalDiscount = Math.min(
          line.lineNet,
          roundCurrency(cappedGlobalDiscountExclVat * (line.lineNet / netTotalBeforeGlobalDiscount)),
        );
      }
    }

    distributedDiscount = roundCurrency(distributedDiscount + lineGlobalDiscount);
    const lineNetAfterGlobalDiscount = roundCurrency(Math.max(0, line.lineNet - lineGlobalDiscount));
    const lineTaxAfterGlobalDiscount = roundCurrency(lineNetAfterGlobalDiscount * (line.taxRate / 100));
    const lineTotalAfterGlobalDiscount = roundCurrency(lineNetAfterGlobalDiscount + lineTaxAfterGlobalDiscount);

    taxTotal = roundCurrency(taxTotal + lineTaxAfterGlobalDiscount);
    total = roundCurrency(total + lineTotalAfterGlobalDiscount);
  });

  return {
    subTotal,
    discountTotal: roundCurrency(lineDiscountTotal + globalDiscountInclVat),
    taxTotal,
    total,
    globalDiscountExclVat: cappedGlobalDiscountExclVat,
    globalDiscountInclVat,
  };
}

export function summarizeSaleDiscounts(sale: Sale | null): SaleDiscountBreakdown {
  if (!sale) {
    return {
      lineDiscountExclVat: 0,
      globalDiscountExclVat: 0,
      globalDiscountPct: 0,
      totalDiscountInclVat: 0,
    };
  }

  const lineDiscountExclVat = roundCurrency(
    sale.items.reduce((sum, item) => sum + Number(item.discountAmount), 0),
  );
  const totalGrossInclVat = roundCurrency(
    sale.items.reduce(
      (sum, item) => sum + priceInclTax(Number(item.unitPrice) * Number(item.quantity), Number(item.taxRate)),
      0,
    ),
  );
  const globalDiscountExclVat = roundCurrency(Math.max(0, Number(sale.discountTotal) - lineDiscountExclVat));
  const taxableBaseAfterLineDiscount = roundCurrency(Math.max(0, Number(sale.subTotal) - lineDiscountExclVat));
  const globalDiscountPct = taxableBaseAfterLineDiscount > 0
    ? roundCurrency((globalDiscountExclVat / taxableBaseAfterLineDiscount) * 100)
    : 0;
  const totalDiscountInclVat = roundCurrency(Math.max(0, totalGrossInclVat - Number(sale.total)));

  return {
    lineDiscountExclVat,
    globalDiscountExclVat,
    globalDiscountPct,
    totalDiscountInclVat,
  };
}

export function priceInclTax(amount: number, taxRate: number): number {
  const safeAmount = Math.max(0, amount);
  const safeRate = Math.max(0, taxRate);

  return Math.round((safeAmount * (1 + (safeRate / 100))) * 100) / 100;
}

export function priceExclTax(amountInclVat: number, taxRate: number): number {
  const safeAmount = Math.max(0, amountInclVat);
  const safeRate = Math.max(0, taxRate);

  return roundCurrency(safeAmount / (1 + (safeRate / 100)));
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function mapSaleToDraftLines(sale: Sale | null): DraftLine[] {
  if (!sale) {
    return [];
  }

  return sale.items.map((item) => ({
    itemType: item.itemType,
    itemId: item.itemId,
    quantity: item.quantity,
    discountAmount: priceInclTax(item.discountAmount, item.taxRate),
    taxRate: item.taxRate,
    name: item.label,
    unitPrice: item.unitPrice,
  }));
}
