export const VAT_RATE = 0.2;

export function toVatAmount(amountExVat: number): number {
  return roundPrice(amountExVat * VAT_RATE);
}

export function toPriceInclVat(amountExVat: number): number {
  return roundPrice(amountExVat + toVatAmount(amountExVat));
}

export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRole(role: string): string {
  return role
    .replace('ROLE_', '')
    .toLowerCase()
    .replace(/(^|_)([a-z])/g, (_, prefix: string, letter: string) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`);
}

export function formatOrderStatus(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Not scheduled yet';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDateOnly(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function truncateText(value: string | null | undefined, maxLength: number): string {
  if (!value) {
    return '';
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
