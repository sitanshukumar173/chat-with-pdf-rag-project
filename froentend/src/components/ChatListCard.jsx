export default function ChatListCard({
    chats,
    activeChatId,
    deletingChatId,
    onCreateChat,
    onOpenChat,
    onDeleteChat,
}) {
    return (
        <div className="mb-4 rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Chats</p>
                <button
                    onClick={onCreateChat}
                    className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs"
                >
                    New
                </button>
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto">
                {chats.map((chat) => (
                    <div
                        key={chat._id}
                        className={`flex items-center gap-2 rounded-lg px-2 py-2 text-xs ${activeChatId === chat._id ? "bg-[var(--accent-soft)]" : "bg-[#faf7f0]"}`}
                    >
                        <button
                            onClick={() => onOpenChat(chat._id)}
                            className="min-w-0 flex-1 truncate text-left"
                        >
                            {chat.title}
                        </button>
                        <button
                            type="button"
                            onClick={() => onDeleteChat(chat._id)}
                            disabled={deletingChatId === chat._id}
                            className="rounded-md border border-[var(--line)] px-2 py-1 text-[10px] text-[#b91c1c] disabled:opacity-50"
                            title="Delete chat"
                        >
                            {deletingChatId === chat._id ? "..." : "Del"}
                        </button>
                    </div>
                ))}
                {!chats.length && <p className="text-xs text-[var(--muted)]">No chats yet. Create one first.</p>}
            </div>
        </div>
    );
}
