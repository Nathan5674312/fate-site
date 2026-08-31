/**
 * Tuning surface for the two hands. Dev only, at /?lab=hands.
 *
 * Everything here exists to be dialled against Nathan's Hermes reference:
 * contrast blows the highlights, dot size sets how coarse the halftone reads,
 * and the ink and ground can be swapped because the dither only ever paints
 * ink — the ground is the page behind it.
 *
 * The layer switches are the other half. docs/hands.md claims that real 8-12Hz
 * physiological tremor, alone, reads as a buzzing phone rather than as effort.
 * Solo either layer and see; that beats taking it on trust.
 */

import { useState } from 'react'
import { DEFAULT_OPTIONS, Hands, INKS, type HandsOptions } from './Hands'

const SPEEDS = [1, 0.5, 0.25] as const
const DOTS = [
  { label: 'Fine', v: 0.8 },
  { label: 'Medium', v: 0.55 },
  { label: 'Coarse', v: 0.35 },
  { label: 'Brutal', v: 0.22 },
]
const GROUNDS = [
  { label: 'Ink', v: '#08080a' },
  { label: 'White', v: '#ffffff' },
  { label: 'Blue', v: '#2f27d4' },
]

export default function Lab() {
  const [o, setO] = useState<HandsOptions>(DEFAULT_OPTIONS)
  const [ground, setGround] = useState(GROUNDS[0].v)
  const set = (p: Partial<HandsOptions>) => setO((prev) => ({ ...prev, ...p }))
  const setLook = (p: Partial<HandsOptions['look']>) =>
    setO((prev) => ({ ...prev, look: { ...prev.look, ...p } }))

  const chip = (on: boolean) =>
    `rounded border px-2 py-1 text-[11px] transition-colors ${
      on
        ? 'border-white bg-white text-black'
        : 'border-white/25 text-white/70 hover:border-white/60'
    }`

  const inkOf = (o.look.ink ?? [244, 244, 245]).join(',')

  return (
    <div className="relative h-svh w-full overflow-hidden" style={{ background: ground }}>
      <Hands options={o} />

      <div className="absolute right-3 bottom-3 left-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-white/20 bg-black/70 px-2.5 py-2 backdrop-blur">
        <button onClick={() => set({ playing: !o.playing })} className={chip(false)}>
          {o.playing ? 'Pause' : 'Play'}
        </button>
        {SPEEDS.map((s) => (
          <button key={s} onClick={() => set({ speed: s })} className={chip(o.speed === s)}>
            {s}×
          </button>
        ))}
        <button onClick={() => set({ feintNonce: o.feintNonce + 1 })} className={chip(false)}>
          Feint
        </button>

        <span className="mx-1 h-4 w-px bg-white/20" />
        <button
          onClick={() => set({ gain: { ...o.gain, effort: o.gain.effort > 0 ? 0 : 1 } })}
          className={chip(o.gain.effort > 0)}
        >
          Effort
        </button>
        <button
          onClick={() => set({ gain: { ...o.gain, tremor: o.gain.tremor > 0 ? 0 : 1 } })}
          className={chip(o.gain.tremor > 0)}
        >
          Tremor
        </button>
        <button onClick={() => set({ reduced: !o.reduced })} className={chip(o.reduced)}>
          Reduced
        </button>

        <span className="mx-1 h-4 w-px bg-white/20" />
        <button onClick={() => set({ ditherOn: !o.ditherOn })} className={chip(o.ditherOn)}>
          Dither
        </button>
        {DOTS.map((d) => (
          <button
            key={d.label}
            onClick={() => set({ pixelScale: d.v })}
            className={chip(o.pixelScale === d.v)}
          >
            {d.label}
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-white/20" />
        {Object.entries(INKS).map(([name, rgb]) => (
          <button
            key={name}
            onClick={() => setLook({ ink: rgb })}
            className={chip(inkOf === rgb.join(','))}
          >
            {name}
          </button>
        ))}
        {GROUNDS.map((g) => (
          <button key={g.label} onClick={() => setGround(g.v)} className={chip(ground === g.v)}>
            bg {g.label}
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-white/20" />
        <label className="flex items-center gap-1.5 text-[11px] text-white/70">
          contrast
          <input
            type="range"
            min={0.6}
            max={4}
            step={0.05}
            value={o.look.contrast ?? 1.6}
            onChange={(e) => setLook({ contrast: Number(e.target.value) })}
            className="w-20 accent-white"
          />
          <span className="w-8 tabular-nums text-white">{(o.look.contrast ?? 1.6).toFixed(2)}</span>
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-white/70">
          pivot
          <input
            type="range"
            min={0.3}
            max={0.9}
            step={0.01}
            value={o.look.pivot ?? 0.6}
            onChange={(e) => setLook({ pivot: Number(e.target.value) })}
            className="w-20 accent-white"
          />
          <span className="w-8 tabular-nums text-white">{(o.look.pivot ?? 0.6).toFixed(2)}</span>
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-white/70">
          ink level
          <input
            type="range"
            min={0.15}
            max={0.85}
            step={0.01}
            value={o.look.threshold ?? 0.5}
            onChange={(e) => setLook({ threshold: Number(e.target.value) })}
            className="w-20 accent-white"
          />
          <span className="w-8 tabular-nums text-white">{(o.look.threshold ?? 0.5).toFixed(2)}</span>
        </label>
      </div>

      <p className="absolute top-3 left-3 max-w-[22rem] text-[11px] leading-relaxed text-white/45 mix-blend-difference">
        God&apos;s hand = human, straining. Adam&apos;s hand = machine, withholding.
        Two photographs, moved and dithered — nothing redrawn. The second
        further-reaching pose is not made yet, so the fingers do not extend.
      </p>
    </div>
  )
}
