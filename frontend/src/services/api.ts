import axios from 'axios';

export interface GitHubUserInfo {
  username: string;
  name?: string | null;
  avatarUrl: string;
  htmlUrl: string;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  blog?: string | null;
  accountType: string;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  createdAt: string;
}

export interface RepositorySummary {
  name: string;
  htmlUrl: string;
  description?: string | null;
  homepage?: string | null;
  language?: string | null;
  license?: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  sizeKb: number;
  isFork: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  pushedAt?: string | null;
}

export interface LanguageInfo {
  bytes: number;
  percentage: number;
}

export interface LanguageStats {
  languages: Record<string, LanguageInfo>;
  totalBytes: number;
  repositoriesAnalyzed: number;
  repositoriesEligible: number;
  isPartial: boolean;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface ActivitySummary {
  totalEvents: number;
  from: string;
  to: string;
  byDay: { date: string; count: number }[];
  byType: NamedCount[];
  topRepositories: NamedCount[];
}

export interface ApiRateLimit {
  limit: number;
  remaining: number;
  resetsAt: string;
  authenticated: boolean;
}

export type ApiErrorCode =
  | 'not_found'
  | 'invalid_username'
  | 'rate_limited'
  | 'too_many_requests'
  | 'invalid_token'
  | 'upstream_timeout'
  | 'upstream_unreachable'
  | 'upstream_error'
  | 'network'
  | 'unknown';

/** A failed request, reduced to what the UI needs to explain it. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly resetsAt?: string;

  constructor(code: ApiErrorCode, status?: number, resetsAt?: string) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.resetsAt = resetsAt;
  }
}

const KNOWN_CODES: ApiErrorCode[] = [
  'not_found',
  'rate_limited',
  'too_many_requests',
  'invalid_token',
  'upstream_timeout',
  'upstream_unreachable',
  'upstream_error',
];

export function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError('unknown');
  }
  if (!error.response) {
    return new ApiError('network');
  }

  const { status, data } = error.response;
  const body = (typeof data === 'object' && data !== null ? data : {}) as { code?: string; resetsAt?: string };
  const code = KNOWN_CODES.find((known) => known === body.code);

  if (code) {
    return new ApiError(code, status, body.resetsAt);
  }
  if (status === 400) {
    return new ApiError('invalid_username', status);
  }
  if (status === 404) {
    return new ApiError('not_found', status);
  }
  // A 502/504 with no problem body means the backend itself is down behind the proxy.
  if (status === 502 || status === 503 || status === 504) {
    return new ApiError('network', status);
  }
  return new ApiError('unknown', status);
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 60_000,
});

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  try {
    const response = await http.get<T>(path, { signal });
    return response.data;
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error;
    }
    throw toApiError(error);
  }
}

const userPath = (username: string) => `/github/user/${encodeURIComponent(username)}`;

export const githubApi = {
  getUserInfo: (username: string, signal?: AbortSignal) =>
    get<GitHubUserInfo>(userPath(username), signal),
  getUserRepositories: (username: string, signal?: AbortSignal) =>
    get<RepositorySummary[]>(`${userPath(username)}/repos`, signal),
  getUserLanguageStats: (username: string, signal?: AbortSignal) =>
    get<LanguageStats>(`${userPath(username)}/languages`, signal),
  getUserActivity: (username: string, signal?: AbortSignal) =>
    get<ActivitySummary>(`${userPath(username)}/activity`, signal),
  getRateLimit: (signal?: AbortSignal) => get<ApiRateLimit>('/github/rate-limit', signal),
};
