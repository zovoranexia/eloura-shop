import { route } from '@/lib/api';
import { endSession } from '@/lib/auth';

export const POST = route({}, async () => {
  endSession();
  return { ok: true };
});
