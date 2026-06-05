/**
 * Copyright (c) AutoCompute. All rights reserved.
 *
 * AI Engine — NVIDIA NIM HTTP client
 * Handles: text completion, vision analysis, retry logic
 */

import { getAIConfig } from './aiConfig';

// ─── Types ────────────────────────────────────────────────

export interface AITextContent {
  type: 'text';
  text: string;
}

export interface AIImageContent {
  type: 'image_url';
  image_url: { url: string };
}

export type AIMessageContent = AITextContent | AIImageContent;

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | AIMessageContent[];
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// ─── Engine ───────────────────────────────────────────────

export class AIEngine {
  /**
   * Text model call — browser automation commands ke liye
   * Provider: NVIDIA NIM (OpenAI-compatible API)
   */
  async chat(messages: AIMessage[], options?: AIChatOptions): Promise<AIResponse> {
    const config = getAIConfig();
    const model = options?.model || config.textModel;
    const maxTokens = options?.maxTokens || config.maxTokens;
    const temperature = options?.temperature ?? config.temperature;

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
      signal: AbortSignal.timeout(config.timeout),
    });

    // Error handling — non-200 response
    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch {}
      throw new Error(`AI API Error ${response.status}: ${errText}`);
    }

    const data = await response.json() as any;

    if (!data?.choices?.[0]?.message?.content) {
      throw new Error(`AI API returned unexpected response: ${JSON.stringify(data)}`);
    }

    return {
      content: data.choices[0].message.content,
      model: data.model || model,
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  /**
   * Vision model call — screenshot analysis ke liye
   * Model: meta/llama-3.2-11b-vision-instruct
   */
  async vision(prompt: string, imageBase64: string, mimeType: string = 'image/png'): Promise<string> {
    const config = getAIConfig();

    // Data URL format mein convert karo
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    const messages: AIMessage[] = [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: prompt },
      ],
    }];

    const result = await this.chat(messages, {
      model: config.visionModel,
      maxTokens: 2048,
    });

    return result.content;
  }

  /**
   * Retry wrapper — exponential backoff ke saath
   * Network errors aur rate limits handle karta hai
   */
  async chatWithRetry(messages: AIMessage[], options?: AIChatOptions): Promise<AIResponse> {
    const config = getAIConfig();
    const maxRetries = config.maxRetries;
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.chat(messages, options);
      } catch (err: any) {
        lastError = err;
        // Rate limit ya server error pe retry karo
        const isRetryable = err.message?.includes('429') || err.message?.includes('500') || err.message?.includes('503');
        if (!isRetryable || attempt === maxRetries - 1) throw err;
        // Exponential backoff: 1s, 2s, 4s...
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
  }

  /**
   * Simple ping — API key verify karne ke liye
   */
  async ping(): Promise<boolean> {
    try {
      const r = await this.chat([{ role: 'user', content: 'hi' }], { maxTokens: 5 });
      return r.content.length > 0;
    } catch {
      return false;
    }
  }
}

// Singleton — poore app mein ek hi instance
export const aiEngine = new AIEngine();
