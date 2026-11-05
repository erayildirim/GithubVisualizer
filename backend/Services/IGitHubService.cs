using backend.Models;

namespace backend.Services;

public interface IGitHubService
{
    Task<GitHubUserInfo> GetUserInfoAsync(string username, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RepositorySummary>> GetUserRepositoriesAsync(string username, CancellationToken cancellationToken = default);
    Task<LanguageStats> GetUserLanguageStatsAsync(string username, CancellationToken cancellationToken = default);
    Task<ActivitySummary> GetUserActivityAsync(string username, CancellationToken cancellationToken = default);
    Task<ApiRateLimit> GetRateLimitAsync(CancellationToken cancellationToken = default);
}
