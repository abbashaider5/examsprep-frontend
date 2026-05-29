import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_EXTRACTED_CHARS = 80;

/**
 * Extract plain text from a PDF in the browser (pdf.js).
 * @param {File} file
 * @param {(pct: number) => void} [onPageProgress] 0–100 while reading pages
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
export async function extractPdfTextFromFile(file, onPageProgress) {
  if (!file?.arrayBuffer) {
    throw new Error('Invalid PDF file.');
  }

  let data;
  try {
    data = await file.arrayBuffer();
  } catch {
    throw new Error('Could not read the PDF file. Try choosing it again.');
  }

  if (!data?.byteLength) {
    throw new Error('The PDF file is empty.');
  }

  let pdf;
  try {
    const task = getDocument({ data, useSystemFonts: true });
    pdf = await task.promise;
  } catch {
    throw new Error(
      'This PDF could not be opened in your browser. Try Word (.docx) or re-export the PDF from your editor.',
    );
  }

  const pageCount = pdf.numPages || 0;
  if (!pageCount) {
    throw new Error('The PDF has no pages.');
  }

  const parts = [];
  for (let i = 1; i <= pageCount; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => (typeof item.str === 'string' ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) parts.push(pageText);
    onPageProgress?.(Math.round((i / pageCount) * 100));
  }

  const text = parts.join('\n\n').trim();
  if (text.length < MIN_EXTRACTED_CHARS) {
    throw new Error(
      'This PDF has little or no selectable text (it may be scanned). Upload Word (.docx) or a text-based PDF.',
    );
  }

  return { text, pageCount };
}
