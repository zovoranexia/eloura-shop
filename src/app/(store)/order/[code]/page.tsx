import type { Metadata } from 'next';
import crypto from 'node:crypto';
import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { getSessionUser } from '@/lib/auth';
import { findOrderByCode, orderView } from '@/server/orders';
import { OrderView } from '@/components/store/OrderView';

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ t?: string | string[] }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  // the access token travels in the URL: never leak it through the Referer header to third-party links / images
  return { title: `${(await getT()).t('order.title')} ${params.code}`, robots: { index: false, follow: false }, referrer: 'no-referrer' };
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export default async function OrderPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { t, locale } = await getT();
  const user = await getSessionUser();
  const order = await findOrderByCode(params.code);
  const token = Array.isArray(searchParams.t) ? searchParams.t[0] : searchParams.t;
  const allowed = !!order && ((user && order.userId === user.id) || (token && same(token, order.accessToken)));

  if (!order || !allowed) {
    return (
      <div className="container-x py-16">
        <div className="mx-auto max-w-md rounded-card bg-white p-8 text-center shadow-card">
          <h1 className="font-serif text-3xl">{t('order.access_title')}</h1>
          <p className="mt-3 text-sm text-taupe">{t('order.access_text')}</p>
          <div className="mt-6 flex flex-col gap-3"><Link href="/track" className="btn-primary">{t('nav.track')}</Link>{!user ? <Link href={`/login?next=${encodeURIComponent(`/order/${params.code}`)}`} className="btn-outline">{t('nav.login')}</Link> : null}</div>
        </div>
      </div>
    );
  }
  const view = await orderView(order, locale);
  return (
    <div className="container-x py-8 md:py-10">
      <OrderView order={view} token={token} />
    </div>
  );
}
