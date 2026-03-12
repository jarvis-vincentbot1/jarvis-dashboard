'use client'

import { useState } from 'react'
import ChatWindow from './ChatWindow'
import NewProjectModal from './NewProjectModal'

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  _count?: { messages: number }
}

interface Props {
  projects: Project[]
  activeProjectId: string | null
  onActiveProjectChange: (id: string | null) => void
  onProjectCreated: (project: Project) => void
  onProjectDeleted: (id: string) => void
}

export default function ChatSection({
  projects,
  activeProjectId,
  onActiveProjectChange,
  onProjectCreated,
  onProjectDeleted,
}: Props) {
  const [showNewProject, setShowNewProject] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(
    activeProjectId ? 'chat' : 'list'
  )

  const activeProject = projects.find((p) => p.id === activeProjectId)

  function handleSelectProject(id: string) {
    onActiveProjectChange(id)
    setMobileView('chat')
  }

  function handleProjectCreated(project: Project) {
    onProjectCreated(project)
    setMobileView('chat')
    setShowNewProject(false)
  }

  return (
    <div className="flex h-full">
      {/* Left panel — conversation list */}
      <div
        className={`w-full md:w-[240px] md:flex flex-col bg-[#1a1a1a] border-r border-[#2a2a2a] flex-shrink-0 ${
          mobileView === 'list' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* New conversation */}
        <div className="px-3 py-3 border-b border-[#2a2a2a] flex-shrink-0">
          <button
            onClick={() => setShowNewProject(true)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-sm text-[#00ff88] font-medium hover:bg-[#00ff88]/20 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            New Conversation
          </button>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {projects.length === 0 ? (
            <div className="px-3 py-8 text-sm text-gray-600 text-center">
              No conversations yet.
              <br />
              Create one to get started.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {projects.map((project) => (
                <li key={project.id}>
                  <button
                    onClick={() => handleSelectProject(project.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2.5 ${
                      activeProjectId === project.id
                        ? 'bg-[#242424] text-gray-100'
                        : 'text-gray-400 hover:bg-[#1f1f1f] hover:text-gray-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="flex-1 truncate text-sm font-medium">
                      {project.name}
                    </span>
                    {project._count && project._count.messages > 0 && (
                      <span className="text-xs text-gray-600 flex-shrink-0">
                        {project._count.messages}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right panel — chat window */}
      <div
        className={`flex-1 min-w-0 h-full flex-col ${
          mobileView === 'chat' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Mobile back button */}
        <div className="md:hidden flex items-center px-4 h-12 border-b border-[#2a2a2a] flex-shrink-0 bg-[#0f0f0f]">
          <button
            onClick={() => setMobileView('list')}
            className="flex items-center gap-2 text-gray-400 text-sm hover:text-gray-200 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Conversations
          </button>
        </div>

        {activeProject ? (
          <ChatWindow
            key={activeProject.id}
            project={activeProject}
            onDeleteProject={(id) => {
              onProjectDeleted(id)
              setMobileView('list')
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-4xl font-bold text-[#00ff88] tracking-wider mb-3">
              JARVIS
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Select a conversation or start a new one
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-5 py-2.5 bg-[#00ff88] text-black font-semibold rounded-lg hover:bg-[#00dd77] transition-colors text-sm"
            >
              + New Conversation
            </button>
          </div>
        )}
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
