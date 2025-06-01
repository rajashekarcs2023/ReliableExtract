# 🧠 Loop Guard Browser Agent

An innovative AI-powered browser automation system designed to reliably navigate modern web interfaces using multimodal reasoning and advanced loop detection.

## 🚀 Key Features

### 1. Visual Feedback Memory
- Captures screenshots of the page and hashes them
- Detects repeated visual states to identify UI loops
- Stores visual history for audit and debugging

### 2. Loop Detection & Self-Correction
- Tracks past DOM-action states using hashed representations
- Detects both exact and partial loops through similarity scoring
- Implements configurable thresholds for loop detection sensitivity
- Provides escape mechanisms when loops are detected

### 3. Multimodal Reasoning
- Combines DOM content and visual screenshot data
- Uses Google's Gemini 2.0 Flash model for decision-making
- Provides structured responses with confidence scoring
- Considers alternative actions when confidence is low

### 4. Transparent Audit Logging
- Records each agent decision with rich metadata
- Includes iteration number, timestamp, and last action
- Stores DOM content preview and screenshot hash
- Enables full auditability of agent decisions

### 5. Real-time Visualization Dashboard
- Displays agent steps with screenshots
- Shows confidence scores and reasoning
- Highlights loop detection events
- Provides memory state visualization

## 📊 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser.js    │───▶│    Agent.js     │───▶│   Memory.js     │
│  (Puppeteer)    │◀───│  (Gemini API)   │◀───│ (Loop Detection)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                             │
         │                                             │
         ▼                                             ▼
┌─────────────────┐                         ┌─────────────────┐
│  Screenshots    │                         │   Agent Logs    │
│  (Visual Data)  │                         │  (JSON Lines)   │
└─────────────────┘                         └─────────────────┘
                                                     │
                                                     ▼
                                           ┌─────────────────┐
                                           │  Dashboard.js   │
                                           │(Visualization)  │
                                           └─────────────────┘
```

## 🛠️ Technologies Used

- **Puppeteer**: Browser automation
- **Google Gemini 2.0 Flash**: Multimodal AI reasoning
- **Node.js**: Runtime environment
- **Express**: Dashboard server
- **Bootstrap**: Dashboard UI

## 🔧 Setup & Usage

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the parent directory with:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

3. Run the browser agent:
   ```
   node browser.js
   ```

4. Start the dashboard (in a separate terminal):
   ```
   node dashboard.js
   ```

5. View the dashboard at [http://localhost:3001](http://localhost:3001)

## 🧪 Innovation Highlights

### Advanced Loop Detection
Unlike traditional automation tools that get stuck in infinite loops, Loop Guard uses a combination of DOM state tracking and visual similarity detection to identify both exact and partial loops.

### Confidence-Based Decision Making
Each agent action includes a confidence score, allowing for more nuanced decision-making and the ability to try alternative approaches when confidence is low.

### Multimodal Understanding
By combining textual DOM content with visual screenshots, the agent can understand web interfaces more like a human would, handling dynamic content and visual cues.

### Real-time Visualization
The dashboard provides unprecedented visibility into the agent's decision-making process, making it easier to debug and understand automation challenges.

## 📈 Future Enhancements

- Adaptive learning from past automation runs
- Comparative performance metrics against traditional automation tools
- Enhanced similarity detection using embedding models
- User-guided correction for edge cases
