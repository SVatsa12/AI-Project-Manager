// src/ui/Features.jsx
import React, { useState } from 'react'
import {
  Brain,
  BarChart3,
  Scale,
  FileText
} from 'lucide-react'
import FeatureModal from './FeatureModal'

const FEATURES = [
  {
    id: 'ai-split',
    title: 'AI-powered Task Split',
    desc: 'Automatically divides deliverables into fair, skills-aligned tasks using AI clustering.',
    long: `Our AI analyzes deliverables, contributors' skills and availability, and proposes a fair split of tasks.
It also suggests sub-tasks, effort estimates and which teammates best match each subtask. Instructors can review and adjust the split.`,
    icon: Brain,
    color: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'effort-dashboard',
    title: 'Effort Dashboard',
    desc: 'Visualize who is doing what — unified view of time logs, artifacts & peer reviews.',
    long: `Unified dashboard shows contributions across commits, file uploads, time logs and peer reviews.
Use filters to view per-student activity or aggregate project-level effort for grading.`,
    icon: BarChart3,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'fairness-index',
    title: 'Fairness Index',
    desc: 'A fairness score and variance metric so instructors and teams stay transparent.',
    long: `A fairness score aggregates contribution, task complexity, and time invested.
See variance metrics and receive suggested re-allocations or instructor nudges when team balance drops.`,
    icon: Scale,
    color: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'reports',
    title: 'Automated Reports',
    desc: 'One-click CSV/PDF exports for grading or record keeping.',
    long: `Export project artefacts, contribution logs and fairness metrics as CSV or PDF. Prepare grading sheets in one click.`,
    icon: FileText,
    color: 'from-fuchsia-500 to-purple-600',
  },
]

export default function Features({ onOpenAuth }) {
  const [openFeature, setOpenFeature] = useState(null) // feature id

  return (
    <section id="features" className="relative py-24">
      <div className="absolute inset-x-0 top-0 h-40 -z-10 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />
      <div className="container-max mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-slate-900">Features</h2>
          <p className="text-slate-600 mt-3">
            Everything you need to keep group projects fair, transparent, and effortless.
          </p>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ id, title, desc, icon: Icon, color }) => (
            <article
              key={id}
              className="relative rounded-2xl p-6 overflow-hidden group"
            >
              <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-indigo-400/10 to-purple-600/10 blur-xl opacity-90"></div>

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

                <div className="mt-6 flex items-center justify-between">
                  <button
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                    onClick={() => setOpenFeature(id)}
                  >
                    Learn more →
                  </button>

                  <button
                    className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm shadow-sm hover:opacity-95"
                    onClick={() => onOpenAuth && onOpenAuth()}
                  >
                    Try it
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Feature modal */}
      {openFeature && (
        <FeatureModal
          feature={FEATURES.find(f => f.id === openFeature)}
          onClose={() => setOpenFeature(null)}
        />
      )}
    </section>
  )
}
