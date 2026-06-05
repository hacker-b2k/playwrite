/**
 * aiSidebar.tsx — AutoCompute AI Browser Assistant UI
 * User chat karta hai → AI browser pe actions execute karta hai
 * Features: Chat UI, real-time steps, API key settings
 */

import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'ai';
  text: string;
  steps?: string[];      // AI ke action steps — real-time status
  isError?: boolean;
  timestamp: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

function AISidebar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Saved API key load karo on mount
  useEffect(() => {
    chrome.storage.local.get('nvidia_api_key', (result) => {
      const saved = result['nvidia_api_key'] || '';
      setApiKey(saved);
      setApiKeySaved(!!saved);
    });
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ─── Send Message ───────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');

    // User message add karo
    setMessages(prev => [...prev, {
      role: 'user',
      text: userText,
      timestamp: Date.now(),
    }]);
    setLoading(true);

    try {
      // Background ko command bhejo
      const response: any = await chrome.runtime.sendMessage({
        type: 'AI_COMMAND',
        command: userText,
      });

      const text = response?.message || response?.error || 'No response';
      const steps = response?.steps as string[] | undefined;
      const isError = !!response?.error || text.startsWith('❌');

      setMessages(prev => [...prev, {
        role: 'ai',
        text,
        steps,
        isError,
        timestamp: Date.now(),
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: `❌ Error: ${err.message || 'Connection failed'}`,
        isError: true,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Enter key handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // API key save karo
  const saveApiKey = () => {
    const trimmed = apiKey.trim();
    chrome.storage.local.set({ nvidia_api_key: trimmed }, () => {
      setApiKeySaved(!!trimmed);
      setShowSettings(false);
    });
  };

  // Clear chat
  const clearChat = () => setMessages([]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="ai-sidebar">

      {/* ── Header ── */}
      <div className="ai-header">
        <span>🤖</span>
        <span className="ai-header-title">AI Browser Assistant</span>
        <div className="ai-header-actions">
          {messages.length > 0 && (
            <button className="ai-icon-btn" onClick={clearChat} title="Clear chat">🗑️</button>
          )}
          <button
            className={`ai-icon-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(s => !s)}
            title="Settings"
          >⚙️</button>
        </div>
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="ai-settings">
          <div className="ai-settings-title">🔑 NVIDIA API Key</div>
          <input
            type="password"
            className="ai-settings-input"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="nvapi-xxxxxxxxxxxxxxxxxxxx"
            onKeyDown={e => e.key === 'Enter' && saveApiKey()}
          />
          <div className="ai-settings-row">
            <span className={`ai-key-status ${apiKeySaved ? 'saved' : 'missing'}`}>
              {apiKeySaved ? '✅ Key saved' : '⚠️ Key missing'}
            </span>
            <button className="ai-save-btn" onClick={saveApiKey}>Save</button>
          </div>
          <div className="ai-settings-hint">
            Get key from: integrate.api.nvidia.com
          </div>
        </div>
      )}

      {/* ── Messages Area ── */}
      <div className="ai-messages">

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="ai-empty">
            <div className="ai-empty-icon">🤖</div>
            <div className="ai-empty-title">AI Browser Assistant</div>
            <div className="ai-empty-sub">Browser pe kuch bhi karwao</div>
            <div className="ai-examples">
              <div className="ai-example" onClick={() => setInput('Go to youtube.com and search Tum Hi Ho')}>
                💡 "Go to youtube and search Tum Hi Ho"
              </div>
              <div className="ai-example" onClick={() => setInput('What is on this page?')}>
                💡 "What is on this page?"
              </div>
              <div className="ai-example" onClick={() => setInput('Scroll down')}>
                💡 "Scroll down"
              </div>
              <div className="ai-example" onClick={() => setInput('Click the first link')}>
                💡 "Click the first link"
              </div>
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((m, i) => (
          <div key={i} className={`ai-msg ${m.role} ${m.isError ? 'error' : ''}`}>
            <span className="ai-msg-icon">
              {m.role === 'user' ? '👤' : '🤖'}
            </span>
            <div className="ai-msg-body">
              <span className="ai-msg-text">{m.text}</span>

              {/* Action steps — real-time status list */}
              {m.steps && m.steps.length > 0 && (
                <div className="ai-steps">
                  {m.steps.map((step, si) => (
                    <div key={si} className="ai-step">{step}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="ai-msg ai loading">
            <span className="ai-msg-icon">🤖</span>
            <div className="ai-msg-body">
              <span className="ai-msg-text">Working on it...</span>
              <div className="ai-loading-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="ai-input-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={apiKeySaved ? 'Tell AI what to do...' : '⚙️ Set API key first...'}
          className="ai-input"
          disabled={loading}
          autoFocus
        />
        <button
          onClick={sendMessage}
          className="ai-send-btn"
          disabled={loading || !input.trim()}
          title="Send (Enter)"
        >
          {loading ? '⏳' : '➤'}
        </button>
      </div>

    </div>
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────
const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<AISidebar />);
}
