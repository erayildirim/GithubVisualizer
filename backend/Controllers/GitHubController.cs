using System.ComponentModel.DataAnnotations;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>Read-only insights about public GitHub accounts. Failures are mapped by ApiExceptionHandler.</summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
public class GitHubController(IGitHubService gitHubService) : ControllerBase
{
    // GitHub logins are at most 39 characters of letters, digits and hyphens, and never start with a hyphen.
    private const string UsernamePattern = "^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$";
    private const string UsernameMessage = "Enter a valid GitHub username.";

    /// <summary>Returns a user's or organization's public profile.</summary>
    [HttpGet("user/{username}")]
    [ProducesResponseType(typeof(GitHubUserInfo), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GitHubUserInfo>> GetUserInfo(
        [FromRoute, RegularExpression(UsernamePattern, ErrorMessage = UsernameMessage)] string username,
        CancellationToken cancellationToken) =>
        await gitHubService.GetUserInfoAsync(username, cancellationToken);

    /// <summary>Returns the account's public repositories, including forks.</summary>
    [HttpGet("user/{username}/repos")]
    [ProducesResponseType(typeof(IReadOnlyList<RepositorySummary>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<RepositorySummary>>> GetUserRepositories(
        [FromRoute, RegularExpression(UsernamePattern, ErrorMessage = UsernameMessage)] string username,
        CancellationToken cancellationToken) =>
        Ok(await gitHubService.GetUserRepositoriesAsync(username, cancellationToken));

    /// <summary>
    /// Returns language usage in bytes across original repositories. Largest repositories are analyzed first;
    /// when the API quota runs short the result covers fewer repositories and isPartial is true.
    /// </summary>
    [HttpGet("user/{username}/languages")]
    [ProducesResponseType(typeof(LanguageStats), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LanguageStats>> GetUserLanguageStats(
        [FromRoute, RegularExpression(UsernamePattern, ErrorMessage = UsernameMessage)] string username,
        CancellationToken cancellationToken) =>
        await gitHubService.GetUserLanguageStatsAsync(username, cancellationToken);

    /// <summary>Summarizes public activity from the last 30 days, the window GitHub keeps events for.</summary>
    [HttpGet("user/{username}/activity")]
    [ProducesResponseType(typeof(ActivitySummary), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivitySummary>> GetUserActivity(
        [FromRoute, RegularExpression(UsernamePattern, ErrorMessage = UsernameMessage)] string username,
        CancellationToken cancellationToken) =>
        await gitHubService.GetUserActivityAsync(username, cancellationToken);

    /// <summary>Returns the server's remaining GitHub API quota. Calling this does not consume quota.</summary>
    [HttpGet("rate-limit")]
    [ProducesResponseType(typeof(ApiRateLimit), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiRateLimit>> GetRateLimit(CancellationToken cancellationToken) =>
        await gitHubService.GetRateLimitAsync(cancellationToken);
}
