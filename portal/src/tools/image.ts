import { actionButton, append, downloadBlob, element, fileStem, formatBytes, labelledInput, labelledSelect, setStatus, statusRegion, toolPanel, type Translate } from '../utilities/dom';
import { secureRandomUuid } from '../utilities/random';

export type ImageToolId = 'image-resize' | 'image-compress' | 'image-convert' | 'image-metadata';

interface LoadedImage {
  bitmap: ImageBitmap;
  file: File;
}

export function renderImageTool(id: ImageToolId, t: Translate): HTMLElement {
  const panel = toolPanel();
  const fileField = labelledInput(t('tool.chooseFile'), 'file', { accept: 'image/png,image/jpeg,image/webp' });
  const controls = element('div', 'tool-grid');
  const status = statusRegion(t('tool.chooseFilePrompt'));
  const summary = element('dl', 'result-list');
  const warning = element('p', 'notice', id === 'image-metadata' ? t('image.metadata.limit') : t('image.warning'));
  let loaded: LoadedImage | null = null;

  const width = labelledInput(t('image.width'), 'number', { min: '1', max: '16384' });
  const height = labelledInput(t('image.height'), 'number', { min: '1', max: '16384' });
  const aspectWrapper = element('div', 'field field-checkbox');
  const aspect = element('input');
  aspect.type = 'checkbox';
  aspect.id = `aspect-${secureRandomUuid()}`;
  aspect.checked = true;
  const aspectLabel = element('label', '', t('image.aspect'));
  aspectLabel.htmlFor = aspect.id;
  append(aspectWrapper, aspect, aspectLabel);
  const quality = labelledInput(t('image.quality'), 'range', { min: '0.2', max: '1', step: '0.05', value: '0.8' });
  const formats = [
    { value: 'image/png', label: 'PNG' },
    { value: 'image/jpeg', label: 'JPEG' },
    { value: 'image/webp', label: 'WebP' },
  ];
  const format = labelledSelect(t('image.format'), id === 'image-compress' ? formats.slice(1) : formats);

  if (id === 'image-resize') append(controls, width.wrapper, height.wrapper, aspectWrapper, format.wrapper);
  if (id === 'image-compress') {
    format.select.value = 'image/jpeg';
    append(controls, quality.wrapper, format.wrapper);
  }
  if (id === 'image-convert' || id === 'image-metadata') append(controls, format.wrapper);

  const process = actionButton(t(
    id === 'image-resize' ? 'image.action.resize'
      : id === 'image-compress' ? 'image.action.compress'
        : id === 'image-convert' ? 'image.action.convert'
          : 'image.action.metadata',
  ));
  process.disabled = true;
  fileField.input.addEventListener('change', async () => {
    loaded?.bitmap.close();
    loaded = null;
    summary.replaceChildren();
    const file = fileField.input.files?.[0];
    if (!file) {
      process.disabled = true;
      setStatus(status, t('tool.error.fileRequired'), 'error');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      if (bitmap.width * bitmap.height > 80_000_000) {
        bitmap.close();
        throw new Error('pixel_limit');
      }
      loaded = { bitmap, file };
      width.input.value = String(bitmap.width);
      height.input.value = String(bitmap.height);
      process.disabled = false;
      setStatus(status, `${t('tool.ready')} ${bitmap.width} × ${bitmap.height}.`);
    } catch (error) {
      process.disabled = true;
      setStatus(status, error instanceof Error && error.message === 'pixel_limit' ? t('tool.error.imagePixelLimit') : t('tool.error.invalidImage'), 'error');
    }
  });

  width.input.addEventListener('input', () => {
    if (!loaded || !aspect.checked) return;
    const next = Number(width.input.value);
    if (Number.isFinite(next) && next > 0) height.input.value = String(Math.max(1, Math.round(next * loaded.bitmap.height / loaded.bitmap.width)));
  });
  height.input.addEventListener('input', () => {
    if (!loaded || !aspect.checked) return;
    const next = Number(height.input.value);
    if (Number.isFinite(next) && next > 0) width.input.value = String(Math.max(1, Math.round(next * loaded.bitmap.width / loaded.bitmap.height)));
  });

  process.addEventListener('click', async () => {
    if (!loaded) return setStatus(status, t('tool.error.fileRequired'), 'error');
    setStatus(status, t('tool.processing'));
    process.disabled = true;
    try {
      const outputWidth = id === 'image-resize' ? validDimension(width.input.value) : loaded.bitmap.width;
      const outputHeight = id === 'image-resize' ? validDimension(height.input.value) : loaded.bitmap.height;
      if (!outputWidth || !outputHeight) throw new Error('dimensions');
      if (outputWidth * outputHeight > 80_000_000) throw new Error('pixel_limit');
      const canvas = element('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext('2d', { alpha: format.select.value !== 'image/jpeg' });
      if (!context) throw new Error('canvas');
      if (format.select.value === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, outputWidth, outputHeight);
      }
      context.drawImage(loaded.bitmap, 0, 0, outputWidth, outputHeight);
      const selectedQuality = id === 'image-compress' ? Number(quality.input.value) : 0.92;
      const blob = await canvasBlob(canvas, format.select.value, selectedQuality);
      const extension = format.select.value === 'image/jpeg' ? 'jpg' : format.select.value.split('/')[1] ?? 'png';
      summary.replaceChildren(
        description(t('image.originalSize'), formatBytes(loaded.file.size)),
        description(t('image.resultSize'), formatBytes(blob.size)),
        description(t('image.dimensions'), `${outputWidth} × ${outputHeight}`),
      );
      downloadBlob(blob, `${fileStem(loaded.file.name)}-${id.replace('image-', '')}.${extension}`);
      setStatus(status, t('tool.done'), 'success');
    } catch (error) {
      const message = error instanceof Error && error.message === 'dimensions'
        ? t('tool.error.invalidNumber')
        : error instanceof Error && error.message === 'pixel_limit'
          ? t('tool.error.imagePixelLimit')
          : t('tool.error.generic');
      setStatus(status, message, 'error');
    } finally {
      process.disabled = false;
    }
  });

  append(panel, fileField.wrapper, controls, process, status, summary, warning);
  return panel;
}

function validDimension(value: string): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 16_384 ? number : null;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('encode')), type, quality));
}

function description(term: string, value: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  append(fragment, element('dt', '', term), element('dd', '', value));
  return fragment;
}
