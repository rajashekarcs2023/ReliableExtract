// Loop Guard Browser Agent Dashboard
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3001;

// Serve static files (but only for assets, not index.html)
app.use('/screenshots', express.static(path.join(__dirname, 'visualization', 'screenshots')));
app.use('/css', express.static(path.join(__dirname, 'visualization', 'css')));
app.use('/js', express.static(path.join(__dirname, 'visualization', 'js')));

// Serve screenshot files
app.get('/screenshots/:hash', (req, res) => {
  const hash = req.params.hash;
  const screenshotPath = path.join(__dirname, 'visualization', 'screenshots', hash);
  
  if (fs.existsSync(screenshotPath)) {
    res.sendFile(screenshotPath);
  } else {
    res.status(404).send('Screenshot not found');
  }
});

// API endpoint to get agent logs
app.get('/api/logs', (req, res) => {
  try {
    const data = fs.readFileSync('agent_log.json', 'utf8');
    const logs = data.trim().split('\n').map(line => JSON.parse(line));
    res.json(logs);
  } catch (err) {
    console.error('Error reading logs:', err);
    res.json([]);
  }
});

// Add /data endpoint to match what the visualization is expecting
app.get('/data', (req, res) => {
  try {
    const data = fs.readFileSync('agent_log.json', 'utf8');
    const logs = data.trim().split('\n').map(line => JSON.parse(line));
    res.json(logs);
  } catch (err) {
    console.error('Error reading logs:', err);
    res.json([]);
  }
});

// API endpoint to get memory state
app.get('/api/memory', (req, res) => {
  try {
    const logs = fs.readFileSync('agent_log.json', 'utf8')
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));
    
    const memoryStates = logs
      .filter(log => log.memoryState)
      .map(log => log.memoryState);
    
    res.json(memoryStates.length > 0 ? memoryStates[memoryStates.length - 1] : {});
  } catch (err) {
    console.error('Error reading memory state:', err);
    res.json({});
  }
});

// API endpoint for loop detection analytics
app.get('/api/analytics', (req, res) => {
  try {
    const logs = fs.readFileSync('agent_log.json', 'utf8')
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));
    
    const analytics = {
      totalSteps: logs.length,
      loopDetections: logs.filter(log => log.isLooping).length,
      confidenceDistribution: {
        high: logs.filter(log => log.response?.confidence > 0.7).length,
        medium: logs.filter(log => log.response?.confidence > 0.4 && log.response?.confidence <= 0.7).length,
        low: logs.filter(log => log.response?.confidence <= 0.4 && log.response?.confidence !== undefined).length,
        unknown: logs.filter(log => log.response?.confidence === undefined).length
      },
      averageConfidence: logs
        .filter(log => log.response?.confidence !== undefined)
        .reduce((sum, log) => sum + log.response.confidence, 0) / 
        logs.filter(log => log.response?.confidence !== undefined).length || 0
    };
    
    res.json(analytics);
  } catch (err) {
    console.error('Error generating analytics:', err);
    res.json({});
  }
});

// Main dashboard HTML route
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Loop Guard Browser Agent Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f8f9fa; }
    .card { margin-bottom: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .card-header { background-color: #343a40; color: white; }
    .timeline-item { padding: 15px; border-left: 3px solid #007bff; margin-bottom: 10px; background-color: white; }
    .timeline-item.loop { border-left-color: #dc3545; }
    .screenshot { max-width: 100%; border-radius: 5px; }
    .confidence-high { background-color: #d4edda; }
    .confidence-medium { background-color: #fff3cd; }
    .confidence-low { background-color: #f8d7da; }
  </style>
</head>
<body>
  <nav class="navbar navbar-dark bg-dark">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1">🧠 Loop Guard Browser Agent Dashboard</span>
      <span class="navbar-text" id="lastUpdated"></span>
    </div>
  </nav>

  <div class="container-fluid mt-4">
    <div class="row">
      <!-- Stats -->
      <div class="col-md-3">
        <div class="card">
          <div class="card-header">Agent Statistics</div>
          <div class="card-body">
            <div class="row">
              <div class="col-6 text-center mb-3">
                <div class="text-muted">Total Steps</div>
                <div id="totalSteps" style="font-size: 24px; font-weight: bold;">-</div>
              </div>
              <div class="col-6 text-center mb-3">
                <div class="text-muted">Loop Detections</div>
                <div id="loopDetections" style="font-size: 24px; font-weight: bold;">-</div>
              </div>
              <div class="col-6 text-center">
                <div class="text-muted">Avg. Confidence</div>
                <div id="avgConfidence" style="font-size: 24px; font-weight: bold;">-</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">Memory State</div>
          <div class="card-body" id="memoryDetails">
            <p class="text-center text-muted">Loading memory data...</p>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="col-md-5">
        <div class="card">
          <div class="card-header">Agent Timeline</div>
          <div class="card-body" style="max-height: 800px; overflow-y: auto;">
            <div id="timeline">
              <p class="text-center text-muted">Loading timeline data...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Details Panel -->
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">Step Details</div>
          <div class="card-body" id="detailsPanel">
            <p class="text-center text-muted">Select a step from the timeline to view details</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <button class="btn btn-primary" style="position: fixed; bottom: 20px; right: 20px;" onclick="refreshData()">
    Refresh Data
  </button>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    // Fetch and display data
    async function refreshData() {
      try {
        // Fetch logs
        const logsResponse = await fetch('/api/logs');
        const logs = await logsResponse.json();
        
        // Fetch analytics
        const analyticsResponse = await fetch('/api/analytics');
        const analytics = await analyticsResponse.json();
        
        // Fetch memory state
        const memoryResponse = await fetch('/api/memory');
        const memory = await memoryResponse.json();
        
        // Update stats
        document.getElementById('totalSteps').textContent = analytics.totalSteps || 0;
        document.getElementById('loopDetections').textContent = analytics.loopDetections || 0;
        document.getElementById('avgConfidence').textContent = 
          analytics.averageConfidence ? (analytics.averageConfidence * 100).toFixed(0) + '%' : 'N/A';
        
        // Update memory details
        if (memory) {
          document.getElementById('memoryDetails').innerHTML = \`
            <div style="padding: 10px; background-color: #e9ecef; border-radius: 5px;">
              <div><strong>States in Memory:</strong> \${memory.memorySize || 0}/\${memory.limit || 10}</div>
              <div><strong>Loop Threshold:</strong> \${memory.loopThreshold || 'N/A'}</div>
            </div>
          \`;
        }
        
        // Update timeline
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';
        
        if (logs.length === 0) {
          timeline.innerHTML = '<p class="text-center text-muted">No data available</p>';
        } else {
          logs.forEach((log, index) => {
            const confidenceLevel = getConfidenceLevel(log.response?.confidence);
            const confidenceClass = 'confidence-' + confidenceLevel;
            
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';
            if (log.isLooping) timelineItem.className += ' loop';
            
            timelineItem.innerHTML = \`
              <h5>
                Step \${log.iteration + 1}
                <span class="badge bg-\${getBadgeColor(confidenceLevel)} float-end">
                  \${log.response?.confidence ? (log.response.confidence * 100).toFixed(0) + '%' : 'N/A'}
                </span>
              </h5>
              <p><strong>Action:</strong> \${log.response?.action || 'Unknown'}</p>
              \${log.timestamp ? \`<small class="text-muted">\${new Date(log.timestamp).toLocaleTimeString()}</small>\` : ''}
            \`;
            
            if (log.screenshotHash) {
              const img = document.createElement('img');
              img.className = 'screenshot mt-2';
              img.src = \`/screenshots/\${log.screenshotHash}\`;
              img.alt = \`Screenshot for step \${log.iteration + 1}\`;
              timelineItem.appendChild(img);
            }
            
            timelineItem.addEventListener('click', () => showDetails(log));
            timeline.appendChild(timelineItem);
          });
        }
        
        // Update last updated time
        document.getElementById('lastUpdated').textContent = 
          \`Last updated: \${new Date().toLocaleTimeString()}\`;
      } catch (err) {
        console.error('Error refreshing data:', err);
      }
    }
    
    function getConfidenceLevel(confidence) {
      if (confidence === undefined) return 'low';
      if (confidence > 0.7) return 'high';
      if (confidence > 0.4) return 'medium';
      return 'low';
    }
    
    function getBadgeColor(level) {
      if (level === 'high') return 'success';
      if (level === 'medium') return 'warning';
      return 'danger';
    }
    
    function showDetails(log) {
      const detailsPanel = document.getElementById('detailsPanel');
      
      let reasoningHtml = '';
      if (log.response?.reasoning) {
        reasoningHtml = \`
          <div class="card mb-3">
            <div class="card-header">Reasoning</div>
            <div class="card-body">
              <p>\${log.response.reasoning}</p>
            </div>
          </div>
        \`;
      }
      
      let alternativesHtml = '';
      if (log.response?.alternatives?.length) {
        alternativesHtml = \`
          <div class="card mb-3">
            <div class="card-header">Alternative Actions</div>
            <div class="card-body">
              <ul>
                \${log.response.alternatives.map(alt => \`<li>\${alt}</li>\`).join('')}
              </ul>
            </div>
          </div>
        \`;
      }
      
      let loopDetectionHtml = '';
      if (log.isLooping) {
        loopDetectionHtml = \`
          <div class="alert alert-danger">
            <strong>Loop Detected!</strong> The agent detected a potential loop in this step.
          </div>
        \`;
      }
      
      detailsPanel.innerHTML = \`
        <h4>Step \${log.iteration + 1} Details</h4>
        \${loopDetectionHtml}
        <div class="mb-3">
          <strong>Last Action:</strong> \${log.lastAction}<br>
          <strong>Current Action:</strong> \${log.response?.action || 'Unknown'}<br>
          <strong>Timestamp:</strong> \${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}<br>
          <strong>Confidence:</strong> \${log.response?.confidence ? (log.response.confidence * 100).toFixed(0) + '%' : 'N/A'}
        </div>
        \${reasoningHtml}
        \${alternativesHtml}
        <div class="card">
          <div class="card-header">Raw Data</div>
          <div class="card-body">
            <pre style="max-height: 200px; overflow-y: auto;">\${JSON.stringify(log, null, 2)}</pre>
          </div>
        </div>
      \`;
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      refreshData();
      // Refresh more frequently (every 2 seconds)
      setInterval(refreshData, 2000);
    });
  </script>
</body>
</html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});
