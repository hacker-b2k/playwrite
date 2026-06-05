/**
 * Copyright (c) AutoCompute. All rights reserved.
 *
 * AI Configuration — NVIDIA NIM API settings
 * Supports: meta/llama-3.3-70b-instruct, meta/llama-3.2-11b-vision-instruct
 */

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  textModel: string;        // General automation + reasoning
  visionModel: string;      // Screenshot analysis
  codeModel: string;        // Code generation
  maxTokens: number;
  temperature: number;
  timeout: number;
  maxRetries: number;
}

// Default NVIDIA NIM config
export const defaultAIConfig: AIConfig = {
  apiKey: process.env['NVIDIA_API_KEY'] || '',
  baseUrl: process.env['AI_BASE_URL'] || 'https://integrate.api.nvidia.com/v1',
  textModel: process.env['AI_TEXT_MODEL'] || 'meta/llama-3.3-70b-instruct',
  visionModel: process.env['AI_VISION_MODEL'] || 'meta/llama-3.2-11b-vision-instruct',
  codeModel: process.env['AI_CODE_MODEL'] || 'deepseek-ai/deepseek-v4-flash',
  maxTokens: Number(process.env['AI_MAX_TOKENS']) || 4096,
  temperature: Number(process.env['AI_TEMPERATURE']) || 0.2,
  timeout: Number(process.env['AI_TIMEOUT']) || 60000,
  maxRetries: 3,
};

// Runtime config — override karne ke liye
let _config: AIConfig = { ...defaultAIConfig };

/**
 * AI config override karo (test ya custom setup ke liye)
 */
export function setAIConfig(config: Partial<AIConfig>): void {
  _config = { ...defaultAIConfig, ...config };
}

/**
 * Current active config return karo
 */
export function getAIConfig(): AIConfig {
  return _config;
}

/**
 * Config reset karo defaults par
 */
export function resetAIConfig(): void {
  _config = { ...defaultAIConfig };
}
