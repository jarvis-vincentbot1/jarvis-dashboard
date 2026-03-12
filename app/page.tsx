'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import NewProjectModal from './components/NewProjectModal'
import TodoPanel from './components/TodoPanel'
import VatCalculator from './components/VatCalculator'

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  _count?: { messages: number }
}

type Tab = 'chat' | 'todo' | 'calculator'

const TABS: { id: Tab; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'todo', label: 'To-Do' },
  { id: 'calculator', label: 'Calculator' },
]

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('chat')
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
    setShowNewProject(false)
  }

  function handleDeleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setActiveProjectId((prev) => {
      if (prev === id) {
        const remaining = projects.filter((p) => p.id !== id)
        return remaining.length > 0 ? remaining[0].id : null
      }
      return prev
    })
  }

  const activeProject = projects.find((p) => p.id === activeProjectId)

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f0f]">
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(id) => { setActiveProjectId(id); setActiveTab('chat') }}
        onNewProject={() => setShowNewProject(true)}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-[#2a2a2a] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 active:bg-[#242424]"
              aria-label="Open menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="text-[#00ff88] font-bold tracking-wider">JARVIS</span>
          </div>
          <button
            onClick={() => setShowNewProject(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#00ff88] text-black font-bold text-lg active:bg-[#00dd77]"
            aria-label="New project"
          >
            +
          </button>
        </div>

        {/* Desktop tab bar */}
        <div className="hidden md:flex items-center gap-1 px-4 pt-3 pb-0 flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[#00ff88] bg-[#00ff88]/10'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {loadingProjects ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'chat' ? (
            activeProject ? (
              <ChatWindow
                key={activeProject.id}
                project={activeProject}
                onDeleteProject={handleDeleteProject}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="text-4xl font-bold text-[#00ff88] tracking-wider mb-3">JARVIS</div>
                <p className="text-gray-500 text-sm mb-2">Your personal command center</p>
                <p className="text-gray-700 text-xs mb-6">
                  {projects.length > 0 ? 'Select a project from the sidebar' : 'Create a project to get started'}
                </p>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="px-5 py-2.5 bg-[#00ff88] text-black font-semibold rounded-lg hover:bg-[#00dd77] transition-colors text-sm"
                >
                  + New Project
                </button>
              </div>
            )
          ) : activeTab === 'todo' ? (
            <TodoPanel projectId={activeProjectId || undefined} />
          ) : (
            <VatCalculator />
          )}
        </div>

        {/* Mobile bottom tab bar */}
        <div className="md:hidden flex items-center justify-around border-t border-[#2a2a2a] bg-[#0f0f0f] flex-shrink-0 pb-safe">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                activeTab === tab.id ? 'text-[#00ff88]' : 'text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </main>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  )
}
