const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Anthropic = require('@anthropic-ai/sdk');

if (!process.env.ANTHROPIC_API_KEY) {
  console.log('❌ Anthropic API কী দেওয়া নেই');
  module.exports = null;
  return;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'moltbot' }),
  puppeteer: { args: ['--no-sandbox'] } // Render-এ প্রয়োজন
});

client.on('qr', (qr) => {
  console.log('📱 হোয়াটসঅ্যাপ QR কোড স্ক্যান করুন:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ হোয়াটসঅ্যাপ বট প্রস্তুত');
});

client.on('message', async (message) => {
  // শুধু !ai দিয়ে শুরু মেসেজে সাড়া দেবে
  if (message.body.startsWith('!ai ')) {
    const userMsg = message.body.slice(4);
    await message.reply('🤔 ভাবছি...');
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: userMsg }],
        system: "আপনি একজন সহায়ক AI অ্যাসিস্ট্যান্ট। আপনি বাংলা ও ইংরেজি উত্তর দেন।"
      });
      
      await message.reply(response.content[0].text);
    } catch (error) {
      console.error('Claude API error:', error);
      await message.reply('❌ কিছু সমস্যা হয়েছে, আবার চেষ্টা করুন।');
    }
  }
});

client.initialize();

module.exports = client;
