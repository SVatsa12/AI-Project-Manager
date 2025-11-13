// src/ui/HowItWorks.jsx
import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

const STEPS = [
  {
    id: 'step-1',
    title: 'Create a project',
    summary: 'Add project name, deliverables and invite your teammates.',
  },
  {
    id: 'step-2',
    title: 'Enter skills & availability',
    summary: "Teammates add their skills, availability and preferred roles.",
  },
  {
    id: 'step-3',
    title: 'AI proposes a split',
    summary: 'Our AI suggests a fair, skills-aligned distribution of tasks.',
  },
  {
    id: 'step-4',
    title: 'Review & adjust',
    summary: 'Instructors or admins can tweak allocations and finalize.',
  },
]

export default function HowItWorks({ onOpenFeature = () => {}, onOpenAuth = () => {} }) {
  return (
    <section id="how" className="py-20 bg-white">
      <div className="container-max mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
          <p className="text-slate-600 mt-2 max-w-2xl mx-auto">
            A few simple steps to get a fair task split for your team.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.article
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="relative rounded-2xl p-6 bg-white border border-slate-100 shadow-sm flex flex-col"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CheckCircle size={18} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
              </div>

              <p className="text-slate-600 mt-4 text-sm flex-1">{step.summary}</p>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                  onClick={() => onOpenFeature && onOpenFeature(step.id)}
                >
                  Learn more →
                </button>

                <button
                  className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm shadow-sm"
                  onClick={() => onOpenAuth && onOpenAuth()}
                >
                  Try it
                </button>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Optional bottom CTA */}
        <div className="mt-12 flex items-center justify-center">
          <button
            onClick={() => onOpenAuth && onOpenAuth()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md hover:scale-[1.02] transition-transform"
          >
            Create project — get started
          </button>
        </div>
      </div>
    </section>
  )
}
