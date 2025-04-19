// popup.js

document.addEventListener('DOMContentLoaded', () => {
  // Request cleaned content
  chrome.runtime.sendMessage({ type: 'getCleanedContent' }, res => {
    document.getElementById('content').innerHTML = res.content;
  });

  // Theme selector
  const themeSelect = document.getElementById('theme-select');
  themeSelect.addEventListener('change', e => {
    document.getElementById('content').className = 'theme-' + e.target.value;
  });
});
