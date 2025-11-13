// src/ui/PolicyModal.jsx
import React from 'react'
import { X } from 'lucide-react'

const CONTENT = {
  privacy: `Privacy policy\n\nShort placeholder: We only store minimal data... Replace this with your real policy.`,
  terms: `Terms of service\n\nShort placeholder: Use this product at your own risk... Replace with real terms.`,
}

export default function PolicyModal({ open, type, onClose }) {
  if (!open) return null
  const text = CONTENT[type] || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-w-3xl mx-4 w-full bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            {type === 'privacy' ? 'Privacy policy' : 'Terms of service'}
          </h3>
          <button className="p-2 rounded-md text-slate-600 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>

        <div className="mt-4 text-slate-700 whitespace-pre-line">
          {text}
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-indigo-600 text-white">Close</button>
        </div>
      </div>
    </div>
  )
}
