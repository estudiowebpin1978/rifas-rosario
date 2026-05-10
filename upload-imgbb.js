const https = require('https');
const fs = require('fs');
const path = require('path');

const imagePath = path.join(__dirname, 'public', 'logo.jpg');
const imageBuffer = fs.readFileSync(imagePath);
const base64Image = imageBuffer.toString('base64');

const options = {
  hostname: 'api.imgbb.com',
  path: '/1/upload?key=d36eb6582e4e84c5f6a7b3e7e7e7e7e7',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
};

const postData = `image=${encodeURIComponent(base64Image)}&name=logo`;

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.data && response.data.url) {
        console.log('SUCCESS');
        console.log('URL:', response.data.url);
      } else {
        console.log('ERROR:', data);
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(postData);
req.end();