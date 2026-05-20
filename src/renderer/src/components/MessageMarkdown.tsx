import { forwardRef, memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renderer de markdown para las burbujas del assistant.
 * Cubre H1-H4, negritas, italic, listas, code inline + bloques, blockquotes,
 * tablas (gfm), links (que abrimos en browser externo), task lists.
 * Estilos atados al theme oscuro de iTutor.
 */
const components: Components = {
  h1: ({ children, ...p }) => (
    <h1
      {...p}
      className="mt-3 mb-2 text-base font-bold tracking-tight text-white first:mt-0"
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...p }) => (
    <h2
      {...p}
      className="mt-3 mb-2 text-sm font-bold tracking-tight text-white first:mt-0"
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...p }) => (
    <h3
      {...p}
      className="mt-2.5 mb-1.5 text-sm font-semibold text-white/95 first:mt-0"
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...p }) => (
    <h4
      {...p}
      className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wider text-white/70 first:mt-0"
    >
      {children}
    </h4>
  ),
  p: ({ children, ...p }) => (
    <p {...p} className="mb-2 last:mb-0 leading-relaxed">
      {children}
    </p>
  ),
  strong: ({ children, ...p }) => (
    <strong {...p} className="font-semibold text-white">
      {children}
    </strong>
  ),
  em: ({ children, ...p }) => (
    <em {...p} className="italic text-white/90">
      {children}
    </em>
  ),
  ul: ({ children, ...p }) => (
    <ul {...p} className="mb-2 ml-4 list-disc space-y-0.5 marker:text-white/40">
      {children}
    </ul>
  ),
  ol: ({ children, ...p }) => (
    <ol
      {...p}
      className="mb-2 ml-4 list-decimal space-y-0.5 marker:text-white/40"
    >
      {children}
    </ol>
  ),
  li: ({ children, ...p }) => (
    <li {...p} className="leading-relaxed">
      {children}
    </li>
  ),
  a: ({ children, href, ...p }) => (
    <a
      {...p}
      href={href}
      onClick={(e) => {
        e.preventDefault();
        if (href) window.open(href, "_blank", "noopener,noreferrer");
      }}
      className="text-[hsl(var(--accent-2))] underline decoration-[hsl(var(--accent-2))]/40 underline-offset-2 hover:decoration-[hsl(var(--accent-2))]"
    >
      {children}
    </a>
  ),
  code: ({ inline, children, className, ...p }: any) => {
    if (inline) {
      return (
        <code
          {...p}
          className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12px] text-[hsl(var(--accent-2))]"
        >
          {children}
        </code>
      );
    }
    return (
      <code {...p} className={className}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...p }) => (
    <pre
      {...p}
      className="my-2 overflow-x-auto rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-[12px] leading-relaxed"
    >
      {children}
    </pre>
  ),
  blockquote: ({ children, ...p }) => (
    <blockquote
      {...p}
      className="my-2 border-l-2 border-[hsl(var(--accent))]/60 pl-3 italic text-white/75"
    >
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-white/10" />,
  table: ({ children, ...p }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-white/10">
      <table {...p} className="w-full border-collapse text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...p }) => (
    <thead {...p} className="bg-white/5">
      {children}
    </thead>
  ),
  th: ({ children, ...p }) => (
    <th
      {...p}
      className="border-b border-white/10 px-2.5 py-1.5 text-left font-semibold text-white"
    >
      {children}
    </th>
  ),
  td: ({ children, ...p }) => (
    <td
      {...p}
      className="border-b border-white/5 px-2.5 py-1.5 text-white/85"
    >
      {children}
    </td>
  ),
  input: ({ ...p }) => (
    <input
      {...p}
      disabled
      className="mr-1.5 align-middle accent-[hsl(var(--accent))]"
    />
  ),
};

interface MessageMarkdownProps {
  text: string;
  className?: string;
}

export const MessageMarkdown = memo(
  forwardRef<HTMLDivElement, MessageMarkdownProps>(function MessageMarkdown(
    { text, className },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={className}
        data-itutor-md
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {text}
        </ReactMarkdown>
      </div>
    );
  })
);
