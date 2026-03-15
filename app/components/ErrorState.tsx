'use client'

export type ErrorReason = 'GDPR' | 'EMPTY' | 'TIMEOUT' | 'BLOCKED' | 'UNKNOWN'

const ERROR_CONFIG: Record<ErrorReason, { title: string; description: string; icon: string }> = {
  GDPR: {
    title: 'Data unavailable',
    description: 'This information cannot be shown due to privacy settings.',
    icon: '🔒',
  },
  EMPTY: {
    title: 'Nothing here yet',
    description: "No data to display. Check back after some activity.",
    icon: '📭',
  },
  TIMEOUT: {
    title: 'Request timed out',
    description: 'The server took too long to respond. Try again in a moment.',
    icon: '⏱',
  },
  BLOCKED: {
    title: 'Access restricted',
    description: "You don't have permission to view this data.",
    icon: '🚫',
  },
  UNKNOWN: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    icon: '⚠️',
  },
}

interface DataUnavailableErrorProps {
  reason?: ErrorReason
  message?: string
  onRetry?: () => void
  className?: string
}

export function DataUnavailableError({
  reason = 'UNKNOWN',
  message,
  onRetry,
  className = '',
}: DataUnavailableErrorProps) {
  const cfg = ERROR_CONFIG[reason]

  return (
    <div
      className={`bg-[#141414] border border-white/5 rounded-xl p-6 flex flex-col items-center text-center gap-3 ${className}`}
    >
      <span className="text-3xl select-none">{cfg.icon}</span>
      <div>
        <p className="text-gray-300 text-sm font-medium">{cfg.title}</p>
        <p className="text-gray-500 text-xs mt-1 leading-relaxed max-w-xs">
          {message ?? cfg.description}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-all"
        >
          Try again
        </button>
      )}
    </div>
  )
}
