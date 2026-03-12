'use client'

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
  onSelectProject: (id: string) => void
  onNewProject: () => void
  onLogout: () => void
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onLogout,
  isOpen,
  onClose,
}: Props) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative top-0 left-0 h-full z-30
          w-64 bg-[#1a1a1a] border-r border-[#2a2a2a]
          flex flex-col
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-[#2a2a2a] flex-shrink-0">
          <span className="text-[#00ff88] font-bold text-xl tracking-wider">JARVIS</span>
          <button
            onClick={onClose}
            className="md:hidden text-gray-500 hover:text-gray-300 p-1"
          >
            ✕
          </button>
        </div>

        {/* Projects list */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          <div className="text-xs text-gray-600 uppercase tracking-widest px-3 mb-2">Projects</div>

          {projects.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-600 text-center">
              No projects yet.
              <br />Create one to get started.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {projects.map((project) => (
                <li key={project.id}>
                  <button
                    onClick={() => {
                      onSelectProject(project.id)
                      onClose()
                    }}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-lg transition-colors
                      flex items-center gap-2.5 group
                      ${activeProjectId === project.id
                        ? 'bg-[#242424] text-gray-100'
                        : 'text-gray-400 hover:bg-[#1f1f1f] hover:text-gray-200'
                      }
                    `}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate text-sm font-medium">{project.name}</span>
                    {project._count && project._count.messages > 0 && (
                      <span className="ml-auto text-xs text-gray-600 group-hover:text-gray-500">
                        {project._count.messages}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* New Project + Logout */}
        <div className="px-2 py-3 border-t border-[#2a2a2a] space-y-1 flex-shrink-0">
          <button
            onClick={onNewProject}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[#00ff88] hover:bg-[#00ff8815] transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            <span>New Project</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-400 hover:bg-[#1f1f1f] transition-colors"
          >
            <span>↩</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
