using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Octokit;

namespace backend.Tests;

public class GitHubApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly IGitHubService _service = Substitute.For<IGitHubService>();
    private readonly HttpClient _http;

    public GitHubApiTests(WebApplicationFactory<Program> factory)
    {
        _http = factory
            .WithWebHostBuilder(host =>
            {
                host.UseSetting("RateLimiting:PermitsPerMinute", "1000");
                host.ConfigureTestServices(services => services.AddSingleton(_service));
            })
            .CreateClient();
    }

    private static async Task<JsonElement> ReadProblem(HttpResponseMessage response)
    {
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task Profile_keeps_the_original_response_fields()
    {
        _service.GetUserInfoAsync("octocat", Arg.Any<CancellationToken>()).Returns(new GitHubUserInfo
        {
            Username = "octocat", AvatarUrl = "a", Bio = "b", Followers = 1, Following = 2, PublicRepos = 3,
        });

        var body = await _http.GetFromJsonAsync<JsonElement>("/api/github/user/octocat");

        Assert.Equal("octocat", body.GetProperty("username").GetString());
        Assert.Equal("a", body.GetProperty("avatarUrl").GetString());
        Assert.Equal("b", body.GetProperty("bio").GetString());
        Assert.Equal(1, body.GetProperty("followers").GetInt32());
        Assert.Equal(2, body.GetProperty("following").GetInt32());
        Assert.Equal(3, body.GetProperty("publicRepos").GetInt32());
    }

    [Fact]
    public async Task Language_response_reports_coverage()
    {
        _service.GetUserLanguageStatsAsync("octocat", Arg.Any<CancellationToken>()).Returns(new LanguageStats
        {
            RepositoriesAnalyzed = 1, RepositoriesEligible = 2,
        });

        var body = await _http.GetFromJsonAsync<JsonElement>("/api/github/user/octocat/languages");

        Assert.True(body.GetProperty("isPartial").GetBoolean());
        Assert.Equal(2, body.GetProperty("repositoriesEligible").GetInt32());
    }

    [Theory]
    [InlineData("-leading-hyphen")]
    [InlineData("has_underscore")]
    [InlineData("has.dot")]
    [InlineData("this-username-is-much-longer-than-thirty-nine-characters")]
    public async Task Invalid_usernames_are_rejected_without_calling_github(string username)
    {
        var response = await _http.GetAsync($"/api/github/user/{username}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await _service.DidNotReceiveWithAnyArgs().GetUserInfoAsync(default!);
    }

    [Fact]
    public async Task Unknown_user_is_a_404_problem()
    {
        _service.GetUserInfoAsync("ghost", Arg.Any<CancellationToken>())
            .ThrowsAsync(new NotFoundException("missing", HttpStatusCode.NotFound));

        var response = await _http.GetAsync("/api/github/user/ghost");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await ReadProblem(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Exhausted_quota_is_a_429_with_reset_time_and_retry_after()
    {
        var resetsAt = DateTimeOffset.UtcNow.AddMinutes(10);
        _service.GetUserLanguageStatsAsync("octocat", Arg.Any<CancellationToken>())
            .ThrowsAsync(new GitHubRateLimitException(resetsAt));

        var response = await _http.GetAsync("/api/github/user/octocat/languages");
        var problem = await ReadProblem(response);

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal("rate_limited", problem.GetProperty("code").GetString());
        Assert.Equal(resetsAt, problem.GetProperty("resetsAt").GetDateTimeOffset());
        Assert.InRange(response.Headers.RetryAfter!.Delta!.Value.TotalSeconds, 590, 601);
    }

    [Fact]
    public async Task A_rejected_token_is_reported_as_a_server_configuration_problem()
    {
        _service.GetUserInfoAsync("octocat", Arg.Any<CancellationToken>())
            .ThrowsAsync(new AuthorizationException(HttpStatusCode.Unauthorized, null));

        var response = await _http.GetAsync("/api/github/user/octocat");

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Equal("invalid_token", (await ReadProblem(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Unexpected_errors_do_not_leak_internal_details()
    {
        _service.GetUserInfoAsync("octocat", Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("secret connection string"));

        var response = await _http.GetAsync("/api/github/user/octocat");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.DoesNotContain("secret connection string", body);
    }

    [Fact]
    public async Task Health_endpoint_responds_and_the_template_endpoint_is_gone()
    {
        Assert.Equal(HttpStatusCode.OK, (await _http.GetAsync("/health")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _http.GetAsync("/weatherforecast")).StatusCode);
    }

    [Fact]
    public async Task Swagger_document_is_generated_in_development()
    {
        await using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(host => host.UseEnvironment("Development"));

        var response = await factory.CreateClient().GetAsync("/swagger/v1/swagger.json");

        response.EnsureSuccessStatusCode();
        Assert.Contains("/api/GitHub/user/{username}/activity", await response.Content.ReadAsStringAsync());
    }
}
