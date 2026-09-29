/**
 * Web Audio sound synthesis. All sounds are generated on the fly — no audio
 * files. The AudioContext is created lazily on first use (i.e. after a user
 * gesture) so browsers don't block it. When muted, every function is a no-op.
 */

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  if (!ctx) {
    try {
      ctx = new AudioCtx()
    } catch {
      return null
    }
  }
  return ctx
}

function tone(
  frequency: number,
  durationMs: number,
  options: { type?: OscillatorType; gain?: number; delayMs?: number } = {},
): void {
  const audio = getContext()
  if (!audio) return
  const { type = 'sine', gain = 0.15, delayMs = 0 } = options
  const start = audio.currentTime + delayMs / 1000
  const end = start + durationMs / 1000

  const osc = audio.createOscillator()
  const amp = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, end)
  osc.connect(amp).connect(audio.destination)
  osc.start(start)
  osc.stop(end + 0.02)
}

export function resumeAudio(): void {
  const audio = getContext()
  if (audio && audio.state === 'suspended') void audio.resume()
}

/** Short rising blip when a spin starts. */
export function playSpinStart(): void {
  tone(320, 90, { type: 'triangle', gain: 0.12 })
  tone(480, 90, { type: 'triangle', gain: 0.1, delayMs: 60 })
}

/**
 * A tick as the reel changes item. `progress` in [0,1] lowers pitch/volume as
 * the animation slows down near the end.
 */
export function playTick(progress: number): void {
  const p = Math.min(1, Math.max(0, progress))
  const freq = 900 - p * 400
  const gain = 0.09 - p * 0.04
  tone(freq, 40, { type: 'square', gain: Math.max(0.03, gain) })
}

/** Bright chord when the reel lands. */
export function playLand(): void {
  tone(523.25, 260, { type: 'sine', gain: 0.13 }) // C5
  tone(659.25, 260, { type: 'sine', gain: 0.1, delayMs: 20 }) // E5
  tone(783.99, 320, { type: 'sine', gain: 0.09, delayMs: 40 }) // G5
}

/** Noticeable but not harsh end-of-timer cue. */
export function playTimerEnd(): void {
  tone(660, 200, { type: 'triangle', gain: 0.16 })
  tone(440, 320, { type: 'triangle', gain: 0.14, delayMs: 180 })
}
