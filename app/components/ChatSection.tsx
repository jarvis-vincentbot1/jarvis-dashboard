'use client'

import { useState } from 'react'
import ChatWindow from './ChatWindow'
import NewProjectModal from './NewProjectModal'

interface Chat {
  id: string
  name: string
  projectId: string | null
  createdAt: string
  updatedAt: string
  _count?: { messages: number }
}

interface ProjectGroup {
  id: string
  name: string
  color: string
  chats: Chat[]
}

interface ChatData {
  standalone: Chat[]
  projects: ProjectGroup[]
}

interface Props {
  chatData: ChatData
  activeChatId: string | null
  onActiveChatChange: (id: string | null) => void
  onChatCreated: (chat: Chat, projectId?: string) => void
  onChatDeleted: (id: string) => void
  onProjectCreated: (project: ProjectGroup) => void
}

export default function ChatSection({
  chatData,
  activeChatId,
  onActiveChatChange,
  onChatCreated,
  onChatDeleted,
  onProjectCreated,
}: Props) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [showNewProject, setShowNewProject] = useState(false)
  const [creatingChatFor, setCreatingChatFor] = useState<string | null>(null) // projectId or 'standalone'

  // Find active chat in all chats
  const allChats = [
    ...chatData.standalone,
    ...chatData.projects.flatMap((p) => p.chats),
  ]
  const activeChat = allChats.find((c) => c.id === activeChatId) ?? null

  function toggleProject(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  async function createChat(projectId?: string) {
    const key = projectId ?? 'standalone'
    setCreatingChatFor(key)
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New chat', projectId: projectId ?? null }),
      })
      if (!res.ok) return
      const chat: Chat = await res.json()
      onChatCreated(chat, projectId)
      onActiveChatChange(chat.id)
      setMobileView('chat')
      // Auto-expand project folder when chat is created inside
      if (projectId) {
        setExpandedProjects((prev) => new Set([...Array.from(prev), projectId]))
      }
    } catch {
      // ignore
    } finally {
      setCreatingChatFor(null)
    }
  }

  async function handleDeleteChat(chatId: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await fetch(`/api/chats/${chatId}`, { method: 'DELETE' })
      onChatDeleted(chatId)
      if (activeChatId === chatId) {
        setMobileView('list')
      }
    } catch {
      // ignore
    }
  }

  function handleSelectChat(id: string) {
    onActiveChatChange(id)
    setMobileView('chat')
  }

  function handleProjectCreated(project: { id: string; name: string; color: string }) {
    onProjectCreated({ ...project, chats: [] })
    setShowNewProject(false)
    setExpandedProjects((prev) => new Set([...Array.from(prev), project.id]))
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <div
        className={`w-full md:w-[260px] md:flex flex-col bg-[#141414] border-r border-[#2a2a2a] flex-shrink-0 ${
          mobileView === 'list' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* New Chat button */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <button
            onClick={() => createChat()}
            disabled={creatingChatFor === 'standalone'}
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-sm text-[#00ff88] font-medium hover:bg-[#00ff88]/20 transition-colors disabled:opacity-50"
          >
            <span className="text-base leading-none">+</span>
            New Chat
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto py-1 px-2">

          {/* Standalone chats */}
          {chatData.standalone.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                Chats
              </div>
              <ul className="space-y-0.5">
                {chatData.standalone.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChatId === chat.id}
                    isHovered={hoveredChatId === chat.id}
                    onSelect={() => handleSelectChat(chat.id)}
                    onDelete={(e) => handleDeleteChat(chat.id, e)}
                    onMouseEnter={() => setHoveredChatId(chat.id)}
                    onMouseLeave={() => setHoveredChatId(null)}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Projects */}
          {(chatData.projects.length > 0 || true) && (
            <div>
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Projects
                </span>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="text-gray-600 hover:text-gray-400 transition-colors text-xs leading-none"
                  title="New project"
                >
                  +
                </button>
              </div>

              {chatData.projects.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-700 italic">
                  No projects yet
                </div>
              )}

              <ul className="space-y-0.5">
                {chatData.projects.map((project) => {
                  const isExpanded = expandedProjects.has(project.id)
                  return (
                    <li key={project.id}>
                      {/* Project folder row */}
                      <button
                        onClick={() => toggleProject(project.id)}
                        className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-400 hover:bg-[#1f1f1f] hover:text-gray-200 transition-colors"
                      >
                        <span className="text-xs text-gray-600 w-3 flex-shrink-0">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="flex-1 truncate text-sm font-medium">
                          {project.name}
                        </span>
                        {project.chats.length > 0 && (
                          <span className="text-xs text-gray-700">{project.chats.length}</span>
                        )}
                      </button>

                      {/* Expanded chats + add button */}
                      {isExpanded && (
                        <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-[#2a2a2a] pl-2">
                          {project.chats.map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={activeChatId === chat.id}
                              isHovered={hoveredChatId === chat.id}
                              onSelect={() => handleSelectChat(chat.id)}
                              onDelete={(e) => handleDeleteChat(chat.id, e)}
                              onMouseEnter={() => setHoveredChatId(chat.id)}
                              onMouseLeave={() => setHoveredChatId(null)}
                            />
                          ))}
                          <li>
                            <button
                              onClick={() => createChat(project.id)}
                              disabled={creatingChatFor === project.id}
                              className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:text-[#00ff88] hover:bg-[#1f1f1f] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <span>+</span>
                              <span>New chat</span>
                            </button>
                          </li>
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {chatData.standalone.length === 0 && chatData.projects.length === 0 && (
            <div className="px-3 py-8 text-sm text-gray-600 text-center">
              No chats yet.
              <br />
              Click + New Chat to get started.
            </div>
          )}
        </div>
      </div>

      {/* Right panel — chat window */}
      <div
        className={`flex-1 min-w-0 flex-col overflow-hidden ${
          mobileView === 'chat' ? 'flex' : 'hidden md:flex'
        }`}
        style={{ height: '100%' }}
      >
        {/* Mobile back button */}
        <div className="md:hidden flex items-center px-4 h-11 border-b border-[#2a2a2a] flex-shrink-0 bg-[#0f0f0f]">
          <button
            onClick={() => setMobileView('list')}
            className="flex items-center gap-2 text-gray-400 text-sm active:text-gray-200 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Chats
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
        {activeChat ? (
          <ChatWindow
            key={activeChat.id}
            chat={activeChat}
            onDeleteChat={(id) => {
              onChatDeleted(id)
              setMobileView('list')
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-4xl font-bold text-[#00ff88] tracking-wider mb-3">
              JARVIS
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Select a chat or start a new one
            </p>
            <button
              onClick={() => createChat()}
              className="px-5 py-2.5 bg-[#00ff88] text-black font-semibold rounded-lg hover:bg-[#00dd77] transition-colors text-sm"
            >
              + New Chat
            </button>
          </div>
        )}
        </div>
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  )
}

// Reusable chat list item
function ChatItem({
  chat,
  isActive,
  isHovered,
  onSelect,
  onDelete,
  onMouseEnter,
  onMouseLeave,
}: {
  chat: Chat
  isActive: boolean
  isHovered: boolean
  onSelect: () => void
  onDelete: (e: React.MouseEvent) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 group ${
          isActive
            ? 'bg-[#00ff88]/10 text-[#00ff88]'
            : 'text-gray-400 hover:bg-[#1f1f1f] hover:text-gray-200'
        }`}
      >
        <span className="flex-1 truncate text-sm">{chat.name}</span>
        {(isHovered || isActive) && (
          <span
            role="button"
            onClick={onDelete}
            className={`flex-shrink-0 p-0.5 rounded transition-colors ${
              isActive
                ? 'text-[#00ff88]/60 hover:text-red-400'
                : 'text-gray-600 hover:text-red-400'
            }`}
            title="Delete chat"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </span>
        )}
      </button>
    </li>
  )
}
