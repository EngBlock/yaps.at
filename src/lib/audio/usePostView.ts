import { useQuery } from '@tanstack/react-query'
import { publicAgent } from '#/lib/atproto/public-agent'
import { usePostPlayback } from '#/lib/audio/usePostPlayback'
import type { UsePostPlayback } from '#/lib/audio/usePostPlayback'
import type { AppviewPost } from '#/lib/audio/useGlobalFeed'

export interface UsePostView extends UsePostPlayback {
  profile: {
    handle: string
    displayName?: string
    avatar?: string
  } | undefined
  handle: string
  displayName: string
  profileLinkTarget: string
  waveformBars: number[]
}

const FLAT_WAVEFORM = Array(128).fill(30)

/**
 * Resolves presentation data for an AppviewPost: the author profile (fetched
 * lazily from the Bluesky public API, cached per DID), display fallbacks used
 * while the profile is loading, a safe default waveform, and a playback
 * controller. Shared between PostCard (feed) and PostDetail (single post).
 */
export function usePostView(post: AppviewPost): UsePostView {
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

  const handle = profile?.handle ?? post.author_did.slice(0, 20) + '…'
  const displayName = profile?.displayName || handle
  const profileLinkTarget = profile?.handle ?? post.author_did

  const playback = usePostPlayback({
    authorDid: post.author_did,
    blobCid: post.blob_cid,
    durationMs: post.duration,
  })

  return {
    ...playback,
    profile,
    handle,
    displayName,
    profileLinkTarget,
    waveformBars: post.waveform ?? FLAT_WAVEFORM,
  }
}
