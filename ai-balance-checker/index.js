#!/usr/bin/env node

/**
 * AI Balance Checker
 * Lightweight CLI tool for checking AI platform balances
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// I18n messages
const i18n = {
  zh: {
    loading: '查询余额中...',
    success: '查询成功',
    error: '查询失败',
    noKey: 'API Key 未配置',
    platformNotFound: '平台不存在',
    usage: '用法',
    description: '查询多个 AI 平台的账户余额',
    options: '选项',
    commands: '命令',
    balance: '余额',
    currency: '货币',
    all: '所有平台',
    specified: '指定平台',
    configHelp: '配置文件路径',
    configNotExists: '配置文件不存在，请先创建',
    checkAll: '查询所有平台余额',
    checkOne: '查询指定平台余额'
  },
  en: {
    loading: 'Checking balance...',
    success: 'Success',
    error: 'Failed',
    noKey: 'API Key not configured',
    platformNotFound: 'Platform not found',
    usage: 'Usage',
    description: 'Check account balances across multiple AI platforms',
    options: 'Options',
    commands: 'Commands',
    balance: 'Balance',
    currency: 'Currency',
    all: 'All platforms',
    specified: 'Specified platform',
    configHelp: 'Config file path',
    configNotExists: 'Config file not found, please create one first',
    checkAll: 'Check balance for all platforms',
    checkOne: 'Check balance for specified platform'
  }
};

// Load config
function loadConfig(configPath) {
  const paths = [
    configPath,
    path.join(process.cwd(), 'config.json'),
    path.join(process.env.HOME || process.env.USERPROFILE, '.ai-balance-checker', 'config.json')
  ];

  for (const p of paths) {
    if (p && fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (error) {
        console.error(`Error reading config: ${error.message}`);
        process.exit(1);
      }
    }
  }

  console.error(i18n[lang].configNotExists);
  console.error('Copy config.example.json to config.json and add your API keys');
  process.exit(1);
}

// Platform API handlers
const platformHandlers = {
  qwen: async (config) => {
    if (!config.platforms.qwen.apiKey) throw new Error(i18n[lang].noKey);
    // 通义千问 API endpoint (需要具体实现)
    return { balance: null, message: '需要具体 API endpoint' };
  },
  
  doubao: async (config) => {
    if (!config.platforms.doubao.apiKey) throw new Error(i18n[lang].noKey);
    // 豆包 API endpoint
    return { balance: null, message: '需要具体 API endpoint' };
  },
  
  kimi: async (config) => {
    if (!config.platforms.kimi.apiKey) throw new Error(i18n[lang].noKey);
    try {
      // Moonshot AI (Kimi) - balance check
      const response = await axios.get('https://api.moonshot.cn/v1/user/info', {
        headers: {
          'Authorization': `Bearer ${config.platforms.kimi.apiKey}`
        }
      });
      return { balance: response.data.balance || 0, unit: 'tokens' };
    } catch (error) {
      throw new Error(`API error: ${error.message}`);
    }
  },
  
  deepseek: async (config) => {
    if (!config.platforms.deepseek.apiKey) throw new Error(i18n[lang].noKey);
    try {
      // DeepSeek API - balance check
      const response = await axios.get('https://api.deepseek.com/user/balance', {
        headers: {
          'Authorization': `Bearer ${config.platforms.deepseek.apiKey}`
        }
      });
      return { balance: response.data.balance || 0, unit: 'tokens' };
    } catch (error) {
      throw new Error(`API error: ${error.message}`);
    }
  },
  
  minimax: async (config) => {
    if (!config.platforms.minimax.apiKey) throw new Error(i18n[lang].noKey);
    // MiniMax API endpoint (需要具体实现)
    return { balance: null, message: '需要具体 API endpoint' };
  },
  
  zhipu: async (config) => {
    if (!config.platforms.zhipu.apiKey) throw new Error(i18n[lang].noKey);
    // 智谱 AI API endpoint (需要具体实现)
    return { balance: null, message: '需要具体 API endpoint' };
  }
};

// Format balance display
function formatBalance(platform, result) {
  const config_data = platformData[platform] || { name: platform, unit: 'tokens', currency: 'CNY' };
  const balance = result.balance !== null ? `${result.balance} ${result.unit || config_data.unit}` : 'N/A';
  
  return `${config_data.name}: ${balance}`;
}

// Parse CLI args
function parseArgs(args) {
  const params = {
    platform: null,
    configPath: null,
    help: false
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      params.help = true;
    } else if (arg === '--config' || arg === '-c') {
      if (i + 1 < args.length) {
        params.configPath = args[++i];
      }
    } else if (arg === '--platform' || arg === '-p') {
      if (i + 1 < args.length) {
        params.platform = args[++i];
      }
    } else if (arg === '--lang') {
      if (i + 1 < args.length) {
        lang = args[++i];
      }
    }
  }

  return params;
}

// Platform data (lazy load)
let platformData = null;

// Global language
let lang = 'zh';

// Main function
async function main() {
  const args = parseArgs(process.argv);
  
  // Check for help
  if (args.help) {
    console.log(`
${i18n[lang].description}

${i18n[lang].usage}:
  ai-balance [${i18n[lang].options}] [${i18n[lang].commands}]

${i18n[lang].options}:
  -h, --help          Show this help message
  -c, --config <path>  Config file path (default: ./config.json)
  -p, --platform <name>  Check specific platform
  --lang <zh|en>      Set language (default: zh)

${i18n[lang].commands}:
  check               ${i18n[lang].checkAll}
  check --platform X   ${i18n[lang].checkOne}

Supported platforms: ${Object.keys(platformHandlers).join(', ')}

Example:
  ai-balance check
  ai-balance check --platform kimi
  ai-balance check --config ~/.config.json
  ai-balance check --lang en
`);
    return;
  }

  // Load config
  const config = loadConfig(args.configPath);
  platformData = config.platforms;
  
  // Set language from config if not set via arg
  global.lang = lang || config.language || 'zh';
  
  // Determine action
  const command = args[2] || 'check';
  
  if (command === 'check') {
    console.log(`${i18n[lang].loading}\n`);
    
    try {
      const platforms = args.platform ? [args.platform] : Object.keys(platformHandlers);
      
      for (const platform of platforms) {
        const handler = platformHandlers[platform];
        
        if (!handler) {
          console.log(`${platform}: ${i18n[lang].platformNotFound}`);
          continue;
        }
        
        try {
          const result = await handler(config);
          console.log(`${i18n[lang].success} - ${formatBalance(platform, result)}`);
        } catch (error) {
          console.log(`${i18n[lang].error} - ${platform}: ${error.message}`);
        }
      }
      
      console.log(`\n${i18n[lang].currency}: CNY`);
    } catch (error) {
      console.error(`${i18n[lang].error}: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.log(`Unknown command: ${command}`);
    console.log('Run "ai-balance --help" for usage');
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
