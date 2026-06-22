import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2, ArrowDown } from 'lucide-react'

const THRESHOLD = 70
const MAX_PULL = 120
const RESISTANCE = 0.5
const INDICATOR_SIZE = 40

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown> | unknown
  enabled?: boolean
  children: ReactNode
}

/**
 * Mobile pull-to-refresh. Only attaches touch listeners when `enabled` and
 * only engages when the window is scrolled to the top at touchstart. Prevents
 * the browser's native overscroll bounce while the user is actively pulling.
 */
export function PullToRefresh({
  onRefresh,
  enabled = true,
  children,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const touchStartY = useRef<number | null>(null)
  const distanceRef = useRef(0)
  const refreshingRef = useRef(false)

  useEffect(() => {
    refreshingRef.current = isRefreshing
  }, [isRefreshing])

  useEffect(() => {
    if (!enabled) return

    const handleStart = (e: TouchEvent) => {
      if (refreshingRef.current) return
      if (window.scrollY > 0) return
      if (e.touches.length !== 1) return
      touchStartY.current = e.touches[0].clientY
      distanceRef.current = 0
    }

    const handleMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return
      const delta = e.touches[0].clientY - touchStartY.current
      if (delta <= 0) {
        if (distanceRef.current !== 0) {
          distanceRef.current = 0
          setPullDistance(0)
        }
        return
      }
      // Only block native overscroll while we are actively pulling.
      if (e.cancelable) e.preventDefault()
      const resisted = Math.min(MAX_PULL, delta * RESISTANCE)
      distanceRef.current = resisted
      setPullDistance(resisted)
    }

    const handleEnd = () => {
      if (touchStartY.current === null) return
      touchStartY.current = null
      const distance = distanceRef.current
      distanceRef.current = 0
      setPullDistance(0)
      if (distance >= THRESHOLD) {
        setIsRefreshing(true)
        Promise.resolve(onRefresh()).finally(() => setIsRefreshing(false))
      }
    }

    window.addEventListener('touchstart', handleStart, { passive: true })
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
    window.addEventListener('touchcancel', handleEnd)

    return () => {
      window.removeEventListener('touchstart', handleStart)
      window.removeEventListener('touchmove', handleMove as EventListener)
      window.removeEventListener('touchend', handleEnd)
      window.removeEventListener('touchcancel', handleEnd)
    }
  }, [enabled, onRefresh])

  const armed = pullDistance >= THRESHOLD
  const visible = pullDistance > 0 || isRefreshing
  const indicatorY = isRefreshing
    ? 12
    : Math.max(-INDICATOR_SIZE, pullDistance - INDICATOR_SIZE - 8)

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
        style={{
          transform: `translateY(${indicatorY}px)`,
          opacity: visible ? 1 : 0,
          transition: isRefreshing
            ? 'transform 180ms ease-out, opacity 180ms'
            : touchStartY.current === null
              ? 'transform 220ms ease-out, opacity 220ms'
              : undefined,
        }}
        aria-live="polite"
        aria-hidden={!visible}
      >
        <div
          className="flex items-center justify-center rounded-full shadow-md"
          style={{
            width: INDICATOR_SIZE,
            height: INDICATOR_SIZE,
            background: 'var(--surface-strong)',
            border: '1px solid var(--line)',
            color: armed || isRefreshing ? 'var(--lagoon)' : 'var(--sea-ink-soft)',
          }}
        >
          {isRefreshing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ArrowDown
              size={18}
              style={{
                transform: armed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 160ms ease-out',
              }}
            />
          )}
        </div>
      </div>
      {children}
    </>
  )
}
