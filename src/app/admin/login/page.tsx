import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export default async function AdminLoginPage(props: { searchParams: Promise<{ next?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await getSessionUser();
  const next = searchParams.next && /^\/admin(\/[\w\-/?=&%.]*)?$/.test(searchParams.next) ? searchParams.next : '/admin';
  if (user?.isStaff) redirect(next);
  return <LoginForm next={next} />;
}
