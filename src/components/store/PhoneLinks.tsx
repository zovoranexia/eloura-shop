import { splitPhoneList } from '@/lib/phone';

/** Renders one or several phone numbers ("(+670) 74012434 / 76012434"), each as its own tel: link. */
export function PhoneLinks({ value, className }: { value: string; className?: string }) {
  const items = splitPhoneList(value);
  return (
    <>
      {items.map((p, i) => (
        <span key={`${p.text}-${i}`}>
          {i > 0 ? <span aria-hidden="true"> / </span> : null}
          {p.tel ? <a href={`tel:${p.tel}`} className={className}>{p.text}</a> : <span>{p.text}</span>}
        </span>
      ))}
    </>
  );
}
