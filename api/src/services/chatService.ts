import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { chatDatabaseService } from './chatDatabaseService';

dotenv.config();

const openai = new OpenAI({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  apiKey: process.env.AI_API_KEY || ''
});

const SYSTEM_PROMPT = `You are the RCV (Regulatory Compliance Verification) system assistant. You are a helpful, professional AI assistant that ONLY answers questions related to the RCV platform and system.

**YOUR ROLE:**
- Help users understand the RCV platform features and functionality
- Provide information about registered products and companies in the RCV database
- Explain blockchain verification and CFPR registration numbers
- Guide users on how to use the RCV system

**STRICT RULES:**
1. **ONLY answer questions about:**
   - RCV platform features and how to use them
   - Registered products and companies
   - CFPR (Certificate of Feed Product Registration) numbers
   - LTO (License to Operate) numbers
   - Blockchain verification and technology
   - Product registration and verification processes
   - Company information in the RCV database

2. **DO NOT answer questions about:**
   - General knowledge unrelated to RCV
   - Other companies or products not in RCV database
   - Political topics, news, entertainment, or personal advice
   - Programming, cooking, travel, or any other non-RCV topics

3. **If asked about unrelated topics, respond with:**
   "I'm the RCV Assistant and I can only help with questions about the RCV platform, registered products, companies, and blockchain verification. How can I assist you with RCV-related information?"

4. **Be helpful and professional:**
   - Provide clear, concise answers
   - Use formatting (bold, lists, code blocks) when appropriate
   - If you don't have specific information, suggest contacting RCV support

**Remember:** You are specialized in RCV only. Stay focused on your purpose.`;

class ChatService {
  async generateResponse(userMessage: string, conversationHistory: any[] = []): Promise<string> {
    try {
      // Step 1: Extract keywords and search database
      const keywords = chatDatabaseService.extractKeywords(userMessage);
      const [products, companies] = await Promise.all([
        chatDatabaseService.searchProducts(keywords),
        chatDatabaseService.searchCompanies(keywords),
      ]);

      // Step 2: Build context from database results
      let databaseContext = '';
      
      if (products.length > 0) {
        databaseContext += '\n\n**REGISTERED PRODUCTS FOUND:**\n';
        databaseContext += products.map(p => chatDatabaseService.formatProductData(p)).join('\n\n');
      }
      
      if (companies.length > 0) {
        databaseContext += '\n\n**REGISTERED COMPANIES FOUND:**\n';
        databaseContext += companies.map(c => chatDatabaseService.formatCompanyData(c)).join('\n\n');
      }

      // Step 3: Build system prompt with database context
      const systemPromptWithContext = SYSTEM_PROMPT + 
        (databaseContext ? `\n\n---\n\n**DATABASE SEARCH RESULTS:**${databaseContext}\n\nUse the above information to answer the user's question accurately.` : '');

      // Step 4: Build messages array
      const messages: any[] = [
        {
          role: 'system',
          content: systemPromptWithContext
        }
      ];

      // Add conversation history
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Step 5: Call Gemini via OpenAI SDK
      const completion = await openai.chat.completions.create({
        model: 'gemini-2.5-flash',
        messages: messages,
      });

      const responseText = completion.choices[0].message.content;
      
      if (!responseText) {
        throw new Error('No response from AI');
      }

      return responseText;

    } catch (error) {
      console.error('Chat service error:', error);
      throw new Error('Failed to generate response');
    }
  }
}

export const chatService = new ChatService();
