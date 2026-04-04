using System.Threading.Tasks;

namespace backend.Services;

public interface IGitHubService
{
    Task<GitHubUserInfo> GetUserInfoAsync(string username);
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