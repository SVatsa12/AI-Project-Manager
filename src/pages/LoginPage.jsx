import React, { useEffect, useState } from "react"
import AuthModal from "../ui/AuthModal"
import Logo from "../ui/Logo"

export default function LoginPage() {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setOpen(true)
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="header-transparent sticky top-0 z-30">
        <div className="container-max px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
        </div>
      </header>

      {/* Render the modal */}
      <AuthModal open={open} onClose={() => setOpen(false)} />

      {/* Accessibility fallback: if modal closed, show simple sign-in page */}
      {!open && (
        <main className="flex-1 container-max mx-auto px-6 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-semibold">Sign in or create account</h1>
            <p className="mt-4 text-slate-600">Use the modal to quickly sign in. If it closes, use the form below.</p>

            <div className="mt-8 bg-white rounded-lg p-6 shadow">
              <p className="text-sm text-slate-600">Modal closed — click Get started on the site to reopen it.</p>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
