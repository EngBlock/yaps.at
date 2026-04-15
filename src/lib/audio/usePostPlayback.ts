import { useCallback, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { resolvePdsUrl } from '#/lib/atproto/resolve-pds'
import { getAudioBlobUrl } from '#/lib/audio/blob-url'
import { useAudioPlayer } from '#/lib/audio/useAudioPlayer'

export interface UsePostPlaybackArgs {
  authorDid: string
  blobCid: string
  durationMs: number
}

export interface UsePostPlayback {
  isPlaying: boolean
  isBuffering: boolean
  currentMs: number
  progress: number
  toggle: () => void
  seek: (fraction: number) => void
  audioSrc: string
  pendingPlay: boolean
}

/**
 * Wraps useAudioPlayer with PDS resolution and a deferred-play intent:
 * if the user taps play before the DID document has resolved to a PDS URL,
 * the intent is queued and fired once the audio src becomes available.
 */
export function usePostPlayback({
  authorDid,
  blobCid,
  durationMs,
}: UsePostPlaybackArgs): UsePostPlayback {
  const { data: pdsUrl } = useQuery({
    queryKey: ['pds', authorDid],
    queryFn: () => resolvePdsUrl(authorDid),
    staleTime: Infinity,
  })

  const audioSrc = pdsUrl ? getAudioBlobUrl(pdsUrl, authorDid, blobCid) : ''

  const player = useAudioPlayer(audioSrc, durationMs)
  const pendingPlayRef = useRef(false)

  useEffect(() => {
    if (pendingPlayRef.current && audioSrc) {
      pendingPlayRef.current = false
      player.toggle()
    }
  }, [audioSrc, player])

  const toggle = useCallback(() => {
    if (!audioSrc) {
      pendingPlayRef.current = true
      return
    }
    player.toggle()
  }, [audioSrc, player])

  return {
    isPlaying: player.isPlaying,
    isBuffering: player.isBuffering,
    currentMs: player.currentMs,
    progress: player.progress,
    seek: player.seek,
    toggle,
    audioSrc,
    pendingPlay: !audioSrc && pendingPlayRef.current,
  }
}
