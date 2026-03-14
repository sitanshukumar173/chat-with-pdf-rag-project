import { API_BASE } from "../constants/app";

// Streams assistant tokens and reports end metadata in one place.
export async function streamChat({
  path,
  payload,
  token,
  onToken,
  onDone,
  onJson,
}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to chat with backend");
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => ({}));
    onJson(data);
    return typeof data.chatId === "string" ? data.chatId : "";
  }

  if (!response.body) {
    throw new Error("Streaming not supported by this browser");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalSources = [];
  let finalChatId = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const boundary = buffer.indexOf("\n\n");
      if (boundary === -1) break;

      const rawEvent = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);
      if (!rawEvent) continue;

      const lines = rawEvent.split("\n");
      let eventName = "message";
      let dataString = "";

      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataString += line.slice(5).trim();
      }

      if (!dataString) continue;
      const data = JSON.parse(dataString);

      if (eventName === "done") {
        finalSources = Array.isArray(data.sources) ? data.sources : [];
        finalChatId = typeof data.chatId === "string" ? data.chatId : "";
        continue;
      }

      if (eventName === "error") {
        throw new Error(data.message || "Streaming failed");
      }

      if (data.token) {
        onToken(data.token);
      }
    }
  }

  onDone({ sources: [...new Set(finalSources)], chatId: finalChatId });
  return finalChatId;
}
