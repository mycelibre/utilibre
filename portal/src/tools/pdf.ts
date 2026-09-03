import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import { actionButton, append, downloadBlob, element, fileStem, labelledInput, labelledSelect, setStatus, statusRegion, toolPanel, type Translate } from '../utilities/dom';

export type PdfToolId = 'pdf-merge' | 'pdf-extract' | 'pdf-rotate' | 'pdf-reorder';

export function renderPdfTool(id: PdfToolId, t: Translate): HTMLElement {
  const panel = toolPanel();
  const fileField = labelledInput(id === 'pdf-merge' ? t('tool.chooseFiles') : t('tool.chooseFile'), 'file', { accept: 'application/pdf,.pdf', multiple: id === 'pdf-merge' });
  const controls = element('div', 'tool-grid');
  const pageRange = labelledInput(id === 'pdf-reorder' ? t('pdf.order') : t('pdf.range'), 'text', { placeholder: id === 'pdf-reorder' ? '3,1,2' : '1,3-5' });
  const rotate = labelledSelect(t('pdf.rotation'), [
    { value: '90', label: '90°' }, { value: '180', label: '180°' }, { value: '270', label: '270°' },
  ]);
  if (id === 'pdf-extract' || id === 'pdf-reorder') {
    append(controls, pageRange.wrapper, element('p', 'field-help', id === 'pdf-reorder' ? t('pdf.orderHelp') : t('pdf.rangeHelp')));
  }
  if (id === 'pdf-rotate') append(controls, rotate.wrapper);
  if (id === 'pdf-merge') append(controls, element('p', 'field-help', t('pdf.mergeOrder')));
  const process = actionButton(t(
    id === 'pdf-merge' ? 'pdf.action.merge'
      : id === 'pdf-extract' ? 'pdf.action.extract'
        : id === 'pdf-rotate' ? 'pdf.action.rotate'
          : 'pdf.action.reorder',
  ));
  const status = statusRegion(t('tool.ready'));
  const warning = element('p', 'notice', t('tools.largeWarning'));

  process.addEventListener('click', async () => {
    const files = [...(fileField.input.files ?? [])];
    if (files.length < (id === 'pdf-merge' ? 2 : 1)) {
      return setStatus(status, id === 'pdf-merge' ? t('tool.error.filesRequired') : t('tool.error.fileRequired'), 'error');
    }
    process.disabled = true;
    setStatus(status, t('tool.processing'));
    try {
      let output: PDFDocument;
      if (id === 'pdf-merge') {
        output = await PDFDocument.create();
        for (const file of files) {
          const source = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
          const pages = await output.copyPages(source, source.getPageIndices());
          for (const page of pages) output.addPage(page);
        }
      } else {
        const source = await PDFDocument.load(await files[0]!.arrayBuffer(), { updateMetadata: false });
        if (id === 'pdf-rotate') {
          output = source;
          const amount = Number(rotate.select.value);
          for (const page of output.getPages()) page.setRotation(degrees((page.getRotation().angle + amount) % 360));
        } else {
          const pages = parsePageSelection(pageRange.input.value, source.getPageCount(), id === 'pdf-reorder');
          output = await PDFDocument.create();
          const copied = await output.copyPages(source, pages.map((page) => page - 1));
          for (const page of copied) output.addPage(page);
        }
      }
      const bytes = await output.save({ useObjectStreams: true });
      downloadBlob(new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' }), `${fileStem(files[0]!.name)}-${id.replace('pdf-', '')}.pdf`);
      setStatus(status, `${t('tool.done')} ${t('pdf.pages')}: ${output.getPageCount()}.`, 'success');
    } catch (error) {
      const selectionError = error instanceof Error && ['range', 'empty', 'permutation'].includes(error.message);
      setStatus(status, selectionError ? t('pdf.invalidSelection') : t('tool.error.invalidPdf'), 'error');
    } finally {
      process.disabled = false;
    }
  });

  append(panel, fileField.wrapper, controls, process, status, warning);
  return panel;
}

export function parsePageSelection(value: string, pageCount: number, requirePermutation = false): number[] {
  const pages: number[] = [];
  for (const token of value.split(',').map((item) => item.trim()).filter(Boolean)) {
    const range = token.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < 1 || end < start || end > pageCount) throw new Error('range');
      for (let page = start; page <= end; page += 1) pages.push(page);
    } else if (/^\d+$/.test(token)) {
      const page = Number(token);
      if (page < 1 || page > pageCount) throw new Error('range');
      pages.push(page);
    } else throw new Error('range');
  }
  if (pages.length === 0) throw new Error('empty');
  if (requirePermutation && (pages.length !== pageCount || new Set(pages).size !== pageCount)) throw new Error('permutation');
  return pages;
}
