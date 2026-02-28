import logger from '../utils/logger.js';
import axios from 'axios';

export const start = (bot, msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  bot.sendMessage(
    chatId,
    `👋 *Hello ${firstName}! Welcome to Moltbot.*\n\n` +
    `I'm your AI assistant powered by Claude 3.5 Sonnet. I can:\n\n` +
    `✅ Answer questions and chat\n` +
    `✅ Set reminders (/remind)\n` +
    `✅ Check weather (/weather)\n` +
    `✅ Show bot status (/status)\n` +
    `✅ Tell your user ID (/id)\n\n` +
    `Use /help to see all commands.\n\n` +
    `_Your Telegram ID: \`${msg.from.id}\`_`,
    { parse_mode: 'Markdown' }
  );
  
  logger.info(`User ${chatId} started the bot`);
};

export const help = (bot, msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(
    chatId,
    `📚 *Available Commands*\n\n` +
    `*/start* - Welcome message\n` +
    `*/help* - Show this help\n` +
    `*/weather [city]* - Get weather info\n` +
    `*/remind [time] [message]* - Set reminder\n` +
    `*/status* - Bot status & uptime\n` +
    `*/id* - Show your Telegram ID\n\n` +
    `Just type any message to chat with AI!`,
    { parse_mode: 'Markdown' }
  );
};

export const weather = async (bot, msg, match) => {
  const chatId = msg.chat.id;
  const city = match[1];
  
  if (!city) {
    bot.sendMessage(chatId, '🌤 *Please provide a city name.*\nExample: `/weather Dhaka`', { parse_mode: 'Markdown' });
    return;
  }

  bot.sendChatAction(chatId, 'typing');
  
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      bot.sendMessage(chatId, '⚠️ Weather service not configured.');
      return;
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`
    );
    
    const data = response.data;
    bot.sendMessage(
      chatId,
      `🌤 *Weather in ${data.name}, ${data.sys.country}*\n\n` +
      `• Condition: ${data.weather[0].description}\n` +
      `• Temperature: ${data.main.temp}°C (feels like ${data.main.feels_like}°C)\n` +
      `• Humidity: ${data.main.humidity}%\n` +
      `• Wind: ${data.wind.speed} m/s\n`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Weather API error:', error.message);
    bot.sendMessage(chatId, '❌ Could not fetch weather. Please check city name and try again.');
  }
};

export const remind = (bot, msg, match) => {
  const chatId = msg.chat.id;
  const reminder = match[1];
  
  if (!reminder) {
    bot.sendMessage(chatId, '⏰ *Please provide reminder details.*\nExample: `/remind 2pm Team meeting`', { parse_mode: 'Markdown' });
    return;
  }

  bot.sendMessage(
    chatId,
    `✅ *Reminder set!*\n\n` +
    `⏰ Time: ${reminder.split(' ')[0]}\n` +
    `📝 Message: ${reminder.split(' ').slice(1).join(' ') || 'Reminder'}\n`,
    { parse_mode: 'Markdown' }
  );
  
  logger.info(`Reminder set for user ${chatId}: ${reminder}`);
};

export const status = (bot, msg) => {
  const chatId = msg.chat.id;
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  bot.sendMessage(
    chatId,
    `📊 *Moltbot Status*\n\n` +
    `• Status: 🟢 Online\n` +
    `• Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
    `• Version: ${process.env.npm_package_version || '1.0.0'}\n` +
    `• Node: ${process.version}\n` +
    `• Platform: ${process.platform}\n` +
    `• Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB\n` +
    `• Time: ${new Date().toLocaleString()}`,
    { parse_mode: 'Markdown' }
  );
};

export const userId = (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || 'No username';
  
  bot.sendMessage(
    chatId,
    `🆔 *Your Telegram Information*\n\n` +
    `• User ID: \`${userId}\`\n` +
    `• Username: @${username}\n` +
    `• First Name: ${msg.from.first_name}\n` +
    `• Chat Type: ${msg.chat.type}\n\n` +
    `_You need this ID to set yourself as admin in .env_`,
    { parse_mode: 'Markdown' }
  );
};
