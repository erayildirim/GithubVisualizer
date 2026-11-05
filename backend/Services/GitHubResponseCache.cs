using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;

namespace backend.Services;

/// <summary>
/// Memory cache that also shares in-flight work. A dashboard asks for several resources at once, and two
/// of them need the same repository list, so simultaneous callers must not each spend GitHub quota.
/// Failures are never cached.
/// </summary>
public sealed class GitHubResponseCache(IMemoryCache cache)
{
    private readonly ConcurrentDictionary<string, Lazy<Task<object>>> _inFlight = new();

    public async Task<T> GetOrAddAsync<T>(
        string key,
        Func<Task<T>> factory,
        Func<T, TimeSpan> timeToLive,
        CancellationToken cancellationToken)
        where T : class
    {
        if (cache.TryGetValue(key, out T? cached) && cached is not null)
        {
            return cached;
        }

        var work = _inFlight.GetOrAdd(key, static (_, state) => state, new Lazy<Task<object>>(async () =>
        {
            try
            {
                var value = await factory();
                cache.Set(key, value, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = timeToLive(value),
                    Size = 1,
                });
                return value;
            }
            finally
            {
                _inFlight.TryRemove(key, out _);
            }
        }));

        // The upstream call is shared, so one caller disconnecting only stops that caller's wait.
        return (T)await work.Value.WaitAsync(cancellationToken);
    }
}
