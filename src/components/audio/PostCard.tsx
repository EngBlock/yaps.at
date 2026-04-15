import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Agent } from '@atproto/api'
import { SpeakingAvatar } from './SpeakingAvatar'
import { WaveformDisplay } from './WaveformDisplay'
import { getAudioBlobUrl } from '#/lib/audio/blob-url'
import { formatDuration } from '#/lib/audio/format'
import { resolvePdsUrl } from '#/lib/atproto/resolve-pds'
import { useAudioPlayer } from '#/lib/audio/useAudioPlayer'
import type { AppviewPost } from '#/lib/audio/useGlobalFeed'

const publicAgent = new Agent('https://public.api.bsky.app')

interface PostCardProps {
  post: AppviewPost
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function PostCard({ post }: PostCardProps) {
  const { data: pdsUrl } = useQuery({
    queryKey: ['pds', post.author_did],
    queryFn: () => resolvePdsUrl(post.author_did),
    staleTime: Infinity,
  })

  const { data: profile } = useQuery({
    queryKey: ['profile', post.author_did],
    queryFn: async () => {
      const res = await publicAgent.app.bsky.actor.getProfile({
        actor: post.author_did,
      })
      return res.data
    },
    staleTime: 5 * 60_000,
  })

  const audioSrc = pdsUrl ? getAudioBlobUrl(pdsUrl, post.author_did, post.blob_cid) : ''
  const handle = profile?.handle ?? post.author_did.slice(0, 20) + '…'
  const displayName = profile?.displayName || handle
  const profileLinkTarget = profile?.handle ?? post.author_did

  const { isPlaying, isBuffering, currentMs, progress, toggle, seek } =
    useAudioPlayer(audioSrc, post.duration)

  // Pending play intent queued while the audio element is still loading its
  // source. Ensures a user who clicks before the DID/blob URL is ready doesn't
  // need to click again.
  const pendingPlayRef = useRef(false)

  useEffect(() => {
    if (pendingPlayRef.current && audioSrc) {
      pendingPlayRef.current = false
      toggle()
    }
  }, [audioSrc, toggle])

  const handleAvatarToggle = () => {
    if (!audioSrc) {
      pendingPlayRef.current = true
      return
    }
    toggle()
  }

  const waveformBars = post.waveform ?? Array(128).fill(30)
  const timeLabel = isPlaying
    ? formatDuration(currentMs)
    : formatDuration(post.duration)
  const pendingPlay = !audioSrc && pendingPlayRef.current

  return (
    <div className="island-shell rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <SpeakingAvatar
          avatarUrl={profile?.avatar}
          displayName={displayName}
          isPlaying={isPlaying}
          isBuffering={isBuffering || pendingPlay}
          onToggle={handleAvatarToggle}
        />

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 flex-1">
            <WaveformDisplay
              waveform={waveformBars}
              progress={progress}
              onSeek={seek}
              shape="cone"
            />
          </div>
          <span
            className="shrink-0 font-mono text-xs font-medium tabular-nums"
            style={{ color: 'var(--sea-ink-soft)' }}
          >
            {timeLabel}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <Link
          to="/profile/$actor"
          params={{ actor: profileLinkTarget }}
          className="font-semibold no-underline hover:underline"
          style={{ color: 'var(--sea-ink)' }}
        >
          {displayName}
        </Link>
        <Link
          to="/profile/$actor"
          params={{ actor: profileLinkTarget }}
          className="no-underline hover:underline"
          style={{ color: 'var(--sea-ink-soft)' }}
        >
          @{handle}
        </Link>
        <span style={{ color: 'var(--sea-ink-soft)' }}>·</span>
        <span style={{ color: 'var(--sea-ink-soft)' }}>{timeAgo(post.created_at)}</span>
        {(post.like_count > 0 || post.reply_count > 0) && (
          <span className="ml-auto flex items-center gap-3" style={{ color: 'var(--sea-ink-soft)' }}>
            {post.like_count > 0 && <span>{post.like_count} likes</span>}
            {post.reply_count > 0 && <span>{post.reply_count} replies</span>}
          </span>
        )}
      </div>
    </div>
  )
}
