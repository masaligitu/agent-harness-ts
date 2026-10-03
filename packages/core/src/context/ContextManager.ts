import { TokenEstimator } from './TokenEstimator.js';
import { HarnessError } from '../errors/HarnessError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';

export enum PriorityClass {
  CRITICAL = 'CRITICAL',
  IMPORTANT = 'IMPORTANT',
  NORMAL = 'NORMAL',
  DISCARDABLE = 'DISCARDABLE',
}

export interface HarnessMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  priority: PriorityClass;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface ContextBudget {
  maxTokens: number;
  reservedForOutput: number;
}

export interface ContextResult {
  messages: HarnessMessage[];
  estimatedTokens: number;
  droppedMessageIds: string[];
}

export class ContextManager {
  public build(messages: HarnessMessage[], budget: ContextBudget): ContextResult {
    const availableTokens = budget.maxTokens - budget.reservedForOutput;
    if (availableTokens <= 0) {
      throw new HarnessError({
        code: ErrorCodes.CONTEXT_BUDGET_EXCEEDED,
        message: `Context budget maxTokens (${budget.maxTokens}) must be greater than reservedForOutput (${budget.reservedForOutput}).`,
      });
    }

    // 1. Separate by priority
    const critical = messages.filter((m) => m.priority === PriorityClass.CRITICAL);
    const criticalTokens = critical.reduce((acc, m) => acc + TokenEstimator.estimateMessage(m), 0);

    // CRITICAL MUST NEVER BE DISCARDED
    if (criticalTokens > availableTokens) {
      throw new HarnessError({
        code: ErrorCodes.CONTEXT_BUDGET_EXCEEDED,
        message: `Critical context (${criticalTokens} tokens) exceeds available budget (${availableTokens} tokens). Cannot silently truncate critical safety/system prompt.`,
        metadata: { criticalTokens, availableTokens },
      });
    }

    let currentTokens = criticalTokens;
    const preservedIds = new Set<string>(critical.map((m) => m.id));
    const nonCritical = messages.filter((m) => m.priority !== PriorityClass.CRITICAL);

    // Sort candidates for inclusion:
    // Important first, then Normal, then Discardable.
    // Within same priority, newest first.
    const priorityWeight: Record<PriorityClass, number> = {
      [PriorityClass.CRITICAL]: 4,
      [PriorityClass.IMPORTANT]: 3,
      [PriorityClass.NORMAL]: 2,
      [PriorityClass.DISCARDABLE]: 1,
    };

    const sortedCandidates = [...nonCritical].sort((a, b) => {
      const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (weightDiff !== 0) return weightDiff;
      return b.createdAt - a.createdAt; // newest first
    });

    for (const candidate of sortedCandidates) {
      const cost = TokenEstimator.estimateMessage(candidate);
      if (currentTokens + cost <= availableTokens) {
        preservedIds.add(candidate.id);
        currentTokens += cost;
      }
    }

    // Reconstruct messages in original chronological order
    const finalMessages = messages.filter((m) => preservedIds.has(m.id));
    const droppedMessageIds = messages
      .filter((m) => !preservedIds.has(m.id))
      .map((m) => m.id);

    return {
      messages: finalMessages,
      estimatedTokens: currentTokens,
      droppedMessageIds,
    };
  }
}
