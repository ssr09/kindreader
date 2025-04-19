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

function createSidepane() {
  const pane = document.createElement('div');
  pane.id = 'kind-reader-sidepane';
  pane.setAttribute('role', 'region');
  pane.setAttribute('aria-label', 'KindReader Side Pane');
  pane.tabIndex = -1;
  // Modern, minimal, delightful UI
  pane.innerHTML = `
    <div id="kind-reader-controls">
      <label for="theme-select">Theme:</label>
      <select id="theme-select" aria-label="Theme selector">
        <option value="day">Day</option>
        <option value="night">Night</option>
        <option value="sepia">Sepia</option>
      </select>
      <button id="kind-reader-close" aria-label="Close Reader Pane" title="Close KindReader">✕</button>
    </div>
    <div id="kind-reader-content" class="theme-day" aria-live="polite" tabindex="0">
      <div class="kr-spinner" aria-label="Loading"></div>
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
  // Theme selector
  const themeSelect = document.getElementById('theme-select');
  themeSelect.addEventListener('change', e => {
    const theme = e.target.value;
    document.getElementById('kind-reader-content').className = 'theme-' + theme;
    pane.className = 'theme-' + theme;
  });
  // Set initial theme
  pane.className = 'theme-day';
  // request content cleaning
  const raw = getMainContent();
  console.log('KindReader raw length:', raw.length);
  const target = document.getElementById('kind-reader-content');
  if (!raw) {
    target.innerText = 'No main content detected on this page.';
  } else {
    chrome.runtime.sendMessage({ type: 'extractContent', content: raw }, res => {
      console.log('KindReader response:', res);
      if (res.error) {
        target.innerText = 'Error: ' + res.error;
      } else if (!res.content || !res.content.trim()) {
        target.innerText = 'No content extracted. Raw LLM output: ' + JSON.stringify(res);
      } else {
        target.innerHTML = res.content;
      }
      target.focus();
    });
  }
}

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
