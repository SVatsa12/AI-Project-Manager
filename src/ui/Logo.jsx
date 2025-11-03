import React from 'react'

export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="36" height="36" viewBox="0 0 64 64" fill="none" aria-hidden>
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0" stopColor="#7c3aed"/>
            <stop offset="1" stopColor="#5b21b6"/>
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="52" height="52" rx="10" fill="url(#g1)" />
        <path d="M18 44 L28 24 L36 40 L46 20" stroke="rgba(255,255,255,0.95)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>

      <div className="flex flex-col leading-tight">
        <span className="font-semibold text-slate-900">GroupProject<span className="text-indigo-600">.AI</span></span>
        <span className="text-xs text-slate-500 -mt-0.5">Fair task distribution</span>
      </div>
    </div>
  )
}
