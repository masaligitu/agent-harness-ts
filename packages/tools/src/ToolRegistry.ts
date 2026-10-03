import { AnyToolContract, ToolDefinition } from './ToolTypes.js';
import { HarnessError } from '../../core/src/errors/HarnessError.js';
import { ErrorCodes } from '../../core/src/errors/ErrorCodes.js';

export class ToolRegistry {
  private tools = new Map<string, AnyToolContract>();

  public register(tool: AnyToolContract): void {
    if (this.tools.has(tool.name)) {
      throw new HarnessError({
        code: ErrorCodes.TOOL_EXECUTION_FAILED,
        message: `Tool "${tool.name}" is already registered. Duplicate registration rejected.`,
        metadata: { tool: tool.name },
      });
    }
    this.tools.set(tool.name, tool);
  }

  public get(name: string): AnyToolContract {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new HarnessError({
        code: ErrorCodes.UNKNOWN_TOOL,
        message: `Tool "${name}" is not registered in ToolRegistry.`,
        metadata: { requestedTool: name },
      });
    }
    return tool;
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }

  public list(): AnyToolContract[] {
    return Array.from(this.tools.values());
  }

  public definitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: (t.inputSchema as any)._def ?? {},
    }));
  }

  public clear(): void {
    this.tools.clear();
  }
}
