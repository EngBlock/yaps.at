import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Muxer, ArrayBufferTarget } from 'webm-muxer'
import { createAudioPipeline } from './useAudioProcessor'

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'recorded' | 'error'

export const MAX_DURATION_MS = 300_000
const MAX_SIZE_BYTES = 4_800_000
const AUDIO_BITRATE = 96_000

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
}

const OPUS_CONFIG: AudioEncoderConfig = {
  codec: 'opus',
  sampleRate: 48000,
  numberOfChannels: 1,
  bitrate: AUDIO_BITRATE,
  opus: {
    complexity: 9,
    signal: 'auto',
    application: 'voip',
    frameDuration: 20_000,
    format: 'opus',
    fec: true,
  },
}

function supportsWebCodecs(): boolean {
  return (
    typeof (globalThis as Record<string, unknown>).AudioEncoder === 'function' &&
    typeof (globalThis as Record<string, unknown>).MediaStreamTrackProcessor ===
      'function'
  )
}

function getPreferredMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
    return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus'))
    return 'audio/ogg;codecs=opus'
  return 'audio/webm'
}

function buildOpusHead(): Uint8Array {
  const buf = new ArrayBuffer(19)
  const dv = new DataView(buf)
  const sig = new TextEncoder().encode('OpusHead')
  new Uint8Array(buf, 0, 8).set(sig)
  dv.setUint8(8, 1)
  dv.setUint8(9, 1)
  dv.setUint16(10, 312, true)
  dv.setUint32(12, 48000, true)
  dv.setUint16(16, 0, true)
  dv.setUint8(18, 0)
  return new Uint8Array(buf)
}

interface EncodedChunk {
  data: Uint8Array
  timestamp: number
  duration: number
  type: EncodedAudioChunkType
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const hasWebCodecs = useMemo(() => supportsWebCodecs(), [])

  // MediaRecorder path refs
  const mrRecorderRef = useRef<MediaRecorder | null>(null)
  const mrChunksRef = useRef<Blob[]>([])
  const mrSizeRef = useRef(0)

  // Shared refs
  const streamRef = useRef<MediaStream | null>(null)
  const pipelineCleanupRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const mimeTypeRef = useRef('audio/webm')
  const intentRef = useRef<'stop' | 'cancel'>('cancel')

  // WebCodecs-only refs
  const wcAbortRef = useRef<AbortController | null>(null)

  const hardCleanup = useCallback(() => {
    pipelineCleanupRef.current?.()
    pipelineCleanupRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    mrRecorderRef.current = null
    mrChunksRef.current = []
    mrSizeRef.current = 0
    wcAbortRef.current = null
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      hardCleanup()
    }
  }, [clearTimer, hardCleanup])

  // ── MediaRecorder start ──────────────────────────────────────────────

  const startMediaRecorder = useCallback(async (stream: MediaStream) => {
    const mimeType = getPreferredMimeType()
    mimeTypeRef.current = mimeType
    mrChunksRef.current = []
    mrSizeRef.current = 0

    const recorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: AUDIO_BITRATE,
    })
    mrRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        mrChunksRef.current.push(e.data)
        mrSizeRef.current += e.data.size
        if (mrSizeRef.current >= MAX_SIZE_BYTES) {
          recorder.stop()
          clearTimer()
          stream.getTracks().forEach((t) => t.stop())
        }
      }
    }

    recorder.onstop = () => {
      const finalDuration = Date.now() - startTimeRef.current
      setDuration(finalDuration)
      const type = mimeType.split(';')[0]
      const recorded = new Blob(mrChunksRef.current, { type })
      setBlob(recorded)
      setState('recorded')
      pipelineCleanupRef.current?.()
      pipelineCleanupRef.current = null
    }

    startTimeRef.current = Date.now()
    recorder.start(1000)
    setState('recording')

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setDuration(elapsed)
      if (elapsed >= MAX_DURATION_MS) {
        recorder.stop()
        clearTimer()
        stream.getTracks().forEach((t) => t.stop())
      }
    }, 100)
  }, [clearTimer])

  // ── WebCodecs start ───────────────────────────────────────────────────

  const startWebCodecs = useCallback(async (stream: MediaStream) => {
    const track = stream.getAudioTracks()[0]
    if (!track) {
      setError('No audio track available.')
      setState('error')
      hardCleanup()
      return
    }

    const tag = new AbortController()
    wcAbortRef.current = tag
    intentRef.current = 'stop'
    const signal = tag.signal

    const chunks: EncodedChunk[] = []
    let accumulated = 0

    const encoder = new AudioEncoder({
      error(err) {
        setError(`Encoder error: ${err.message}`)
        setState('error')
        tag.abort()
      },
      output(chunk) {
        const data = new Uint8Array(chunk.byteLength)
        chunk.copyTo(data)
        chunks.push({
          data,
          timestamp: chunk.timestamp,
          duration: chunk.duration ?? 20_000,
          type: chunk.type,
        })
      },
    })

    encoder.configure(OPUS_CONFIG)

    const TP = (globalThis as Record<string, unknown>).MediaStreamTrackProcessor
    const processor = new (TP as new (opts: { track: MediaStreamTrack }) => {
      readable: ReadableStream<AudioData>
    })({ track })
    const reader = processor.readable.getReader()

    startTimeRef.current = Date.now()
    setState('recording')

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setDuration(elapsed)
      if (elapsed >= MAX_DURATION_MS) {
        tag.abort()
        clearTimer()
      }
      const cur = accumulated
      if (cur >= MAX_SIZE_BYTES) {
        tag.abort()
        clearTimer()
      }
    }, 100)

    void (async () => {
      try {
        while (true) {
          const result = await reader.read()
          if (result.done || signal.aborted) break

          const frame = result.value as AudioData
          encoder.encode(frame)
          frame.close()

          accumulated = chunks.reduce((sum, c) => sum + c.data.length, 0)
        }
      } catch {
        // Reader cancelled or stream error
      } finally {
        try {
          reader.cancel().catch(() => {})
        } catch {
          // ignore
        }
      }

      await encoder.flush()
      encoder.close()

      if (signal.aborted && intentRef.current !== 'stop') return

      const opusHead = buildOpusHead()

      const target = new ArrayBufferTarget()
      const muxer = new Muxer({
        target,
        audio: {
          codec: 'A_OPUS',
          sampleRate: 48000,
          numberOfChannels: 1,
        },
        firstTimestampBehavior: 'offset',
      })

      for (const c of chunks) {
        muxer.addAudioChunkRaw(c.data, c.type, c.timestamp, {
          decoderConfig: {
            codec: 'opus',
            sampleRate: 48000,
            numberOfChannels: 1,
            description: opusHead.buffer as ArrayBuffer,
          },
        })
      }

      muxer.finalize()

      const finalDuration = Date.now() - startTimeRef.current
      const recorded = new Blob([target.buffer], { type: 'audio/webm' })
      setBlob(recorded)
      setDuration(finalDuration)
      setState('recorded')

      pipelineCleanupRef.current?.()
      pipelineCleanupRef.current = null
    })()
  }, [clearTimer, hardCleanup])

  // ── Public API ────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    intentRef.current = 'stop'

    if (wcAbortRef.current) {
      wcAbortRef.current.abort()
      clearTimer()
    }

    if (mrRecorderRef.current?.state === 'recording') {
      mrRecorderRef.current.stop()
      clearTimer()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [clearTimer])

  const start = useCallback(async () => {
    setError(null)
    setState('requesting')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
      })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError') {
        setError(
          'Microphone access was denied. Please allow microphone access and try again.',
        )
      } else if (name === 'NotFoundError') {
        setError(
          'No microphone found. Please connect a microphone and try again.',
        )
      } else {
        setError('Could not access the microphone.')
      }
      setState('error')
      return
    }

    streamRef.current = stream

    let processedStream: MediaStream
    try {
      const pipeline = createAudioPipeline(stream)
      processedStream = pipeline.outputStream
      pipelineCleanupRef.current = pipeline.cleanup
    } catch {
      processedStream = stream
    }

    if (hasWebCodecs) {
      return startWebCodecs(processedStream)
    }
    return startMediaRecorder(processedStream)
  }, [hasWebCodecs, startMediaRecorder, startWebCodecs])

  const reset = useCallback(() => {
    hardCleanup()
    clearTimer()
    intentRef.current = 'cancel'
    wcAbortRef.current?.abort()
    setBlob(null)
    setDuration(0)
    setError(null)
    setState('idle')
  }, [hardCleanup, clearTimer])

  return { state, blob, duration, error, start, stop, reset }
}
