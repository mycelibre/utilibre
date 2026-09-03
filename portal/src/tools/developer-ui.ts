import type { Language } from '../i18n';
import type { Translate } from '../utilities/dom';
import { renderLocalDeveloperTool, type LocalDeveloperToolId } from './developer-local-ui';
import { renderNetworkDeveloperTool, type NetworkDeveloperToolId } from './developer-network-ui';

export type DeveloperToolId = LocalDeveloperToolId | NetworkDeveloperToolId;

const localTools = new Set<DeveloperToolId>([
  'webhook-signature',
  'openapi',
  'jwt-inspect',
  'jwt-generate',
  'http-curl',
  'regex',
  'cron',
  'timestamp',
  'text-hashes',
  'uuid',
]);

export function renderDeveloperTool(id: DeveloperToolId, language: Language, t: Translate): HTMLElement {
  return localTools.has(id)
    ? renderLocalDeveloperTool(id as LocalDeveloperToolId, language, t)
    : renderNetworkDeveloperTool(id as NetworkDeveloperToolId, language);
}
