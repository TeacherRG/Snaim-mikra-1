import { APP_CONFIG } from './config.js';
import { loadAndParseText } from './textParser.js';
import { flattenVersesToWords, createTimingProvider } from './timingEngine.js';
import { createAudioController } from './audioController.js';
import { renderVerses } from './uiRenderer.js';

const statusEl = document.getElementById('status');
const textContainer = document.getElementById('textContainer');

const audio = document.getElementById('audio');
audio.src = APP_CONFIG.audioSource;

const controller = createAudioController({
  audio,
  playPauseBtn: document.getElementById('playPauseBtn'),
  timeline: document.getElementById('timeline'),
  currentTimeLabel: document.getElementById('currentTime'),
  totalTimeLabel: document.getElementById('totalTime'),
  speedSelect: document.getElementById('speedSelect'),
  playbackRates: APP_CONFIG.playbackRates,
});

const setStatus = (text) => {
  statusEl.textContent = text;
};

/**
 * Converts the current playback position into the timing lookup position.
 * highlightStartDelaySec shifts the spoken content later in the file,
 * while highlightOffsetSec keeps the highlight slightly ahead of the spoken audio.
 */
const getTimingLookupTime = (timeSec, highlightStartDelaySec, highlightOffsetSec) => (
  Math.max(0, timeSec - highlightStartDelaySec + highlightOffsetSec)
);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Converts a word timing back into the matching playback position in the audio file.
 * The initial audio delay is added back, and the highlight lead is subtracted.
 */
const getPlaybackTimeFromTiming = (wordStartSec, highlightStartDelaySec, highlightOffsetSec) => (
  Math.max(0, wordStartSec + highlightStartDelaySec - highlightOffsetSec)
);

document.getElementById('playPauseBtn').addEventListener('playblocked', () => {
  setStatus('הדפדפן חוסם השמעת שמע. לחץ על הנגן כדי להתחיל.');
});

const bootstrap = async () => {
  try {
    const verses = await loadAndParseText(APP_CONFIG.textSource);
    const { wordElements, setActiveWord } = renderVerses({ container: textContainer, verses });

    const words = flattenVersesToWords(verses);
    const runtimeDuration = controller.getDuration();
    const durationSec = Number.isFinite(runtimeDuration) && runtimeDuration > 0
      ? runtimeDuration
      : APP_CONFIG.fallbackDurationSec;

    controller.setDuration(durationSec);

    const timingProvider = createTimingProvider({
      words,
      durationSec,
      manualWordTimings: APP_CONFIG.manualWordTimings,
    });
    const highlightStartDelaySec = Number.isFinite(APP_CONFIG.highlightStartDelaySec)
      ? Math.max(0, APP_CONFIG.highlightStartDelaySec)
      : 0;
    const highlightOffsetSec = Number.isFinite(APP_CONFIG.highlightOffsetSec) ? APP_CONFIG.highlightOffsetSec : 0;
    const maxCorrectionSec = durationSec;
    let highlightCorrectionSec = 0;

    audio.addEventListener('ended', () => {
      highlightCorrectionSec = 0;
      setActiveWord(null);
    });

    controller.onTimeUpdate((timeSec) => {
      if (timeSec < highlightStartDelaySec) {
        setActiveWord(null);
        return;
      }

      const lookupTimeSec = getTimingLookupTime(
        timeSec,
        highlightStartDelaySec,
        highlightOffsetSec,
      );
      const correctedLookupTimeSec = clamp(
        lookupTimeSec + highlightCorrectionSec,
        0,
        durationSec,
      );
      const active = timingProvider.getByTime(correctedLookupTimeSec);
      if (!active) return;

      setActiveWord(active.index);
      const targetEl = wordElements[active.index];
      if (targetEl) {
        targetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });

    wordElements.forEach((el) => {
      el.addEventListener('click', async () => {
        const index = Number(el.dataset.wordIndex);
        const timing = timingProvider.getByIndex(index);
        if (!timing) return;

        if (audio.paused) {
          highlightCorrectionSec = 0;
          await controller.seekAndPlay(getPlaybackTimeFromTiming(
            timing.start,
            highlightStartDelaySec,
            highlightOffsetSec,
          ));
        } else {
          const currentLookupTime = getTimingLookupTime(
            audio.currentTime,
            highlightStartDelaySec,
            highlightOffsetSec,
          );
          highlightCorrectionSec = clamp(timing.start - currentLookupTime, -maxCorrectionSec, maxCorrectionSec);
        }
        setActiveWord(index);
      });
    });

    setStatus(`Загружено стихов: ${verses.length}. Слов: ${words.length}.`);
  } catch (error) {
    console.error(error);
    setStatus(`Ошибка: ${error.message}`);
  }
};

bootstrap();
