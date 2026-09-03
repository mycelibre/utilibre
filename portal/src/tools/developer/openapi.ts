export type OpenApiObject = Record<string, unknown>;
export type YamlParser = (source: string) => unknown;

export interface ParseOpenApiOptions {
  yamlParser?: YamlParser;
  maxSourceLength?: number;
}

export interface OpenApiReferenceSummary {
  value: string;
  kind: 'local' | 'remote';
}

export interface OpenApiEndpoint {
  method: OpenApiMethod;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  deprecated: boolean;
  parameterCount: number;
  hasRequestBody: boolean;
  responseStatuses: string[];
}

export interface OpenApiSummary {
  format: 'openapi-3' | 'swagger-2';
  specificationVersion: string;
  title: string | null;
  apiVersion: string | null;
  description: string | null;
  serverUrls: string[];
  endpoints: OpenApiEndpoint[];
  endpointCount: number;
  endpointsTruncated: boolean;
  references: OpenApiReferenceSummary[];
  referencesTruncated: boolean;
}

export interface OpenApiSummaryOptions {
  maxEndpoints?: number;
  maxReferences?: number;
}

export type OpenApiMethod = 'GET' | 'PUT' | 'POST' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'PATCH' | 'TRACE';

const METHODS: Readonly<Record<string, OpenApiMethod>> = {
  get: 'GET',
  put: 'PUT',
  post: 'POST',
  delete: 'DELETE',
  options: 'OPTIONS',
  head: 'HEAD',
  patch: 'PATCH',
  trace: 'TRACE',
};
const DEFAULT_MAX_SOURCE_LENGTH = 2 * 1_024 * 1_024;
const DEFAULT_MAX_ENDPOINTS = 1_000;
const DEFAULT_MAX_REFERENCES = 1_000;
const MAX_TREE_NODES = 100_000;
const MAX_TREE_DEPTH = 100;

export class OpenApiYamlParserRequiredError extends Error {
  constructor() {
    super('This looks like YAML. A local YAML parser is required; the document was not sent anywhere.');
    this.name = 'OpenApiYamlParserRequiredError';
  }
}

export function parseOpenApiDocument(source: string, options: ParseOpenApiOptions = {}): OpenApiObject {
  const maxLength = options.maxSourceLength ?? DEFAULT_MAX_SOURCE_LENGTH;
  if (source.trim().length === 0) throw new Error('The OpenAPI document cannot be empty.');
  if (source.length > maxLength || new TextEncoder().encode(source).byteLength > maxLength) {
    throw new Error('The OpenAPI document is too large to inspect in the browser.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (jsonError) {
    if (!options.yamlParser) throw new OpenApiYamlParserRequiredError();
    try {
      parsed = options.yamlParser(source);
    } catch {
      throw new Error(jsonError instanceof Error ? `The document is not valid JSON or YAML. JSON parser: ${jsonError.message}` : 'The document is not valid JSON or YAML.');
    }
  }

  if (!isObject(parsed)) throw new Error('An OpenAPI document must contain an object at its root.');
  assertBoundedTree(parsed);
  return parsed;
}

export function summarizeOpenApi(document: OpenApiObject, options: OpenApiSummaryOptions = {}): OpenApiSummary {
  const maxEndpoints = boundedSummaryLimit(options.maxEndpoints ?? DEFAULT_MAX_ENDPOINTS, 'endpoint');
  const maxReferences = boundedSummaryLimit(options.maxReferences ?? DEFAULT_MAX_REFERENCES, 'reference');
  const openapi = stringValue(document.openapi);
  const swagger = stringValue(document.swagger);
  let format: OpenApiSummary['format'];
  let specificationVersion: string;
  if (openapi?.startsWith('3.')) {
    format = 'openapi-3';
    specificationVersion = openapi;
  } else if (swagger === '2.0') {
    format = 'swagger-2';
    specificationVersion = swagger;
  } else {
    throw new Error('Only OpenAPI 3.x and Swagger 2.0 documents are supported.');
  }

  const info = isObject(document.info) ? document.info : null;
  const paths = isObject(document.paths) ? document.paths : null;
  if (!paths) throw new Error('The OpenAPI document does not contain a paths object.');

  const endpoints: OpenApiEndpoint[] = [];
  let endpointCount = 0;
  for (const [path, pathValue] of Object.entries(paths)) {
    if (!path.startsWith('/') || !isObject(pathValue)) continue;
    const pathParameterCount = arrayLength(pathValue.parameters);
    for (const [methodName, methodValue] of Object.entries(pathValue)) {
      const method = METHODS[methodName.toLowerCase()];
      if (!method || !isObject(methodValue)) continue;
      endpointCount += 1;
      if (endpoints.length >= maxEndpoints) continue;
      endpoints.push({
        method,
        path,
        operationId: stringValue(methodValue.operationId) ?? undefined,
        summary: stringValue(methodValue.summary) ?? undefined,
        description: stringValue(methodValue.description) ?? undefined,
        tags: stringArray(methodValue.tags),
        deprecated: methodValue.deprecated === true,
        parameterCount: pathParameterCount + arrayLength(methodValue.parameters),
        hasRequestBody: Object.hasOwn(methodValue, 'requestBody'),
        responseStatuses: isObject(methodValue.responses) ? Object.keys(methodValue.responses) : [],
      });
    }
  }

  endpoints.sort((left, right) => left.path.localeCompare(right.path) || left.method.localeCompare(right.method));
  const referenceResult = collectReferences(document, maxReferences);
  return {
    format,
    specificationVersion,
    title: stringValue(info?.title),
    apiVersion: stringValue(info?.version),
    description: stringValue(info?.description),
    serverUrls: extractServerUrls(document, format),
    endpoints,
    endpointCount,
    endpointsTruncated: endpointCount > endpoints.length,
    references: referenceResult.references,
    referencesTruncated: referenceResult.truncated,
  };
}

function extractServerUrls(document: OpenApiObject, format: OpenApiSummary['format']): string[] {
  if (format === 'openapi-3') {
    if (!Array.isArray(document.servers)) return [];
    return document.servers
      .map((server) => isObject(server) ? stringValue(server.url) : null)
      .filter((value): value is string => value !== null);
  }

  const host = stringValue(document.host);
  if (!host) return [];
  const basePath = stringValue(document.basePath) ?? '';
  const schemes = stringArray(document.schemes);
  return (schemes.length > 0 ? schemes : ['https']).map((scheme) => `${scheme}://${host}${basePath}`);
}

function collectReferences(root: unknown, maximum: number): { references: OpenApiReferenceSummary[]; truncated: boolean } {
  const references = new Map<string, OpenApiReferenceSummary['kind']>();
  const stack: unknown[] = [root];
  const seen = new WeakSet<object>();
  let truncated = false;
  let visited = 0;
  while (stack.length > 0) {
    const value = stack.pop();
    visited += 1;
    if (visited > MAX_TREE_NODES) throw new Error('The OpenAPI document contains too many values to inspect safely.');
    if (Array.isArray(value)) {
      if (seen.has(value)) continue;
      seen.add(value);
      stack.push(...value);
      continue;
    }
    if (!isObject(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    const reference = stringValue(value.$ref);
    if (reference && !references.has(reference)) {
      if (references.size < maximum) references.set(reference, reference.startsWith('#') ? 'local' : 'remote');
      else truncated = true;
    }
    stack.push(...Object.values(value));
  }
  return {
    references: [...references.entries()]
      .map(([value, kind]) => ({ value, kind }))
      .sort((left, right) => left.value.localeCompare(right.value)),
    truncated,
  };
}

function assertBoundedTree(root: unknown): void {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];
  const seen = new WeakSet<object>();
  let visited = 0;
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) break;
    visited += 1;
    if (visited > MAX_TREE_NODES) throw new Error('The OpenAPI document contains too many values to inspect safely.');
    if (entry.depth > MAX_TREE_DEPTH) throw new Error('The OpenAPI document is nested too deeply to inspect safely.');
    if (Array.isArray(entry.value)) {
      if (seen.has(entry.value)) continue;
      seen.add(entry.value);
      for (const value of entry.value) stack.push({ value, depth: entry.depth + 1 });
    } else if (isObject(entry.value)) {
      if (seen.has(entry.value)) continue;
      seen.add(entry.value);
      for (const value of Object.values(entry.value)) stack.push({ value, depth: entry.depth + 1 });
    }
  }
}

function isObject(value: unknown): value is OpenApiObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function boundedSummaryLimit(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 10_000) {
    throw new Error(`The OpenAPI ${label} display limit must be between 1 and 10,000.`);
  }
  return value;
}
