import React from 'react'

export default function CTA() {
  return (
    <section id="signup" className="py-20 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
      <div className="container-max mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-3xl font-bold">Ready to make teamwork fair?</h3>
          <p className="text-sm mt-2 opacity-90">
            Create a project, invite teammates, and let the AI propose a fair task split.
          </p>
        </div>
        <div>
          <a
            href="/login"
            className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-medium shadow-lg hover:scale-[1.03] transition-transform"
          >
            Get started
          </a>
        </div>
      </div>
    </section>
  )
}
