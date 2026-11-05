namespace backend.Services;

/// <summary>Raised when the quota is too low to start or finish work that has nothing useful to return yet.</summary>
public sealed class GitHubRateLimitException(DateTimeOffset resetsAt)
    : Exception($"GitHub API rate limit reached. It resets at {resetsAt:O}.")
{
    public DateTimeOffset ResetsAt { get; } = resetsAt;
}
