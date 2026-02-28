import axios from 'axios';
import logger from './utils/logger.js';

class APIManager {
  constructor() {
    this.providers = {};
    this.healthStatus = {};
    this.usageCount = {};
    this.userSubscription = new Map();
    this.loadConfig();
    this.startHealthCheck();
  }

  loadConfig() {
    // প্রোভাইডার লিস্ট ম্যানুয়ালি ডিফাইন করা (কারণ .env ছোট)
    this.providers = {
      WEATHER: [
        {
          name: 'open-meteo',
          type: 'free',
          priority: 1,
          baseUrl: 'https://api.open-meteo.com/v1',
          rateLimit: 1000,
          usage: 0,
          healthy: true
        },
        {
          name: 'openweathermap',
          type: 'free',
          priority: 2,
          apiKey: process.env.OPENWEATHER_API_KEY,
          baseUrl: 'https://api.openweathermap.org/data/2.5',
          rateLimit: 60,
          usage: 0,
          healthy: true
        }
      ].filter(p => p.name !== 'openweathermap' || p.apiKey),

      AI: [
        {
          name: 'gemini',
          type: 'free',
          priority: 1,
          apiKey: process.env.GEMINI_API_KEY,
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
          rateLimit: 60,
          usage: 0,
          healthy: true
        },
        {
          name: 'openai',
          type: 'premium',
          priority: 2,
          apiKey: process.env.OPENAI_API_KEY,
          baseUrl: 'https://api.openai.com/v1',
          rateLimit: 5000,
          usage: 0,
          healthy: true
        },
        {
          name: 'claude',
          type: 'premium',
          priority: 3,
          apiKey: process.env.CLAUDE_API_KEY,
          baseUrl: 'https://api.anthropic.com/v1',
          rateLimit: 5000,
          usage: 0,
          healthy: true
        }
      ].filter(p => p.apiKey),

      NEWS: [
        {
          name: 'newsapi',
          type: 'free',
          priority: 1,
          apiKey: process.env.NEWSAPI_KEY,
          baseUrl: 'https://newsapi.org/v2',
          rateLimit: 100,
          usage: 0,
          healthy: true
        },
        {
          name: 'gnews',
          type: 'free',
          priority: 2,
          apiKey: process.env.GNEWS_API_KEY,
          baseUrl: 'https://gnews.io/api/v4',
          rateLimit: 100,
          usage: 0,
          healthy: true
        }
      ].filter(p => p.apiKey),

      TRANSLATION: [
        {
          name: 'deepl',
          type: 'free',
          priority: 1,
          apiKey: process.env.DEEPL_API_KEY,
          baseUrl: 'https://api-free.deepl.com/v2',
          rateLimit: 500000,
          usage: 0,
          healthy: true
        }
      ].filter(p => p.apiKey)
    };
  }

  startHealthCheck() {
    const interval = (process.env.HEALTH_CHECK_INTERVAL || 60) * 1000;
    setInterval(async () => {
      for (const service in this.providers) {
        for (const provider of this.providers[service]) {
          try {
            await this.pingProvider(service, provider);
            this.healthStatus[`${service}_${provider.name}`] = true;
          } catch {
            this.healthStatus[`${service}_${provider.name}`] = false;
            logger.warn(`⚠️ ${service} ${provider.name} health check failed`);
          }
        }
      }
    }, interval);
  }

  async pingProvider(service, provider) {
    if (service === 'WEATHER' && provider.name === 'open-meteo') {
      await axios.get(`${provider.baseUrl}/forecast?latitude=23.8&longitude=90.4&current_weather=true`, { timeout: 5000 });
    } else if (service === 'AI' && provider.name === 'gemini') {
      await axios.get(`${provider.baseUrl}/models?key=${provider.apiKey}`, { timeout: 5000 });
    } else {
      if (provider.baseUrl) {
        await axios.get(provider.baseUrl, { timeout: 5000 }).catch(() => {});
      }
    }
  }

  getUserType(userId) {
    return this.userSubscription.get(userId) || 'free';
  }

  async getBestProvider(service, userId) {
    const userType = this.getUserType(userId);
    const threshold = process.env.RATE_LIMIT_THRESHOLD / 100;
    const available = this.providers[service]
      .filter(p => this.healthStatus[`${service}_${p.name}`] !== false)
      .filter(p => userType === 'premium' || p.type === 'free')
      .filter(p => (p.usage || 0) < (p.rateLimit * threshold));

    if (available.length === 0) return null;

    const strategy = process.env.FALLBACK_STRATEGY || 'priority';
    if (strategy === 'priority') {
      return available.sort((a, b) => a.priority - b.priority)[0];
    } else if (strategy === 'round-robin') {
      const index = (this.lastIndex?.[service] || 0) % available.length;
      this.lastIndex = this.lastIndex || {};
      this.lastIndex[service] = index + 1;
      return available[index];
    }
    return available[0];
  }

  async callAPI(service, endpoint, params, userId = null) {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const provider = await this.getBestProvider(service, userId);
      if (!provider) break;

      try {
        const result = await this.makeRequest(service, provider, endpoint, params);
        provider.usage = (provider.usage || 0) + 1;
        return result;
      } catch (error) {
        this.healthStatus[`${service}_${provider.name}`] = false;
        attempts++;
        logger.error(`${service} ${provider.name} failed: ${error.message}`);
      }
    }

    const anyProvider = this.providers[service].find(p => this.healthStatus[`${service}_${p.name}`]);
    if (anyProvider) {
      return this.makeRequest(service, anyProvider, endpoint, params);
    }

    throw new Error(`❌ All ${service} providers are down.`);
  }

  async makeRequest(service, provider, endpoint, params) {
    let url, config;

    if (service === 'WEATHER') {
      if (provider.name === 'open-meteo') {
        url = `${provider.baseUrl}/forecast`;
        config = { params: { latitude: params.lat, longitude: params.lon, current_weather: true } };
      } else if (provider.name === 'openweathermap') {
        url = `${provider.baseUrl}/weather`;
        config = { params: { q: params.city, appid: provider.apiKey, units: 'metric' } };
      }
    } else if (service === 'AI') {
      if (provider.name === 'gemini') {
        url = `${provider.baseUrl}/models/gemini-1.5-pro:generateContent?key=${provider.apiKey}`;
        config = {
          method: 'POST',
          data: { contents: [{ parts: [{ text: params.prompt }] }] }
        };
      } else if (provider.name === 'openai') {
        url = `${provider.baseUrl}/chat/completions`;
        config = {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          data: { model: 'gpt-4o', messages: [{ role: 'user', content: params.prompt }] }
        };
      } else if (provider.name === 'claude') {
        url = `${provider.baseUrl}/messages`;
        config = {
          method: 'POST',
          headers: { 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01' },
          data: { model: 'claude-3-sonnet', max_tokens: 1024, messages: [{ role: 'user', content: params.prompt }] }
        };
      }
    } else if (service === 'NEWS') {
      if (provider.name === 'newsapi') {
        url = `${provider.baseUrl}/top-headlines`;
        config = { params: { country: 'us', apiKey: provider.apiKey } };
      } else if (provider.name === 'gnews') {
        url = `${provider.baseUrl}/top-headlines`;
        config = { params: { country: 'us', token: provider.apiKey } };
      }
    } else if (service === 'TRANSLATION') {
      if (provider.name === 'deepl') {
        url = `${provider.baseUrl}/translate`;
        config = {
          method: 'POST',
          headers: { 'Authorization': `DeepL-Auth-Key ${provider.apiKey}` },
          data: { text: params.text, target_lang: params.target }
        };
      }
    }

    if (!url) throw new Error(`No URL defined for ${service} ${provider.name}`);
    const response = await axios({ url, ...config, timeout: 10000 });
    return response.data;
  }

  setPremium(userId) {
    this.userSubscription.set(userId, 'premium');
  }
}

export default new APIManager();
