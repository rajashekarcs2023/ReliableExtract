const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const MemoryManager = require('./memory');
const memory = new MemoryManager(10); // Increased memory size for better context
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const crypto = require('crypto');

async function callGemini(domContent, screenshotBuffer, lastAction, iteration, extraContext = '', forcedFormat = false) {
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
${extraContext}
            
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

${forcedFormat ? 'CRITICAL: DO NOT include code blocks, backticks, or any formatting in your response. Return ONLY the raw JSON object.' : 'Make sure your JSON is valid and properly formatted.'}`
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
      // Try to extract JSON from the response if it contains code blocks
      let jsonText = responseText;
      
      // Remove any markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1].trim();
      }
      
      // Try to parse as JSON
      const jsonResponse = JSON.parse(jsonText);
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

// Track previously tried self-correction strategies for each loop pattern
const selfCorrectionAttempts = new Map();
const triedActions = new Map(); // Track actions tried for each loop pattern
const alternativeStrategies = new Map(); // Track alternative strategies for each loop pattern
const MAX_SELF_CORRECTION_ATTEMPTS = 3;

async function agentStep(domContent, lastAction, screenshotBuffer, iteration) {
  const state = domContent + lastAction;
  const isLooping = memory.add(state);
  const memoryState = memory.getState();
  
  // Skip loop detection for the first 3 iterations to allow initial exploration
  if (isLooping && iteration > 3) {
    // Get the loop pattern ID from the memory state
    const loopPatternId = memoryState.stateHistory[memoryState.stateHistory.length - 1].hash;
    const attemptCount = selfCorrectionAttempts.get(loopPatternId) || 0;
    
    // If we've tried self-correction too many times for this pattern, escalate to human
    if (attemptCount >= MAX_SELF_CORRECTION_ATTEMPTS) {
      const loopingResponse = {
        action: "⚠️ Detected repeating pattern. Escalating to human after multiple self-correction attempts.",
        confidence: 1.0,
        reasoning: "Agent detected a persistent loop despite self-correction attempts",
        alternatives: [],
        isError: true
      };
      
      fs.appendFileSync('agent_log.json', JSON.stringify({
        iteration,
        lastAction,
        response: loopingResponse,
        timestamp: new Date().toISOString(),
        isLooping: true,
        selfCorrectionAttempt: attemptCount + 1,
        memoryState: memoryState
      }) + "\n");
      
      return loopingResponse.action;
    }
    
    // Try self-correction with a different approach
    selfCorrectionAttempts.set(loopPatternId, attemptCount + 1);
    
    // Get list of previously tried actions for this loop pattern
    let previouslyTriedActions = triedActions.get(loopPatternId) || [];
    if (!previouslyTriedActions.includes(lastAction)) {
      previouslyTriedActions.push(lastAction);
    }
    triedActions.set(loopPatternId, previouslyTriedActions);
    
    // Get alternative strategies that haven't been tried yet
    const allPossibleActions = [
      "type name", 
      "type email", 
      "click next to step 2", 
      "select topic", 
      "check", 
      "click next to step 3", 
      "click submit"
    ];
    
    // Filter out actions we've already tried
    const availableActions = allPossibleActions.filter(action => 
      !previouslyTriedActions.includes(action)
    );
    
    // If we have available actions, choose one randomly
    let suggestedAction = null;
    if (availableActions.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableActions.length);
      suggestedAction = availableActions[randomIndex];
    }
    
    // Create a self-correction prompt with more context about the loop
    let selfCorrectionPrompt = `IMPORTANT: You're stuck in a loop. You've tried these actions but they're not working: "${previouslyTriedActions.join('", "')}".
      
      CRITICAL INSTRUCTIONS:
      1. You MUST try a completely different action than before
      2. You MUST return a properly formatted JSON response
      3. DO NOT include any backticks (\`\`\`) or code blocks in your response
      4. If you've tried clicking buttons, try checking boxes or selecting options instead
      5. If you've tried form fields, try navigation actions instead
      `;
      
    // Add suggested action if available
    if (suggestedAction) {
      selfCorrectionPrompt += `
      STRONG RECOMMENDATION: Consider trying "${suggestedAction}" as it hasn't been attempted yet.
      `;
    }
    
    selfCorrectionPrompt += `
      Current DOM shows: "${domContent.substring(0, 200)}..."
      
      This is self-correction attempt #${attemptCount + 1} of ${MAX_SELF_CORRECTION_ATTEMPTS}.
      If you don't succeed soon, control will be handed to a human.`;
    
    // Generate a unique hash for this correction attempt to avoid similar responses
    const correctionId = crypto.createHash('md5')
      .update(selfCorrectionPrompt + Date.now().toString())
      .digest('hex').substring(0, 8);
    
    // Call Gemini with special self-correction prompt and force proper formatting
    const selfCorrectionResponse = await callGemini(
      domContent, 
      screenshotBuffer, 
      selfCorrectionPrompt, 
      iteration,
      selfCorrectionPrompt,
      true // Force proper JSON formatting
    );
    
    // If we have a suggested action and the model didn't use it, override with 50% probability
    if (suggestedAction && 
        selfCorrectionResponse.action !== suggestedAction && 
        Math.random() > 0.5) {
      selfCorrectionResponse.action = suggestedAction;
      selfCorrectionResponse.reasoning += " [Agent override: Trying suggested action to break loop]";
      selfCorrectionResponse.confidence = Math.min(selfCorrectionResponse.confidence + 0.2, 1.0);
    }
    
    // Add self-correction metadata
    selfCorrectionResponse.reasoning = "Self-correction attempt #" + (attemptCount + 1) + ": " + selfCorrectionResponse.reasoning;
    selfCorrectionResponse.isSelfCorrection = true;
    selfCorrectionResponse.correctionId = correctionId;
    
    fs.appendFileSync('agent_log.json', JSON.stringify({
      iteration,
      lastAction,
      response: selfCorrectionResponse,
      timestamp: new Date().toISOString(),
      isLooping: true,
      selfCorrectionAttempt: attemptCount + 1,
      memoryState: memoryState,
      suggestedAction: suggestedAction
    }) + "\n");
    
    return selfCorrectionResponse.action;
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
