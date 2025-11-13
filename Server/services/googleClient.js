// server/services/googleClient.js
const fetch = global.fetch ?? require("node-fetch");
const { GoogleAuth } = require("google-auth-library");

// Use a modern Gemini model. Ensure this is also set in your .env file.
const MODEL = process.env.GOOGLE_GENERATIVE_MODEL ||  "gemini-2.0-flash";
const API_KEY = process.env.GOOGLE_API_KEY || null;
const TIMEOUT_MS = parseInt(process.env.GOOGLE_CHAT_REQUEST_TIMEOUT_MS || "30000", 10);

// Use the current v1beta Gemini API endpoint.
const GENERATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function getAccessToken() {
  if (API_KEY) return null;

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token ?? tokenResponse;
  if (!token) throw new Error("Could not obtain Google access token. Check GOOGLE_APPLICATION_CREDENTIALS.");
  return token;
}

/**
 * chat({ messages, max_output_tokens })
 * - messages: array of { role: 'user'|'assistant', content: '...' }
 * Returns assistant text (string)
 */
async function chat({ messages = [], max_output_tokens = 800, temperature = 0.2 } = {}) {
  // ===================================================================
  // FIXED: The entire request body and endpoint URL have been updated
  // to match the modern Gemini API specification.
  // ===================================================================

  // 1. CONSTRUCT THE CORRECT GEMINI API PAYLOAD ('contents')
  const contents = messages.map(msg => ({
    // Gemini uses 'model' for the assistant's role, and 'user' for the user's role.
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(msg.content ?? msg.text ?? "") }]
  }));

  // 2. USE THE CORRECT GEMINI REQUEST BODY STRUCTURE
  const body = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: max_output_tokens,
    }
  };

  // 3. USE THE CORRECT GEMINI ENDPOINT URL
  const endpoint = `${GENERATIVE_BASE}/models/${MODEL}:generateContent`;

  let url = endpoint;
  const headers = { "Content-Type": "application/json" };

  if (API_KEY) {
    url = `${url}?key=${API_KEY}`;
  } else {
    const token = await getAccessToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      // Provide a more detailed error log to the console for easier debugging
      console.error(`Google API Error Details: ${text}`);
      const msg = `Google generative API error ${resp.status}: ${text.slice(0, 200)}`;
      const e = new Error(msg);
      e.name = "GoogleAPIError";
      throw e;
    }

    const json = await resp.json();

    // ===================================================================
    // FIXED: The response parsing logic is now updated for the
    // standard Gemini API response structure.
    // ===================================================================
    let reply = "";
    if (
      json.candidates &&
      json.candidates[0] &&
      json.candidates[0].content &&
      json.candidates[0].content.parts &&
      json.candidates[0].content.parts[0] &&
      json.candidates[0].content.parts[0].text
    ) {
      reply = json.candidates[0].content.parts[0].text;
    } else {
      // Log the unexpected response to help with debugging
      console.warn("Could not parse Gemini response. Full response:", JSON.stringify(json, null, 2));
      reply = "Sorry, I received an unexpected response from the AI.";
    }

    return reply.trim();

  } catch (err) {
    if (err.name === "AbortError") {
      const e = new Error("Request to Google Generative API timed out");
      e.name = "GoogleAPIError";
      throw e;
    }
    // Re-throw other errors
    throw err;
  }
}

module.exports = { chat };