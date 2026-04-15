import { useState } from 'react'
import { useAuth } from '#/lib/auth/context'

export default function LoginButton() {
  const { signIn } = useAuth()
  const [handle, setHandle] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!handle.trim()) return
    setIsSigningIn(true)
    setError(null)
    try {
      await signIn(handle.trim())
    } catch (err) {
      console.error(err)
      setError('Failed to sign in. Check your handle and try again.')
      setIsSigningIn(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        placeholder="handle.bsky.social"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        disabled={isSigningIn}
        className="input input-sm input-bordered w-44"
      />
      <button
        type="submit"
        disabled={isSigningIn || !handle.trim()}
        className="btn btn-sm btn-primary"
      >
        {isSigningIn ? 'Redirecting...' : 'Sign In'}
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </form>
  )
}
