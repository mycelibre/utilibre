import { runRegex, type RegexLimits, type RegexResult } from './regex';

export interface RegexWorkerRequest {
  id: string;
  pattern: string;
  flags: string;
  input: string;
  limits?: RegexLimits;
}

export interface RegexWorkerSuccess {
  id: string;
  ok: true;
  result: RegexResult;
}

export interface RegexWorkerFailure {
  id: string;
  ok: false;
  error: string;
}

export type RegexWorkerResponse = RegexWorkerSuccess | RegexWorkerFailure;

export function handleRegexWorkerRequest(request: RegexWorkerRequest): RegexWorkerResponse {
  try {
    return {
      id: request.id,
      ok: true,
      result: runRegex(request.pattern, request.flags, request.input, request.limits),
    };
  } catch (error) {
    return {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : 'The regular expression could not be evaluated.',
    };
  }
}
