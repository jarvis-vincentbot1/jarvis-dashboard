'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar, { NavItem } from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ChatSection from './components/ChatSection'
import TodoPanel from './components/TodoPanel'
import VatCalculator from './components/VatCalculator'

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  _count?: { messages: number }
}

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => {
        if (r.status === 401) {
          router.push('/login')
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data)
          if (data.length > 0) setActiveProjectId(data[0].id)
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProjects(false))
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function handleProjectCreated(project: Project) {
    setProjects((prev) => [project, ...prev])
    setActiveProjectId(project.id)
  }

  function handleProjectDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setActiveProjectId((prev) => {
      if (prev === id) {
        const remaining = projects.filter((p) => p.id !== id)
        return remaining.length > 0 ? remaining[0].id : null
      }
      return prev
    })
  }

  function handleOpenConversation(id: string) {
    setActiveProjectId(id)
    setActiveNav('chat')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f0f]">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} onLogout={handleLogout} />

      {/* Main content — add bottom padding on mobile for the Sidebar's fixed tab bar */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="flex-1 overflow-hidden [&>*]:h-full pb-14 md:pb-0">
          {loadingProjects ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeNav === 'dashboard' ? (
            <Dashboard projects={projects} onOpenConversation={handleOpenConversation} />
          ) : activeNav === 'chat' ? (
            <ChatSection
              projects={projects}
              activeProjectId={activeProjectId}
              onActiveProjectChange={setActiveProjectId}
              onProjectCreated={handleProjectCreated}
              onProjectDeleted={handleProjectDeleted}
            />
          ) : activeNav === 'calculator' ? (
            <VatCalculator />
          ) : (
            <TodoPanel projectId={activeProjectId || undefined} />
          )}
        </div>
      </main>
    </div>
  )
}
