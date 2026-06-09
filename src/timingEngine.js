const splitWords = (line) => line.split(/\s+/).map((word) => word.trim()).filter(Boolean);

export const flattenVersesToWords = (verses) => {
  const result = [];

  verses.forEach((verse) => {
    [
      { type: 'hebrew1', text: verse.hebrew1 },
      { type: 'hebrew2', text: verse.hebrew2 },
      { type: 'targum', text: verse.targum },
    ].forEach((line) => {
      splitWords(line.text).forEach((word) => {
        result.push({
          verseId: verse.id,
          lineType: line.type,
          text: word,
        });
      });
    });
  });

  return result;
};

export const createTimingProvider = ({ words, durationSec, manualWordTimings = [] }) => {
  const safeDuration = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 1;
  const perWord = safeDuration / Math.max(words.length, 1);

  const manualByIndex = new Map();
  manualWordTimings.forEach((item, index) => {
    if (typeof item.start === 'number' && typeof item.end === 'number') {
      manualByIndex.set(index, { start: item.start, end: item.end, word: item.word ?? '' });
    }
  });

  const timings = words.map((word, index) => {
    const fallback = { start: index * perWord, end: (index + 1) * perWord };
    const manual = manualByIndex.get(index);

    return {
      ...word,
      index,
      start: manual?.start ?? fallback.start,
      end: manual?.end ?? fallback.end,
    };
  });

  const findWordByTime = (timeSec) => {
    const idx = timings.findIndex((word) => timeSec >= word.start && timeSec < word.end);
    return idx >= 0 ? timings[idx] : timings[timings.length - 1] ?? null;
  };

  return {
    timings,
    getByTime: findWordByTime,
    getByIndex: (index) => timings[index] ?? null,
  };
};
