const { ethers } = require('ethers');
const https = require('https');

// 1. 生成钱包
const wallet = ethers.Wallet.createRandom();

console.log('🦀 Wallet Generated:');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('');

// 2. 注册到 ClawTasks
const registerData = JSON.stringify({
  name: 'Wangcai',
  wallet_address: wallet.address
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
