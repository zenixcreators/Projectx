const axios = require('axios');

async function testAll() {
  const PORT = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${PORT}`;
  
  console.log('--- Testing API via Local Server ---');
  
  try {
    // 1. Sign up a test user
    const email = `test_${Date.now()}@example.com`;
    const password = 'password123';
    console.log(`Registering user: ${email}...`);
    
    const signupRes = await axios.post(`${baseUrl}/auth/signup`, {
      email,
      password,
      firstName: 'Test',
      lastName: 'User'
    });
    
    const cookie = signupRes.headers['set-cookie']?.[0];
    console.log('Signup success. Cookie received:', cookie ? 'Yes' : 'No');
    
    const headers = {};
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    
    // 2. Test generate-hooks
    console.log('\nTesting POST /api/generate-hooks...');
    try {
      const hooksRes = await axios.post(`${baseUrl}/api/generate-hooks`, {
        topic: 'Losing 5kg in 30 days',
        tone: 'Energetic'
      }, { headers });
      console.log('Generate Hooks Status:', hooksRes.status);
      console.log('Generate Hooks Response keys:', Object.keys(hooksRes.data));
      console.log('Generate Hooks sample:', hooksRes.data.hooks?.[0]);
    } catch (e) {
      console.error('Generate Hooks Error:', e.response?.data || e.message);
    }
    
    // 3. Test test-script
    console.log('\nTesting POST /api/test-script...');
    try {
      const scriptRes = await axios.post(`${baseUrl}/api/test-script`, {
        script: '[Hook]\nI lost 5kg in 30 days and you can too.\n\n[Problem]\nMost people starve themselves.\n\n[Shift]\nBut it is actually about hormone balance.',
        topic: 'Losing 5kg in 30 days',
        tone: 'Energetic'
      }, { headers });
      console.log('Test Script Status:', scriptRes.status);
      console.log('Test Script Response keys:', Object.keys(scriptRes.data));
      console.log('Test Script Score:', scriptRes.data.score);
    } catch (e) {
      console.error('Test Script Error:', e.response?.data || e.message);
    }
    
  } catch (error) {
    console.error('Global Error in test-api:', error.response?.data || error.message);
  }
}

testAll();
