/**
 * contentScript.ts — AutoCompute AI Browser Assistant
 * Ye script har webpage mein inject hoti hai.
 * Background service worker se messages receive karta hai
 * aur actual DOM actions execute karta hai (click, type, scroll, etc.)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface Action {
  type: 'click' | 'type' | 'press' | 'scroll' | 'navigate' | 'wait' | 'done';
  selector?: string;
  text?: string;
  key?: string;
  url?: string;
  direction?: 'up' | 'down';
  ms?: number;
  message?: string;
}

interface PageContext {
  url: string;
  title: string;
  text: string;
  inputs: InputInfo[];
  buttons: ButtonInfo[];
}

interface InputInfo {
  type: string;
  id: string;
  name: string;
  placeholder: string;
  value: string;
  visible: boolean;
}

interface ButtonInfo {
  text: string;
  id: string;
  href?: string;
  ariaLabel?: string;
}

// ─── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg: any, _sender, sendResponse) => {
  // Action execute karne ka message
  if (msg.type === 'EXECUTE_ACTION') {
    executeAction(msg.action as Action)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  // Page context lene ka message — AI ko page samjhane ke liye
  if (msg.type === 'GET_PAGE_CONTEXT') {
    try {
      const ctx = getPageContext();
      sendResponse({ success: true, ...ctx });
    } catch (err: any) {
      sendResponse({ success: false, error: err.message });
    }
    return false;
  }

  // Ping — content script loaded hai check karne ke liye
  if (msg.type === 'PING') {
    sendResponse({ success: true, alive: true });
    return false;
  }
});

// ─── Action Executor ──────────────────────────────────────────────────────────

/**
 * Ek single action execute karta hai page pe
 */
async function executeAction(action: Action): Promise<string> {
  switch (action.type) {

    case 'click': {
      const el = findElement(action.selector!);
      if (!el) throw new Error(`Element nahi mila: "${action.selector}"`);

      // Scroll into view karo pehle
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await wait(200);

      // Mouse events dispatch karo — realistic click
      const htmlEl = el as HTMLElement;
      htmlEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      htmlEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      htmlEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      htmlEl.click();

      return `Clicked: "${action.selector}"`;
    }

    case 'type': {
      const el = findElement(action.selector!) as HTMLInputElement | HTMLTextAreaElement;
      if (!el) throw new Error(`Input nahi mila: "${action.selector}"`);

      // Focus karo
      el.focus();
      await wait(100);

      // Clear karo pehle
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));

      // Har character alag type karo — realistic
      const text = action.text || '';
      for (const char of text) {
        el.value += char;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(30);
      }

      // Change event bhi fire karo
      el.dispatchEvent(new Event('change', { bubbles: true }));

      return `Typed "${action.text}" in "${action.selector}"`;
    }

    case 'press': {
      const key = action.key || 'Enter';
      const target = document.activeElement || document.body;

      // KeyboardEvent dispatch karo
      ['keydown', 'keypress', 'keyup'].forEach(evType => {
        target.dispatchEvent(new KeyboardEvent(evType, {
          key,
          code: key === 'Enter' ? 'Enter' : key,
          bubbles: true,
          cancelable: true,
        }));
      });

      // Enter pe form submit bhi try karo
      if (key === 'Enter') {
        const form = (target as HTMLElement).closest?.('form');
        if (form) {
          // Submit button dhundho aur click karo
          const submitBtn = form.querySelector<HTMLElement>('[type="submit"], button:not([type="button"])');
          if (submitBtn) submitBtn.click();
        }
      }

      return `Pressed: ${key}`;
    }

    case 'scroll': {
      const amount = action.direction === 'up' ? -600 : 600;
      window.scrollBy({ top: amount, behavior: 'smooth' });
      await wait(500);
      return `Scrolled ${action.direction || 'down'}`;
    }

    case 'navigate': {
      // Ye background handle karta hai — yahan sirf confirm karo
      window.location.href = action.url!;
      return `Navigating to ${action.url}`;
    }

    case 'wait': {
      const ms = action.ms || 1000;
      await wait(ms);
      return `Waited ${ms}ms`;
    }

    case 'done': {
      return action.message || 'Task complete!';
    }

    default:
      throw new Error(`Unknown action: ${(action as any).type}`);
  }
}

// ─── Element Finder ───────────────────────────────────────────────────────────

/**
 * Multiple strategies se element dhundta hai
 * Priority: CSS > text= > placeholder= > aria= > name= > fuzzy text
 */
function findElement(selector: string): Element | null {
  if (!selector) return null;

  // Strategy 1: Direct CSS selector
  try {
    const el = document.querySelector(selector);
    if (el && isVisible(el)) return el;
    if (el) return el; // visible na ho tab bhi try karo
  } catch {}

  // Strategy 2: text= — button/link text match
  if (selector.startsWith('text=')) {
    const text = selector.slice(5).toLowerCase().trim();
    const candidates = document.querySelectorAll(
      'button, a, input[type="submit"], input[type="button"], [role="button"], label, h1, h2, h3, span, div, li'
    );
    for (const el of candidates) {
      if (el.textContent?.trim().toLowerCase() === text) return el;
    }
    // Partial match
    for (const el of candidates) {
      if (el.textContent?.trim().toLowerCase().includes(text)) return el;
    }
  }

  // Strategy 3: placeholder= — input placeholder match
  if (selector.startsWith('placeholder=')) {
    const ph = selector.slice(12).toLowerCase();
    const inputs = document.querySelectorAll<HTMLInputElement>('input, textarea');
    for (const el of inputs) {
      if (el.placeholder?.toLowerCase().includes(ph)) return el;
    }
  }

  // Strategy 4: aria= — aria-label match
  if (selector.startsWith('aria=')) {
    const label = selector.slice(5).toLowerCase();
    const all = document.querySelectorAll('[aria-label]');
    for (const el of all) {
      if (el.getAttribute('aria-label')?.toLowerCase().includes(label)) return el;
    }
  }

  // Strategy 5: name= — input name attribute
  if (selector.startsWith('name=')) {
    const name = selector.slice(5);
    return document.querySelector(`[name="${name}"]`);
  }

  // Strategy 6: Fuzzy — koi bhi element jisme ye text ho
  const lowerSel = selector.toLowerCase();
  const allInteractive = document.querySelectorAll('button, a, input, [role="button"], select');
  for (const el of allInteractive) {
    const text = el.textContent?.trim().toLowerCase() || '';
    const placeholder = (el as HTMLInputElement).placeholder?.toLowerCase() || '';
    const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
    if (text.includes(lowerSel) || placeholder.includes(lowerSel) || ariaLabel.includes(lowerSel)) {
      return el;
    }
  }

  return null;
}

// ─── Page Context Collector ───────────────────────────────────────────────────

/**
 * Page ka live context collect karta hai — AI ko page samjhane ke liye
 */
function getPageContext(): PageContext {
  // Visible text (first 2500 chars)
  const text = document.body?.innerText?.substring(0, 2500) || '';

  // Visible inputs collect karo
  const inputs: InputInfo[] = Array.from(
    document.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]), textarea, select')
  )
    .filter(el => isVisible(el))
    .map(el => ({
      type: el.type || el.tagName.toLowerCase(),
      id: el.id || '',
      name: el.name || '',
      placeholder: el.placeholder || '',
      value: el.value?.substring(0, 50) || '',
      visible: true,
    }))
    .slice(0, 15);

  // Visible buttons/links collect karo
  const buttons: ButtonInfo[] = Array.from(
    document.querySelectorAll<HTMLElement>('button, [role="button"], a[href], input[type="submit"]')
  )
    .filter(el => isVisible(el))
    .map(el => ({
      text: el.textContent?.trim().substring(0, 60) || '',
      id: el.id || '',
      href: (el as HTMLAnchorElement).href || '',
      ariaLabel: el.getAttribute('aria-label') || '',
    }))
    .filter(b => b.text || b.ariaLabel)
    .slice(0, 20);

  return {
    url: window.location.href,
    title: document.title,
    text,
    inputs,
    buttons,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Element visible hai ya nahi check karo */
function isVisible(el: Element): boolean {
  const htmlEl = el as HTMLElement;
  return !!(
    htmlEl.offsetWidth ||
    htmlEl.offsetHeight ||
    htmlEl.getClientRects().length
  );
}

/** Promise-based wait */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
