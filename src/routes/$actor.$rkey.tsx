import { useEffect } from 'react'
import { createFileRoute, Link, useRouter, useCanGoBack } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { PostDetail } from '#/components/audio/PostDetail'
import { publicAgent } from '#/lib/atproto/public-agent'
import {
  postThreadQueryOptions,
  usePostThread,
  isNotFound,
} from '#/lib/audio/usePostThread'

export const Route = createFileRoute('/$actor/$rkey')({
  loader: async ({ params, context }) => {
    const { queryClient } = context

    const profile = await queryClient.ensureQueryData({
      queryKey: ['profile', params.actor],
      queryFn: async () => {
        const res = await publicAgent.app.bsky.actor.getProfile({
          actor: params.actor,
        })
        return res.data
      },
      staleTime: 5 * 60_000,
    })

    // Seed the DID-keyed cache so PostDetail/PostCard (which query by DID)
    // render the resolved profile on first paint and don't cause a
    // hydration mismatch between SSR and client.
    queryClient.setQueryData(['profile', profile.did], profile)

    const uri = `at://${profile.did}/at.yaps.audio.post/${params.rkey}`

    // Await: on SSR this makes the response part of the hydrated HTML so the
    // initial client render matches. On feed → detail navigation the cache is
    // already seeded (fresh within staleTime), so this resolves synchronously
    // without a network round-trip.
    await queryClient.ensureQueryData(postThreadQueryOptions(uri))

    return { uri, did: profile.did, handle: profile.handle }
  },
  component: PostPage,
})

function PostPage() {
  const { actor, rkey } = Route.useParams()
  const { uri, handle } = Route.useLoaderData()
  const thread = usePostThread(uri)
  const router = useRouter()
  const canGoBack = useCanGoBack()

  useEffect(() => {
    const prev = document.title
    document.title = `@${handle} on Yaps.at`
    return () => {
      document.title = prev
    }
  }, [handle])

  return (
    <main className="page-wrap min-h-screen px-4 pb-8 pt-14">
      <div className="rise-in mx-auto flex max-w-2xl flex-col gap-4">
        {canGoBack ? (
          <button
            type="button"
            onClick={() => router.history.back()}
            className="inline-flex items-center gap-1.5 self-start text-sm no-underline hover:underline"
            style={{ color: 'var(--sea-ink-soft)' }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
        ) : (
          <Link
            to="/$actor"
            params={{ actor }}
            className="inline-flex items-center gap-1.5 self-start text-sm no-underline hover:underline"
            style={{ color: 'var(--sea-ink-soft)' }}
          >
            <ArrowLeft size={14} />
            @{handle}
          </Link>
        )}

        {thread.isLoading && <Skeleton />}
        {thread.isError && <ErrorTombstone actor={actor} rkey={rkey} onRetry={() => thread.refetch()} />}
        {thread.data && isNotFound(thread.data.thread) && (
          <NotFoundTombstone actor={actor} rkey={rkey} />
        )}
        {thread.data && !isNotFound(thread.data.thread) && (
          <PostDetail thread={thread.data.thread} />
        )}
      </div>
    </main>
  )
}

function Skeleton() {
  return (
    <div className="island-shell animate-pulse rounded-2xl p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex-1">
          <div className="mb-2 h-4 w-32 rounded" style={{ background: 'var(--surface-strong)' }} />
          <div className="h-3 w-24 rounded" style={{ background: 'var(--surface-strong)' }} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div
          className="h-[72px] w-[72px] shrink-0 rounded-full"
          style={{ background: 'var(--surface-strong)' }}
        />
        <div className="h-20 flex-1 rounded" style={{ background: 'var(--surface-strong)' }} />
      </div>
    </div>
  )
}

function NotFoundTombstone({ actor, rkey }: { actor: string; rkey: string }) {
  return (
    <div className="island-shell rounded-2xl p-6 text-center">
      <p className="mb-2 text-sm" style={{ color: 'var(--sea-ink)' }}>
        This post is unavailable.
      </p>
      <p className="text-xs" style={{ color: 'var(--sea-ink-soft)' }}>
        It may have been deleted. <Link
          to="/$actor"
          params={{ actor }}
          className="underline"
        >See @{actor}&apos;s posts</Link>.
      </p>
      <p className="mt-4 font-mono text-xs" style={{ color: 'var(--sea-ink-soft)' }}>
        {rkey}
      </p>
    </div>
  )
}

function ErrorTombstone({
  actor,
  rkey,
  onRetry,
}: {
  actor: string
  rkey: string
  onRetry: () => void
}) {
  return (
    <div className="island-shell rounded-2xl p-6 text-center">
      <p className="mb-3 text-sm" style={{ color: 'var(--sea-ink)' }}>
        Couldn&apos;t load this post.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full px-4 py-1.5 text-xs font-semibold"
        style={{ background: 'var(--lagoon)', color: 'white' }}
      >
        Retry
      </button>
      <p className="mt-4 font-mono text-xs" style={{ color: 'var(--sea-ink-soft)' }}>
        @{actor} · {rkey}
      </p>
    </div>
  )
}
