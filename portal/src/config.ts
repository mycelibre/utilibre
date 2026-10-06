export interface PublicConfig {
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
  listedServices: string[];
  enabledServices: string[];
  defaultLanguage: 'en' | 'es';
}

const defaults: PublicConfig = {
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
  listedServices: [],
  enabledServices: [],
  defaultLanguage: 'en',
};

export const PUBLIC_CONFIG_TIMEOUT_MS = 5_000;

export async function loadPublicConfig(): Promise<PublicConfig> {
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
  const value = await response.json() as Partial<PublicConfig>;
  return {
    ...defaults,
    ...Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === 'string')),
    enabledServices: Array.isArray(value.enabledServices) ? value.enabledServices.filter((item): item is string => typeof item === 'string') : [],
    listedServices: Array.isArray(value.listedServices) ? value.listedServices.filter((item): item is string => typeof item === 'string') : [],
    defaultLanguage: value.defaultLanguage === 'es' ? 'es' : 'en',
  };
}
