const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

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

  const hebrew1Raw = cleanText(lineCandidates[0]?.textContent ?? '');
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

export const loadAndParseText = async (sourcePath) => {
  const response = await fetch(sourcePath);
  if (!response.ok) {
    throw new Error(`Ошибка загрузки текста: ${response.status}`);
  }

  const raw = await response.text();
  const html = extractHtmlFromMhtml(raw);
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // В сохранённой странице каждый стих находится в блоке с классом mb-6.
  const verseContainers = Array.from(doc.querySelectorAll('div.mb-6'));
  const verses = verseContainers
    .map((container, index) => parseVerseContainer(container, index))
    .filter(Boolean);

  if (!verses.length) {
    throw new Error('Не удалось извлечь стихи из файла главы.');
  }

  return verses;
};
