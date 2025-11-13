// src/ui/FeatureModal.jsx
import React from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'

export default function FeatureModal({ feature, onClose }) {
  if (!feature) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="relative z-10 max-w-2xl mx-4 w-full bg-white rounded-2xl shadow-2xl p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{feature.title}</h3>
            <p className="text-slate-600 mt-2">{feature.desc}</p>
          </div>

          <button
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        <div className="mt-4 text-slate-700 whitespace-pre-line">
          {feature.long}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}
