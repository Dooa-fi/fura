// Shows AI output (Markdown) as nicely formatted text.
import ReactMarkdown from "react-markdown";

export function Markdown({ text }: { text: string }) {
  return <div className="prose-fura"><ReactMarkdown>{text}</ReactMarkdown></div>;
}
