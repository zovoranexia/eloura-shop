import { Prisma, ProofStatus } from '@prisma/client';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { pageMeta, paging } from '@/server/paging';

/** Verification queue (default: SUBMITTED, oldest first). ?status=APPROVED|REJECTED|VOID|all */
export const GET = route({ perm: 'payments.view' }, async (ctx) => {
  const q = ctx.req.nextUrl.searchParams;
  const { page, limit, skip, take } = paging(q);
  const status = q.get('status') ?? 'SUBMITTED';
  const where: Prisma.PaymentProofWhereInput = status === 'all' ? {} : { status: ((Object.values(ProofStatus) as string[]).includes(status) ? status : 'SUBMITTED') as ProofStatus };
  const [total, rows] = await Promise.all([
    prisma.paymentProof.count({ where }),
    prisma.paymentProof.findMany({
      where, orderBy: { id: status === 'SUBMITTED' ? 'asc' : 'desc' }, skip, take,
      include: { order: { select: { code: true, customerName: true, customerPhone: true, totalCents: true, expiresAt: true } } },
    }),
  ]);
  return {
    ...pageMeta(total, page, limit),
    items: rows.map((p) => ({
      id: p.id, orderId: p.orderId, orderCode: p.order.code, customerName: p.order.customerName, customerPhone: p.order.customerPhone, orderTotalCents: p.order.totalCents,
      method: p.method, amountCents: p.amountCents, status: p.status, reference: p.reference, payerName: p.payerName, payerAccount: p.payerAccount,
      paidAt: p.paidAt?.toISOString() ?? null, hasFile: !!p.fileKey, fileMime: p.fileMime, reviewNote: p.reviewNote, createdAt: p.createdAt.toISOString(),
    })),
  };
});
