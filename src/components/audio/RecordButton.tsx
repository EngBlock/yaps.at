import { Mic, Square, Loader2 } from 'lucide-react'
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
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'var(--lagoon)', opacity: 0.6 }}
        >
          <Loader2 size={28} className="animate-spin text-white" />
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
          className="record-pulse flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'var(--lagoon-deep)' }}
        >
          <Square size={22} className="text-white" fill="white" />
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
        className="flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'var(--lagoon)' }}
      >
        <Mic size={28} className="text-white" />
      </button>
      <span className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        Tap to record
      </span>
    </div>
  )
}
