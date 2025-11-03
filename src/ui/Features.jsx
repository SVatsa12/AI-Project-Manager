import React from 'react'
import {
  Brain,
  BarChart3,
  Scale,
  FileText
} from 'lucide-react'

const FEATURES = [
  {
    title: 'AI-powered Task Split',
    desc: 'Automatically divides deliverables into fair, skills-aligned tasks using AI clustering.',
    icon: Brain,
    color: 'from-indigo-500 to-purple-600',
  },
  {
    title: 'Effort Dashboard',
    desc: 'Visualize who is doing what — unified view of time logs, artifacts & peer reviews.',
    icon: BarChart3,
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: 'Fairness Index',
    desc: 'A fairness score and variance metric so instructors and teams stay transparent.',
    icon: Scale,
    color: 'from-blue-500 to-indigo-500',
  },
  {
    title: 'Automated Reports',
    desc: 'One-click CSV/PDF exports for grading or record keeping.',
    icon: FileText,
    color: 'from-fuchsia-500 to-purple-600',
  },
]

export default function Features() {
  return (
    <section id="features" className="relative py-24">
      {/* Subtle top fade for section separation */}
      <div className="absolute inset-x-0 top-0 h-40 -z-10 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />

      <div className="container-max mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-slate-900">Features</h2>
          <p className="text-slate-600 mt-3">
            Everything you need to keep group projects fair, transparent, and effortless.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ title, desc, icon: Icon, color }) => (
            <article
              key={title}
              className="relative rounded-2xl p-6 overflow-hidden group"
            >
              {/* background glow */}
              <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-indigo-400/10 to-purple-600/10 blur-xl opacity-90"></div>

              {/* glass panel */}
              <div className="relative bg-white/20 border border-white/30 backdrop-blur-md rounded-2xl p-6 h-full flex flex-col hover:bg-white/30 transition">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br ${color} text-white shadow-lg`}
                  >
                    <Icon size={22} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                </div>

                <p className="text-slate-700 mt-4 text-sm flex-1">{desc}</p>

                <div className="mt-6">
                  <a
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                    href="#"
                  >
                    Learn more →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
