import { apiClient } from './api';

export interface SimilarCodeResult {
  file: {
    id: string;
    name: string;
    language: string;
  };
  chunk: {
    id: string;
    content: string;
    startLine: number;
    endLine: number;
    type: string;
  };
  similarity: number;
}

class EmbeddingService {
  async generateEmbeddings(sessionId: string, apiKey: string) {
    return apiClient.post('/embeddings/generate', {
      sessionId,
      apiKey,
    });
  }

  async generateEmbeddingForFile(fileId: string, apiKey: string) {
    return apiClient.post(`/embeddings/generate/${fileId}`, {
      apiKey,
    });
  }

  async searchSimilarCode(query: string, sessionId: string, apiKey: string, limit = 5) {
    return apiClient.post<{
      success: boolean;
      results: SimilarCodeResult[];
      query: string;
    }>('/embeddings/search', {
      query,
      sessionId,
      apiKey,
      limit,
    });
  }
}

export const embeddingService = new EmbeddingService();