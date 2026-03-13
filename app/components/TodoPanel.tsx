'use client'

import { useState, useEffect, useRef } from 'react'

interface Todo {
  id: string
  text: string
  done: boolean
  projectId: string | null
  dueDate: string | null
  createdAt: string
}

interface Props {
  projectId?: string
}

export default function TodoPanel({ projectId }: Props) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function loadTodos() {
    const url = projectId ? `/api/todos?projectId=${projectId}` : '/api/todos'
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setTodos(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTodos()
  }, [projectId])

  async function addTodo(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    setInput('')
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, projectId: projectId || null }),
    })
    if (res.ok) {
      const todo = await res.json()
      setTodos((prev) => [todo, ...prev])
    }
  }

  async function toggleDone(todo: Todo) {
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !todo.done }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    }
  }

  async function deleteTodo(id: string) {
    const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTodos((prev) => prev.filter((t) => t.id !== id))
    }
  }

  async function saveEdit(id: string) {
    const text = editText.trim()
    if (!text) return
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    }
    setEditingId(null)
  }

  const activeTodos = todos.filter((t) => !t.done)
  const doneTodos = todos.filter((t) => t.done)

  function formatDue(dateStr: string | null) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    const now = new Date()
    const isOverdue = d < now
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return { label, isOverdue }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#0f0f0f]">
      <div className="max-w-2xl w-full mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="mb-2">
          <h2 className="text-[#00ff88] font-bold text-lg tracking-wide">To-Do</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            {activeTodos.length} task{activeTodos.length !== 1 ? 's' : ''} remaining
            {projectId && ' · project view'}
          </p>
        </div>

        {/* Add input */}
        <form onSubmit={addTodo} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a task and press Enter..."
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00ff88] transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2.5 bg-[#00ff88] text-black font-bold text-sm rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#00dd77] active:bg-[#00cc66] transition-colors"
          >
            Add
          </button>
        </form>

        {/* Active todos */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTodos.length === 0 && doneTodos.length === 0 ? (
          <div className="text-center py-10 text-gray-600 text-sm">No tasks yet — add one above</div>
        ) : (
          <div className="space-y-1">
            {activeTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                editingId={editingId}
                editText={editText}
                onToggle={toggleDone}
                onDelete={deleteTodo}
                onStartEdit={(t) => { setEditingId(t.id); setEditText(t.text) }}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditingId(null)}
                onEditTextChange={setEditText}
                formatDue={formatDue}
              />
            ))}

            {/* Done section */}
            {doneTodos.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowDone((v) => !v)}
                  className="text-gray-600 text-xs hover:text-gray-400 transition-colors flex items-center gap-1 py-1"
                >
                  <span>{showDone ? '▾' : '▸'}</span>
                  Show completed ({doneTodos.length})
                </button>
                {showDone && (
                  <div className="space-y-1 mt-1">
                    {doneTodos.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        editingId={editingId}
                        editText={editText}
                        onToggle={toggleDone}
                        onDelete={deleteTodo}
                        onStartEdit={(t) => { setEditingId(t.id); setEditText(t.text) }}
                        onSaveEdit={saveEdit}
                        onCancelEdit={() => setEditingId(null)}
                        onEditTextChange={setEditText}
                        formatDue={formatDue}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TodoItem({
  todo,
  editingId,
  editText,
  onToggle,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
  formatDue,
}: {
  todo: Todo
  editingId: string | null
  editText: string
  onToggle: (t: Todo) => void
  onDelete: (id: string) => void
  onStartEdit: (t: Todo) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onEditTextChange: (v: string) => void
  formatDue: (d: string | null) => { label: string; isOverdue: boolean } | null
}) {
  const isEditing = editingId === todo.id
  const due = formatDue(todo.dueDate)

  return (
    <div className="group flex items-start gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 hover:border-[#3a3a3a] transition-colors">
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo)}
        className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border transition-colors ${
          todo.done
            ? 'bg-[#00ff88] border-[#00ff88]'
            : 'border-gray-600 hover:border-[#00ff88]'
        } flex items-center justify-center`}
        aria-label={todo.done ? 'Mark undone' : 'Mark done'}
      >
        {todo.done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={editText}
              onChange={(e) => onEditTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit(todo.id)
                if (e.key === 'Escape') onCancelEdit()
              }}
              className="flex-1 bg-[#0f0f0f] border border-[#00ff88] rounded px-2 py-0.5 text-sm text-white focus:outline-none"
            />
            <button onClick={() => onSaveEdit(todo.id)} className="text-[#00ff88] text-xs hover:underline">Save</button>
            <button onClick={onCancelEdit} className="text-gray-500 text-xs hover:underline">Cancel</button>
          </div>
        ) : (
          <span
            className={`text-sm cursor-pointer select-none ${
              todo.done ? 'line-through text-gray-600' : 'text-gray-200'
            }`}
            onDoubleClick={() => onStartEdit(todo)}
          >
            {todo.text}
          </span>
        )}
        {due && !todo.done && (
          <span className={`text-[11px] block mt-0.5 ${due.isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
            {due.isOverdue ? 'Overdue · ' : ''}{due.label}
          </span>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(todo.id)}
        className="flex-shrink-0 text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 mt-0.5"
        aria-label="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
        </svg>
      </button>
    </div>
  )
}
