import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { Icon } from '@/components/Icon';
import { getSite } from '@/server/site';

export const metadata: Metadata = { title: 'About Reset Pharmacy', description: 'Reset Pharmacy is a pharmacy and wellness brand built around clear, reassuring, people-first healthcare.' };

const VALUES = [
  ['Trust', 'We aim to earn confidence through honest communication, dependable service, and responsible handling of healthcare needs.', 'shield'],
  ['Professionalism', 'We value qualified expertise, ethical conduct, and respect for the standards that govern pharmacy practice.', 'star'],
  ['People-first care', 'We treat every customer with dignity, patience, and consideration for their individual needs.', 'users'],
  ['Clarity', 'We strive to make product information, service processes, and health guidance easier to understand.', 'book'],
  ['Responsibility', 'We support safe medicine use and recognise the importance of appropriate professional advice.', 'rx'],
  ['Continuous improvement', 'We look for practical ways to make the pharmacy experience more convenient, accessible, and responsive.', 'refresh'],
];

export default async function AboutPage() {
  const { company: c } = await getSite();
  const facts = [c.legalName, c.registrationNumber, c.premisesLicence && `Premises licence: ${c.premisesLicence}`, c.superintendentPharmacist && `Superintendent pharmacist: ${c.superintendentPharmacist}`].filter(Boolean) as string[];
  return (
    <>
      <PageHero eyebrow="About us" title="A fresh perspective on everyday health" intro="Reset Pharmacy is a pharmacy and wellness brand built around a simple belief: access to healthcare should feel clear, reassuring, and centred on people." />
      <div className="container-x py-12 md:py-16 grid items-center gap-10 lg:grid-cols-2">
        <div className="prose-reset">
          <h2>The idea behind the name</h2>
          <p>“Reset” is the chance to take a fresh, more intentional approach to everyday health, supported by reliable information, responsible pharmacy practice, and thoughtful service.</p>
          <p>Our ambition is to make the pharmacy experience more approachable and dependable, helping customers navigate everyday healthcare needs with greater confidence. We want to be a trusted part of the communities we serve, through professional service, clear communication, and a commitment to responsible practice.</p>
        </div>
        <Image src="/photos/hands.jpg" alt="" width={580} height={318} className="w-full rounded-[2rem] object-cover" sizes="(min-width:1024px) 45vw, 92vw" />
      </div>
      <section className="section-tight" aria-labelledby="vm-h">
        <div className="container-x grid gap-5 md:grid-cols-2">
          <div className="on-forest bg-pattern rounded-[2rem] p-8 md:p-10"><p className="eyebrow eyebrow-light">Our vision</p><h2 id="vm-h" className="mt-2 !text-[1.7rem] md:!text-[2rem]">To become a trusted and recognisable pharmacy brand</h2><p className="mt-3 text-white/90">Known for responsible care, dependable service, and a more human approach to everyday health.</p></div>
          <div className="rounded-[2rem] bg-mint p-8 md:p-10"><p className="eyebrow">Our mission</p><h2 className="mt-2 !text-[1.7rem] md:!text-[2rem]">Helping people make informed decisions about their health</h2><p className="mt-3 text-muted">By providing accessible pharmacy services, clear guidance, and a customer experience grounded in professionalism, integrity, and care.</p></div>
        </div>
      </section>
      <section className="section" aria-labelledby="val-h">
        <div className="container-x">
          <div className="max-w-2xl"><p className="eyebrow">Our values</p><h2 id="val-h" className="mt-2">What we stand for</h2></div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{VALUES.map(([t, d, i]) => (
            <li key={t} className="card card-pad"><span className="grid h-11 w-11 place-items-center rounded-full bg-mint text-forest"><Icon name={i!} size={22} /></span><h3 className="mt-3 !text-xl">{t}</h3><p className="mt-1 text-muted">{d}</p></li>
          ))}</ul>
        </div>
      </section>
      <section className="section-tight" aria-labelledby="pr-h">
        <div className="container-x grid gap-8 lg:grid-cols-2">
          <div className="card-soft p-8 md:p-10"><p className="eyebrow">Our promise</p><h2 id="pr-h" className="mt-2 !text-[1.7rem]">A more reassuring pharmacy experience</h2><p className="mt-3 text-muted">People feel listened to, information is communicated clearly, and health needs are treated with care and responsibility.</p></div>
          <div className="prose-reset"><h2 className="!mt-0">What makes the Reset experience different</h2>
            <ul><li><strong>A clear and welcoming experience.</strong> Straightforward communication and a service designed to feel approachable.</li><li><strong>Responsible healthcare communication.</strong> Accurate information, appropriate referrals, and respect for the limits of non-clinical advice.</li><li><strong>A consistent brand.</strong> A recognisable identity and consistent service standards, in store and online.</li><li><strong>Convenience where available.</strong> Practical ways to enquire about products and access services.</li></ul></div>
        </div>
      </section>
      <section className="section" aria-labelledby="qs-h">
        <div className="container-x max-w-4xl">
          <p className="eyebrow">Quality and safety</p><h2 id="qs-h" className="mt-2">Healthcare is a responsibility</h2>
          <div className="prose-reset mt-4"><p>We aim to operate in line with the requirements of the Pharmacy Council of Nigeria, NAFDAC, data protection rules, and other relevant authorities. We promote responsible medicine use, protect customer information, communicate product details accurately, and ensure regulated services are provided only by appropriately qualified and authorised people.</p>
            <p>Prescription-only medicines are never sold through the online basket. They go through a prescription review and dispensing process with a pharmacist.</p></div>
          {facts.length > 0 && <div className="card-soft mt-6 p-5 text-[.95rem]"><p className="font-display font-semibold">Registration details</p><ul className="mt-2 space-y-1">{facts.map((f) => <li key={f}>{f}</li>)}</ul></div>}
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/shop" className="btn btn-primary btn-lg">Visit the shop</Link><Link href="/contact" className="btn btn-outline btn-lg">Contact us</Link></div>
        </div>
      </section>
    </>
  );
}
