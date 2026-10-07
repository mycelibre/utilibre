export interface PublicConfig {
  publicPortalOrigin: string;
  projectName: string;
  projectTagline: string;
  projectTaglineEn: string;
  projectTaglineEs: string;
  sourceCodeUrl: string;
  supportUrl: string;
  contactUrl: string;
  publicSearchUrl: string;
  publicRedditUrl: string;
  publicRssUrl: string;
  publicPasteUrl: string;
  publicPdfUrl: string;
  publicConvertUrl: string;
  publicToolsUrl: string;
  publicDeveloperToolsUrl: string;
  publicEncryptUrl: string;
  publicDrawUrl: string;
  publicQrUrl: string;
  publicQrToolsUrl: string;
  publicZipUrl: string;
  publicChartsUrl: string;
  publicAudioUrl: string;
  publicPaintUrl: string;
  publicWhiteboardUrl: string;
  publicSvgUrl: string;
  publicCyberchefUrl: string;
  publicScrubUrl: string;
  publicInstagramUrl: string;
  publicBridgeUrl: string;
  publicNotifyUrl: string;
  publicSecretUrl: string;
  publicDropUrl: string;
  publicStatusUrl: string;
  publicPythonUrl: string;
  publicTranscribeUrl: string;
  publicWakapiUrl: string;
  publicResumeUrl: string;
  publicDesignUrl: string;
  publicBudgetUrl: string;
  publicPollUrl: string;
  publicTumblrUrl: string;
  publicTenorUrl: string;
  publicFmdUrl: string;
  publicPollarisUrl: string;
  publicBinternetUrl: string;
  publicGothubUrl: string;
  publicTranslateUrl: string;
  publicBooksUrl: string;
  publicFourgetUrl: string;
  publicOverflowUrl: string;
  publicTwitchUrl: string;
  publicLyricsUrl: string;
  publicDegoogUrl: string;
  publicMumbleUrl: string;
  searxngDeployedVersion: string;
  listedServices: string[];
  enabledServices: string[];
  defaultLanguage: 'en' | 'es';
}

const defaults: PublicConfig = {
  publicPortalOrigin: '',
  projectName: 'Utilibre',
  projectTagline: '',
  projectTaglineEn: '',
  projectTaglineEs: '',
  sourceCodeUrl: '',
  supportUrl: '',
  contactUrl: '',
  publicSearchUrl: '',
  publicRedditUrl: '',
  publicRssUrl: '',
  publicPasteUrl: '',
  publicPdfUrl: '',
  publicConvertUrl: '',
  publicToolsUrl: '',
  publicDeveloperToolsUrl: '',
  publicEncryptUrl: '',
  publicDrawUrl: '',
  publicQrUrl: '',
  publicQrToolsUrl: '',
  publicZipUrl: '',
  publicChartsUrl: '',
  publicAudioUrl: '',
  publicPaintUrl: '',
  publicWhiteboardUrl: '',
  publicSvgUrl: '',
  publicCyberchefUrl: '',
  publicScrubUrl: '',
  publicInstagramUrl: '',
  publicBridgeUrl: '',
  publicNotifyUrl: '',
  publicSecretUrl: '',
  publicDropUrl: '',
  publicStatusUrl: '',
  publicPythonUrl: '',
  publicTranscribeUrl: '',
  publicWakapiUrl: '',
  publicResumeUrl: '',
  publicDesignUrl: '',
  publicBudgetUrl: '',
  publicPollUrl: '',
  publicTumblrUrl: '',
  publicTenorUrl: '',
  publicFmdUrl: '',
  publicPollarisUrl: '',
  publicBinternetUrl: '',
  publicGothubUrl: '',
  publicTranslateUrl: '',
  publicBooksUrl: '',
  publicFourgetUrl: '',
  publicOverflowUrl: '',
  publicTwitchUrl: '',
  publicLyricsUrl: '',
  publicDegoogUrl: '',
  publicMumbleUrl: '',
  searxngDeployedVersion: '',
  listedServices: [],
  enabledServices: [],
  defaultLanguage: 'en',
};

export const PUBLIC_CONFIG_TIMEOUT_MS = 5_000;

export async function loadPublicConfig(): Promise<PublicConfig> {
  // Production HTML includes only the same sanitized public fields as the
  // config endpoint. Boot from those fields without another request (and
  // without depending on crawlers fetching an intentionally blocked API).
  if (typeof document !== 'undefined') {
    const embedded = document.querySelector<HTMLScriptElement>('script#public-page-config[type="application/json"]');
    if (embedded?.textContent) {
      try { return normalizePublicConfig(JSON.parse(embedded.textContent)); } catch { /* Fall back to the public endpoint. */ }
    }
  }
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      requestPublicConfig(controller.signal),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error('public_config_timeout'));
        }, PUBLIC_CONFIG_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return defaults;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

async function requestPublicConfig(signal: AbortSignal): Promise<PublicConfig> {
  const response = await fetch('/_portal/config', {
    credentials: 'omit',
    cache: 'no-store',
    signal,
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return defaults;
  return normalizePublicConfig(await response.json());
}

function normalizePublicConfig(input: unknown): PublicConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return defaults;
  const value = input as Partial<PublicConfig>;
  return {
    ...defaults,
    ...Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === 'string')),
    enabledServices: Array.isArray(value.enabledServices) ? value.enabledServices.filter((item): item is string => typeof item === 'string') : [],
    listedServices: Array.isArray(value.listedServices) ? value.listedServices.filter((item): item is string => typeof item === 'string') : [],
    defaultLanguage: value.defaultLanguage === 'es' ? 'es' : 'en',
  };
}
