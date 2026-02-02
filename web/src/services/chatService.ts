import { apiClient } from "./axiosConfig";

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatRequest {
    message: string;
    conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
    response: string;
    success: boolean;
    error?: string;
}

export class ChatService {
    /**
     * Send a chat message to the AI assistant
     * @param message - The user's message
     * @param conversationHistory - Previous messages for context
     * @returns The AI assistant's response
     */
    static async sendMessage(message: string, conversationHistory: ChatMessage[] = []): Promise<ChatResponse> {
        try {
            const response = await apiClient.post<ChatResponse>('/chat', {
                message,
                conversationHistory
            });
            
            return response.data;
        } catch (error: any) {
            console.error('Chat error:', error);
            
            // Handle specific error cases
            if (error.response) {
                // Server responded with error
                return {
                    success: false,
                    response: error.response.data?.message || 'Failed to get response from assistant',
                    error: error.response.data?.error
                };
            } else if (error.request) {
                // Request made but no response
                return {
                    success: false,
                    response: 'Unable to connect to the assistant. Please check your connection.',
                    error: 'Network error'
                };
            } else {
                // Something else happened
                return {
                    success: false,
                    response: 'An unexpected error occurred. Please try again.',
                    error: error.message
                };
            }
        }
    }

    /**
     * Check if the chat service is available
     * @returns True if the service is reachable
     */
    static async healthCheck(): Promise<boolean> {
        try {
            // Assuming there's a health endpoint, adjust if needed
            await apiClient.get('/health');
            return true;
        } catch (error) {
            console.error('Chat service health check failed:', error);
            return false;
        }
    }
}
