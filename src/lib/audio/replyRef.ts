import type { AppviewPost } from './useGlobalFeed'
import type { ReplyRef } from './types'

export function buildReplyRef(parent: AppviewPost): ReplyRef {
  const parentRef = { uri: parent.uri, cid: parent.cid }

  if (!parent.reply_root) {
    return { root: parentRef, parent: parentRef }
  }

  if (!parent.reply_root_cid) {
    throw new Error(
      'Cannot reply to a nested reply: appview did not return reply_root_cid for the parent post.',
    )
  }

  return {
    root: { uri: parent.reply_root, cid: parent.reply_root_cid },
    parent: parentRef,
  }
}
