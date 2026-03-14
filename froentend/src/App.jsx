import { useEffect, useMemo, useRef, useState } from "react";
import AuthCard from "./components/AuthCard";
import ChatComposer from "./components/ChatComposer";
import ChatListCard from "./components/ChatListCard";
import MessageList from "./components/MessageList";
import UploadCard from "./components/UploadCard";
import { TOKEN_KEY, USER_KEY } from "./constants/app";
import { apiJson } from "./lib/apiClient";
import { streamChat } from "./lib/streamChat";
import { uploadPdf } from "./lib/uploadPdf";
import { assistantSeed, makeId, mapServerMessage } from "./utils/chatHelpers";

function App() {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    });
    const [authMode, setAuthMode] = useState("login");
    const [authName, setAuthName] = useState("");
    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState("");

    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [deletingChatId, setDeletingChatId] = useState("");
    const [messages, setMessages] = useState([
        assistantSeed("Upload a PDF, then ask a question. I will answer from your document context."),
    ]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadMessage, setUploadMessage] = useState("");
    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);

    const canSend = Boolean(token && activeChatId && input.trim().length > 0 && !isStreaming);
    const canUpload = useMemo(() => {
        return Boolean(
            token &&
            activeChatId &&
            selectedFile &&
            !isUploading &&
            selectedFile.type === "application/pdf",
        );
    }, [activeChatId, isUploading, selectedFile, token]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isStreaming]);

    useEffect(() => {
        if (!token) {
            setChats([]);
            setActiveChatId("");
            setSelectedFile(null);
            setUploadMessage("");
            return;
        }

        let cancelled = false;

        // Pull profile + latest chats on login/refresh so the UI can resume quickly.
        async function bootstrapUserData() {
            try {
                const me = await apiJson("/api/v1/auth/me", {}, token);
                if (!cancelled) {
                    setUser(me.user);
                    localStorage.setItem(USER_KEY, JSON.stringify(me.user));
                }

                const chatRes = await apiJson("/api/v1/chats", {}, token);
                if (cancelled) return;
                setChats(chatRes.chats || []);

                if (chatRes.chats?.length && !activeChatId) {
                    const firstChat = chatRes.chats[0];
                    setActiveChatId(firstChat._id);
                    const firstMessagesRes = await apiJson(
                        `/api/v1/chats/${firstChat._id}/messages`,
                        {},
                        token,
                    );
                    if (cancelled) return;

                    const firstChatMessages = (firstMessagesRes.messages || []).map(mapServerMessage);

                    setMessages(
                        firstChatMessages.length
                            ? firstChatMessages
                            : [assistantSeed("This chat has no messages yet. Upload its PDF, then ask a question.")],
                    );
                } else if (!chatRes.chats?.length) {
                    setMessages([
                        assistantSeed("Create a new chat, upload one PDF to it, then ask questions only about that PDF."),
                    ]);
                }
            } catch (error) {
                if (!cancelled) {
                    handleLogout();
                    setAuthError(error instanceof Error ? error.message : "Session error");
                }
            }
        }

        bootstrapUserData();

        return () => {
            cancelled = true;
        };
    }, [activeChatId, token]);

    async function loadChatMessages(chatId, tokenArg = token) {
        if (!chatId || !tokenArg) return;
        setChatLoading(true);
        try {
            const res = await apiJson(`/api/v1/chats/${chatId}/messages`, {}, tokenArg);
            const chatMessages = (res.messages || []).map(mapServerMessage);

            setMessages(
                chatMessages.length
                    ? chatMessages
                    : [assistantSeed("This chat has no messages yet. Ask your question.")],
            );
            setActiveChatId(chatId);
        } finally {
            setChatLoading(false);
        }
    }

    async function refreshChats(tokenArg = token) {
        if (!tokenArg) return;
        const res = await apiJson("/api/v1/chats", {}, tokenArg);
        setChats(res.chats || []);
    }

    async function createNewChat() {
        if (!token) return;
        const res = await apiJson(
            "/api/v1/chats",
            {
                method: "POST",
                body: JSON.stringify({ title: "New Chat" }),
            },
            token,
        );

        setActiveChatId(res.chat._id);
        setMessages([
            assistantSeed("New chat created. Upload one PDF for this chat, then ask questions about that PDF only."),
        ]);
        setSelectedFile(null);
        setUploadMessage("");
        await refreshChats();
    }

    async function handleDeleteChat(chatId) {
        if (!token || !chatId || deletingChatId) return;

        const confirmed = window.confirm("Delete this chat and its PDF data permanently?");
        if (!confirmed) return;

        setDeletingChatId(chatId);
        try {
            await apiJson(
                `/api/v1/chats/${chatId}`,
                {
                    method: "DELETE",
                },
                token,
            );

            const res = await apiJson("/api/v1/chats", {}, token);
            const nextChats = res.chats || [];
            setChats(nextChats);

            if (!nextChats.length) {
                setActiveChatId("");
                setMessages([
                    assistantSeed("No chats yet. Create a new chat and upload one PDF."),
                ]);
                setUploadMessage("");
                setSelectedFile(null);
                return;
            }

            const nextActive = activeChatId === chatId ? nextChats[0]._id : activeChatId;
            setActiveChatId(nextActive);
            await loadChatMessages(nextActive, token);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not delete chat";
            setUploadMessage(message);
        } finally {
            setDeletingChatId("");
        }
    }

    async function handleAuthSubmit(event) {
        event.preventDefault();
        setAuthError("");
        setAuthLoading(true);

        try {
            if (!authEmail.trim() || !authPassword.trim() || (authMode === "register" && !authName.trim())) {
                throw new Error("Please fill all required fields");
            }

            const endpoint = authMode === "register" ? "/api/v1/auth/register" : "/api/v1/auth/login";
            const payload =
                authMode === "register"
                    ? { name: authName.trim(), email: authEmail.trim(), password: authPassword }
                    : { email: authEmail.trim(), password: authPassword };

            const res = await apiJson(endpoint, {
                method: "POST",
                body: JSON.stringify(payload),
            });

            localStorage.setItem(TOKEN_KEY, res.token);
            localStorage.setItem(USER_KEY, JSON.stringify(res.user));
            setToken(res.token);
            setUser(res.user);
            setAuthName("");
            setAuthEmail("");
            setAuthPassword("");
            setAuthMode("login");
        } catch (error) {
            setAuthError(error instanceof Error ? error.message : "Authentication failed");
        } finally {
            setAuthLoading(false);
        }
    }

    function handleLogout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken("");
        setUser(null);
        setChats([]);
        setActiveChatId("");
        setMessages([
            assistantSeed("Login first to access your private chats and PDFs."),
        ]);
        setSelectedFile(null);
        setUploadMessage("");
    }

    async function handleUploadClick() {
        if (!token) {
            setUploadMessage("Login first to upload a PDF.");
            return;
        }
        if (!activeChatId) {
            setUploadMessage("Create or open a chat before uploading a PDF.");
            return;
        }
        if (!canUpload) return;

        try {
            setUploadMessage("");
            setUploadProgress(0);
            setIsUploading(true);

            const response = await uploadPdf(selectedFile, setUploadProgress, token, activeChatId);
            setUploadMessage(response.message || "PDF uploaded successfully.");
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            if (token) {
                await refreshChats();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Upload failed";
            setUploadMessage(message);
        } finally {
            setIsUploading(false);
            setTimeout(() => setUploadProgress(0), 500);
        }
    }

    async function handleSend() {
        const question = input.trim();
        if (!token) {
            setAuthError("Login first to use the assistant.");
            return;
        }
        if (!activeChatId) {
            setUploadMessage("Create or open a chat, then upload its PDF first.");
            return;
        }
        if (!question || isStreaming) return;

        const userMessage = {
            id: makeId(),
            role: "user",
            text: question,
            createdAt: Date.now(),
            sources: [],
        };

        const assistantId = makeId();
        const assistantMessage = {
            id: assistantId,
            role: "assistant",
            text: "",
            createdAt: Date.now(),
            sources: [],
        };

        setInput("");
        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        setIsStreaming(true);

        try {
            const streamPath = "/api/v1/chat/user/stream";
            const chatPath = "/api/v1/chat/user";
            const payload = { question, chatId: activeChatId };
            let streamedAnswer = "";

            try {
                const streamedChatId = await streamChat({
                    path: streamPath,
                    payload,
                    token,
                    onToken: (tokenChunk) => {
                        streamedAnswer += tokenChunk;
                        setMessages((prev) =>
                            prev.map((message) =>
                                message.id === assistantId ? { ...message, text: streamedAnswer } : message,
                            ),
                        );
                    },
                    onDone: ({ sources, chatId }) => {
                        setMessages((prev) =>
                            prev.map((message) =>
                                message.id === assistantId ? { ...message, sources } : message,
                            ),
                        );
                        if (chatId) {
                            setActiveChatId(chatId);
                        }
                    },
                    onJson: (data) => {
                        const text = typeof data.answer === "string" ? data.answer : "No response";
                        const sources = Array.isArray(data.sources) ? data.sources : [];

                        setMessages((prev) =>
                            prev.map((message) =>
                                message.id === assistantId ? { ...message, text, sources } : message,
                            ),
                        );

                        if (typeof data.chatId === "string" && data.chatId) {
                            setActiveChatId(data.chatId);
                        }
                    },
                });

                if (streamedChatId) {
                    setActiveChatId(streamedChatId);
                }
            } catch {
                // If streaming fails, return the answer through the standard JSON route.
                const normal = await apiJson(
                    chatPath,
                    {
                        method: "POST",
                        body: JSON.stringify(payload),
                    },
                    token,
                );

                setMessages((prev) =>
                    prev.map((message) =>
                        message.id === assistantId
                            ? {
                                ...message,
                                text: normal.answer || "No response",
                                sources: Array.isArray(normal.sources) ? normal.sources : [],
                            }
                            : message,
                    ),
                );

                if (typeof normal.chatId === "string" && normal.chatId) {
                    setActiveChatId(normal.chatId);
                }
            }

            if (token) {
                await refreshChats();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Chat request failed";
            setMessages((prev) =>
                prev.map((item) =>
                    item.id === assistantId
                        ? { ...item, text: `Sorry, I could not complete this request. ${message}` }
                        : item,
                ),
            );
        } finally {
            setIsStreaming(false);
        }
    }

    return (
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 md:px-6 md:py-6">
            <div className="grid flex-1 gap-4 md:grid-cols-[320px_1fr]">
                <aside className="rounded-3xl border border-[var(--line)] bg-[var(--bg-panel)] p-5 shadow-sm">
                    <AuthCard
                        token={token}
                        authMode={authMode}
                        setAuthMode={setAuthMode}
                        authName={authName}
                        setAuthName={setAuthName}
                        authEmail={authEmail}
                        setAuthEmail={setAuthEmail}
                        authPassword={authPassword}
                        setAuthPassword={setAuthPassword}
                        authLoading={authLoading}
                        authError={authError}
                        user={user}
                        onSubmit={handleAuthSubmit}
                        onLogout={handleLogout}
                    />

                    <div className="mb-6">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">PDF RAG</p>
                        <h1 className="mt-2 text-2xl font-semibold">Chat with your PDFs</h1>
                        <p className="mt-2 text-sm text-[var(--muted)]">
                            Login is required. Each chat holds one private PDF, and that PDF stays isolated from other users and your other chats.
                        </p>
                    </div>

                    {token && (
                        <ChatListCard
                            chats={chats}
                            activeChatId={activeChatId}
                            deletingChatId={deletingChatId}
                            onCreateChat={createNewChat}
                            onOpenChat={loadChatMessages}
                            onDeleteChat={handleDeleteChat}
                        />
                    )}

                    <UploadCard
                        token={token}
                        activeChatId={activeChatId}
                        selectedFile={selectedFile}
                        setSelectedFile={setSelectedFile}
                        isUploading={isUploading}
                        uploadProgress={uploadProgress}
                        uploadMessage={uploadMessage}
                        canUpload={canUpload}
                        onUpload={handleUploadClick}
                        fileInputRef={fileInputRef}
                    />
                </aside>

                <main className="flex flex-col rounded-3xl border border-[var(--line)] bg-[var(--bg-panel)] shadow-sm">
                    <div className="border-b border-[var(--line)] px-5 py-4">
                        <h2 className="text-lg font-semibold">Assistant</h2>
                        <p className="text-xs text-[var(--muted)]">
                            {token
                                ? activeChatId
                                    ? "Live response streaming enabled"
                                    : "Create or open a chat to begin"
                                : "Login required"}
                        </p>
                    </div>

                    <MessageList
                        messages={messages}
                        isStreaming={isStreaming}
                        chatLoading={chatLoading}
                        scrollRef={scrollRef}
                    />

                    <ChatComposer
                        token={token}
                        activeChatId={activeChatId}
                        input={input}
                        setInput={setInput}
                        onSend={handleSend}
                        isStreaming={isStreaming}
                        canSend={canSend}
                    />
                </main>
            </div>
        </div>
    );
}

export default App;
