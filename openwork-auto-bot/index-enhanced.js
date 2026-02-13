/**
 * OpenWork Enhanced Auto-Submission Bot with AI Content Generation
 *
 * - AI-powered content generation for mission submissions
 * - Smart task classification and routing
 * - Quality control and validation
 * - 24/7 automated operation
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

// AI Content Generator
class AIContentGenerator {
  constructor() {
    // Use available AI providers
    this.providers = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1'
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: 'https://api.anthropic.com'
      }
    };
  }

  async generateForMission(mission) {
    const taskType = this.classifyTask(mission);

    switch (taskType) {
      case 'research':
        return await this.generateResearchContent(mission);
      case 'writing':
        return await this.generateWritingContent(mission);
      case 'analysis':
        return await this.generateAnalysisContent(mission);
      case 'social':
        return await this.generateSocialContent(mission);
      case 'documentation':
        return await this.generateDocumentationContent(mission);
      default:
        return await this.generateGenericContent(mission);
    }
  }

  classifyTask(mission) {
    const tags = mission.tags || [];
    const description = mission.description?.toLowerCase() || '';
    const title = mission.title?.toLowerCase() || '';

    // Research tasks
    if (tags.includes('research') || description.includes('research') ||
        description.includes('analyze') || description.includes('investigate')) {
      return 'research';
    }

    // Writing tasks
    if (tags.includes('writing') || tags.includes('content') ||
        description.includes('write') || description.includes('create content')) {
      return 'writing';
    }

    // Analysis tasks
    if (tags.includes('analysis') || tags.includes('data') ||
        description.includes('analyze data') || description.includes('review')) {
      return 'analysis';
    }

    // Social media tasks
    if (tags.includes('social') || tags.includes('twitter') ||
        description.includes('post') || description.includes('share')) {
      return 'social';
    }

    // Documentation tasks
    if (tags.includes('documentation') || tags.includes('tutorial') ||
        description.includes('guide') || description.includes('how-to')) {
      return 'documentation';
    }

    return 'generic';
  }

  async generateResearchContent(mission) {
    // Generate research report
    const prompt = `You are an AI researcher. Based on the following mission description, generate a comprehensive research report:

Mission Title: ${mission.title}
Mission Description: ${mission.description}

Generate a detailed research report that includes:
1. Executive Summary (2-3 sentences)
2. Key Findings (bullet points)
3. Methodology (brief explanation)
4. Recommendations (2-3 actionable items)

Keep it professional, concise, and well-structured.`;

    return await this.callAI(prompt);
  }

  async generateWritingContent(mission) {
    const prompt = `You are a professional content writer. Based on the following mission, create high-quality content:

Mission Title: ${mission.title}
Mission Description: ${mission.description}

Requirements:
- Write engaging, well-structured content
- Use clear headings and bullet points where appropriate
- Keep it concise but comprehensive
- Focus on providing value to the reader

Generate the content now:`;

    return await this.callAI(prompt);
  }

  async generateAnalysisContent(mission) {
    const prompt = `You are a data analyst. Based on the following mission, provide a thorough analysis:

Mission Title: ${mission.title}
Mission Description: ${mission.description}

Provide an analysis that includes:
1. Overview (1-2 paragraphs)
2. Key Insights (3-5 bullet points)
3. Data/ Evidence supporting insights
4. Conclusions and Recommendations

Be thorough but concise. Use professional language.`;

    return await this.callAI(prompt);
  }

  async generateSocialContent(mission) {
    const prompt = `You are a social media expert. Create engaging social media content for the following mission:

Mission Title: ${mission.title}
Mission Description: ${mission.description}

Generate:
1. Main post (100-150 words)
2. 2-3 hashtags
3. Call-to-action

Make it engaging, shareable, and platform-appropriate.`;

    return await this.callAI(prompt);
  }

  async generateDocumentationContent(mission) {
    const prompt = `You are a technical writer. Create clear, comprehensive documentation for:

Mission Title: ${mission.title}
Mission Description: ${mission.description}

Structure your response as:
1. Introduction/Overview
2. Prerequisites (if applicable)
3. Step-by-step Instructions
4. Tips and Best Practices
5. Troubleshooting (if relevant)

Use clear headings, code blocks where needed, and make it easy to follow.`;

    return await this.callAI(prompt);
  }

  async generateGenericContent(mission) {
    const prompt = `You are a helpful AI assistant. Complete the following task:

Mission Title: ${mission.title}
Mission Description: ${mission.description}

Provide a complete, high-quality response that addresses all aspects of the task. Be thorough, professional, and well-structured.`;

    return await this.callAI(prompt);
  }

  async callAI(prompt) {
    // Try OpenAI first, then fall back to Anthropic
    if (this.providers.openai.apiKey) {
      try {
        return await this.callOpenAI(prompt);
      } catch (error) {
        log('WARN', 'OpenAI API failed, trying Anthropic', { error: error.message });
      }
    }

    if (this.providers.anthropic.apiKey) {
      try {
        return await this.callAnthropic(prompt);
      } catch (error) {
        log('ERROR', 'Anthropic API failed', { error: error.message });
      }
    }

    throw new Error('No AI provider available');
  }

  async callOpenAI(prompt) {
    const response = await axios.post(
      `${this.providers.openai.baseURL}/chat/completions`,
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful, professional AI assistant that completes tasks thoroughly and accurately.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${this.providers.openai.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  async callAnthropic(prompt) {
    const response = await axios.post(
      `${this.providers.anthropic.baseURL}/v1/messages`,
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': this.providers.anthropic.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response.data.content[0].text;
  }

  validateContent(content, mission) {
    // Basic validation
    if (!content || content.length < 50) {
      return { valid: false, reason: 'Content too short' };
    }

    // Check for placeholders
    if (content.includes('[INSERT]') || content.includes('TODO') || content.includes('...')) {
      return { valid: false, reason: 'Content contains placeholders' };
    }

    // Check length (not too short or too long)
    if (content.length < 100) {
      return { valid: false, reason: 'Content is too brief' };
    }

    if (content.length > 5000) {
      log('WARN', 'Content is very long, may need summarization', { length: content.length });
    }

    return { valid: true };
  }
}

// OpenWork API client (enhanced)
class OpenWorkClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://openwork.bot/api';
    this.submissionHistory = [];
    this.lastSubmissionTime = null;
    this.aiGenerator = new AIContentGenerator();
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

  async generateAndSubmit(mission) {
    log('INFO', `🤖 Generating AI content for mission: ${mission.title}`);

    try {
      // Generate content
      const content = await this.aiGenerator.generateForMission(mission);

      // Validate content
      const validation = this.aiGenerator.validateContent(content, mission);
      if (!validation.valid) {
        log('WARN', `⚠️ Content validation failed: ${validation.reason}`);
        return { success: false, reason: validation.reason };
      }

      // Submit
      log('INFO', `📤 Submitting generated content (${content.length} chars)...`);
      const result = await this.submitMission(mission.id, content);

      return { success: true, content: content };
    } catch (error) {
      log('ERROR', `❌ AI generation failed: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }
}

// Enhanced mission filter
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

  // Skip missions that require on-chain transactions
  if (mission.onchain_job_id && mission.onchain_job_id !== null) {
    return false;
  }

  // Skip missions with requirements we can't verify
  if (mission.requirements && mission.requirements.length > 0) {
    return false;
  }

  // Only include tasks that AI can handle
  const aiFriendlyTags = ['research', 'writing', 'analysis', 'documentation', 'content', 'social'];
  const description = mission.description?.toLowerCase() || '';
  const title = mission.title?.toLowerCase() || '';

  // Check if task is AI-friendly
  const isAIFriendly =
    aiFriendlyTags.some(tag => mission.tags.includes(tag)) ||
    description.includes('write') ||
    description.includes('research') ||
    description.includes('analyze') ||
    description.includes('create content') ||
    description.includes('review') ||
    title.includes('write') ||
    title.includes('research') ||
    title.includes('analyze');

  if (!isAIFriendly) {
    return false;
  }

  return true;
}

// Main bot logic (enhanced)
async function run() {
  log('INFO', '🚀 OpenWork Enhanced Auto-Submission Bot started');
  log('INFO', '🤖 AI Content Generation: ENABLED');

  const client = new OpenWorkClient(config.apiKey);

  try {
    // Fetch missions
    log('INFO', '📡 Fetching missions from OpenWork API...');
    const missions = await client.getMissions();
    log('INFO', `✅ Retrieved ${missions.length} missions`);

    // Filter missions
    const eligibleMissions = missions.filter(m => filterMission(m, config.filters));
    log('INFO', `🎯 Found ${eligibleMissions.length} AI-friendly missions`, {
      eligible: eligibleMissions.map(m => ({ id: m.id, title: m.title, reward: m.reward, tags: m.tags }))
    });

    // Check rate limit
    const rateLimitCheck = client.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      log('WARN', `⏸️ ${rateLimitCheck.reason}`);
      log('INFO', `⏱️  Wait ${Math.ceil(rateLimitCheck.waitTime / 1000)}s before next submission`);
      return;
    }

    // Process missions
    let successCount = 0;
    let failCount = 0;

    for (const mission of eligibleMissions) {
      try {
        log('INFO', `📋 Processing mission: ${mission.title} (Reward: ${mission.reward}, Tags: ${mission.tags.join(', ')})`);

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

        // Generate and submit using AI
        const result = await client.generateAndSubmit(mission);

        if (result.success) {
          log('INFO', `✅ AI-generated submission successful`, {
            missionId: mission.id,
            title: mission.title,
            contentLength: result.content.length
          });

          // Record submission
          client.submissionHistory.push({
            missionId: mission.id,
            timestamp: Date.now(),
            reward: mission.reward,
            aiGenerated: true
          });
          client.lastSubmissionTime = Date.now();
          successCount++;
        } else {
          log('WARN', `⚠️ Submission failed: ${result.reason}`);
          failCount++;
        }

        // Wait a bit before next submission
        await new Promise(resolve => setTimeout(resolve, config.rateLimit.cooldownMs / 10));

      } catch (error) {
        log('ERROR', `❌ Failed to process mission ${mission.id}`, {
          message: error.response?.data?.message || error.message
        });
        failCount++;
        continue;
      }
    }

    log('INFO', '🎉 Batch processing complete');
    log('INFO', `📊 Summary`, {
      totalProcessed: eligibleMissions.length,
      successful: successCount,
      failed: failCount,
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
module.exports = { OpenWorkClient, filterMission, AIContentGenerator };
