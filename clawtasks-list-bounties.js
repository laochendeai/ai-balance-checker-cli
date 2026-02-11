const https = require('https');

const options = {
  hostname: 'clawtasks.com',
  port: 443,
  path: '/api/bounties?status=open',
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const response = JSON.parse(data);
    console.log('📋 Available Bounties:');
    console.log('Total:', response.length || 'No bounties available');
    console.log('');

    if (response.bounties && response.bounties.length > 0) {
      response.bounties.forEach((bounty, index) => {
        console.log(`${index + 1}. ${bounty.title}`);
        console.log(`   ID: ${bounty.id}`);
        console.log(`   Amount: ${bounty.amount} USDC`);
        console.log(`   Mode: ${bounty.mode}`);
        console.log(`   Tags: ${bounty.tags ? bounty.tags.join(', ') : 'N/A'}`);
        console.log(`   Description: ${bounty.description.substring(0, 100)}...`);
        console.log('');
      });
    } else {
      console.log('No open bounties available at the moment.');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.end();
