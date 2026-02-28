import logger from '../utils/logger.js';
import bot from '../bot/index.js';

export const getStatus = (req, res) => {
  res.json({
    status: 'active',
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: process.env.npm_package_version
  });
};

export const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'moltbot-api',
    timestamp: new Date().toISOString()
  });
};

export const telegramWebhook = (req, res) => {
  const update = req.body;
  logger.info('Received webhook update:', update);
  res.sendStatus(200);
};

export const getUsers = async (req, res) => {
  try {
    res.json({ 
      success: true,
      users: [
        { id: 1, username: 'user1', chatId: 123456789 },
        { id: 2, username: 'user2', chatId: 987654321 }
      ]
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const broadcastMessage = async (req, res) => {
  const { message, userIds } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const targets = userIds || [];
    
    if (targets.length === 0) {
      return res.json({ success: true, message: 'Broadcast queued (no users to send to)' });
    }

    const results = await Promise.allSettled(
      targets.map(async (userId) => {
        try {
          await bot.sendMessage(userId, `📢 *Broadcast:*\n\n${message}`, { parse_mode: 'Markdown' });
          return { userId, success: true };
        } catch (error) {
          return { userId, success: false, error: error.message };
        }
      })
    );

    res.json({
      success: true,
      sent: results.filter(r => r.value?.success).length,
      failed: results.filter(r => !r.value?.success).length,
      details: results.map(r => r.value)
    });
  } catch (error) {
    logger.error('Broadcast error:', error);
    res.status(500).json({ error: 'Broadcast failed' });
  }
};

export const getStats = async (req, res) => {
  try {
    res.json({
      success: true,
      stats: {
        totalUsers: 2,
        totalMessages: 150,
        activeToday: 1,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version
      }
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
