const createLineWithWords = ({
  lineText,
  lineClass,
  verseId,
  lineType,
  startIndex,
  allWordElements,
}) => {
  const lineEl = document.createElement('div');
  lineEl.className = `line ${lineClass}`.trim();

  const words = lineText.split(/\s+/).map((word) => word.trim()).filter(Boolean);

  words.forEach((word, offset) => {
    const wordEl = document.createElement('span');
    wordEl.className = 'word';
    wordEl.textContent = word;
    wordEl.dataset.wordIndex = String(startIndex + offset);
    wordEl.dataset.verseId = String(verseId);
    wordEl.dataset.lineType = lineType;
    lineEl.append(wordEl);
    allWordElements.push(wordEl);
  });

  return { lineEl, wordCount: words.length };
};

export const renderVerses = ({ container, verses }) => {
  container.innerHTML = '';

  const allWordElements = [];
  let wordCursor = 0;

  verses.forEach((verse) => {
    const verseEl = document.createElement('article');
    verseEl.className = 'verse';

    const head = document.createElement('div');
    head.className = 'verse-head';
    head.textContent = `פסוק ${verse.id}`;
    verseEl.append(head);

    [
      { text: verse.hebrew1, lineClass: 'mikra', type: 'hebrew1' },
      { text: verse.hebrew2, lineClass: 'mikra', type: 'hebrew2' },
      { text: verse.targum, lineClass: 'targum', type: 'targum' },
    ].forEach((line) => {
      const { lineEl, wordCount } = createLineWithWords({
        lineText: line.text,
        lineClass: line.lineClass,
        verseId: verse.id,
        lineType: line.type,
        startIndex: wordCursor,
        allWordElements,
      });
      wordCursor += wordCount;
      verseEl.append(lineEl);
    });

    container.append(verseEl);
  });

  return {
    wordElements: allWordElements,
    setActiveWord: (index) => {
      allWordElements.forEach((el) => el.classList.toggle('active', Number(el.dataset.wordIndex) === index));
    },
  };
};
