import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mic, X } from 'lucide-react'
import { useRecorder } from '#/lib/audio/useRecorder'
import { useCreatePost } from '#/lib/audio/useCreatePost'
import { computeWaveform } from '#/lib/audio/waveform'
import type { WaveformResult } from '#/lib/audio/waveform'
import { buildReplyRef } from '#/lib/audio/replyRef'
import { publicAgent } from '#/lib/atproto/public-agent'
import type { AppviewPost } from '#/lib/audio/useGlobalFeed'
import { RecordButton } from './RecordButton'
import { RecordingPreview } from './RecordingPreview'

interface ComposerProps {
  replyTo?: AppviewPost
}

export function Composer({ replyTo }: ComposerProps) {
  const recorder = useRecorder()
  const createPost = useCreatePost()
  const [waveformResult, setWaveformResult] = useState<WaveformResult | null>(null)
  const [expanded, setExpanded] = useState(!replyTo)

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
        reply: replyTo ? buildReplyRef(replyTo) : undefined,
      },
      {
        onSuccess: () => {
          recorder.reset()
          if (replyTo) setExpanded(false)
        },
      },
    )
  }

  const handleCancel = () => {
    recorder.reset()
    setExpanded(false)
  }

  if (replyTo && !expanded) {
    return <CollapsedReplyCard onExpand={() => setExpanded(true)} />
  }

  const isReply = !!replyTo
  const containerClass = isReply
    ? 'rounded-2xl p-4'
    : 'island-shell rounded-2xl p-5'
  const containerStyle = isReply
    ? { background: 'var(--surface)', border: '1px solid var(--line)' }
    : undefined

  return (
    <div className={containerClass} style={containerStyle}>
      {replyTo && <ReplyingToLabel parent={replyTo} />}

      {recorder.state === 'recorded' && recorder.blob ? (
        <RecordingPreview
          blob={recorder.blob}
          duration={waveformResult?.durationMs ?? recorder.duration}
          waveform={waveformResult?.samples ?? null}
          isPosting={createPost.isPending}
          onReRecord={recorder.reset}
          onPost={handlePost}
          postLabel={isReply ? 'Post reply' : 'Post'}
        />
      ) : (
        <RecordButton
          state={recorder.state}
          duration={recorder.duration}
          onStart={recorder.start}
          onStop={recorder.stop}
        />
      )}

      {replyTo && recorder.state === 'idle' && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1 text-xs hover:underline"
            style={{ color: 'var(--sea-ink-soft)' }}
          >
            <X size={12} />
            Cancel
          </button>
        </div>
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

function CollapsedReplyCard({ onExpand }: { onExpand: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="island-shell flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-opacity hover:opacity-80"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: 'var(--surface-strong)', color: 'var(--sea-ink-soft)' }}
      >
        <Mic size={18} />
      </div>
      <span className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        Reply with your voice
      </span>
    </button>
  )
}

function ReplyingToLabel({ parent }: { parent: AppviewPost }) {
  const { data: profile } = useQuery({
    queryKey: ['profile', parent.author_did],
    queryFn: async () => {
      const res = await publicAgent.app.bsky.actor.getProfile({
        actor: parent.author_did,
      })
      return res.data
    },
    staleTime: 5 * 60_000,
  })

  const handle = profile?.handle ?? parent.author_did.slice(0, 20) + '…'

  return (
    <p
      className="mb-3 text-center text-xs"
      style={{ color: 'var(--sea-ink-soft)' }}
    >
      Replying to <span style={{ color: 'var(--sea-ink)' }}>@{handle}</span>
    </p>
  )
}
