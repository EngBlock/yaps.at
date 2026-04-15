import { useState, useEffect } from 'react'
import { useRecorder } from '#/lib/audio/useRecorder'
import { useCreatePost } from '#/lib/audio/useCreatePost'
import { computeWaveform } from '#/lib/audio/waveform'
import type { WaveformResult } from '#/lib/audio/waveform'
import { RecordButton } from './RecordButton'
import { RecordingPreview } from './RecordingPreview'

export function Composer() {
  const recorder = useRecorder()
  const createPost = useCreatePost()
  const [waveformResult, setWaveformResult] = useState<WaveformResult | null>(null)

  useEffect(() => {
    if (recorder.blob) {
      setWaveformResult(null)
      computeWaveform(recorder.blob).then(setWaveformResult)
    } else {
      setWaveformResult(null)
    }
  }, [recorder.blob])

  const handlePost = () => {
    if (!recorder.blob) return

    createPost.mutate(
      {
        blob: recorder.blob,
        duration: waveformResult?.durationMs ?? recorder.duration,
      },
      {
        onSuccess: () => {
          recorder.reset()
        },
      },
    )
  }

  return (
    <div className="island-shell rounded-2xl p-5">
      {recorder.state === 'recorded' && recorder.blob ? (
        <RecordingPreview
          blob={recorder.blob}
          duration={waveformResult?.durationMs ?? recorder.duration}
          waveform={waveformResult?.samples ?? null}
          isPosting={createPost.isPending}
          onReRecord={recorder.reset}
          onPost={handlePost}
        />
      ) : (
        <RecordButton
          state={recorder.state}
          duration={recorder.duration}
          onStart={recorder.start}
          onStop={recorder.stop}
        />
      )}

      {recorder.error && (
        <p className="mt-3 text-center text-sm" style={{ color: 'var(--palm)' }}>{recorder.error}</p>
      )}

      {createPost.isError && (
        <p className="mt-3 text-center text-sm" style={{ color: 'var(--palm)' }}>
          Failed to post: {createPost.error instanceof Error ? createPost.error.message : 'Unknown error'}
        </p>
      )}
    </div>
  )
}