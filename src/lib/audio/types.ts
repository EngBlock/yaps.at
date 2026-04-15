import type { BlobRef } from '@atproto/api'

export interface StrongRef {
  uri: string
  cid: string
}

export interface ReplyRef {
  root: StrongRef
  parent: StrongRef
}

/**
 * Write-side record shape — uses @atproto/api's BlobRef class, which is what
 * uploadBlob returns and createRecord expects.
 */
export interface AudioPostRecord {
  $type: 'at.yaps.audio.post'
  audio: BlobRef
  duration: number
  waveform?: number[]
  reply?: ReplyRef
  createdAt: string
}
