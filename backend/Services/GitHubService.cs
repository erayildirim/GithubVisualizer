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

    public async Task<LanguageStats> GetUserLanguageStatsAsync(string username)
    {
        try
        {
            var repositories = await _client.Repository.GetAllForUser(username);
            var languageStats = new Dictionary<string, long>();

            foreach (var repo in repositories)
            {
                if (repo.Fork) continue; // Fork edilmiş repoları atla

                try
                {
                    var languages = await _client.Repository.GetAllLanguages(repo.Owner.Login, repo.Name);

                    foreach (var language in languages)
                    {
                        if (languageStats.ContainsKey(language.Name))
                        {
                            languageStats[language.Name] += language.NumberOfBytes;
                        }
                        else
                        {
                            languageStats[language.Name] = language.NumberOfBytes;
                        }
                    }
                }
                catch (Exception)
                {
                    // Repo'ya erişilemiyorsa devam et
                    continue;
                }
            }

            var totalBytes = languageStats.Values.Sum();
            var result = new LanguageStats { TotalBytes = totalBytes };

            foreach (var kvp in languageStats.OrderByDescending(x => x.Value))
            {
                result.Languages[kvp.Key] = new LanguageInfo
                {
                    Bytes = kvp.Value,
                    Percentage = totalBytes > 0 ? (double)kvp.Value / totalBytes * 100 : 0
                };
            }

            return result;
        }
        catch (NotFoundException)
        {
            throw new ArgumentException($"User '{username}' not found on GitHub.");
        }
        catch (Exception ex)
        {
            throw new Exception($"Error fetching language stats: {ex.Message}");
        }
    }
}