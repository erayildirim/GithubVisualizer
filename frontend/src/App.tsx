import { useState } from 'react';
import { githubApi, type GitHubUserInfo, type LanguageStats } from './services/api';
import { LanguageChart } from './components/LanguageChart';

function App() {
  const [username, setUsername] = useState('');
  const [userInfo, setUserInfo] = useState<GitHubUserInfo | null>(null);
  const [languageStats, setLanguageStats] = useState<LanguageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!username.trim()) {
      setError('Lütfen bir kullanıcı adı girin.');
      return;
    }

    setLoading(true);
    setError(null);
    setUserInfo(null);
    setLanguageStats(null);

    try {
      const data = await githubApi.getUserInfo(username.trim());
      setUserInfo(data);

      // Dil istatistiklerini çek
      try {
        const stats = await githubApi.getUserLanguageStats(username.trim());
        setLanguageStats(stats);
      } catch (err) {
        console.error('Dil istatistikleri çekilirken hata:', err);
        // Dil verisi çeken başarısız olsa bile profil bilgisini göster
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            GitHub Kullanıcı Arama
          </h1>

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Kullanıcı Adı
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="örn: octocat"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Aranıyor...' : 'Ara'}
            </button>
          </div>

          {loading && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Yükleniyor...</p>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {userInfo && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-4">
                <img
                  src={userInfo.avatarUrl}
                  alt={`${userInfo.username} avatar`}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{userInfo.username}</h2>
                  {userInfo.bio && (
                    <p className="text-sm text-gray-600 mt-1">{userInfo.bio}</p>
                  )}
                  <div className="flex space-x-4 mt-2 text-sm text-gray-500">
                    <span>👥 {userInfo.followers} takipçi</span>
                    <span>👤 {userInfo.following} takip</span>
                    <span>📚 {userInfo.publicRepos} repo</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {languageStats && <LanguageChart data={languageStats} />}
      </div>
    </div>
  );
}

export default App;
