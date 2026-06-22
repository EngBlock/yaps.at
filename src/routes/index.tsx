import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '#/lib/auth/context'
import { useGlobalFeed } from '#/lib/audio/useGlobalFeed'
import { Composer } from '#/components/audio/Composer'
import { PostCard } from '#/components/audio/PostCard'
import { PullToRefresh } from '#/components/PullToRefresh'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { isAuthenticated, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const handleRefresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['globalFeed'] }),
    [queryClient],
  )

  if (isLoading) {
    return (
      <main className="page-wrap px-4 pb-8 pt-14">
        <div className="flex justify-center py-12">
          <span className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
            Loading...
          </span>
        </div>
      </main>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <main className="page-wrap min-h-screen px-4 pb-8 pt-14">
        <div className="rise-in mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl gap-6">
          {/* Left sidebar — sticky */}
          <div className="hidden w-80 shrink-0 md:block">
            <div className="sticky top-20 flex flex-col gap-4">
              {isAuthenticated ? <Composer /> : <Welcome />}
            </div>
          </div>

          {/* Right column — scrollable feed */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* Show composer/welcome inline on mobile only */}
            <div className="md:hidden">
              {isAuthenticated ? <Composer /> : <Welcome />}
            </div>
            <Feed />
          </div>
        </div>
      </main>
    </PullToRefresh>
  )
}

function Welcome() {
  return (
    <div className="island-shell rounded-2xl p-8 text-center">
      <div
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
      >
        <img src="/mascot.webp" />
      </div>
      <h1 className="display-title mb-3 text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        Yaps.at
      </h1>
      <p className="mb-2 text-base" style={{ color: 'var(--sea-ink-soft)' }}>
        Voice-first microblogging on the atmosphere.
      </p>
      <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        Sign in with your internet handle to record your own voice posts.
      </p>
    </div>
  )
}

function Feed() {
  const feed = useGlobalFeed()

  if (feed.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
          Loading feed...
        </span>
      </div>
    )
  }

  if (feed.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm" style={{ color: 'var(--palm)' }}>Failed to load feed.</p>
        <button
          type="button"
          onClick={() => feed.refetch()}
          disabled={feed.isFetching}
          className="btn btn-sm"
          style={{
            borderColor: 'var(--line)',
            background: 'var(--surface)',
            color: 'var(--sea-ink)',
          }}
        >
          {feed.isFetching ? 'Retrying…' : 'Try again'}
        </button>
      </div>
    )
  }

  if (!feed.data || feed.data.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
          No posts yet. Be the first!
        </p>
      </div>
    )
  }

  return (
    <>
      {feed.data.map((post) => (
        <PostCard key={post.uri} post={post} />
      ))}
    </>
  )
}
