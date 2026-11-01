import { memo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components = {
  a: ({ node: _node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
};

// Memoized so typing in the question box doesn't re-parse the answer on every keystroke.
const MarkdownAnswer = memo(function MarkdownAnswer({ answer, onRendered }) {
  // Runs here rather than in App so the answer has its full height before scrolling.
  useEffect(() => {
    onRendered();
  }, [answer, onRendered]);

  return (
    <div className="markdown-body text-left leading-7 space-y-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {answer}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownAnswer;
