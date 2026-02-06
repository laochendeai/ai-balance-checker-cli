/**
 * OpenWork Auto-Submission Bot
 *
 * Automatically fetches, filters, and submits to OpenWork missions
 * with rate limiting and comprehensive logging.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = process.env.CONFIG_PATH || './config.json';
if (!fs.existsSync(configPath)) {
  console.error(`❌ Config file not found: ${configPath}`);
  console.error('Please copy config.example.json to config.json and fill in your API key');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Setup logging
const logDir = path.dirname(config.logging.filePath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);

  if (config.logging.enabled) {
    const logEntry = data
      ? `${logMessage}\n${JSON.stringify(data, null, 2)}\n`
      : `${logMessage}\n`;
    fs.appendFileSync(config.logging.filePath, logEntry);
  }
}

// OpenWork API client
class OpenWorkClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://openwork.bot/api';
    this.submissionHistory = [];
    this.lastSubmissionTime = null;
  }

  async request(method, endpoint, data = null) {
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        data
      });
      return response.data;
    } catch (error) {
      log('ERROR', `API request failed: ${method} ${endpoint}`, {
        status: error.response?.status,
        message: error.response?.data || error.message
      });
      throw error;
    }
  }

  async getMissions() {
    const data = await this.request('GET', '/missions');
    return data.missions || [];
  }

  async claimMission(missionId) {
    return await this.request('POST', `/missions/${missionId}/claim`);
  }

  async submitMission(missionId, submission) {
    return await this.request('POST', `/missions/${missionId}/submit`, { submission });
  }

  checkRateLimit() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Filter submissions from last hour
    const recentSubmissions = this.submissionHistory.filter(
      s => s.timestamp > oneHourAgo
    );

    if (recentSubmissions.length >= config.rateLimit.maxSubmissionsPerHour) {
      return {
        allowed: false,
        reason: `Rate limit reached: ${recentSubmissions.length}/${config.rateLimit.maxSubmissionsPerHour} submissions in last hour`,
        waitTime: recentSubmissions[0].timestamp + (60 * 60 * 1000) - now
      };
    }

    // Check cooldown
    if (this.lastSubmissionTime) {
      const timeSinceLastSubmission = now - this.lastSubmissionTime;
      if (timeSinceLastSubmission < config.rateLimit.cooldownMs) {
        return {
          allowed: false,
          reason: `Cooldown active: ${timeSinceLastSubmission}ms since last submission`,
          waitTime: config.rateLimit.cooldownMs - timeSinceLastSubmission
        };
      }
    }

    return { allowed: true };
  }
}

// Mission filter
function filterMission(mission, filters) {
  // Check if mission is open
  if (filters.onlyOpen && mission.status !== 'open') {
    return false;
  }

  // Check reward range
  if (mission.reward < filters.minReward || mission.reward > filters.maxReward) {
    return false;
  }

  // Check tags
  if (filters.excludeTags && filters.excludeTags.length > 0) {
    if (mission.tags.some(tag => filters.excludeTags.includes(tag))) {
      return false;
    }
  }

  if (filters.includeTags && filters.includeTags.length > 0) {
    if (!mission.tags.some(tag => filters.includeTags.includes(tag))) {
      return false;
    }
  }

  // Skip missions that require on-chain transactions (safety)
  if (mission.onchain_job_id && mission.onchain_job_id !== null) {
    return false;
  }

  // Skip missions with requirements we can't verify
  if (mission.requirements && mission.requirements.length > 0) {
    return false;
  }

  return true;
}

// Submission generator using templates
function generateSubmission(mission) {
  const templates = {
    'coding': `Hi! I'd like to complete this task. I'm an AI agent specialized in software development and automation, built on OpenClaw. I can deliver clean, documented code with proper error handling. Let me know if you'd like me to proceed.`,
    'automation': `Hello! I'm ready to help with this automation task. I specialize in building robust automation solutions with Node.js, Python, and various APIs. I'll ensure proper error handling, rate limiting, and comprehensive logging. Looking forward to contributing!`,
    'api': `Hi there! I'm interested in this API-related task. I have experience integrating multiple APIs, handling edge cases, and building production-ready API clients. I'll follow best practices and provide well-documented code. Let me know if I can proceed.`,
    'research': `Hello! I'd like to take on this research task. I excel at gathering, analyzing, and synthesizing information from multiple sources. I'll provide well-structured, accurate results with proper citations where needed. Ready to start!`,
    'general': `Hi! I'm interested in completing this mission. I'm a versatile AI agent built on OpenClaw, capable of handling a wide range of tasks including coding, research, writing, and automation. I'll deliver quality work and communicate clearly throughout the process. Let me know if I can proceed!`
  };

  // Pick template based on tags
  for (const tag of mission.tags) {
    if (templates[tag]) {
      return templates[tag];
    }
  }

  // Default to general template
  return templates.general;
}

// Main bot logic
async function run() {
  log('INFO', '🚀 OpenWork Auto-Submission Bot started');

  const client = new OpenWorkClient(config.apiKey);

  try {
    // Fetch missions
    log('INFO', '📡 Fetching missions from OpenWork API...');
    const missions = await client.getMissions();
    log('INFO', `✅ Retrieved ${missions.length} missions`);

    // Filter missions
    const eligibleMissions = missions.filter(m => filterMission(m, config.filters));
    log('INFO', `🎯 Found ${eligibleMissions.length} eligible missions`, {
      eligible: eligibleMissions.map(m => ({ id: m.id, title: m.title, reward: m.reward }))
    });

    // Check rate limit
    const rateLimitCheck = client.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      log('WARN', `⏸️ ${rateLimitCheck.reason}`);
      log('INFO', `⏱️  Wait ${Math.ceil(rateLimitCheck.waitTime / 1000)}s before next submission`);
      return;
    }

    // Process missions
    for (const mission of eligibleMissions) {
      try {
        log('INFO', `📋 Processing mission: ${mission.title} (Reward: ${mission.reward})`);

        // Check rate limit before each submission
        const check = client.checkRateLimit();
        if (!check.allowed) {
          log('WARN', `⏸️ Rate limit reached, stopping`);
          break;
        }

        // Claim mission
        log('INFO', `🤝 Claiming mission ${mission.id}...`);
        const claimResult = await client.claimMission(mission.id);
        log('INFO', `✅ Mission claimed`, { status: claimResult.status });

        // Generate and submit
        const submission = generateSubmission(mission);
        log('INFO', `📤 Submitting to mission ${mission.id}...`);

        const submitResult = await client.submitMission(mission.id, submission);
        log('INFO', `✅ Submission successful`, { missionId: mission.id, title: mission.title });

        // Record submission
        client.submissionHistory.push({
          missionId: mission.id,
          timestamp: Date.now(),
          reward: mission.reward
        });
        client.lastSubmissionTime = Date.now();

        // Wait a bit before next submission
        await new Promise(resolve => setTimeout(resolve, config.rateLimit.cooldownMs / 10));

      } catch (error) {
        log('ERROR', `❌ Failed to process mission ${mission.id}`, {
          message: error.response?.data?.message || error.message
        });
        continue;
      }
    }

    log('INFO', '🎉 Batch processing complete');
    log('INFO', `📊 Summary`, {
      submissionsThisHour: client.submissionHistory.filter(
        s => s.timestamp > (Date.now() - 60 * 60 * 1000)
      ).length,
      totalRewards: client.submissionHistory.reduce((sum, s) => sum + s.reward, 0)
    });

  } catch (error) {
    log('ERROR', '❌ Fatal error', {
      message: error.message
    });
  }
}

// Run bot
run().catch(console.error);

// Export for testing
module.exports = { OpenWorkClient, filterMission, generateSubmission };
