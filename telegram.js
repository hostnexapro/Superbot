const { Telegraf } = require('telegraf');
const Anthropic = require('@anthropic-ai/sdk');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log('❌ টেলিগ্রাম টোকেন দেওয়া নেই');
  module.exports = null;
  return;
}

const bot = new Telegraf(token);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// কমান্ড হ্যান্ডলার
bot.start((ctx) => {
  ctx.reply('👋 হ্যালো! আমি আপনার Claude AI বট।\nযেকোনো প্রশ্ন করুন, আমি উত্তর দেব।');
});

bot.help((ctx) => {
  ctx.reply(
    '📚 *সাহায্য*\n\n' +
    '/start - বট চালু করুন\n' +
    '/help - সাহায্য দেখুন\n' +
    'শুধু টেক্সট মেসেজ পাঠান – আমি উত্তর দেব।\n\n' +
    'ভবিষ্যতে আরও কমান্ড যুক্ত হবে!',
    { parse_mode: 'Markdown' }
  );
});

// সাধারণ টেক্সট মেসেজ হ্যান্ডলার
bot.on('text', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    
    const userMsg = ctx.message.text;
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userMsg }],
      system: "আপনি একজন সহায়ক AI অ্যাসিস্ট্যান্ট। আপনি বাংলা ও ইংরেজি উভয় ভাষায় উত্তর দেন।"
    });
    
    await ctx.reply(response.content[0].text);
  } catch (error) {
    console.error('Claude API error:', error);
    ctx.reply('⚠️ দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। পরে আবার চেষ্টা করুন।');
  }
});

// বট চালু
bot.launch()
  .then(() => console.log('🤖 টেলিগ্রাম বট চালু হয়েছে'))
  .catch(err => console.error('টেলিগ্রাম বট চালু হয়নি:', err));

// গ্রেসফুল শাটডাউন
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
