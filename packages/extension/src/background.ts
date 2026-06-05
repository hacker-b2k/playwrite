/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { debugLog } from './relayConnection';
import { PendingConnections } from './pendingConnection';
import { ConnectedTabGroup, cleanupStalePlaywrightGroups, isNonDebuggableUrl } from './connectedTabGroup';

type PageMessage = {
  type: 'connectionRequested';
  mcpRelayUrl: string;
  protocolVersion: number;
} | {
  type: 'getTabs';
} | {
  type: 'connectToTab';
  // Picked in the connect page; absent on the token-bypass path where no tab
  // selection happens.
  tab?: chrome.tabs.Tab;
  clientName?: string;
} | {
  type: 'getConnectionStatus';
} | {
  type: 'disconnect';
} | {
  type: 'keepalive';
};

class PlaywrightExtension {
  private _activeGroup: ConnectedTabGroup | undefined;
  private _activeClientName: string | undefined;
  private _pendingConnections = new PendingConnections();
  // Service worker restarts lose all connection state, so any existing
  // Playwright groups are stale. Connections wait on this before reconciling.
  private _cleanupPromise: Promise<void>;

  constructor() {
    chrome.runtime.onMessage.addListener(this._onMessage.bind(this));
    chrome.action.onClicked.addListener(this._onActionClicked.bind(this));
    this._cleanupPromise = cleanupStalePlaywrightGroups();
  }

  // Promise-based message handling is not supported in Chrome: https://issues.chromium.org/issues/40753031
  private _onMessage(message: PageMessage, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
    switch (message.type) {
      case 'connectionRequested':
        this._pendingConnections.create(sender.tab!.id!, message.mcpRelayUrl, message.protocolVersion).then(
            () => sendResponse({ success: true }),
            (error: any) => sendResponse({ success: false, error: error.message }));
        return true;
      case 'getTabs':
        this._getTabs().then(
            tabs => sendResponse({ success: true, tabs, currentTabId: sender.tab?.id }),
            (error: any) => sendResponse({ success: false, error: error.message }));
        return true;
      case 'connectToTab': {
        // Token-bypass (no specific pick) falls back to the connect page itself
        // so `ConnectedTabGroup` always has a concrete tab to start from. Both
        // sender.tab and UI-supplied tabs come from chrome.tabs.query / runtime
        // message sender, where `id` is always defined.
        const selectedTab = (message.tab ?? sender.tab!) as chrome.tabs.Tab & { id: number };
        this._connectTab(sender.tab!.id!, selectedTab, message.clientName).then(
            () => sendResponse({ success: true }),
            (error: any) => sendResponse({ success: false, error: error.message }));
        return true; // Return true to indicate that the response will be sent asynchronously
      }
      case 'getConnectionStatus':
        sendResponse({
          connectedTabIds: this._activeGroup?.connectedTabIds() ?? [],
          clientName: this._activeClientName,
        });
        return false;
      case 'disconnect':
        try {
          this._disconnect('User disconnected');
          sendResponse({ success: true });
        } catch (error: any) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      case 'keepalive':
        // Connect page pings us every ~20s so receiving this message resets
        // the MV3 service worker idle timer and keeps the relay WebSocket alive.
        return false;
    }
  }

  private async _connectTab(selectorTabId: number, tab: chrome.tabs.Tab & { id: number }, clientName: string | undefined): Promise<void> {
    try {
      await this._cleanupPromise;
      this._disconnect('Another connection is requested');

      const connection = await this._pendingConnections.take(selectorTabId);
      if (!connection)
        throw new Error('Pending client connection closed');

      const group = new ConnectedTabGroup(connection, tab);
      group.onclose = () => {
        if (this._activeGroup === group) {
          this._activeGroup = undefined;
          this._activeClientName = undefined;
        }
      };
      this._activeGroup = group;
      this._activeClientName = clientName;

      await Promise.all([
        chrome.tabs.update(tab.id, { active: true }),
        chrome.windows.update(tab.windowId, { focused: true }),
      ]).catch(() => {});

      if (tab.id !== selectorTabId)
        await chrome.tabs.remove(selectorTabId).catch(() => {});
    } catch (error: any) {
      debugLog(`Failed to connect tab ${tab.id}:`, error.message);
      throw error;
    }
  }

  private async _getTabs(): Promise<chrome.tabs.Tab[]> {
    const tabs = await chrome.tabs.query({});
    return tabs.filter(tab => !isNonDebuggableUrl(tab.url));
  }

  private async _onActionClicked(): Promise<void> {
    await chrome.tabs.create({
      url: chrome.runtime.getURL('status.html'),
      active: true
    });
  }

  // Closes the active group's connection if any. ConnectedTabGroup's onclose
  // handles state cleanup (connectedTabIds, badges, reconcile).
  private _disconnect(reason: string) {
    this._activeGroup?.close(reason);
    this._activeGroup = undefined;
    this._activeClientName = undefined;
  }
}

new PlaywrightExtension();

// ─── AI BROWSER ASSISTANT ─────────────────────────────────────────────────────
// NVIDIA NIM API — sidebar commands ko browser actions mein convert karta hai

import { parseActions, hasActions, runActions } from './aiActionRunner';

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const AI_MODEL = 'meta/llama-3.3-70b-instruct';

// ─── System Prompt — AI ko actions format batao ───────────────────────────────
const SYSTEM_PROMPT = `You are an AI browser automation assistant.
When user gives a task/command, respond ONLY with a JSON array of browser actions.
When user asks a question (not a task), respond with plain text answer.

Available actions for tasks:
[
  {"type": "navigate", "url": "https://example.com"},
  {"type": "click", "selector": "text=Login"},
  {"type": "click", "selector": "#submit-btn"},
  {"type": "click", "selector": "aria=Search"},
  {"type": "type", "selector": "placeholder=Search", "text": "hello world"},
  {"type": "type", "selector": "input[name='q']", "text": "search term"},
  {"type": "press", "key": "Enter"},
  {"type": "scroll", "direction": "down"},
  {"type": "scroll", "direction": "up"},
  {"type": "wait", "ms": 1000},
  {"type": "done", "message": "Task completed successfully!"}
]

STRICT RULES:
1. For TASKS: respond ONLY with JSON array, zero extra text
2. For QUESTIONS: respond with plain text
3. Use "text=ButtonText" to click buttons/links by their text
4. Use "placeholder=..." for search boxes and input fields
5. Always end tasks with {"type":"done","message":"..."}
6. For YouTube search: navigate to youtube.com, then type in placeholder=Search, then press Enter
7. For Google search: navigate to google.com, type in name=q, then press Enter`;

// ─── API Key Helper ───────────────────────────────────────────────────────────

async function getApiKey(): Promise<string> {
  const result = await chrome.storage.local.get('nvidia_api_key');
  return result['nvidia_api_key'] || '';
}

// ─── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg: any, sender: chrome.runtime.MessageSender, sendResponse: (r: any) => void) => {
  if (msg.type === 'AI_COMMAND') {
    handleAICommand(msg.command, sender.tab?.id)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'OPEN_AI_SIDEBAR') {
    chrome.sidePanel.open({ tabId: sender.tab?.id! }).catch(() => {});
    sendResponse({ success: true });
    return true;
  }
  return false;
});

// ─── Main AI Command Handler ──────────────────────────────────────────────────

/**
 * User ka command receive karta hai:
 * 1. Page context content script se leta hai
 * 2. NVIDIA NIM se JSON actions mangta hai
 * 3. Actions browser pe execute karta hai
 * 4. Steps + result sidebar ko bhejta hai
 */
async function handleAICommand(
  command: string,
  tabId?: number
): Promise<{ message: string; steps?: string[] }> {

  // API key verify karo
  const apiKey = await getApiKey();
  if (!apiKey) {
    return {
      message: '⚙️ API key missing!\nSidebar mein ⚙️ settings click karo aur apna NVIDIA API key save karo.',
    };
  }

  // Tab ka live page context lo
  let pageContext = '';
  if (tabId) {
    try {
      const ctx: any = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTEXT' });
      if (ctx?.success) {
        pageContext = [
          `URL: ${ctx.url}`,
          `Title: ${ctx.title}`,
          `Inputs: ${JSON.stringify(ctx.inputs?.slice(0, 8))}`,
          `Buttons: ${JSON.stringify(ctx.buttons?.slice(0, 12))}`,
          `Page text: ${ctx.text?.substring(0, 1000)}`,
        ].join('\n');
      }
    } catch {
      // Content script nahi mila — basic tab info use karo
      try {
        const tab = await chrome.tabs.get(tabId);
        pageContext = `URL: ${tab.url || 'unknown'}\nTitle: ${tab.title || 'unknown'}`;
      } catch {}
    }
  }

  // NVIDIA NIM API call
  let aiText = '';
  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Current page:\n${pageContext || 'No page info'}\n\nUser command: "${command}"\n\nIf this is a task, respond with JSON actions array only. If a question, answer in plain text.`,
          },
        ],
        max_tokens: 1024,
        temperature: 0.1,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`API Error ${response.status}: ${errText.substring(0, 200)}`);
    }

    const data = await response.json() as any;
    aiText = data.choices?.[0]?.message?.content || '';

  } catch (e: any) {
    return { message: `❌ AI Error: ${e.message}` };
  }

  // Plain text jawab hai (question tha)
  if (!hasActions(aiText)) {
    return { message: aiText };
  }

  // Actions parse karo
  let actions;
  try {
    actions = parseActions(aiText);
  } catch {
    // Parse fail — plain text show karo
    return { message: aiText };
  }

  // Tab nahi hai — explain karo
  if (!tabId) {
    return { message: `🤖 AI ne ye karna chahiye:\n${aiText}` };
  }

  // Actions execute karo content script ke zariye
  const result = await runActions(tabId, actions);

  return {
    message: result.success
      ? `✅ Complete! (${result.actionsExecuted} actions)`
      : `❌ Failed: ${result.message}`,
    steps: result.steps,
  };
}
