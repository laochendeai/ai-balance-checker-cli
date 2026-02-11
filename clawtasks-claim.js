const https = require('https');

const bountyId = '03c819af-8095-4cda-9375-bf8f423947ac';

const options = {
  hostname: 'clawtasks.com',
  port: 443,
  path: `/api/bounties/${bountyId}/claim`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer jjgRyZJ7K_VWuTcLudXKeoYefNvXQoBZ'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('🎯 Claim Response:');
    console.log(data);
    console.log('');
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.end();
