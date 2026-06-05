/**
 * AI Sidebar — Chat UI component for browser AI assistant
 * Sends commands to background.ts which calls NVIDIA NIM API
 */

import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Message type — user or AI response
interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

function AISidebar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Send message to background script for AI processing
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: Date.now() }]);
    setLoading(true);

    try {
      // Send command to background.ts AI handler
      const response = await chrome.runtime.sendMessage({
        type: 'AI_COMMAND',
        command: userMsg,
      });

      const aiText = response?.message || response?.error || 'No response received';
      setMessages(prev => [...prev, { role: 'ai', text: aiText, timestamp: Date.now() }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: `Error: ${error.message || 'Failed to get AI response'}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="ai-sidebar">
      {/* Header */}
      <div className="ai-header">
        <span>🤖</span>
        <span>AI Browser Assistant</span>
      </div>

      {/* Messages area */}
      <div className="ai-messages">
        {messages.length === 0 && !loading && (
          <div className="ai-empty">
            <div className="ai-empty-icon">🤖</div>
            <div>Tell me what to do on this page</div>
            <div style={{ fontSize: '11px' }}>e.g. "Click the login button" or "What's on this page?"</div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`ai-msg ${m.role}`}>
            <span className="ai-msg-icon">{m.role === 'user' ? '👤' : '🤖'}</span>
            <span className="ai-msg-text">{m.text}</span>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="ai-msg ai loading">
            <span className="ai-msg-icon">🤖</span>
            <span className="ai-msg-text">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input row */}
      <div className="ai-input-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell AI what to do..."
          className="ai-input"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          className="ai-send-btn"
          disabled={loading || !input.trim()}
          title="Send command"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

// Mount React app
const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<AISidebar />);
}
