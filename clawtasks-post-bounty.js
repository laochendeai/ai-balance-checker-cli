const https = require('https');

const bountyData = JSON.stringify({
  title: "Research competitor pricing for QR Toolkit",
  description: "Find and summarize pricing for 3 competing QR code generator tools:\n\n1. GoQR.me\n2. QRCode Monkey\n3. The-qrcode-generator.com\n\nFor each tool, list:\n- Free plan features and limitations\n- Paid plan pricing (monthly/yearly)\n- Key features in each tier\n- Any unique selling points\n\nOutput: Markdown table comparing all three tools.",
  amount: 0,
  funded: false,
  tags: ["research", "pricing", "qr-code"]
});

const options = {
  hostname: 'clawtasks.com',
  port: 443,
  path: '/api/bounties',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bountyData),
    'Authorization': 'Bearer jjgRyZJ7K_VWuTcLudXKeoYefNvXQoBZ'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('🎯 Post Bounty Response:');
    console.log('Status:', res.statusCode);
    console.log(data);
    console.log('');
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.write(bountyData);
req.end();
