// content.js

// Extracts main content from the page (simple heuristic)
function getMainContent() {
  try {
    // Improved extraction: prefer main/article/section elements
    const selectors = ['article', 'main', '[role=main]'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && typeof el.innerText === 'string' && el.innerText.trim().length > 100) {
        return el.innerHTML || '';
      }
    }
    // Next, look for sizeable <section>
    const secs = Array.from(document.querySelectorAll('section'));
    for (const sec of secs) {
      if (typeof sec.innerText === 'string' && sec.innerText.trim().length > 200) {
        return sec.innerHTML || '';
      }
    }
    // Fallback: largest text container excluding nav/headers
    let all = Array.from(document.body.querySelectorAll('div, section, main, article'));
    all = all.filter(el => el.innerText && !/(nav|header|footer|aside|menu)/i.test(el.tagName + ' ' + el.className));
    if (all.length) {
      let biggest = all.reduce((a, b) => (b.innerText.length > a.innerText.length ? b : a), all[0]);
      return biggest.innerHTML || '';
    }
    return document.body.innerText || '';
  } catch(err) {
    console.error('KindReader getMainContent error:', err);
    return '';
  }
}

// Side pane toggle logic
let paneOpen = false;

// global control vars
let currentStyle = 'original';
let runId = 0;

function createSidepane() {
  const pane = document.createElement('div');
  pane.id = 'kind-reader-sidepane';
  pane.setAttribute('role', 'region');
  pane.setAttribute('aria-label', 'KindReader Side Pane');
  pane.tabIndex = -1;
  // Modern, minimal, delightful UI
  pane.innerHTML = `
    <div id="kind-reader-controls">
      <span id="kind-reader-title">Kind Reader</span>
      <div class="kr-controls-right">
        <button id="kind-reader-settings" aria-label="Settings" title="Settings">⚙️</button>
        <button id="kind-reader-close" aria-label="Close Reader Pane" title="Close KindReader">✕</button>
      </div>
    </div>
    <div id="kind-reader-content" class="theme-day" aria-live="polite" tabindex="0">
      <div class="kr-spinner" aria-label="Loading"></div>
    </div>
    <!-- overlay for settings -->
    <div id="kr-overlay" class="kr-hidden">
      <div id="kr-overlay-content">
        <h3>Settings</h3>
        <div class="kr-settings-form">
          <label for="kr-theme-select">Theme:</label>
          <select id="kr-theme-select">
            <option value="day">Day</option>
            <option value="night">Night</option>
            <option value="sepia">Sepia</option>
          </select>

          <label for="kr-style-input">Rewrite Style:</label>
          <input type="text" id="kr-style-input" placeholder="e.g. Hindi, Pirate Talk, Elementary English">
          <div class="kr-suggestions">
            <button type="button" class="kr-suggest">Original</button>
            <button type="button" class="kr-suggest">Hindi</button>
            <button type="button" class="kr-suggest">French</button>
            <button type="button" class="kr-suggest">Pirate Talk</button>
            <button type="button" class="kr-suggest">Elementary English</button>
          </div>

          <label for="kr-child-safe-select">Child Safe Mode:</label>
          <input type="checkbox" id="kr-child-safe-select">
        </div>
        <div class="kr-overlay-buttons">
          <button id="kr-apply-btn">Apply</button>
          <button id="kr-cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(pane);
  setTimeout(()=>pane.focus(), 0); // Focus trap
  // Keyboard: ESC to close
  pane.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      toggleSidepane();
    }
  });
  // Trap focus inside pane
  pane.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      const focusables = Array.from(pane.querySelectorAll('button, select, [tabindex]')).filter(el => !el.disabled);
      const first = focusables[0], last = focusables[focusables.length-1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // Close button
  document.getElementById('kind-reader-close').addEventListener('click', toggleSidepane);
  document.getElementById('kind-reader-close').addEventListener('keydown', e => {
    if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggleSidepane(); }
  });
  // setup overlay interactions and persistence
  const settingsBtn = document.getElementById('kind-reader-settings');
  const overlay = document.getElementById('kr-overlay');
  const krThemeSelect = document.getElementById('kr-theme-select');
  const krStyleInput = document.getElementById('kr-style-input');
  const krChildSafeSelect = document.getElementById('kr-child-safe-select');
  const applyBtn = document.getElementById('kr-apply-btn');
  const cancelBtn = document.getElementById('kr-cancel-btn');
  settingsBtn.addEventListener('click', e => { e.preventDefault(); overlay.classList.remove('kr-hidden'); });
  cancelBtn.addEventListener('click', () => overlay.classList.add('kr-hidden'));
  // suggestions autofill
  const suggestionBtns = overlay.querySelectorAll('.kr-suggest');
  suggestionBtns.forEach(btn => btn.addEventListener('click', () => { krStyleInput.value = btn.textContent; }));
  applyBtn.addEventListener('click', () => {
    const newTheme = krThemeSelect.value;
    pane.className = 'theme-' + newTheme;
    const contentEl = document.getElementById('kind-reader-content');
    const newChild = krChildSafeSelect.checked;
    contentEl.classList.toggle('kr-child-safe', newChild);
    const styleVal = krStyleInput.value.trim();
    const newStyle = styleVal ? styleVal.toLowerCase() : 'original';
    currentStyle = newStyle;
    runId++;
    processedCount = 0;
    processing = false;
    contentEl.innerHTML = '<div class="kr-spinner" aria-label="Loading"></div>';
    chrome.storage.sync.set({ theme: newTheme, childSafe: newChild });
    overlay.classList.add('kr-hidden');
    processQueue();
  });

  // load persisted settings
  chrome.storage.sync.get(['theme','childSafe'], ({theme,childSafe}) => {
    const contentEl = document.getElementById('kind-reader-content');
    if (theme) {
      pane.className = 'theme-' + theme;
      contentEl.className = 'theme-' + theme;
    }
    if (childSafe) contentEl.classList.add('kr-child-safe');
    // reset rewrite style when pane loads
    currentStyle = 'original';
    krStyleInput.value = '';
  });

  // Replace kr-blur text with asterisks on copy
  document.getElementById('kind-reader-content').addEventListener('copy', function(e) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const div = document.createElement('div');
    for (let i = 0; i < selection.rangeCount; i++) {
      div.appendChild(selection.getRangeAt(i).cloneContents());
    }
    div.querySelectorAll('.kr-blur').forEach(span => {
      const stars = '*'.repeat(span.textContent.length);
      span.textContent = stars;
    });
    e.clipboardData.setData('text/plain', div.textContent);
    e.preventDefault();
  });
  // request streaming content cleaning
  const raw = getMainContent();
  console.log('KindReader raw length:', raw.length);
  const target = document.getElementById('kind-reader-content');
  let firstChunk = true;
  if (!raw) {
    target.innerText = 'No main content detected on this page.';
  } else {
    const port = chrome.runtime.connect({ name: 'stream' });
    // buffer incomplete HTML between chunks
    port.onMessage.addListener(msg => {
      if (msg.error) {
        target.innerText = 'Error: ' + msg.error;
        port.disconnect();
      } else if (msg.chunk) {
        // decode HTML entities
        const ta = document.createElement('textarea');
        ta.innerHTML = msg.chunk;
        // strip newline characters and accumulate
        const decoded = ta.value.replace(/\r?\n/g, '');
        const html = leftover + decoded;
        // find last complete block-level close tag
        let safe = '';
        let lastCloseIdx = -1;
        const closeTagRegex = /<\/(?:p|h[1-6]|div|section|article|header|footer|aside|figure|figcaption|blockquote|ul|ol|li)>/gi;
        let match;
        while ((match = closeTagRegex.exec(html)) !== null) {
          lastCloseIdx = match.index + match[0].length;
        }
        if (lastCloseIdx !== -1) {
          safe = html.slice(0, lastCloseIdx);
          leftover = html.slice(lastCloseIdx);
        } else {
          leftover = html;
        }
        if (safe) {
          // remove spinner on first fragment
          if (firstChunk) {
            const spinner = target.querySelector('.kr-spinner');
            if (spinner) spinner.remove();
            firstChunk = false;
          }
          // enqueue each complete block
          let start = 0;
          closeTagRegex.lastIndex = 0;
          while ((match = closeTagRegex.exec(safe)) !== null) {
            const block = safe.slice(start, match.index + match[0].length);
            start = match.index + match[0].length;
            originalQueue.push(block);
          }
          processQueue();
        }
      } else if (msg.done) {
        if (leftover) {
          originalQueue.push(leftover);
          leftover = '';
          processQueue();
        }
        port.disconnect();
      }
    });
    // initiate streaming extraction
    port.postMessage({ type: 'extractStream', content: raw });
  }
}

function removeSidepane() {
  const pane = document.getElementById('kind-reader-sidepane');
  if (pane) pane.remove();
}

function toggleSidepane() {
  if (paneOpen) removeSidepane(); else createSidepane();
  paneOpen = !paneOpen;
}

// Listen for extension icon clicks
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'toggleSidepane') toggleSidepane();
});

// Spinner CSS (injected if not present)
if (!document.getElementById('kr-spinner-style')) {
  const style = document.createElement('style');
  style.id = 'kr-spinner-style';
  style.textContent = `
    #kind-reader-sidepane .kr-spinner {
      display: block !important;
      width: 38px !important;
      height: 38px !important;
      margin: 60px auto !important;
      border: 4px solid #e5e5e5 !important;
      border-top: 4px solid #e65a50 !important;
      border-radius: 50% !important;
      animation: kr-spin 1s linear infinite !important;
    }
    @keyframes kr-spin {
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// translation queue and pipeline
const originalQueue = [];
let processedCount = 0, processing = false;
let leftover = '';
function processQueue() {
  const thisRun = runId;
  if (processing || processedCount >= originalQueue.length) return;
  processing = true;
  if (currentStyle === 'original') {
    // flush all pending blocks synchronously
    if (thisRun !== runId) { processing = false; return; }
    while (processedCount < originalQueue.length) {
      const blk = originalQueue[processedCount++];
      const frag = document.createRange().createContextualFragment(blk);
      frag.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && !/^https?:\/\//.test(src) && !src.startsWith('data:')) {
          img.src = new URL(src, document.baseURI).href;
        }
      });
      document.getElementById('kind-reader-content').appendChild(frag);
    }
    processing = false;
    return;
  } else {
    const block = originalQueue[processedCount++];
    console.log('[KindReader] Translating block:', block);
    chrome.runtime.sendMessage(
      { type: 'transformText', html: block, style: currentStyle },
      resp => {
        console.log('[KindReader] transformText resp:', resp);
        if (thisRun !== runId) { processing = false; return; }
        if (!resp.error) {
          const frag = document.createRange()
            .createContextualFragment(resp.html);
          // strip whitespace-only text nodes
          const walker = document.createTreeWalker(
            frag, NodeFilter.SHOW_TEXT,
            { acceptNode(node) {
                return !/\S/.test(node.nodeValue)
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_REJECT;
            } }
          );
          const toRemove = [];
          let n;
          while (n = walker.nextNode()) toRemove.push(n);
          toRemove.forEach(x => x.parentNode.removeChild(x));
          // resolve image URLs
          frag.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src && !/^https?:\/\//.test(src) && !src.startsWith('data:')) {
              img.src = new URL(src, document.baseURI).href;
            }
          });
          document.getElementById('kind-reader-content').appendChild(frag);
        }
        processing = false;
        processQueue();
      }
    );
  }
}
