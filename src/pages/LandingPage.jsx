import React, { useState } from "react"
import Hero from "../ui/Hero"
import Features from "../ui/Features"
import CTA from "../ui/CTA"
import Footer from "../ui/Footer"
import Logo from "../ui/Logo"
import AuthModal from "../ui/AuthModal"

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="header-transparent sticky top-0 z-30">
        <div className="container-max mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
          </div>

          <nav className="flex items-center gap-6">
            <a className="text-slate-600 hover:text-slate-900" href="#features">Features</a>
            <a className="text-slate-600 hover:text-slate-900" href="#how">How it works</a>
            <button
              onClick={() => setShowAuth(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md hover:from-indigo-600 hover:to-purple-700 transition"
            >
              Get started
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Hero onGetStarted={() => setShowAuth(true)} />
        <Features />
        <CTA />
      </main>

      <Footer />

      {/* modal */}
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
