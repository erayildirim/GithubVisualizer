namespace backend.Options;

/// <summary>Settings bound from the "GitHub" configuration section.</summary>
public sealed class GitHubOptions
{
    public const string SectionName = "GitHub";

    /// <summary>
    /// Optional personal access token. Raises the GitHub quota from 60 to 5,000 requests per hour.
    /// Supply it through user secrets or the GitHub__Token environment variable, never appsettings.
    /// </summary>
    public string? Token { get; set; }

    /// <summary>How long successful GitHub responses are reused.</summary>
    public int CacheMinutes { get; set; } = 10;

    /// <summary>How long incomplete language results are reused, so they refresh soon after the quota resets.</summary>
    public int PartialResultCacheMinutes { get; set; } = 2;

    /// <summary>Upper bound on repositories inspected for one language breakdown.</summary>
    public int MaxLanguageRepositories { get; set; } = 100;

    /// <summary>Requests left untouched by language analysis so profile and repository lookups keep working.</summary>
    public int ReservedRequests { get; set; } = 5;

    /// <summary>Parallel per-repository language requests. Kept low to avoid GitHub's secondary rate limits.</summary>
    public int MaxParallelRequests { get; set; } = 5;

    /// <summary>Repository list pages to fetch (100 repositories per page).</summary>
    public int MaxRepositoryPages { get; set; } = 5;

    /// <summary>Timeout for a single request to GitHub.</summary>
    public int RequestTimeoutSeconds { get; set; } = 15;
}
