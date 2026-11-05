using System.Collections.Concurrent;
using backend.Models;
using backend.Options;
using Microsoft.Extensions.Options;
using Octokit;

namespace backend.Services;

public sealed class GitHubService(
    IGitHubClient client,
    GitHubResponseCache cache,
    IOptions<GitHubOptions> options,
    TimeProvider timeProvider,
    ILogger<GitHubService> logger) : IGitHubService
{
    private const int EventPageSize = 100;
    private const int EventPages = 3; // GitHub exposes at most 300 public events per user.
    private const int ActivityWindowDays = 30; // GitHub only keeps public events for 30 days.
    private const int RepositoryPageSize = 100;

    private readonly GitHubOptions _options = options.Value;
    private TimeSpan DefaultTtl => TimeSpan.FromMinutes(_options.CacheMinutes);

    public Task<GitHubUserInfo> GetUserInfoAsync(string username, CancellationToken cancellationToken = default) =>
        cache.GetOrAddAsync(
            Key("user", username),
            async () =>
            {
                var user = await client.User.Get(username);
                return new GitHubUserInfo
                {
                    Username = user.Login,
                    Name = user.Name,
                    AvatarUrl = user.AvatarUrl,
                    HtmlUrl = user.HtmlUrl,
                    Bio = user.Bio,
                    Company = user.Company,
                    Location = user.Location,
                    Blog = string.IsNullOrWhiteSpace(user.Blog) ? null : user.Blog,
                    AccountType = user.Type?.ToString() ?? "User",
                    Followers = user.Followers,
                    Following = user.Following,
                    PublicRepos = user.PublicRepos,
                    PublicGists = user.PublicGists,
                    CreatedAt = user.CreatedAt,
                };
            },
            _ => DefaultTtl,
            cancellationToken);

    public Task<IReadOnlyList<RepositorySummary>> GetUserRepositoriesAsync(string username, CancellationToken cancellationToken = default) =>
        cache.GetOrAddAsync<IReadOnlyList<RepositorySummary>>(
            Key("repos", username),
            async () =>
            {
                var paging = new ApiOptions
                {
                    PageSize = RepositoryPageSize,
                    PageCount = _options.MaxRepositoryPages,
                    StartPage = 1,
                };
                var repositories = await client.Repository.GetAllForUser(username, paging);
                return repositories.Select(ToSummary).ToList();
            },
            _ => DefaultTtl,
            cancellationToken);

    public Task<LanguageStats> GetUserLanguageStatsAsync(string username, CancellationToken cancellationToken = default) =>
        cache.GetOrAddAsync(
            Key("languages", username),
            () => BuildLanguageStatsAsync(username, cancellationToken),
            stats => stats.IsPartial ? TimeSpan.FromMinutes(_options.PartialResultCacheMinutes) : DefaultTtl,
            cancellationToken);

    public Task<ActivitySummary> GetUserActivityAsync(string username, CancellationToken cancellationToken = default) =>
        cache.GetOrAddAsync(
            Key("activity", username),
            async () =>
            {
                var paging = new ApiOptions { PageSize = EventPageSize, PageCount = EventPages, StartPage = 1 };
                var events = await client.Activity.Events.GetAllUserPerformedPublic(username, paging);
                return Summarize(events);
            },
            _ => DefaultTtl,
            cancellationToken);

    public async Task<ApiRateLimit> GetRateLimitAsync(CancellationToken cancellationToken = default)
    {
        // Asking GitHub for the rate limit does not count against it, so this is never cached.
        var limits = await client.RateLimit.GetRateLimits().WaitAsync(cancellationToken);
        return new ApiRateLimit
        {
            Limit = limits.Resources.Core.Limit,
            Remaining = limits.Resources.Core.Remaining,
            ResetsAt = limits.Resources.Core.Reset,
            Authenticated = !string.IsNullOrWhiteSpace(_options.Token),
        };
    }

    private async Task<LanguageStats> BuildLanguageStatsAsync(string username, CancellationToken cancellationToken)
    {
        var repositories = await GetUserRepositoriesAsync(username, cancellationToken);

        // Forks are someone else's code. Empty repositories and ones without a detected language
        // have no bytes to report, so skipping them saves a request each.
        var eligible = repositories
            .Where(r => !r.IsFork && r.SizeKb > 0 && r.Language is not null)
            .OrderByDescending(r => r.SizeKb)
            .ToList();

        if (eligible.Count == 0)
        {
            return new LanguageStats();
        }

        var quota = (await client.RateLimit.GetRateLimits()).Resources.Core;
        var budget = Math.Min(_options.MaxLanguageRepositories, quota.Remaining - _options.ReservedRequests);
        if (budget <= 0)
        {
            throw new GitHubRateLimitException(quota.Reset);
        }

        var totals = new ConcurrentDictionary<string, long>();
        var analyzed = 0;
        var quotaExhausted = 0;
        DateTimeOffset? resetsAt = null;

        await Parallel.ForEachAsync(
            eligible.Take(budget),
            new ParallelOptions { MaxDegreeOfParallelism = _options.MaxParallelRequests },
            async (repository, _) =>
            {
                if (Volatile.Read(ref quotaExhausted) == 1)
                {
                    return;
                }

                try
                {
                    var languages = await client.Repository.GetAllLanguages(username, repository.Name);
                    foreach (var language in languages)
                    {
                        totals.AddOrUpdate(language.Name, language.NumberOfBytes, (_, bytes) => bytes + language.NumberOfBytes);
                    }

                    Interlocked.Increment(ref analyzed);
                }
                catch (Exception ex) when (ex is RateLimitExceededException or SecondaryRateLimitExceededException or AbuseException)
                {
                    resetsAt = (ex as RateLimitExceededException)?.Reset ?? quota.Reset;
                    Volatile.Write(ref quotaExhausted, 1);
                    logger.LogWarning("GitHub quota ran out while analyzing languages for {Username}", username);
                }
                catch (ApiException ex) when (ex is not AuthorizationException)
                {
                    // One unavailable repository (for example a DMCA takedown) must not fail the whole breakdown.
                    // It is reported through RepositoriesAnalyzed being lower than RepositoriesEligible.
                    logger.LogInformation("Skipped languages for {Username}/{Repository}: {Status}", username, repository.Name, ex.StatusCode);
                }
            });

        if (analyzed == 0 && resetsAt is { } reset)
        {
            throw new GitHubRateLimitException(reset);
        }

        return ToLanguageStats(totals, analyzed, eligible.Count);
    }

    private static LanguageStats ToLanguageStats(IReadOnlyDictionary<string, long> totals, int analyzed, int eligible)
    {
        var totalBytes = totals.Values.Sum();
        var languages = new Dictionary<string, LanguageInfo>();
        foreach (var (name, bytes) in totals.OrderByDescending(t => t.Value).ThenBy(t => t.Key))
        {
            languages[name] = new LanguageInfo
            {
                Bytes = bytes,
                Percentage = totalBytes > 0 ? (double)bytes / totalBytes * 100 : 0,
            };
        }

        return new LanguageStats
        {
            Languages = languages,
            TotalBytes = totalBytes,
            RepositoriesAnalyzed = analyzed,
            RepositoriesEligible = eligible,
        };
    }

    private ActivitySummary Summarize(IReadOnlyList<Activity> events)
    {
        var to = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var from = to.AddDays(-(ActivityWindowDays - 1));

        var inWindow = events
            .Select(e => new { e.Type, Repository = e.Repo?.Name, Date = DateOnly.FromDateTime(e.CreatedAt.UtcDateTime) })
            .Where(e => e.Date >= from && e.Date <= to)
            .ToList();

        var countsByDay = inWindow.GroupBy(e => e.Date).ToDictionary(g => g.Key, g => g.Count());

        return new ActivitySummary
        {
            TotalEvents = inWindow.Count,
            From = from,
            To = to,
            ByDay = Enumerable.Range(0, ActivityWindowDays)
                .Select(offset => from.AddDays(offset))
                .Select(date => new DailyActivity(date, countsByDay.GetValueOrDefault(date)))
                .ToList(),
            ByType = CountBy(inWindow.Select(e => e.Type), limit: 8),
            TopRepositories = CountBy(inWindow.Select(e => e.Repository), limit: 5),
        };
    }

    private static List<NamedCount> CountBy(IEnumerable<string?> values, int limit) =>
        values
            .Where(value => !string.IsNullOrEmpty(value))
            .GroupBy(value => value!)
            .Select(group => new NamedCount(group.Key, group.Count()))
            .OrderByDescending(entry => entry.Count)
            .ThenBy(entry => entry.Name)
            .Take(limit)
            .ToList();

    private static RepositorySummary ToSummary(Repository repository) => new()
    {
        Name = repository.Name,
        HtmlUrl = repository.HtmlUrl,
        Description = repository.Description,
        Homepage = string.IsNullOrWhiteSpace(repository.Homepage) ? null : repository.Homepage,
        Language = repository.Language,
        License = repository.License?.SpdxId,
        Topics = repository.Topics ?? [],
        Stars = repository.StargazersCount,
        Forks = repository.ForksCount,
        OpenIssues = repository.OpenIssuesCount,
        SizeKb = repository.Size,
        IsFork = repository.Fork,
        IsArchived = repository.Archived,
        CreatedAt = repository.CreatedAt,
        UpdatedAt = repository.UpdatedAt,
        PushedAt = repository.PushedAt,
    };

    private static string Key(string resource, string username) => $"{resource}:{username.ToLowerInvariant()}";
}
