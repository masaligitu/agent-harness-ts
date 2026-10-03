import { TraceEvent } from './TraceTypes.js';

export class TraceCollector {
  private events: TraceEvent[] = [];

  public emit(event: TraceEvent): void {
    // Redact sensitive keys in metadata
    if (event.metadata) {
      const sanitized = { ...event.metadata };
      for (const k of Object.keys(sanitized)) {
        if (/key|secret|token|password|auth/i.test(k)) {
          sanitized[k] = '[REDACTED]';
        }
      }
      event.metadata = sanitized;
    }
    this.events.push(event);
  }

  public getEvents(): readonly TraceEvent[] {
    return [...this.events];
  }

  public getEventsByStep(step: number): TraceEvent[] {
    return this.events.filter((e) => e.step === step);
  }

  public clear(): void {
    this.events = [];
  }

  public toJSON(): string {
    return JSON.stringify(this.events, null, 2);
  }
}
