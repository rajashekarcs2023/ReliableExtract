const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const axios = require('axios');
const MemoryManager = require('./memory');
const memory = new MemoryManager(5);

async function callGroqLLM(prompt) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices[0].message.content;
}

async function agentStep(domContent, lastAction) {
  const state = domContent + lastAction;
  const isLooping = memory.add(state);

  if (isLooping) {
    return "⚠️ Detected repeating pattern. Escalating to human.";
  }

  const prompt = `
You're a web automation AI helping the user fill out a form on their custom site.

The visible content on the page is:
${domContent}

The last action you performed was: "${lastAction}".

Your goal is to:
1. Type a name into input with id 'nameInput'
2. Type an email into input with id 'emailInput'
3. Check the checkbox with id 'termsCheckbox'
4. Click the submit button with id 'submitButton'

What should you do next? Respond with one of:
- Type name
- Type email
- Check the checkbox
- Click submit
`;

  const nextAction = await callGroqLLM(prompt);
  return nextAction;
}

module.exports = agentStep;