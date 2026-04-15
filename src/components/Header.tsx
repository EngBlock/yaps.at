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
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5 text-sm font-semibold text-(--sea-ink) no-underline shadow-[0_8px_24px_rgba(45,45,58,0.06)]"
        >
          <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#F5C040,#EF7B5C)]" />
          Yaps.at
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {!isLoading && (isAuthenticated ? <UserMenu /> : <LoginButton />)}
        </div>
      </nav>
    </header>
  )
}
