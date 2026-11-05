namespace backend.Models;

public sealed class GitHubUserInfo
{
    public string Username { get; init; } = string.Empty;
    public string? Name { get; init; }
    public string AvatarUrl { get; init; } = string.Empty;
    public string HtmlUrl { get; init; } = string.Empty;
    public string? Bio { get; init; }
    public string? Company { get; init; }
    public string? Location { get; init; }
    public string? Blog { get; init; }
    public string AccountType { get; init; } = "User";
    public int Followers { get; init; }
    public int Following { get; init; }
    public int PublicRepos { get; init; }
    public int PublicGists { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed class RepositorySummary
{
    public string Name { get; init; } = string.Empty;
    public string HtmlUrl { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? Homepage { get; init; }
    public string? Language { get; init; }
    public string? License { get; init; }
    public IReadOnlyList<string> Topics { get; init; } = [];
    public int Stars { get; init; }
    public int Forks { get; init; }
    public int OpenIssues { get; init; }
    public long SizeKb { get; init; }
    public bool IsFork { get; init; }
    public bool IsArchived { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public DateTimeOffset? PushedAt { get; init; }
}

public sealed class LanguageInfo
{
    public long Bytes { get; init; }
    public double Percentage { get; init; }
}

public sealed class LanguageStats
{
    /// <summary>Languages keyed by name, ordered from most to fewest bytes.</summary>
    public Dictionary<string, LanguageInfo> Languages { get; init; } = new();
    public long TotalBytes { get; init; }

    /// <summary>Repositories whose language bytes were included.</summary>
    public int RepositoriesAnalyzed { get; init; }

    /// <summary>Non-fork, non-empty repositories that could have been included.</summary>
    public int RepositoriesEligible { get; init; }

    /// <summary>True when some eligible repositories are missing, usually because of the API quota.</summary>
    public bool IsPartial => RepositoriesAnalyzed < RepositoriesEligible;
}

public sealed record DailyActivity(DateOnly Date, int Count);

public sealed record NamedCount(string Name, int Count);

public sealed class ActivitySummary
{
    public int TotalEvents { get; init; }
    public DateOnly From { get; init; }
    public DateOnly To { get; init; }
    public IReadOnlyList<DailyActivity> ByDay { get; init; } = [];
    public IReadOnlyList<NamedCount> ByType { get; init; } = [];
    public IReadOnlyList<NamedCount> TopRepositories { get; init; } = [];
}

public sealed class ApiRateLimit
{
    public int Limit { get; init; }
    public int Remaining { get; init; }
    public DateTimeOffset ResetsAt { get; init; }
    public bool Authenticated { get; init; }
}
