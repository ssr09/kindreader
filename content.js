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
// theme palettes mapping for accessible contrast
const themePalettes = {
  day:    { bg:'#ffffff', fg:'#181a1b', link:'#1a0dab' },
  night:  { bg:'#181a1b', fg:'#ffffff', link:'#8ab4f8' },
  sepia:  { bg:'#f4ecd8', fg:'#5b4636', link:'#3c5a99' }, // dark blue for contrast
  solaris:{ bg:'#ff5c39', fg:'#ffffff', link:'#252aff' }, // deep blue
  sunset: { bg:'#ffad5a', fg:'#630236', link:'#0050b3' }, // strong blue
  miami:  { bg:'#00d2ff', fg:'#ff00c8', link:'#181a1b' }, // dark text for neon bg
};

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
        <button id="kind-reader-settings" aria-label="Settings" title="Settings">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
  <path d="M19.14,12.94a7.07,7.07,0,0,0,.05-1,7.07,7.07,0,0,0-.05-1l2.11-1.65a.5.5,0,0,0,.12-.63l-2-3.46a.5.5,0,0,0-.61-.22l-2.49,1a7.23,7.23,0,0,0-1.73-1l-.38-2.65A.5.5,0,0,0,13,2H11a.5.5,0,0,0-.5.42l-.38,2.65a7.23,7.23,0,0,0-1.73,1l-2.49-1a.5.5,0,0,0-.61.22l-2,3.46a.5.5,0,0,0,.12.63l2.11,1.65a7.07,7.07,0,0,0-.05,1,7.07,7.07,0,0,0,.05,1L2.86,14.59a.5.5,0,0,0-.12.63l2,3.46a.5.5,0,0,0,.61.22l2.49-1a7.23,7.23,0,0,0,1.73,1l.38,2.65A.5.5,0,0,0,11,22h2a.5.5,0,0,0,.5-.42l.38-2.65a7.23,7.23,0,0,0,1.73-1l2.49,1a.5.5,0,0,0,.61-.22l2-3.46a.5.5,0,0,0-.12-.63ZM12,15.5A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/>
</svg>
        </button>
        <button id="kind-reader-close" aria-label="Close Reader Pane" title="Close KindReader">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M18.3 5.71l-1.41-1.41L12 9.18 7.11 4.29 5.7 5.7 10.59 10.59 5.7 15.49l1.41 1.41L12 12l4.89 4.9 1.41-1.41L13.41 10.6z"/>
          </svg>
        </button>
      </div>
    </div>
    <div id="kind-reader-content" class="theme-day" aria-live="polite" tabindex="0">
    </div>
    <!-- overlay for settings -->
    <div id="kr-overlay" class="kr-hidden">
      <div id="kr-overlay-content">
        <h3>Settings</h3>
        <div class="kr-settings-form">
          <label for="kr-theme-input">Theme:</label>
          <input type="text" id="kr-theme-input" value="Day" placeholder="e.g. Day, Night, Solaris, Sunset, Miami">
          <div class="kr-theme-suggestions">
            <button type="button" class="kr-theme-suggest">Day</button>
            <button type="button" class="kr-theme-suggest">Night</button>
            <button type="button" class="kr-theme-suggest">Solaris</button>
            <button type="button" class="kr-theme-suggest">Sunset</button>
            <button type="button" class="kr-theme-suggest">Miami</button>
          </div>

          <label for="kr-style-input">Rewrite Style:</label>
          <input type="text" id="kr-style-input" value="" placeholder="e.g. Spanish, Hinglish, Pirate, Elementary English">
          <div class="kr-suggestions">
            <button type="button" class="kr-suggest">Original</button>
            <button type="button" class="kr-suggest">Spanish</button>
            <button type="button" class="kr-suggest">Hinglish</button>
            <button type="button" class="kr-suggest">Pirate</button>
            <button type="button" class="kr-suggest">Elementary English</button>
          </div>

          <label class="kr-toggle">
            Child Safe Mode
            <input type="checkbox" id="kr-child-safe-select">
            <span class="kr-slider"></span>
          </label>
        </div>
        <div class="kr-overlay-buttons">
          <button id="kr-apply-btn">Apply</button>
          <button id="kr-cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `;
  const spinnerEl = document.createElement('div');
  spinnerEl.className = 'kr-spinner';
  spinnerEl.setAttribute('aria-label', 'Loading');
  pane.querySelector('#kind-reader-content').appendChild(spinnerEl);
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
  const krThemeInput = document.getElementById('kr-theme-input');
  const krStyleInput = document.getElementById('kr-style-input');
  const krChildSafeSelect = document.getElementById('kr-child-safe-select');
  const applyBtn = document.getElementById('kr-apply-btn');
  const cancelBtn = document.getElementById('kr-cancel-btn');
  settingsBtn.addEventListener('click', e => { e.preventDefault(); overlay.classList.remove('kr-hidden'); });
  cancelBtn.addEventListener('click', () => overlay.classList.add('kr-hidden'));
  // suggestions autofill
  const suggestionBtns = overlay.querySelectorAll('.kr-suggest');
  suggestionBtns.forEach(btn => btn.addEventListener('click', () => { krStyleInput.value = btn.textContent; }));
  // theme suggestions autofill
  const themeSuggestionBtns = overlay.querySelectorAll('.kr-theme-suggest');
  themeSuggestionBtns.forEach(btn => btn.addEventListener('click', () => { krThemeInput.value = btn.textContent; }));
  applyBtn.addEventListener('click', () => {
    const themeVal = krThemeInput.value.trim() || 'day';
    const themeKey = themeVal.toLowerCase();
    const newChild = krChildSafeSelect.checked;
    const styleVal = krStyleInput.value.trim();
    const newStyle = styleVal ? styleVal.toLowerCase() : 'original';
    currentStyle = newStyle;
    runId++;
    processedCount = 0;
    processing = false;
    const applyThemeAndContinue = pal => {
      document.documentElement.style.setProperty('--kr-bg', pal.bg);
      document.documentElement.style.setProperty('--kr-fg', pal.fg);
      document.documentElement.style.setProperty('--kr-link', pal.link);
      pane.className = 'theme-' + themeKey;
      const contentEl = document.getElementById('kind-reader-content');
      contentEl.innerHTML = '';
      const spinnerEl = document.createElement('div');
      spinnerEl.className = 'kr-spinner';
      spinnerEl.setAttribute('aria-label', 'Loading');
      contentEl.appendChild(spinnerEl);
      contentEl.classList.toggle('kr-child-safe', newChild);
      overlay.classList.add('kr-hidden');
      processQueue();
    };
    if (!themePalettes[themeKey]) {
      applyBtn.disabled = true;
      chrome.runtime.sendMessage({ type: 'generateThemePalette', theme: themeKey }, response => {
        applyBtn.disabled = false;
        if (response.palette) {
          themePalettes[themeKey] = response.palette;
          chrome.storage.sync.get('customPalettes', ({ customPalettes = {} }) => {
            customPalettes[themeKey] = response.palette;
            chrome.storage.sync.set({ theme: themeKey, style: newStyle, childSafe: newChild, customPalettes });
          });
          applyThemeAndContinue(response.palette);
        } else {
          console.error('Theme generation error', response.error);
          applyThemeAndContinue(themePalettes.day);
        }
      });
    } else {
      chrome.storage.sync.set({ theme: themeKey, style: newStyle, childSafe: newChild });
      applyThemeAndContinue(themePalettes[themeKey]);
    }
  });

  // load persisted settings
  chrome.storage.sync.get(['theme','style','childSafe','customPalettes'], ({theme,style,childSafe,customPalettes}) => {
    if (customPalettes) Object.assign(themePalettes, customPalettes);
    const contentEl = document.getElementById('kind-reader-content');
    if (theme) {
      const pal = themePalettes[theme] || themePalettes.day;
      document.documentElement.style.setProperty('--kr-bg', pal.bg);
      document.documentElement.style.setProperty('--kr-fg', pal.fg);
      document.documentElement.style.setProperty('--kr-link', pal.link);
      pane.className = 'theme-' + theme;
      krThemeInput.value = theme.charAt(0).toUpperCase() + theme.slice(1);
    }
    if (childSafe) contentEl.classList.add('kr-child-safe');
    // set rewrite style when pane loads
    const styleKey = style || 'original';
    currentStyle = styleKey;
    if (krStyleInput) krStyleInput.value = styleKey.charAt(0).toUpperCase() + styleKey.slice(1);
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
          // spinner stays until all fragments are loaded
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
        // remove spinner after all fragments load
        const contentElTransAfter = document.getElementById('kind-reader-content');
        const spinnerTransAfter = contentElTransAfter.querySelector('.kr-spinner');
        if (spinnerTransAfter) spinnerTransAfter.remove();
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
      border: 4px solid var(--kr-fg) !important;
      border-top: 4px solid var(--kr-link) !important;
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
      // apply inline link styling to override host CSS in original view
      const linkColorSync = getComputedStyle(document.documentElement).getPropertyValue('--kr-link').trim();
      const fgColorSync = getComputedStyle(document.documentElement).getPropertyValue('--kr-fg').trim();
      frag.querySelectorAll('a').forEach(a => {
        a.style.setProperty('color', linkColorSync, 'important');
        a.style.setProperty('textDecoration', 'underline', 'important');
        a.addEventListener('mouseover', () => a.style.setProperty('color', fgColorSync, 'important'));
        a.addEventListener('mouseout', () => a.style.setProperty('color', linkColorSync, 'important'));
        a.addEventListener('focus', () => a.style.setProperty('outline', '2px dashed ' + linkColorSync, 'important'));
      });
      // apply inline heading styling in sync branch
      frag.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
        h.style.setProperty('color', fgColorSync, 'important');
      });
      const contentElSync = document.getElementById('kind-reader-content');
      const spinnerSync = contentElSync.querySelector('.kr-spinner');
      if (spinnerSync) contentElSync.insertBefore(frag, spinnerSync);
      else contentElSync.appendChild(frag);
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
          // apply inline link styles to override host CSS
          const linkColor = getComputedStyle(document.documentElement).getPropertyValue('--kr-link').trim();
          const fgColor = getComputedStyle(document.documentElement).getPropertyValue('--kr-fg').trim();
          frag.querySelectorAll('a').forEach(a => {
            a.style.setProperty('color', linkColor, 'important');
            a.style.setProperty('textDecoration', 'underline', 'important');
            a.addEventListener('mouseover', () => a.style.setProperty('color', fgColor, 'important'));
            a.addEventListener('mouseout', () => a.style.setProperty('color', linkColor, 'important'));
            a.addEventListener('focus', () => a.style.setProperty('outline', '2px dashed ' + linkColor, 'important'));
          });
          // apply inline heading styling in translation branch
          frag.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
            h.style.setProperty('color', fgColor, 'important');
          });
          const contentElTrans = document.getElementById('kind-reader-content');
          const spinnerTrans = contentElTrans.querySelector('.kr-spinner');
          if (spinnerTrans) contentElTrans.insertBefore(frag, spinnerTrans);
          else contentElTrans.appendChild(frag);
          // remove loader spinner after last fragment
          if (processedCount >= originalQueue.length) {
            const contentElTransAfter = document.getElementById('kind-reader-content');
            const spinnerTransAfter = contentElTransAfter.querySelector('.kr-spinner');
            if (spinnerTransAfter) spinnerTransAfter.remove();
          }
        }
        processing = false;
        processQueue();
      }
    );
  }
}
