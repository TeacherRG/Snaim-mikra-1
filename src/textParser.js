const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

const extractPrimarySpanText = (lineEl) => {
  const spans = Array.from(lineEl.querySelectorAll(':scope > span'))
    .map((span) => cleanText(span.textContent ?? ''))
    .filter(Boolean);

  if (!spans.length) {
    return '';
  }

  return spans.reduce((longest, current) => (current.length > longest.length ? current : longest), '');
};

const getUniqueTexts = (texts) => texts.filter((text, index) => text && texts.indexOf(text) === index);

const extractHtmlFromMhtml = (raw) => {
  const htmlStart = raw.indexOf('<!DOCTYPE html>');
  const htmlEnd = raw.lastIndexOf('</html>');

  if (htmlStart === -1 || htmlEnd === -1) {
    throw new Error('Не найден HTML-фрагмент в текстовом файле.');
  }

  return raw.slice(htmlStart, htmlEnd + '</html>'.length);
};

const parseVerseContainer = (container, index) => {
  const lineCandidates = Array.from(container.querySelectorAll(':scope > div'));

  if (lineCandidates.length < 3) {
    return null;
  }

  const hebrew1Raw = extractPrimarySpanText(lineCandidates[0]) || cleanText(lineCandidates[0]?.textContent ?? '');
  const hebrew2Raw = cleanText(lineCandidates[1]?.textContent ?? '');
  const targumRaw = cleanText(lineCandidates[2]?.textContent ?? '');

  // Удаляем номер главы/стиха из начала первой строки, оставляем только текст стиха.
  const hebrew1 = cleanText(hebrew1Raw.replace(/^\d+\s+\d+\s*/, ''));

  if (!hebrew1 || !hebrew2Raw || !targumRaw) {
    return null;
  }

  return {
    id: index + 1,
    hebrew1,
    hebrew2: hebrew2Raw,
    targum: targumRaw,
  };
};

const extractWikisourceHebrewLines = (cell) => {
  const wrapper = cell.querySelector(':scope > span') ?? cell;
  const directTexts = Array.from(wrapper.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => cleanText(node.textContent ?? ''));
  const paragraphTexts = Array.from(wrapper.querySelectorAll(':scope > p'))
    .map((paragraph) => cleanText(paragraph.textContent ?? ''));

  return getUniqueTexts([...directTexts, ...paragraphTexts]);
};

const parseWikisourceVerseRow = (row, index) => {
  const hebrewCell = row.querySelector('td[align="left"]');
  const targumCell = row.querySelector('td[align="right"]');

  if (!hebrewCell || !targumCell) {
    return null;
  }

  const hebrewLines = extractWikisourceHebrewLines(hebrewCell);
  const targum = cleanText(targumCell.textContent ?? '');

  if (!hebrewLines.length || !targum) {
    return null;
  }

  const [hebrew1, hebrew2 = hebrewLines[0]] = hebrewLines;

  return {
    id: index + 1,
    hebrew1,
    hebrew2,
    targum,
  };
};

const parseSavedAppVerses = (doc) => {
  const verseContainers = Array.from(doc.querySelectorAll('div.mb-6'));

  return verseContainers
    .map((container, index) => parseVerseContainer(container, index))
    .filter(Boolean);
};

const parseWikisourceVerses = (doc) => {
  const verseRows = Array.from(doc.querySelectorAll('div[lang="hbo"] table.notheme tr[valign="top"]'));

  return verseRows
    .map((row, index) => parseWikisourceVerseRow(row, index))
    .filter(Boolean);
};

export const loadAndParseText = async (sourcePath) => {
  const response = await fetch(sourcePath);
  if (!response.ok) {
    throw new Error(`Ошибка загрузки текста: ${response.status}`);
  }

  const raw = await response.text();
  const html = extractHtmlFromMhtml(raw);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const verses = parseSavedAppVerses(doc);

  if (verses.length) {
    return verses;
  }

  const wikisourceVerses = parseWikisourceVerses(doc);

  if (wikisourceVerses.length) {
    return wikisourceVerses;
  }

  throw new Error('Не удалось извлечь стихи из файла главы.');
};
