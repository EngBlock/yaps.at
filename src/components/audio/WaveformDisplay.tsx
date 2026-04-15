import { useMemo } from 'react'

interface WaveformDisplayProps {
  waveform: number[]
  /** 0..1 fraction of the waveform that's "played" (colored). */
  progress?: number
  onSeek?: (fraction: number) => void
  /**
   * "bar"  = baseline-aligned rectangles (default).
   * "cone" = centered vertically with heights tapering from small (left) to
   *          full (right), so the waveform reads as sound radiating outward.
   */
  shape?: 'bar' | 'cone'
}

const DISPLAY_BARS = 48

/**
 * Downsample an arbitrarily-sized waveform array to `count` buckets by
 * averaging adjacent values.
 */
function downsample(data: number[], count: number): number[] {
  if (data.length <= count) return data
  const bucketSize = data.length / count
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * bucketSize)
    const end = Math.floor((i + 1) * bucketSize)
    let sum = 0
    for (let j = start; j < end; j++) {
      sum += data[j]
    }
    out.push(sum / (end - start))
  }
  return out
}

export function WaveformDisplay({
  waveform,
  progress = 0,
  onSeek,
  shape = 'bar',
}: WaveformDisplayProps) {
  const heights = useMemo(() => {
    const sampled = downsample(waveform, DISPLAY_BARS)
    const n = sampled.length
    return sampled.map((amp, i) => {
      const base = (amp / 255) * 100
      if (shape === 'cone') {
        const t = n > 1 ? i / (n - 1) : 1
        // Softer envelope: floor at 0.35 so left-side bars stay visible
        const envelope = 0.35 + 0.65 * Math.sqrt(t)
        return Math.max(6, base * envelope)
      }
      return Math.max(6, base)
    })
  }, [waveform, shape])

  const clamped = Math.max(0, Math.min(1, progress))
  const isCone = shape === 'cone'

  const renderBars = (color: string) => (
    <div
      className={`absolute inset-0 flex ${isCone ? 'items-center' : 'items-end'}`}
      style={{ gap: '2px' }}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${h}%`,
            minWidth: 3,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  )

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    onSeek(Math.max(0, Math.min(1, fraction)))
  }

  return (
    <div
      className="relative h-12"
      style={{ cursor: onSeek ? 'pointer' : 'default' }}
      onClick={handleClick}
    >
      {renderBars('var(--line)')}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${(1 - clamped) * 100}% 0 0)` }}
      >
        {renderBars('var(--lagoon)')}
      </div>
    </div>
  )
}