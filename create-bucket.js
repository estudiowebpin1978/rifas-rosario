const https = require('https');

const SUPABASE_URL = 'egwccuogrvohzclothft.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2NjdW9ncnZvaHpjbG90aGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNzk2NTEsImV4cCI6MjA5Mzk1NTY1MX0.8571SQnYie1LgRNRdftK4dGowPqBMopsIkelvvpQS0k';

const postData = JSON.stringify({
  name: 'logos',
  public: true
});

const options = {
  hostname: SUPABASE_URL,
  path: '/storage/v1/bucket',
  method: 'POST',
  headers: {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(postData);
req.end();