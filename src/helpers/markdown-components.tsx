import { CodeBlock } from "./code-block";

export const MarkdownComponents = {
  code: CodeBlock,
  p: ({ children }: any) => <p className="mb-4 leading-relaxed">{children}</p>,
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
