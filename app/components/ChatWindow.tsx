'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Attachment {
  url: string
  name: string
  type: string
  size: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: Attachment[]
  status?: string // 'done' | 'generating' | 'error'
  createdAt: string
}

interface Chat {
  id: string
  name: string
}

interface Props {
  chat: Chat
  onDeleteChat: (id: string) => void
  onTitleUpdate?: (id: string, name: string) => void
}

interface ModelOption {
  id: string
  label: string
  provider: string
  description: string
}

interface PendingFile {
  file: File
  previewUrl: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 120_000

export default function ChatWindow({ chat, onDeleteChat, onTitleUpdate }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-sonnet-4-6')
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([
    { id: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet', provider: 'Anthropic', description: 'Fast & smart' },
  ])
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStartRef = useRef<number>(0)
  const chatIdRef = useRef(chat.id)

  // Keep chatIdRef current across renders
  chatIdRef.current = chat.id

  const isGenerating = messages.some(m => m.status === 'generating')

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

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const fetchMessages = useCallback(async (chatId: string): Promise<Message[] | null> => {
    try {
      const res = await fetch(`/api/messages?chatId=${chatId}`)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }, [])

  const handleMessagesUpdate = useCallback((data: Message[], chatId: string) => {
    setMessages(data)
    if (!data.some(m => m.status === 'generating')) {
      stopPolling()
      // Auto-generate title after first completed exchange
      if (onTitleUpdate) {
        // Only fire title if we have an assistant message with content (first real exchange)
        const hasAssistant = data.some(m => m.role === 'assistant' && m.content && m.status === 'done')
        if (hasAssistant) {
          fetch(`/api/chats/${chatId}/title`, { method: 'POST' })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.name && d.name !== 'New chat') onTitleUpdate(chatId, d.name) })
            .catch(() => {})
        }
      }
    }
  }, [stopPolling, onTitleUpdate])

  const startPolling = useCallback((chatId: string) => {
    stopPolling()
    pollStartRef.current = Date.now()
    pollIntervalRef.current = setInterval(async () => {
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        setMessages(prev => prev.map(m =>
          m.status === 'generating'
            ? { ...m, status: 'error', content: '⚠️ Response timed out.' }
            : m
        ))
        stopPolling()
        return
      }
      const data = await fetchMessages(chatId)
      if (data) handleMessagesUpdate(data, chatId)
    }, POLL_INTERVAL_MS)
  }, [stopPolling, fetchMessages, handleMessagesUpdate])

  // Load messages when chat changes
  useEffect(() => {
    setMessages([])
    setLoading(true)
    setPendingFiles([])
    stopPolling()

    const chatId = chat.id
    fetchMessages(chatId).then(data => {
      if (data) {
        setMessages(data)
        if (data.some(m => m.status === 'generating')) {
          startPolling(chatId)
        }
      }
    }).catch(console.error).finally(() => setLoading(false))

    return () => stopPolling()
  }, [chat.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resume polling when app comes back to foreground
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return
      const chatId = chatIdRef.current
      fetchMessages(chatId).then(data => {
        if (!data) return
        setMessages(data)
        if (data.some(m => m.status === 'generating')) {
          startPolling(chatId)
        } else {
          stopPolling()
        }
      }).catch(() => {})
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchMessages, startPolling, stopPolling])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      pendingFiles.forEach(p => URL.revokeObjectURL(p.previewUrl))
    }
  }, [pendingFiles])

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    const newPending: PendingFile[] = arr.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setPendingFiles(prev => [...prev, ...newPending])
    setUploadError(null)
  }

  function removePendingFile(index: number) {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const mimeType = recorder.mimeType || 'audio/webm'
        const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm'
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        addFiles([new File([blob], `recording-${Date.now()}.${ext}`, { type: mimeType })])
        setIsRecording(false)
      }

      recorder.start()
      setIsRecording(true)
    } catch {
      setUploadError('Microphone access denied')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  async function uploadFile(pf: PendingFile): Promise<Attachment> {
    const fd = new FormData()
    fd.append('file', pf.file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(err.error || 'Upload failed')
    }
    return res.json() as Promise<Attachment>
  }

  async function sendMessage() {
    const text = input.trim()
    if ((!text && pendingFiles.length === 0) || isGenerating) return

    setInput('')
    setUploadError(null)

    // Upload files first
    let attachments: Attachment[] = []
    if (pendingFiles.length > 0) {
      try {
        attachments = await Promise.all(pendingFiles.map(uploadFile))
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
        return
      }
      pendingFiles.forEach(p => URL.revokeObjectURL(p.previewUrl))
      setPendingFiles([])
    }

    const now = new Date().toISOString()
    const tempUserId = `temp-user-${Date.now()}`
    const tempAssistantId = `temp-assistant-${Date.now()}`

    // Optimistically add user message + generating placeholder
    setMessages(prev => [
      ...prev,
      {
        id: tempUserId,
        role: 'user',
        content: text || '(see attachments)',
        attachments: attachments.length ? attachments : undefined,
        status: 'done',
        createdAt: now,
      },
      {
        id: tempAssistantId,
        role: 'assistant',
        content: '',
        status: 'generating',
        createdAt: now,
      },
    ])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          message: text || '(see attachments)',
          model: selectedModel,
          attachments: attachments.length ? attachments : undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to send message')

      const json = await res.json()

      if (json.quickReply) {
        // Synchronous todo shortcuts — replace temp messages with local ones
        setMessages(prev => [
          ...prev.filter(m => m.id !== tempUserId && m.id !== tempAssistantId),
          {
            id: `quick-user-${Date.now()}`,
            role: 'user',
            content: text,
            status: 'done',
            createdAt: now,
          },
          {
            id: `quick-${Date.now()}`,
            role: 'assistant',
            content: json.quickReply,
            status: 'done',
            createdAt: new Date().toISOString(),
          },
        ])
        if (chat.name === 'New chat' && onTitleUpdate) {
          fetch(`/api/chats/${chat.id}/title`, { method: 'POST' })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.name) onTitleUpdate(chat.id, d.name) })
            .catch(() => {})
        }
        return
      }

      // Async response: fetch real messages from DB and start polling
      if (json.status === 'generating') {
        const data = await fetchMessages(chat.id)
        if (data) setMessages(data)
        startPolling(chat.id)
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === tempAssistantId
          ? { ...m, status: 'error', content: '⚠️ Failed to send message. Please try again.' }
          : m
      ))
    } finally {
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // FIXED: Android Enter bug
    // Only submit on Enter WITHOUT Shift, Ctrl, or Meta
    // This allows Shift+Enter to create newlines on all platforms
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      sendMessage()
    }
  }

    if (e.key === 'Enter' && !e.shiftKey) {
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete chat "${chat.name}" and all its messages?`)) return
    setShowMenu(false)
    try {
      await fetch(`/api/chats/${chat.id}`, { method: 'DELETE' })
      onDeleteChat(chat.id)
    } catch {
      alert('Failed to delete chat')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  // Close attach menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false)
      }
    }
    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAttachMenu])

  return (
    <div
      className="flex flex-col h-full"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-[#2a2a2a] flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-gray-100">{chat.name}</h1>
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
                  Delete Chat
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

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-xl bg-[#00ff88]/10 border border-[#00ff88]/20">
              <span className="text-[#00ff88]">◈</span>
            </div>
            <h2 className="text-gray-300 font-medium mb-1">{chat.name}</h2>
            <p className="text-gray-600 text-sm">Start a conversation.</p>
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
            <div className={`max-w-[80%] md:max-w-[70%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.attachments.map((att, i) => (
                    <AttachmentDisplay key={i} attachment={att} onImageClick={setLightboxUrl} />
                  ))}
                </div>
              )}
              {/* Bubble */}
              <div
                className={`
                  rounded-2xl px-4 py-3 text-sm
                  ${msg.role === 'user'
                    ? 'bg-[#00ff88] text-black font-medium rounded-br-sm'
                    : 'bg-[#1f1f1f] text-gray-200 rounded-bl-sm border border-[#2a2a2a]'
                  }
                `}
              >
                {msg.role === 'assistant' && msg.status === 'generating' && !msg.content ? (
                  <div className="flex gap-1 items-center py-1">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : msg.role === 'assistant' ? (
                  <div
                    className="prose-jarvis"
                    dangerouslySetInnerHTML={{ __html: formatMessageHtml(msg.content) }}
                  />
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-3 md:px-5 py-3 border-t border-[#2a2a2a] flex-shrink-0">

        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => { e.target.files && addFiles(e.target.files); e.target.value = '' }} />
        <input ref={fileInputRef} type="file" multiple accept="video/*,audio/*,.pdf,.txt,.zip,.csv,.json,.md" className="hidden"
          onChange={(e) => { e.target.files && addFiles(e.target.files); e.target.value = '' }} />

        {/* Drag-over overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-30 bg-[#00ff88]/5 border-2 border-dashed border-[#00ff88]/40 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.5" opacity="0.6">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-[#00ff88]/60 text-sm font-medium">Drop files here</span>
            </div>
          </div>
        )}

        {/* Unified input container */}
        <div className={`bg-[#1a1a1a] border rounded-2xl transition-all duration-150 ${
          isDragging ? 'border-[#00ff88]/50 shadow-[0_0_0_3px_rgba(0,255,136,0.08)]' : 'border-[#2a2a2a] focus-within:border-[#3a3a3a]'
        }`}>

          {/* Error */}
          {uploadError && (
            <div className="mx-3 mt-3 text-xs text-red-400 bg-red-400/8 border border-red-400/15 rounded-xl px-3 py-2 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {uploadError}
            </div>
          )}

          {/* Pending file chips */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {pendingFiles.map((pf, i) => (
                <div key={i} className="relative group">
                  <PendingAttachmentPreview pf={pf} />
                  <button
                    onClick={() => removePendingFile(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#111] border border-[#3a3a3a] rounded-full text-gray-500 hover:bg-red-500/90 hover:text-white hover:border-red-500 flex items-center justify-center transition-all z-10 shadow"
                    style={{ fontSize: '14px', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="mx-3 mt-3 flex items-center gap-2.5 bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-xs text-red-300 font-medium">Recording…</span>
              <button
                onClick={stopRecording}
                className="ml-auto text-xs text-red-400 hover:text-red-300 font-semibold underline underline-offset-2 transition-colors"
              >
                Stop
              </button>
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Add a message or send now…' : `Message ${chat.name}…`}
            rows={1}
            className="w-full bg-transparent px-4 pt-3 pb-2 text-gray-100 placeholder-gray-600 focus:outline-none resize-none text-sm leading-relaxed"
            style={{ minHeight: '46px', maxHeight: '160px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 160) + 'px'
            }}
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-3 pt-0.5">

            {/* Left: + attach button */}
            <div className="flex items-center gap-1" ref={attachMenuRef}>
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(v => !v)}
                  disabled={isGenerating}
                  title="Attach"
                  className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all disabled:opacity-40 ${
                    showAttachMenu
                      ? 'bg-[#00ff88]/15 text-[#00ff88] rotate-45'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-[#242424]'
                  }`}
                  style={{ transition: 'transform 0.18s, background 0.15s, color 0.15s' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                {/* Attach popover */}
                {showAttachMenu && (
                  <div className="absolute bottom-10 left-0 bg-[#1e1e1e] border border-[#2e2e2e] rounded-2xl shadow-2xl py-1.5 min-w-[172px] z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                      onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </span>
                      Photo / Video
                    </button>
                    <button
                      onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </span>
                      Document
                    </button>
                    <div className="mx-3 my-1 border-t border-[#2a2a2a]" />
                    <button
                      onClick={() => { startRecording(); setShowAttachMenu(false) }}
                      disabled={isRecording}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors disabled:opacity-40"
                    >
                      <span className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                      </span>
                      Record audio
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Send button */}
            <button
              onClick={sendMessage}
              disabled={(!input.trim() && pendingFiles.length === 0) || isGenerating}
              className="w-8 h-8 bg-[#00ff88] text-black rounded-xl flex items-center justify-center hover:bg-[#00e87a] active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              {isGenerating ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity="0.3" />
                  <path d="M21 12a9 9 0 0 1-9 9" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Expanded view"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-[#1a1a1a] border border-[#3a3a3a] rounded-full text-gray-300 hover:text-white hover:bg-[#2a2a2a] text-lg transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

// --- Sub-components ---

function AttachmentDisplay({ attachment, onImageClick }: { attachment: Attachment; onImageClick: (url: string) => void }) {
  const isImage = attachment.type.startsWith('image/')
  const isAudio = attachment.type.startsWith('audio/')
  const isVideo = attachment.type.startsWith('video/')

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attachment.url}
        alt={attachment.name}
        className="max-w-[240px] max-h-[180px] rounded-xl object-cover border border-[#2a2a2a] cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => onImageClick(attachment.url)}
      />
    )
  }

  if (isAudio) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 flex flex-col gap-1.5 min-w-[220px]">
        <div className="text-xs text-gray-500 truncate max-w-[200px]">{attachment.name}</div>
        <audio controls src={attachment.url} className="h-8 w-full" style={{ colorScheme: 'dark' }} />
      </div>
    )
  }

  if (isVideo) {
    return (
      <video
        src={attachment.url}
        controls
        className="max-w-[280px] max-h-[200px] rounded-xl border border-[#2a2a2a]"
      />
    )
  }

  // Generic file chip
  return (
    <a
      href={attachment.url}
      download={attachment.name}
      className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 hover:border-[#00ff88]/40 transition-colors group"
    >
      <span className="text-xl">
        {attachment.type.includes('pdf') ? '📄' :
         attachment.type.includes('zip') ? '🗜️' :
         attachment.type.includes('text') || attachment.name.endsWith('.txt') || attachment.name.endsWith('.md') ? '📝' :
         '📎'}
      </span>
      <div className="min-w-0">
        <div className="text-xs text-gray-300 truncate max-w-[140px] group-hover:text-[#00ff88] transition-colors">{attachment.name}</div>
        <div className="text-[10px] text-gray-600">{formatBytes(attachment.size)}</div>
      </div>
    </a>
  )
}

function PendingAttachmentPreview({ pf }: { pf: PendingFile }) {
  const isImage = pf.file.type.startsWith('image/')
  const isAudio = pf.file.type.startsWith('audio/')
  const isVideo = pf.file.type.startsWith('video/')
  const isPdf = pf.file.type === 'application/pdf' || pf.file.name.endsWith('.pdf')

  const fileIcon = isPdf ? '📄' : isAudio ? '🎤' : isVideo ? '🎬' : '📎'
  const iconColor = isPdf ? '#f87171' : isAudio ? '#00ff88' : isVideo ? '#60a5fa' : '#9ca3af'

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pf.previewUrl}
        alt={pf.file.name}
        className="w-14 h-14 rounded-xl object-cover border border-[#2a2a2a]"
      />
    )
  }

  return (
    <div className="flex items-center gap-2.5 bg-[#242424] border border-[#333] rounded-xl px-3 py-2 max-w-[160px]">
      <span className="text-base flex-shrink-0" style={{ color: iconColor }}>{fileIcon}</span>
      <div className="min-w-0">
        <div className="text-xs text-gray-300 truncate font-medium">{pf.file.name}</div>
        <div className="text-[10px] text-gray-600 mt-0.5">{formatBytes(pf.file.size)}</div>
      </div>
    </div>
  )
}

function formatMessageHtml(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />')

  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`
  }

  return `<div class="prose-jarvis">${html}</div>`
}
