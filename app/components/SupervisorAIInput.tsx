'use client'

import { useState, useRef, useCallback } from 'react'

interface SupervisorAIInputProps {
  onGenerate?: (result: string, model: string) => void
}

export default function SupervisorAIInput({ onGenerate }: SupervisorAIInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [result, setResult] = useState('')
  const [selectedModel, setSelectedModel] = useState<'haiku' | 'sonnet' | 'opus'>('haiku')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  // Initialize Web Speech API
  const initSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current

    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.webkitSpeechRecognition || (window as any).SpeechRecognition)

    if (!SpeechRecognition) {
      setError('Speech Recognition API not supported in your browser')
      return null
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
      setTranscript('')
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + transcript)
        } else {
          interimTranscript += transcript
        }
      }
    }

    recognition.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    return recognition
  }, [])

  const startListening = useCallback(() => {
    const recognition = initSpeechRecognition()
    if (recognition) {
      setTranscript('')
      setResult('')
      setError(null)
      recognition.start()
    }
  }, [initSpeechRecognition])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const handleGenerateAI = useCallback(async () => {
    if (!transcript.trim()) {
      setError('Please speak something first')
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult('')

    try {
      const response = await fetch('/api/supervisor/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: transcript,
          model: selectedModel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate AI response')
      }

      const data = await response.json()
      setResult(data.result)
      onGenerate?.(data.result, selectedModel)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
    } finally {
      setIsGenerating(false)
    }
  }, [transcript, selectedModel, onGenerate])

  const handleClear = useCallback(() => {
    setTranscript('')
    setResult('')
    setError(null)
  }, [])

  const modelOptions = [
    { id: 'haiku', label: 'Claude Haiku (Fast)', description: 'Quick responses, cost-effective' },
    { id: 'sonnet', label: 'Claude Sonnet (Balanced)', description: 'Balanced speed & quality' },
    { id: 'opus', label: 'Claude Opus (Powerful)', description: 'Most capable, slower' },
  ]

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">🎤 Jarvis AI Supervisor</h2>
        <p className="text-gray-400 text-sm">Speak your task → AI generates response</p>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Select AI Model</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {modelOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedModel(option.id as 'haiku' | 'sonnet' | 'opus')}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedModel === option.id
                  ? 'border-[#00ff88] bg-[#00ff88]/10'
                  : 'border-gray-600 hover:border-gray-400 bg-gray-900/50'
              }`}
            >
              <div className="font-medium text-white text-sm">{option.label}</div>
              <div className="text-xs text-gray-400 mt-1">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Speech Input Section */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">Voice Input</label>
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
          {/* Transcript Display */}
          <div
            className="min-h-20 p-3 bg-black/50 rounded border border-gray-800 text-gray-300 text-sm overflow-y-auto"
            style={{ maxHeight: '120px' }}
          >
            {transcript || <span className="text-gray-600 italic">Your speech will appear here...</span>}
          </div>

          {/* Recording Buttons */}
          <div className="flex gap-2">
            <button
              onClick={startListening}
              disabled={isListening || isGenerating}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[#00ff88]/20 hover:bg-[#00ff88]/30 border border-[#00ff88]'
              } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isListening ? '🔴 Recording...' : '🎤 Start Recording'}
            </button>
            <button
              onClick={stopListening}
              disabled={!isListening}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⏹️ Stop
            </button>
            <button
              onClick={handleClear}
              disabled={!transcript && !result}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑️ Clear
            </button>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerateAI}
        disabled={!transcript.trim() || isGenerating || isListening}
        className="w-full px-6 py-3 bg-gradient-to-r from-[#00ff88] to-[#00cc6f] hover:from-[#00ff99] hover:to-[#00dd80] text-black font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? '⚙️ Generating...' : '✨ Generate AI Response'}
      </button>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* AI Result */}
      {result && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">AI Response</label>
          <div className="p-4 bg-gradient-to-br from-[#00ff88]/5 to-[#00cc6f]/5 border border-[#00ff88]/30 rounded-lg">
            <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="text-center text-xs text-gray-500">
        <p>💡 Tip: Best results with clear speech. Supported languages: English</p>
      </div>
    </div>
  )
}
