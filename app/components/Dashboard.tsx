'use client'

import { useEffect, useState } from 'react'

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  _count?: { messages: number }
}

interface LastMessage {
  role: string
  content: string
  createdAt: string
}

interface ConversationCard extends Project {
  lastMessage?: LastMessage | null
}

interface Props {
  projects: Project[]
  onOpenConversation: (id: string) => void
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

export default function Dashboard({ projects, onOpenConversation }: Props) {
  const [conversations, setConversations] = useState<ConversationCard[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)

  useEffect(() => {
    if (projects.length === 0) {
      setConversations([])
      setLoadingMessages(false)
      return
    }

    setLoadingMessages(true)
    Promise.all(
      projects.map(async (project) => {
        try {
          const res = await fetch(`/api/projects/${project.id}/lastMessage`)
          const lastMessage = res.ok ? await res.json() : null
          return { ...project, lastMessage }
        } catch {
          return { ...project, lastMessage: null }
        }
      })
    ).then((data) => {
      setConversations(data)
      setLoadingMessages(false)
    })
  }, [projects])

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0f0f0f]">
      <div className="max-w-4xl w-full mx-auto p-4 md:p-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
            Good {getGreeting()}, Vincent
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {projects.length} conversation{projects.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Conversations widget */}
        <div>
          <h2 className="text-xs text-gray-600 uppercase tracking-widest mb-3">
            Recent Conversations
          </h2>

          {loadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">
              No conversations yet. Go to Chat to start one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onOpenConversation(conv.id)}
                  className="text-left bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] hover:bg-[#1f1f1f] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: conv.color }}
                      />
                      <span className="font-medium text-gray-200 text-sm truncate">
                        {conv.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {conv.lastMessage && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            conv.lastMessage.role === 'assistant'
                              ? 'bg-[#00ff88]'
                              : 'bg-gray-600'
                          }`}
                          title={
                            conv.lastMessage.role === 'assistant'
                              ? 'Jarvis replied'
                              : 'Awaiting reply'
                          }
                        />
                      )}
                      {conv._count && conv._count.messages > 0 && (
                        <span className="text-xs text-gray-600">
                          {conv._count.messages} msg{conv._count.messages !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {conv.lastMessage ? (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                      {conv.lastMessage.content.length > 60
                        ? conv.lastMessage.content.slice(0, 60) + '…'
                        : conv.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-700 italic">No messages yet</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
