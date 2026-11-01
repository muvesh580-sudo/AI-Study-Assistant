import { useState } from "react";
import { CloseIcon, MoonIcon, PlusIcon, SunIcon } from "./Icons";

function Sidebar({
  conversations,
  activeId,
  isOpen,
  theme,
  onClose,
  onNewChat,
  onSelect,
  onToggleTheme,
  onLogout,
}) {
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const visibleConversations = query
    ? conversations.filter(({ question }) => question.toLowerCase().includes(query))
    : conversations;

  return (
    <>
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-panel transition-transform
        lg:visible lg:static lg:translate-x-0 ${
          isOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <h1 className="text-lg font-semibold text-ink">
            <span className="text-accent-ink">AI</span> Study Assistant
          </h1>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close history"
            className="rounded-lg p-1.5 text-muted hover:bg-raised hover:text-ink lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-2 p-4">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            <PlusIcon />
            New chat
          </button>

          <input
            type="search"
            aria-label="Search conversations"
            placeholder="Search conversations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
          />
        </div>

        <nav aria-label="Conversation history" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {visibleConversations.map((conversation) => (
            <button
              type="button"
              key={conversation._id}
              onClick={() => onSelect(conversation)}
              aria-current={conversation._id === activeId ? "true" : undefined}
              className={`block w-full rounded-lg px-3 py-2 text-left transition ${
                conversation._id === activeId ? "bg-accent-soft" : "hover:bg-raised"
              }`}
            >
              <span className="block truncate text-sm text-ink">
                {conversation.question}
              </span>
              <span className="block text-xs capitalize text-muted">
                {conversation.mode}
              </span>
            </button>
          ))}

          {visibleConversations.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted">
              {query ? "No matching conversations." : "Your conversations will appear here."}
            </p>
          )}
        </nav>

        <div className="flex items-center gap-2 border-t border-line p-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted transition hover:bg-raised hover:text-ink"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg px-2 py-1.5 text-sm text-danger transition hover:bg-danger-soft"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
