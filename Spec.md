**Project Spec: KindReader (Extension Version)**

---

# 🌐 Goal
Build a browser extension where users can:
1. Extract **reader-friendly** (main text + images) version of any webpage.
2. **Read aloud** the content using customizable voices.
3. **Translate** the content into different languages.
4. **Rewrite** the page in fun styles (simplified, pirate language, playful).
5. Provide a **Child-Safe** mode that:
   - Filters bad words (Image moderation parked for later phase)
6. Apply **Themes** (Day, Night, Sepia) to the reader view.
7. View **Page Stats** (estimated reading time, page category like Games, Streaming, Social Media, etc.)

---

# 🛠️ Core Features

| Feature | Description | Tools/Tech |
|:---|:---|:---|
| Reader Mode (toggle) | Extract and show main text/images | LLM (OpenAI API) |
| Text-to-Speech (TTS) | Read the text aloud with multiple voice options | OpenAI TTS API (e.g., `tts-1` models) |
| Translation (dropdown) | Translate content into selected language | OpenAI API (translation capabilities) |
| Child Safe Mode (toggle) | Filter bad words (text moderation) | OpenAI LLM moderation |
| Fun Rewrites | Rewrite content in simpler, pirate, or playful tones | OpenAI API (style prompts) |
| Theme Selector | Choose Day, Night, or Sepia theme for Reader Mode | CSS styling options |
| Page Stats | Show estimated reading time and page category | LLM + lightweight text analytics |

---

# 🧬 Architecture

## Extension Frontend
- Activated on click or shortcut.
- Reads the fully rendered DOM content.
- Displays extracted and processed content in a **side pane** that appears when the extension button is clicked.
- UI options:
  - Toggle Reader Mode
  - Toggle Child Safe Mode
  - Dropdown for Translation
  - Dropdown for TTS Voices
  - Dropdown for Fun Rewrite Styles
  - Dropdown for Theme (Day/Night/Sepia)
  - Display Page Stats (Reading time + Category)

## Backend (Optional Server)
- Proxy OpenAI API calls if needed (for API key security).
- Light caching to save costs and speed up repeated operations.

---

# 🚀 MVP Development Plan

## Phase 1: Basic Extension
- [ ] Inject content script and capture page content
- [ ] Display Reader Mode cleaned content (readable text and necessary images) using LLM
- [ ] Add Theme selector for reader view

## Phase 2: Child-Safe Mode, Translation, and Stats
- [ ] Add Child Safe Mode toggle
- [ ] Add Translate dropdown with language selection
- [ ] Add Page Stats (Reading time + Category)

## Phase 3: Read Aloud and Fun Rewriting
- [ ] Add Read Aloud with voice selection
- [ ] Add Fun Rewrites (simplify, pirate, playful)

## Phase 4: PDF support
- [ ] Add PDF as a source

---

# 🔧 Tech Stack
- **Extension**: Manifest v3, HTML, CSS, JS (React optional)
- **APIs**: OpenAI API for text extraction, TTS, translation, moderation, rewrites, page analytics
- **Deployment**: Chrome Web Store / Manual load for development

---

# 💚 Libraries and APIs
- OpenAI API (content extraction, translation, moderation, rewrites, stats)
- OpenAI TTS API (`tts-1` models) (Text-to-Speech)

---

# 🔢 User Flow

1. User opens KindReader extension on any page.
2. Extension extracts and displays a Reader-Friendly view in a **side pane**.
3. User can:
  - Toggle **Reader Mode** (on/off)
  - Toggle **Child Safe Mode** (on/off)
  - Select a **Translation language** from dropdown
  - Select a **Voice** and start **Read Aloud**
  - Select a **Rewrite Style** (Simple, Pirate, Fun)
  - Select a **Theme** (Day/Night/Sepia)
  - View **Page Stats** (Reading time, Category)

---

# 💬 Notes
- Inform users if content is sent to APIs for processing.
- Manage API limits and cost by optimizing prompts and payloads.
- Use local fallback if OpenAI APIs are temporarily unavailable.
- Park image moderation for future versions.

---

# 🛍️ Future Enhancements
- Save articles offline with rewritten versions.
- Support offline mode using lightweight LLMs (e.g., local models).
- Personalize reading styles based on user profiles.
- Summarize long articles.
- Add advanced image moderation.

---

# 📊 Sketch of UI

```
-------------------------------------
[ KindReader Side Pane ]

[ Reader Mode: Toggle ON/OFF ]
[ Child Safe Mode: Toggle ON/OFF ]
[ Translate: Dropdown ▾ ]
[ Read Aloud: Dropdown (Voice selection) ▾ ]
[ Fun Rewrite: Dropdown (Simple / Pirate / Fun) ▾ ]
[ Theme: Dropdown (Day / Night / Sepia) ▾ ]
[ Page Stats: Reading Time, Category ]

[ Reader View Area Below ]
- Clean Text
- Key Images (optional display)
-------------------------------------
```

