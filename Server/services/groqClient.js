// server/services/groqClient.js
const fetch = global.fetch ?? require("node-fetch");

const MODEL = process.env.GROQ_MODEL || "llama3-70b-8192";
const API_KEY = process.env.GROQ_API_KEY || null;
const TIMEOUT_MS = parseInt(process.env.GROQ_CHAT_REQUEST_TIMEOUT_MS || "30000", 10);

const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";

/**
 * chat({ messages, max_output_tokens })
 * - messages: array of { role: 'user'|'assistant'|'system', content: '...' }
 * Returns assistant text (string)
 */
async function chat({ messages = [], max_output_tokens = 800, temperature = 0.2 } = {}) {
  if (!API_KEY) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
  }

  const body = {
    model: MODEL,
    messages: messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : msg.role,
      content: String(msg.content ?? msg.text ?? "")
    })),
    temperature,
    max_tokens: max_output_tokens,
  };

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(GROQ_BASE, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error(`Groq API Error Details: ${text}`);
      const msg = `Groq API error ${resp.status}: ${text.slice(0, 200)}`;
      const e = new Error(msg);
      e.name = "GroqAPIError";
      throw e;
    }

    const json = await resp.json();

    let reply = "";
    if (
      json.choices &&
      json.choices[0] &&
      json.choices[0].message &&
      json.choices[0].message.content
    ) {
      reply = json.choices[0].message.content;
    } else {
      console.warn("Could not parse Groq response. Full response:", JSON.stringify(json, null, 2));
      reply = "Sorry, I received an unexpected response from the AI.";
    }

    return reply.trim();

  } catch (err) {
    if (err.name === "AbortError") {
      const e = new Error("Request to Groq API timed out");
      e.name = "GroqAPIError";
      throw e;
    }
    throw err;
  }
}

module.exports = { chat };
