import axios from 'axios';

// API Base URL
const API_BASE_URL = 'http://localhost:5225/api';

// TypeScript interfaces for API responses
export interface GitHubUserInfo {
  username: string;
  avatarUrl: string;
  bio?: string;
  followers: number;
  following: number;
  publicRepos: number;
}

export interface LanguageInfo {
  bytes: number;
  percentage: number;
}

export interface LanguageStats {
  languages: Record<string, LanguageInfo>;
  totalBytes: number;
}

// Axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Functions
export const githubApi = {
  /**
   * Get GitHub user information
   * @param username - GitHub username
   * @returns Promise<GitHubUserInfo>
   */
  getUserInfo: async (username: string): Promise<GitHubUserInfo> => {
    try {
      const response = await api.get(`/github/user/${username}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`User '${username}' not found on GitHub.`);
        }
        throw new Error(`Failed to fetch user info: ${error.response?.data || error.message}`);
      }
      throw new Error('An unexpected error occurred while fetching user info.');
    }
  },

  /**
   * Get GitHub user language statistics
   * @param username - GitHub username
   * @returns Promise<LanguageStats>
   */
  getUserLanguageStats: async (username: string): Promise<LanguageStats> => {
    try {
      const response = await api.get(`/github/user/${username}/languages`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`User '${username}' not found on GitHub.`);
        }
        throw new Error(`Failed to fetch language stats: ${error.response?.data || error.message}`);
      }
      throw new Error('An unexpected error occurred while fetching language stats.');
    }
  },
};

export default api;