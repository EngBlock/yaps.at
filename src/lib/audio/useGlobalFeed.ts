import { useQuery } from '@tanstack/react-query'

const APPVIEW_URL = import.meta.env.VITE_APPVIEW_URL as string

export interface AppviewPost {
  uri: string
  cid: string
  author_did: string
  blob_cid: string
  mime_type: string
  duration: number
  waveform?: number[]
  reply_root?: string | null
  reply_root_cid?: string | null
  reply_parent?: string | null
  reply_parent_cid?: string | null
  created_at: string
  like_count: number
  reply_count: number
}

interface FeedResponse {
  posts: AppviewPost[]
  cursor?: string
}

export function useGlobalFeed() {
  return useQuery({
    queryKey: ['globalFeed'],
    queryFn: async (): Promise<AppviewPost[]> => {
      const res = await fetch(
        `${APPVIEW_URL}/xrpc/at.yaps.audio.getFeed?limit=50`,
      )
      if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`)
      const data: FeedResponse = await res.json()
      // Stopgap: filter replies out of the global feed client-side until the
      // appview filters them server-side from getFeed.
      return (data.posts ?? []).filter((p) => !p.reply_root)
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })
}

export function useAuthorFeed(actor: string | null) {
  return useQuery({
    queryKey: ['authorFeed', actor],
    queryFn: async (): Promise<AppviewPost[]> => {
      if (!actor) return []
      const res = await fetch(
        `${APPVIEW_URL}/xrpc/at.yaps.audio.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=50`,
      )
      if (!res.ok) throw new Error(`Author feed fetch failed: ${res.status}`)
      const data: FeedResponse = await res.json()
      return data.posts ?? []
    },
    enabled: !!actor,
  })
}
