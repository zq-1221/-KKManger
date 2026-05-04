'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

const components: Partial<Components> = {
  h1: ({ children }) => <h3 className="text-base font-semibold text-gray-900 mt-3 mb-1">{children}</h3>,
  h2: ({ children }) => <h3 className="text-base font-semibold text-gray-900 mt-3 mb-1">{children}</h3>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-medium text-gray-800 mt-2 mb-0.5">{children}</h4>,
  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-1 pl-4 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 pl-4 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="my-0.5 leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isInline = !className?.includes('language-');
    if (isInline) {
      return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm text-rose-600">{children}</code>;
    }
    return (
      <pre className="bg-gray-50 border border-gray-100 rounded-xl p-3 my-2 overflow-x-auto text-sm">
        <code className={className}>{children}</code>
      </pre>
    );
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-emerald-300 pl-3 my-2 text-gray-600 italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-gray-100" />,
};

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-sm text-gray-800 leading-relaxed">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
