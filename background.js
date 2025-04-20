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
          model: 'gpt-4.1-mini',
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
  if (msg.type === 'checkProfanity') {
    const snippet = msg.html || '';
    // call OpenAI to wrap profane words in <span class="kr-blur">...<\/span>
    chrome.storage.sync.get('apiKey', ({ apiKey }) => {
      if (!apiKey) {
        sendResponse({ error: 'API key not set' });
        return;
      }
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          temperature: 0.2,
          messages: [
            { role: 'system', content: 'You are a content filter. Given an HTML snippet, wrap any profane or offensive words by enclosing each in <span class="kr-blur">…</span>. Preserve all other HTML tags and structure. Respond with only the resulting HTML, without any markdown fences or explanation.' },
            { role: 'user', content: snippet }
          ]
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          sendResponse({ error: data.error.message || JSON.stringify(data.error) });
        } else {
          let html = data.choices?.[0]?.message?.content || snippet;
          // strip markdown fences if any
          html = html.replace(/```(?:html)?/g, '').replace(/```/g, '').trim();
          sendResponse({ html });
        }
      })
      .catch(err => sendResponse({ error: err.toString() }));
    });
  }
  if (msg.type === 'transformText') {
    const snippet = msg.html || '';
    const style = msg.style || 'original';
    chrome.storage.sync.get('apiKey', ({ apiKey }) => {
      if (!apiKey) { sendResponse({ error: 'API key not set' }); return; }
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: `Rewrite the following HTML/text into ${style} (preserve all tags), then wrap any profane words with <span class="kr-blur">…</span>.` },
            { role: 'user', content: snippet }
          ]
        })
      })
      .then(r => r.json())
      .then(data => {
        if (data.error) sendResponse({ error: data.error.message });
        else sendResponse({ html: data.choices[0].message.content || snippet });
      })
      .catch(err => sendResponse({ error: err.toString() }));
    });
    return true;
  }
  if (msg.type === 'generateThemePalette') {
    chrome.storage.sync.get('apiKey', ({ apiKey }) => {
      if (!apiKey) { sendResponse({ error: 'API key not set' }); return; }
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: `You are a professional UI designer. Carefully think through multiple colors that strongly evoke the theme "${msg.theme}", ensuring text colors maintain at least a 4.5:1 contrast ratio against the background. Respond with ONLY a JSON object with keys "bg", "fg", and "link" (hex codes). Do NOT include any markdown fences or explanatory text.` },
            { role: 'user', content: msg.theme }
          ],
          temperature: 0.7
        })
      })
      .then(res => res.json())
      .then(data => {
        let content = data.choices?.[0]?.message?.content || '';
        // Strip markdown fences and extract JSON substring
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) content = jsonMatch[0];
        try {
          const palette = JSON.parse(content);
          sendResponse({ palette });
        } catch(e) {
          sendResponse({ error: 'Invalid palette format' });
        }
      })
      .catch(err => sendResponse({ error: err.toString() }));
    });
    return true;
  }
  return true; // keep channel open for sendResponse
});

// Add streaming handler for HTML chunks
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'stream') return;
  port.onMessage.addListener(msg => {
    if (msg.type !== 'extractStream') return;
    chrome.storage.sync.get('apiKey', ({ apiKey }) => {
      if (!apiKey) {
        try { port.postMessage({ error: 'API key not set' }); } catch {};
        port.disconnect();
        return;
      }
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          stream: true,
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
      .then(response => {
        if (!response.ok) {
          response.text().then(err => {
            try { port.postMessage({ error: err }); } catch {};
            port.disconnect();
          });
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let doneFlag = false;
        (async () => {
          while (true) {
            const { value, done } = await reader.read();
            if (done || doneFlag) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop();
            for (const part of parts) {
              if (!part.startsWith('data:')) continue;
              const dataStr = part.replace(/^data:\s*/, '');
              if (dataStr === '[DONE]') {
                try { port.postMessage({ done: true }); } catch {};
                doneFlag = true;
                break;
              }
              let json;
              try { json = JSON.parse(dataStr); } catch { continue; }
              const delta = json.choices?.[0]?.delta?.content || '';
              if (delta !== '') {
                // strip markdown fences but preserve internal whitespace
                const cleaned = delta
                  .replace(/^```[^\n]*\n?/, '')
                  .replace(/```[^\n]*$/m, '');
                try { port.postMessage({ chunk: cleaned }); } catch {};
              }
            }
          }
          if (!doneFlag) {
            try { port.postMessage({ done: true }); } catch {};
          }
          port.disconnect();
        })();
      })
      .catch(err => {
        try { port.postMessage({ error: err.toString() }); } catch {};
        port.disconnect();
      });
    });
  });
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
