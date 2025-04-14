import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { useState } from "react";
import { getThemeByName } from "./theme";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatStyle({
  content,
  selectedThemeName,
}: {
  content: string;
  selectedThemeName: string;
}) {

  const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "text";
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
      navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return !inline && match ? (
      <div className="relative group">
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={copyToClipboard}
            className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <SyntaxHighlighter
          style={getThemeByName(selectedThemeName)}
          language={language}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  const MarkdownComponents = {
    code: CodeBlock,
    p: ({ children }: any) => (
      <p className="mb-4 leading-relaxed">{children}</p>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-base font-bold mb-2 mt-3">{children}</h4>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
    ),
    li: ({ children }: any) => <li className="mb-1">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4">
        {children}
      </blockquote>
    ),
    a: ({ href, children }: any) => (
      <a
        href={href}
        className="text-blue-600 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-300">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-bold">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border border-gray-300 px-4 py-2">{children}</td>
    ),
    hr: () => <hr className="my-6 border-t border-gray-300" />,
    img: ({ src, alt }: any) => (
      <img src={src} alt={alt} className="max-w-full h-auto rounded-lg my-4" />
    ),
  };

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
