import type { CatalogProduct } from '../types/ecommerce';

const DEFAULT_PRODUCT_IMAGE = '/images/products/default-product.png';

export function defaultProductImageUrl(): string {
  return DEFAULT_PRODUCT_IMAGE;
}

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initials(value: string, max = 2): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, max)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function shortName(name: string): string {
  const cleaned = name
    .replace(/^(Kérastase|L’Oréal Professionnel|Olaplex|Moroccanoil|Aveda|Redken|Davines|Caudalie|La Roche-Posay|Bioderma|Avène|Nuxe|CeraVe|Dyson|ghd|BaBylissPRO|FOREO|Tangle Teezer|Wet Brush|RefectoCil)\s+/u, '')
    .trim();

  return cleaned.length > 28 ? `${cleaned.slice(0, 25)}...` : cleaned;
}

function palette(category: string): { top: string; bottom: string; accent: string; panel: string; text: string } {
  const key = category.toLowerCase();
  if (key.includes('tool')) return { top: '#1d2847', bottom: '#0d1428', accent: '#78b7ff', panel: '#101a32', text: '#eef4ff' };
  if (key.includes('accessory')) return { top: '#402844', bottom: '#1a1430', accent: '#d0a7ff', panel: '#21173a', text: '#f4ebff' };
  if (key.includes('skin')) return { top: '#f6e6eb', bottom: '#eed4dc', accent: '#cc6f9a', panel: '#fff7fa', text: '#5a3150' };
  if (key.includes('wellness') || key.includes('gift')) return { top: '#efe5d5', bottom: '#e2d1b5', accent: '#b6814b', panel: '#fffaf2', text: '#5b422a' };
  if (key.includes('styling') || key.includes('color')) return { top: '#f3e7ff', bottom: '#e4d5ff', accent: '#8456ff', panel: '#faf5ff', text: '#442f79' };

  return { top: '#e7eefc', bottom: '#d9e5fb', accent: '#3a67d1', panel: '#f8fbff', text: '#24385f' };
}

function renderShape(category: string, accent: string): string {
  const key = category.toLowerCase();

  if (key.includes('tool')) {
    return `
      <g>
        <rect x="192" y="90" width="156" height="58" rx="26" fill="${accent}" opacity="0.95"/>
        <rect x="328" y="112" width="70" height="16" rx="8" fill="${accent}" opacity="0.65"/>
        <path d="M226 152h58c14 0 26 12 26 26v76c0 18-15 33-33 33h-44c-18 0-33-15-33-33v-70c0-18 12-32 26-32Z" fill="#ffffff"/>
        <rect x="255" y="282" width="24" height="82" rx="12" fill="#ffffff"/>
        <rect x="248" y="168" width="38" height="44" rx="16" fill="${accent}" opacity="0.14"/>
      </g>
    `;
  }

  if (key.includes('accessory')) {
    return `
      <g>
        <rect x="220" y="84" width="116" height="146" rx="52" fill="#ffffff"/>
        <rect x="269" y="220" width="18" height="126" rx="9" fill="#ffffff"/>
        <rect x="257" y="332" width="42" height="34" rx="16" fill="#ffffff"/>
        <g opacity="0.95">
          <rect x="232" y="92" width="8" height="54" rx="4" fill="${accent}"/>
          <rect x="246" y="90" width="8" height="62" rx="4" fill="${accent}"/>
          <rect x="260" y="88" width="8" height="68" rx="4" fill="${accent}"/>
          <rect x="274" y="88" width="8" height="68" rx="4" fill="${accent}"/>
          <rect x="288" y="90" width="8" height="62" rx="4" fill="${accent}"/>
          <rect x="302" y="92" width="8" height="54" rx="4" fill="${accent}"/>
          <rect x="316" y="96" width="8" height="46" rx="4" fill="${accent}"/>
        </g>
      </g>
    `;
  }

  if (key.includes('skin') || key.includes('wellness') || key.includes('gift')) {
    return `
      <g>
        <rect x="204" y="92" width="132" height="208" rx="24" fill="#ffffff"/>
        <rect x="236" y="72" width="68" height="38" rx="14" fill="${accent}" opacity="0.88"/>
        <rect x="226" y="150" width="88" height="16" rx="8" fill="${accent}" opacity="0.22"/>
        <rect x="226" y="180" width="92" height="12" rx="6" fill="${accent}" opacity="0.16"/>
        <rect x="226" y="204" width="74" height="12" rx="6" fill="${accent}" opacity="0.12"/>
        <circle cx="270" cy="258" r="20" fill="${accent}" opacity="0.16"/>
      </g>
    `;
  }

  if (key.includes('styling') || key.includes('color')) {
    return `
      <g>
        <rect x="216" y="98" width="108" height="196" rx="32" fill="#ffffff"/>
        <rect x="246" y="70" width="48" height="42" rx="12" fill="${accent}" opacity="0.92"/>
        <rect x="244" y="148" width="52" height="18" rx="9" fill="${accent}" opacity="0.22"/>
        <rect x="240" y="180" width="62" height="10" rx="5" fill="${accent}" opacity="0.12"/>
        <path d="M324 130h28c16 0 30 13 30 30v72c0 16-14 30-30 30h-28" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
      </g>
    `;
  }

  return `
    <g>
      <rect x="216" y="82" width="108" height="218" rx="36" fill="#ffffff"/>
      <rect x="246" y="56" width="48" height="42" rx="12" fill="${accent}" opacity="0.92"/>
      <rect x="238" y="154" width="64" height="16" rx="8" fill="${accent}" opacity="0.22"/>
      <rect x="234" y="182" width="72" height="12" rx="6" fill="${accent}" opacity="0.14"/>
      <rect x="240" y="206" width="58" height="12" rx="6" fill="${accent}" opacity="0.1"/>
      <circle cx="270" cy="258" r="20" fill="${accent}" opacity="0.14"/>
    </g>
  `;
}

export function generatedProductImageUrl(product: CatalogProduct): string {
  const category = product.category?.name ?? 'Product';
  const brand = product.brand?.name ?? 'Procuratio';
  const label = shortName(product.name);
  const code = product.sku;
  const colors = palette(category);

  return encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480" role="img" aria-label="${escapeHtml(product.name)}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${colors.top}"/>
          <stop offset="100%" stop-color="${colors.bottom}"/>
        </linearGradient>
      </defs>
      <rect width="640" height="480" rx="34" fill="url(#bg)"/>
      <rect x="24" y="24" width="592" height="432" rx="28" fill="${colors.panel}" opacity="0.44"/>
      <rect x="42" y="38" width="110" height="28" rx="14" fill="#ffffff" opacity="0.94"/>
      <text x="97" y="57" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="800" fill="${colors.accent}">${escapeHtml(category.toUpperCase())}</text>

      <circle cx="320" cy="194" r="124" fill="#ffffff" opacity="0.08"/>
      ${renderShape(category, colors.accent)}

      <rect x="50" y="330" width="540" height="98" rx="24" fill="#0b1226" opacity="0.2"/>
      <text x="52" y="356" font-family="Manrope, Arial, sans-serif" font-size="15" font-weight="800" fill="${colors.text}" opacity="0.72">${escapeHtml(brand.toUpperCase())}</text>
      <text x="52" y="388" font-family="Manrope, Arial, sans-serif" font-size="28" font-weight="800" fill="${colors.text}">${escapeHtml(label)}</text>
      <text x="52" y="413" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="700" fill="${colors.text}" opacity="0.66">${escapeHtml(code)}</text>
      <circle cx="548" cy="380" r="34" fill="${colors.accent}" opacity="0.18"/>
      <text x="548" y="388" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="22" font-weight="800" fill="${colors.text}">${escapeHtml(initials(brand))}</text>
    </svg>
  `);
}

function shouldUseDefaultImage(product: CatalogProduct): boolean {
  return !product.imageUrl;
}

export function productImageUrl(product: CatalogProduct): string {
  if (shouldUseDefaultImage(product)) {
    return defaultProductImageUrl();
  }

  return product.imageUrl as string;
}
