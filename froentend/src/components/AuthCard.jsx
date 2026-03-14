export default function AuthCard({
    token,
    authMode,
    setAuthMode,
    authName,
    setAuthName,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authLoading,
    authError,
    user,
    onSubmit,
    onLogout,
}) {
    return (
        <div className="mb-4 rounded-2xl border border-[var(--line)] bg-white p-4">
            {!token ? (
                <form onSubmit={onSubmit} className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                        {authMode === "login" ? "Login" : "Create Account"}
                    </p>
                    {authMode === "register" && (
                        <input
                            value={authName}
                            onChange={(event) => setAuthName(event.target.value)}
                            placeholder="Name"
                            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none"
                        />
                    )}
                    <input
                        value={authEmail}
                        onChange={(event) => setAuthEmail(event.target.value)}
                        placeholder="Email"
                        type="email"
                        className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none"
                    />
                    <input
                        value={authPassword}
                        onChange={(event) => setAuthPassword(event.target.value)}
                        placeholder="Password"
                        type="password"
                        className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none"
                    />
                    <button
                        disabled={authLoading}
                        className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
                    >
                        {authLoading ? "Please wait..." : authMode === "login" ? "Login" : "Register"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setAuthMode((prev) => (prev === "login" ? "register" : "login"))}
                        className="w-full text-xs text-[var(--muted)]"
                    >
                        {authMode === "login" ? "Need an account? Register" : "Already have an account? Login"}
                    </button>
                    {authError && <p className="text-xs text-[#b91c1c]">{authError}</p>}
                </form>
            ) : (
                <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Signed in</p>
                    <p className="mt-1 text-sm font-semibold">{user?.name || "User"}</p>
                    <p className="text-xs text-[var(--muted)]">{user?.email}</p>
                    <button
                        onClick={onLogout}
                        className="mt-3 w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
