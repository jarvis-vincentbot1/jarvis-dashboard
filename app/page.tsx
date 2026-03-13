'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar, { NavItem } from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ChatSection from './components/ChatSection'
import TodoPanel from './components/TodoPanel'
import VatCalculator from './components/VatCalculator'
import Monitoring from './components/Monitoring'
import PriceTracker from './components/PriceTracker'

interface Chat {
  id: string
  name: string
  projectId: string | null
  createdAt: string
  updatedAt: string
  _count?: { messages: number }
  lastMessage?: { role: string; content: string; createdAt: string } | null
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

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [chatData, setChatData] = useState<ChatData>({ standalone: [], projects: [] })
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadChats = useCallback(() => {
    return fetch('/api/chats')
      .then((r) => {
        if (r.status === 401) {
          router.push('/login')
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (data) {
          setChatData(data)
          // Auto-select first chat if none selected
          setActiveChatId((prev) => {
            if (prev) return prev
            return data.standalone[0]?.id ?? data.projects[0]?.chats[0]?.id ?? null
          })
        }
      })
      .catch(console.error)
  }, [router])

  useEffect(() => {
    loadChats().finally(() => setLoading(false))
  }, [loadChats])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function handleChatCreated(chat: Chat, projectId?: string) {
    setChatData((prev) => {
      if (!projectId) {
        return { ...prev, standalone: [chat, ...prev.standalone] }
      }
      return {
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId ? { ...p, chats: [chat, ...p.chats] } : p
        ),
      }
    })
    setActiveChatId(chat.id)
  }

  function handleChatDeleted(id: string) {
    setChatData((prev) => ({
      standalone: prev.standalone.filter((c) => c.id !== id),
      projects: prev.projects.map((p) => ({
        ...p,
        chats: p.chats.filter((c) => c.id !== id),
      })),
    }))
    setActiveChatId((prev) => {
      if (prev !== id) return prev
      // Pick next available chat
      const allChats = [
        ...chatData.standalone.filter((c) => c.id !== id),
        ...chatData.projects.flatMap((p) => p.chats.filter((c) => c.id !== id)),
      ]
      return allChats[0]?.id ?? null
    })
  }

  function handleProjectCreated(project: ProjectGroup) {
    setChatData((prev) => ({
      ...prev,
      projects: [...prev.projects, project],
    }))
  }

  function handleOpenChat(chatId: string) {
    setActiveChatId(chatId)
    setActiveNav('chat')
  }

  const allChats = [
    ...chatData.standalone,
    ...chatData.projects.flatMap((p) => p.chats),
  ]

  return (
    <div className="flex h-dvh bg-[#0f0f0f]">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} onLogout={handleLogout} />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Spacer for the fixed mobile top header (48px) */}
        <div className="h-12 flex-shrink-0 md:hidden" />

        {/* Content area — chat needs overflow-hidden+flex (has internal scroll); others scroll freely */}
        <div className={`flex-1 ${activeNav === 'chat' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeNav === 'dashboard' ? (
            <Dashboard allChats={allChats} onOpenChat={handleOpenChat} />
          ) : activeNav === 'chat' ? (
            <ChatSection
              chatData={chatData}
              activeChatId={activeChatId}
              onActiveChatChange={setActiveChatId}
              onChatCreated={handleChatCreated}
              onChatDeleted={handleChatDeleted}
              onProjectCreated={handleProjectCreated}
            />
          ) : activeNav === 'calculator' ? (
            <VatCalculator />
          ) : activeNav === 'monitoring' ? (
            <Monitoring />
          ) : activeNav === 'prices' ? (
            <PriceTracker />
          ) : (
            <TodoPanel />
          )}
        </div>
      </main>
    </div>
  )
}
