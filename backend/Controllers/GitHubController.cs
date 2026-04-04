using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GitHubController : ControllerBase
{
    private readonly IGitHubService _gitHubService;

    public GitHubController(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    [HttpGet("user/{username}")]
    public async Task<IActionResult> GetUserInfo(string username)
    {
        try
        {
            var userInfo = await _gitHubService.GetUserInfoAsync(username);
            return Ok(userInfo);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }

    [HttpGet("user/{username}/languages")]
    public async Task<IActionResult> GetUserLanguageStats(string username)
    {
        try
        {
            var languageStats = await _gitHubService.GetUserLanguageStatsAsync(username);
            return Ok(languageStats);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }
}