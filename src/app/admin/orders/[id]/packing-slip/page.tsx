import { PrintSheet } from '@/components/admin/PrintSheet';

export default function PackingSlipPage({ params }: { params: { id: string } }) {
  return <PrintSheet id={Number(params.id)} kind="packing" />;
}
