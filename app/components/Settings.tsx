'use client'

import { useState } from 'react'

type SettingsTab = 'profile' | 'preferences' | 'integrations' | 'data' | 'help'

interface SettingsSection {
  id: SettingsTab
  label: string
  icon: string
  description: string
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: '👤',
    description: 'Manage your account and basic information',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: '⚙️',
    description: 'Customize how Jarvis works for you',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: '🔌',
    description: 'Connect and manage external services',
  },
  {
    id: 'data',
    label: 'Data & Export',
    icon: '📊',
    description: 'Manage your data and exports',
  },
  {
    id: 'help',
    label: 'Help & Shortcuts',
    icon: '❓',
    description: 'Get help and learn keyboard shortcuts',
  },
]

// ── Profile Tab ────────────────────────────────────────────────────────────
function ProfileTab() {
  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Profile Information</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-2 uppercase tracking-wider">Username</label>
            <input
              type="text"
              value="Vincent"
              readOnly
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-gray-200"
            />
            <p className="text-xs text-gray-500 mt-1">Your unique identifier in Jarvis</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value="vincent@example.com"
              readOnly
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-gray-200"
            />
            <p className="text-xs text-gray-500 mt-1">Your contact email (read-only)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Preferences Tab ────────────────────────────────────────────────────────
function PreferencesTab() {
  const [defaultModel, setDefaultModel] = useState('claude-3.5-sonnet')

  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Chat Preferences</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-2 uppercase tracking-wider">Default Model</label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-gray-200"
            >
              <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="claude-3.5-haiku">Claude 3.5 Haiku</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Model used for new chats by default</p>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Display Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-gray-200">Dark Mode</p>
              <p className="text-xs text-gray-500 mt-0.5">Currently enabled (toggle in sidebar)</p>
            </div>
            <div className="text-xs text-[#00ff88]">✓ On</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Integrations Tab ────────────────────────────────────────────────────────
function IntegrationsTab() {
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const apiKey = 'gqjPvb...qpDDfweEUeDX' // Masked for security

  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-200">OpenClaw API</h3>
            <p className="text-xs text-gray-500 mt-0.5">For accessing OpenClaw services</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
            <span className="text-[10px] text-[#00ff88] font-semibold">Connected</span>
          </div>
        </div>
        <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3 font-mono text-xs text-gray-400 break-all">
          {apiKeyVisible ? apiKey : '••••••••••••••••••••••••••••••••'}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setApiKeyVisible(!apiKeyVisible)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
          >
            {apiKeyVisible ? 'Hide' : 'Show'}
          </button>
          <button className="px-3 py-1.5 text-xs rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors">
            Copy
          </button>
          <button className="px-3 py-1.5 text-xs rounded-lg border border-red-900/30 text-red-400/70 hover:text-red-400 transition-colors">
            Regenerate
          </button>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Anthropic API</h3>
            <p className="text-xs text-gray-500 mt-0.5">For Claude AI models (when configured)</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-900/50 border border-gray-700">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            <span className="text-[10px] text-gray-500 font-semibold">Not set</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Configure your Anthropic API key to use Claude models directly (optional — uses OpenClaw by default)
        </p>
        <button className="px-4 py-2 text-xs rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors">
          Add API Key
        </button>
      </div>
    </div>
  )
}

// ── Data Tab ───────────────────────────────────────────────────────────────
function DataTab() {
  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Export Data</h3>
        <p className="text-xs text-gray-500 mb-4">Download your data in various formats</p>
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-3 rounded-lg border border-[#2a2a2a] hover:bg-white/[0.02] transition-colors text-sm text-gray-300">
            📄 Export All Chats (JSON)
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg border border-[#2a2a2a] hover:bg-white/[0.02] transition-colors text-sm text-gray-300">
            📊 Export GPU Inventory (CSV)
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg border border-[#2a2a2a] hover:bg-white/[0.02] transition-colors text-sm text-gray-300">
            💰 Export Pricing Data (CSV)
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg border border-[#2a2a2a] hover:bg-white/[0.02] transition-colors text-sm text-gray-300">
            📈 Export API Usage Report (PDF)
          </button>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Danger Zone</h3>
        <p className="text-xs text-gray-500 mb-4">Irreversible actions — be careful</p>
        <button className="w-full px-4 py-3 rounded-lg border border-red-900/40 hover:bg-red-900/10 transition-colors text-sm font-medium text-red-400">
          🗑️ Delete All Data
        </button>
      </div>
    </div>
  )
}

// ── Help Tab ───────────────────────────────────────────────────────────────
function HelpTab() {
  const shortcuts = [
    { keys: 'Cmd+K / Ctrl+K', action: 'Open global search' },
    { keys: 'Cmd+N / Ctrl+N', action: 'New chat' },
    { keys: 'Cmd+, / Ctrl+,', action: 'Open settings' },
    { keys: '?', action: 'Show this help' },
    { keys: 'Escape', action: 'Close modal' },
    { keys: 'Enter', action: 'Send message (in chat)' },
    { keys: 'Shift+Enter', action: 'New line (in chat)' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Keyboard Shortcuts</h3>
        <div className="space-y-3">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[#0f0f0f] last:border-0">
              <span className="text-sm text-gray-400">{s.action}</span>
              <code className="px-3 py-1 text-xs rounded bg-[#0f0f0f] border border-[#2a2a2a] text-gray-300 font-mono">
                {s.keys}
              </code>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">About Jarvis</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p>Version: 1.0.0 (Beta)</p>
          <p>Last updated: 2026-03-15</p>
          <p className="text-xs text-gray-600 mt-3">
            Jarvis is your personal command center for hardware research, monitoring, and automation. Built with Next.js, Tailwind CSS, and Claude AI.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('preferences')

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-white/5 flex-shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-sm text-gray-400">Customize your Jarvis experience</p>
      </div>

      {/* Tab navigation */}
      <div className="px-4 md:px-6 py-3 border-b border-white/5 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {SETTINGS_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === section.id
                  ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent hover:border-white/10'
              }`}
              title={section.description}
            >
              <span className="mr-1.5">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'data' && <DataTab />}
        {activeTab === 'help' && <HelpTab />}
      </div>
    </div>
  )
}
