import type {
  PerfDiagnosticsSnapshot,
  PerfInputEvent,
  PerfLongTask,
  PerfSlowSpan,
  PerfTtsUtterance,
  PerfTtsVoice,
} from './perfDiagnosticsTypes';
import { buildPerfDiagnosticsSnapshot } from './perfDiagnosticsSnapshot';
import { MAX_RECENT_ITEMS, trimArray } from './perfDiagnosticsUtils';

export type PerfTtsPlay = {
  id: number;
  clickedAt: number;
  source: string;
};

export class PerfDiagnosticsState {
  private nextInputId = 1;
  private nextTtsPlayId = 1;
  private nextTtsUtteranceId = 1;
  private inputEvents: PerfInputEvent[] = [];
  private inputEventsById = new Map<number, PerfInputEvent>();
  private longTasks: PerfLongTask[] = [];
  private slowSpans: PerfSlowSpan[] = [];
  private ttsPlays = new Map<number, PerfTtsPlay>();
  private ttsUtterances: PerfTtsUtterance[] = [];
  private ttsUtterancesById = new Map<number, PerfTtsUtterance>();
  private ttsVoices: PerfTtsVoice[] = [];
  private renderCounts: Record<string, number> = {};

  reset(): void {
    this.nextInputId = 1;
    this.nextTtsPlayId = 1;
    this.nextTtsUtteranceId = 1;
    this.inputEvents = [];
    this.inputEventsById.clear();
    this.longTasks = [];
    this.slowSpans = [];
    this.ttsPlays.clear();
    this.ttsUtterances = [];
    this.ttsUtterancesById.clear();
    this.ttsVoices = [];
    this.renderCounts = {};
  }

  recordRender(component: string, count: number): void {
    this.renderCounts[component] = count;
  }

  nextInputEventId(): number {
    const id = this.nextInputId;
    this.nextInputId += 1;
    return id;
  }

  addInputEvent(event: PerfInputEvent): void {
    this.inputEventsById.set(event.id, event);
    this.inputEvents.push(event);
    trimArray(this.inputEvents, MAX_RECENT_ITEMS);
  }

  getInputEvent(id: number): PerfInputEvent | undefined {
    return this.inputEventsById.get(id);
  }

  nextTtsPlayIdentifier(): number {
    const id = this.nextTtsPlayId;
    this.nextTtsPlayId += 1;
    return id;
  }

  setTtsPlay(play: PerfTtsPlay): void {
    this.ttsPlays.set(play.id, play);
  }

  getTtsPlay(id: number): PerfTtsPlay | undefined {
    return this.ttsPlays.get(id);
  }

  nextTtsUtteranceIdentifier(): number {
    const id = this.nextTtsUtteranceId;
    this.nextTtsUtteranceId += 1;
    return id;
  }

  addTtsUtterance(utterance: PerfTtsUtterance): void {
    this.ttsUtterancesById.set(utterance.id, utterance);
    this.ttsUtterances.push(utterance);
    trimArray(this.ttsUtterances, MAX_RECENT_ITEMS);
  }

  getTtsUtterance(id: number): PerfTtsUtterance | undefined {
    return this.ttsUtterancesById.get(id);
  }

  setTtsVoices(voices: PerfTtsVoice[]): void {
    this.ttsVoices = voices;
  }

  addLongTask(task: PerfLongTask): void {
    this.longTasks.push(task);
    trimArray(this.longTasks, MAX_RECENT_ITEMS);
  }

  addSlowSpan(span: PerfSlowSpan): void {
    this.slowSpans.push(span);
    trimArray(this.slowSpans, MAX_RECENT_ITEMS);
  }

  snapshot(enabled: boolean): PerfDiagnosticsSnapshot {
    return buildPerfDiagnosticsSnapshot({
      enabled,
      inputEvents: this.inputEvents,
      longTasks: this.longTasks,
      slowSpans: this.slowSpans,
      ttsUtterances: this.ttsUtterances,
      ttsVoices: this.ttsVoices,
      renderCounts: this.renderCounts,
    });
  }
}
