import { useQuery } from '@tanstack/react-query';
import { githubApi } from '../services/api';

export const useUserInfo = (username: string) =>
  useQuery({
    queryKey: ['user', username.toLowerCase()],
    queryFn: ({ signal }) => githubApi.getUserInfo(username, signal),
  });

export const useRepositories = (username: string) =>
  useQuery({
    queryKey: ['repos', username.toLowerCase()],
    queryFn: ({ signal }) => githubApi.getUserRepositories(username, signal),
  });

export const useLanguages = (username: string) =>
  useQuery({
    queryKey: ['languages', username.toLowerCase()],
    queryFn: ({ signal }) => githubApi.getUserLanguageStats(username, signal),
  });

export const useActivity = (username: string) =>
  useQuery({
    queryKey: ['activity', username.toLowerCase()],
    queryFn: ({ signal }) => githubApi.getUserActivity(username, signal),
  });

export const useRateLimit = () =>
  useQuery({
    queryKey: ['rate-limit'],
    queryFn: ({ signal }) => githubApi.getRateLimit(signal),
    refetchInterval: 60_000,
    staleTime: 0,
    retry: false,
  });
