using System.Reflection;
using System.Threading.RateLimiting;
using backend.Infrastructure;
using backend.Options;
using backend.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Octokit;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOptions<GitHubOptions>().BindConfiguration(GitHubOptions.SectionName);

// GitHub access: one shared client and cache, so quota and cached responses are shared across requests.
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddMemoryCache(options => options.SizeLimit = 2_000);
builder.Services.AddSingleton<GitHubResponseCache>();
builder.Services.AddSingleton<IGitHubService, GitHubService>();
builder.Services.AddSingleton<IGitHubClient>(services =>
{
    var options = services.GetRequiredService<IOptions<GitHubOptions>>().Value;
    var client = new GitHubClient(new ProductHeaderValue("GitHubVisualizer"));
    client.SetRequestTimeout(TimeSpan.FromSeconds(options.RequestTimeoutSeconds));
    if (!string.IsNullOrWhiteSpace(options.Token))
    {
        client.Credentials = new Credentials(options.Token.Trim());
    }

    return client;
});

// HTTP API.
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddHealthChecks();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    var documentation = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
    options.IncludeXmlComments(documentation);
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(allowedOrigins).WithMethods(HttpMethods.Get).AllowAnyHeader());
});

// Per-client limit, so anonymous traffic can't drain the server's GitHub quota when it is deployed publicly.
var permitsPerMinute = builder.Configuration.GetValue("RateLimiting:PermitsPerMinute", 120);
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = permitsPerMinute, Window = TimeSpan.FromMinutes(1) }));

    options.OnRejected = async (rejected, cancellationToken) =>
    {
        var response = rejected.HttpContext.Response;
        response.StatusCode = StatusCodes.Status429TooManyRequests;
        response.Headers.RetryAfter = "60";

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Too many requests.",
        };
        problem.Extensions["code"] = "too_many_requests";
        await response.WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json", cancellationToken);
    };
});

// Only trusted behind the bundled nginx. Otherwise a client could spoof X-Forwarded-For to dodge the limiter.
var behindReverseProxy = builder.Configuration.GetValue("ReverseProxy:Enabled", false);
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

if (behindReverseProxy)
{
    app.UseForwardedHeaders();
}

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseRateLimiter();

app.MapHealthChecks("/health").DisableRateLimiting();
app.MapControllers();

if (string.IsNullOrWhiteSpace(app.Services.GetRequiredService<IOptions<GitHubOptions>>().Value.Token))
{
    app.Logger.LogWarning("No GitHub token configured: limited to 60 requests per hour. Set GitHub__Token to raise it.");
}

app.Run();

// Exposes the implicit Program class to the integration tests.
public partial class Program;
