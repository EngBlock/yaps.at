import { Loader2 } from 'lucide-react'
import { formatDuration } from '#/lib/audio/format'
import type { RecorderState } from '#/lib/audio/useRecorder'

interface RecordButtonProps {
  state: RecorderState
  duration: number
  onStart: () => void
  onStop: () => void
}

export function RecordButton({ state, duration, onStart, onStop }: RecordButtonProps) {
  if (state === 'requesting') {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          disabled
          aria-label="Waiting for microphone access"
          className="relative flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: 'var(--lagoon)', opacity: 0.6 }}
        >
          <img
            src="/mascot.webp"
            alt=""
            className="h-16 w-16 object-contain opacity-60"
            draggable={false}
          />
          <Loader2
            size={28}
            className="absolute animate-spin text-white drop-shadow"
          />
        </button>
        <span className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
          Waiting for microphone access...
        </span>
      </div>
    )
  }

  if (state === 'recording') {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onStop}
          aria-label="Stop recording"
          aria-pressed="true"
          className="record-pulse relative flex h-20 w-20 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'var(--lagoon-deep)' }}
        >
          <img
            src="/mascot.webp"
            alt=""
            className="h-16 w-16 object-contain"
            draggable={false}
          />
          <span
            aria-hidden="true"
            className="absolute bottom-1 right-1 block h-3 w-3 animate-pulse rounded-full ring-2 ring-white"
            style={{ background: '#e53935' }}
          />
        </button>
        <span className="font-mono text-sm font-medium" style={{ color: 'var(--sea-ink)' }}>
          {formatDuration(duration)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onStart}
        aria-label="Start recording"
        aria-pressed="false"
        className="relative flex h-20 w-20 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'var(--lagoon)' }}
      >
        <img
          src="/mascot.webp"
          alt=""
          className="h-16 w-16 object-contain transition-opacity group-hover:opacity-100"
          draggable={false}
        />
      </button>
      <span className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        Tap to record
      </span>
    </div>
  )
}
