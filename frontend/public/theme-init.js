(function () {
  var theme = null;
  try {
    theme = localStorage.getItem('theme');
  } catch (e) {
    // Storage can be blocked; fall back to the system preference.
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
