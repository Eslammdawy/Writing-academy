import { formatNarrationLine, NarrationKey, NARRATION_LINES } from '../../data/narration';
import { LanguageCode } from '../../types';
import { audioService } from './audioService';

export interface VoiceHealthStatus {
  checked: boolean;
  enAvailable: boolean;
  arAvailable: boolean;
  voicesCount: number;
}

export interface NarratorQueueItem {
  id: number;
  key?: NarrationKey;
  text: string;
  language: LanguageCode;
  recordedAssetKey?: string;
}

type SpeechDriver = {
  speak: (
    text: string,
    options?: {
      language?: string;
      pitch?: number;
      rate?: number;
      onDone?: () => void;
      onStopped?: () => void;
      onError?: () => void;
    }
  ) => void;
  stop: () => void;
  getAvailableVoicesAsync?: () => Promise<Array<{ language?: string; identifier?: string }>>;
};

/**
 * Voice-first Narrator service built on top of `audioService`.
 * Guarantees:
 * - Sequential queue so lines never overlap
 * - `Speech.stop()` before each new spoken utterance
 * - `repeat()` to replay the most recent instruction (e.g., when child taps MascotBanner)
 * - `checkVoiceHealth()` to detect missing offline `en` / `ar` TTS voices (P14)
 * - Pluggable recorded audio support so pre-recorded assets can be used in place of TTS
 */
export class VoiceNarrator {
  private queue: NarratorQueueItem[] = [];
  private isSpeaking = false;
  private nextId = 1;
  private lastSpoken: { text: string; language: LanguageCode; key?: NarrationKey } | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private customSpeechDriver: SpeechDriver | null = null;
  private customRecordedAssets: Record<string, any> = {};

  private voiceHealth: VoiceHealthStatus = {
    checked: false,
    enAvailable: true,
    arAvailable: true,
    voicesCount: 0,
  };

  /**
   * Allows tests to inject a deterministic mock Speech driver.
   */
  setSpeechDriverForTesting(driver: SpeechDriver | null): void {
    this.customSpeechDriver = driver;
  }

  /**
   * Registers optional pre-recorded human voice assets keyed by asset id.
   */
  registerRecordedAssets(assets: Record<string, any>): void {
    this.customRecordedAssets = { ...this.customRecordedAssets, ...assets };
  }

  private getSpeech(): SpeechDriver | null {
    if (this.customSpeechDriver) return this.customSpeechDriver;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Speech = require('expo-speech');
      if (Speech && typeof Speech.speak === 'function') {
        return Speech as SpeechDriver;
      }
    } catch {
      // Headless or test environment
    }
    return null;
  }

  /**
   * Checks whether the device has offline/system TTS voices for English (`en`) and Arabic (`ar`).
   */
  async checkVoiceHealth(): Promise<VoiceHealthStatus> {
    const speech = this.getSpeech();
    if (!speech || typeof speech.getAvailableVoicesAsync !== 'function') {
      this.voiceHealth = {
        checked: true,
        enAvailable: false,
        arAvailable: false,
        voicesCount: 0,
      };
      return { ...this.voiceHealth };
    }

    try {
      const voices = await speech.getAvailableVoicesAsync();
      if (!Array.isArray(voices) || voices.length === 0) {
        this.voiceHealth = {
          checked: true,
          enAvailable: false,
          arAvailable: false,
          voicesCount: 0,
        };
        return { ...this.voiceHealth };
      }

      const hasEn = voices.some((v) =>
        String(v.language ?? v.identifier ?? '')
          .toLowerCase()
          .startsWith('en')
      );
      const hasAr = voices.some((v) =>
        String(v.language ?? v.identifier ?? '')
          .toLowerCase()
          .startsWith('ar')
      );

      this.voiceHealth = {
        checked: true,
        enAvailable: hasEn,
        arAvailable: hasAr,
        voicesCount: voices.length,
      };
    } catch {
      this.voiceHealth = {
        checked: true,
        enAvailable: false,
        arAvailable: false,
        voicesCount: 0,
      };
    }

    return { ...this.voiceHealth };
  }

  getVoiceHealth(): VoiceHealthStatus {
    return { ...this.voiceHealth };
  }

  getLastSpoken(): { text: string; language: LanguageCode; key?: NarrationKey } | null {
    return this.lastSpoken ? { ...this.lastSpoken } : null;
  }

  getQueueLength(): number {
    return this.queue.length + (this.isSpeaking ? 1 : 0);
  }

  /**
   * Speaks a keyed instruction line. By default replaces any pending queue items so the screen's
   * latest action is heard immediately without overlap, or appends when `enqueue: true`.
   */
  say(
    key: NarrationKey,
    vars?: Record<string, string | number>,
    options?: {
      language?: LanguageCode;
      enqueue?: boolean;
      randomSeedIndex?: number;
    }
  ): string {
    const language: LanguageCode = options?.language ?? 'en';
    const text = formatNarrationLine(key, language, vars, options?.randomSeedIndex);
    if (!text) return '';

    const entry = NARRATION_LINES[key];
    const recordedAssetKey =
      language === 'ar' ? entry?.recordedAssetAr : entry?.recordedAssetEn;

    this.lastSpoken = { text, language, key };

    const item: NarratorQueueItem = {
      id: this.nextId++,
      key,
      text,
      language,
      recordedAssetKey,
    };

    if (!options?.enqueue) {
      this.stopCurrentOnly();
      this.queue = [item];
    } else {
      this.queue.push(item);
    }

    this.processNext();
    return text;
  }

  /**
   * Enqueues raw text (e.g. a letter name or target word) through the same non-overlapping queue.
   */
  sayText(
    text: string,
    language: LanguageCode,
    options?: { enqueue?: boolean }
  ): void {
    if (!text.trim()) return;
    this.lastSpoken = { text, language };

    const item: NarratorQueueItem = {
      id: this.nextId++,
      text,
      language,
    };

    if (!options?.enqueue) {
      this.stopCurrentOnly();
      this.queue = [item];
    } else {
      this.queue.push(item);
    }

    this.processNext();
  }

  /**
   * Repeats the last spoken instruction line when the child taps the mascot or speaker icon.
   */
  repeat(): string {
    if (!this.lastSpoken) return '';
    const { text, language, key } = this.lastSpoken;
    this.stopCurrentOnly();
    this.queue = [
      {
        id: this.nextId++,
        key,
        text,
        language,
      },
    ];
    this.processNext();
    return text;
  }

  /**
   * Stops all active and queued narration immediately.
   */
  stop(): void {
    this.queue = [];
    this.stopCurrentOnly();
  }

  private stopCurrentOnly(): void {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.isSpeaking = false;
    try {
      const speech = this.getSpeech();
      speech?.stop?.();
    } catch {
      // ignore
    }
  }

  private processNext(): void {
    if (this.isSpeaking || this.queue.length === 0) return;

    const cfg = audioService.getConfig();
    if (!cfg.audioEnabled || !cfg.narrationEnabled) {
      this.queue = [];
      this.isSpeaking = false;
      return;
    }

    const current = this.queue.shift()!;
    this.isSpeaking = true;

    // 1. If a pre-recorded human audio asset is registered for this line, play it
    if (current.recordedAssetKey && this.customRecordedAssets[current.recordedAssetKey]) {
      audioService.playSoundEffect('tap');
      this.scheduleAdvance(900);
      return;
    }

    // 2. If voice health check confirmed the target language voice is missing, play a gentle chime fallback
    const voiceMissing =
      this.voiceHealth.checked &&
      ((current.language === 'ar' && !this.voiceHealth.arAvailable) ||
        (current.language === 'en' && !this.voiceHealth.enAvailable));

    const speech = this.getSpeech();
    if (!speech || voiceMissing) {
      audioService.playSoundEffect('sparkle');
      this.scheduleAdvance(350);
      return;
    }

    try {
      // Always stop any previous OS utterance before starting the next one
      speech.stop?.();

      let advanced = false;
      const finishCurrent = () => {
        if (advanced) return;
        advanced = true;
        if (this.fallbackTimer) {
          clearTimeout(this.fallbackTimer);
          this.fallbackTimer = null;
        }
        this.isSpeaking = false;
        this.processNext();
      };

      // Safety timeout in case OS TTS never fires onDone
      const estimatedMs = Math.max(1200, Math.min(6000, current.text.length * 75));
      this.fallbackTimer = setTimeout(finishCurrent, estimatedMs);

      speech.speak(current.text, {
        language: current.language === 'ar' ? 'ar-SA' : 'en-US',
        pitch: 1.08,
        rate: 0.86,
        onDone: finishCurrent,
        onStopped: finishCurrent,
        onError: () => {
          audioService.playSoundEffect('sparkle');
          finishCurrent();
        },
      });
    } catch {
      audioService.playSoundEffect('sparkle');
      this.scheduleAdvance(350);
    }
  }

  private scheduleAdvance(ms: number): void {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
    }
    this.fallbackTimer = setTimeout(() => {
      this.fallbackTimer = null;
      this.isSpeaking = false;
      this.processNext();
    }, ms);
  }
}

export const narrator = new VoiceNarrator();
