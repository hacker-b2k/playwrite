/**
 * aiActionRunner.ts — AutoCompute AI Action Bridge
 * AI ke JSON response ko parse karta hai
 * aur content script ke zariye browser pe execute karta hai
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Action {
  type: 'click' | 'type' | 'press' | 'scroll' | 'navigate' | 'wait' | 'done';
  selector?: string;
  text?: string;
  key?: string;
  url?: string;
  direction?: 'up' | 'down';
  ms?: number;
  message?: string;
}

export interface RunResult {
  success: boolean;
  actionsExecuted: number;
  message: string;
  steps: string[];
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * AI response string se JSON actions array extract karta hai
 * AI kabhi kabhi extra text deta hai JSON ke saath — ye handle karta hai
 */
export function parseActions(aiResponse: string): Action[] {
  // JSON array dhundho — greedy match
  const match = aiResponse.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI ne valid JSON actions return nahi kiye');

  let parsed: any;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error('AI ka JSON parse nahi hua: ' + match[0].substring(0, 100));
  }

  if (!Array.isArray(parsed)) throw new Error('Actions array hona chahiye');
  if (parsed.length === 0) throw new Error('Actions array empty hai');

  return parsed as Action[];
}

/**
 * Check karo ke AI response mein actions hain ya sirf plain text
 */
export function hasActions(aiResponse: string): boolean {
  return aiResponse.includes('[') && aiResponse.includes('{') && aiResponse.includes('"type"');
}

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Actions sequentially execute karo ek tab pe
 * Har action ke baad status update karta hai
 */
export async function runActions(
  tabId: number,
  actions: Action[],
  onStep?: (step: string) => void
): Promise<RunResult> {
  const steps: string[] = [];
  let executed = 0;

  for (const action of actions) {
    // Done action — task complete
    if (action.type === 'done') {
      const msg = `✅ ${action.message || 'Task complete!'}`;
      steps.push(msg);
      onStep?.(msg);
      break;
    }

    // Wait action — sirf delay
    if (action.type === 'wait') {
      const ms = action.ms || 1000;
      await sleep(ms);
      const msg = `⏳ Waited ${ms}ms`;
      steps.push(msg);
      onStep?.(msg);
      executed++;
      continue;
    }

    // Navigate action — chrome.tabs.update se karo (content script nahi)
    if (action.type === 'navigate') {
      try {
        const stepMsg = `🌐 Navigating to ${action.url}...`;
        steps.push(stepMsg);
        onStep?.(stepMsg);

        await chrome.tabs.update(tabId, { url: action.url });
        await waitForTabLoad(tabId);
        await sleep(1500); // YouTube DOM settle hone do

        const doneMsg = `✅ Opened: ${action.url}`;
        steps.push(doneMsg);
        onStep?.(doneMsg);
        executed++;
      } catch (e: any) {
        const errMsg = `❌ Navigate failed: ${e.message}`;
        steps.push(errMsg);
        onStep?.(errMsg);
        return { success: false, actionsExecuted: executed, message: e.message, steps };
      }
      continue;
    }

    // Baaki actions content script ko bhejo
    try {
      const pendingMsg = `⏳ ${describeAction(action)}...`;
      onStep?.(pendingMsg);

      // Content script ko action bhejo
      const result = await sendToContentScript(tabId, {
        type: 'EXECUTE_ACTION',
        action,
      });

      if (!result?.success) {
        throw new Error(result?.error || 'Action failed');
      }

      const doneMsg = `✅ ${result.result}`;
      steps.push(doneMsg);
      onStep?.(doneMsg);
      executed++;

      // Har action ke baad thoda wait — page settle hone do
      await sleep(400);

    } catch (e: any) {
      const errMsg = `❌ Failed: ${e.message}`;
      steps.push(errMsg);
      onStep?.(errMsg);
      return {
        success: false,
        actionsExecuted: executed,
        message: e.message,
        steps,
      };
    }
  }

  return {
    success: true,
    actionsExecuted: executed,
    message: steps.at(-1) || 'Done',
    steps,
  };
}

// ─── Content Script Communication ────────────────────────────────────────────

/**
 * Content script ko message bhejo
 * Agar content script load nahi hua to inject karo pehle
 */
async function sendToContentScript(tabId: number, message: any): Promise<any> {
  // Pehle check karo content script alive hai
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch {
    // Content script nahi mila — manually inject karo
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['lib/contentScript.js'],
      });
      await sleep(300); // inject hone do
    } catch (injectErr: any) {
      throw new Error(`Content script inject nahi hua: ${injectErr.message}`);
    }
  }

  // Ab message bhejo
  return await chrome.tabs.sendMessage(tabId, message);
}

// ─── Tab Load Waiter ──────────────────────────────────────────────────────────

/**
 * Tab ke fully load hone ka wait karo
 */
function waitForTabLoad(tabId: number, maxWaitMs = 10000): Promise<void> {
  return new Promise(resolve => {
    const timeout = setTimeout(resolve, maxWaitMs);

    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timeout);
        setTimeout(resolve, 600); // extra wait — DOM hydrate hone do
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Action ka human readable description */
function describeAction(action: Action): string {
  switch (action.type) {
    case 'click': return `Clicking "${action.selector}"`;
    case 'type': return `Typing "${action.text}" in "${action.selector}"`;
    case 'press': return `Pressing ${action.key}`;
    case 'scroll': return `Scrolling ${action.direction || 'down'}`;
    default: return action.type;
  }
}

/** Promise-based sleep */
function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
