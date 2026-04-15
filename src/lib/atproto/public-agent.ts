import { Agent } from '@atproto/api'

/**
 * Unauthenticated agent for the Bluesky public API. Used for profile lookups
 * (handle/displayName/avatar) where we don't need a user session.
 */
export const publicAgent = new Agent('https://public.api.bsky.app')
