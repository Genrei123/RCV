import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { chatDatabaseService } from './chatDatabaseService';
import { chatSanityService } from './chatSanityService';

dotenv.config();

const openai = new OpenAI({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  apiKey: process.env.AI_API_KEY || ''
});

const SYSTEM_PROMPT = `You are "Arcy", the RCV (Regulatory Compliance Verification) system assistant. You are a helpful, professional AI assistant that answers questions related to the RCV platform, its blog content, research, and related literature (RRLs).

**YOUR ROLE:**
- Help users understand the RCV platform features and functionality
- Provide information about registered products and companies in the RCV database
- Explain blockchain verification and CFPR registration numbers
- Guide users on how to use the RCV system
- Answer questions about blog posts, articles, and educational content published on the RCV platform
- Share insights from RCV research and related literature (RRLs)
- Provide information about regulatory compliance trends and best practices covered in RCV content

**STRICT RULES:**
1. **ONLY answer questions about:**
   - RCV platform features and how to use them
   - Registered products and companies
   - CFPR (Certificate of Feed Product Registration) numbers
   - LTO (License to Operate) numbers
   - Blockchain verification and technology
   - Product registration and verification processes
   - Company information in the RCV database
   - Blog posts and articles published on RCV
   - Research papers, studies, and RRLs related to regulatory compliance
   - FAQs about the RCV platform
   - Educational content about food safety and regulatory compliance

2. **DO NOT answer questions about:**
   - General knowledge unrelated to RCV or regulatory compliance
   - Other companies or products not in RCV database
   - Political topics, news, entertainment, or personal advice
   - Programming, cooking, travel, or any other non-RCV topics

3. **If asked about unrelated topics, respond with:**
   "I'm Arcy, the RCV Assistant, and I can only help with questions about the RCV platform, registered products, companies, blockchain verification, and our published content. How can I assist you with RCV-related information?"

4. **Be helpful and professional:**
   - Provide clear, concise answers
   - Use formatting (bold, lists, code blocks) when appropriate
   - Reference specific blog posts or articles when relevant
   - If you don't have specific information, suggest checking the RCV blog or contacting support

**Remember:** You are Arcy, specialized in RCV and its content. Stay focused on your purpose and be friendly!`;

class ChatService {
  async generateResponse(userMessage: string, conversationHistory: any[] = []): Promise<string> {
    try {
      // Step 1: Extract keywords and search database + Sanity CMS
      const keywords = chatDatabaseService.extractKeywords(userMessage);
      
      const [products, companies, sanityContent] = await Promise.all([
        chatDatabaseService.searchProducts(keywords),
        chatDatabaseService.searchCompanies(keywords),
        chatSanityService.searchAllContent(keywords),
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

      // Step 3: Build context from Sanity CMS content
      const sanityContext = chatSanityService.buildSanityContext(
        sanityContent.blogPosts,
        sanityContent.faqs,
        sanityContent.aboutContent
      );

      // Step 4: Build system prompt with all context
      let contextSection = '';
      if (databaseContext || sanityContext) {
        contextSection = '\n\n---\n\n**RELEVANT INFORMATION FROM RCV DATABASE & CONTENT:**';
        if (databaseContext) contextSection += databaseContext;
        if (sanityContext) contextSection += sanityContext;
        contextSection += '\n\nUse the above information to answer the user\'s question accurately. Reference specific blog posts or articles when relevant.';
      }

      const systemPromptWithContext = SYSTEM_PROMPT + contextSection;

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
