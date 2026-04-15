import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseAudioPlayer {
  isPlaying: boolean
  isBuffering: boolean
  currentMs: number
  durationMs: number
  progress: number
  toggle: () => void
  seek: (fraction: number) => void
}

/**
 * Headless audio playback controller.
 *
 * `src` is the audio URL. `fallbackDurationMs` is used for the progress
 * denominator when the underlying media's duration is unknown (some PDS-served
 * blobs arrive without container metadata, leaving `audio.duration` as NaN —
 * in that case we still want the waveform and time display to advance).
 */
export function useAudioPlayer(
  src: string,
  fallbackDurationMs?: number,
): UseAudioPlayer {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [mediaDurationMs, setMediaDurationMs] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const durationMs =
    mediaDurationMs > 0 ? mediaDurationMs : (fallbackDurationMs ?? 0)
  const progress = durationMs > 0 ? Math.min(1, currentMs / durationMs) : 0

  useEffect(() => {
    if (!src) return

    const audio = new Audio()
    // No network fetch until the user actually hits play. Duration falls back
    // to `fallbackDurationMs` so the waveform stays meaningful before load.
    audio.preload = 'none'
    audio.src = src
    audioRef.current = audio

    const captureDuration = () => {
      const d = audio.duration
      if (Number.isFinite(d) && d > 0) setMediaDurationMs(d * 1000)
    }
    const captureTime = () => setCurrentMs(audio.currentTime * 1000)
    const onWaiting = () => setIsBuffering(true)
    const onPlaying = () => {
      setIsBuffering(false)
      setIsPlaying(true)
    }
    const onPause = () => {
      setIsBuffering(false)
      setIsPlaying(false)
    }
    const onEnded = () => {
      setIsPlaying(false)
      setIsBuffering(false)
      setCurrentMs(0)
    }

    audio.addEventListener('loadedmetadata', captureDuration)
    audio.addEventListener('durationchange', captureDuration)
    audio.addEventListener('timeupdate', captureTime)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', captureDuration)
      audio.removeEventListener('durationchange', captureDuration)
      audio.removeEventListener('timeupdate', captureTime)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
  }, [src])

  // Poll currentTime at ~16Hz during playback. `timeupdate` alone fires only
  // every 200–250ms in most browsers, which makes the waveform color sweep
  // look jumpy. A short interval here gives smooth progress without RAF.
  useEffect(() => {
    if (!isPlaying) return
    const id = window.setInterval(() => {
      const audio = audioRef.current
      if (audio) setCurrentMs(audio.currentTime * 1000)
    }, 60)
    return () => window.clearInterval(id)
  }, [isPlaying])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      return
    }
    // Optimistic flip — `playing` / `waiting` events will correct state.
    setIsPlaying(true)
    if (audio.readyState < 3) setIsBuffering(true)
    audio.play().catch(() => {
      setIsBuffering(false)
      setIsPlaying(false)
    })
  }, [])

  const seek = useCallback(
    (fraction: number) => {
      const audio = audioRef.current
      if (!audio) return
      const mediaDur =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : fallbackDurationMs
            ? fallbackDurationMs / 1000
            : 0
      if (mediaDur <= 0) return
      audio.currentTime = fraction * mediaDur
      setCurrentMs(audio.currentTime * 1000)
    },
    [fallbackDurationMs],
  )

  return {
    isPlaying,
    isBuffering,
    currentMs,
    durationMs,
    progress,
    toggle,
    seek,
  }
}
