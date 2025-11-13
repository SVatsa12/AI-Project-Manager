// src/components/Chatbot.jsx
import React, { useState, useEffect, useRef } from "react";

export default function Chatbot({ openInitially = false }) {
  const [open, setOpen] = useState(Boolean(openInitially));
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi — I'm the AITaskManager helper. Ask me about features, how to get started, or the demo flow.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to bottom whenever messages change or when chat opens
  useEffect(() => {
    if (open) {
      // allow layout to settle then scroll
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }, [messages, open]);

  // Focus textarea when chat opens
  useEffect(() => {
    if (open) {
      // small timeout to wait for render
      setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [open]);

  // Global handlers: open-chat / close-chat / reset-chat
  useEffect(() => {
    const openHandler = () => setOpen(true);
    const closeHandler = () => setOpen(false);
    const resetHandler = () =>
      setMessages([
        {
          role: "assistant",
          text: "Hi — I'm the AITaskManager helper. Ask me about features, how to get started, or the demo flow.",
        },
      ]);

    window.addEventListener("open-chat", openHandler);
    window.addEventListener("close-chat", closeHandler);
    window.addEventListener("reset-chat", resetHandler);

    return () => {
      window.removeEventListener("open-chat", openHandler);
      window.removeEventListener("close-chat", closeHandler);
      window.removeEventListener("reset-chat", resetHandler);
    };
  }, []);

  // Auto-resize textarea to fit content
  function adjustTextareaHeight(el) {
    if (!el) return;
    el.style.height = "auto";
    const h = el.scrollHeight;
    // clamp to max height if required (e.g., 160px)
    const max = 160;
    el.style.height = `${Math.min(h, max)}px`;
  }

  useEffect(() => {
    adjustTextareaHeight(textareaRef.current);
  }, [input]);

  // Send message to server
  async function sendMessage(e) {
    if (e?.preventDefault) e.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (loading) return; // prevent double-send

    // append user's message immediately
    const userMsg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        // try to parse useful error message
        let errText;
        try {
          const t = await res.text();
          errText = t || `${res.status} ${res.statusText}`;
        } catch {
          errText = `${res.status} ${res.statusText}`;
        }
        throw new Error(errText);
      }

      const data = await res.json();
      const reply = data?.reply ?? data?.message ?? "Sorry — no reply from assistant.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      const message =
        err.name === "AbortError"
          ? "The request timed out. Please try again."
          : "Sorry — I couldn't reach the assistant. Try again later.";
      setMessages((m) => [...m, { role: "assistant", text: message }]);
    } finally {
      setLoading(false);
    }
  }

  // handle Enter to send, Shift+Enter for newline
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50" aria-live="polite">
      {/* Toggle button when closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="group flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105"
          style={{
            backdropFilter: 'blur(10px)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 50%, rgba(99, 102, 241, 0.95) 100%)',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
          }}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center font-bold text-lg backdrop-blur-sm border border-white/20 shadow-inner">
            AI
          </div>
          <span className="text-sm font-semibold">Chat with AI</span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          role="dialog"
          aria-label="AITaskManager chat"
          className="flex flex-col w-80 md:w-96 h-[600px] rounded-3xl overflow-hidden backdrop-blur-xl border border-white/20"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.95) 100%)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
          }}
        >
          {/* Header with glossy effect */}
          <div 
            className="flex items-center justify-between px-5 py-4 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-white/30 to-white/10 rounded-full flex items-center justify-center text-white font-bold text-lg backdrop-blur-sm border border-white/30 shadow-lg">
                AI
              </div>
              <div>
                <div className="text-sm font-bold text-white drop-shadow-sm">AITaskManager Assistant</div>
                <div className="text-xs text-white/90">Powered by Gemini AI</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  setMessages([
                    {
                      role: "assistant",
                      text: "Hi — I'm the AITaskManager helper. Ask me about features, how to get started, or the demo flow.",
                    },
                  ])
                }
                title="Reset conversation"
                className="text-xs text-white/90 hover:text-white px-2 py-1 rounded-lg hover:bg-white/20 transition-all backdrop-blur-sm"
              >
                ↻ Reset
              </button>

              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-all text-xl"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-gray-50/50 to-white/50" style={{ minHeight: 0 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"} animate-fadeIn`}>
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl break-words whitespace-pre-line shadow-md ${
                    m.role === "assistant"
                      ? "bg-white/90 text-gray-800 rounded-tl-sm backdrop-blur-sm border border-gray-200/50"
                      : "bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-sm"
                  }`}
                  style={
                    m.role === "assistant"
                      ? { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)' }
                      : { boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)' }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input area with glossy effect */}
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200/50 backdrop-blur-xl bg-white/80">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  rows={1}
                  className="w-full resize-none px-4 py-3 pr-12 rounded-2xl border border-gray-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all bg-white/90 backdrop-blur-sm shadow-inner text-gray-800 placeholder-gray-400"
                  style={{ 
                    maxHeight: '120px',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
                    overflowY: input.length > 100 ? 'auto' : 'hidden'
                  }}
                  aria-label="Chat message"
                  disabled={loading}
                />
                <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                  {input.length > 0 ? `${input.length}` : '↵'}
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md"
                style={{
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                {loading ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
