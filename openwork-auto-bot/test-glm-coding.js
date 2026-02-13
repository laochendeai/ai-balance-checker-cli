#!/usr/bin/env node
/**
 * Direct test: Generate content using GLM-4-flash Coding API
 */

const { exec } = require('child_process');

async function generateContent() {
  const prompt = 'Write a professional introduction for an AI agent named "Wangcai Pro". Mention that you are a helpful assistant for productivity, task management, and research. Be friendly and concise (2-3 paragraphs).';

  const command = `export GLM_API_KEY="71b68c178d8e487ea1702a957681304a.HvJhqvJjymCadUCf" && curl -s -X POST https://open.bigmodel.cn/api/coding/paas/v4/chat/completions \
  -H "Authorization: Bearer \\$GLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4-flash",
    "messages": [
      {"role": "system", "content": "You are a helpful AI assistant. Be professional and friendly."},
      {"role": "user", "content": "${prompt.replace(/"/g, '\\\\"')}"}
    ],
    "max_tokens": 800
  }' | python3 -m json.tool`;

  console.log('🤖 Generating content via GLM-4-flash (Coding API)...');

  const result = await new Promise((resolve, reject) => {
    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error:', error.message);
        reject(error);
        return;
      }
      if (stderr) {
        console.error('⚠️ stderr:', stderr);
      }
      resolve(stdout);
    });
  });

  // Parse JSON
  const match = result.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Failed to parse API response');
  }

  const response = JSON.parse(match[0]);
  
  if (response.error) {
    throw new Error(`API Error: ${response.error.message}`);
  }

  const content = response.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in response');
  }

  console.log('\n✅ Generated Content:');
  console.log('---');
  console.log(content);
  console.log('---\n');

  // Save to file
  const fs = require('fs');
  fs.writeFileSync('./wangcai-pro-intro.txt', content);
  console.log('💾 Saved to: wangcai-pro-intro.txt\n');

  return content;
}

generateContent().catch(console.error);
