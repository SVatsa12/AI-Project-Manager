import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"

export default function Hero({ onGetStarted }) {
  // --- Card Data ---
  const cards = [
    {
      id: 0,
      title: "80%",
      desc: "Teams who used auto-allocation reported less conflict",
      gradient: "from-indigo-500 to-purple-600",
    },
    {
      id: 1,
      title: "AI + Human",
      desc: "Admin can override AI suggestions with one click",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      id: 2,
      title: "Exportable",
      desc: "PDF/CSV reports for instructors",
      gradient: "from-fuchsia-500 to-purple-600",
    },
  ]

  const [active, setActive] = useState(1)

  // --- Auto rotation every 4 seconds ---
  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % cards.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [cards.length])

  // --- Render ---
  return (
    <section className="hero-gloss relative overflow-hidden">
      <div className="container-max hero-inner py-24 lg:py-28 relative z-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {/* Left column — text content */}
          <div className="lg:col-span-7">
            <h1 className="hero-title font-extrabold text-slate-900 leading-tight text-5xl md:text-6xl">
              Make group projects fair<br />automatically
            </h1>

            <p className="mt-6 text-lg md:text-xl text-slate-700 max-w-2xl">
              Let your team enter skills and availability. Our AI allocates tasks fairly,
              tracks contribution, and sends nudges when someone is overloaded — 
              so projects stop becoming group-work nightmares.
            </p>

            {/* CTA Button */}
            <button
              onClick={onGetStarted}
              className="mt-8 hero-cta px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:scale-[1.03] transition-transform shadow-lg"
            >
              Get started
            </button>

            {/* Overlapping cards — visible without scroll */}
            <div className="relative mt-16 flex justify-center lg:justify-start">
              <div className="relative w-full max-w-3xl h-56">
                {cards.map((card, index) => {
                  const position = (index - active + cards.length) % cards.length

                  // Predefined positions (left, center, right)
                  const positions = {
                    0: { x: -140, scale: 0.95, z: 10, opacity: 0.8, y: 20 },
                    1: { x: 0, scale: 1.05, z: 30, opacity: 1, y: 0 },
                    2: { x: 140, scale: 0.95, z: 10, opacity: 0.8, y: 20 },
                  }

                  const anim = positions[position]

                  return (
                    <motion.div
                      key={card.id}
                      animate={anim}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      style={{ zIndex: anim.z }}
                      className="absolute left-1/2 top-0 -translate-x-1/2 w-72 md:w-80"
                    >
                      <div
                        className={`bg-white/90 backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-xl w-full h-40 flex flex-col justify-between`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xl font-semibold text-slate-900">
                              {card.title}
                            </div>
                            <div className="text-sm text-slate-600 mt-2">
                              {card.desc}
                            </div>
                          </div>

                          {/* Gradient icon */}
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-md bg-gradient-to-br ${card.gradient}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="6" fill="white" opacity="0.25" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right column for spacing / future illustration */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="w-full h-96" aria-hidden></div>
          </div>
        </div>
      </div>

      {/* Soft background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-indigo-400/25 to-purple-500/25 blur-3xl rounded-full"></div>
    </section>
  )
}
