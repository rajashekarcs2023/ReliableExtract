const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const MemoryManager = require('./memory');
const memory = new MemoryManager(5);
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function callGemini(domContent, screenshotBuffer) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Create parts for the multipart prompt
  const prompt = {
    contents: [
      {
        parts: [
          {
            text: `You're a browser agent. Based on the screenshot and DOM content, what action should you take next?
            
Avoid repeating actions you've already tried. Prefer actions that help complete the form and avoid infinite loops.
            
You MUST respond with ONLY ONE of these exact phrases (choose the most appropriate one):
- type name
- type email
- click next to step 2
- select topic
- check
- click next to step 3
- click submit

DO NOT include any other text in your response, just one of these exact phrases.
            
DOM:
${domContent}`
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
    return response.text();
  } catch (error) {
    console.error('Error calling Gemini API:', error.message);
    return 'Error: Failed to get response from Gemini';
  }
}

async function agentStep(domContent, lastAction, screenshotBuffer, iteration) {
  const state = domContent + lastAction;
  const isLooping = memory.add(state);

  if (isLooping) {
    return "⚠️ Detected repeating pattern. Escalating to human.";
  }

  const nextAction = await callGemini(domContent, screenshotBuffer);

  fs.appendFileSync('agent_log.json', JSON.stringify({ iteration, lastAction, nextAction }) + "\n");
  return nextAction;
}

module.exports = agentStep;
