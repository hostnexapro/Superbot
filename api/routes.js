import express from 'express';
import * as controllers from './controllers.js';

const router = express.Router();

router.get('/status', controllers.getStatus);
router.post('/webhook/telegram', controllers.telegramWebhook);
router.get('/health', controllers.healthCheck);
router.get('/users', controllers.getUsers);
router.post('/broadcast', controllers.broadcastMessage);
router.get('/stats', controllers.getStats);

export default router;
