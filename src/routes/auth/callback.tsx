import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '#/lib/auth/context'
import { useEffect } from 'react'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
})

function AuthCallback() {
  const { isLoading, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading) {
      navigate({ to: '/' })
    }
  }, [isLoading, isAuthenticated, navigate])

  return (
    <main className="page-wrap flex items-center justify-center px-4 py-20">
      <p className="text-[var(--sea-ink-soft)]">Completing sign in...</p>
    </main>
  )
}
