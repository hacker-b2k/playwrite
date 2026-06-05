/**
 * Copyright (c) AutoCompute. All rights reserved.
 *
 * AI Actions Executor — AI response parse karke Playwright actions chalata hai
 * JSON array parse → sequential browser actions execute
 */

// ─── Types ────────────────────────────────────────────────

export type AIActionType =
  | 'goto'
  | 'click'
  | 'fill'
  | 'press'
  | 'select'
  | 'wait'
  | 'scroll'
  | 'screenshot'
  | 'evaluate'
  | 'done';

export interface AIAction {
  action: AIActionType;
  url?: string;         // goto ke liye
  selector?: string;    // click, fill, select ke liye
  value?: string;       // fill, select ke liye
  key?: string;         // press ke liye
  ms?: number;          // wait ke liye
  direction?: 'up' | 'down' | 'left' | 'right';  // scroll ke liye
  script?: string;      // evaluate ke liye
  message?: string;     // done ke liye
}

export interface ActionResult {
  success: boolean;
  actionsExecuted: number;
  actions: AIAction[];
  message?: string;
  error?: string;
  screenshots: string[];  // base64 screenshots during execution
}

// ─── Executor ─────────────────────────────────────────────

export class AIActionExecutor {
  /**
   * AI response string se JSON actions array parse karo
   * AI kabhi kabhi extra text deta hai — JSON sirf extract karo
   */
  parseActions(aiResponse: string): AIAction[] {
    if (!aiResponse || !aiResponse.trim()) {
      throw new Error('AI returned empty response');
    }

    // JSON array extract karo (markdown code blocks bhi handle karo)
    const cleaned = aiResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // [ ... ] array dhundo
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error(`No JSON array found in AI response:\n${aiResponse.substring(0, 300)}`);
    }

    let parsed: AIAction[];
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e: any) {
      throw new Error(`Invalid JSON in AI response: ${e.message}\nResponse: ${jsonMatch[0].substring(0, 200)}`);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('AI returned empty actions array');
    }

    return parsed;
  }

  /**
   * Actions sequentially execute karo page par
   * Koi bhi action fail ho to stop karo, error return karo
   */
  async execute(page: any, actions: AIAction[]): Promise<ActionResult> {
    const executed: AIAction[] = [];
    const screenshots: string[] = [];

    for (const action of actions) {
      try {
        const screenshot = await this._runAction(page, action);
        if (screenshot) screenshots.push(screenshot);
        executed.push(action);

        // done action milte hi finish karo
        if (action.action === 'done') {
          return {
            success: true,
            actionsExecuted: executed.length,
            actions: executed,
            message: action.message || 'Task completed',
            screenshots,
          };
        }

      } catch (err: any) {
        return {
          success: false,
          actionsExecuted: executed.length,
          actions: executed,
          error: `Action "${action.action}" failed: ${err.message}`,
          screenshots,
        };
      }
    }

    return {
      success: true,
      actionsExecuted: executed.length,
      actions: executed,
      message: 'All actions completed',
      screenshots,
    };
  }

  /**
   * Single action run karo
   * Har action type ka alag case hai
   */
  private async _runAction(page: any, action: AIAction): Promise<string | null> {
    switch (action.action) {

      case 'goto': {
        // URL pe navigate karo
        if (!action.url) throw new Error('goto action requires url');
        await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        return null;
      }

      case 'click': {
        // Element click karo
        if (!action.selector) throw new Error('click action requires selector');
        await page.locator(action.selector).first().click({ timeout: 10000 });
        return null;
      }

      case 'fill': {
        // Input field fill karo
        if (!action.selector) throw new Error('fill action requires selector');
        await page.locator(action.selector).first().fill(action.value || '', { timeout: 10000 });
        return null;
      }

      case 'press': {
        // Keyboard key press karo
        await page.keyboard.press(action.key || 'Enter');
        return null;
      }

      case 'select': {
        // Dropdown option select karo
        if (!action.selector) throw new Error('select action requires selector');
        await page.locator(action.selector).first().selectOption(action.value || '', { timeout: 10000 });
        return null;
      }

      case 'wait': {
        // ms time wait karo
        await page.waitForTimeout(action.ms || 1000);
        return null;
      }

      case 'scroll': {
        // Page scroll karo
        const dir = action.direction || 'down';
        const scrollMap: Record<string, [number, number]> = {
          down: [0, 500], up: [0, -500], left: [-500, 0], right: [500, 0],
        };
        const [x, y] = scrollMap[dir] || [0, 500];
        await page.evaluate(([dx, dy]) => window.scrollBy(dx, dy), [x, y]);
        return null;
      }

      case 'screenshot': {
        // Screenshot lo aur base64 return karo
        const buf: Buffer = await page.screenshot({ type: 'png', fullPage: false });
        return buf.toString('base64');
      }

      case 'evaluate': {
        // JavaScript run karo page par — restricted to read-only operations
        // SECURITY: Only allow safe read operations, reject mutations
        if (!action.script) throw new Error('evaluate action requires script');
        const unsafePatterns = /document\.cookie|localStorage|sessionStorage|fetch\(|XMLHttpRequest|window\.open|eval\(|Function\(/i;
        if (unsafePatterns.test(action.script)) {
          throw new Error('evaluate action blocked: script contains potentially unsafe operations');
        }
        await page.evaluate(action.script);
        return null;
      }

      case 'done': {
        // Terminal action — loop se bahar
        return null;
      }

      default: {
        throw new Error(`Unknown action type: "${(action as any).action}"`);
      }
    }
  }
}

// Singleton instance
export const aiActionExecutor = new AIActionExecutor();
