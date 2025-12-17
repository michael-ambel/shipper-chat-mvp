'use client'

import { useState, useRef, useEffect } from 'react'
import { Smile, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import EmojiPicker from './EmojiPicker'

interface MessageActionsProps {
  isOwn: boolean
  isDeleted: boolean
  onEdit: () => void
  onDelete: () => void
  onReact: (emoji: string) => void
  show: boolean
}

export default function MessageActions({
  isOwn,
  isDeleted,
  onEdit,
  onDelete,
  onReact,
  show,
}: MessageActionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show) {
      setShowEmojiPicker(false)
      setShowMenu(false)
    }
  }, [show])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!show || isDeleted) return null

  return (
    <div
      className={`absolute flex items-center gap-1 ${
        isOwn ? 'right-full mr-2' : 'left-full ml-2'
      }`}
      style={{ top: '50%', transform: 'translateY(-50%)' }}
    >
      {/* React button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
          title="Add reaction"
        >
          <Smile size={16} color="#6B7280" />
        </button>
        {showEmojiPicker && (
          <div className={`absolute ${isOwn ? 'right-0' : 'left-0'}`}>
            <EmojiPicker
              onSelect={onReact}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </div>

      {/* More menu for own messages */}
      {isOwn && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
            title="More options"
          >
            <MoreHorizontal size={16} color="#6B7280" />
          </button>
          {showMenu && (
            <div
              className="absolute z-50 py-1 rounded-lg shadow-lg border min-w-[120px]"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E8E5DF',
                top: '100%',
                marginTop: '4px',
                right: isOwn ? 0 : 'auto',
                left: isOwn ? 'auto' : 0,
              }}
            >
              <button
                onClick={() => {
                  setShowMenu(false)
                  onEdit()
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors"
                style={{ color: '#374151' }}
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => {
                  setShowMenu(false)
                  onDelete()
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 transition-colors"
                style={{ color: '#EF4444' }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

