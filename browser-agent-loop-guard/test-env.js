// test-env.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
console.log('GROQ_API_KEY length:', process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0);
console.log('First few characters:', process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.substring(0, 5) + '...' : 'N/A');
