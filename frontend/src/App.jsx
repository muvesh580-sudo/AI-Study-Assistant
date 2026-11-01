import Auth from './components/Auth';
import { lazy, Suspense, useCallback, useState, useEffect, useRef } from 'react';
import { askAI, getConversations} from "./services/api";

const MarkdownAnswer = lazy(() => import("./components/MarkdownAnswer"));

const MODES = [
  { id: "explain", label: "🧠 Explain", placeholder: "What topic do you want me to explain?" },
  { id: "summarize", label: "📝 Summarize", placeholder: "Paste your notes or text here..." },
  { id: "quiz", label: "❓ Quiz", placeholder: "What topic should I create a quiz about?" },
  { id: "flashcards", label: "🃏 Flashcards", placeholder: "What topic should I make flashcards for?" },
];

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("explain");
  const [conversations, setConversations] = useState([]);
  const [authNotice, setAuthNotice] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );
  const askController = useRef(null);
  const answerRef = useRef(null);

  // Everything here belongs to one user and must not survive into the next login.
  const endSession = (notice = "") => {
    askController.current?.abort();
    localStorage.removeItem("token");
    setQuestion("");
    setAnswer("");
    setError("");
    setMode("explain");
    setConversations([]);
    setLoading(false);
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
    setQuestion(conversation.question);
    setMode(conversation.mode);
    setAnswer(conversation.answer);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(!question.trim()) return;

    const controller = new AbortController();
    askController.current = controller;

    try{
      setLoading(true);
      setAnswer("");
      setError("");

      const data = await askAI(question, mode, controller.signal);

      setAnswer(data.answer);
      setConversations((current) => [data.conversation, ...current]);
    } catch(error) {
      handleRequestError(error);
    } finally{
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  if(!isAuthenticated) {
    return (
      <Auth setIsAuthenticated={setIsAuthenticated} notice={authNotice}/>
    );
  }

  const activeMode = MODES.find(({ id }) => id === mode) ?? MODES[0];

 return (
  <div className="min-h-screen bg-slate-950 text-white flex justify-center items-center w-full px-4 py-20">
    <div className='w-full max-w-3xl'>

      <h1 className="text-4xl sm:text-5xl font-bold text-center tracking-tight text-white">
        <span className="text-blue-500">AI</span> Study Assistant
      </h1>

      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <button
          onClick={() => endSession()}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
        >
          Logout
        </button>
      </div>

      <p className="mt-3 text-center text-sm sm:text-base text-slate-400 mb-10">
        Learn smarter with your personal AI study assistant.
      </p>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === id
                ? "bg-blue-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <textarea
          aria-label="Your question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={activeMode.placeholder}
          rows={2}
          maxLength={20000}
          className="flex-1 rounded-xl
          bg-slate-900/80 border border-slate-700 px-4 py-3.5
          text-white placeholder-slate-500 outline-none transition resize-none
          focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />

        <button type="submit"
        disabled={loading}
        className="rounded-xl bg-blue-600 px-6 py-3.5
        font-semibold shadow-lg shadow-blue-600/20 transition
        hover:bg-blue-500 hover:-translate-y-0.5
        disabled:cursor-not-allowed disabled:opacity-50"
        >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
            Thinking...
            </span>
          ) : (
            "Ask AI"
          )}
        </button>
      </form>

      {conversations.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Recent Conversations
          </h2>

          <div className="space-y-2">
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation._id}
                onClick={() => handleConversationClick(conversation)}
                className="block w-full cursor-pointer rounded-xl border border-slate-700/80
                bg-slate-900/60 p-4 transition hover:border-blue-500/50
                hover:bg-slate-800/70"
              >
                <span className="block font-medium text-slate-200 line-clamp-2 break-words">
                  {conversation.question}
                </span>

                <span className="mt-1 block text-sm text-slate-500 capitalize">
                  {conversation.mode}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
         <div role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
           ⚠️ {error}
           </div>
)}

      {!answer && !error && !loading && conversations.length === 0 && (
        <div className='mt-10 text-center'>
          <p className='text-sm text-slate-500'>
            Ask anything you're studying — I'll help you understand it.
          </p>
        </div>
      )}

      {answer && (
        <div ref={answerRef} className="mt-8 scroll-mt-20 rounded-2xl border border-slate-700/80
        bg-slate-900/70 p-6 shadow-xl shadow-black/20">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
              <span>🤖</span>
              <span>AI Answer</span>
          </h2>
          <Suspense fallback={<p className="text-left text-slate-400">Loading answer...</p>}>
            <MarkdownAnswer answer={answer} onRendered={scrollToAnswer} />
          </Suspense>
        </div>
      )}
    </div>
  </div>
);
}

export default App;
