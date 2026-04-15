export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--sea-ink-soft)]">
      <div className="page-wrap">
        <p className="m-0">&copy; {new Date().getFullYear()} Yaps.at</p>
      </div>
    </footer>
  )
}
