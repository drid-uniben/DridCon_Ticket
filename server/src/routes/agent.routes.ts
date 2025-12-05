import { Router } from 'express';
import agentController from '../controllers/agent.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/me', authenticateToken, agentController.getDashboard); 

export default router;
