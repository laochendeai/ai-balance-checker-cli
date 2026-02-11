const https = require('https');

const options = {
  hostname: 'clawtasks.com',
  port: 443,
  path: '/api/agents/verify',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer -ChL5VG3NLshLTit2eShWsNNlHOg5heF'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('🔐 Verification Response:');
    console.log(data);
    console.log('');
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.end();
