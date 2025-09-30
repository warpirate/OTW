// Simple infographic image resolver with local asset preference and SVG fallbacks
// 1) Try local assets in assets/infographics via Vite glob
// 2) If none, generate consistent SVG data-URI with a pictogram symbol

const encodeSvg = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// Load all local infographic assets (png/svg/webp) once
const assetModules = import.meta && import.meta.glob
  ? import.meta.glob('../../assets/infographics/*.{svg,png,webp,jpg,jpeg}', { eager: true, query: '?url', import: 'default' })
  : {};

// Ensure mapping URLs work in production by serving from the Vite public directory
// Our ICON_MAPPINGS currently use "/src/assets/infographics/Icons/..." during dev
// We normalize them to 
//     `${import.meta.env.BASE_URL}infographics/Icons/...` for production
const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
const normalizeIconUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('/src/assets/infographics/Icons/')) {
    const rel = url.replace('/src/assets/', ''); // -> 'infographics/Icons/...'
    return `${BASE_URL}${rel}`;
  }
  return url;
};

// Manual icon mapping for nested Icons folder
const ICON_MAPPINGS = {
  // AC Services
  'ac-installation': '/src/assets/infographics/Icons/Ac_services/ac_installation.png',
  'cleaning-servicing': '/src/assets/infographics/Icons/Ac_services/cleaning_servicing.png',
  'duct-cleaning': '/src/assets/infographics/Icons/Ac_services/duct_cleaning.png',
  'gas-refilling': '/src/assets/infographics/Icons/Ac_services/gas_refilling.png',
  'repair-maintenance': '/src/assets/infographics/Icons/Ac_services/repair_maintenance.png',
  'thermostat-installation': '/src/assets/infographics/Icons/Ac_services/thermostat_installation.png',
  'ac-service-cat': '/infographics/Icons/Ac_services/ac_services_category.jpg',
  'ac-services-cat': '/infographics/Icons/Ac_services/ac_services_category.jpg',
  
  // Carpenter
  'custom-shelving': '/src/assets/infographics/Icons/carpenter_cat/custom_shelving.png',
  'deck-building': '/src/assets/infographics/Icons/carpenter_cat/deck_building.png',
  'door-installations': '/src/assets/infographics/Icons/carpenter_cat/door_installations.png',
  'flooring-installation': '/src/assets/infographics/Icons/carpenter_cat/flooring_installation.png',
  'furniture-repair': '/src/assets/infographics/Icons/carpenter_cat/furniture_repair.png',
  'kitchen-cabinets': '/src/assets/infographics/Icons/carpenter_cat/kitchen_cabinets.png',
  'roof-framing': '/src/assets/infographics/Icons/carpenter_cat/roof_framing.png',
  'window-frames': '/src/assets/infographics/Icons/carpenter_cat/window_frames.png',
  'carpenter-cat': '/src/assets/infographics/Icons/carpenter_cat/carpenter_cat.jpg',
  
  // Cleaning
  'carpet-cleaning': '/src/assets/infographics/Icons/cleaning/carpet_cleaning.png',
  'deep-cleaning': '/src/assets/infographics/Icons/cleaning/deep_cleaning.png',
  'move-in-outcleaning': '/src/assets/infographics/Icons/cleaning/move-in-outcleaning.png',
  'office-cleaning': '/src/assets/infographics/Icons/cleaning/office_cleaning.png',
  'window-cleaning': '/src/assets/infographics/Icons/cleaning/window_cleaning.png',
  // aliases for specific UI labels
  'move-in-move-out-cleaning': '/src/assets/infographics/Icons/cleaning/move-in-outcleaning.png',
  'house-cleaning': '/src/assets/infographics/Icons/cleaning/house_cleaning.png',
  'post-construction-cleanup': '/src/assets/infographics/Icons/cleaning/post_construction_cleanup.png',
  'cleaner-cat': '/infographics/Icons/cleaning/cleaner_cat.png',
  'cleaning-cat': '/infographics/Icons/cleaning/cleaner_cat.png',
  
  // Cook
  'bulk-cooking': '/src/assets/infographics/Icons/cook/bulk_cooking.png',
  'cooking-classes': '/src/assets/infographics/Icons/cook/cooking_classes.png',
  'daily-meal-prep': '/src/assets/infographics/Icons/cook/daily_meal_prep.png',
  'diet-specificmeals': '/src/assets/infographics/Icons/cook/diet-specificmeals.png',
  // explicit alias with hyphenated slug for UI label "Diet-specific Meals"
  'diet-specific-meals': '/src/assets/infographics/Icons/cook/diet-specificmeals.png',
  'meal-planning': '/src/assets/infographics/Icons/cook/meal_planning.png',
  'party-catering': '/src/assets/infographics/Icons/cook/party_catering.png',
  'special-occasion-cooking': '/src/assets/infographics/Icons/cook/special_occasion_cooking.png',
  'cook-cat': '/infographics/Icons/cook/cooking_cat.png',
  'cooking-cat': '/infographics/Icons/cook/cooking_cat.png',
  
  // Electrician
  'circuit-breaker-repair': '/src/assets/infographics/Icons/electrition/circuit_breaker_repair.png',
  'electrical-inspection': '/src/assets/infographics/Icons/electrition/electrical_inspection.png',
  'emergency-electrical': '/src/assets/infographics/Icons/electrition/emergency_electrical.png',
  'light-fixture-setup': '/src/assets/infographics/Icons/electrition/light_fixture_setup.png',
  // explicit mapping for Fan Installation
  'fan-installation': '/src/assets/infographics/Icons/electrition/fan_install.png',
  'outlet-installation': '/src/assets/infographics/Icons/electrition/outlet_installation.png',
  'wiring-installation': '/src/assets/infographics/Icons/electrition/wiring_installation.png',
  'electrician-cat': '/infographics/Icons/electrition/circuit_breaker_repair.jpg',
  'electrition-cat': '/infographics/Icons/electrition/circuit_breaker_repair.jpg',
  
  // General Help
  'furniture-assembly': '/src/assets/infographics/Icons/general help/furniture_assembly.png',
  'handyman-tasks': '/src/assets/infographics/Icons/general help/handyman_tasks.png',
  'minor-repairs': '/src/assets/infographics/Icons/general help/minor_repairs.png',
  'moving-assistance': '/src/assets/infographics/Icons/general help/moving_assistance.png',
  'organizing-services': '/src/assets/infographics/Icons/general help/organizing_services.png',
  'painting': '/src/assets/infographics/Icons/general help/painting.png',
  'yard-work': '/src/assets/infographics/Icons/general help/yard_work.png',
  'general-help-cat': '/infographics/Icons/general help/general_help_cat.png',
  'general-cat': '/infographics/Icons/general help/general_help_cat.png',
  
  // Pest Control
  'ant-control': '/src/assets/infographics/Icons/pest_control/Ant_control.png',
  'bed-bug-treatment': '/src/assets/infographics/Icons/pest_control/Bed Bug Treatment.png',
  'general-fumigation': '/src/assets/infographics/Icons/pest_control/General Fumigation.png',
  'mosquito-control': '/src/assets/infographics/Icons/pest_control/Mosquito Control.png',
  'termite-treatment': '/src/assets/infographics/Icons/pest_control/Termite Treatment.png',
  'cockorach-treatment': '/src/assets/infographics/Icons/pest_control/cockorach_treatment.png',
  // explicit alias with correct spelling for UI label "Cockroach Treatment"
  'cockroach-treatment': '/src/assets/infographics/Icons/pest_control/cockorach_treatment.png',
  'pest-control': '/src/assets/infographics/Icons/pest_control/pest_control.png',
  'rat-extermination': '/src/assets/infographics/Icons/pest_control/rat_extermination.png',
  // explicit alias for Rodent Control -> use rat_extermination image
  'rodent-control': '/src/assets/infographics/Icons/pest_control/rat_extermination.png',
  'pest-control-cat': '/infographics/Icons/pest_control/Ant_control.jpg',
  'pest-cat': '/infographics/Icons/pest_control/Ant_control.jpg',
  
  // Plumber
  'bathroom-renovation': '/src/assets/infographics/Icons/plumber/bathroom_renovation.png',
  'emergency-plumbing': '/src/assets/infographics/Icons/plumber/emergency_plumbing.png',
  'faucet-repair': '/src/assets/infographics/Icons/plumber/faucet_repair.png',
  // explicit mapping for Drain Cleaning
  'drain-cleaning': '/src/assets/infographics/Icons/plumber/drain_cleaning.png',
  'pipe-repair': '/src/assets/infographics/Icons/plumber/pipe_repair.png',
  'toilet-installations': '/src/assets/infographics/Icons/plumber/toilet_installations.png',
  'water-heater-service': '/src/assets/infographics/Icons/plumber/water_heater_service.png',
  'plumber-cat': '/infographics/Icons/plumber/plumber_category.jpg',
  'plumbing-cat': '/infographics/Icons/plumber/plumber_category.jpg',
};

// Category folder mappings
const CATEGORY_FOLDER_MAPPINGS = {
  'ac': 'Ac_services',
  'ac-services': 'Ac_services',
  'air-conditioner': 'Ac_services',
  'carpenter': 'carpenter_cat',
  'cleaning': 'cleaning',
  'cleaner': 'cleaning',
  'maid': 'cleaning',
  'cook': 'cook',
  'chef': 'cook',
  'electrician': 'electrition',
  'electric': 'electrition',
  'general-help': 'general help',
  'general': 'general help',
  'pest': 'pest_control',
  'pest-control': 'pest_control',
  'plumber': 'plumber',
  'plumbing': 'plumber',
};

const normalize = (value) => (value || '').toString().trim().toLowerCase();
const toSlug = (value) => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Map common synonyms/misspellings to canonical keys
const SYNONYMS = {
  'electrition': 'electrician',
  'electrican': 'electrician',
  'electric': 'electrician',
  'ac services': 'ac',
  'ac service': 'ac',
  'ac': 'ac',
  'air conditioner': 'ac',
  'general help': 'general-help',
  'general-help': 'general-help',
  'cleaning': 'cleaner',
  'housekeeping': 'cleaner',
  'pest control': 'pest',
  'pest': 'pest',
  'plumbing': 'plumber',
  'carpenter cat': 'carpenter',
  'cook': 'cook',
  'chef': 'cook',
};

const canonicalize = (value) => {
  const key = normalize(value);
  // try exact mapping
  if (SYNONYMS[key]) return SYNONYMS[key];
  // try slug mapping
  const slug = toSlug(key);
  if (SYNONYMS[slug]) return SYNONYMS[slug];
  // try first token mapping (e.g., 'ac services')
  const firstToken = key.split(' ')[0];
  if (SYNONYMS[firstToken]) return SYNONYMS[firstToken];
  return key;
};

// Reverse lookup: given a canonical key, return possible synonym keys (as provided by content or folder names)
const synonymsFor = (canonicalKey) => {
  const canon = canonicalize(canonicalKey);
  const out = [];
  for (const [k, v] of Object.entries(SYNONYMS)) {
    if (v === canon) out.push(k);
  }
  return out;
};

const getLocalAssetUrl = (key) => {
  if (!key) return null;
  const canonical = canonicalize(key);
  const slug = toSlug(canonical);
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

// Build an index from manual mappings for faster lookups
const ICON_INDEX = Object.entries(ICON_MAPPINGS).map(([slug, path]) => ({
  baseSlug: slug,
  url: path,
  path: path,
}));

if (typeof window !== 'undefined') {
  // expose debug info
  window.__ICON_INDEX__ = ICON_INDEX;
  window.__ICON_MAPPINGS__ = ICON_MAPPINGS;
  window.__CATEGORY_FOLDER_MAPPINGS__ = CATEGORY_FOLDER_MAPPINGS;
}

const findIconBySlug = (slug) => {
  if (!slug) return null;
  const s = toSlug(slug);
  // exact filename slug match
  let hit = ICON_INDEX.find((e) => e.baseSlug === s);
  if (hit) return normalizeIconUrl(hit.url);
  // loose contains match
  hit = ICON_INDEX.find((e) => e.baseSlug.includes(s) || s.includes(e.baseSlug));
  if (hit) return normalizeIconUrl(hit.url);
  // try reverse synonyms
  const rev = synonymsFor(s);
  for (const alt of rev) {
    const a = toSlug(alt);
    hit = ICON_INDEX.find((e) => e.baseSlug === a);
    if (hit) return normalizeIconUrl(hit.url);
    hit = ICON_INDEX.find((e) => e.baseSlug.includes(a) || a.includes(e.baseSlug));
    if (hit) return normalizeIconUrl(hit.url);
  }
  return null;
};

const findCategoryIcon = (categoryName) => {
  const canonical = canonicalize(categoryName);
  const slug = toSlug(canonical);
  
  // First try to find a category-specific icon (with "cat" in the name)
  const categorySlug = slug + '-cat';
  if (ICON_MAPPINGS[categorySlug]) {
    return normalizeIconUrl(ICON_MAPPINGS[categorySlug]);
  }
  
  // Try direct category mapping
  if (ICON_MAPPINGS[slug]) {
    return normalizeIconUrl(ICON_MAPPINGS[slug]);
  }
  
  // Try folder-based lookup using category folder mappings
  const folderName = CATEGORY_FOLDER_MAPPINGS[slug];
  if (folderName) {
    // Look for a category file in this folder
    const categoryFile = Object.entries(ICON_MAPPINGS).find(([key, path]) => 
      path.includes(`/${folderName}/`) && (key.includes('cat') || key.includes('category'))
    );
    if (categoryFile) {
      return normalizeIconUrl(categoryFile[1]);
    }
    
    // Fall back to any file in this folder
    const anyFileInFolder = Object.entries(ICON_MAPPINGS).find(([key, path]) => 
      path.includes(`/${folderName}/`)
    );
    if (anyFileInFolder) {
      return normalizeIconUrl(anyFileInFolder[1]);
    }
  }
  
  // Fall back to filename-based search
  return findIconBySlug(slug);
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

// Type image mappings for main service types
const TYPE_IMAGE_MAPPINGS = {
  'maintenance': '/infographics/maintence.jpg',
  'maid': '/infographics/maid.png',
  'cleaner': '/infographics/maid.png', // Also map cleaner to maid image
  'driver': '/infographics/67409.jpg',
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
  const key = canonicalize(typeIdOrName);
  
  // First check for specific type image mappings
  if (TYPE_IMAGE_MAPPINGS[key]) {
    return TYPE_IMAGE_MAPPINGS[key];
  }
  
  // Then try local assets
  const asset = getLocalAssetUrl(key);
  if (asset) return asset;
  
  // Fall back to SVG generation
  const style = TYPE_STYLES[key] || { bgColor: '#F1F5F9', fgColor: '#3B82F6', subText: 'Services', symbol: '🔧' };
  const label = key ? key[0].toUpperCase() : 'S';
  return createBadgeSvg(label, style);
};

export const getCategoryImageSrc = (name, explicitUrl) => {
  if (explicitUrl) return explicitUrl;
  const key = canonicalize(name);
  const asset = getLocalAssetUrl(key) || getLocalAssetUrl(key.split(' ')[0]) || findCategoryIcon(key);
  if (typeof window !== 'undefined' && window.__DEBUG_ICONS__) {
    console.debug('[IconResolver] Category', { name, key, asset });
  }
  if (asset) return asset;
  const style = CATEGORY_STYLES[key] || CATEGORY_STYLES[key.split(' ')[0]];
  const finalStyle = style || { bgColor: '#F8FAFC', fgColor: '#0EA5E9', symbol: '🧩' };
  return createBadgeSvg(name, finalStyle);
};

export const getServiceImageSrc = (service, explicitUrl, categoryContext) => {
  const name = typeof service === 'string' ? service : service?.name;
  if (explicitUrl) return explicitUrl;
  const key = canonicalize(name);
  const serviceSlug = toSlug(key);
  let asset = null;
  
  // Try direct service mapping first
  if (ICON_MAPPINGS[serviceSlug]) {
    asset = ICON_MAPPINGS[serviceSlug];
  }
  
  // If a category context is provided, try to resolve within that folder
  if (!asset && categoryContext) {
    const categorySlug = toSlug(canonicalize(categoryContext));
    const folderName = CATEGORY_FOLDER_MAPPINGS[categorySlug];
    
    if (folderName) {
      // Look for service icons in this category folder
      const serviceInFolder = Object.entries(ICON_MAPPINGS).find(([key, path]) => 
        path.includes(`/${folderName}/`) && (
          key === serviceSlug || 
          key.includes(serviceSlug) || 
          serviceSlug.includes(key)
        )
      );
      if (serviceInFolder) {
        asset = serviceInFolder[1];
      }
    }
  }
  
  // Global fallback search
  if (!asset) {
    asset = getLocalAssetUrl(key) || getLocalAssetUrl(key.split(' ')[0]) || findIconBySlug(key);
  }
  
  if (typeof window !== 'undefined' && window.__DEBUG_ICONS__) {
    console.debug('[IconResolver] Service', { name, key, serviceSlug, categoryContext, asset });
  }
  
  if (asset) return normalizeIconUrl(asset);
  const base = Object.keys(CATEGORY_STYLES).find((k) => key.includes(k)) || 'carpenter';
  const style = CATEGORY_STYLES[base] || { bgColor: '#F8FAFC', fgColor: '#0EA5E9', symbol: '🛠️' };
  return createBadgeSvg(name || 'Service', style);
};

export const getBestImageSrc = (entity) => {
  if (!entity) return createBadgeSvg('OTW', { symbol: '🧰' });
  const explicit = entity.imageUrl || entity.image_url || entity.icon_url;
  const name = entity.name || entity.title || 'Service';
  if (explicit) return explicit;
  const asset = getLocalAssetUrl(name) || getLocalAssetUrl(name.split(' ')[0]) || findCategoryIcon(name) || findIconBySlug(name);
  if (typeof window !== 'undefined' && window.__DEBUG_ICONS__) {
    console.debug('[IconResolver] Best', { name, asset });
  }
  if (asset) return normalizeIconUrl(asset);
  return getServiceImageSrc(name);
};

export default {
  getTypeImageSrc,
  getCategoryImageSrc,
  getServiceImageSrc,
  getBestImageSrc,
};
