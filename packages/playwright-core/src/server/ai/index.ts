/**
 * Copyright (c) AutoCompute. All rights reserved.
 *
 * AI Module — Public exports
 * Single entry point for all AI functionality
 */

export { AIEngine, aiEngine } from './aiEngine';
export { AIContextBuilder, aiContextBuilder } from './aiContext';
export { AIActionExecutor, aiActionExecutor } from './aiActions';
export { getAIConfig, setAIConfig, resetAIConfig, defaultAIConfig } from './aiConfig';

export type { AIConfig } from './aiConfig';
export type { AIMessage, AIMessageContent, AIResponse, AIChatOptions } from './aiEngine';
export type { PageContext, PromptPair } from './aiContext';
export type { AIAction, AIActionType, ActionResult } from './aiActions';
