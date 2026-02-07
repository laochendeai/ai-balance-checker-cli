#!/usr/bin/env node

/**
 * AI Balance Checker
 * Lightweight CLI tool for checking AI platform balances
 */

const fs = require('fs');
const path = require('path');
let axios = require('axios');

const KNOWN_PLATFORMS = ['qwen', 'doubao', 'kimi', 'deepseek', 'minimax', 'zhipu'];

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
    configHelp: '配置文件路径',
    configNotExists: '配置文件不存在，请先创建',
    checkAll: '查询所有平台余额',
    checkOne: '查询指定平台余额',
    jsonHelp: '输出 JSON（机器可读）',
    rawHelp: '输出原始响应（调试用）',
    missingEndpoint: '未配置 balanceEndpoint',
    balancePathNotConfigured: '未配置 balancePath，无法提取余额字段',
    balancePathNotFound: 'balancePath 未命中响应字段',
    requestFailed: '请求失败',
    httpError: 'HTTP 错误',
    unknownArg: '未知参数',
    missingArgValue: '参数缺少值',
    unknownCommand: '未知命令',
    invalidConfig: '配置文件格式错误',
    supportedPlatforms: '支持的平台',
    example: '示例',
    showHelp: '显示帮助',
    setLanguage: '设置语言',
    checkSpecific: '查询指定平台'
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
    configHelp: 'Config file path',
    configNotExists: 'Config file not found, please create one first',
    checkAll: 'Check balance for all platforms',
    checkOne: 'Check balance for specified platform',
    jsonHelp: 'Output JSON (machine-readable)',
    rawHelp: 'Include raw response (debug)',
    missingEndpoint: 'balanceEndpoint not configured',
    balancePathNotConfigured: 'balancePath not configured; cannot extract balance',
    balancePathNotFound: 'balancePath not found in response',
    requestFailed: 'Request failed',
    httpError: 'HTTP error',
    unknownArg: 'Unknown argument',
    missingArgValue: 'Missing value for argument',
    unknownCommand: 'Unknown command',
    invalidConfig: 'Invalid config file',
    supportedPlatforms: 'Supported platforms',
    example: 'Example',
    showHelp: 'Show help',
    setLanguage: 'Set language',
    checkSpecific: 'Check specific platform'
  }
};

function resolveLang(cliLang, configLang) {
  const normalized = String(cliLang || configLang || 'zh').trim().toLowerCase();
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  return 'zh';
}

// Load config
function loadConfig(configPath, langForErrors) {
  const lang = resolveLang(langForErrors, null);
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const candidatePaths = [
    configPath,
    path.join(process.cwd(), 'config.json'),
    homeDir ? path.join(homeDir, '.ai-balance-checker', 'config.json') : null
  ].filter(Boolean);

  for (const p of candidatePaths) {
    if (!p) continue;
    if (!fs.existsSync(p)) continue;

    try {
      const raw = fs.readFileSync(p, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error(i18n[lang].invalidConfig);
      if (!parsed.platforms || typeof parsed.platforms !== 'object') throw new Error(i18n[lang].invalidConfig);
      return parsed;
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      throw new Error(`${i18n[lang].invalidConfig}: ${message}`);
    }
  }

  throw new Error(`${i18n[lang].configNotExists}\nCopy config.example.json to config.json and add your API keys`);
}

function getEnvApiKey(platformKey) {
  const upper = String(platformKey).toUpperCase();
  const candidates = [`AI_BALANCE_${upper}_API_KEY`];

  if (platformKey === 'deepseek') candidates.push('DEEPSEEK_API_KEY');
  if (platformKey === 'qwen') candidates.push('DASHSCOPE_API_KEY', 'QWEN_API_KEY');
  if (platformKey === 'kimi') candidates.push('KIMI_API_KEY', 'MOONSHOT_API_KEY');
  if (platformKey === 'zhipu') candidates.push('ZHIPU_API_KEY', 'BIGMODEL_API_KEY');
  if (platformKey === 'minimax') candidates.push('MINIMAX_API_KEY');
  if (platformKey === 'doubao') candidates.push('DOUBAO_API_KEY');

  for (const name of candidates) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

function applyEnvOverrides(config) {
  if (!config || typeof config !== 'object') return config;
  if (!config.platforms || typeof config.platforms !== 'object') return config;

  for (const platformKey of Object.keys(config.platforms)) {
    const platformConfig = config.platforms[platformKey];
    if (!platformConfig || typeof platformConfig !== 'object') continue;
    const envKey = getEnvApiKey(platformKey);
    if (envKey) platformConfig.apiKey = envKey;
  }

  return config;
}

function tokenizePath(pathStr) {
  const cleaned = String(pathStr).trim().replace(/^\$\./, '').replace(/^\$/, '');
  if (!cleaned) return [];

  const tokens = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let match = null;
  while ((match = re.exec(cleaned)) !== null) {
    if (match[1] !== undefined) tokens.push({ type: 'prop', value: match[1] });
    if (match[2] !== undefined) tokens.push({ type: 'index', value: Number(match[2]) });
  }
  return tokens;
}

function extractByPath(value, pathStr) {
  if (!pathStr) return undefined;
  const tokens = tokenizePath(pathStr);
  let current = value;
  for (const token of tokens) {
    if (current === null || current === undefined) return undefined;
    if (token.type === 'prop') current = current[token.value];
    else if (token.type === 'index') {
      if (!Array.isArray(current)) return undefined;
      current = current[token.value];
    }
  }
  return current;
}

function toNumberIfPossible(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && String(numeric) !== 'NaN') return numeric;
  return value;
}

const PLATFORM_DEFAULTS = {
  deepseek: {
    name: 'DeepSeek',
    balanceEndpoint: 'https://api.deepseek.com/user/balance',
    method: 'GET',
    auth: { type: 'bearer', headerName: 'Authorization', prefix: 'Bearer ' },
    balancePath: 'balance_infos[0].total_balance',
    currencyPath: 'balance_infos[0].currency'
  },
  zhipu: {
    name: '智谱AI (ZAI)',
    balanceEndpoint: 'https://open.bigmodel.cn/api/paas/v4/usage',
    method: 'GET',
    auth: { type: 'bearer', headerName: 'Authorization', prefix: 'Bearer ' }
  }
};

function mergePlatformConfig(platformKey, platformConfig) {
  const defaults = PLATFORM_DEFAULTS[platformKey] || {};
  const merged = { ...defaults, ...(platformConfig || {}) };
  merged.auth = { ...(defaults.auth || {}), ...((platformConfig && platformConfig.auth) || {}) };
  merged.headers = { ...(defaults.headers || {}), ...((platformConfig && platformConfig.headers) || {}) };
  merged.query = { ...(defaults.query || {}), ...((platformConfig && platformConfig.query) || {}) };
  if (merged.method) merged.method = String(merged.method).toUpperCase();
  return merged;
}

function buildAuthHeaders(platformConfig, lang) {
  const headers = { ...(platformConfig.headers || {}) };
  const auth = platformConfig.auth || {};
  const authType = String(auth.type || 'bearer').toLowerCase();
  const apiKey = platformConfig.apiKey;

  if (authType === 'none') return headers;
  if (!apiKey) throw new Error(i18n[lang].noKey);

  if (authType === 'bearer') {
    const headerName = auth.headerName || 'Authorization';
    const prefix = auth.prefix !== undefined ? String(auth.prefix) : 'Bearer ';
    if (headers[headerName] === undefined) headers[headerName] = `${prefix}${apiKey}`;
    return headers;
  }

  if (authType === 'header') {
    const headerName = auth.headerName || 'X-Api-Key';
    const prefix = auth.prefix !== undefined ? String(auth.prefix) : '';
    if (headers[headerName] === undefined) headers[headerName] = `${prefix}${apiKey}`;
    return headers;
  }

  throw new Error(`Unknown auth type: ${authType}`);
}

async function fetchPlatformResult(platformKey, config, options) {
  const lang = resolveLang(options && options.lang, config && config.language);
  const includeRaw = Boolean(options && options.includeRaw);
  const platformConfig = config && config.platforms ? config.platforms[platformKey] : null;

  if (!platformConfig) {
    return { platform: platformKey, name: platformKey, ok: false, error: i18n[lang].platformNotFound };
  }

  const effective = mergePlatformConfig(platformKey, platformConfig);
  const name = effective.name || platformKey;

  if (!effective.balanceEndpoint) {
    return { platform: platformKey, name, ok: false, error: i18n[lang].missingEndpoint };
  }

  const method = effective.method || 'GET';
  const timeoutMs = typeof effective.timeoutMs === 'number' ? effective.timeoutMs : 15000;

  let headers = {};
  try {
    headers = buildAuthHeaders(effective, lang);
  } catch (error) {
    return { platform: platformKey, name, ok: false, error: error.message || String(error) };
  }

  if (headers.Accept === undefined) headers.Accept = 'application/json';

  try {
    const response = await axios({
      method,
      url: effective.balanceEndpoint,
      headers,
      params: effective.query,
      data: effective.body,
      timeout: timeoutMs,
      validateStatus: () => true
    });

    const rawData = response.data;

    if (response.status < 200 || response.status >= 300) {
      const result = {
        platform: platformKey,
        name,
        ok: false,
        error: `${i18n[lang].httpError}: ${response.status}`
      };
      if (includeRaw) result.raw = rawData;
      return result;
    }

    const balancePath = effective.balancePath;
    const currencyPath = effective.currencyPath;

    if (!balancePath) {
      const result = {
        platform: platformKey,
        name,
        ok: true,
        value: null,
        unit: effective.unit || null,
        currency: effective.currency || null,
        message: i18n[lang].balancePathNotConfigured
      };
      if (includeRaw) result.raw = rawData;
      return result;
    }

    let value = extractByPath(rawData, balancePath);
    value = toNumberIfPossible(value);

    const currency = currencyPath ? extractByPath(rawData, currencyPath) : effective.currency || null;
    const unit = effective.unit || null;

    if (value === undefined) {
      const result = {
        platform: platformKey,
        name,
        ok: false,
        error: `${i18n[lang].balancePathNotFound}: ${balancePath}`
      };
      if (includeRaw) result.raw = rawData;
      return result;
    }

    const result = { platform: platformKey, name, ok: true, value, unit, currency: currency || null };
    if (includeRaw) result.raw = rawData;
    return result;
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    return { platform: platformKey, name, ok: false, error: `${i18n[lang].requestFailed}: ${message}` };
  }
}

function formatValue(value, unit, currency) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  const pieces = [String(value)];
  if (unit) pieces.push(String(unit));
  if (currency && (!unit || String(unit).toUpperCase() !== String(currency).toUpperCase())) pieces.push(String(currency));
  return pieces.join(' ');
}

function buildHelp(lang) {
  const t = i18n[lang];
  return `
${t.description}

${t.usage}:
  ai-balance [${t.options}] [${t.commands}]

${t.options}:
  -h, --help             ${t.showHelp}
  -c, --config <path>    ${t.configHelp} (default: ./config.json)
  -p, --platform <name>  ${t.checkSpecific}
  --lang <zh|en>         ${t.setLanguage} (default: zh)
  --json                 ${t.jsonHelp}
  --raw                  ${t.rawHelp}

${t.commands}:
  check                  ${t.checkAll}
  check --platform X     ${t.checkOne}

${t.supportedPlatforms}: ${KNOWN_PLATFORMS.join(', ')}

${t.example}:
  ai-balance check
  ai-balance check --platform deepseek
  ai-balance check --config ~/.config.json
  ai-balance check --lang en
  ai-balance check --json
  ai-balance check --json --raw
`;
}

// Parse CLI args
function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv.slice(2) : [];
  const params = {
    command: 'check',
    platform: null,
    configPath: null,
    help: false,
    lang: null,
    json: false,
    raw: false
  };

  let commandSet = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      params.help = true;
      continue;
    }
    if (arg === '--json') {
      params.json = true;
      continue;
    }
    if (arg === '--raw') {
      params.raw = true;
      continue;
    }
    if (arg === '--config' || arg === '-c') {
      const value = args[i + 1];
      if (!value) throw new Error(`${i18n.zh.missingArgValue}: ${arg}`);
      params.configPath = value;
      i++;
      continue;
    }
    if (arg === '--platform' || arg === '-p') {
      const value = args[i + 1];
      if (!value) throw new Error(`${i18n.zh.missingArgValue}: ${arg}`);
      params.platform = String(value).toLowerCase();
      i++;
      continue;
    }
    if (arg === '--lang') {
      const value = args[i + 1];
      if (!value) throw new Error(`${i18n.zh.missingArgValue}: ${arg}`);
      params.lang = String(value).toLowerCase();
      i++;
      continue;
    }

    if (String(arg).startsWith('-')) {
      throw new Error(`${i18n.zh.unknownArg}: ${arg}`);
    }

    if (!commandSet) {
      params.command = String(arg);
      commandSet = true;
      continue;
    }

    throw new Error(`${i18n.zh.unknownArg}: ${arg}`);
  }

  return params;
}

// Main function
async function main() {
  let args = null;
  try {
    args = parseArgs(process.argv);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.error(`${i18n.zh.error}: ${message}`);
    process.exit(1);
  }

  const langForConfigErrors = resolveLang(args.lang, null);
  if (args.help) {
    console.log(buildHelp(langForConfigErrors));
    return;
  }

  let config = null;
  try {
    config = loadConfig(args.configPath, langForConfigErrors);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.error(`${i18n[langForConfigErrors].error}: ${message}`);
    process.exit(1);
  }

  applyEnvOverrides(config);
  const lang = resolveLang(args.lang, config.language);

  if (args.command !== 'check') {
    console.error(`${i18n[lang].error}: ${i18n[lang].unknownCommand}: ${args.command}`);
    console.error(buildHelp(lang));
    process.exit(1);
  }

  const platforms = args.platform ? [args.platform] : Object.keys(config.platforms || {});
  const results = [];

  if (!args.json) console.log(`${i18n[lang].loading}\n`);

  for (const platformKey of platforms) {
    const result = await fetchPlatformResult(platformKey, config, { lang, includeRaw: args.raw });
    results.push(result);

    if (args.json) continue;

    if (result.ok) {
      const valueText = formatValue(result.value, result.unit, result.currency);
      const suffix = result.message ? ` (${result.message})` : '';
      console.log(`${i18n[lang].success} - ${result.name}: ${valueText}${suffix}`);
      if (args.raw && result.raw !== undefined) console.log(JSON.stringify(result.raw, null, 2));
    } else {
      console.log(`${i18n[lang].error} - ${result.name}: ${result.error || ''}`);
      if (args.raw && result.raw !== undefined) console.log(JSON.stringify(result.raw, null, 2));
    }
  }

  if (args.json) {
    const output = { timestamp: new Date().toISOString(), language: lang, results };
    console.log(JSON.stringify(output, null, 2));
  }
}

function __setAxiosForTests(nextAxios) {
  axios = nextAxios;
}

module.exports = {
  KNOWN_PLATFORMS,
  resolveLang,
  loadConfig,
  parseArgs,
  applyEnvOverrides,
  getEnvApiKey,
  tokenizePath,
  extractByPath,
  toNumberIfPossible,
  mergePlatformConfig,
  fetchPlatformResult,
  formatValue,
  buildHelp,
  __setAxiosForTests
};

if (require.main === module) {
  main().catch(error => {
    const message = error && error.message ? error.message : String(error);
    console.error(`Fatal error: ${message}`);
    process.exit(1);
  });
}
