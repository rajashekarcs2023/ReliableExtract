// Enhanced Browser Agent with Loop Detection and Visualization
const puppeteer = require('puppeteer');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const agentStep = require('./agent');
const http = require('http');

// Create visualization directory if it doesn't exist
const vizDir = path.join(__dirname, 'visualization');
if (!fs.existsSync(vizDir)) {
  fs.mkdirSync(vizDir);
}

// Create screenshots directory
const screenshotsDir = path.join(vizDir, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

// Clear agent_log.json file when starting a new run
console.log('Clearing previous agent logs...');
fs.writeFileSync('agent_log.json', '', 'utf8');
console.log('Agent logs cleared. Starting fresh run.');


function hashBuffer(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// Setup simple visualization server
function setupVisualizationServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      const html = fs.readFileSync(path.join(vizDir, 'index.html'), 'utf8');
      res.end(html);
    } else if (req.url === '/data') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      try {
        const data = fs.readFileSync('agent_log.json', 'utf8');
        const logs = data.trim().split('\n').map(line => JSON.parse(line));
        res.end(JSON.stringify(logs));
      } catch (err) {
        res.end(JSON.stringify([]));
      }
    } else if (req.url.startsWith('/screenshots/')) {
      const screenshotId = req.url.split('/').pop();
      const screenshotPath = path.join(vizDir, 'screenshots', `${screenshotId}.png`);
      if (fs.existsSync(screenshotPath)) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        const img = fs.readFileSync(screenshotPath);
        res.end(img);
      } else {
        res.writeHead(404);
        res.end('Screenshot not found');
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  const port = 3002; // Changed from 3000 to avoid conflicts
  server.listen(port, () => {
    console.log(`Visualization server running at http://localhost:${port}`);
  });
  
  return server;
}

// Create visualization HTML
function createVisualizationHTML() {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Loop Guard Browser Agent Visualization</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f8f9fa; }
    h1 { color: #343a40; text-align: center; margin-bottom: 30px; }
    .timeline { display: flex; overflow-x: auto; margin-bottom: 30px; padding: 15px 5px; background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .step { min-width: 180px; margin-right: 15px; padding: 15px; border: 1px solid #dee2e6; border-radius: 6px; transition: all 0.3s ease; }
    .step:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
    .step.loop { border-color: #dc3545; background-color: #f8d7da; }
    .screenshot { max-width: 100%; border-radius: 4px; margin-top: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .confidence-high { background-color: #d4edda; border-left: 4px solid #28a745; }
    .confidence-medium { background-color: #fff3cd; border-left: 4px solid #ffc107; }
    .confidence-low { background-color: #f8d7da; border-left: 4px solid #dc3545; }
    .details { margin-top: 20px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    pre { background-color: #f8f9fa; padding: 15px; border-radius: 4px; overflow: auto; }
    .step-header { display: flex; justify-content: space-between; align-items: center; }
    .step-number { font-weight: bold; color: #6c757d; }
    .step-confidence { font-size: 0.8em; padding: 2px 6px; border-radius: 10px; background: #e9ecef; }
    .step-action { font-weight: bold; margin: 10px 0; }
    .memory-state { margin-top: 30px; padding: 15px; background: #e9ecef; border-radius: 6px; }
    .refresh-btn { padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .refresh-btn:hover { background: #0069d9; }
  </style>
</head>
<body>
  <h1>🧠 Loop Guard Browser Agent Visualization</h1>
  <button class="refresh-btn" onclick="loadData()">Refresh Data</button>
  <div class="timeline" id="timeline"></div>
  <div class="details" id="details"></div>
  
  <script>
    // Fetch and display data
    async function loadData() {
      const response = await fetch('/data');
      const data = await response.json();
      
      const timeline = document.getElementById('timeline');
      timeline.innerHTML = '';
      
      if (data.length === 0) {
        timeline.innerHTML = '<p>No data available yet. Run the browser agent to see results.</p>';
        return;
      }
      
      data.forEach((step, index) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'step';
        if (step.isLooping) stepEl.className += ' loop';
        
        // Add confidence class if available
        if (step.response && step.response.confidence !== undefined) {
          const conf = step.response.confidence;
          if (conf > 0.7) stepEl.className += ' confidence-high';
          else if (conf > 0.4) stepEl.className += ' confidence-medium';
          else stepEl.className += ' confidence-low';
        }
        
        const confidenceDisplay = step.response?.confidence !== undefined 
          ? (step.response.confidence * 100).toFixed(0) + '%' 
          : 'N/A';
        
        stepEl.innerHTML = \`
          <div class="step-header">
            <span class="step-number">Step \${step.iteration + 1}</span>
            <span class="step-confidence">Confidence: \${confidenceDisplay}</span>
          </div>
          <div class="step-action">\${step.response?.action || 'Unknown'}</div>
        \`;
        
        if (step.screenshotHash) {
          stepEl.innerHTML += \`<img class="screenshot" src="/screenshots/\${step.screenshotHash}" alt="Screenshot" />\`;
        }
        
        stepEl.addEventListener('click', () => showDetails(step));
        timeline.appendChild(stepEl);
      });
    }
    
    function showDetails(step) {
      const details = document.getElementById('details');
      
      let alternativesHtml = '';
      if (step.response?.alternatives?.length) {
        alternativesHtml = \`
          <h3>Alternative Actions Considered:</h3>
          <ul>
            \${step.response.alternatives.map(alt => \`<li>\${alt}</li>\`).join('')}
          </ul>
        \`;
      }
      
      let memoryStateHtml = '';
      if (step.memoryState) {
        memoryStateHtml = \`
          <div class="memory-state">
            <h3>Memory State:</h3>
            <p>Memory Size: \${step.memoryState.memorySize} / \${step.memoryState.limit}</p>
            <p>Loop Detection Threshold: \${step.memoryState.loopThreshold}</p>
          </div>
        \`;
      }
      
      details.innerHTML = \`
        <h2>Details for Step \${step.iteration + 1}</h2>
        <p><strong>Last Action:</strong> \${step.lastAction}</p>
        <p><strong>Timestamp:</strong> \${step.timestamp || 'N/A'}</p>
        \${step.response?.reasoning ? \`<p><strong>Reasoning:</strong> \${step.response.reasoning}</p>\` : ''}
        \${alternativesHtml}
        \${memoryStateHtml}
        <h3>Raw Data:</h3>
        <pre>\${JSON.stringify(step, null, 2)}</pre>
      \`;
    }
    
    // Initial load
    loadData();
    
    // Refresh every 5 seconds
    setInterval(loadData, 5000);
  </script>
</body>
</html>`;
  
  fs.writeFileSync(path.join(vizDir, 'index.html'), html);
}

// Main function
async function runBrowserAgent() {
  // Clear previous log
  fs.writeFileSync('agent_log.json', '');
  
  // Create visualization HTML
  createVisualizationHTML();
  
  // Start visualization server
  const server = setupVisualizationServer();
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  await page.goto('https://v0-clean-react-website.vercel.app/');

  let lastAction = 'none';
  const maxIterations = 10;
  let successfulCompletion = false;

  console.log('🚀 Starting browser agent with enhanced loop detection and visualization');
  console.log(`📊 View real-time visualization at http://localhost:3002`);

  for (let i = 0; i < maxIterations; i++) {
    const dom = await page.evaluate(() => {
      return document.body.innerText.slice(0, 2000);
    });

    const screenshotBuffer = await page.screenshot();
    const imageHash = hashBuffer(screenshotBuffer);
    
    // Save screenshot for visualization
    fs.writeFileSync(path.join(vizDir, 'screenshots', `${imageHash}.png`), screenshotBuffer);

    const result = await agentStep(dom, lastAction, screenshotBuffer, i);
    
    // Extract action from result (could be string or object depending on agent implementation)
    const action = typeof result === 'string' ? result : result.action;

    console.log(`\n🔁 Iteration ${i + 1}`);
    console.log('🤖 Agent says:', action);

    if (action.includes('⚠️')) {
      console.log("⚠️ Loop detected! Stopping automation.");
      break;
    }
    
    try {
      if (action.toLowerCase().includes("type name")) {
        await page.type('#nameInput', 'Alice', { delay: 100 });
        lastAction = "Typed name";
      } else if (action.toLowerCase().includes("type email")) {
        await page.type('#emailInput', 'alice@example.com', { delay: 100 });
        lastAction = "Typed email";
      } else if (action.toLowerCase().includes("click next to step 2")) {
        await page.click('#nextToStep2');
        lastAction = "Clicked next to step 2";
        await page.waitForSelector('#topicSelect', { timeout: 5000 });
      } else if (action.toLowerCase().includes("select topic")) {
        await page.select('#topicSelect', 'Agent Reliability');
        lastAction = "Selected topic";
      } else if (action.toLowerCase().includes("check")) {
        await page.click('#termsCheckbox');
        lastAction = "Checked terms";
      } else if (action.toLowerCase().includes("click next to step 3")) {
        await page.click('#nextToStep3');
        lastAction = "Clicked next to step 3";
        await page.waitForSelector('#submitButton', { timeout: 5000 });
      } else if (action.toLowerCase().includes("click submit")) {
        await page.click('#submitButton');
        lastAction = "Clicked submit";
        await page.waitForSelector('#successMessage', { timeout: 5000 });
        console.log("🎉 Success message detected. Submission complete.");
        successfulCompletion = true;
        break;
      } else {
        console.log("❌ Unrecognized action. Exiting.");
        break;
      }
    } catch (err) {
      console.log("⚠️ Action failed:", err.message);
      lastAction = "Failed action";
    }
  }

  // Final status report
  if (successfulCompletion) {
    console.log("\n✅ Browser automation completed successfully!");
  } else {
    console.log("\n❌ Browser automation did not complete successfully.");
  }
  
  console.log("\n📊 Visualization server running at http://localhost:3003");
  console.log("Press Ctrl+C to stop the server and exit.");

  // Keep the browser open for demonstration purposes
  // await browser.close();
}

// Run the browser agent
runBrowserAgent().catch(err => {
  console.error('Browser agent error:', err);
});
