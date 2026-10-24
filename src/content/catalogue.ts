/**
 * Categories, sample delivery zones and the prescription-only samples. The shop catalogue is in ./reset-catalogue.ts.
 */

export interface SeedCategory { slug: string; name: string; blurb: string; art: string; parent?: string }

export const CATEGORIES: SeedCategory[] = [
  { slug: 'pain-fever', name: 'Pain & fever', blurb: 'Everyday relief for aches, headaches and temperature.', art: 'pill' },
  { slug: 'cold-cough-flu', name: 'Cold, cough & flu', blurb: 'Comfort for coughs, colds and blocked noses.', art: 'syrup' },
  { slug: 'stomach-digestion', name: 'Stomach & digestion', blurb: 'Rehydration, indigestion and gut-health support.', art: 'sachet' },
  { slug: 'vitamins-supplements', name: 'Vitamins & supplements', blurb: 'Everyday nutrition support.', art: 'vitamin' },
  { slug: 'first-aid', name: 'First aid', blurb: 'Plasters, dressings and antiseptics for the home.', art: 'firstaid' },
  { slug: 'skin-sun', name: 'Skin & sun care', blurb: 'Moisturisers, sun protection and skin comfort.', art: 'sun' },
  { slug: 'baby-child', name: 'Baby & child', blurb: 'Gentle care for little ones.', art: 'baby' },
  { slug: 'oral-care', name: 'Oral care', blurb: 'Toothpaste, brushes and mouthwash.', art: 'tooth' },
  { slug: 'eye-ear', name: 'Eye & ear', blurb: 'Eye comfort and ear care.', art: 'eye' },
  { slug: 'devices-tests', name: 'Devices & tests', blurb: 'Thermometers, monitors and home test kits.', art: 'thermometer' },
  { slug: 'womens-health', name: 'Women’s health', blurb: 'Everyday essentials and pregnancy support.', art: 'heart' },
  { slug: 'hygiene-protection', name: 'Hygiene & protection', blurb: 'Sanitiser, masks and gloves.', art: 'mask' },
];

type Cls = 'OTC' | 'PHARMACY_ONLY' | 'PRESCRIPTION';
export interface SeedProduct {
  sku: string; name: string; pack: string; cat: string; naira: number; stock: number; art: string; summary: string;
  cls?: Cls; was?: number; feat?: boolean; group?: string; tags?: string[]; warn?: string; how?: string; reorder?: number;
}

/**
 * Prescription-only samples. They exist in demonstration mode so staff can see how restricted items behave
 * (never shown on the website, never sold through the basket). The shop catalogue itself lives in ./reset-catalogue.ts.
 */
export const RX_SAMPLES: SeedProduct[] = [
  { sku: 'DEMO-RX-001', name: 'Amoxicillin 500mg capsules', pack: 'Pack of 21', cat: 'stomach-digestion', naira: 3500, stock: 50, art: 'capsule', summary: 'Prescription-only antibiotic. Not shown on the website.', cls: 'PRESCRIPTION' },
  { sku: 'DEMO-RX-002', name: 'Salbutamol inhaler 100mcg', pack: '200 doses', cat: 'cold-cough-flu', naira: 4800, stock: 12, art: 'spray', summary: 'Prescription-only reliever inhaler. Not shown on the website.', cls: 'PRESCRIPTION' },
];

export const DEMO_ZONES = [
  { name: 'Sample zone A — nearby (demo)', areas: 'Example: areas close to the pharmacy', feeKobo: 150_000, freeOverKobo: 2_000_000, etaText: 'Sample estimate: same day', sortOrder: 1 },
  { name: 'Sample zone B — across town (demo)', areas: 'Example: areas further from the pharmacy', feeKobo: 300_000, freeOverKobo: 4_000_000, etaText: 'Sample estimate: next day', sortOrder: 2 },
];
