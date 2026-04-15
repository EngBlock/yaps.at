import type { AppviewPost } from './useGlobalFeed'
import type { PostThreadResponse } from './usePostThread'

/**
 * Wrap a feed entry in the getPostThread response envelope so it can be used
 * to seed the postThread query cache on feed → detail navigation.
 *
 * The appview currently returns the same flat snake_case shape for feed and
 * thread responses, so no field transformation is needed.
 */
export function feedEntryToThreadResponse(p: AppviewPost): PostThreadResponse {
  return {
    thread: {
      post: p,
      replies: [],
    },
  }
}
