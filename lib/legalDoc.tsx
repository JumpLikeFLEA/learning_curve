import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A deliberately small Markdown-subset renderer for the legal documents in
 * `docs/release/legal/`. Those `.md` files are the single source of truth; the
 * `(legal)` pages read them at build time and render them through here, so the
 * published Terms/Privacy text can never drift from the reviewed copy.
 *
 * This is NOT a general Markdown engine and must not become one — it handles
 * exactly the constructs those three files use (headings, paragraphs, GFM pipe
 * tables, bullet/ordered lists, `**bold**`, `_italic_`, `` `code` ``, links and
 * bare URLs, `---` rules), which is why the project needs no Markdown npm
 * dependency. Blockquotes are dropped on purpose: the only blockquotes in the
 * source are maintainer notes ("Source of truth", "Not legal advice") that must
 * not reach end users.
 */

// Relative links between the source .md files map to the public routes.
const LINK_MAP: Record<string, string> = {
  "./privacy-policy.md": "/privacy",
  "./terms-of-service.md": "/terms",
  "./subprocessors.md": "/subprocessors",
};

function resolveHref(href: string): string {
  return LINK_MAP[href] ?? href;
}

const linkClass = "text-brand-text font-medium hover:underline";

function anchor(href: string, label: ReactNode, key: string): ReactNode {
  if (href.startsWith("/")) {
    return (
      <Link key={key} href={href} className={linkClass}>
        {label}
      </Link>
    );
  }
  return (
    <a key={key} href={href} target="_blank" rel="noreferrer noopener" className={linkClass}>
      {label}
    </a>
  );
}

type Candidate = { type: "link" | "bold" | "italic" | "code" | "url"; m: RegExpMatchArray };

/** Parse inline markup, recursing into bold/italic/link bodies so nesting works. */
function parseInline(text: string, kp: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let n = 0;

  while (rest.length > 0) {
    const candidates: Candidate[] = [];
    const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(rest);
    const bold = /\*\*([^*]+)\*\*/.exec(rest);
    const italic = /_([^_]+)_/.exec(rest);
    const code = /`([^`]+)`/.exec(rest);
    const url = /https?:\/\/[^\s)]+/.exec(rest);
    if (link) candidates.push({ type: "link", m: link });
    if (bold) candidates.push({ type: "bold", m: bold });
    if (italic) candidates.push({ type: "italic", m: italic });
    if (code) candidates.push({ type: "code", m: code });
    if (url) candidates.push({ type: "url", m: url });

    if (candidates.length === 0) {
      nodes.push(rest);
      break;
    }

    candidates.sort((a, b) => (a.m.index ?? 0) - (b.m.index ?? 0));
    const { type, m } = candidates[0];
    const start = m.index ?? 0;
    if (start > 0) nodes.push(rest.slice(0, start));
    const key = `${kp}-${n++}`;

    if (type === "link") {
      nodes.push(anchor(resolveHref(m[2]), parseInline(m[1], key), key));
    } else if (type === "bold") {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {parseInline(m[1], key)}
        </strong>
      );
    } else if (type === "italic") {
      nodes.push(<em key={key}>{parseInline(m[1], key)}</em>);
    } else if (type === "code") {
      nodes.push(
        <code key={key} className="font-mono text-[0.85em] text-foreground">
          {m[1]}
        </code>
      );
    } else {
      // Bare URL. Pull trailing sentence punctuation back out of the link.
      let href = m[0];
      let trailing = "";
      while (/[.,;:!?]$/.test(href)) {
        trailing = href.slice(-1) + trailing;
        href = href.slice(0, -1);
      }
      nodes.push(anchor(href, href, key));
      if (trailing) nodes.push(trailing);
    }

    rest = rest.slice(start + m[0].length);
  }

  return nodes;
}

function renderTable(rows: string[], k: number): ReactNode {
  const cells = (r: string) =>
    r
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((c) => c.trim());

  const header = cells(rows[0]);
  const body = rows.slice(2).map(cells); // rows[1] is the |---|---| separator

  return (
    <div key={`t${k}`} className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {header.map((c, j) => (
              <th
                key={j}
                className="border border-border bg-muted px-3 py-2 text-left align-top font-semibold text-foreground"
              >
                {parseInline(c, `th${k}-${j}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((c, j) => (
                <td key={j} className="border border-border px-3 py-2 align-top text-muted-foreground">
                  {parseInline(c, `td${k}-${ri}-${j}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const HEADING_CLASS: Record<number, string> = {
  1: "text-2xl font-semibold text-foreground",
  2: "text-xl font-semibold text-foreground mt-10",
  3: "text-lg font-medium text-foreground mt-6",
  4: "text-base font-medium text-foreground mt-4",
};

const isHr = (s: string) => /^-{3,}$/.test(s);
const isBullet = (s: string) => /^[-*]\s+/.test(s);
const isOrdered = (s: string) => /^\d+\.\s+/.test(s);
const isHeading = (s: string) => /^#{1,6}\s+/.test(s);

/** Render a legal `.md` document to React nodes. */
export function renderLegalDoc(md: string): ReactNode {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Drop maintainer-only blockquotes and blank lines.
    if (trimmed === "" || trimmed.startsWith(">")) {
      i++;
      continue;
    }

    if (isHr(trimmed)) {
      blocks.push(<hr key={key++} className="my-8 border-border" />);
      i++;
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (h) {
      const level = h[1].length;
      const cls = HEADING_CLASS[level] ?? HEADING_CLASS[4];
      const content = parseInline(h[2], `h${key}`);
      const k = key++;
      blocks.push(
        level <= 1 ? (
          <h1 key={k} className={cls}>{content}</h1>
        ) : level === 2 ? (
          <h2 key={k} className={cls}>{content}</h2>
        ) : level === 3 ? (
          <h3 key={k} className={cls}>{content}</h3>
        ) : (
          <h4 key={k} className={cls}>{content}</h4>
        )
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const tbl: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tbl.push(lines[i].trim());
        i++;
      }
      blocks.push(renderTable(tbl, key++));
      continue;
    }

    if (isBullet(trimmed) || isOrdered(trimmed)) {
      const ordered = isOrdered(trimmed);
      const items: string[] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        const marker = ordered ? isOrdered(lt) : isBullet(lt);
        if (marker) {
          items.push(lt.replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ""));
          i++;
        } else if (lt !== "" && /^\s+\S/.test(lines[i]) && items.length > 0) {
          // Indented continuation of the previous item.
          items[items.length - 1] += " " + lt;
          i++;
        } else {
          break;
        }
      }
      const k = key++;
      const itemNodes = items.map((it, j) => (
        <li key={j} className="leading-relaxed">
          {parseInline(it, `li${k}-${j}`)}
        </li>
      ));
      blocks.push(
        ordered ? (
          <ol key={k} className="my-4 flex list-decimal flex-col gap-2 pl-6 text-sm text-muted-foreground">
            {itemNodes}
          </ol>
        ) : (
          <ul key={k} className="my-4 flex list-disc flex-col gap-2 pl-6 text-sm text-muted-foreground">
            {itemNodes}
          </ul>
        )
      );
      continue;
    }

    // Paragraph: gather consecutive soft-wrapped lines.
    const para: string[] = [];
    while (i < lines.length) {
      const lt = lines[i].trim();
      if (
        lt === "" ||
        lt.startsWith(">") ||
        lt.startsWith("|") ||
        isHr(lt) ||
        isHeading(lt) ||
        isBullet(lt) ||
        isOrdered(lt)
      ) {
        break;
      }
      para.push(lt);
      i++;
    }
    const k = key++;
    blocks.push(
      <p key={k} className="my-4 text-sm leading-relaxed text-muted-foreground">
        {parseInline(para.join(" "), `p${k}`)}
      </p>
    );
  }

  return <div className="flex flex-col">{blocks}</div>;
}
