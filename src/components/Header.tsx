import { Link } from '@tanstack/react-router'
import { useAuth } from '#/lib/auth/context'
import ThemeToggle from './ThemeToggle'
import LoginButton from './LoginButton'
import UserMenu from './UserMenu'

export default function Header() {
  const { isLoading, isAuthenticated } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-(--line) bg-(--header-bg) px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center gap-3 py-3">

        <img src="/mascot.webp" alt="" width={32} height={32} />

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {!isLoading && (isAuthenticated ? <UserMenu /> : <LoginButton />)}
        </div>
      </nav>
    </header>
  )
}
