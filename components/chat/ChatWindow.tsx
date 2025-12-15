'use client'

interface ChatWindowProps {
  selectedUserId: string | null
  selectedUserName: string | null
}

export default function ChatWindow({ selectedUserId, selectedUserName }: ChatWindowProps) {
  if (!selectedUserId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-medium text-black mb-2">
            Select a conversation
          </h3>
          <p className="text-gray-600">
            Choose a user from the list to start chatting
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="p-4 border-b border-black">
        <h2 className="text-lg font-bold text-black">{selectedUserName}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center text-gray-600">
          No messages yet. Start the conversation!
        </div>
      </div>

      <div className="p-4 border-t border-black">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-black rounded-full focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

