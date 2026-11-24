import 'server-only';
import { Prisma, OrderStatus, PaymentMethodKey, PaymentStatus } from '@prisma/client';
import { diliDayStart, addDays } from '@/lib/time';

export function orderListWhere(q: URLSearchParams): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  const status = q.get('status'), pay = q.get('paymentStatus'), method = q.get('method'), text = q.get('q')?.trim(), from = q.get('from'), to = q.get('to');
  if (status && status in OrderStatus) where.status = status as OrderStatus;
  if (pay && pay in PaymentStatus) where.paymentStatus = pay as PaymentStatus;
  if (method && method in PaymentMethodKey) where.paymentMethod = method as PaymentMethodKey;
  if (from || to) where.createdAt = { ...(from ? { gte: diliDayStart(from) } : {}), ...(to ? { lt: diliDayStart(addDays(to, 1)) } : {}) };
  if (text) where.OR = [{ code: { contains: text, mode: 'insensitive' } }, { customerName: { contains: text, mode: 'insensitive' } }, { customerPhone: { contains: text.replace(/[\s-]/g, '') } }];
  return where;
}

