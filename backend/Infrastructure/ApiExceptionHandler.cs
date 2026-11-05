using System.Net;
using backend.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Octokit;

namespace backend.Infrastructure;

/// <summary>
/// Turns failures into RFC 9457 problem responses. The "code" extension is a stable identifier
/// the frontend translates; raw exception text is logged and never sent to the client.
/// </summary>
public sealed class ApiExceptionHandler(IProblemDetailsService problemDetails, ILogger<ApiExceptionHandler> logger)
    : IExceptionHandler
{
    private const int ClientClosedRequest = 499;

    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException && context.RequestAborted.IsCancellationRequested)
        {
            context.Response.StatusCode = ClientClosedRequest;
            return true;
        }

        var failure = Describe(exception);

        if (failure.Status >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Request {Path} failed with {Code}", context.Request.Path, failure.Code);
        }

        context.Response.StatusCode = failure.Status;

        var problem = new ProblemDetails { Status = failure.Status, Title = failure.Title };
        problem.Extensions["code"] = failure.Code;

        if (failure.ResetsAt is { } resetsAt)
        {
            problem.Extensions["resetsAt"] = resetsAt;
            var wait = (long)Math.Ceiling((resetsAt - DateTimeOffset.UtcNow).TotalSeconds);
            context.Response.Headers.RetryAfter = Math.Max(wait, 1).ToString();
        }

        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problem,
            Exception = exception,
        });
    }

    private static Failure Describe(Exception exception) => exception switch
    {
        NotFoundException => new(StatusCodes.Status404NotFound, "not_found", "GitHub user not found."),

        GitHubRateLimitException limit =>
            new(StatusCodes.Status429TooManyRequests, "rate_limited", "GitHub API rate limit reached.", limit.ResetsAt),
        RateLimitExceededException limit =>
            new(StatusCodes.Status429TooManyRequests, "rate_limited", "GitHub API rate limit reached.", limit.Reset),
        SecondaryRateLimitExceededException or AbuseException =>
            new(StatusCodes.Status429TooManyRequests, "rate_limited", "GitHub asked this server to slow down."),

        AuthorizationException =>
            new(StatusCodes.Status502BadGateway, "invalid_token", "GitHub rejected the token configured on the server."),
        ForbiddenException =>
            new(StatusCodes.Status502BadGateway, "upstream_error", "GitHub refused the request."),
        ApiException { StatusCode: HttpStatusCode.UnavailableForLegalReasons } =>
            new(StatusCodes.Status404NotFound, "not_found", "This GitHub resource is not available."),
        ApiException =>
            new(StatusCodes.Status502BadGateway, "upstream_error", "GitHub returned an unexpected response."),

        // HttpClient reports its own timeout as a cancellation that no caller asked for.
        OperationCanceledException or TimeoutException =>
            new(StatusCodes.Status504GatewayTimeout, "upstream_timeout", "GitHub took too long to respond."),
        HttpRequestException =>
            new(StatusCodes.Status503ServiceUnavailable, "upstream_unreachable", "GitHub could not be reached."),

        _ => new(StatusCodes.Status500InternalServerError, "internal_error", "An unexpected error occurred."),
    };

    private sealed record Failure(int Status, string Code, string Title, DateTimeOffset? ResetsAt = null);
}
