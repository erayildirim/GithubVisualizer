using Octokit;
using System.Threading.Tasks;

namespace backend.Services;

public class GitHubService : IGitHubService
{
    private readonly GitHubClient _client;

    public GitHubService()
    {
        _client = new GitHubClient(new ProductHeaderValue("GitHubVisualizer"));
    }

    public async Task<GitHubUserInfo> GetUserInfoAsync(string username)
    {
        try
        {
            var user = await _client.User.Get(username);

            return new GitHubUserInfo
            {
                Username = user.Login,
                AvatarUrl = user.AvatarUrl,
                Bio = user.Bio,
                Followers = user.Followers,
                Following = user.Following,
                PublicRepos = user.PublicRepos
            };
        }
        catch (NotFoundException)
        {
            throw new ArgumentException($"User '{username}' not found on GitHub.");
        }
        catch (Exception ex)
        {
            throw new Exception($"Error fetching user info: {ex.Message}");
        }
    }
}