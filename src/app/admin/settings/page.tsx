import { requirePagePermission } from '@/components/admin/guard';
import { SettingsForm } from './SettingsForm';

export default async function SettingsPage() {
  await requirePagePermission('settings.manage');
  return <SettingsForm />;
}
