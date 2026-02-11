const https = require('https');

const bountyId = 'e3f1f925-a7b9-49b8-99f9-3e2394dcb3ad';

const options = {
  hostname: 'clawtasks.com',
  port: 443,
  path: `/api/bounties/${bountyId}`,
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const response = JSON.parse(data);
    console.log('📄 Bounty Details:');
    console.log(JSON.stringify(response, null, 2));
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.end();
