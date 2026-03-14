export function buildRagPrompt(contextText: string, question: string): string {
  return `
      You are a helpful assistant. Use the following pieces of extracted context from a PDF to answer the question.
      If you don't know the answer based on the context, just say that you don't know.
      Don't try to make up an answer.

      CONTEXT:
      ${contextText}

      QUESTION:
      ${question}
    `;
}
