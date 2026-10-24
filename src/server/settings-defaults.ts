export interface CompanySettings {
  legalName: string;
  tradingName: string;
  tagline: string;
  address: string;
  /** A Google Maps (or similar) link to the pharmacy. Empty = no map link is shown. */
  mapUrl: string;
  phone: string;
  email: string;
  /** International digits, e.g. 2348012345678. Empty = no WhatsApp link anywhere. */
  whatsapp: string;
  /** One line per entry, e.g. "Monday–Saturday: 8am–9pm". Empty = hours are not shown. */
  hours: string;
  /** Exactly as it should read, e.g. “RC 123456”. Empty = not shown. */
  registrationNumber: string;
  /** Pharmacy Council of Nigeria premises licence number. Empty = not shown. */
  premisesLicence: string;
  /** Name and registration of the superintendent pharmacist. Empty = not shown. */
  superintendentPharmacist: string;
  instagram: string;
  facebook: string;
  x: string;
  tiktok: string;
}

export interface ShopSettings {
  /** Master switch for buying online. Off = the catalogue stays browsable but carts and checkout are closed. */
  onlineShop: boolean;
  delivery: boolean;
  pickup: boolean;
  /** Pay by cash or transfer when the order is handed over */
  payOnDelivery: boolean;
  /** Card, bank transfer and USSD through Paystack. Needs the Paystack key to be set up. */
  paystack: boolean;
  /** Customers can send a prescription to be reviewed by a pharmacist */
  prescriptions: boolean;
  /** How long an unpaid card checkout holds its stock */
  orderHoldMinutes: number;
  /** Smallest goods total accepted, in kobo. 0 = none. */
  minOrderKobo: number;
  pickupNote: string;
}

export interface NotificationSettings {
  /** Internal recipients. Empty = every active Super Admin and Manager. */
  newOrderTo: string[];
  prescriptionTo: string[];
  enquiryTo: string[];
  lowStockTo: string[];
}

export interface SecuritySettings {
  /** Every staff account must have two-factor sign-in. Staff without it are sent to set it up before they can use the console. */
  requireStaffMfa: boolean;
}

/** A short, time-limited announcement shown above the site header. Off by default: nothing is announced until staff write it. */
export interface NoticeSettings {
  enabled: boolean;
  text: string;
  /** Same-site path (starts with one "/") or an https address. Optional. */
  href: string;
  linkLabel: string;
  /** Last day the notice shows, YYYY-MM-DD in Lagos time. Empty = until switched off. */
  endsOn: string;
}

export interface SeoSettings {
  /** Appended to page titles, e.g. “Reset Pharmacy” */
  siteName: string;
  description: string;
  /** Per-path overrides, keyed by path such as "/about" */
  pages: Record<string, { title: string; description: string }>;
}

/** The privacy notice, terms and delivery policy are drafts until the pharmacy's legal adviser has reviewed them. */
export interface LegalSettings {
  /** Date (YYYY-MM-DD) the policies were reviewed. Empty = still drafts, and the pages say so. */
  reviewedOn: string;
  reviewedBy: string;
}

export const DEFAULTS = {
  company: {
    legalName: '',
    tradingName: 'Reset Pharmacy',
    tagline: 'A fresh start to feeling better.',
    address: '',
    mapUrl: '',
    phone: '',
    email: '',
    whatsapp: '',
    hours: '',
    registrationNumber: '',
    premisesLicence: '',
    superintendentPharmacist: '',
    instagram: '',
    facebook: '',
    x: '',
    tiktok: '',
  } satisfies CompanySettings,
  shop: {
    onlineShop: true,
    delivery: false,
    pickup: false,
    payOnDelivery: false,
    paystack: false,
    prescriptions: false,
    orderHoldMinutes: 30,
    minOrderKobo: 0,
    pickupNote: '',
  } satisfies ShopSettings,
  notifications: { newOrderTo: [], prescriptionTo: [], enquiryTo: [], lowStockTo: [] } satisfies NotificationSettings,
  security: { requireStaffMfa: false } satisfies SecuritySettings,
  legal: { reviewedOn: '', reviewedBy: '' } satisfies LegalSettings,
  notice: { enabled: false, text: '', href: '', linkLabel: '', endsOn: '' } satisfies NoticeSettings,
  seo: {
    siteName: 'Reset Pharmacy',
    description: 'Pharmacy care, wellness products and clear guidance for a fresh start to feeling better.',
    pages: {},
  } satisfies SeoSettings,
};
