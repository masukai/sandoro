import { useCallback, useRef } from 'react';
import { useSettings, SoundPattern } from './useSettings';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

// Generate simple sounds using Web Audio API
function createBeep(
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
  waveType: OscillatorType = 'sine'
): OscillatorNode {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = waveType;

  // Apply volume (0-100 -> 0-1), full volume for maximum audibility
  const normalizedVolume = volume / 100;
  gainNode.gain.setValueAtTime(normalizedVolume * 1.0, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  return oscillator;
}

export type SoundType = 'workComplete' | 'breakComplete' | 'tick' | 'click';

interface SoundConfig {
  frequencies: number[];
  durations: number[];
  waveType: OscillatorType;
}

// Sound patterns with different characteristics
const SOUND_PATTERNS: Record<SoundPattern, Record<SoundType, SoundConfig>> = {
  chime: {
    workComplete: {
      frequencies: [523.25, 659.25, 783.99], // C5, E5, G5 - ascending major chord
      durations: [0.15, 0.15, 0.3],
      waveType: 'sine',
    },
    breakComplete: {
      frequencies: [783.99, 659.25, 523.25], // G5, E5, C5 - descending
      durations: [0.15, 0.15, 0.3],
      waveType: 'sine',
    },
    tick: { frequencies: [1000], durations: [0.05], waveType: 'sine' },
    click: { frequencies: [800], durations: [0.03], waveType: 'sine' },
  },
  bell: {
    workComplete: {
      frequencies: [440, 554.37, 659.25, 880], // A4, C#5, E5, A5 - bell-like
      durations: [0.2, 0.15, 0.15, 0.4],
      waveType: 'triangle',
    },
    breakComplete: {
      frequencies: [880, 659.25, 554.37, 440], // Descending
      durations: [0.2, 0.15, 0.15, 0.4],
      waveType: 'triangle',
    },
    tick: { frequencies: [1200], durations: [0.04], waveType: 'triangle' },
    click: { frequencies: [900], durations: [0.02], waveType: 'triangle' },
  },
  digital: {
    workComplete: {
      frequencies: [800, 1000, 1200], // Digital beeps
      durations: [0.1, 0.1, 0.2],
      waveType: 'square',
    },
    breakComplete: {
      frequencies: [1200, 1000, 800],
      durations: [0.1, 0.1, 0.2],
      waveType: 'square',
    },
    tick: { frequencies: [1500], durations: [0.03], waveType: 'square' },
    click: { frequencies: [1200], durations: [0.02], waveType: 'square' },
  },
  gentle: {
    workComplete: {
      frequencies: [392, 440, 493.88], // G4, A4, B4 - gentle rise
      durations: [0.25, 0.25, 0.4],
      waveType: 'sine',
    },
    breakComplete: {
      frequencies: [493.88, 440, 392], // Descending
      durations: [0.25, 0.25, 0.4],
      waveType: 'sine',
    },
    tick: { frequencies: [600], durations: [0.08], waveType: 'sine' },
    click: { frequencies: [500], durations: [0.05], waveType: 'sine' },
  },
};

export function useSound() {
  const { settings } = useSettings();
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback(
    async (type: SoundType) => {
      if (!settings.soundEnabled) {
        return;
      }

      try {
        const audioContext = getAudioContext();

        // Resume audio context if it's suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const patternConfig = SOUND_PATTERNS[settings.soundPattern] || SOUND_PATTERNS.chime;
        const config = patternConfig[type];
        let delay = 0;

        config.frequencies.forEach((freq, index) => {
          const duration = config.durations[index];
          const oscillator = createBeep(
            audioContext,
            freq,
            duration,
            settings.soundVolume,
            config.waveType
          );

          oscillator.start(audioContext.currentTime + delay);
          oscillator.stop(audioContext.currentTime + delay + duration);

          delay += duration * 0.8; // Slight overlap for smoother sound
        });
      } catch (error) {
        console.warn('Failed to play sound:', error);
      }
    },
    [settings.soundEnabled, settings.soundVolume, settings.soundPattern, getAudioContext]
  );

  const playSessionComplete = useCallback(
    (sessionType: 'work' | 'shortBreak' | 'longBreak') => {
      if (sessionType === 'work') {
        playSound('workComplete');
      } else {
        playSound('breakComplete');
      }
    },
    [playSound]
  );

  const testSound = useCallback(() => {
    playSound('workComplete');
  }, [playSound]);

  // Test sound with a specific pattern (for immediate feedback when changing sound type)
  const testSoundWithPattern = useCallback(
    async (pattern: SoundPattern) => {
      if (!settings.soundEnabled) {
        return;
      }

      try {
        const audioContext = getAudioContext();

        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const patternConfig = SOUND_PATTERNS[pattern] || SOUND_PATTERNS.chime;
        const config = patternConfig['workComplete'];
        let delay = 0;

        config.frequencies.forEach((freq, index) => {
          const duration = config.durations[index];
          const oscillator = createBeep(
            audioContext,
            freq,
            duration,
            settings.soundVolume,
            config.waveType
          );

          oscillator.start(audioContext.currentTime + delay);
          oscillator.stop(audioContext.currentTime + delay + duration);

          delay += duration * 0.8;
        });
      } catch (error) {
        console.warn('Failed to play sound:', error);
      }
    },
    [settings.soundEnabled, settings.soundVolume, getAudioContext]
  );

  return {
    playSound,
    playSessionComplete,
    testSound,
    testSoundWithPattern,
  };
}

// Sound pattern metadata for UI
export const SOUND_PATTERN_OPTIONS: { value: SoundPattern; label: string; description: string }[] = [
  { value: 'chime', label: 'Chime', description: 'Classic melodic chime' },
  { value: 'bell', label: 'Bell', description: 'Rich bell-like tones' },
  { value: 'digital', label: 'Digital', description: 'Sharp digital beeps' },
  { value: 'gentle', label: 'Gentle', description: 'Soft, relaxing tones' },
];

// Re-export SoundPattern type
export type { SoundPattern } from './useSettings';
