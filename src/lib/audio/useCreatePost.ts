import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '#/lib/auth/context'
import { generateTid } from './tid'
import { computeWaveform } from './waveform'
import type { ReplyRef } from './types'

interface CreatePostInput {
  blob: Blob
  duration: number
  reply?: ReplyRef
}

export function useCreatePost() {
  const { agent, did } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ blob, duration, reply }: CreatePostInput) => {
      if (!agent || !did) throw new Error('Not authenticated')

      const { samples: waveform } = await computeWaveform(blob)

      const data = new Uint8Array(await blob.arrayBuffer())
      const encoding = blob.type.split(';')[0] || 'audio/webm'
      const uploadResponse = await agent.com.atproto.repo.uploadBlob(data, {
        encoding,
        headers: {
          'Content-Type': encoding,
        },
      })
      const audioBlob = uploadResponse.data.blob
      // PDSes sniff the WebM container and may return mimeType "video/webm".
      // Force it back to the declared audio type so the record validates.
      audioBlob.mimeType = encoding

      const tid = generateTid()

      const record: Record<string, unknown> = {
        $type: 'at.yaps.audio.post',
        audio: audioBlob,
        duration: Math.round(duration),
        waveform,
        createdAt: new Date().toISOString(),
      }

      if (reply) {
        record.reply = reply
      }

      const response = await agent.com.atproto.repo.createRecord({
        repo: did,
        collection: 'at.yaps.audio.post',
        rkey: tid,
        record,
      })

      return response.data
    },
    onSuccess: () => {
      // Give the appview a moment to ingest the record from the firehose
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['globalFeed'] })
        queryClient.invalidateQueries({ queryKey: ['authorFeed'] })
      }, 1500)
    },
  })
}
