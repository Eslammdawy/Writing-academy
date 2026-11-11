import { CurriculumLetter, LanguageCode } from '../../types';
import { LETTER_AUDIO_ASSETS, SOUND_EFFECT_ASSETS, SoundEffectKey } from './audioAssets';

export interface AudioServiceConfig {
  audioEnabled: boolean;
  narrationEnabled: boolean;
  soundEffectsVolume: number;
}

class OfflineAudioService {
  private config: AudioServiceConfig = {
    audioEnabled: true,
    narrationEnabled: true,
    soundEffectsVolume: 0.85,
  };

  updateConfig(partial: Partial<AudioServiceConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  getConfig(): AudioServiceConfig {
    return { ...this.config };
  }

  private playBundledAsset(assetSource: any): void {
    if (!this.config.audioEnabled || !assetSource) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExpoAudio = require('expo-audio');
      if (ExpoAudio && typeof ExpoAudio.createAudioPlayer === 'function') {
        const player = ExpoAudio.createAudioPlayer(assetSource);
        player.volume = Math.max(0, Math.min(1, this.config.soundEffectsVolume));
        player.play();
        setTimeout(() => {
          try {
            player.remove?.();
          } catch {
            // ignore cleanup errors
          }
        }, 1800);
      }
    } catch {
      // Safe fallback in headless/test environments
    }
  }

  playSoundEffect(key: SoundEffectKey): void {
    if (!this.config.audioEnabled) return;
    const asset = SOUND_EFFECT_ASSETS[key];
    this.playBundledAsset(asset);
  }

  speakText(text: string, language: LanguageCode): void {
    if (!this.config.audioEnabled || !this.config.narrationEnabled) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Speech = require('expo-speech');
      if (Speech && typeof Speech.speak === 'function') {
        Speech.stop?.();
        Speech.speak(text, {
          language: language === 'ar' ? 'ar-SA' : 'en-US',
          pitch: 1.08,
          rate: 0.86,
        });
      }
    } catch {
      // Safe offline fallback if OS TTS engine is unavailable
    }
  }

  pronounceLetter(letter: CurriculumLetter, customText?: string): void {
    if (!this.config.audioEnabled) return;
    const bundled = LETTER_AUDIO_ASSETS[letter.pronunciationAsset];
    if (bundled) {
      this.playBundledAsset(bundled);
    }
    if (this.config.narrationEnabled) {
      const phrase = customText ?? letter.ttsPrompt;
      this.speakText(phrase, letter.language);
    }
  }

  pronounceWord(word: string, language: LanguageCode): void {
    if (!this.config.audioEnabled) return;
    this.playSoundEffect('sparkle');
    this.speakText(word, language);
  }
}

export const audioService = new OfflineAudioService();
