import { z } from 'zod';

export const ToolCallDecisionSchema = z.object({
  type: z.literal('tool_call'),
  tool: z.string().min(1),
  arguments: z.record(z.unknown()),
});

export const FinalDecisionSchema = z.object({
  type: z.literal('final'),
  content: z.string(),
});

export const AgentDecisionSchema = z.discriminatedUnion('type', [
  ToolCallDecisionSchema,
  FinalDecisionSchema,
]);

export type ToolCallDecision = z.infer<typeof ToolCallDecisionSchema>;
export type FinalDecision = z.infer<typeof FinalDecisionSchema>;
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;
