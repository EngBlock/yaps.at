import { useQuery } from '@tanstack/react-query'
import type { AppviewPost } from './useGlobalFeed'

const APPVIEW_URL = import.meta.env.VITE_APPVIEW_URL as string

export interface ThreadViewPost {
  post: AppviewPost
  parent?: ThreadViewPost | NotFoundPost
  replies?: Array<ThreadViewPost | NotFoundPost>
}

export interface NotFoundPost {
  uri: string
  notFound: true
}

export interface PostThreadResponse {
  thread: ThreadViewPost | NotFoundPost
}

export function isNotFound(
  node: ThreadViewPost | NotFoundPost,
): node is NotFoundPost {
  return 'notFound' in node && node.notFound === true
}

async function fetchPostThread(uri: string): Promise<PostThreadResponse> {
  const res = await fetch(
    `${APPVIEW_URL}/xrpc/at.yaps.audio.getPostThread?uri=${encodeURIComponent(uri)}&depth=1`,
  )
  if (!res.ok) throw new Error(`getPostThread failed: ${res.status}`)
  return res.json()
}

export function postThreadQueryOptions(uri: string | undefined) {
  return {
    queryKey: ['postThread', uri] as const,
    queryFn: () => fetchPostThread(uri!),
    enabled: !!uri,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  }
}

export function usePostThread(uri: string | undefined) {
  return useQuery(postThreadQueryOptions(uri))
}
