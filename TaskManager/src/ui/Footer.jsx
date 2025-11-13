// src/ui/Footer.jsx
import React from 'react'

export default function Footer({ onOpenPolicy }){
  return (
    <footer className="bg-gray-50 border-t mt-10">
      <div className="container-max mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-600">© {new Date().getFullYear()} GroupProject.AI — Built for students</div>
        <div className="flex gap-4 text-sm">
          <button
            className="text-gray-600 hover:text-gray-900"
            onClick={() => onOpenPolicy && onOpenPolicy('privacy')}
          >
            Privacy
          </button>

          <button
            className="text-gray-600 hover:text-gray-900"
            onClick={() => onOpenPolicy && onOpenPolicy('terms')}
          >
            Terms
          </button>
        </div>
      </div>
    </footer>
  )
}
