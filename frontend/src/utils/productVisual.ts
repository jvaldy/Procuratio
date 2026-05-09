import type { CatalogProduct } from '../types/ecommerce';

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const productImageMap: Record<string, string> = {
  'PROD-1001': 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=1200&q=80',
  'PROD-1002': 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80',
  'PROD-1003': 'https://images.unsplash.com/photo-1620331311520-246422fd82f9?auto=format&fit=crop&w=1200&q=80',
  'PROD-1004': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
  'PROD-1005': 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=1200&q=80',
  'PROD-1006': 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80',
  'PROD-1007': 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?auto=format&fit=crop&w=1200&q=80',
  'PROD-1008': 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=1200&q=80',
  'PROD-1009': 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=1200&q=80',
  'PROD-1010': 'https://images.unsplash.com/photo-1585232350875-589d4c1dded8?auto=format&fit=crop&w=1200&q=80',
  'PROD-1011': 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=80',
  'PROD-1012': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1200&q=80',
};

const defaultProductImage = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#f2f5ff"/>
        <stop offset="100%" stop-color="#dfe8ff"/>
      </linearGradient>
    </defs>
    <rect width="640" height="480" rx="36" fill="url(#bg)"/>
    <rect x="238" y="106" width="164" height="232" rx="36" fill="#ffffff" stroke="#d9e2ff" stroke-width="6"/>
    <rect x="276" y="74" width="88" height="58" rx="18" fill="#5b57ff" opacity="0.9"/>
    <circle cx="320" cy="206" r="46" fill="#eef2ff"/>
    <path d="M296 206c0-13 11-24 24-24s24 11 24 24-11 24-24 24-24-11-24-24Z" fill="#5b57ff" opacity="0.16"/>
    <rect x="278" y="276" width="84" height="12" rx="6" fill="#cfd8ff"/>
    <rect x="262" y="304" width="116" height="12" rx="6" fill="#dce5ff"/>
    <text x="320" y="392" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="24" font-weight="800" fill="#293c72">Product image</text>
    <text x="320" y="424" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="18" font-weight="600" fill="#7383ab">Default visual</text>
  </svg>
`);

export function productImageUrl(product: CatalogProduct): string {
  if (product.imageUrl) {
    return product.imageUrl;
  }

  if (productImageMap[product.sku]) {
    return productImageMap[product.sku];
  }

  return defaultProductImage;
}
