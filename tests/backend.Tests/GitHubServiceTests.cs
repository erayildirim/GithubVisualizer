using System.Net;
using backend.Models;
using backend.Options;
using backend.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Octokit;
using Octokit.Internal;

namespace backend.Tests;

public class GitHubServiceTests
{
    private const string User = "octocat";

    private readonly IGitHubClient _client = Substitute.For<IGitHubClient>();
    private readonly SimpleJsonSerializer _json = new();
    private readonly GitHubOptions _options = new() { ReservedRequests = 5, MaxLanguageRepositories = 100, MaxParallelRequests = 1 };

    private GitHubService CreateService(TimeProvider? time = null) => new(
        _client,
        new GitHubResponseCache(new MemoryCache(new MemoryCacheOptions { SizeLimit = 100 })),
        Microsoft.Extensions.Options.Options.Create(_options),
        time ?? TimeProvider.System,
        NullLogger<GitHubService>.Instance);

    private Repository Repo(string name, string? language = "C#", long size = 10, bool fork = false) =>
        _json.Deserialize<Repository>(
            $$"""
            { "name": "{{name}}", "language": {{(language is null ? "null" : $"\"{language}\"")}},
              "size": {{size}}, "fork": {{fork.ToString().ToLowerInvariant()}}, "stargazers_count": 3 }
            """);

    private void GivenRepositories(params Repository[] repositories) =>
        _client.Repository.GetAllForUser(User, Arg.Any<ApiOptions>()).Returns(repositories);

    private void GivenLanguages(string repository, params (string Name, long Bytes)[] languages) =>
        _client.Repository.GetAllLanguages(User, repository)
            .Returns(languages.Select(l => new RepositoryLanguage(l.Name, l.Bytes)).ToList());

    private void GivenRemainingQuota(int remaining) =>
        _client.RateLimit.GetRateLimits().Returns(_json.Deserialize<MiscellaneousRateLimit>(
            $$"""{ "resources": { "core": { "limit": 60, "remaining": {{remaining}}, "reset": 1893456000 } } }"""));

    private static RateLimitExceededException RateLimitError()
    {
        var response = Substitute.For<IResponse>();
        response.StatusCode.Returns(HttpStatusCode.Forbidden);
        response.Headers.Returns(new Dictionary<string, string>());
        response.ApiInfo.Returns(new ApiInfo(
            new Dictionary<string, Uri>(),
            new List<string>(),
            new List<string>(),
            "etag",
            new RateLimit(60, 0, 1893456000)));
        return new RateLimitExceededException(response);
    }

    [Fact]
    public async Task Languages_are_summed_and_ordered_and_skip_forks_and_empty_repositories()
    {
        GivenRemainingQuota(60);
        GivenRepositories(
            Repo("api"),
            Repo("web", "TypeScript"),
            Repo("forked", fork: true),
            Repo("empty", size: 0),
            Repo("docs", language: null));
        GivenLanguages("api", ("C#", 300), ("HTML", 100));
        GivenLanguages("web", ("TypeScript", 500), ("HTML", 100));

        var stats = await CreateService().GetUserLanguageStatsAsync(User);

        Assert.Equal(new[] { "TypeScript", "C#", "HTML" }, stats.Languages.Keys);
        Assert.Equal(1000, stats.TotalBytes);
        Assert.Equal(50, stats.Languages["TypeScript"].Percentage);
        Assert.Equal(200, stats.Languages["HTML"].Bytes);
        Assert.False(stats.IsPartial);

        await _client.Repository.DidNotReceive().GetAllLanguages(User, "forked");
        await _client.Repository.DidNotReceive().GetAllLanguages(User, "empty");
        await _client.Repository.DidNotReceive().GetAllLanguages(User, "docs");
    }

    [Fact]
    public async Task Low_quota_analyzes_the_largest_repositories_and_reports_a_partial_result()
    {
        GivenRemainingQuota(7); // 5 are reserved, which leaves a budget of 2.
        GivenRepositories(Repo("small", size: 1), Repo("large", size: 100), Repo("medium", size: 50));
        GivenLanguages("large", ("C#", 10));
        GivenLanguages("medium", ("C#", 10));

        var stats = await CreateService().GetUserLanguageStatsAsync(User);

        Assert.True(stats.IsPartial);
        Assert.Equal(2, stats.RepositoriesAnalyzed);
        Assert.Equal(3, stats.RepositoriesEligible);
        await _client.Repository.DidNotReceive().GetAllLanguages(User, "small");
    }

    [Fact]
    public async Task Quota_running_out_midway_returns_what_was_collected_instead_of_hiding_it()
    {
        GivenRemainingQuota(60);
        GivenRepositories(Repo("first", size: 100), Repo("second", size: 50), Repo("third", size: 10));
        GivenLanguages("first", ("C#", 10));
        var quotaError = RateLimitError(); // Built first: NSubstitute can't configure a substitute inside another's setup.
        _client.Repository.GetAllLanguages(User, "second").ThrowsAsync(quotaError);

        var stats = await CreateService().GetUserLanguageStatsAsync(User);

        Assert.True(stats.IsPartial);
        Assert.Equal(1, stats.RepositoriesAnalyzed);
        Assert.Equal(3, stats.RepositoriesEligible);
        await _client.Repository.DidNotReceive().GetAllLanguages(User, "third");
    }

    [Fact]
    public async Task No_quota_left_fails_with_the_reset_time_rather_than_returning_an_empty_chart()
    {
        GivenRemainingQuota(5);
        GivenRepositories(Repo("api"));

        var error = await Assert.ThrowsAsync<GitHubRateLimitException>(() => CreateService().GetUserLanguageStatsAsync(User));

        Assert.Equal(DateTimeOffset.FromUnixTimeSeconds(1893456000), error.ResetsAt);
    }

    [Fact]
    public async Task One_unavailable_repository_does_not_fail_the_breakdown_and_is_reported()
    {
        GivenRemainingQuota(60);
        GivenRepositories(Repo("blocked"), Repo("fine"));
        _client.Repository.GetAllLanguages(User, "blocked")
            .ThrowsAsync(new ApiException("DMCA", HttpStatusCode.UnavailableForLegalReasons));
        GivenLanguages("fine", ("Go", 10));

        var stats = await CreateService().GetUserLanguageStatsAsync(User);

        Assert.Equal(new[] { "Go" }, stats.Languages.Keys);
        Assert.True(stats.IsPartial);
    }

    [Fact]
    public async Task An_account_without_code_gets_an_empty_result_and_spends_no_language_requests()
    {
        GivenRepositories(Repo("empty", size: 0));

        var stats = await CreateService().GetUserLanguageStatsAsync(User);

        Assert.Empty(stats.Languages);
        Assert.False(stats.IsPartial);
        await _client.RateLimit.DidNotReceive().GetRateLimits();
    }

    [Fact]
    public async Task Repeated_and_simultaneous_requests_share_one_github_call_regardless_of_username_case()
    {
        var gate = new TaskCompletionSource<IReadOnlyList<Repository>>();
        _client.Repository.GetAllForUser(Arg.Any<string>(), Arg.Any<ApiOptions>()).Returns(gate.Task);
        var service = CreateService();

        var first = service.GetUserRepositoriesAsync("octocat");
        var second = service.GetUserRepositoriesAsync("OCTOCAT");
        gate.SetResult(new[] { Repo("api") });
        await Task.WhenAll(first, second);
        await service.GetUserRepositoriesAsync("octocat");

        await _client.Repository.Received(1).GetAllForUser(Arg.Any<string>(), Arg.Any<ApiOptions>());
    }

    [Fact]
    public async Task Failures_are_not_cached()
    {
        _client.Repository.GetAllForUser(User, Arg.Any<ApiOptions>())
            .Returns(
                _ => Task.FromException<IReadOnlyList<Repository>>(new ApiException("boom", HttpStatusCode.BadGateway)),
                _ => Task.FromResult<IReadOnlyList<Repository>>(new[] { Repo("api") }));
        var service = CreateService();

        await Assert.ThrowsAsync<ApiException>(() => service.GetUserRepositoriesAsync(User));
        var repositories = await service.GetUserRepositoriesAsync(User);

        Assert.Single(repositories);
    }

    [Fact]
    public async Task Unknown_users_propagate_not_found()
    {
        _client.User.Get("ghost").ThrowsAsync(new NotFoundException("missing", HttpStatusCode.NotFound));

        await Assert.ThrowsAsync<NotFoundException>(() => CreateService().GetUserInfoAsync("ghost"));
    }

    [Fact]
    public async Task Activity_fills_the_full_window_and_ignores_older_events()
    {
        var now = new DateTimeOffset(2026, 11, 5, 12, 0, 0, TimeSpan.Zero);
        _client.Activity.Events.GetAllUserPerformedPublic(User, Arg.Any<ApiOptions>()).Returns(new[]
        {
            Event("PushEvent", "octocat/api", now),
            Event("PushEvent", "octocat/api", now.AddDays(-1)),
            Event("WatchEvent", "octocat/web", now.AddDays(-1)),
            Event("PushEvent", "octocat/old", now.AddDays(-30)),
        });

        ActivitySummary activity = await CreateService(new FixedTime(now)).GetUserActivityAsync(User);

        Assert.Equal(30, activity.ByDay.Count);
        Assert.Equal(new DateOnly(2026, 10, 7), activity.From);
        Assert.Equal(new DateOnly(2026, 11, 5), activity.To);
        Assert.Equal(3, activity.TotalEvents);
        Assert.Equal(1, activity.ByDay[^1].Count);
        Assert.Equal(2, activity.ByDay[^2].Count);
        Assert.Equal(0, activity.ByDay[0].Count);
        Assert.Equal(new NamedCount("PushEvent", 2), activity.ByType[0]);
        Assert.Equal(new NamedCount("octocat/api", 2), activity.TopRepositories[0]);
        Assert.DoesNotContain(activity.TopRepositories, r => r.Name == "octocat/old");
    }

    private Activity Event(string type, string repository, DateTimeOffset createdAt) =>
        _json.Deserialize<Activity>(
            $$"""{ "type": "{{type}}", "repo": { "name": "{{repository}}" }, "created_at": "{{createdAt:yyyy-MM-ddTHH:mm:ssZ}}" }""");

    private sealed class FixedTime(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
