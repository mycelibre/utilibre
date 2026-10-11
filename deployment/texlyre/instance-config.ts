// TeXlyre's supported configuration; compiler/editor algorithms are unchanged.
import config from './texlyre.upstream.config';
config.title = 'TeXlyre · Utilibre';
config.tagline = 'Local LaTeX projects and PDF export';
config.url = 'https://latex.utilibre.org';
config.baseUrl = '/';
config.airgap = { allowedDomains: ['latex.utilibre.org'], allowedProtocols: ['https:'] };
config.plugins = {
  collaborative_viewers: ['bibtex'], viewers: ['bibtex', 'image', 'media', 'pdf'],
  renderers: ['pdf', 'canvas'], loggers: ['latex_visualizer', 'typst_visualizer'],
  bibliography: [], lsp: [], backup: [],
  themes: ['texlyre_slim', 'texlyre_wide', 'texlyre_compact', 'texlyre_mobile'],
};
Object.assign(config.userdata.default.settings, {
  offlineAirgapExternalRequests: true, offlineForceCollabOffline: true,
  collabAutoReconnect: false, collabSignalingServers: '',
  fileSyncEnable: false, fileSyncServerUrl: '', repositoryProxyUrl: '',
  latexEngine: 'busytex-pdftex', latexBusytexBundles: 'recommended',
  latexTexliveEndpoint: '', latexBusytexEndpoint: '',
  latexAutoCompileOnOpen: false, latexStoreWorkingDirectory: false,
  statusJsonUrl: '', statusPageUrl: '', templatesApiUrl: '',
  typstAllowRemoteContent: false,
});
config.userdata.local = {};
config.userdata.version = '1.3.5-utilibre1';
export default config;
