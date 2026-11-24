import { PrintSheet } from '@/components/admin/PrintSheet';

export default function InvoicePage({ params }: { params: { id: string } }) {
  return <PrintSheet id={Number(params.id)} kind="invoice" />;
}
