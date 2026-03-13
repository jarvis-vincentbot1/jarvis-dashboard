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
  createdAt: string
}

interface Chat {
  id: string
  name: string
}

interface Props {
  chat: Chat
  onDeleteChat: (id: string) => void
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

export default function ChatWindow({ chat, onDeleteChat }: Props) {
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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

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

  // Load messages when chat changes
  useEffect(() => {
    setMessages([])
    setStreamingContent('')
    setLoading(true)
    setPendingFiles([])

    fetch(`/api/chats/${chat.id}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [chat.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

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
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm'
        const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: mimeType })
        addFiles([file])
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
    if ((!text && pendingFiles.length === 0) || streaming) return

    setInput('')
    setStreaming(true)
    setStreamingContent('')
    setUploadError(null)

    // Upload files first
    let attachments: Attachment[] = []
    if (pendingFiles.length > 0) {
      try {
        attachments = await Promise.all(pendingFiles.map(uploadFile))
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
        setStreaming(false)
        return
      }
      // Clean up object URLs
      pendingFiles.forEach(p => URL.revokeObjectURL(p.previewUrl))
      setPendingFiles([])
    }

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      attachments: attachments.length ? attachments : undefined,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    abortRef.current = new AbortController()

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
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        throw new Error('Failed to get response')
      }

      // Handle quick-reply JSON responses (e.g. todo commands)
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const json = await res.json()
        if (json.quickReply) {
          const assistantMsg: Message = {
            id: `quick-${Date.now()}`,
            role: 'assistant',
            content: json.quickReply,
            createdAt: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, assistantMsg])
        }
        return
      }

      if (!res.body) throw new Error('No response body')

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
              const assistantMsg: Message = {
                id: `temp-assistant-${Date.now()}`,
                role: 'assistant',
                content: fullContent,
                createdAt: new Date().toISOString(),
              }
              setMessages((prev) => [...prev, assistantMsg])
              setStreamingContent('')
              fetch(`/api/chats/${chat.id}/messages`)
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
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col h-full" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
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

        {!loading && messages.length === 0 && !streaming && (
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
              {/* Text bubble */}
              {msg.content && (
                <div
                  className={`
                    rounded-2xl px-4 py-3 text-sm
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
                  className="prose-jarvis cursor-blink"
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

      {/* Input area */}
      <div className="px-4 md:px-6 py-4 border-t border-[#2a2a2a] flex-shrink-0">
        {/* Pending attachment previews */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {pendingFiles.map((pf, i) => (
              <div key={i} className="relative group">
                <PendingAttachmentPreview pf={pf} />
                <button
                  onClick={() => removePendingFile(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#333] border border-[#555] rounded-full text-gray-300 hover:bg-red-500 hover:text-white text-xs flex items-center justify-center transition-colors z-10"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadError && (
          <div className="mb-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-1.5">
            {uploadError}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Attachment toolbar */}
          <div className="flex gap-1 flex-shrink-0 pb-1">
            {/* File/image upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              title="Attach file"
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-[#00ff88] hover:bg-[#1a1a1a] rounded-lg transition-colors disabled:opacity-40"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.txt,.zip,.csv,.json,.md"
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />

            {/* Audio recording */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={streaming}
              title={isRecording ? 'Stop recording' : 'Record audio'}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
                isRecording
                  ? 'text-red-400 bg-red-400/10 hover:bg-red-400/20 animate-pulse'
                  : 'text-gray-500 hover:text-[#00ff88] hover:bg-[#1a1a1a]'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          </div>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${chat.name}...`}
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
            disabled={(!input.trim() && pendingFiles.length === 0) || streaming}
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
          Enter to send · Shift+Enter for new line · Drag & drop files
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

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pf.previewUrl}
        alt={pf.file.name}
        className="w-16 h-16 rounded-lg object-cover border border-[#2a2a2a]"
      />
    )
  }

  if (isAudio) {
    return (
      <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
        <span className="text-[#00ff88] text-sm">🎤</span>
        <span className="text-xs text-gray-400 max-w-[100px] truncate">{pf.file.name}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
      <span className="text-sm">📎</span>
      <div className="min-w-0">
        <div className="text-xs text-gray-400 max-w-[100px] truncate">{pf.file.name}</div>
        <div className="text-[10px] text-gray-600">{formatBytes(pf.file.size)}</div>
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
