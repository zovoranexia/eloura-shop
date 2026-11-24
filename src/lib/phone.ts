/**
 * Timor-Leste numbers: mobiles are 8 digits starting with 7 (+670 7XXX XXXX); landlines are 7 digits starting with 3.
 * The country code (+670 / 00670 / 670) is optional on input. `e164` is the canonical stored form.
 */
export type PhoneInfo =
  | { valid: false }
  | { valid: true; type: 'mobile' | 'landline'; national: string; e164: string; display: string; wa: string };

export function normalizePhone(input: unknown): PhoneInfo {
  if (typeof input !== 'string') return { valid: false };
  let d = input.replace(/[\s().-]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('670')) d = d.slice(3);
  if (!/^\d+$/.test(d)) return { valid: false };
  if (/^7\d{7}$/.test(d)) return { valid: true, type: 'mobile', national: d, e164: `+670${d}`, display: `+670 ${d.slice(0, 4)} ${d.slice(4)}`, wa: `670${d}` };
  if (/^3\d{6}$/.test(d)) return { valid: true, type: 'landline', national: d, e164: `+670${d}`, display: `+670 ${d.slice(0, 3)} ${d.slice(3)}`, wa: `670${d}` };
  return { valid: false };
}
export const isMobile = (v: unknown) => {
  const p = normalizePhone(v);
  return p.valid && p.type === 'mobile';
};

/**
 * Splits a display field that may hold several numbers ("(+670) 74012434 / 76012434") into its parts.
 * `text` is shown as typed; `tel` is the dialable +670 form (null when the part is not a valid TL number).
 */
export function splitPhoneList(input: string | null | undefined): { text: string; tel: string | null }[] {
  return String(input ?? '')
    .split(/\s*[\/,;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text) => {
      const p = normalizePhone(text);
      return { text, tel: p.valid ? p.e164 : null };
    });
}
