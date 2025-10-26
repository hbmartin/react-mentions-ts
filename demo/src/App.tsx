import React from 'react'
import Examples from './examples'

const App: React.FC = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100">
    <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.25),transparent_60%)]" />
    <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_bottom,_rgba(16,185,129,0.18),transparent_55%)]" />
    <main className="relative mx-auto flex max-w-7xl flex-col gap-14 px-6 py-16 lg:px-10">
      <header className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
          React Mentions TS
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
          Headless mentions built for modern Tailwind projects
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          Explore accessible, framework-agnostic building blocks that drop straight into your design
          system. Swap styling strategies, customise suggestion experiences, and ship polished UX in
          minutes.
        </p>
        <h2 className="mt-6 text-2xl text-slate-400">
          <a
            className="font-semibold text-indigo-300 underline-offset-4 transition hover:text-indigo-200 hover:underline"
            href="https://github.com/hbmartin/react-mentions-ts"
          >
            Install and Setup
          </a>
        </h2>
      </header>

      <Examples />
    </main>
  </div>
)

export default App
