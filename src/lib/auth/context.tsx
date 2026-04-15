import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { Agent } from '@atproto/api'
import type { OAuthSession } from '@atproto/oauth-client-browser'
import { getOAuthClient, getInitialCallbackParams } from './client'

interface AuthState {
  isLoading: boolean
  isAuthenticated: boolean
  session: OAuthSession | null
  agent: Agent | null
  did: string | null
  pdsUrl: string | null
}

interface AuthActions {
  signIn: (handle: string) => Promise<void>
  signOut: () => Promise<void>
}

type AuthContextValue = AuthState & AuthActions

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<OAuthSession | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)

  useEffect(() => {
    let disposed = false

    async function initialize() {
      try {
        const client = await getOAuthClient()
        if (disposed) return

        // Use initCallback with captured params if this is a callback,
        // otherwise just restore existing sessions.
        const callbackParams = getInitialCallbackParams()
        let result: { session: OAuthSession } | undefined

        if (callbackParams) {
          result = await client.initCallback(callbackParams)
        } else {
          result = await client.initRestore()
        }

        if (!disposed && result?.session) {
          setSession(result.session)
          const newAgent = new Agent(result.session)
          setAgent(newAgent)
        }
      } catch (err) {
        console.error('Auth initialization failed:', err)
      } finally {
        if (!disposed) setIsLoading(false)
      }
    }

    initialize()
    return () => {
      disposed = true
    }
  }, [])

  const signIn = useCallback(async (handle: string) => {
    const client = await getOAuthClient()
    await client.signInRedirect(handle, {
      state: window.location.pathname,
      scope:
        'atproto repo:at.yaps.audio.post?action=create repo:at.yaps.audio.like?action=create repo:at.yaps.audio.like?action=delete blob:audio/*',
    })
  }, [])

  const signOut = useCallback(async () => {
    if (session?.did) {
      const client = await getOAuthClient()
      await client.revoke(session.did)
    }
    setSession(null)
    setAgent(null)
  }, [session])

  const pdsUrl = session?.serverMetadata?.issuer ?? null

  const value: AuthContextValue = {
    isLoading,
    isAuthenticated: session !== null,
    session,
    agent,
    did: session?.did ?? null,
    pdsUrl,
    signIn,
    signOut,
  }

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
