const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const MemoryManager = require('./memory');
const memory = new MemoryManager(10); // Increased memory size for better context
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function callGemini(domContent, screenshotBuffer, lastAction, iteration) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Enhanced prompt for more detailed reasoning
  const prompt = {
    contents: [
      {
        parts: [
          {
            text: `You're a browser agent. Based on the screenshot and DOM content, what action should you take next?
            
Avoid repeating actions you've already tried. Prefer actions that help complete the form and avoid infinite loops.

The last action you performed was: "${lastAction}"
This is iteration: ${iteration}
            
Provide your response in JSON format with the following structure:
{
  "action": "ONE_OF_THE_ACTIONS_BELOW",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of your decision",
  "alternatives": ["List", "of", "alternative", "actions", "considered"]
}

Possible actions:
- type name
- type email
- click next to step 2
- select topic
- check
- click next to step 3
- click submit

Make sure your JSON is valid and properly formatted.`
          },
          {
            inline_data: {
              mime_type: 'image/png',
              data: screenshotBuffer.toString('base64')
            }
          }
        ]
      }
    ]
  };

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    try {
      // Try to parse as JSON
      const jsonResponse = JSON.parse(responseText);
      return jsonResponse;
    } catch (parseError) {
      // If not valid JSON, return the raw text as the action
      console.warn('Failed to parse LLM response as JSON:', parseError.message);
      return {
        action: responseText.trim(),
        confidence: 0.5,
        reasoning: "Response was not in JSON format",
        alternatives: []
      };
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error.message);
    return {
      action: 'Error: Failed to get response from Gemini',
      confidence: 0,
      reasoning: error.message,
      alternatives: []
    };
  }
}

async function agentStep(domContent, lastAction, screenshotBuffer, iteration) {
  const state = domContent + lastAction;
  const isLooping = memory.add(state);

  // Skip loop detection for the first 3 iterations to allow initial exploration
  if (isLooping && iteration > 3) {
    const loopingResponse = {
      action: "⚠️ Detected repeating pattern. Escalating to human.",
      confidence: 1.0,
      reasoning: "Agent detected a loop in the interaction pattern",
      alternatives: [],
      isError: true
    };
    
    fs.appendFileSync('agent_log.json', JSON.stringify({
      iteration,
      lastAction,
      response: loopingResponse,
      timestamp: new Date().toISOString(),
      isLooping: true,
      memoryState: memory.getState()
    }) + "\n");
    
    return loopingResponse.action;
  }

  const response = await callGemini(domContent, screenshotBuffer, lastAction, iteration);
  
  // Enhanced logging with more metadata
  fs.appendFileSync('agent_log.json', JSON.stringify({
    iteration,
    lastAction,
    response,
    timestamp: new Date().toISOString(),
    isLooping: false,
    domContentPreview: domContent.substring(0, 100) + '...',
    screenshotHash: require('crypto').createHash('md5').update(screenshotBuffer).digest('hex')
  }) + "\n");
  
  return response.action;
}

module.exports = agentStep;
