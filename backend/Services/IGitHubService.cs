using System.Threading.Tasks;

namespace backend.Services;

public interface IGitHubService
{
    Task<GitHubUserInfo> GetUserInfoAsync(string username);
    Task<LanguageStats> GetUserLanguageStatsAsync(string username);
}

public class GitHubUserInfo
{
    public string Username { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public int Followers { get; set; }
    public int Following { get; set; }
    public int PublicRepos { get; set; }
}

public class LanguageStats
{
    public Dictionary<string, LanguageInfo> Languages { get; set; } = new();
    public long TotalBytes { get; set; }
}

public class LanguageInfo
{
    public long Bytes { get; set; }
    public double Percentage { get; set; }
}