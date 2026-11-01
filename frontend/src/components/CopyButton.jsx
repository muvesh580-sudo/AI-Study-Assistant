import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "./Icons";

function CopyButton({ text }) {
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (status === "idle") return;

    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-raised hover:text-ink"
    >
      {status === "copied" ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">
        {status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy"}
      </span>
    </button>
  );
}

export default CopyButton;
