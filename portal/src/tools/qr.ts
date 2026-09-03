import { prepareZXingModule, readBarcodes, writeBarcode } from 'zxing-wasm';
import { actionButton, append, downloadBlob, element, labelledInput, setStatus, statusRegion, toolPanel, type Translate } from '../utilities/dom';

let moduleReady: Promise<unknown> | null = null;

function prepareModule(): Promise<unknown> {
  moduleReady ??= Promise.resolve(prepareZXingModule({
    overrides: { locateFile: (path: string) => path.endsWith('.wasm') ? '/vendor/zxing_full.wasm' : path },
    fireImmediately: true,
  }));
  return moduleReady;
}

export function renderQrTool(id: 'qr-generate' | 'qr-read', t: Translate): HTMLElement {
  const panel = toolPanel();
  const status = statusRegion(t('tool.processing'));
  const output = element('div', 'qr-output');
  const ready = prepareModule().then(() => setStatus(status, t('tool.ready'))).catch(() => setStatus(status, t('tool.error.generic'), 'error'));

  if (id === 'qr-generate') {
    const input = labelledInput(t('qr.text'), 'text');
    input.input.maxLength = 2048;
    const generate = actionButton(t('qr.generate'));
    generate.addEventListener('click', async () => {
      if (!input.input.value) return setStatus(status, t('qr.inputRequired'), 'error');
      setStatus(status, t('tool.processing'));
      try {
        await ready;
        const result = await writeBarcode(input.input.value, { format: 'QRCode', scale: 5, addQuietZones: true });
        if (!result.image) throw new Error('image');
        const blob = result.image;
        output.replaceChildren();
        const image = element('img');
        const objectUrl = URL.createObjectURL(blob);
        image.src = objectUrl;
        image.alt = t('qr.generate');
        image.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
        const save = actionButton(t('qr.save'), true);
        save.addEventListener('click', () => downloadBlob(blob, 'qr-code.png'));
        append(output, image, save);
        setStatus(status, t('tool.done'), 'success');
      } catch { setStatus(status, t('tool.error.generic'), 'error'); }
    });
    append(panel, input.wrapper, generate, status, output);
  } else {
    const file = labelledInput(t('qr.choose'), 'file', { accept: 'image/*' });
    const read = actionButton(t('qr.read'));
    read.addEventListener('click', async () => {
      const selected = file.input.files?.[0];
      if (!selected) return setStatus(status, t('tool.error.fileRequired'), 'error');
      setStatus(status, t('tool.processing'));
      try {
        await ready;
        const results = await readBarcodes(selected, { formats: ['QRCode'], maxNumberOfSymbols: 1, tryHarder: true });
        output.replaceChildren();
        const value = results[0]?.text;
        if (!value) return setStatus(status, t('qr.none'), 'error');
        append(output, element('h3', '', t('qr.found')), element('pre', 'wrap', value));
        if (isSafeWebUrl(value)) {
          const warning = element('p', 'notice', t('qr.urlWarning'));
          const link = element('a', 'button button-secondary', t('qr.open'));
          link.href = value;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          append(output, warning, link);
        }
        setStatus(status, t('tool.done'), 'success');
      } catch { setStatus(status, t('tool.error.generic'), 'error'); }
    });
    append(panel, file.wrapper, read, status, output, element('p', 'notice', t('tools.largeWarning')), element('p', 'notice', t('qr.urlWarning')));
  }
  return panel;
}

function isSafeWebUrl(value: string): boolean {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
