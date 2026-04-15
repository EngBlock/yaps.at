import { useState, useRef, useCallback, useEffect } from 'react'

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'recorded' | 'error'

const MAX_DURATION_MS = 300_000
const MAX_SIZE_BYTES = 4_800_000

function getPreferredMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg;codecs=opus'
  return 'audio/webm'
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const sizeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    recorderRef.current = null
    chunksRef.current = []
    sizeRef.current = 0
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setState('requesting')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError') {
        setError('Microphone access was denied. Please allow microphone access and try again.')
      } else if (name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.')
      } else {
        setError('Could not access the microphone.')
      }
      setState('error')
      return
    }

    streamRef.current = stream
    chunksRef.current = []
    sizeRef.current = 0

    const mimeType = getPreferredMimeType()
    const recorder = new MediaRecorder(stream, { mimeType })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
        sizeRef.current += e.data.size

        if (sizeRef.current >= MAX_SIZE_BYTES) {
          stop()
        }
      }
    }

    recorder.onstop = () => {
      const finalDuration = Date.now() - startTimeRef.current
      setDuration(finalDuration)

      const type = mimeType.split(';')[0]
      const recorded = new Blob(chunksRef.current, { type })
      setBlob(recorded)
      setState('recorded')
    }

    startTimeRef.current = Date.now()
    recorder.start(1000)
    setState('recording')

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setDuration(elapsed)

      if (elapsed >= MAX_DURATION_MS) {
        stop()
      }
    }, 100)
  }, [stop])

  const reset = useCallback(() => {
    cleanup()
    setBlob(null)
    setDuration(0)
    setError(null)
    setState('idle')
  }, [cleanup])

  return { state, blob, duration, error, start, stop, reset }
}
