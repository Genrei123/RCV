import { Router } from 'express';
import { handleChatMessage } from '../../controllers/chat/chatController';

const router = Router();

// POST /api/v1/chat - Send message to chatbot
router.post('/', handleChatMessage);

export default router;
