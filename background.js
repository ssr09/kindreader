// background.js

let lastCleanedContent = '';

// strip markdown code fences from LLM output
function stripCodeBlock(text) {
  // remove opening ``` with optional lang spec and trailing ```
  return text
    .replace(/^```[^\n]*\n?/, '')
    .replace(/```[^\n]*$/m, '')
    .trim();
}

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
          model: 'gpt-4o',  // revert to valid model
          messages: [
            { 
              role: 'system', 
              content: `You are a careful and thoughtful content extractor. Given the full raw HTML/text and visible elements of a webpage, extract only the main user-facing readable content.

Requirements:
• Include main headings, subheadings, paragraphs, important quotes, and necessary images or diagrams essential to the reading experience.
• Exclude irrelevant sections like ads, toolbars, footers, comments, navigation, pop‑ups, and unrelated calls to action.
• Do not edit or modify original text — preserve spelling, grammar, tone exactly.
• Present a clean, readable HTML article with minimal distractions.
• Keep structure simple: use headers, paragraphs, and insert images with alt text or captions.
• Do not summarize, shorten, embellish, or rewrite.
• Maintain order and logical flow of original content.

IMPORTANT: Do NOT wrap your output in Markdown code fences or triple backticks. Return only raw HTML ready for display in a reading view pane.` 
            },
            { role: 'user', content: msg.content }
          ]
        })
      })
      .then(res => res.json())
      .then(data => {
        // Handle OpenAI API errors
        if (data.error) {
          console.error('KindReader API error:', data.error);
          lastCleanedContent = '';
          sendResponse({ error: data.error.message || JSON.stringify(data.error) });
          return;
        }
        const raw = data.choices?.[0]?.message?.content || '';
        const cleaned = stripCodeBlock(raw);
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
