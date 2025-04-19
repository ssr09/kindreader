// content.js

// Extracts main content from the page (simple heuristic)
function getMainContent() {
  let article = document.querySelector('article');
  if (article) return article.innerHTML;
  // Fallback: get largest text container
  let all = Array.from(document.body.querySelectorAll('div, section, main'));
  let biggest = all.reduce((a, b) => (b.innerText.length > a.innerText.length ? b : a), document.body);
  return biggest.innerHTML;
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
  chrome.runtime.sendMessage({ type: 'extractContent', content: raw }, res => {
    const target = document.getElementById('kind-reader-content');
    if (res.error) target.innerText = res.error;
    else target.innerHTML = res.content;
    target.focus();
  });
}

// Spinner CSS (injected if not present)
if (!document.getElementById('kr-spinner-style')) {
  const style = document.createElement('style');
  style.id = 'kr-spinner-style';
  style.textContent = `
    .kr-spinner {
      margin: 60px auto;
      width: 38px; height: 38px;
      border: 4px solid #e5e5e5;
      border-top: 4px solid #e65a50;
      border-radius: 50%;
      animation: kr-spin 1s linear infinite;
    }
    @keyframes kr-spin { 100% { transform: rotate(360deg); } }
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
