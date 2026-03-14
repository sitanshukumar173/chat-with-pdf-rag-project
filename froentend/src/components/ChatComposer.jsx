export default function ChatComposer({
  token,
  activeChatId,
  input,
  setInput,
  onSend,
  isStreaming,
  canSend,
}) {
  function handleInputKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="border-t border-[var(--line)] p-4">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
        <textarea
          rows={3}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={
            !token
              ? "Login to start chatting..."
              : !activeChatId
                ? "Create or open a chat first..."
                : "Ask about the PDF uploaded to this chat..."
          }
          disabled={!token || !activeChatId}
          className="w-full resize-none border-0 bg-transparent text-sm outline-none placeholder:text-[#9e978e]"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-[var(--muted)]">Enter to send • Shift+Enter for newline</p>
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#8ea597]"
          >
            {isStreaming ? "Writing..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
