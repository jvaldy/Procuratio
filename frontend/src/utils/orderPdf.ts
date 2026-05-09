import type { Order } from '../types/ecommerce';
import { formatDateTime, formatEuro, formatOrderStatus } from './pricing';

function sanitizePdfText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function toPdfBytes(parts: string[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks = parts.map((part) => encoder.encode(part));
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });

  return merged;
}

function buildPdfBlob(lines: string[]): Blob {
  const contentStream = [
    'BT',
    '/F1 12 Tf',
    '40 800 Td',
    ...lines.flatMap((line, index) => {
      const printable = sanitizePdfText(line);
      return index === 0 ? [`(${printable}) Tj`] : ['0 -16 Td', `(${printable}) Tj`];
    }),
    'ET',
  ].join('\n');

  const encoder = new TextEncoder();
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj\n',
    `4 0 obj << /Length ${encoder.encode(contentStream).length} >> stream\n${contentStream}\nendstream endobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
  ];

  const header = '%PDF-1.4\n';
  let body = header;
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(encoder.encode(body).length);
    body += object;
  });

  const xrefOffset = encoder.encode(body).length;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = toPdfBytes([body, xref]);
  const blobPart = bytes as unknown as ArrayBufferView<ArrayBuffer>;
  return new Blob([blobPart], { type: 'application/pdf' });
}

export function downloadOrderPdf(order: Order): void {
  const customerName = order.pickupInStore
    ? 'In-store pickup customer'
    : order.deliveryAddress.fullName || 'Online customer';

  const lines = [
    'PROCURATIO - SALES RECEIPT',
    'Salon address: 15 Rue des Jasmins, 75011 Paris, France',
    'Phone: +33 1 80 80 28 00',
    '------------------------------------------------------------',
    `Receipt number: ${order.orderNumber}`,
    `Order status: ${formatOrderStatus(order.status)}`,
    `Created at: ${formatDateTime(order.createdAt)}`,
    `Customer: ${customerName}`,
    `Fulfilment: ${order.pickupInStore ? 'Store pickup' : 'Delivery'}`,
  ];

  if (order.pickupInStore) {
    lines.push(`Pickup slot: ${formatDateTime(order.pickupSlot)}`);
    if (order.pickupNote) {
      lines.push(`Pickup note: ${order.pickupNote}`);
    }
  } else if (order.deliveryAddress.line1) {
    lines.push('Delivery address:');
    lines.push(`${order.deliveryAddress.line1}`);
    if (order.deliveryAddress.line2) {
      lines.push(order.deliveryAddress.line2);
    }
    lines.push(`${order.deliveryAddress.postalCode ?? ''} ${order.deliveryAddress.city ?? ''}`.trim());
    lines.push(order.deliveryAddress.country ?? '');
    if (order.deliveryAddress.instructions) {
      lines.push(`Delivery instructions: ${order.deliveryAddress.instructions}`);
    }
  }

  lines.push('------------------------------------------------------------');
  lines.push('Items');
  order.items.forEach((item) => {
    lines.push(`${item.productName} x${item.quantity}`);
    lines.push(`  Unit price excl. VAT: ${formatEuro(item.unitPrice)} | Line total incl. VAT: ${formatEuro(item.lineTotal)}`);
  });
  lines.push('------------------------------------------------------------');
  lines.push(`Subtotal excl. VAT: ${formatEuro(order.subTotal)}`);
  lines.push(`VAT: ${formatEuro(order.taxTotal)}`);
  if (order.giftVoucher && order.giftVoucherAmount > 0) {
    lines.push(`Gift voucher ${order.giftVoucher.code}: -${formatEuro(order.giftVoucherAmount)}`);
  }
  lines.push(`Total incl. VAT: ${formatEuro(order.total)}`);
  lines.push('------------------------------------------------------------');
  lines.push('Thank you for shopping with Procuratio.');

  const blob = buildPdfBlob(lines.filter(Boolean));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${order.orderNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
