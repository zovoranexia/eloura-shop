// Hand-written SVG charts (no chart library). Pure components: usable from server and client components.

export type BarDatum = { label: string; value: number; line?: number; title?: string };

/** Vertical bars (revenue) with an optional line overlay (orders count) on a secondary axis. */
export function BarLineChart({ data, barColor = '#7D4E57', lineColor = '#B09365', fmt, height = 220, ariaLabel }: {
  data: BarDatum[]; barColor?: string; lineColor?: string; fmt: (v: number) => string; height?: number; ariaLabel: string;
}) {
  const W = 720, H = height, padL = 52, padR = 28, padT = 14, padB = 30;
  const iw = W - padL - padR, ih = H - padT - padB;
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const lmax = Math.max(1, ...data.map((d) => d.line ?? 0));
  const bw = iw / Math.max(1, data.length);
  const x = (i: number) => padL + i * bw + bw / 2;
  const hasLine = data.some((d) => d.line != null);
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${(padT + ih - ((d.line ?? 0) / lmax) * ih).toFixed(1)}`).join(' ');
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const step = Math.ceil(data.length / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
      {ticks.map((t) => {
        const y = padT + ih - t * ih;
        return (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#E8DDD4" strokeWidth={1} />
            <text x={padL - 8} y={y + 3.5} textAnchor="end" fontSize={10} fill="#6E6264">{fmt(Math.round(nice * t))}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (d.value / nice) * ih;
        return (
          <g key={d.label + i}>
            <rect x={x(i) - bw * 0.32} y={padT + ih - h} width={bw * 0.64} height={Math.max(h, d.value > 0 ? 1.5 : 0)} rx={3} fill={barColor} opacity={0.9}>
              <title>{d.title ?? `${d.label}: ${fmt(d.value)}`}</title>
            </rect>
            {i % step === 0 && <text x={x(i)} y={H - 10} textAnchor="middle" fontSize={10} fill="#6E6264">{d.label}</text>}
          </g>
        );
      })}
      {hasLine && (
        <g>
          <polyline points={pts} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" />
          {data.map((d, i) => <circle key={i} cx={x(i)} cy={padT + ih - ((d.line ?? 0) / lmax) * ih} r={3} fill="#fff" stroke={lineColor} strokeWidth={2}><title>{`${d.label}: ${d.line ?? 0}`}</title></circle>)}
        </g>
      )}
    </svg>
  );
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
}

export type HBarRow = { label: string; value: number; display: string; sub?: string; color?: string };

/** Horizontal bars with labels (orders by status, payment-method mix...). */
export function HBars({ rows, empty }: { rows: HBarRow[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-sm text-taupe">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-espresso">{r.label}</span>
            <span className="text-taupe">{r.display}{r.sub ? <span className="ml-2 text-xs">{r.sub}</span> : null}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-cream-deep">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.color ?? '#7D4E57' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
