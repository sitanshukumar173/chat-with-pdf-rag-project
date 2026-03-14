export function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapServerMessage(msg) {
  return {
    id: msg._id || makeId(),
    role: msg.role,
    text: msg.text,
    createdAt: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
    sources: msg.sources || [],
  };
}

export function assistantSeed(text) {
  return {
    id: makeId(),
    role: "assistant",
    text,
    createdAt: Date.now(),
    sources: [],
  };
}
