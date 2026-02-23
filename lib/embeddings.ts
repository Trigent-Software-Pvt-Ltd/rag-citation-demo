import { AzureOpenAI } from "openai";

let embeddingClient: AzureOpenAI | null = null;

function getEmbeddingClient() {
  if (!embeddingClient) {
    embeddingClient = new AzureOpenAI({
      apiKey: process.env.AZURE_EMBED_API_KEY!,
      endpoint: process.env.AZURE_EMBED_ENDPOINT!,
      apiVersion: "2024-06-01",
    });
  }
  return embeddingClient;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getEmbeddingClient();
  const response = await client.embeddings.create({
    model: process.env.AZURE_EMBED_DEPLOYMENT || "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const client = getEmbeddingClient();
  // Azure OpenAI supports batch embedding, but limit to 16 at a time
  const batchSize = 16;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await client.embeddings.create({
      model: process.env.AZURE_EMBED_DEPLOYMENT || "text-embedding-3-small",
      input: batch,
    });
    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}
