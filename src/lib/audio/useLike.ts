import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '#/lib/auth/context'
import { generateTid } from './tid'
import type { StrongRef } from './types'

export function useLike() {
  const { agent, did } = useAuth()
  const queryClient = useQueryClient()

  const invalidateFeeds = () => {
    queryClient.invalidateQueries({ queryKey: ['globalFeed'] })
    queryClient.invalidateQueries({ queryKey: ['authorFeed'] })
    queryClient.invalidateQueries({ queryKey: ['postThread'] })
  }

  const like = useMutation({
    mutationFn: async (subject: StrongRef) => {
      if (!agent || !did) throw new Error('Not authenticated')

      const tid = generateTid()
      const response = await agent.com.atproto.repo.createRecord({
        repo: did,
        collection: 'at.yaps.audio.like',
        rkey: tid,
        record: {
          $type: 'at.yaps.audio.like',
          subject,
          createdAt: new Date().toISOString(),
        },
      })

      return response.data
    },
    onSuccess: invalidateFeeds,
  })

  const unlike = useMutation({
    mutationFn: async (rkey: string) => {
      if (!agent || !did) throw new Error('Not authenticated')

      await agent.com.atproto.repo.deleteRecord({
        repo: did,
        collection: 'at.yaps.audio.like',
        rkey,
      })
    },
    onSuccess: invalidateFeeds,
  })

  return { like, unlike }
}
