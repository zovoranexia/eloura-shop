import 'server-only';
import { prisma } from './db';
import type { Ctx } from './api';

type Actor = Pick<Ctx, 'user' | 'ip' | 'userAgent'>;

/** Append a row to the immutable audit trail. Never throws: auditing must not break the request. */
export async function audit(actor: Partial<Actor> | null, action: string, entity?: string | null, entityId?: string | number | null, meta?: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: actor?.user?.id ?? null,
        userLabel: actor?.user ? `${actor.user.name} <${actor.user.email}>` : 'system',
        action, entity: entity ?? null, entityId: entityId != null ? String(entityId) : null,
        meta: (meta ?? undefined) as never, ip: actor?.ip ?? null, userAgent: actor?.userAgent ?? null,
      },
    });
  } catch (e) {
    console.error('[audit] failed', e);
  }
}
