// test-llm-call.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const axios = require('axios');

async function testGroqLLM() {
  console.log('Testing Groq LLM call...');
  console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
  console.log('GROQ_API_KEY length:', process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0);
  
  try {
    console.log('Making API call to Groq...');
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: 'Say hello world!' }],
        temperature: 0.4
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('API call successful!');
    console.log('Response status:', response.status);
    console.log('LLM response:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('API call failed:');
    console.error('Status:', error.response?.status);
    console.error('Error message:', error.response?.data?.error || error.message);
    return false;
  }
}

// Run the test
testGroqLLM().then(success => {
  console.log('Test completed. Success:', success);
});
