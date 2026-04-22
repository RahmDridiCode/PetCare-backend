const axios = require('axios');
const Chat = require('../models/Chat');

const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Find or create chat for this user
    let chat = await Chat.findOne({ userId });
    if (!chat) {
      chat = new Chat({ userId, messages: [] });
    }

    // Keep only last 10 messages as context
    const history = (chat.messages || []).slice(-10);

    // Build messages for OpenRouter
    const systemPrompt = {
      role: 'system',
        content: `You are a veterinary assistant chatbot.

Your role is to help users understand their pet's health issues and provide useful guidance.

Always structure your response in 4 parts:

1. Possible causes of the symptoms
2. Simple and safe home care advice
3. Warning signs to watch for
4. When to consult a veterinarian

Rules:
- Be clear, simple, and educational
- Do NOT give a final medical diagnosis
- Be calm and reassuring
- Only recommend a vet when symptoms are serious or persistent
`,
    };

    const messagesForApi = [
      systemPrompt,
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    // Call OpenRouter API
    const resp = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: messagesForApi,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const reply = resp?.data?.choices?.[0]?.message?.content || resp?.data?.choices?.[0]?.text || 'Sorry, I could not generate a reply.';

    // Save messages to DB
    chat.messages.push({ role: 'user', content: message, createdAt: new Date() });
    chat.messages.push({ role: 'assistant', content: reply, createdAt: new Date() });
    await chat.save();

    return res.json({ reply });
  } catch (err) {
    console.error('chatbot error:', err?.response?.data || err.message || err);
    // graceful handling for OpenRouter errors
    if (err.response) {
      return res.status(err.response.status || 502).json({ message: 'AI service error', details: err.response.data });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const history = async (req, res) => {
  try {
    const userId = req.user.userId;
    const chat = await Chat.findOne({ userId });
    const messages = (chat && chat.messages) ? chat.messages.slice().sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)) : [];
    return res.json({ messages });
  } catch (err) {
    console.error('chatbot history error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { sendMessage, history };
