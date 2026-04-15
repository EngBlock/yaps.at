import type { BrowserOAuthClient } from '@atproto/oauth-client-browser'

const OAUTH_SCOPE =
  'atproto repo:at.yaps.audio.post?action=create repo:at.yaps.audio.like?action=create repo:at.yaps.audio.like?action=delete blob:audio/*'

// Capture callback params at module load time, before the client-side router
// can strip them from the URL during navigation.
const initialCallbackParams =
  typeof window !== 'undefined'
    ? new URLSearchParams(
        window.location.hash?.slice(1) || window.location.search,
      )
    : null

const hasCallbackParams =
  initialCallbackParams?.has('code') || initialCallbackParams?.has('error')

let clientPromise: Promise<BrowserOAuthClient> | null = null

function getClientId(): string {
  const envClientId = import.meta.env.VITE_OAUTH_CLIENT_ID
  if (envClientId) return envClientId

  const { hostname, port } = window.location
  const host = hostname === 'localhost' ? '127.0.0.1' : hostname
  const redirectUri = `http://${host}${port ? ':' + port : ''}/auth/callback`

  const params = new URLSearchParams()
  params.set('redirect_uri', redirectUri)
  params.set('scope', OAUTH_SCOPE)

  return `http://localhost?${params.toString()}`
}

export async function getOAuthClient(): Promise<BrowserOAuthClient> {
  if (!clientPromise) {
    const { BrowserOAuthClient } = await import(
      '@atproto/oauth-client-browser'
    )
    clientPromise = BrowserOAuthClient.load({
      clientId: getClientId(),
      handleResolver: 'https://bsky.social',
    })
  }
  return clientPromise
}

export function getInitialCallbackParams(): URLSearchParams | null {
  return hasCallbackParams ? initialCallbackParams : null
}
