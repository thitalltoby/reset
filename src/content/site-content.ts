/** Starter content that is true whatever the pharmacy turns out to offer. Staff edit all of it in the admin console. */

export const FAQS: { category: string; question: string; answer: string }[] = [
  { category: 'Ordering', question: 'Do I need an account to order?', answer: 'No. You can check out as a guest and follow your order from the link in your confirmation email. An account lets you see past orders, save addresses and favourites, and reorder in a couple of taps.' },
  { category: 'Ordering', question: 'How do I pay?', answer: 'You will see only the payment options the pharmacy currently has open. Card, bank transfer and USSD payments are handled by Paystack on its own secure page, so we never see or store your card details. Where it is offered, you can also pay when your order is delivered or collected.' },
  { category: 'Ordering', question: 'When is my order confirmed?', answer: 'An order paid by card is confirmed only after Paystack confirms the payment to us. Until then we hold your items for a short time so nobody else can take them. If you do not finish paying, the hold is released. Orders paid on delivery or collection are confirmed as soon as you place them.' },
  { category: 'Ordering', question: 'How do I track my order?', answer: 'Use the link in your confirmation email, or go to Track an order and enter your order number and email address. You will also get an email when the status changes.' },
  { category: 'Ordering', question: 'What if something I want is out of stock?', answer: 'Availability is checked again when you check out. If an item runs out, we tell you before you pay. You can ask the pharmacy when it will be back using the form on the product page.' },
  { category: 'Medicines and prescriptions', question: 'Can I buy prescription medicines through the basket?', answer: 'No. Prescription-only medicines are never sold through the basket. They must go through a pharmacist, who checks the prescription before anything is supplied. Where the pharmacy has opened this service you can send a photo or scan of your prescription for review.' },
  { category: 'Medicines and prescriptions', question: 'Why can’t I add some medicines to my basket?', answer: 'Some products are supplied only after a pharmacist has checked they are suitable for you. They are shown for information, with a button to ask the pharmacist instead of an add-to-basket button.' },
  { category: 'Medicines and prescriptions', question: 'Can a pharmacist answer my questions?', answer: 'Send your question through the contact page and a member of the team will reply. Please do not send prescription or health details in a normal message. For anything urgent, or if you think you need emergency care, contact the pharmacy by phone or go to your nearest health facility.' },
  { category: 'Medicines and prescriptions', question: 'How do I know a product is genuine?', answer: 'Where the pharmacy has recorded a product’s NAFDAC registration number it appears under “Product details” on the product page. If you have any doubt about a product you receive, stop using it and contact us.' },
  { category: 'Delivery and returns', question: 'Can I return a product?', answer: 'Please check your order when it arrives. If something is wrong, damaged, or not what you ordered, contact us straight away and quote your order number. For safety, medicines that have left the pharmacy are not normally taken back. See the Delivery and returns page for the details the pharmacy has confirmed.' },
  { category: 'Delivery and returns', question: 'How much is delivery and how long does it take?', answer: 'Delivery charges and estimated times depend on where you are and are shown at checkout once you choose your area. If delivery is not open yet, you will see collection or contact options instead.' },
  { category: 'Your information', question: 'Is my information safe?', answer: 'We collect only what we need to process your order, prescription or enquiry, and we keep health information separate and limited to the staff who need it. Read the privacy notice for the full details and your rights.' },
  { category: 'Your information', question: 'Can I delete my account?', answer: 'Yes. Go to Your account, then Profile, then Close my account. Your login, saved addresses and uploaded prescription files are removed. Past orders are kept without a link to you, because the pharmacy needs them for its records.' },
];

export const SERVICES: { slug: string; title: string; summary: string; description: string; benefits: string[]; action: 'ENQUIRY' | 'PRESCRIPTION' | 'CONTACT'; ctaLabel: string; icon: string; sortOrder: number }[] = [
  {
    slug: 'prescription-support', title: 'Prescription and medicine support', icon: 'rx', action: 'PRESCRIPTION', ctaLabel: 'Send a prescription', sortOrder: 1,
    summary: 'Dispensing and related support, handled by a pharmacist in line with professional requirements.',
    description: 'Prescription-only medicines are supplied only against a valid prescription, after a pharmacist has checked it. Send us your prescription and a pharmacist will review it and tell you what happens next.\n\nThis is a request for review, not an order, and nothing is supplied until the pharmacist has checked everything with you.',
    benefits: ['A pharmacist reviews every prescription', 'Questions are asked before anything is supplied', 'Track the progress of your request online'],
  },
  {
    slug: 'pharmacist-guidance', title: 'Pharmacist guidance', icon: 'chat', action: 'ENQUIRY', ctaLabel: 'Ask a pharmacist', sortOrder: 2,
    summary: 'Medicine-related information and guidance from a qualified pharmacist.',
    description: 'Ask about how a medicine or product is used, what to look out for, or whether you need to see a doctor. A pharmacist will reply by email or phone.\n\nA pharmacist can give general information and tell you when you need further assessment. Online messages cannot replace a consultation, and they are not for emergencies.',
    benefits: ['General medicine information', 'Clear advice on when to see a doctor', 'Respectful, unhurried answers'],
  },
  {
    slug: 'availability-enquiries', title: 'Product availability enquiries', icon: 'search', action: 'ENQUIRY', ctaLabel: 'Ask about a product', sortOrder: 3,
    summary: 'Ask whether we have a product and when it will be in stock.',
    description: 'Cannot find what you need in the shop? Tell us the product name and size and we will check whether we stock it, or can get it, and let you know.',
    benefits: ['Tell us what you are looking for', 'We reply with availability and price', 'No obligation to buy'],
  },
  {
    slug: 'refill-requests', title: 'Refill requests', icon: 'repeat', action: 'PRESCRIPTION', ctaLabel: 'Request a refill', sortOrder: 4,
    summary: 'Ask for a repeat of a medicine you already take regularly.',
    description: 'If you already have a valid repeat prescription, send it with a note saying what you need. A pharmacist reviews the request and tells you whether the refill can go ahead.',
    benefits: ['Send your current prescription with a note', 'A pharmacist checks it before anything is supplied', 'Choose collection or delivery where available'],
  },
];
