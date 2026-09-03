import { actionButton, append, disableActionButton, element, labelledInput, labelledSelect, setStatus, statusRegion, toolPanel, type Translate } from '../utilities/dom';

interface MediaResult {
  status?: string;
  url?: string;
  filename?: string;
  error?: string;
}

export function renderMediaTool(t: Translate, acceptablePath: string): HTMLElement {
  const panel = toolPanel();
  const url = labelledInput(t('media.url'), 'url', { placeholder: t('media.placeholder') });
  url.input.maxLength = 2048;
  const quality = labelledSelect(t('media.quality'), [
    { value: '360', label: '360p' }, { value: '480', label: '480p' }, { value: '720', label: '720p' }, { value: '1080', label: '1080p' }, { value: 'max', label: t('media.quality.max') },
  ]);
  quality.select.value = '720';
  const mode = labelledSelect(t('media.mode'), [
    { value: 'auto', label: t('media.mode.auto') }, { value: 'audio', label: t('media.mode.audio') }, { value: 'mute', label: t('media.mode.mute') },
  ]);
  const submit = actionButton(t('media.submit'));
  const status = statusRegion(t('media.acceptable'));
  const result = element('div', 'download-result');

  submit.addEventListener('click', async () => {
    result.replaceChildren();
    const finishAction = disableActionButton(submit);
    setStatus(status, t('media.processing'));
    try {
      const response = await fetch('/_portal/media', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.input.value, videoQuality: quality.select.value, downloadMode: mode.select.value }),
      });
      const payload = await response.json() as MediaResult;
      if (!response.ok || payload.status === 'error' || !payload.url) throw new MediaError(payload.error || 'generic');
      const link = element('a', 'button', t('tool.download'));
      link.href = payload.url;
      link.rel = 'noopener noreferrer';
      if (payload.filename) link.download = payload.filename;
      result.append(link);
      setStatus(status, t('media.ready'), 'success');
    } catch (error) {
      const code = error instanceof MediaError ? error.code : 'generic';
      const key = `media.error.${code}` as Parameters<Translate>[0];
      let message: string;
      try { message = t(key); } catch { message = t('media.error.generic'); }
      setStatus(status, message || t('media.error.generic'), 'error');
    } finally {
      finishAction();
    }
  });

  const acceptable = element('a', '', t('acceptable.title'));
  acceptable.href = acceptablePath;
  append(panel, url.wrapper, element('div', 'tool-grid'), submit, status, result, element('p', 'notice', t('media.providers')), element('p', 'notice', t('media.limits')), element('p', 'notice', t('media.external')), acceptable);
  panel.querySelector('.tool-grid')?.append(quality.wrapper, mode.wrapper);
  return panel;
}

class MediaError extends Error {
  constructor(readonly code: string) { super(code); }
}
