import type { Metadata } from 'next';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { getT } from '@/lib/i18n';
import { getSetting } from '@/server/settings';
import { normalizePhone } from '@/lib/phone';
import { ContactForm } from '@/components/store/ContactForm';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('contact.title'), description: t('contact.subtitle') };
}

export default async function ContactPage() {
  const { t } = await getT();
  const store = await getSetting('store');
  const wa = normalizePhone(store.whatsapp);
  return (
    <div className="container-x py-8 md:py-12">
      <p className="eyebrow">{t('nav.contact')}</p>
      <h1 className="mt-2 text-4xl md:text-5xl">{t('contact.title')}</h1>
      <p className="mt-2 max-w-xl text-taupe">{t('contact.subtitle')}</p>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-card bg-white p-6 shadow-card md:p-8"><ContactForm /></div>
        <aside className="space-y-4 rounded-card bg-white p-6 text-sm shadow-card" aria-label={t('contact.info')}>
          <h2 className="font-serif text-2xl">{t('contact.info')}</h2>
          <ul className="space-y-3">
            {store.address ? <li className="flex gap-3"><MapPin size={18} className="mt-0.5 text-mauve" /><span>{store.address}</span></li> : null}
            {store.phone ? <li className="flex gap-3"><Phone size={18} className="mt-0.5 text-mauve" /><a href={`tel:${store.phone.replace(/\s/g, '')}`} className="hover:text-mauve">{store.phone}</a></li> : null}
            {wa.valid ? <li className="flex gap-3"><MessageCircle size={18} className="mt-0.5 text-mauve" /><a href={`https://wa.me/${wa.wa}`} target="_blank" rel="noopener noreferrer" className="hover:text-mauve">WhatsApp {wa.display}</a></li> : null}
            {store.email ? <li className="flex gap-3"><Mail size={18} className="mt-0.5 text-mauve" /><a href={`mailto:${store.email}`} className="hover:text-mauve">{store.email}</a></li> : null}
          </ul>
          <p className="rounded-xl bg-cream p-3 text-xs text-taupe">{t('contact.hours')}</p>
        </aside>
      </div>
    </div>
  );
}
