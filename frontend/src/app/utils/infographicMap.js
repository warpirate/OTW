// Simple infographic image resolver with local asset preference and SVG fallbacks
// 1) Try local assets in assets/infographics via Vite glob
// 2) If none, generate consistent SVG data-URI with a pictogram symbol

const encodeSvg = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// Load all local infographic assets (png/svg/webp) once
const assetModules = import.meta && import.meta.glob
  ? import.meta.glob('../../assets/infographics/*.{svg,png,webp,jpg,jpeg}', { eager: true, as: 'url' })
  : {};

const normalize = (value) => (value || '').toString().trim().toLowerCase();
const toSlug = (value) => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const getLocalAssetUrl = (key) => {
  if (!key) return null;
  const slug = toSlug(key);
  // Try direct filename matches first
  const candidates = [
    `../../assets/infographics/${slug}.svg`,
    `../../assets/infographics/${slug}.png`,
    `../../assets/infographics/${slug}.webp`,
    `../../assets/infographics/${slug}.jpg`,
    `../../assets/infographics/${slug}.jpeg`,
  ];
  for (const path of candidates) {
    if (assetModules[path]) return assetModules[path];
  }
  return null;
};

const createBadgeSvg = (label, options = {}) => {
  const text = (label || 'OTW').trim();
  const initials = text
    .split(/\s+/)
    .map((w) => w[0] || '')
    .join('')
    .slice(0, 3)
    .toUpperCase();

  const displayText = options.symbol || initials;

  const width = 96;
  const height = 96;
  const radius = 16;
  const bg = options.bgColor || '#F0F4FF';
  const fg = options.fgColor || '#3B82F6';
  const sub = options.subText || '';
  const fontSize = options.symbol ? 40 : 28;
  const fontWeight = options.symbol ? 600 : 700;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.6" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" fill="url(#g)" />
  <circle cx="24" cy="24" r="8" fill="${fg}" fill-opacity="0.15" />
  <circle cx="78" cy="18" r="6" fill="${fg}" fill-opacity="0.12" />
  <circle cx="82" cy="74" r="10" fill="${fg}" fill-opacity="0.1" />
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Inter, system-ui, -apple-system, Segoe UI Emoji, Segoe UI, Roboto, Arial" font-size="${fontSize}"
        font-weight="${fontWeight}" fill="${options.symbol ? '#0F172A' : fg}">${displayText}</text>
  ${sub ? `<text x="50%" y="76%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="10" fill="#64748B">${sub}</text>` : ''}
</svg>`;

  return encodeSvg(svg);
};

const TYPE_STYLES = {
  maintenance: { bgColor: '#EEF2FF', fgColor: '#6366F1', subText: 'Maintenance', symbol: '🧰' },
  maid: { bgColor: '#FDF2F8', fgColor: '#EC4899', subText: 'Maid', symbol: '🧹' },
  driver: { bgColor: '#ECFEFF', fgColor: '#06B6D4', subText: 'Driver', symbol: '🚗' },
};

const CATEGORY_STYLES = {
  carpenter: { bgColor: '#FFF7ED', fgColor: '#F97316', symbol: '🔨' },
  ac: { bgColor: '#EFF6FF', fgColor: '#3B82F6', symbol: '❄️' },
  air: { bgColor: '#EFF6FF', fgColor: '#3B82F6', symbol: '❄️' },
  electrician: { bgColor: '#FEFCE8', fgColor: '#EAB308', symbol: '⚡' },
  plumber: { bgColor: '#ECFEFF', fgColor: '#06B6D4', symbol: '🚿' },
  pest: { bgColor: '#FEF2F2', fgColor: '#EF4444', symbol: '🐜' },
  cleaner: { bgColor: '#F0FDFA', fgColor: '#10B981', symbol: '🧽' },
  cook: { bgColor: '#FFF7ED', fgColor: '#F97316', symbol: '🍳' },
  'general help': { bgColor: '#F1F5F9', fgColor: '#64748B', symbol: '🧑‍🔧' },
};

export const getTypeImageSrc = (typeIdOrName) => {
  const key = normalize(typeIdOrName);
  const asset = getLocalAssetUrl(key);
  if (asset) return asset;
  const style = TYPE_STYLES[key] || { bgColor: '#F1F5F9', fgColor: '#3B82F6', subText: 'Services', symbol: '🔧' };
  const label = key ? key[0].toUpperCase() : 'S';
  return createBadgeSvg(label, style);
};

export const getCategoryImageSrc = (name, explicitUrl) => {
  if (explicitUrl) return explicitUrl;
  const key = normalize(name);
  const asset = getLocalAssetUrl(key) || getLocalAssetUrl(key.split(' ')[0]);
  if (asset) return asset;
  const style = CATEGORY_STYLES[key] || CATEGORY_STYLES[key.split(' ')[0]];
  const finalStyle = style || { bgColor: '#F8FAFC', fgColor: '#0EA5E9', symbol: '🧩' };
  return createBadgeSvg(name, finalStyle);
};

export const getServiceImageSrc = (service, explicitUrl) => {
  const name = typeof service === 'string' ? service : service?.name;
  if (explicitUrl) return explicitUrl;
  const key = normalize(name);
  const asset = getLocalAssetUrl(key) || getLocalAssetUrl(key.split(' ')[0]);
  if (asset) return asset;
  const base = Object.keys(CATEGORY_STYLES).find((k) => key.includes(k)) || 'carpenter';
  const style = CATEGORY_STYLES[base] || { bgColor: '#F8FAFC', fgColor: '#0EA5E9', symbol: '🛠️' };
  return createBadgeSvg(name || 'Service', style);
};

export const getBestImageSrc = (entity) => {
  if (!entity) return createBadgeSvg('OTW', { symbol: '🧰' });
  const explicit = entity.imageUrl || entity.image_url || entity.icon_url;
  const name = entity.name || entity.title || 'Service';
  if (explicit) return explicit;
  const asset = getLocalAssetUrl(name) || getLocalAssetUrl(name.split(' ')[0]);
  if (asset) return asset;
  return getServiceImageSrc(name);
};

export default {
  getTypeImageSrc,
  getCategoryImageSrc,
  getServiceImageSrc,
  getBestImageSrc,
};
