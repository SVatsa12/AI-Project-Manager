// src/pages/LandingPage.jsx
import React, { useState, useEffect } from "react";
import Hero from "../ui/Hero";
import Features from "../ui/Features";
import CTA from "../ui/CTA";
import Footer from "../ui/Footer";
import Logo from "../ui/Logo";
import AuthModal from "../ui/AuthModal";
import PolicyModal from "../ui/PolicyModal";
import HowItWorks from "../ui/HowItWorks";
// Chatbot component - adjust path if your components folder is elsewhere
import Chatbot from "../components/Chatbot";

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signup"); // 'signup' | 'login'
  const [policy, setPolicy] = useState(null); // 'privacy' | 'terms' | null
  const [showChat, setShowChat] = useState(false); // controls chatbot mounting

  // Smooth scroll helper (safely checks for element)
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Global event listeners:
  // - 'open-auth' with { detail: { mode: 'signup'|'login' } }
  // - 'open-feature-request' with { detail: featureId } -> forwards 'open-feature' and scrolls
  // - 'open-chat' (no detail) -> toggles/opens chatbot
  useEffect(() => {
    function openAuthHandler(e) {
      const detail = (e && e.detail) || {};
      const mode = detail.mode === "login" ? "login" : "signup";
      setAuthMode(mode);
      setShowAuth(true);
    }

    function openFeatureRequestHandler(e) {
      const fid = e && e.detail;
      if (fid) {
        // forward event for Features to handle opening its modal
        window.dispatchEvent(new CustomEvent("open-feature", { detail: fid }));
        // scroll to features section
        scrollToId("features");
      }
    }

    function openChatHandler() {
      setShowChat(true);
    }

    window.addEventListener("open-auth", openAuthHandler);
    window.addEventListener("open-feature-request", openFeatureRequestHandler);
    window.addEventListener("open-chat", openChatHandler);

    return () => {
      window.removeEventListener("open-auth", openAuthHandler);
      window.removeEventListener("open-feature-request", openFeatureRequestHandler);
      window.removeEventListener("open-chat", openChatHandler);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="header-transparent sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-white/40">
        <div className="container-max mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
          </div>

          <nav className="flex items-center gap-4">
            <button
              onClick={() => scrollToId("features")}
              className="text-slate-600 hover:text-slate-900"
            >
              Features
            </button>

            <button
              onClick={() => scrollToId("how")}
              className="text-slate-600 hover:text-slate-900"
            >
              How it works
            </button>

            <button
              onClick={() => {
                setAuthMode("signup");
                setShowAuth(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md hover:from-indigo-600 hover:to-purple-700 transition"
            >
              Get started
            </button>

            {/* Chat open button */}
            <button
              onClick={() => setShowChat((s) => !s)}
              title={showChat ? "Close chat" : "Open chat"}
              className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white shadow-sm hover:shadow-md transition"
            >
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                AI
              </span>
              <span className="text-sm text-slate-700">{showChat ? "Chat" : "Help"}</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <Hero onGetStarted={() => { setAuthMode("signup"); setShowAuth(true); }} />

        {/* How it works - can request feature modal or auth */}
        <HowItWorks
          onOpenFeature={(stepId) => {
            const map = {
              "step-1": "ai-split",
              "step-2": "effort-dashboard",
              "step-3": "fairness-index",
              "step-4": "reports",
            };
            const featureId = map[stepId];
            if (featureId) {
              window.dispatchEvent(new CustomEvent("open-feature-request", { detail: featureId }));
            }
          }}
          onOpenAuth={() => { setAuthMode("signup"); setShowAuth(true); }}
        />

        {/* Features (listens for 'open-feature' to open per-feature modal) */}
        <Features onOpenAuth={() => { setAuthMode("signup"); setShowAuth(true); }} />

        {/* CTA (dispatches open-auth or handled directly by CTA.jsx) */}
        <CTA />
      </main>

      {/* Footer with policy buttons */}
      <Footer onOpenPolicy={(which) => setPolicy(which)} />

      {/* Modals */}
      <AuthModal open={showAuth} mode={authMode} onClose={() => setShowAuth(false)} />
      <PolicyModal open={!!policy} type={policy} onClose={() => setPolicy(null)} />

      {/* Chatbot (mounted/unmounted by showChat). 
          We remount the component when showChat toggles by using the boolean as a key,
          so Chatbot's openInitially prop reliably controls initial open state. */}
      {/*
        NOTE: Chatbot.jsx expects prop `openInitially` (boolean) to decide whether it starts open.
        We pass `openInitially={true}` when calling it from the UI; when you dispatch window.open-chat
        the global handler above will also set showChat true which mounts it.
      */}
      {showChat && (
        <Chatbot openInitially={true} key={showChat ? "chat-open" : "chat-closed"} />
      )}
    </div>
  );
}
