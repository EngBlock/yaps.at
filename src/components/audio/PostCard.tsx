import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { SpeakingAvatar } from './SpeakingAvatar'
import { WaveformDisplay } from './WaveformDisplay'
import { formatDuration } from '#/lib/audio/format'
import { usePostView } from '#/lib/audio/usePostView'
import { feedEntryToThreadResponse } from '#/lib/audio/feedToPostView'
import type { AppviewPost } from '#/lib/audio/useGlobalFeed'

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

function parseRkey(uri: string): string {
  const parts = uri.split('/')
  return parts[parts.length - 1]
}

export function PostCard({ post }: PostCardProps) {
  const queryClient = useQueryClient()
  const view = usePostView(post)
  const rkey = parseRkey(post.uri)

  const timeLabel = view.isPlaying
    ? formatDuration(view.currentMs)
    : formatDuration(post.duration)

  const handleOpenClick = () => {
    if (!view.profile) return
    // Cancel any in-flight fetch (hover-preload may have started one) before
    // seeding the cache — otherwise the late fetch result overwrites our
    // hydrated data and the component renders with stale shape.
    void queryClient.cancelQueries({ queryKey: ['postThread', post.uri] })
    queryClient.setQueryData(
      ['postThread', post.uri],
      feedEntryToThreadResponse(post),
    )
    // The seed only contains the post — replies are missing. Mark the query
    // stale so when the detail page mounts it refetches in the background and
    // the replies appear without a manual refresh.
    void queryClient.invalidateQueries({
      queryKey: ['postThread', post.uri],
      refetchType: 'none',
    })
  }

  return (
    <div className="island-shell relative rounded-2xl p-4">
      <Link
        to="/$actor/$rkey"
        params={{ actor: view.profileLinkTarget, rkey }}
        onClick={handleOpenClick}
        aria-label="Open post"
        className="absolute right-3 top-3 rounded p-1 no-underline hover:opacity-70"
        style={{ color: 'var(--sea-ink-soft)' }}
      >
        <ArrowUpRight size={16} />
      </Link>

      <div className="flex items-center gap-3 pr-6">
        <SpeakingAvatar
          avatarUrl={view.profile?.avatar}
          displayName={view.displayName}
          isPlaying={view.isPlaying}
          isBuffering={view.isBuffering || view.pendingPlay}
          onToggle={view.toggle}
        />

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 flex-1">
            <WaveformDisplay
              waveform={view.waveformBars}
              progress={view.progress}
              onSeek={view.audioSrc ? view.seek : undefined}
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
          to="/$actor"
          params={{ actor: view.profileLinkTarget }}
          className="font-semibold no-underline hover:underline"
          style={{ color: 'var(--sea-ink)' }}
        >
          {view.displayName}
        </Link>
        <Link
          to="/$actor"
          params={{ actor: view.profileLinkTarget }}
          className="no-underline hover:underline"
          style={{ color: 'var(--sea-ink-soft)' }}
        >
          @{view.handle}
        </Link>
        <span style={{ color: 'var(--sea-ink-soft)' }}>·</span>
        <span suppressHydrationWarning style={{ color: 'var(--sea-ink-soft)' }}>
          {timeAgo(post.created_at)}
        </span>
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
