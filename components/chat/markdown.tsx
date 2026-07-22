"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders assistant replies as Markdown (tables, lists, bold, headings)
// styled to match the app instead of raw text.
export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
        ul: ({ children }) => <ul className="my-1.5 list-disc pl-5 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="my-1.5 list-decimal pl-5 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => <h3 className="mt-3 mb-1 text-sm font-bold text-slate-900 first:mt-0">{children}</h3>,
        h2: ({ children }) => <h3 className="mt-3 mb-1 text-sm font-bold text-slate-900 first:mt-0">{children}</h3>,
        h3: ({ children }) => <h4 className="mt-3 mb-1 text-sm font-semibold text-slate-900 first:mt-0">{children}</h4>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#2a78d6] underline underline-offset-2">
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-slate-700">{children}</code>
        ),
        hr: () => <hr className="my-2 border-black/5" />,
        blockquote: ({ children }) => (
          <blockquote className="my-1.5 border-l-2 border-slate-300 pl-3 text-slate-600">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="thin-scroll my-2 max-w-full overflow-x-auto rounded-xl ring-1 ring-black/5">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
        tr: ({ children }) => <tr className="border-b border-black/5 last:border-0">{children}</tr>,
        th: ({ children }) => (
          <th className="whitespace-nowrap px-2.5 py-1.5 text-left font-medium text-slate-500">{children}</th>
        ),
        td: ({ children }) => <td className="whitespace-nowrap px-2.5 py-1.5 text-slate-800">{children}</td>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
