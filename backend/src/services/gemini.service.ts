import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logger } from '../utils/logger';

class GeminiService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;
    private selectedModel: string | null = null;

    initialize(apiKey: string) {
        try {
            this.genAI = new GoogleGenerativeAI(apiKey);

            // Use only the free tier Gemini 2.0 Flash model
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            this.selectedModel = 'gemini-2.5-flash';

            logger.info('Gemini API initialized successfully with model: gemini-2.5-flash');
        } catch (error) {
            logger.error('Failed to initialize Gemini API:', error);
            throw error;
        }
    }



    async generateResponse(prompt: string): Promise<string> {
        if (!this.model) {
            throw new Error('Gemini API not initialized');
        }

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            logger.error('Error generating response:', error);
            throw error;
        }
    }

    async generateStreamingResponse(prompt: string): Promise<AsyncGenerator<string>> {
        if (!this.model) {
            throw new Error('Gemini API not initialized');
        }

        try {
            const result = await this.model.generateContentStream(prompt);

            return (async function* () {
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    yield chunkText;
                }
            })();
        } catch (error) {
            logger.error('Error in streaming response:', error);
            throw error;
        }
    }

    isInitialized(): boolean {
        return this.model !== null;
    }

    getSelectedModel(): string | null {
        return this.selectedModel;
    }
}

export const geminiService = new GeminiService();
