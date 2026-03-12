'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface Project {
  id: string
  name: string
  description: string | null
  color: string
}

interface Props {
  project: Project
  onDeleteProject: (id: string) => void
}

function formatContent(content: string) {
  return content
}

interface ModelOption {
  id: string
  label: string
  provider: string
  description: string
}

export default function ChatWindow({ project, onDeleteProject }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-sonnet-4-6')
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([
    { id: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet', provider: 'Anthropic', description: 'Fast & smart' },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load available models
  useEffect(() => {
    fetch('/api/chat')
      .then(r => r.json())
      .then(d => { if (d.models) setAvailableModels(d.models) })
      .catch(() => {})
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load messages when project changes
  useEffect(() => {
    setMessages([])
    setStreamingContent('')
    setLoading(true)

    fetch(`/api/projects/${project.id}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [project.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return

    setInput('')
    setStreaming(true)
    setStreamingContent('')

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, message: text, model: selectedModel }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error('Failed to get response')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              // Finalize
              const assistantMsg: Message = {
                id: `temp-assistant-${Date.now()}`,
                role: 'assistant',
                content: fullContent,
                createdAt: new Date().toISOString(),
              }
              setMessages((prev) => [...prev, assistantMsg])
              setStreamingContent('')
              // Reload messages to get real IDs
              fetch(`/api/projects/${project.id}/messages`)
                .then((r) => r.json())
                .then((data) => {
                  if (Array.isArray(data)) setMessages(data)
                })
                .catch(console.error)
              break
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                fullContent += parsed.text
                setStreamingContent(fullContent)
              }
              if (parsed.error) {
                throw new Error(parsed.error)
              }
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: '⚠️ Failed to get response. Please try again.',
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } finally {
      setStreaming(false)
      setStreamingContent('')
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete project "${project.name}" and all its messages?`)) return
    setShowMenu(false)
    try {
      await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      onDeleteProject(project.id)
    } catch {
      alert('Failed to delete project')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-[#2a2a2a] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <h1 className="text-sm font-semibold text-gray-100">{project.name}</h1>
            {project.description && (
              <p className="text-xs text-gray-600 truncate max-w-xs">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model picker */}
          <div className="relative">
            <button
              onClick={() => { setShowModelPicker(!showModelPicker); setShowMenu(false) }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 hover:border-[#3a3a3a] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
              {availableModels.find(m => m.id === selectedModel)?.label ?? 'Claude'}
              <span className="text-gray-600">▾</span>
            </button>
            {showModelPicker && (
              <div className="absolute right-0 top-9 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl w-56 py-1.5 z-20">
                <div className="px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider">Model</div>
                {availableModels.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModel(m.id); setShowModelPicker(false) }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-[#242424] transition-colors ${m.id === selectedModel ? 'bg-[#242424]' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {m.id === selectedModel && <span className="text-[#00ff88] text-xs">✓</span>}
                      {m.id !== selectedModel && <span className="w-3" />}
                      <div>
                        <div className="text-sm text-gray-200">{m.label}</div>
                        <div className="text-[10px] text-gray-600">{m.provider} · {m.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => { setShowMenu(!showMenu); setShowModelPicker(false) }}
              className="text-gray-500 hover:text-gray-300 p-2 rounded-lg hover:bg-[#242424] transition-colors"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl w-40 py-1 z-10">
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#242424] transition-colors"
                >
                  Delete Project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 md:px-6 py-4 space-y-4">
        {loading && (
          <div className="text-center text-gray-600 text-sm py-8">Loading messages...</div>
        )}

        {!loading && messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-xl"
              style={{ backgroundColor: `${project.color}20`, border: `1px solid ${project.color}40` }}
            >
              <span style={{ color: project.color }}>◈</span>
            </div>
            <h2 className="text-gray-300 font-medium mb-1">{project.name}</h2>
            <p className="text-gray-600 text-sm">
              {project.description || 'Start a conversation about this project.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-animate flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#242424] border border-[#2a2a2a] flex items-center justify-center mr-2.5 mt-0.5">
                <span className="text-[#00ff88] text-xs font-bold">J</span>
              </div>
            )}
            <div
              className={`
                max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm
                ${msg.role === 'user'
                  ? 'bg-[#00ff88] text-black font-medium rounded-br-sm'
                  : 'bg-[#1f1f1f] text-gray-200 rounded-bl-sm border border-[#2a2a2a]'
                }
              `}
            >
              {msg.role === 'assistant' ? (
                <div
                  className="prose-jarvis"
                  dangerouslySetInnerHTML={{
                    __html: formatMessageHtml(msg.content),
                  }}
                />
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streaming && (
          <div className="message-animate flex justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#242424] border border-[#2a2a2a] flex items-center justify-center mr-2.5 mt-0.5">
              <span className="text-[#00ff88] text-xs font-bold">J</span>
            </div>
            <div className="max-w-[80%] md:max-w-[70%] bg-[#1f1f1f] rounded-2xl rounded-bl-sm border border-[#2a2a2a] px-4 py-3 text-sm text-gray-200">
              {streamingContent ? (
                <div
                  className={`prose-jarvis ${!streamingContent ? '' : 'cursor-blink'}`}
                  dangerouslySetInnerHTML={{
                    __html: formatMessageHtml(streamingContent),
                  }}
                />
              ) : (
                <div className="flex gap-1 items-center py-1">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 md:px-6 py-4 border-t border-[#2a2a2a] flex-shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${project.name}...`}
            rows={1}
            disabled={streaming}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-[#00ff88] transition-colors resize-none max-h-32 text-sm disabled:opacity-50"
            style={{ minHeight: '48px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            className="w-12 h-12 bg-[#00ff88] text-black rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-[#00dd77] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {streaming ? (
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <div className="text-xs text-gray-700 mt-2 text-center">
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}

function formatMessageHtml(text: string): string {
  // Basic markdown-like formatting
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Unordered lists
    .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines
    .replace(/\n/g, '<br />')

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`
  }

  return `<div class="prose-jarvis">${html}</div>`
}
