import type { IncomingMessage, ServerResponse } from 'node:http';

export interface DeveloperApiLimits {
  inboxTtlMs: number;
  webhookBodyBytes: number;
  webhookBodyReadTimeoutMs: number;
  webhookConcurrent: number;
  webhookConcurrentPerInbox: number;
  webhookEventsPerInbox: number;
  webhookBytesPerInbox: number;
  webhookListEvents: number;
  webhookListBytes: number;
  webhookListConcurrent: number;
  webhookListConcurrentPerInbox: number;
  webhookInboxesPerClient: number;
  webhookEventsPerClient: number;
  webhookBytesPerClient: number;
  globalInboxes: number;
  globalWebhookEvents: number;
  globalWebhookBytes: number;
  createRequestsPerWindow: number;
  createWindowMs: number;
  ingestRequestsPerIpWindow: number;
  ingestRequestsPerInboxWindow: number;
  ingestWindowMs: number;
  managementRequestsPerWindow: number;
  managementIpRequestsPerWindow: number;
  managementDeniedRequestsPerWindow: number;
  managementWindowMs: number;
  dnsRequestsPerWindow: number;
  dnsWindowMs: number;
  dnsConcurrent: number;
  dnsTimeoutMs: number;
  dnsRecords: number;
  dnsResponseBytes: number;
  limiterKeys: number;
}

export interface DeveloperApiOptions {
  limits?: Partial<DeveloperApiLimits>;
  webhookEnabled?: boolean;
  dnsEnabled?: boolean;
  now?: () => number;
  randomBytes?: (size: number) => Buffer;
  allowManagementRequest?: (request: IncomingMessage) => boolean;
  getClientKey?: (request: IncomingMessage) => string;
  resolveDns?: (hostname: string, type: string, timeoutMs: number) => Promise<unknown>;
}

export interface DeveloperApi {
  handle(request: IncomingMessage, response: ServerResponse, requestUrl: URL): Promise<boolean>;
  close(): void;
  limits: Readonly<DeveloperApiLimits>;
  stats(): {
    inboxes: number;
    events: number;
    eventBytes: number;
    activeWebhookRequests: number;
    activeWebhookListResponses: number;
    activeDnsRequests: number;
    rateBuckets: number;
  };
}

export const DEFAULT_DEVELOPER_API_LIMITS: Readonly<DeveloperApiLimits>;
export const HTTP_HEADER_INSPECTOR_ASSESSMENT: Readonly<{
  serverProxyImplemented: false;
  reason: string;
}>;
export function createDeveloperApi(options?: DeveloperApiOptions): DeveloperApi;
