import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from '../../packages/tools/src/ToolRegistry.js';
import { DEFAULT_RETRY_POLICY } from '../../packages/core/src/runtime/RetryPolicy.js';
import { HarnessError } from '../../packages/core/src/errors/HarnessError.js';
import { ErrorCodes } from '../../packages/core/src/errors/ErrorCodes.js';

describe('ToolRegistry', () => {
  it('registers a tool and retrieves definitions', () => {
    const registry = new ToolRegistry();
    registry.register({
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: z.object({ x: z.number() }),
      outputSchema: z.object({ y: z.number() }),
      timeoutMs: 1000,
      retryPolicy: DEFAULT_RETRY_POLICY,
      execute: async (inp) => ({ y: inp.x * 2 }),
    });

    expect(registry.has('test_tool')).toBe(true);
    expect(registry.get('test_tool').name).toBe('test_tool');

    const defs = registry.definitions();
    expect(defs.length).toBe(1);
    expect(defs[0].name).toBe('test_tool');
  });

  it('rejects duplicate tool registration', () => {
    const registry = new ToolRegistry();
    const tool = {
      name: 'dup_tool',
      description: 'Duplicate',
      inputSchema: z.object({}),
      outputSchema: z.object({}),
      timeoutMs: 500,
      retryPolicy: DEFAULT_RETRY_POLICY,
      execute: async () => ({}),
    };

    registry.register(tool);
    expect(() => registry.register(tool)).toThrowError(HarnessError);
  });

  it('throws UNKNOWN_TOOL when requesting un-registered tool', () => {
    const registry = new ToolRegistry();
    try {
      registry.get('non_existent');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HarnessError);
      expect(err.code).toBe(ErrorCodes.UNKNOWN_TOOL);
    }
  });
});
