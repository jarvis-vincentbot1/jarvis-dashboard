'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import NewProjectModal from './components/NewProjectModal'

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  _count?: { messages: number }
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
        onSelectProject={setActiveProjectId}
        onNewProject={() => setShowNewProject(true)}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center px-4 h-14 border-b border-[#2a2a2a] flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-gray-200 mr-3"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-[#00ff88] font-bold tracking-wider">JARVIS</span>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {loadingProjects ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeProject ? (
            <ChatWindow
              key={activeProject.id}
              project={activeProject}
              onDeleteProject={handleDeleteProject}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="text-4xl font-bold text-[#00ff88] tracking-wider mb-3">JARVIS</div>
              <p className="text-gray-500 text-sm mb-6">Your personal command center</p>
              <button
                onClick={() => setShowNewProject(true)}
                className="px-5 py-2.5 bg-[#00ff88] text-black font-semibold rounded-lg hover:bg-[#00dd77] transition-colors text-sm"
              >
                + Create First Project
              </button>
            </div>
          )}
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
