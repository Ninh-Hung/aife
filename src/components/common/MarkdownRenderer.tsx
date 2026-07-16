import React, { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import type { ChatSource } from '../../types';

interface MarkdownRendererProps {
  text: string;
  className?: string;
  sources?: ChatSource[];
}

type MarkdownNode = {
  type?: string;
  value?: string;
  url?: string;
  title?: string;
  children?: MarkdownNode[];
};

function getTextContent(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getTextContent).join('');
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getTextContent(node.props.children);
  }

  return '';
}

const inlineCodeClassName =
  'rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-rose-600 dark:bg-slate-900 dark:text-rose-300';

function createCitationPlugin(sources: ChatSource[]) {
  const sourceByMarker = new Map(
    sources
      .filter((source) => source.url)
      .map((source) => [source.marker, { url: source.url as string, title: source.title }])
  );

  return () => (tree: MarkdownNode) => {
    if (sourceByMarker.size === 0) return;
    linkCitationMarkers(tree, sourceByMarker);
  };
}

function linkCitationMarkers(
  node: MarkdownNode,
  sourceByMarker: Map<string, { url: string; title: string }>
) {
  if (!node.children || node.type === 'link') return;

  node.children = node.children.flatMap((child) => {
    if (child.type !== 'text' || !child.value) {
      linkCitationMarkers(child, sourceByMarker);
      return [child];
    }

    return child.value.split(/(\[\d+\])/g).flatMap((part): MarkdownNode[] => {
      if (!part) return [];
      const source = sourceByMarker.get(part);
      if (!source) return [{ type: 'text', value: part }];

      return [
        {
          type: 'link',
          url: source.url,
          title: source.title,
          children: [{ type: 'text', value: part }],
        },
      ];
    });
  });
}

const components: Components = {
  h1: ({ children, ...props }) => (
    <h1 className="mb-2 mt-3 text-xl font-semibold leading-snug first:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="mb-2 mt-3 text-lg font-semibold leading-snug first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mb-1.5 mt-3 text-base font-semibold leading-snug first:mt-0" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-2 last:mb-0" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="pl-1 leading-relaxed" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="mb-2 border-l-2 border-gray-300 pl-3 text-gray-600 last:mb-0 dark:border-slate-600 dark:text-slate-300"
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ children, ...props }) => (
    <a
      className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-700 dark:text-sky-300 dark:decoration-sky-500/60 dark:hover:text-sky-200"
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  table: ({ children, ...props }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table
        className="min-w-full border-collapse overflow-hidden rounded-md border border-gray-200 text-left text-sm dark:border-slate-700"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gray-50 dark:bg-slate-900/70" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border border-gray-200 px-2.5 py-1.5 font-semibold dark:border-slate-700"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-gray-200 px-2.5 py-1.5 align-top dark:border-slate-700" {...props}>
      {children}
    </td>
  ),
  code: ({ className, children, ...props }) => (
    <code className={className ? `${className} font-mono` : inlineCodeClassName} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
};

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeElement = React.Children.toArray(children).find(React.isValidElement);
  const className = React.isValidElement<{ className?: string }>(codeElement)
    ? codeElement.props.className
    : '';
  const language = className?.match(/language-([\w-]+)/)?.[1] || 'text';
  const code = useMemo(() => getTextContent(children).replace(/\n$/, ''), [children]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className="mb-3 overflow-hidden rounded-md border border-slate-700 bg-slate-950 text-slate-100 last:mb-0">
      <div className="flex min-h-9 items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 py-1.5">
        <span className="truncate font-mono text-xs text-slate-300">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy code"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-3 text-[13px] leading-relaxed">{children}</pre>
    </div>
  );
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  text,
  className = '',
  sources = [],
}) => {
  const remarkPlugins = useMemo(() => {
    if (sources.length === 0) return [remarkGfm];
    return [remarkGfm, createCitationPlugin(sources)];
  }, [sources]);

  return (
    <div className={`markdown-renderer min-w-0 break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
