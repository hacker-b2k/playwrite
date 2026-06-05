/**
 * Copyright (c) AutoCompute. All rights reserved.
 *
 * AI Context Builder — page state collect karke AI prompt banata hai
 * Page ki URL, title, aria snapshot aur optional screenshot AI ko bhejta hai
 */

// ─── Types ────────────────────────────────────────────────

export interface PageContext {
  url: string;
  title: string;
  ariaSnapshot: string;
  screenshot?: string;  // base64 PNG — vision model ke liye
}

export interface PromptPair {
  system: string;
  user: string;
}

// ─── Context Builder ──────────────────────────────────────

export class AIContextBuilder {
  /**
   * Page se live context collect karo
   * ariaSnapshot: page elements ka text representation
   * screenshot: optional — vision analysis ke liye
   */
  async buildContext(page: any, includeScreenshot: boolean = false): Promise<PageContext> {
    const url: string = page.url();

    // Page title
    let title = '';
    try {
      title = await page.title();
    } catch {
      title = 'Unknown';
    }

    // Aria snapshot — page elements text mein (selectors ke saath)
    let ariaSnapshot = '';
    try {
      ariaSnapshot = await page.locator('body').ariaSnapshot();
    } catch {
      // Fallback: page content text
      try {
        ariaSnapshot = await page.evaluate(() => document.body.innerText?.substring(0, 3000) || '');
      } catch {
        ariaSnapshot = 'Could not get page content';
      }
    }

    // Optional screenshot — base64 encode
    let screenshot: string | undefined;
    if (includeScreenshot) {
      try {
        const buffer: Buffer = await page.screenshot({ type: 'png', fullPage: false });
        screenshot = buffer.toString('base64');
      } catch {
        screenshot = undefined;
      }
    }

    return { url, title, ariaSnapshot, screenshot };
  }

  /**
   * System prompt — AI ko browser automation rules batao
   * Actions JSON format mein return karna zaroori hai
   */
  buildSystemPrompt(): string {
    return `You are an AI browser automation assistant powered by Playwright.
You control a Chromium browser. When given a user command, respond ONLY with a valid JSON array of actions.

Available actions:
{ "action": "goto", "url": "https://..." }
{ "action": "click", "selector": "text=Login" }
{ "action": "fill", "selector": "#email", "value": "example@test.com" }
{ "action": "press", "key": "Enter" }
{ "action": "select", "selector": "#dropdown", "value": "option1" }
{ "action": "wait", "ms": 1000 }
{ "action": "scroll", "direction": "down" }
{ "action": "screenshot" }
{ "action": "evaluate", "script": "document.title" }
{ "action": "done", "message": "Task completed successfully" }

RULES:
1. Respond with ONLY a valid JSON array — no extra text, no markdown
2. Use text= selectors when possible (e.g. text=Submit)
3. Use #id or [aria-label=...] when text selector is ambiguous
4. If unsure about page state, use screenshot action first
5. Always end with done action
6. Keep actions minimal — avoid unnecessary waits`;
  }

  /**
   * User prompt — context + command combine karo
   * ariaSnapshot 3000 char tak trim karo (token limit)
   */
  buildUserPrompt(command: string, context: PageContext): string {
    const snapshot = context.ariaSnapshot.substring(0, 3000);
    return `Current browser state:
URL: ${context.url}
Title: ${context.title}

Page elements:
${snapshot}

Task: "${command}"

Respond with JSON actions array only.`;
  }

  /**
   * Ask prompt — question answer ke liye
   * AI page content analyze karke jawab deta hai
   */
  buildAskPrompt(question: string, context: PageContext): string {
    const snapshot = context.ariaSnapshot.substring(0, 3000);
    return `You are analyzing a web page. Answer the user's question based on the page content.

URL: ${context.url}
Title: ${context.title}

Page content:
${snapshot}

Question: "${question}"

Provide a clear, concise answer based only on the page content above.`;
  }

  /**
   * Extract prompt — structured data extraction ke liye
   */
  buildExtractPrompt(schema: Record<string, string>, context: PageContext, customPrompt?: string): string {
    // Snapshot ko 2000 chars tak limit karo — faster response ke liye
    const snapshot = context.ariaSnapshot.substring(0, 2000);
    const schemaStr = JSON.stringify(schema);
    return `Extract data from this page as JSON. Return ONLY the JSON object, no extra text.

Page: ${context.title} (${context.url})
Schema: ${schemaStr}
${customPrompt ? `Note: ${customPrompt}` : ''}

Page content:
${snapshot}

JSON:`;
  }
}

// Singleton instance
export const aiContextBuilder = new AIContextBuilder();
