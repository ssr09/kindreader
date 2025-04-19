// options.js

// Load and save OpenAI API key for the extension

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('apiKey');
  // Populate existing key
  chrome.storage.sync.get('apiKey', ({ apiKey }) => {
    if (apiKey) input.value = apiKey;
  });
  // Save on click
  document.getElementById('save').addEventListener('click', () => {
    const key = input.value.trim();
    chrome.storage.sync.set({ apiKey: key }, () => {
      alert('API Key saved!');
    });
  });
});
