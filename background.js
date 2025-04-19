// background.js

let lastCleanedContent = '';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'extractContent') {
    // retrieve API key and call OpenAI for cleaning
    chrome.storage.sync.get('apiKey', ({ apiKey }) => {
      if (!apiKey) {
        sendResponse({ error: 'API key not set' });
        return;
      }
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: `You are a careful and thoughtful content extractor. Given the full raw HTML/text and visible elements of a webpage, extract only the main user-facing readable content.

Requirements:

Include main headings, subheadings, paragraphs, important quotes, and any necessary images or diagrams that are essential to the reading experience.

Exclude all irrelevant sections like advertisements, toolbars, footers, comment sections, navigation menus, pop-ups, and unrelated call-to-actions.

Do not edit or modify the original text — preserve spelling, grammar, tone exactly as shown.

Present the extracted content as a clean, readable article meant for immersive reading, with minimal distractions.

Keep the structure simple: use headers for sections, paragraphs for content, and insert images in relevant places as needed (with alt text or caption if available).

Do not summarize, shorten, embellish, or rewrite any content.

Maintain the order and logical flow of the original readable material.

Respond with clean, structured HTML ready for display in a reading view pane.` 
            },
            { role: 'user', content: msg.content }
          ]
        })
      })
      .then(res => res.json())
      .then(data => {
        const cleaned = data.choices?.[0]?.message?.content || '';
        lastCleanedContent = cleaned;
        sendResponse({ content: cleaned });
      })
      .catch(err => sendResponse({ error: err.toString() }));
    });
  }
  if (msg.type === 'getCleanedContent') {
    sendResponse({ content: lastCleanedContent });
  }
  return true; // keep channel open for sendResponse
});

// Toggle side pane on extension icon click
chrome.action.onClicked.addListener(tab => {
  const url = tab.url || '';
  // Only operate on http/https pages
  if (!/^https?:/.test(url)) {
    console.warn(`KindReader: unsupported page ${url}`);
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: 'toggleSidepane' }, response => {
    if (chrome.runtime.lastError) {
      console.warn('KindReader: toggleSidepane failed:', chrome.runtime.lastError.message);
    }
  });
});
