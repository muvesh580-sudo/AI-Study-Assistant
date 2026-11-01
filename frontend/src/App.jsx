import Auth from './components/Auth';
import CopyButton from './components/CopyButton';
import { MenuIcon } from './components/Icons';
import Sidebar from './components/Sidebar';
import { lazy, Suspense, useCallback, useState, useEffect, useRef } from 'react';
import { askAI, getConversations} from "./services/api";
import { applyTheme, getInitialTheme } from "./theme";

const MarkdownAnswer = lazy(() => import("./components/MarkdownAnswer"));

const MODES = [
  {
    id: "explain",
    label: "Explain",
    description: "Understand a topic in simple words",
    placeholder: "What topic do you want me to explain?",
  },
  {
    id: "summarize",
    label: "Summarize",
    description: "Turn your notes into key points",
    placeholder: "Paste your notes or text here...",
  },
  {
    id: "quiz",
    label: "Quiz",
    description: "Test yourself with 5 questions",
    placeholder: "What topic should I create a quiz about?",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Make 5 cards for quick revision",
    placeholder: "What topic should I make flashcards for?",
  },
];

function App() {
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("explain");
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const [authNotice, setAuthNotice] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );
  const askController = useRef(null);
  const answerRef = useRef(null);
  const questionRef = useRef(null);

  const clearChat = () => {
    askController.current?.abort();
    setQuestion("");
    setAskedQuestion("");
    setAnswer("");
    setError("");
    setActiveId(null);
    setLoading(false);
  };

  // Everything here belongs to one user and must not survive into the next login.
  const endSession = (notice = "") => {
    clearChat();
    localStorage.removeItem("token");
    setMode("explain");
    setConversations([]);
    setIsHistoryOpen(false);
    setAuthNotice(notice);
    setIsAuthenticated(false);
  };

  const handleRequestError = (error) => {
    if (error.name === "AbortError") return;

    if (error.status === 401) {
      endSession("Your session has expired. Please log in again.");
      return;
    }

    setError(error.message);
  };

  useEffect(() => {
    if(!isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    const loadConversations = async () => {
      try {
        const data = await getConversations(controller.signal);
        setConversations(data);
      } catch (error) {
        handleRequestError(error);
      }
    }
    loadConversations();

    return () => controller.abort();
  }, [isAuthenticated]);

  const scrollToAnswer = useCallback(() => {
    answerRef.current?.scrollIntoView?.({ block: "start" });
  }, []);

  const handleConversationClick = (conversation) => {
    askController.current?.abort();
    setLoading(false);
    setQuestion("");
    setAskedQuestion(conversation.question);
    setMode(conversation.mode);
    setAnswer(conversation.answer);
    setActiveId(conversation._id);
    setError("");
    setIsHistoryOpen(false);
  };

  const handleNewChat = () => {
    clearChat();
    setIsHistoryOpen(false);
    questionRef.current?.focus();
  };

  const handleModeCard = (id) => {
    setMode(id);
    questionRef.current?.focus();
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(!question.trim() || loading) return;

    const controller = new AbortController();
    askController.current = controller;

    try{
      setLoading(true);
      setAskedQuestion(question);
      setAnswer("");
      setError("");
      setActiveId(null);

      const data = await askAI(question, mode, controller.signal);

      setAnswer(data.answer);
      setQuestion("");

      if (data.conversation) {
        setActiveId(data.conversation._id);
        setConversations((current) => [data.conversation, ...current]);
      } else {
        // An older backend can still be live while a new frontend deploys.
        setConversations(await getConversations(controller.signal));
      }
    } catch(error) {
      if (!controller.signal.aborted) {
        setAskedQuestion("");
      }
      handleRequestError(error);
    } finally{
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleQuestionKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      handleSubmit(e);
    }
  };

  if(!isAuthenticated) {
    return (
      <Auth setIsAuthenticated={setIsAuthenticated} notice={authNotice}/>
    );
  }

  const activeMode = MODES.find(({ id }) => id === mode) ?? MODES[0];
  const isEmpty = !askedQuestion && !answer && !loading;

  return (
    <div className="flex h-svh bg-canvas text-ink">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        isOpen={isHistoryOpen}
        theme={theme}
        onClose={() => setIsHistoryOpen(false)}
        onNewChat={handleNewChat}
        onSelect={handleConversationClick}
        onToggleTheme={handleToggleTheme}
        onLogout={() => endSession()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-line px-3 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            aria-label="Open history"
            className="rounded-lg p-1.5 text-muted hover:bg-raised hover:text-ink"
          >
            <MenuIcon />
          </button>
          <span className="font-semibold">
            <span className="text-accent-ink">AI</span> Study Assistant
          </span>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
            {isEmpty && (
              <div className="pt-4 sm:pt-12">
                <h2 className="text-center text-2xl font-semibold sm:text-3xl">
                  What are you studying today?
                </h2>
                <p className="mt-2 text-center text-muted">
                  Pick a way to learn, then ask anything.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {MODES.map(({ id, label, description }) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => handleModeCard(id)}
                      className={`rounded-xl border p-4 text-left transition hover:border-accent ${
                        mode === id ? "border-accent bg-accent-soft" : "border-line bg-panel"
                      }`}
                    >
                      <span className="block font-medium">{label}</span>
                      <span className="mt-0.5 block text-sm text-muted">{description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {askedQuestion && (
              <h2 ref={answer ? answerRef : null} className="scroll-mt-4 whitespace-pre-wrap break-words text-xl font-semibold line-clamp-6">
                {askedQuestion}
              </h2>
            )}

            {loading && (
              <p role="status" className="mt-6 flex items-center gap-2 text-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent"></span>
                Thinking...
              </p>
            )}

            {answer && (
              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2">
                  <h3 className="text-sm font-medium text-muted">AI Answer</h3>
                  <CopyButton text={answer} />
                </div>
                <Suspense fallback={<p className="text-muted">Loading answer...</p>}>
                  <MarkdownAnswer answer={answer} onRendered={scrollToAnswer} />
                </Suspense>
              </section>
            )}

            {error && (
              <div role="alert" className="mt-6 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
          </div>
        </main>

        <div className="border-t border-line bg-canvas px-4 py-3">
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-2 flex gap-1 overflow-x-auto">
              {MODES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={mode === id}
                  onClick={() => setMode(id)}
                  className={`shrink-0 rounded-lg px-3 py-1 text-sm font-medium transition ${
                    mode === id
                      ? "bg-accent-soft text-accent-ink"
                      : "text-muted hover:bg-raised hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={questionRef}
                aria-label="Your question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleQuestionKeyDown}
                placeholder={activeMode.placeholder}
                rows={2}
                maxLength={20000}
                className="min-w-0 flex-1 resize-none rounded-xl border border-line bg-panel px-3 py-2 text-ink outline-none transition
                placeholder:text-muted focus:border-accent"
              />

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-brand px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Thinking..." : "Ask AI"}
              </button>
            </form>

            <p className="mt-1.5 hidden text-xs text-muted sm:block">
              Press Enter to send, Shift + Enter for a new line.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
