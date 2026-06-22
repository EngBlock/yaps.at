import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Send, Loader2 } from 'lucide-react'
import { WaveformDisplay } from './WaveformDisplay'
import { formatDuration } from '#/lib/audio/format'

interface RecordingPreviewProps {
  blob: Blob
  duration: number
  waveform: number[] | null
  isPosting: boolean
  onReRecord: () => void
  onPost: () => void
  postLabel?: string
}

export function RecordingPreview({
  blob,
  duration,
  waveform,
  isPosting,
  onReRecord,
  onPost,
  postLabel = 'Post',
}: RecordingPreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string>('')
  const rafRef = useRef<number>(0)

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentMs, setCurrentMs] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration)
  const [ended, setEnded] = useState(false)

  // Create blob URL + audio element, wire up events, tear down on unmount.
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    blobUrlRef.current = url

    const audio = new Audio(url)
    // Local blob — no network cost, so preload to get accurate duration.
    audio.preload = 'auto'
    audioRef.current = audio

    const syncDuration = () => {
      const d = audio.duration
      if (Number.isFinite(d) && d > 0) {
        setAudioDuration(d * 1000)
      }
    }

    const onEnded = () => {
      setIsPlaying(false)
      setEnded(true)
      setProgress(1)
      setCurrentMs(audioDuration)
    }

    audio.addEventListener('loadedmetadata', syncDuration)
    audio.addEventListener('durationchange', syncDuration)
    audio.addEventListener('ended', onEnded)

    return () => {
      cancelAnimationFrame(rafRef.current)
      audio.removeEventListener('loadedmetadata', syncDuration)
      audio.removeEventListener('durationchange', syncDuration)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
      URL.revokeObjectURL(url)
      blobUrlRef.current = ''
    }
    // `audioDuration` is intentionally excluded — the `onEnded` closure
    // captures the value at setup time, which is fine because the only
    // update comes from `syncDuration` which fires before `onEnded`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob])

  // Smooth progress via requestAnimationFrame while playing.
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const tick = () => {
      const audio = audioRef.current
      if (audio) {
        const dur =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration * 1000
            : audioDuration
        const ms = audio.currentTime * 1000
        setCurrentMs(ms)
        setProgress(dur > 0 ? Math.min(1, ms / dur) : 0)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, audioDuration])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    // If we were at the end, restart from the beginning.
    if (ended) {
      audio.currentTime = 0
      setEnded(false)
      setProgress(0)
      setCurrentMs(0)
    }

    if (audio.paused) {
      audio.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }, [ended])

  const seek = useCallback(
    (fraction: number) => {
      const audio = audioRef.current
      if (!audio) return
      const dur =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : audioDuration / 1000
      if (dur <= 0) return
      audio.currentTime = fraction * dur
      setCurrentMs(fraction * dur * 1000)
      setProgress(fraction)
      setEnded(false)
    },
    [audioDuration],
  )

  const isAnalyzing = waveform === null
  const displayWaveform = waveform ?? Array(48).fill(30)

  // Show elapsed while playing, total duration when idle.
  const timeLabel = isPlaying || ended
    ? formatDuration(currentMs)
    : formatDuration(audioDuration)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--lagoon)' }}
        >
          {isPlaying ? (
            <Pause size={18} className="text-white" fill="white" />
          ) : (
            <Play size={18} className="ml-0.5 text-white" fill="white" />
          )}
        </button>

        <div className={`min-w-0 flex-1 ${isAnalyzing ? 'animate-pulse' : ''}`}>
          <WaveformDisplay
            waveform={displayWaveform}
            progress={progress}
            onSeek={seek}
          />
        </div>

        <span
          className="shrink-0 font-mono text-xs font-medium tabular-nums"
          style={{ color: 'var(--sea-ink-soft)' }}
          aria-live="polite"
        >
          {isAnalyzing ? 'Analyzing…' : timeLabel}
        </span>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onReRecord}
          disabled={isPosting}
          className="btn btn-sm"
          style={{
            borderColor: 'var(--line)',
            background: 'var(--surface)',
            color: 'var(--sea-ink)',
          }}
        >
          <RotateCcw size={14} />
          Re-record
        </button>
        <button
          onClick={onPost}
          disabled={isPosting}
          className="btn btn-sm"
          style={{
            background: 'var(--lagoon)',
            color: 'white',
            borderColor: 'var(--lagoon)',
          }}
        >
          {isPosting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {isPosting ? 'Posting...' : postLabel}
        </button>
      </div>
    </div>
  )
}