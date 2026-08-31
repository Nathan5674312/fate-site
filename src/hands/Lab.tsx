/**
 * Tuning surface for the two hands. Dev only, at /?lab=hands.
 *
 * Everything here exists to be dialled against Nathan's Hermes reference:
 * contrast stretches the tonal range, pivot decides WHICH brightness sits in
 * the middle of that stretch, dot size sets how coarse the halftone reads, and
 * ink and ground can be swapped because the dither only ever paints ink.
 *
 * The Human/Machine switch matters: the two hands carry SEPARATE treatments.
 * Every dither control below edits whichever hand is selected, and the readout
 * shows only that one.
 *
 * The layer switches are the other half. docs/hands.md claims that real 8-12Hz
 * physiological tremor, alone, reads as a buzzing phone rather than as effort.
 * Solo either layer and see; that beats taking it on trust.
 */

import { useEffect, useState } from 'react'
import { DEFAULT_OPTIONS, Hands, INKS, type HandLook, type HandsOptions } from './Hands'

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

/*
 * Tuning survives a reload. Without this, every dial-in is lost the moment the
 * dev server hot-reloads, which makes the lab useless for its one job. Wrapped
 * because a private window or blocked site data makes localStorage throw on
 * access rather than return null.
 */
const STORE = 'fate.hands.look.v2'

function loadSaved(): Partial<HandsOptions> {
  try {
    const raw = localStorage.getItem(STORE)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

type Target = 'human' | 'machine'

export default function Lab() {
  const [o, setO] = useState<HandsOptions>({ ...DEFAULT_OPTIONS, ...loadSaved() })
  const [target, setTarget] = useState<Target>('human')
  const [ground, setGround] = useState(GROUNDS[0].v)
  const [copied, setCopied] = useState(false)

  // Only the LOOKS persist. Playing, speed and the layer solos are session
  // state — restoring a paused, tremor-off hand on reload would read as a bug.
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ human: o.human, machine: o.machine }))
    } catch {
      /* private window, or site data blocked. Tuning just will not persist. */
    }
  }, [o.human, o.machine])

  const current: HandLook = o[target]
  const set = (p: Partial<HandsOptions>) => setO((prev) => ({ ...prev, ...p }))
  const setHand = (p: Partial<HandLook>) =>
    setO((prev) => ({ ...prev, [target]: { ...prev[target], ...p } }))
  const setLook = (p: Partial<HandLook['look']>) =>
    setO((prev) => ({ ...prev, [target]: { ...prev[target], look: { ...prev[target].look, ...p } } }))

  const chip = (on: boolean) =>
    `rounded border px-2 py-1 text-[11px] transition-colors ${
      on
        ? 'border-white bg-white text-black'
        : 'border-white/25 text-white/70 hover:border-white/60'
    }`

  const inkOf = (current.look.ink ?? [244, 244, 245]).join(',')
  const readout = `${target}: ${JSON.stringify(current.look)} pixelScale=${current.pixelScale}`

  const num = (
    label: string,
    key: 'contrast' | 'pivot' | 'threshold',
    min: number,
    max: number,
    fallback: number,
  ) => (
    <label className="flex items-center gap-1.5 text-[11px] text-white/70">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={current.look[key] ?? fallback}
        onChange={(e) => setLook({ [key]: Number(e.target.value) })}
        className="w-20 accent-white"
      />
      <span className="w-8 tabular-nums text-white">
        {(current.look[key] ?? fallback).toFixed(2)}
      </span>
    </label>
  )

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
        <button onClick={() => set({ ditherOn: !o.ditherOn })} className={chip(o.ditherOn)}>
          Dither
        </button>

        {/* Everything past this point edits ONE hand. */}
        <span className="mx-1 h-5 w-px bg-white/30" />
        <button onClick={() => setTarget('human')} className={chip(target === 'human')}>
          Human ↙
        </button>
        <button onClick={() => setTarget('machine')} className={chip(target === 'machine')}>
          Machine ↗
        </button>

        <span className="mx-1 h-4 w-px bg-white/20" />
        {DOTS.map((d) => (
          <button
            key={d.label}
            onClick={() => setHand({ pixelScale: d.v })}
            className={chip(current.pixelScale === d.v)}
          >
            {d.label}
          </button>
        ))}
        {Object.entries(INKS).map(([name, rgb]) => (
          <button
            key={name}
            onClick={() => setLook({ ink: rgb })}
            className={chip(inkOf === rgb.join(','))}
          >
            {name}
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-white/20" />
        {num('contrast', 'contrast', 0.6, 5, 1.9)}
        {num('pivot', 'pivot', 0.3, 0.9, 0.6)}
        {num('ink level', 'threshold', 0.1, 0.9, 0.5)}

        <span className="mx-1 h-4 w-px bg-white/20" />
        {GROUNDS.map((g) => (
          <button key={g.label} onClick={() => setGround(g.v)} className={chip(ground === g.v)}>
            bg {g.label}
          </button>
        ))}
      </div>

      <div className="absolute top-3 right-3 flex max-w-[22rem] flex-col items-end gap-1">
        <button
          onClick={() => {
            navigator.clipboard?.writeText(readout).then(
              () => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              },
              () => setCopied(false),
            )
          }}
          className={chip(copied)}
        >
          {copied ? 'Copied' : `Copy ${target} settings`}
        </button>
        {/* Always visible and selectable, because clipboard access can be
            refused and these numbers are the entire point of the page. */}
        <code className="max-w-full overflow-x-auto rounded border border-white/15 bg-black/60 px-2 py-1 text-right text-[10px] leading-relaxed text-white/60 select-all">
          {readout}
        </code>
      </div>

      <p className="absolute top-3 left-3 max-w-[20rem] text-[11px] leading-relaxed text-white/45 mix-blend-difference">
        God&apos;s hand = human, straining. Adam&apos;s hand = machine,
        withholding. Two photographs, moved and dithered — nothing redrawn. The
        second further-reaching pose is not made yet, so the fingers do not
        extend.
      </p>
    </div>
  )
}
