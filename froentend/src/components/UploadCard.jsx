export default function UploadCard({
    token,
    activeChatId,
    selectedFile,
    setSelectedFile,
    isUploading,
    uploadProgress,
    uploadPhase,
    uploadMessage,
    canUpload,
    onUpload,
    fileInputRef,
}) {
    const visibleProgress = Math.max(uploadProgress, isUploading ? 6 : 0);

    return (
        <div className="rounded-2xl border border-[var(--line)] bg-[#fff] p-4">
            <label htmlFor="pdf-input" className="mb-2 block text-sm font-medium">
                Upload PDF
            </label>
            {!token && (
                <p className="mb-3 text-xs text-[#b91c1c]">Login first to upload and chat.</p>
            )}
            {token && !activeChatId && (
                <p className="mb-3 text-xs text-[#b91c1c]">Create or open a chat before uploading a PDF.</p>
            )}
            <input
                ref={fileInputRef}
                id="pdf-input"
                type="file"
                accept="application/pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                disabled={!token || !activeChatId}
                className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent-soft)] file:px-3 file:py-2 file:text-[var(--accent)]"
            />

            {selectedFile && (
                <p className="mt-2 truncate text-xs text-[var(--muted)]">{selectedFile.name}</p>
            )}

            {isUploading && (
                <div className="mt-3">
                    <div className="h-2 w-full rounded-full bg-[#efe8da]">
                        <div
                            className="h-2 rounded-full bg-[var(--accent)] transition-all duration-300"
                            style={{ width: `${visibleProgress}%` }}
                        />
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                        {uploadPhase === "processing"
                            ? "Upload complete. Processing PDF on the server..."
                            : `Uploading PDF... ${uploadProgress}%`}
                    </p>
                </div>
            )}

            <button
                type="button"
                onClick={onUpload}
                disabled={!canUpload}
                className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#8ea597]"
            >
                {isUploading
                    ? uploadPhase === "processing"
                        ? "Processing..."
                        : "Uploading..."
                    : "Upload PDF"}
            </button>

            {uploadMessage && (
                <p className="mt-3 text-xs text-[var(--muted)]">{uploadMessage}</p>
            )}
            <p className="mt-3 text-xs text-[var(--muted)]">
                One chat supports one PDF. Create a new chat for another PDF.
            </p>
        </div>
    );
}
