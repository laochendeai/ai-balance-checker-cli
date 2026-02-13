#!/usr/bin/env node
/**
 * OpenWork Content Generator using OpenClaw sessions_spawn
 *
 * Generates AI content using OpenClaw's GLM-4.7 model (consumes Coding Pro quota)
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Generate content using OpenClaw sessions_spawn
 * This uses GLM-4.7 model and consumes Coding Pro quota
 */
async function generateContentViaOpenClaw(prompt, taskType = 'generic') {
  const systemPrompts = {
    research: `You are a research assistant that provides thorough, well-structured analysis. 
Include data sources, methodology, and clear conclusions. Respond in English.`,

    writing: `You are a professional content writer that creates engaging, high-quality articles.
Use clear structure, appropriate tone, and compelling language. Respond in English.`,

    analysis: `You are an analytical expert that provides data-driven insights.
Include charts/tables where relevant, and actionable recommendations. Respond in English.`,

    generic: `You are a helpful AI assistant that completes tasks thoroughly and accurately.
Provide comprehensive, professional responses. Respond in English.`
  };

  const systemPrompt = systemPrompts[taskType] || systemPrompts.generic;

  const fullPrompt = `${systemPrompt}\n\nTask:\n${prompt}`;

  try {
    // Use sessions_spawn to call OpenClaw's GLM-4.7 model
    const command = `openclaw sessions_spawn --task "${fullPrompt.replace(/"/g, '\\"')}" --cleanup delete`;

    console.log(`🤖 Generating content via OpenClaw (GLM-4.7)...`);

    const result = await new Promise((resolve, reject) => {
      exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Error generating content:`, error);
          reject(error);
          return;
        }
        if (stderr) {
          console.error(`⚠️ stderr:`, stderr);
        }
        resolve(stdout);
      });
    });

    // Parse the result (sessions_spawn outputs the agent's response)
    const content = extractContent(result);

    console.log(`✅ Content generated (${content.length} chars)`);

    return content;
  } catch (error) {
    console.error(`❌ Failed to generate content:`, error.message);
    throw error;
  }
}

/**
 * Extract the actual content from sessions_spawn output
 * Remove session ID and other metadata
 */
function extractContent(output) {
  // sessions_spawn output format:
  // "Spawned session: [session_id]\n[agent response text]"

  // Remove session ID line if present
  const lines = output.split('\n');
  const contentLines = lines.filter(line =>
    !line.startsWith('Spawned session') &&
    !line.startsWith('Session spawned') &&
    !line.startsWith('[') &&
    line.trim() !== ''
  );

  return contentLines.join('\n').trim();
}

/**
 * Generate content for specific mission types
 */
async function generateForMission(mission) {
  const tags = mission.tags || [];
  const description = mission.description?.toLowerCase() || '';
  const title = mission.title?.toLowerCase() || '';

  // Determine task type
  let taskType = 'generic';

  if (tags.includes('research') || description.includes('research')) {
    taskType = 'research';
  } else if (tags.includes('writing') || description.includes('write')) {
    taskType = 'writing';
  } else if (tags.includes('analysis') || description.includes('analyze')) {
    taskType = 'analysis';
  }

  // Build prompt
  const prompt = `Mission Title: ${mission.title}
Mission Description: ${mission.description}
Tags: ${tags.join(', ') || 'none'}

Please provide a complete, high-quality response that addresses all aspects of this mission.`;

  console.log(`\n📋 Mission: ${mission.title}`);
  console.log(`   Type: ${taskType}`);

  return await generateContentViaOpenClaw(prompt, taskType);
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
OpenWork Content Generator via OpenClaw (GLM-4.7)

Usage:
  node generate-content-via-openclaw.js <mission-id>     - Generate content for a mission

This tool uses OpenClaw's sessions_spawn to generate AI content,
consuming your GLM Coding Pro quota instead of separate API calls.

Note: Requires 'openclaw' CLI to be installed and configured.
    `);
    process.exit(0);
  }

  const missionId = args[0];

  if (!missionId) {
    console.error('❌ Missing mission ID');
    process.exit(1);
  }

  // Fetch mission from OpenWork API
  const axios = require('axios');
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

  console.log(`📡 Fetching mission ${missionId}...`);

  axios.get(`https://openwork.bot/api/missions/${missionId}`, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`
    }
  })
  .then(response => {
    const mission = response.data;
    return generateForMission(mission);
  })
  .then(content => {
    console.log('\n✅ Generated Content:');
    console.log('---');
    console.log(content);
    console.log('---');

    // Save to file
    const outputFile = path.join(__dirname, `generated-content-${missionId}.txt`);
    fs.writeFileSync(outputFile, content);
    console.log(`\n💾 Saved to: ${outputFile}`);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { generateContentViaOpenClaw, generateForMission };
