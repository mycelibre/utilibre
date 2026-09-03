import { actionButton, append, element, formatBytes, labelledInput, setStatus, statusRegion, toolPanel, type Translate } from '../utilities/dom';
import { sha2Digests } from '../utilities/hashes';

export type FileToolId = 'file-hashes' | 'file-info';

export function renderFileTool(id: FileToolId, t: Translate): HTMLElement {
  const panel = toolPanel();
  const fileField = labelledInput(t('tool.chooseFile'), 'file');
  const process = actionButton(t(id === 'file-hashes' ? 'file.action.hashes' : 'file.action.info'));
  const status = statusRegion(t('tool.ready'));
  const output = element('dl', 'result-list result-list-wide');

  process.addEventListener('click', async () => {
    const file = fileField.input.files?.[0];
    if (!file) return setStatus(status, t('tool.error.fileRequired'), 'error');
    process.disabled = true;
    output.replaceChildren();
    setStatus(status, t('tool.processing'));
    try {
      if (id === 'file-hashes') {
        const bytes = await file.arrayBuffer();
        const [sha256, sha512] = await sha2Digests(bytes);
        append(output, row(t('hash.sha256'), toHex(sha256)), row(t('hash.sha512'), toHex(sha512)));
      } else {
        append(output,
          row(t('file.filename'), file.name),
          row(t('file.size'), `${formatBytes(file.size)} (${file.size.toLocaleString()} B)`),
          row(t('file.mime'), file.type || '—'),
          row(t('file.lastModified'), file.lastModified ? new Date(file.lastModified).toLocaleString() : '—'),
        );
        if (file.type.startsWith('image/')) {
          try {
            const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
            append(output, row(t('file.imageDimensions'), `${bitmap.width} × ${bitmap.height}`));
            bitmap.close();
          } catch { /* A non-decodable image still has useful basic file information. */ }
        }
      }
      setStatus(status, t('tool.done'), 'success');
    } catch {
      setStatus(status, t('tool.error.generic'), 'error');
    } finally {
      process.disabled = false;
    }
  });

  append(panel, fileField.wrapper, process, status, output);
  if (id === 'file-info') panel.append(element('p', 'notice', t('file.mimeWarning')));
  else panel.append(element('p', 'notice', t('tools.largeWarning')));
  return panel;
}

function toHex(value: Uint8Array): string {
  return [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function row(term: string, value: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  append(fragment, element('dt', '', term), element('dd', 'mono wrap', value));
  return fragment;
}
