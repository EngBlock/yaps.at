import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useAuthorFeed } from '#/lib/audio/useGlobalFeed'
import { PostCard } from '#/components/audio/PostCard'
import { publicAgent } from '#/lib/atproto/public-agent'

export const Route = createFileRoute('/$actor/')({ component: ProfilePage })

function ProfilePage() {
  const { actor } = Route.useParams()

  const profileQuery = useQuery({
    queryKey: ['profile', actor],
    queryFn: async () => {
      const res = await publicAgent.app.bsky.actor.getProfile({ actor })
      return res.data
    },
    staleTime: 5 * 60_000,
  })

  const authorDid = profileQuery.data?.did ?? null
  const feed = useAuthorFeed(authorDid)

  return (
    <main className="page-wrap min-h-screen px-4 pb-8 pt-14">
      <div className="rise-in mx-auto flex max-w-lg flex-col gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 self-start text-sm"
          style={{ color: 'var(--sea-ink-soft)' }}
        >
          <ArrowLeft size={14} />
          Back to feed
        </Link>

        <ProfileHeader
          actor={actor}
          isLoading={profileQuery.isLoading}
          isError={profileQuery.isError}
          profile={profileQuery.data}
        />

        {authorDid && <AuthorPosts feed={feed} />}
      </div>
    </main>
  )
}

interface ProfileHeaderProps {
  actor: string
  isLoading: boolean
  isError: boolean
  profile: {
    did: string
    handle: string
    displayName?: string
    avatar?: string
    description?: string
  } | undefined
}

function ProfileHeader({ actor, isLoading, isError, profile }: ProfileHeaderProps) {
  if (isLoading) {
    return (
      <div className="island-shell rounded-2xl p-5">
        <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
          Loading profile...
        </p>
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="island-shell rounded-2xl p-5">
        <p className="text-sm text-red-500">
          Could not load profile for <span className="font-mono">{actor}</span>
        </p>
      </div>
    )
  }

  const displayName = profile.displayName || profile.handle

  return (
    <div className="island-shell rounded-2xl p-5">
      <div className="flex items-center gap-4">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ background: 'var(--lagoon)' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1
            className="display-title truncate text-xl font-bold"
            style={{ color: 'var(--sea-ink)' }}
          >
            {displayName}
          </h1>
          <p className="truncate text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
            @{profile.handle}
          </p>
        </div>
      </div>

      {profile.description && (
        <p className="mt-4 text-sm whitespace-pre-wrap" style={{ color: 'var(--sea-ink)' }}>
          {profile.description}
        </p>
      )}
    </div>
  )
}

function AuthorPosts({ feed }: { feed: ReturnType<typeof useAuthorFeed> }) {
  if (feed.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
          Loading posts...
        </span>
      </div>
    )
  }

  if (feed.isError) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-red-500">Failed to load posts.</p>
      </div>
    )
  }

  if (!feed.data || feed.data.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
          No voice posts yet.
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
