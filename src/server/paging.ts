import 'server-only';

/** ?page=&limit= -> prisma skip/take (limit is capped at 100). */
export function paging(q: URLSearchParams, def = 20) {
  const limit = Math.min(100, Math.max(1, Number(q.get('limit')) || def));
  const page = Math.max(1, Number(q.get('page')) || 1);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
export const pageMeta = (total: number, page: number, limit: number) => ({ total, page, pages: Math.max(1, Math.ceil(total / limit)) });
