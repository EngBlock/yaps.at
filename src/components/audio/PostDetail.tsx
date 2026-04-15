import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Mic, Share2, Check } from 'lucide-react'
import { SpeakingAvatar } from './SpeakingAvatar'
import { WaveformDisplay } from './WaveformDisplay'
import { Composer } from './Composer'
import { PostCard } from './PostCard'
import { formatDuration } from '#/lib/audio/format'
import { usePostView } from '#/lib/audio/usePostView'
import { useAuth } from '#/lib/auth/context'
import { isNotFound } from '#/lib/audio/usePostThread'
import type { ThreadViewPost } from '#/lib/audio/usePostThread'
import type { AppviewPost } from '#/lib/audio/useGlobalFeed'

interface PostDetailProps {
  thread: ThreadViewPost
}

function formatAbsoluteTime(iso: string): string {
  // Fixed locale so SSR and client render identically regardless of server
  // default locale or user browser locale.
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

async function shareOrCopy(url: string, title: string): Promise<'shared' | 'copied'> {
  if (navigator.share) {
    try {
      await navigator.share({ url, title })
      return 'shared'
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'shared'
      // Fall through to clipboard.
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}

export function PostDetail({ thread }: PostDetailProps) {
  const post = thread.post
  const view = usePostView(post)
  const { isAuthenticated } = useAuth()
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const result = await shareOrCopy(url, `${view.displayName} on Yaps.at`)
    if (result === 'copied') {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  const replies = (thread.replies ?? []).filter(
    (r): r is ThreadViewPost => !isNotFound(r),
  )

  return (
    <div className="flex flex-col gap-4">
      <article className="island-shell rounded-2xl p-6">
        <header className="mb-5 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link
              to="/$actor"
              params={{ actor: view.profileLinkTarget }}
              className="block font-semibold no-underline hover:underline"
              style={{ color: 'var(--sea-ink)' }}
            >
              {view.displayName}
            </Link>
            <Link
              to="/$actor"
              params={{ actor: view.profileLinkTarget }}
              className="block text-sm no-underline hover:underline"
              style={{ color: 'var(--sea-ink-soft)' }}
            >
              @{view.handle}
            </Link>
          </div>

          <button
            type="button"
            onClick={handleShare}
            aria-label={copied ? 'Link copied' : 'Share post'}
            className="rounded-full p-2 hover:opacity-70 focus-visible:outline-2"
            style={{ color: 'var(--sea-ink-soft)' }}
          >
            {copied ? <Check size={18} /> : <Share2 size={18} />}
          </button>
        </header>

        <div className="flex items-center gap-4">
          <SpeakingAvatar
            avatarUrl={view.profile?.avatar}
            displayName={view.displayName}
            isPlaying={view.isPlaying}
            isBuffering={view.isBuffering || view.pendingPlay}
            onToggle={view.toggle}
            size={72}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-20">
              <WaveformDisplay
                waveform={view.waveformBars}
                progress={view.progress}
                onSeek={view.audioSrc ? view.seek : undefined}
                shape="cone"
              />
            </div>
            <div
              className="flex items-center justify-between font-mono text-xs tabular-nums"
              style={{ color: 'var(--sea-ink-soft)' }}
            >
              <span>{formatDuration(view.currentMs)}</span>
              <span>{formatDuration(post.duration)}</span>
            </div>
          </div>
        </div>

        <footer
          className="mt-5 flex items-center gap-3 text-xs"
          style={{ color: 'var(--sea-ink-soft)' }}
        >
          <time dateTime={post.created_at}>{formatAbsoluteTime(post.created_at)}</time>
          {(post.like_count > 0 || post.reply_count > 0) && (
            <span className="ml-auto flex items-center gap-3">
              {post.like_count > 0 && <span>{post.like_count} likes</span>}
              {post.reply_count > 0 && <span>{post.reply_count} replies</span>}
            </span>
          )}
        </footer>
      </article>

      <ReplyZone post={post} isAuthenticated={isAuthenticated} />

      {replies.length > 0 && (
        <div className="flex flex-col gap-3">
          {replies.map((reply) => (
            <PostCard key={reply.post.uri} post={reply.post} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReplyZone({
  post,
  isAuthenticated,
}: {
  post: AppviewPost
  isAuthenticated: boolean
}) {
  return (
    <div className="relative pl-4">
      <span
        aria-hidden="true"
        className="absolute left-2 top-[-1rem] bottom-2 w-px"
        style={{ background: 'var(--line)' }}
      />
      {isAuthenticated ? (
        <Composer replyTo={post} />
      ) : (
        <SignInToReplyCard />
      )}
    </div>
  )
}

function SignInToReplyCard() {
  return (
    <Link
      to="/"
      className="island-shell flex items-center gap-3 rounded-2xl p-4 no-underline hover:opacity-80"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: 'var(--surface-strong)', color: 'var(--sea-ink-soft)' }}
      >
        <Mic size={18} />
      </div>
      <span className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        Sign in to reply
      </span>
    </Link>
  )
}
