import type { BlobRef } from '@atproto/api'

export interface StrongRef {
  uri: string
  cid: string
}

export interface ReplyRef {
  root: StrongRef
  parent: StrongRef
}

export interface AudioPostRecord {
  $type: 'at.yaps.audio.post'
  audio: BlobRef
  duration: number
  waveform?: number[]
  reply?: ReplyRef
  createdAt: string
}

export interface ActorBasic {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

export interface ViewerState {
  like?: string
}

export interface PostView {
  uri: string
  cid: string
  author: ActorBasic
  record: AudioPostRecord
  likeCount?: number
  replyCount?: number
  indexedAt: string
  viewer?: ViewerState
}
