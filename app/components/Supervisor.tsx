'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface RunStep {
  id: string
  runId: string
  order: number
  prompt: string
  result: string
  status: string
  model: string | null
  retries: number
  maxRetries: number
  requiresReview: boolean
  approved: boolean
  createdAt: string
  updatedAt: string
}

interface Run {
  id: string
  title: string
  status: string
  model: string
  steps: RunStep[]
  createdAt: string
  updatedAt: string
}

interface NewStep {
  prompt: string
  model: string
  requiresReview: boolean
}

const MODELS = [
  { id: '', label: 'Inherit from run' },
  { id: 'ollama/qwen2.5:7b', label: 'Qwen 2.5 (local)' },
  { id: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet' },
  { id: 'ollama/minimax-m2.5:cloud', label: 'MiniMax M2.5' },
]

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; bg: string; label: string; spin?: boolean }> = {
    pending:  { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', label: 'Pending' },
    running:  { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  label: 'Running', spin: true },
    paused:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: 'Paused' },
    done:     { color: '#00ff88', bg: 'rgba(0,255,136,0.12)',  label: 'Done' },
    error:    { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Error' },
    skipped:  { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Skipped' },
  }
  const cfg = configs[status] ?? configs.pending

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.spin && (
        <span
          className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin"
          style={{ borderColor: cfg.color, borderTopColor: 'transparent' }}
        />
      )}
      {cfg.label}
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Supervisor() {
  const [runs, setRuns] = useState<Run[]>([])
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // New run form state
  const [newTitle, setNewTitle] = useState('')
  const [newModel, setNewModel] = useState('ollama/qwen2.5:7b')
  const [newSteps, setNewSteps] = useState<NewStep[]>([
    { prompt: '', model: '', requiresReview: false },
  ])
  const [creating, setCreating] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/runs')
      if (!res.ok) return
      const data = await res.json()
      setRuns(data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchRuns().finally(() => setLoading(false))
  }, [fetchRuns])

  // Poll while any run is actively running
  useEffect(() => {
    const hasActive = runs.some(r => r.status === 'running' || r.status === 'pending')

    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(fetchRuns, 2000)
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [runs, fetchRuns])

  async function handleExecute(runId: string) {
    setActionLoading(runId + ':execute')
    try {
      await fetch(`/api/runs/${runId}/execute`, { method: 'POST' })
      await fetchRuns()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(runId: string) {
    setActionLoading(runId + ':delete')
    try {
      await fetch(`/api/runs/${runId}`, { method: 'DELETE' })
      setRuns(prev => prev.filter(r => r.id !== runId))
      if (expandedRunId === runId) setExpandedRunId(null)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleApprove(runId: string, stepId: string) {
    setActionLoading(stepId + ':approve')
    try {
      await fetch(`/api/runs/${runId}/steps/${stepId}/approve`, { method: 'POST' })
      await fetchRuns()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRetry(runId: string, stepId: string) {
    setActionLoading(stepId + ':retry')
    try {
      await fetch(`/api/runs/${runId}/steps/${stepId}/retry`, { method: 'POST' })
      await fetchRuns()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCreate() {
    if (!newTitle.trim() || newSteps.some(s => !s.prompt.trim())) return
    setCreating(true)
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          model: newModel,
          steps: newSteps.map(s => ({
            prompt: s.prompt.trim(),
            model: s.model || undefined,
            requiresReview: s.requiresReview,
          })),
        }),
      })
      if (!res.ok) return
      const run = await res.json()
      setRuns(prev => [run, ...prev])
      setShowModal(false)
      setNewTitle('')
      setNewModel('ollama/qwen2.5:7b')
      setNewSteps([{ prompt: '', model: '', requiresReview: false }])
      setExpandedRunId(run.id)
    } finally {
      setCreating(false)
    }
  }

  function toggleStep(stepId: string) {
    setExpandedStepIds(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }

  function addStep() {
    setNewSteps(prev => [...prev, { prompt: '', model: '', requiresReview: false }])
  }

  function removeStep(i: number) {
    setNewSteps(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateStep(i: number, patch: Partial<NewStep>) {
    setNewSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
        <div>
          <h1 className="text-white font-semibold text-lg tracking-wide">Supervisor</h1>
          <p className="text-gray-500 text-xs mt-0.5">Multi-step AI runs with review &amp; retry</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'rgba(0,255,136,0.12)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Run
        </button>
      </div>

      {/* Run list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <p className="text-sm">No runs yet. Create one to get started.</p>
          </div>
        ) : (
          runs.map(run => (
            <RunCard
              key={run.id}
              run={run}
              expanded={expandedRunId === run.id}
              expandedStepIds={expandedStepIds}
              actionLoading={actionLoading}
              onToggle={() => setExpandedRunId(prev => prev === run.id ? null : run.id)}
              onToggleStep={toggleStep}
              onExecute={handleExecute}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onRetry={handleRetry}
            />
          ))
        )}
      </div>

      {/* New Run Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
              <h2 className="text-white font-semibold">New Run</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Describe the goal of this run…"
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:ring-1"
                  style={{ background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)',  }}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCreate()}
                />
              </div>

              {/* Default model */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Default model</label>
                <select
                  value={newModel}
                  onChange={e => setNewModel(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                  style={{ background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {MODELS.filter(m => m.id).map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 font-medium">Steps</label>
                  <span className="text-xs text-gray-600">{newSteps.length} step{newSteps.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-3">
                  {newSteps.map((step, i) => (
                    <div key={i} className="rounded-lg p-3 space-y-2.5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">Step {i + 1}</span>
                        {newSteps.length > 1 && (
                          <button onClick={() => removeStep(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <textarea
                        value={step.prompt}
                        onChange={e => updateStep(i, { prompt: e.target.value })}
                        placeholder="What should the AI do in this step?"
                        rows={3}
                        className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none resize-none"
                        style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
                      />
                      <div className="flex items-center gap-3">
                        <select
                          value={step.model}
                          onChange={e => updateStep(i, { model: e.target.value })}
                          className="flex-1 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          {MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={step.requiresReview}
                            onChange={e => updateStep(i, { requiresReview: e.target.checked })}
                            className="w-3.5 h-3.5 rounded accent-[#00ff88]"
                          />
                          <span className="text-xs text-gray-500">Requires review</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addStep}
                  className="mt-3 w-full py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
                >
                  + Add step
                </button>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/5 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim() || newSteps.some(s => !s.prompt.trim())}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                style={{ background: '#00ff88', color: '#0f0f0f' }}
              >
                {creating ? (
                  <span className="w-4 h-4 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
                ) : null}
                Create Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface RunCardProps {
  run: Run
  expanded: boolean
  expandedStepIds: Set<string>
  actionLoading: string | null
  onToggle: () => void
  onToggleStep: (stepId: string) => void
  onExecute: (runId: string) => void
  onDelete: (runId: string) => void
  onApprove: (runId: string, stepId: string) => void
  onRetry: (runId: string, stepId: string) => void
}

function RunCard({
  run, expanded, expandedStepIds, actionLoading,
  onToggle, onToggleStep, onExecute, onDelete, onApprove, onRetry,
}: RunCardProps) {
  const doneCount = run.steps.filter(s => s.status === 'done').length
  const isExecuting = actionLoading === run.id + ':execute'
  const isDeleting = actionLoading === run.id + ':delete'
  const canExecute = run.status === 'pending' || run.status === 'error'

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={onToggle}
      >
        {/* Expand chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 text-gray-600 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white text-sm font-medium truncate">{run.title}</span>
            <StatusBadge status={run.status} />
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-600">{doneCount}/{run.steps.length} steps done</span>
            <span className="text-xs text-gray-700">·</span>
            <span className="text-xs text-gray-600">{timeAgo(run.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {canExecute && (
            <button
              onClick={() => onExecute(run.id)}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.15)' }}
            >
              {isExecuting ? (
                <span className="w-3 h-3 border border-[#00ff88] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
              Run
            </button>
          )}
          <button
            onClick={() => onDelete(run.id)}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded steps */}
      {expanded && run.steps.length > 0 && (
        <div className="border-t border-white/5">
          {run.steps.map(step => {
            const stepExpanded = expandedStepIds.has(step.id)
            const isApprovingStep = actionLoading === step.id + ':approve'
            const isRetryingStep = actionLoading === step.id + ':retry'
            const canApprove = step.status === 'done' && step.requiresReview && !step.approved
            const canRetry = step.status === 'error'

            return (
              <div key={step.id} className="border-b border-white/[0.04] last:border-b-0">
                <div className="flex items-start gap-3 px-4 py-3">
                  {/* Step number */}
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ background: '#2a2a2a', color: '#6b7280' }}
                  >
                    {step.order + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-300 text-xs truncate max-w-[240px]">{step.prompt}</span>
                      <StatusBadge status={step.status} />
                      {step.requiresReview && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24' }}>
                          review
                        </span>
                      )}
                    </div>

                    {step.result && (
                      <div className="mt-2">
                        <button
                          onClick={() => onToggleStep(step.id)}
                          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                        >
                          {stepExpanded ? '▾ hide result' : '▸ show result'}
                        </button>
                        {stepExpanded && (
                          <pre
                            className="mt-2 p-3 rounded-lg text-xs text-gray-300 whitespace-pre-wrap break-words overflow-auto max-h-48"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            {step.result}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* Step actions */}
                    {(canApprove || canRetry) && (
                      <div className="flex items-center gap-2 mt-2">
                        {canApprove && (
                          <button
                            onClick={() => onApprove(run.id, step.id)}
                            disabled={isApprovingStep}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                            style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.15)' }}
                          >
                            {isApprovingStep ? (
                              <span className="w-3 h-3 border border-[#00ff88] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            Approve &amp; continue
                          </button>
                        )}
                        {canRetry && (
                          <button
                            onClick={() => onRetry(run.id, step.id)}
                            disabled={isRetryingStep}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                            style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.15)' }}
                          >
                            {isRetryingStep ? (
                              <span className="w-3 h-3 border border-[#60a5fa] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                <polyline points="1 4 1 10 7 10" />
                                <path d="M3.51 15a9 9 0 1 0 .49-4" />
                              </svg>
                            )}
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
