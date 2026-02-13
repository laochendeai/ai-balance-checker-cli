#!/usr/bin/env node
/**
 * OpenWork Manual Submission Helper
 *
 * Submit generated content to OpenWork missions
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = process.env.CONFIG_PATH || './config.json';
if (!fs.existsSync(configPath)) {
  console.error(`❌ Config file not found: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const API_BASE = 'https://openwork.bot/api';
const API_KEY = config.apiKey;

async function submitMission(missionId, content) {
  try {
    console.log(`📋 Claiming mission ${missionId}...`);

    // First, claim the mission
    await axios.post(
      `${API_BASE}/missions/${missionId}/claim`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Mission claimed!`);

    // Then submit the content
    console.log(`📤 Submitting mission ${missionId}...`);

    const response = await axios.post(
      `${API_BASE}/missions/${missionId}/submit`,
      {
        submission: {
          content: content,
          submittedAt: new Date().toISOString()
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Mission submitted successfully!`);
    console.log(`   Response:`, response.data);

    return response.data;
  } catch (error) {
    console.error(`❌ Submission failed:`, error.response?.data || error.message);
    throw error;
  }
}

async function listAvailableMissions() {
  try {
    const response = await axios.get(`${API_BASE}/missions`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      params: {
        status: 'open',
        limit: 20
      }
    });

    return response.data.missions || [];
  } catch (error) {
    console.error(`❌ Failed to fetch missions:`, error.response?.data || error.message);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
OpenWork Manual Submission Helper

Usage:
  node submit-manual.js list                    - List available missions
  node submit-manual.js submit <mission-id>     - Submit content for a mission
  node submit-manual.js submit <mission-id> <content-file>  - Submit from file

Examples:
  node submit-manual.js list
  node submit-manual.js submit 12345678-1234-1234-1234-123456789abc
  node submit-manual.js submit 12345678-1234-1234-1234-123456789abc content.txt

Environment variables:
  CONFIG_PATH  - Path to config.json (default: ./config.json)
    `);
    process.exit(0);
  }

  const command = args[0];

  if (command === 'list') {
    listAvailableMissions()
      .then(missions => {
        console.log(`\n📋 Available Missions (${missions.length}):\n`);
        missions.forEach(m => {
          console.log(`🎯 [${m.id}] ${m.title}`);
          console.log(`   Reward: ${m.reward || 0} tokens`);
          console.log(`   Tags: ${m.tags?.join(', ') || 'none'}`);
          console.log();
        });
      })
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else if (command === 'submit') {
    if (args.length < 2) {
      console.error('❌ Missing mission ID');
      process.exit(1);
    }

    const missionId = args[1];
    let content;

    if (args.length >= 3) {
      // Read from file
      const contentFile = args[2];
      if (!fs.existsSync(contentFile)) {
        console.error(`❌ Content file not found: ${contentFile}`);
        process.exit(1);
      }
      content = fs.readFileSync(contentFile, 'utf8');
    } else {
      // Read from stdin
      console.log('Enter content (press Ctrl+D when done):');
      content = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => content += chunk);
      process.stdin.on('end', () => {
        submitMission(missionId, content)
          .then(() => process.exit(0))
          .catch(err => {
            console.error(err);
            process.exit(1);
          });
      });
      return; // Exit here, stdin handler will process
    }

    submitMission(missionId, content)
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else {
    console.error(`❌ Unknown command: ${command}`);
    console.log('Run without arguments to see usage.');
    process.exit(1);
  }
}

module.exports = { submitMission, listAvailableMissions };
