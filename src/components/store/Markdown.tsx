import { Fragment, type ReactNode } from 'react';

/** Inline **bold** only. All text is rendered through React (auto-escaped), so no HTML can be injected from the CMS. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>);
}

/** Tiny safe markdown subset for CMS pages: `## heading`, `- bullet`, `1. numbered`, paragraphs, **bold**. */
export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r/g, '').split(/\n{2,}/);
  return (
    <div className="prose-cms">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim());
        if (!lines.length) return null;
        const out: ReactNode[] = [];
        let list: { ordered: boolean; items: string[] } | null = null;
        const flush = () => {
          if (!list) return;
          const Tag = list.ordered ? 'ol' : 'ul';
          out.push(<Tag key={`l${out.length}`}>{list.items.map((it, k) => <li key={k}>{inline(it)}</li>)}</Tag>);
          list = null;
        };
        for (const line of lines) {
          const h = line.match(/^#{2,3}\s+(.*)$/);
          const ul = line.match(/^[-*]\s+(.*)$/);
          const ol = line.match(/^\d+\.\s+(.*)$/);
          if (h) { flush(); out.push(<h2 key={`h${out.length}`} className="font-serif">{inline(h[1])}</h2>); }
          else if (ul) { if (!list || list.ordered) { flush(); list = { ordered: false, items: [] }; } list.items.push(ul[1]); }
          else if (ol) { if (!list || !list.ordered) { flush(); list = { ordered: true, items: [] }; } list.items.push(ol[1]); }
          else { flush(); out.push(<p key={`p${out.length}`}>{inline(line)}</p>); }
        }
        flush();
        return <Fragment key={i}>{out}</Fragment>;
      })}
    </div>
  );
}
