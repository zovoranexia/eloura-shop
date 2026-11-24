import Link from 'next/link';
import { Facebook, Instagram, Mail, MessageCircle, Phone } from 'lucide-react';
import { getT } from '@/lib/i18n';
import { normalizePhone } from '@/lib/phone';
import type { StoreConfig } from '@/server/storefront';
import { Logo } from './Logo';
import { Botanical, TikTokIcon } from './Icons';
import { NewsletterForm } from './NewsletterForm';

/** Dark espresso footer with a curved top edge, botanical line-art accents and the newsletter form. */
export async function Footer({ store }: { store: StoreConfig['store'] }) {
  const { t } = await getT();
  const wa = normalizePhone(store.whatsapp);
  const socials = [
    { href: store.instagram, label: 'Instagram', icon: <Instagram size={18} /> },
    { href: store.facebook, label: 'Facebook', icon: <Facebook size={18} /> },
    { href: store.tiktok, label: 'TikTok', icon: <TikTokIcon /> },
  ].filter((s) => s.href);
  const safe = (u: string) => (/^https?:\/\//.test(u) ? u : '#');

  return (
    <footer className="no-print relative mt-24 overflow-x-clip text-cream/90">
      <div className="bg-espresso" style={{ borderTopLeftRadius: '50% 56px', borderTopRightRadius: '50% 56px' }}>
        <Botanical className="pointer-events-none absolute bottom-24 left-0 hidden h-64 w-40 -translate-x-8 text-gold/30 md:block" />
        <Botanical className="pointer-events-none absolute bottom-24 right-0 hidden h-64 w-40 translate-x-8 -scale-x-100 text-gold/30 md:block" />
        <div className="container-x relative grid gap-10 pb-10 pt-20 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.4fr]">
          <div>
            <Logo variant="full" light className="h-28 w-auto" />
            <p className="mt-3 max-w-[260px] text-sm text-cream/70">{store.tagline}</p>
          </div>
          <nav aria-label={t('footer.links_title')}>
            <h2 className="font-serif text-xl text-white">{t('footer.links_title')}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ['/', 'nav.home'], ['/shop', 'nav.shop'], ['/page/about', 'nav.about'], ['/contact', 'nav.contact'], ['/track', 'nav.track'], ['/page/shipping-returns', 'footer.shipping_returns'],
              ].map(([href, key]) => <li key={href}><Link href={href} className="text-cream/75 hover:text-white">{t(key)}</Link></li>)}
            </ul>
          </nav>
          <div>
            <h2 className="font-serif text-xl text-white">{t('footer.social_title')}</h2>
            {socials.length ? (
              <ul className="mt-3 flex gap-3">
                {socials.map((s) => (
                  <li key={s.label}><a href={safe(s.href)} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid h-10 w-10 place-items-center rounded-full border border-cream/30 hover:border-gold hover:text-gold">{s.icon}</a></li>
                ))}
              </ul>
            ) : null}
            <ul className="mt-4 space-y-2 text-sm text-cream/75">
              {wa.valid ? <li><a href={`https://wa.me/${wa.wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white"><MessageCircle size={15} />WhatsApp {wa.display}</a></li> : null}
              {store.phone ? <li><a href={`tel:${store.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:text-white"><Phone size={15} />{store.phone}</a></li> : null}
              {store.email ? <li><a href={`mailto:${store.email}`} className="inline-flex items-center gap-2 hover:text-white"><Mail size={15} />{store.email}</a></li> : null}
            </ul>
          </div>
          <div>
            <h2 className="font-serif text-xl text-white">{t('footer.newsletter_title')}</h2>
            <p className="mb-3 mt-2 text-sm text-cream/70">{t('footer.newsletter_text')}</p>
            <NewsletterForm />
          </div>
        </div>
        <div className="border-t border-cream/10">
          <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-xs text-cream/60 sm:flex-row">
            <p>{t('footer.copyright', { year: new Date().getFullYear(), store: store.name })}</p>
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1">
              <li><Link href="/page/terms" className="hover:text-white">{t('footer.terms')}</Link></li>
              <li><Link href="/page/privacy" className="hover:text-white">{t('footer.privacy')}</Link></li>
              <li><Link href="/page/cod-terms" className="hover:text-white">{t('footer.cod_terms')}</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
