import './App.css'
import Auth from './components/Auth';
import { useState, useEffect } from 'react';
import { askAI, getConversations} from "./services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("explain");
  const [conversations, setConversations] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );

  useEffect(() => {
    if(!isAuthenticated) {
      return;
    }
    const loadConversations = async () => {
      try {
        const data = await getConversations();
        setConversations(data);
      } catch (error) {
        console.error("Failed to load conversations:", error.message);
      }
    }
    loadConversations();
  }, [isAuthenticated]);

  const handleConversationClick = (conversation) => {
    setQuestion(conversation.question);
    setMode(conversation.mode);
    setAnswer(conversation.answer);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(!question.trim()) return;

    try{
      setLoading(true);
      setAnswer("");
      setError("");

      const data = await askAI(question, mode);
      
      setAnswer(data.answer);

      const updateConversations = await getConversations();
      setConversations(updateConversations);

      setAnswer(data.answer);
    } catch(error) {
      setError(error.message);
    } finally{
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setConversations([]);
    setIsAuthenticated(false);
  }

  if(!isAuthenticated) {
    return (
      <Auth setIsAuthenticated={setIsAuthenticated}/>
    );
  }

 return (
  <div className="min-h-screen bg-slate-950 text-white flex justify-center items-center w-full px-4">
    <div className='w-full max-w-3xl'>

      <h1 className="text-4xl sm:text-5xl font-bold text-center tracking-tight">
        <span className="text-blue-500">AI</span> Study Assistant
      </h1>

      <div className="fixed right-6 top-6 z-50">
        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
        >
          Logout
        </button>
      </div>

      <p className="text-center text-sm sm:text-base text-slate-400 mb-10">
        Learn smarter with your personal AI study assistant.
      </p>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
  <button
    type="button"
    onClick={() => setMode("explain")}
    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
      mode === "explain"
        ? "bg-blue-600 text-white"
        : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
    }`}
  >
    🧠 Explain
  </button>

  <button
    type="button"
    onClick={() => setMode("summarize")}
    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
      mode === "summarize"
        ? "bg-blue-600 text-white"
        : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
    }`}
  >
    📝 Summarize
  </button>

  <button
    type="button"
    onClick={() => setMode("quiz")}
    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
      mode === "quiz"
        ? "bg-blue-600 text-white"
        : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
    }`}
  >
    ❓ Quiz
  </button>

  <button
    type="button"
    onClick={() => setMode("flashcards")}
    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
      mode === "flashcards"
        ? "bg-blue-600 text-white"
        : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
    }`}
  >
    🃏 Flashcards
  </button>
</div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <textarea
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
             mode === "explain"
               ? "What topic do you want me to explain?"
               : mode === "summarize"
               ? "Paste your notes or text here..."
               : mode === "quiz"
               ? "What topic should I create a quiz about?"
               : "What topic should I make flashcards for?"
            }
          rows={2}
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
          <span className="flex items-center gap-2">
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
              <div
                key={conversation._id}
                onClick={() => handleConversationClick(conversation)}
                className="cursor-pointer rounded-xl border border-slate-700/80 
                bg-slate-900/60 p-4 transition hover:border-blue-500/50
                hover:bg-slate-800/70"
              >
                <p className="font-medium text-slate-200">
                  {conversation.question}
                </p>

                <p className="mt-1 text-sm text-slate-500 capitalize">
                  {conversation.mode}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
         <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
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
        <div className="mt-8 rounded-2xl border border-slate-700/80 
        bg-slate-900/70 p-6 shadow-xl shadow-black/20">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <span>🤖</span>
              <span>AI Answer</span>
          </h2>
          <div className="text-left text-slate-300 leading-8 space-y-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {answer}
              </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  </div>
);
}

export default App;
