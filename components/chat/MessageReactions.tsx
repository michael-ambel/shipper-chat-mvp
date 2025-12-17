'use client'

interface ReactionData {
  emoji: string
  count: number
  users: { id: string; name: string }[]
  hasReacted: boolean
}

interface MessageReactionsProps {
  reactions: ReactionData[]
  onToggleReaction: (emoji: string, hasReacted: boolean) => void
  isOwn: boolean
}

export default function MessageReactions({ reactions, onToggleReaction, isOwn }: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) return null

  return (
    <div 
      className="absolute flex gap-0.5"
      style={{
        bottom: '-8px',
        ...(isOwn ? { left: '8px' } : { right: '8px' }),
      }}
    >
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onToggleReaction(reaction.emoji, reaction.hasReacted)}
          className="flex items-center justify-center rounded-full transition-all hover:scale-110 shadow-sm"
          style={{
            width: '20px',
            height: '20px',
            padding: '4px',
            backgroundColor: isOwn ? '#FFFFFF' : '#F0FDF4',
            fontSize: '12px',
          }}
          title={reaction.users.map((u) => u.name).join(', ')}
        >
          {reaction.emoji}
        </button>
      ))}
    </div>
  )
}

