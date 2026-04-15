import { Play, Pause, Loader2 } from 'lucide-react'

interface SpeakingAvatarProps {
  avatarUrl?: string
  displayName: string
  isPlaying: boolean
  isBuffering?: boolean
  onToggle: () => void
  disabled?: boolean
  size?: number
}

export function SpeakingAvatar({
  avatarUrl,
  displayName,
  isPlaying,
  isBuffering = false,
  onToggle,
  disabled = false,
  size = 48,
}: SpeakingAvatarProps) {
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={isPlaying ? `Pause ${displayName}'s wave` : `Play ${displayName}'s wave`}
      aria-busy={isBuffering}
      className="speaking-avatar relative shrink-0 rounded-full outline-none focus-visible:ring-2 disabled:opacity-60"
      style={{
        width: size,
        height: size,
        ['--speaking-ring' as string]: 'var(--lagoon)',
      } as React.CSSProperties}
    >
      {isPlaying && !isBuffering && (
        <>
          <span aria-hidden className="speaking-ripple" />
          <span aria-hidden className="speaking-ripple speaking-ripple--delayed" />
        </>
      )}

      <span className="relative block h-full w-full overflow-hidden rounded-full">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-bold text-white"
            style={{
              background: 'var(--lagoon)',
              fontSize: size * 0.4,
            }}
          >
            {initial}
          </span>
        )}
      </span>

      <span
        aria-hidden
        className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full shadow-sm"
        style={{
          background: 'var(--lagoon-deep)',
          border: '2px solid var(--surface-strong)',
        }}
      >
        {isBuffering ? (
          <Loader2 size={10} className="animate-spin text-white" />
        ) : isPlaying ? (
          <Pause size={9} className="text-white" fill="white" />
        ) : (
          <Play size={9} className="ml-px text-white" fill="white" />
        )}
      </span>
    </button>
  )
}
