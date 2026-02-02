import { Request, Response } from 'express';
import { chatService } from '../../services/chatService';

export const handleChatMessage = async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }

    const response = await chatService.generateResponse(message, conversationHistory);

    res.json({ response });

  } catch (error) {
    console.error('Chat controller error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      response: 'I encountered an error. Please try again or contact support.'
    });
  }
};
