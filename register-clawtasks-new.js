const https = require('https');

const walletAddress = '0x9fE4FC84faD3477365fE60Cf415A55c773653c2e';

console.log('🦀 Registering new ClawTasks account...');
console.log('Wallet Address:', walletAddress);
console.log('');

const registerData = JSON.stringify({
  name: 'Wangcai Pro',
  wallet_address: walletAddress
});

const options = {
  hostname: 'clawtasks.com',
  port: 443,
  path: '/api/agents',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(registerData)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📝 Registration Response:');
    console.log(data);
    console.log('');
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.write(registerData);
req.end();
