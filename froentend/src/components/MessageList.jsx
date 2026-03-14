import { formatTime } from "../utils/chatHelpers";

export default function MessageList({ messages, isStreaming, chatLoading, scrollRef }) {
  return (
    <div className="scroll-shell flex-1 space-y-4 overflow-y-auto p-5">
      {chatLoading && (
        <p className="text-xs text-[var(--muted)]">Loading chat messages...</p>
      )}
      {messages.map((message) => (
        <article
          key={message.id}
          className={`max-w-[92%] rounded-2xl border px-4 py-3 md:max-w-[82%] ${message.role === "user" ? "ml-auto border-[#bfd8c8] bg-[#eaf6ef]" : "border-[var(--line)] bg-[#fff]"}`}
        >
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {message.role === "user" ? "You" : "Assistant"} • {formatTime(message.createdAt)}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-6">
            {message.text || (message.role === "assistant" && isStreaming ? "Thinking" : "")}
            {message.role === "assistant" && isStreaming && !message.text && (
              <span className="stream-caret">|</span>
            )}
          </p>
          {message.role === "assistant" && message.sources?.length > 0 && (
            <p className="mt-3 text-xs text-[var(--muted)]">
              Sources: {message.sources.join(", ")}
            </p>
          )}
        </article>
      ))}

      <div ref={scrollRef} />
    </div>
  );
}
