import { PrintSheet } from '@/components/admin/PrintSheet';

export default async function PackingSlipPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <PrintSheet id={Number(params.id)} kind="packing" />;
}
