import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getT } from '@/lib/i18n';
import { getCmsPage } from '@/server/storefront';
import { formatDate } from '@/lib/time';
import { Markdown } from '@/components/store/Markdown';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = getT();
  const p = await getCmsPage(params.slug, locale);
  return p ? { title: p.title } : {};
}

export default async function CmsPage({ params }: Props) {
  const { t, locale } = getT();
  const page = await getCmsPage(params.slug, locale);
  if (!page) notFound();
  return (
    <div className="container-x py-8 md:py-12">
      <article className="mx-auto max-w-3xl rounded-card bg-white p-6 shadow-card md:p-10">
        <h1 className="text-4xl md:text-5xl">{page.title}</h1>
        <p className="mt-1 text-xs text-taupe">{t('cms.updated', { date: formatDate(page.updatedAt, locale) })}</p>
        <div className="mt-4"><Markdown source={page.body} /></div>
        {page.slug === 'cod-terms' ? <Link href="/checkout" className="btn-primary mt-6">{t('cms.back_checkout')}</Link> : null}
      </article>
    </div>
  );
}
