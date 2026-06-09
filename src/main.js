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
    const highlightOffsetSec = Number.isFinite(APP_CONFIG.highlightOffsetSec) ? APP_CONFIG.highlightOffsetSec : 0;

    controller.onTimeUpdate((timeSec) => {
      const active = timingProvider.getByTime(Math.max(0, timeSec + highlightOffsetSec));
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

        await controller.seekAndPlay(Math.max(0, timing.start - highlightOffsetSec));
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
