#!/usr/bin/env node

/**
 * AI Balance Checker
 * Lightweight CLI tool for checking AI platform balances
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const KNOWN_PLATFORMS = ['qwen', 'doubao', 'kimi', 'deepseek', 'minimax', 'zhipu'];

// I18n messages
const i18n = {
  zh: {
    loading: '查询中...',
    success: '查询成功',
    error: '查询失败',
    noKey: 'API Key 未配置',
    platformNotFound: '平台不存在',
    usage: '用法',
    description: '查询多个 AI 平台的套餐 / 用量 / 余额',
    options: '选项',
    commands: '命令',
    configHelp: '配置文件路径',
    configNotExists: '配置文件不存在，请先创建',
    checkAll: '查询所有平台信息',
    checkOne: '查询指定平台信息',
    jsonHelp: '输出 JSON（机器可读）',
    rawHelp: '输出原始响应（调试用）',
    noSpinnerHelp: '关闭跑马灯/进度提示',
    allHelp: '包含未配置的平台（默认会跳过未配置 endpoint 的平台）',
    missingEndpoint: '未配置 endpoint（接口 URL）',
    missingBalanceEndpoint: '未配置 balanceEndpoint',
    fieldsNotConfigured: '未配置 fields，无法提取数据',
    fieldPathNotConfigured: '未配置 path，无法提取字段',
    fieldPathNotFound: 'path 未命中响应字段',
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
    checkSpecific: '查询指定平台',
    menuTitle: '中文菜单',
    menuHelp: '打开交互式中文菜单',
    guiHelp: '启动 Windows 浮动窗口（置顶 + 托盘）',
    winOnly: '该命令仅支持 Windows',
    skippedPlatforms: '已跳过未配置 endpoint 的平台',
    runAllHint: '如需查看全部平台（包括未配置项），请加 --all'
  },
  en: {
    loading: 'Checking...',
    success: 'Success',
    error: 'Failed',
    noKey: 'API Key not configured',
    platformNotFound: 'Platform not found',
    usage: 'Usage',
    description: 'Check plan / usage / balance across multiple AI platforms',
    options: 'Options',
    commands: 'Commands',
    configHelp: 'Config file path',
    configNotExists: 'Config file not found, please create one first',
    checkAll: 'Check all platforms',
    checkOne: 'Check specified platform',
    jsonHelp: 'Output JSON (machine-readable)',
    rawHelp: 'Include raw response (debug)',
    noSpinnerHelp: 'Disable spinner/progress',
    allHelp: 'Include unconfigured platforms (default skips missing endpoints)',
    missingEndpoint: 'endpoint not configured',
    missingBalanceEndpoint: 'balanceEndpoint not configured',
    fieldsNotConfigured: 'fields not configured; cannot extract data',
    fieldPathNotConfigured: 'path not configured; cannot extract field',
    fieldPathNotFound: 'path not found in response',
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
    checkSpecific: 'Check specific platform',
    menuTitle: 'Menu',
    menuHelp: 'Open interactive menu',
    guiHelp: 'Launch Windows floating window (topmost + tray)',
    winOnly: 'This command is Windows-only',
    skippedPlatforms: 'Skipped platforms missing endpoint',
    runAllHint: 'Use --all to include them'
  }
};

function parseDotEnvValue(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) return value.slice(1, -1);
  return value;
}

function applyDotEnvFile(filePath) {
  if (!filePath) return;
  if (!fs.existsSync(filePath)) return;

  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1);
    if (!key) continue;

    if (process.env[key] !== undefined) continue; // do not override
    const value = parseDotEnvValue(rawValue);
    if (!value) continue;
    process.env[key] = value;
  }
}

function applyDotEnv() {
  applyDotEnvFile(path.join(process.cwd(), '.env'));
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (homeDir) applyDotEnvFile(path.join(homeDir, '.ai-balance-checker', '.env'));
}

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
  kimi: {
    name: 'Moonshot AI (Kimi)',
    balanceEndpoint: 'https://api.moonshot.cn/v1/users/me/balance',
    method: 'GET',
    auth: { type: 'bearer', headerName: 'Authorization', prefix: 'Bearer ' },
    balancePath: 'data.available_balance',
    currency: 'CNY'
  },
  zhipu: {
    name: '智谱AI (ZAI)',
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

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeEndpointFromConfig(metricConfig) {
  if (!metricConfig || typeof metricConfig !== 'object') return '';
  const candidates = [metricConfig.endpoint, metricConfig.balanceEndpoint, metricConfig.url];
  for (const item of candidates) {
    if (typeof item === 'string' && item.trim()) return item.trim();
  }
  return '';
}

function hasAnyEndpointConfiguredForPlatform(platformConfig) {
  if (!platformConfig || typeof platformConfig !== 'object') return false;

  if (platformConfig.metrics && isPlainObject(platformConfig.metrics)) {
    for (const metricConfig of Object.values(platformConfig.metrics)) {
      const endpoint = normalizeEndpointFromConfig(metricConfig);
      if (endpoint) return true;
    }
    if (typeof platformConfig.balanceEndpoint === 'string' && platformConfig.balanceEndpoint.trim()) return true;
    if (typeof platformConfig.usageEndpoint === 'string' && platformConfig.usageEndpoint.trim()) return true;
    if (typeof platformConfig.planEndpoint === 'string' && platformConfig.planEndpoint.trim()) return true;
    return false;
  }

  if (typeof platformConfig.balanceEndpoint === 'string' && platformConfig.balanceEndpoint.trim()) return true;
  return false;
}

function buildUrlWithQuery(urlStr, query) {
  const url = new URL(urlStr);
  if (isPlainObject(query)) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item));
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function requestJsonViaNode({ method, url, headers, query, body, timeoutMs }) {
  const urlObj = buildUrlWithQuery(url, query);
  const transport = urlObj.protocol === 'https:' ? https : http;

  const requestHeaders = { ...(headers || {}) };
  const normalizedMethod = method ? String(method).toUpperCase() : 'GET';
  const canSendBody = normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD';

  let payload = null;
  if (canSendBody && body !== undefined) {
    if (Buffer.isBuffer(body)) payload = body;
    else if (typeof body === 'string') payload = Buffer.from(body, 'utf8');
    else payload = Buffer.from(JSON.stringify(body), 'utf8');

    const hasContentType =
      requestHeaders['content-type'] !== undefined ||
      requestHeaders['Content-Type'] !== undefined ||
      requestHeaders['CONTENT-TYPE'] !== undefined;
    if (!hasContentType && !Buffer.isBuffer(body) && typeof body !== 'string') {
      requestHeaders['Content-Type'] = 'application/json';
    }

    const hasContentLength =
      requestHeaders['content-length'] !== undefined ||
      requestHeaders['Content-Length'] !== undefined ||
      requestHeaders['CONTENT-LENGTH'] !== undefined;
    if (!hasContentLength) requestHeaders['Content-Length'] = String(payload.length);
  }

  const requestOptions = {
    protocol: urlObj.protocol,
    method: normalizedMethod,
    hostname: urlObj.hostname,
    port: urlObj.port || undefined,
    path: `${urlObj.pathname}${urlObj.search}`,
    headers: requestHeaders
  };

  return await new Promise((resolve, reject) => {
    const req = transport.request(requestOptions, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = String(res.headers['content-type'] || '').toLowerCase();
        const text = buffer.toString('utf8');

        let data = null;
        if (text) {
          const shouldParseJson = contentType.includes('application/json');
          if (shouldParseJson) {
            try {
              data = JSON.parse(text);
            } catch {
              data = text;
            }
          } else {
            try {
              data = JSON.parse(text);
            } catch {
              data = text;
            }
          }
        }

        resolve({ status: res.statusCode || 0, data, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (typeof timeoutMs === 'number' && timeoutMs > 0) {
      req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timeout')));
    }

    if (payload) req.write(payload);
    req.end();
  });
}

let httpClient = {
  requestJson: requestJsonViaNode
};

function __setHttpClientForTests(nextHttpClient) {
  httpClient = nextHttpClient;
}

function mergeMetricConfig(platformEffective, metricConfig) {
  const base = {
    apiKey: platformEffective.apiKey,
    auth: platformEffective.auth,
    headers: platformEffective.headers,
    query: platformEffective.query,
    body: platformEffective.body,
    method: platformEffective.method,
    timeoutMs: platformEffective.timeoutMs,
    unit: platformEffective.unit,
    currency: platformEffective.currency
  };

  const merged = { ...base, ...(metricConfig || {}) };
  merged.auth = { ...(base.auth || {}), ...((metricConfig && metricConfig.auth) || {}) };
  merged.headers = { ...(base.headers || {}), ...((metricConfig && metricConfig.headers) || {}) };
  merged.query = { ...(base.query || {}), ...((metricConfig && metricConfig.query) || {}) };

  if (metricConfig && Object.prototype.hasOwnProperty.call(metricConfig, 'body')) merged.body = metricConfig.body;
  if (merged.method) merged.method = String(merged.method).toUpperCase();
  return merged;
}

function buildLegacyBalanceMetric(effectivePlatform) {
  return {
    name: 'balance',
    endpoint: effectivePlatform.balanceEndpoint || '',
    method: effectivePlatform.method || 'GET',
    auth: effectivePlatform.auth,
    headers: effectivePlatform.headers,
    query: effectivePlatform.query,
    body: effectivePlatform.body,
    timeoutMs: effectivePlatform.timeoutMs,
    unit: effectivePlatform.unit,
    currency: effectivePlatform.currency,
    fields: [
      {
        key: 'balance',
        path: effectivePlatform.balancePath || '',
        unit: effectivePlatform.unit || null,
        currency: effectivePlatform.currency || null,
        currencyPath: effectivePlatform.currencyPath || null
      }
    ]
  };
}

function orderMetricKeys(keys) {
  const priority = ['plan', 'usage', 'balance'];
  return keys.slice().sort((a, b) => {
    const aIndex = priority.indexOf(a);
    const bIndex = priority.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return String(a).localeCompare(String(b));
  });
}

async function fetchMetricResult(platformKey, effectivePlatform, metricId, metricConfig, options) {
  const lang = resolveLang(options && options.lang, null);
  const includeRaw = Boolean(options && options.includeRaw);

  const effectiveMetric = mergeMetricConfig(effectivePlatform, metricConfig);
  const metricName = (metricConfig && metricConfig.name) || metricId;
  let endpoint = normalizeEndpointFromConfig(effectiveMetric);
  if (!endpoint) {
    if (metricId === 'balance' && typeof effectivePlatform.balanceEndpoint === 'string' && effectivePlatform.balanceEndpoint.trim()) {
      endpoint = effectivePlatform.balanceEndpoint.trim();
    } else if (metricId === 'usage' && typeof effectivePlatform.usageEndpoint === 'string' && effectivePlatform.usageEndpoint.trim()) {
      endpoint = effectivePlatform.usageEndpoint.trim();
    } else if (metricId === 'plan' && typeof effectivePlatform.planEndpoint === 'string' && effectivePlatform.planEndpoint.trim()) {
      endpoint = effectivePlatform.planEndpoint.trim();
    }
  }
  const timeoutMs = typeof effectiveMetric.timeoutMs === 'number' ? effectiveMetric.timeoutMs : 15000;

  if (!endpoint) {
    const configHint = `platforms.${platformKey}.metrics.${metricId}.endpoint`;
    return { metric: metricId, name: metricName, ok: false, code: 'missing_endpoint', error: `${i18n[lang].missingEndpoint}: ${configHint}` };
  }

  let headers = {};
  try {
    headers = buildAuthHeaders(effectiveMetric, lang);
  } catch (error) {
    return { metric: metricId, name: metricName, ok: false, error: error.message || String(error) };
  }

  if (headers.Accept === undefined) headers.Accept = 'application/json';

  try {
    const response = await httpClient.requestJson({
      method: effectiveMetric.method || 'GET',
      url: endpoint,
      headers,
      query: effectiveMetric.query,
      body: effectiveMetric.body,
      timeoutMs
    });

    const rawData = response.data;

    if (response.status < 200 || response.status >= 300) {
      const result = { metric: metricId, name: metricName, ok: false, error: `${i18n[lang].httpError}: ${response.status}` };
      if (includeRaw) result.raw = rawData;
      return result;
    }

    const fieldsConfig = Array.isArray(effectiveMetric.fields) ? effectiveMetric.fields : [];
    if (fieldsConfig.length === 0) {
      const result = { metric: metricId, name: metricName, ok: true, fields: {}, message: i18n[lang].fieldsNotConfigured };
      if (includeRaw) result.raw = rawData;
      return result;
    }

    const fields = {};
    let okFieldCount = 0;

    for (const fieldConfig of fieldsConfig) {
      const fieldKey = (fieldConfig && fieldConfig.key) || null;
      if (!fieldKey) continue;

      const fieldUnit =
        (fieldConfig && fieldConfig.unit) !== undefined ? fieldConfig.unit : effectiveMetric.unit !== undefined ? effectiveMetric.unit : null;
      const fieldCurrency =
        (fieldConfig && fieldConfig.currency) !== undefined
          ? fieldConfig.currency
          : effectiveMetric.currency !== undefined
            ? effectiveMetric.currency
            : null;

      let pathStr =
        fieldConfig && (fieldConfig.path || fieldConfig.balancePath || fieldConfig.jsonPath)
          ? String(fieldConfig.path || fieldConfig.balancePath || fieldConfig.jsonPath)
          : '';
      if (!pathStr && metricId === 'balance' && fieldKey === 'balance') {
        const legacyPath = effectivePlatform && effectivePlatform.balancePath ? String(effectivePlatform.balancePath).trim() : '';
        if (legacyPath) pathStr = legacyPath;
      }
      if (!pathStr) {
        fields[fieldKey] = {
          ok: true,
          value: null,
          unit: fieldUnit || null,
          currency: fieldCurrency || null,
          message: i18n[lang].fieldPathNotConfigured
        };
        okFieldCount++;
        continue;
      }

      let value = extractByPath(rawData, pathStr);
      if (value === undefined) {
        fields[fieldKey] = {
          ok: false,
          value: null,
          unit: fieldUnit || null,
          currency: fieldCurrency || null,
          error: `${i18n[lang].fieldPathNotFound}: ${pathStr}`
        };
        continue;
      }

      value = toNumberIfPossible(value);
      let currencyPath =
        fieldConfig && (fieldConfig.currencyPath || fieldConfig.currency_path)
          ? String(fieldConfig.currencyPath || fieldConfig.currency_path)
          : '';
      if (!currencyPath && metricId === 'balance' && fieldKey === 'balance') {
        const legacyCurrencyPath = effectivePlatform && effectivePlatform.currencyPath ? String(effectivePlatform.currencyPath).trim() : '';
        if (legacyCurrencyPath) currencyPath = legacyCurrencyPath;
      }
      const currencyValue = currencyPath ? extractByPath(rawData, currencyPath) : null;

      fields[fieldKey] = {
        ok: true,
        value,
        unit: fieldUnit || null,
        currency: currencyValue !== null && currencyValue !== undefined ? currencyValue : fieldCurrency || null
      };
      okFieldCount++;
    }

    const result = { metric: metricId, name: metricName, ok: okFieldCount > 0, fields };
    const totalFields = Object.keys(fields).length;
    const failedFields = Object.values(fields).filter(f => f && f.ok === false).length;
    if (totalFields > 0 && failedFields > 0) result.message = `${failedFields}/${totalFields} fields failed`;
    if (includeRaw) result.raw = rawData;
    return result;
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    return { metric: metricId, name: metricName, ok: false, error: `${i18n[lang].requestFailed}: ${message}` };
  }
}

async function fetchPlatformResult(platformKey, config, options) {
  const lang = resolveLang(options && options.lang, config && config.language);
  const platformConfig = config && config.platforms ? config.platforms[platformKey] : null;

  if (!platformConfig) {
    return { platform: platformKey, name: platformKey, ok: false, error: i18n[lang].platformNotFound };
  }

  const effectivePlatform = mergePlatformConfig(platformKey, platformConfig);
  const name = effectivePlatform.name || platformKey;

  let metricsConfig = null;
  if (platformConfig && isPlainObject(platformConfig.metrics)) metricsConfig = platformConfig.metrics;

  const metrics = {};
  const metricIds = metricsConfig ? orderMetricKeys(Object.keys(metricsConfig)) : ['balance'];

  if (!metricsConfig) {
    const legacyMetric = buildLegacyBalanceMetric(effectivePlatform);
    if (!legacyMetric.endpoint) {
      return { platform: platformKey, name, ok: false, error: i18n[lang].missingBalanceEndpoint };
    }
    metrics.balance = await fetchMetricResult(platformKey, effectivePlatform, 'balance', legacyMetric, options);
  } else {
    for (const metricId of metricIds) {
      const metricConfig = metricsConfig[metricId];
      metrics[metricId] = await fetchMetricResult(platformKey, effectivePlatform, metricId, metricConfig, options);
    }
  }

  const okMetrics = Object.values(metrics).filter(m => m && m.ok).length;
  const platformOk = okMetrics > 0;

  const result = { platform: platformKey, name, ok: platformOk, metrics };
  if (!platformOk) {
    const firstError = Object.values(metrics).find(m => m && m.error);
    result.error = firstError ? firstError.error : i18n[lang].error;
  }

  // Backward-compatible top-level "value/unit/currency" from balance.balance
  const balanceMetric = metrics.balance;
  if (balanceMetric && balanceMetric.fields && balanceMetric.fields.balance) {
    const field = balanceMetric.fields.balance;
    if (field && field.ok) {
      result.value = field.value;
      result.unit = field.unit || null;
      result.currency = field.currency || null;
    } else {
      result.value = null;
      result.unit = null;
      result.currency = null;
    }
  }

  return result;
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

function labelForMetric(metricId, lang) {
  const id = String(metricId || '').toLowerCase();
  if (lang === 'zh') {
    if (id === 'plan') return '套餐';
    if (id === 'usage') return '用量';
    if (id === 'balance') return '余额';
    return metricId;
  }
  if (id === 'plan') return 'Plan';
  if (id === 'usage') return 'Usage';
  if (id === 'balance') return 'Balance';
  return metricId;
}

function labelForField(fieldKey, lang) {
  const key = String(fieldKey || '');
  const mapZh = {
    plan_name: '套餐',
    tier: '套餐',
    plan: '套餐',
    period: '周期',
    used_tokens: '已用',
    used: '已用',
    remain_tokens: '剩余',
    remaining_tokens: '剩余',
    remaining: '剩余',
    limit_tokens: '额度',
    quota_tokens: '额度',
    quota: '额度',
    balance: '余额'
  };
  const mapEn = {
    plan_name: 'Plan',
    tier: 'Tier',
    plan: 'Plan',
    period: 'Period',
    used_tokens: 'Used',
    used: 'Used',
    remain_tokens: 'Remaining',
    remaining_tokens: 'Remaining',
    remaining: 'Remaining',
    limit_tokens: 'Limit',
    quota_tokens: 'Quota',
    quota: 'Quota',
    balance: 'Balance'
  };
  const map = lang === 'zh' ? mapZh : mapEn;
  return map[key] || key;
}

function shouldUseSpinner(args, stdout) {
  if (!stdout || !stdout.isTTY) return false;
  if (!args || typeof args !== 'object') return false;
  if (args.json) return false;
  if (args.noSpinner) return false;
  return true;
}

function createSpinner(stdout) {
  const frames = ['|', '/', '-', '\\'];
  let timer = null;
  let frameIndex = 0;

  function clearLine() {
    // Clears the whole current line (avoids issues with wide chars like Chinese).
    stdout.write('\r\x1b[2K');
  }

  function render(text) {
    const frame = frames[frameIndex % frames.length];
    frameIndex++;
    clearLine();
    stdout.write(`${text} ${frame}`);
  }

  return {
    start(text) {
      if (timer) return;
      render(text);
      timer = setInterval(() => render(text), 100);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      clearLine();
    }
  };
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
  --no-spinner           ${t.noSpinnerHelp}
  --all                  ${t.allHelp}

${t.commands}:
  check                  ${t.checkAll}
  check --platform X     ${t.checkOne}
  menu                   ${t.menuHelp}
  gui                    ${t.guiHelp}

${t.supportedPlatforms}: ${KNOWN_PLATFORMS.join(', ')}

${t.example}:
  ai-balance check
  ai-balance check --platform deepseek
  ai-balance check --config ~/.config.json
  ai-balance check --lang en
  ai-balance check --json
  ai-balance check --json --raw
  ai-balance menu
  ai-balance gui
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
    raw: false,
    noSpinner: false,
    all: false
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
    if (arg === '--no-spinner') {
      params.noSpinner = true;
      continue;
    }
    if (arg === '--all') {
      params.all = true;
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCheckAndPrint(config, args, lang) {
  const allPlatforms = Object.keys(config.platforms || {});
  let platforms = [];
  const skipped = [];

  if (args.platform) {
    platforms = [args.platform];
  } else if (!args.json && !args.all) {
    for (const key of allPlatforms) {
      const pcfg = config.platforms && config.platforms[key];
      if (hasAnyEndpointConfiguredForPlatform(pcfg)) platforms.push(key);
      else skipped.push(key);
    }

    if (platforms.length === 0) {
      platforms = allPlatforms.slice();
    } else if (skipped.length > 0) {
      const parts = skipped.map(k => {
        const name = (config.platforms && config.platforms[k] && config.platforms[k].name) || k;
        return `${name}(${k})`;
      });
      console.log(`${i18n[lang].skippedPlatforms}: ${parts.join(', ')}`);
      console.log(`${i18n[lang].runAllHint}\n`);
    }
  } else {
    platforms = allPlatforms.slice();
  }
  const results = [];
  const useSpinner = shouldUseSpinner(args, process.stdout);
  const spinner = useSpinner ? createSpinner(process.stdout) : null;

  if (!args.json && !useSpinner) console.log(`${i18n[lang].loading}\n`);

  for (const platformKey of platforms) {
    if (spinner) spinner.start(`${i18n[lang].loading} ${platformKey}`);
    const result = await fetchPlatformResult(platformKey, config, { lang, includeRaw: args.raw });
    if (spinner) spinner.stop();
    results.push(result);

    if (args.json) continue;

    const header = result.ok ? `${i18n[lang].success} - ${result.name}` : `${i18n[lang].error} - ${result.name}`;
    console.log(header);

    const metricIds = orderMetricKeys(Object.keys(result.metrics || {}));
    for (const metricId of metricIds) {
      const metric = result.metrics[metricId];
      const metricLabel = labelForMetric(metricId, lang);
      if (!metric || metric.ok === false) {
        if (metric && metric.code === 'missing_endpoint') {
          console.log(`  [${metricLabel}] ${metric.error}`);
        } else {
          console.log(`  [${metricLabel}] ERROR: ${metric && metric.error ? metric.error : ''}`);
        }
        if (args.raw && metric && metric.raw !== undefined) console.log(JSON.stringify(metric.raw, null, 2));
        continue;
      }

      const fields = metric.fields || {};
      const fieldKeys = Object.keys(fields);
      if (fieldKeys.length === 0) {
        console.log(`  [${metricLabel}] N/A${metric.message ? ` (${metric.message})` : ''}`);
        if (args.raw && metric.raw !== undefined) console.log(JSON.stringify(metric.raw, null, 2));
        continue;
      }

      for (const fieldKey of fieldKeys) {
        const field = fields[fieldKey];
        const fieldLabel = labelForField(fieldKey, lang);
        if (!field || field.ok === false) {
          console.log(`  [${metricLabel}] ${fieldLabel}: ERROR ${field && field.error ? field.error : ''}`);
          continue;
        }
        const valueText = formatValue(field.value, field.unit, field.currency);
        const suffix = field.message ? ` (${field.message})` : '';
        console.log(`  [${metricLabel}] ${fieldLabel}: ${valueText}${suffix}`);
      }

      if (args.raw && metric.raw !== undefined) console.log(JSON.stringify(metric.raw, null, 2));
    }

    if (args.raw && (result.raw !== undefined || result.metrics === undefined)) {
      // (platform-level raw is not used; keep for compatibility if present)
      console.log(JSON.stringify(result.raw, null, 2));
    }
  }

  if (args.json) {
    const output = { timestamp: new Date().toISOString(), language: lang, results };
    console.log(JSON.stringify(output, null, 2));
  }
}

async function runMenu(config, args, lang) {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const platforms = Object.keys(config.platforms || {});

  const state = {
    platform: args.platform || null,
    raw: false,
    spinner: true,
    intervalSec: 60
  };

  const question = q =>
    new Promise(resolve => {
      rl.question(q, answer => resolve(answer));
    });

  function showState() {
    const platformName = state.platform ? (config.platforms[state.platform] && config.platforms[state.platform].name) || state.platform : '全部';
    console.log('');
    console.log('==============================');
    console.log(`AI Balance (${lang === 'zh' ? '中文菜单' : 'Menu'})`);
    console.log(`Platform: ${platformName}`);
    console.log(`raw: ${state.raw ? 'ON' : 'OFF'} | spinner: ${state.spinner ? 'ON' : 'OFF'} | interval: ${state.intervalSec}s`);
    console.log('------------------------------');
    if (lang === 'zh') {
      console.log('1) 选择平台');
      console.log('2) 立即查询');
      console.log('3) 切换 raw');
      console.log('4) 切换跑马灯');
      console.log('5) 自动刷新（Ctrl+C 返回菜单）');
      console.log('0) 退出');
    } else {
      console.log('1) Select platform');
      console.log('2) Check now');
      console.log('3) Toggle raw');
      console.log('4) Toggle spinner');
      console.log('5) Auto refresh (Ctrl+C to menu)');
      console.log('0) Exit');
    }
  }

  while (true) {
    showState();
    const choice = String((await question('> ')) || '').trim();
    if (choice === '0' || choice.toLowerCase() === 'q') break;

    if (choice === '1') {
      console.log('');
      console.log(lang === 'zh' ? '选择平台：' : 'Select platform:');
      console.log(`0) ${lang === 'zh' ? '全部' : 'All'}`);
      platforms.forEach((p, idx) => {
        const name = (config.platforms[p] && config.platforms[p].name) || p;
        console.log(`${idx + 1}) ${name} (${p})`);
      });
      const answer = String((await question('> ')) || '').trim();
      const n = Number(answer);
      if (!Number.isFinite(n) || n < 0 || n > platforms.length) continue;
      state.platform = n === 0 ? null : platforms[n - 1];
      continue;
    }

    if (choice === '2') {
      await runCheckAndPrint(
        config,
        { ...args, platform: state.platform, raw: state.raw, json: false, noSpinner: !state.spinner },
        lang
      );
      continue;
    }

    if (choice === '3') {
      state.raw = !state.raw;
      continue;
    }

    if (choice === '4') {
      state.spinner = !state.spinner;
      continue;
    }

    if (choice === '5') {
      const answer = String((await question(lang === 'zh' ? '刷新间隔秒数（默认 60）> ' : 'Interval seconds (default 60) > ')) || '')
        .trim();
      const n = Number(answer || state.intervalSec);
      if (Number.isFinite(n) && n > 0) state.intervalSec = Math.floor(n);

      let stop = false;
      const onSigint = () => {
        stop = true;
      };
      process.once('SIGINT', onSigint);

      while (!stop) {
        await runCheckAndPrint(
          config,
          { ...args, platform: state.platform, raw: state.raw, json: false, noSpinner: !state.spinner },
          lang
        );
        await sleep(state.intervalSec * 1000);
      }

      continue;
    }
  }

  rl.close();
}

function launchWindowsGui(args, lang) {
  if (process.platform !== 'win32') {
    console.error(`${i18n[lang].error}: ${i18n[lang].winOnly}`);
    process.exit(1);
  }

  const { spawn } = require('child_process');
  const scriptPath = path.join(__dirname, 'windows', 'ai-balance-gui.ps1');
  if (!fs.existsSync(scriptPath)) {
    console.error(`${i18n[lang].error}: GUI script not found: ${scriptPath}`);
    process.exit(1);
  }

  const psArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath];
  if (args.configPath) psArgs.push('-Config', args.configPath);
  if (args.platform) psArgs.push('-Platform', args.platform);
  if (args.lang) psArgs.push('-Lang', args.lang);

  const child = spawn('powershell.exe', psArgs, { stdio: 'ignore', detached: true });
  child.unref();
}

// Main function
async function main() {
  applyDotEnv();
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

  if (args.command === 'check') {
    await runCheckAndPrint(config, args, lang);
    return;
  }

  if (args.command === 'menu') {
    await runMenu(config, args, lang);
    return;
  }

  if (args.command === 'gui') {
    launchWindowsGui(args, lang);
    return;
  }

  console.error(`${i18n[lang].error}: ${i18n[lang].unknownCommand}: ${args.command}`);
  console.error(buildHelp(lang));
  process.exit(1);
}

function __setAxiosForTests(nextAxios) {
  // Kept for backward compatibility with older tests; use __setHttpClientForTests instead.
  if (nextAxios && typeof nextAxios === 'function') {
    httpClient = {
      requestJson: async ({ method, url, headers, query, body, timeoutMs }) => {
        const response = await nextAxios({
          method,
          url,
          headers,
          params: query,
          data: body,
          timeout: timeoutMs,
          validateStatus: () => true
        });
        return { status: response.status, data: response.data, headers: response.headers || {} };
      }
    };
  }
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
  mergeMetricConfig,
  fetchMetricResult,
  fetchPlatformResult,
  formatValue,
  buildHelp,
  shouldUseSpinner,
  __setHttpClientForTests,
  __setAxiosForTests
};

if (require.main === module) {
  main().catch(error => {
    const message = error && error.message ? error.message : String(error);
    console.error(`Fatal error: ${message}`);
    process.exit(1);
  });
}
