import TelegramBot from 'node-telegram-bot-api';
import logger from '../utils/logger.js';
import * as commands from './commands.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { 
  polling: true,
  onlyFirstMatch: true
});

bot.onText(/\/start/, (msg) => {
  commands.start(bot, msg);
});

bot.onText(/\/help/, (msg) => {
  commands.help(bot, msg);
});

bot.onText(/\/weather(?:\s+(.+))?/, (msg, match) => {
  commands.weather(bot, msg, match);
});

bot.onText(/\/remind(?:\s+(.+))?/, (msg, match) => {
  commands.remind(bot, msg, match);
});

bot.onText(/\/status/, (msg) => {
  commands.status(bot, msg);
});

bot.onText(/\/id/, (msg) => {
  commands.userId(bot, msg);
});

bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  
  try {
    bot.sendChatAction(chatId, 'typing');
    const response = await generateAIResponse(msg.text);
    
    const maxLength = 4096;
    if (response.length <= maxLength) {
      await bot.sendMessage(chatId, response);
    } else {
      const chunks = response.match(new RegExp(`.{1,${maxLength}}`, 'g'));
      for (const chunk of chunks) {
        await bot.sendMessage(chatId, chunk);
      }
    }
  } catch (error) {
    logger.error('Error processing message:', error);
    bot.sendMessage(chatId, '❌ Sorry, I encountered an error. Please try again later.');
  }
});

bot.on('polling_error', (error) => {
  logger.error('Telegram polling error:', error);
});

async function generateAIResponse(userMessage) {
  try {
    // Placeholder for Anthropic API call
    return `📝 You said: "${userMessage}"\n\n` +
      `I'm your Moltbot assistant! Use /help to see commands.`;
  } catch (error) {
    logger.error('AI generation error:', error);
    return '❌ AI service temporarily unavailable. Please try again later.';
  }
}

logger.info('🤖 Telegram bot initialized and polling');

export default bot;
