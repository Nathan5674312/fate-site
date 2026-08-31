/**
 * Tuning surface for the two hands. Dev only, at /?lab=hands — not a route and
 * not part of the site.
 *
 * The layer switches are the point. docs/hands.md claims that real 8-12Hz
 * physiological tremor, on its own, reads as a buzzing phone rather than as
 * effort, and that the slow surge underneath is what actually sells strain.
 * Solo either one and see; that beats taking it on trust.
 */

import { useState } from 'react'
import { DEFAULT_OPTIONS, Hands, type HandsOptions } from './Hands'

const SPEEDS = [1, 0.5, 0.25] as const

export default function Lab() {
  const [o, setO] = useState<HandsOptions>(DEFAULT_OPTIONS)
  const set = (p: Partial<HandsOptions>) => setO((prev) => ({ ...prev, ...p }))

  const chip = (on: boolean) =>
    `rounded border px-2.5 py-1 text-xs ${
      on ? 'border-cream bg-cream text-ink' : 'border-coffee text-clay hover:bg-coffee'
    }`

  return (
    <div className="relative h-svh w-full overflow-hidden bg-ink">
      <Hands options={o} />

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-lg border border-coffee bg-ink/85 px-3 py-2 backdrop-blur">
        <button onClick={() => set({ playing: !o.playing })} className={chip(false)}>
          {o.playing ? 'Pause' : 'Play'}
        </button>
        {SPEEDS.map((s) => (
          <button key={s} onClick={() => set({ speed: s })} className={chip(o.speed === s)}>
            {s}×
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-coffee" />
        <button
          onClick={() => set({ gain: { ...o.gain, effort: o.gain.effort > 0 ? 0 : 1 } })}
          className={chip(o.gain.effort > 0)}
        >
          Effort 0.85Hz
        </button>
        <button
          onClick={() => set({ gain: { ...o.gain, tremor: o.gain.tremor > 0 ? 0 : 1 } })}
          className={chip(o.gain.tremor > 0)}
        >
          Tremor 9–11Hz
        </button>
        <span className="mx-1 h-4 w-px bg-coffee" />
        <button onClick={() => set({ feintNonce: o.feintNonce + 1 })} className={chip(false)}>
          Feint now
        </button>
        <button onClick={() => set({ reduced: !o.reduced })} className={chip(o.reduced)}>
          Reduced motion
        </button>
      </div>

      <p className="absolute top-4 left-4 max-w-xs text-[11px] leading-relaxed text-taupe">
        God&apos;s hand = human, straining. Adam&apos;s hand = machine, withholding.
        Photographs, moved — nothing redrawn. Backgrounds are not cut out yet.
      </p>
    </div>
  )
}
