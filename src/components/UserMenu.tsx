import { Agent } from '@atproto/api'
import { useAuth } from '#/lib/auth/context'
import { useQuery } from '@tanstack/react-query'

const publicAgent = new Agent('https://public.api.bsky.app')

export default function UserMenu() {
  const { did, signOut } = useAuth()

  const { data: profile } = useQuery({
    queryKey: ['profile', did],
    queryFn: async () => {
      if (!did) return null
      const res = await publicAgent.app.bsky.actor.getProfile({ actor: did })
      return res.data
    },
    enabled: !!did,
  })

  return (
    <div className="flex items-center gap-2">
      <div className="avatar">
        <div className="w-8 rounded-full">
          {profile?.avatar ? (
            <img src={profile.avatar} alt={profile?.handle ?? ''} />
          ) : (
            <div className="bg-neutral text-neutral-content flex items-center justify-center w-full h-full text-xs">
              {profile?.handle?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
      </div>
      <span className="text-sm font-medium text-[var(--sea-ink)] hidden sm:inline">
        @{profile?.handle ?? '...'}
      </span>
      <button
        onClick={signOut}
        className="btn btn-ghost btn-xs"
      >
        Sign Out
      </button>
    </div>
  )
}
