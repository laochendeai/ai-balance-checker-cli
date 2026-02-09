const assert = require('assert');

const { extractByPath, parseArgs, fetchPlatformResult, loadConfig, __setHttpClientForTests, shouldUseSpinner } = require('../index.js');

function run(name, fn) {
  try {
    const out = fn();
    if (out && typeof out.then === 'function') {
      return out.then(
        () => process.stdout.write(`PASS ${name}\n`),
        err => {
          process.stderr.write(`FAIL ${name}\n`);
          throw err;
        }
      );
    }
    process.stdout.write(`PASS ${name}\n`);
    return Promise.resolve();
  } catch (err) {
    process.stderr.write(`FAIL ${name}\n`);
    return Promise.reject(err);
  }
}

async function main() {
  await run('extractByPath supports dot + index', () => {
    const obj = { a: { b: [{ c: 1 }, { c: 2 }] } };
    assert.strictEqual(extractByPath(obj, 'a.b[1].c'), 2);
    assert.strictEqual(extractByPath(obj, '$.a.b[0].c'), 1);
    assert.strictEqual(extractByPath(obj, 'a.b[9].c'), undefined);
    assert.strictEqual(extractByPath([{ a: 1 }], '[0].a'), 1);
  });

  await run('parseArgs parses command + flags', () => {
    const args = parseArgs(['node', 'index.js', 'check', '--platform', 'deepseek', '--lang', 'en', '--json', '--raw']);
    assert.deepStrictEqual(args, {
      command: 'check',
      platform: 'deepseek',
      configPath: null,
      help: false,
      lang: 'en',
      json: true,
      raw: true,
      noSpinner: false,
      all: false
    });

    const args2 = parseArgs(['node', 'index.js', '--platform', 'deepseek', 'check']);
    assert.strictEqual(args2.command, 'check');
    assert.strictEqual(args2.platform, 'deepseek');

    const args3 = parseArgs(['node', 'index.js', 'check', '--all']);
    assert.strictEqual(args3.command, 'check');
    assert.strictEqual(args3.all, true);
  });

  await run('shouldUseSpinner respects json/noSpinner/tty', () => {
    assert.strictEqual(shouldUseSpinner({ json: false, noSpinner: false }, { isTTY: true }), true);
    assert.strictEqual(shouldUseSpinner({ json: true, noSpinner: false }, { isTTY: true }), false);
    assert.strictEqual(shouldUseSpinner({ json: false, noSpinner: true }, { isTTY: true }), false);
    assert.strictEqual(shouldUseSpinner({ json: false, noSpinner: false }, { isTTY: false }), false);
  });

  await run('loadConfig rejects legacy platform keys', () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-balance-legacy-'));
    const oldCwd = process.cwd();
    process.chdir(dir);
    try {
      fs.writeFileSync(
        path.join(dir, 'config.json'),
        JSON.stringify(
          {
            language: 'zh',
            platforms: {
              deepseek: {
                name: 'DeepSeek',
                apiKey: 'k',
                balanceEndpoint: 'https://api.deepseek.com/user/balance'
              }
            }
          },
          null,
          2
        ),
        'utf8'
      );

      assert.throws(() => loadConfig(null, 'zh'), /旧版配置字段/);
    } finally {
      process.chdir(oldCwd);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await run('fetchPlatformResult supports deepseek with API key only config', async () => {
    __setHttpClientForTests({
      requestJson: async ({ url }) => {
        assert.strictEqual(url, 'https://api.deepseek.com/user/balance');
        return {
          status: 200,
          data: {
            balance_infos: [{ total_balance: '12.34', currency: 'CNY' }]
          }
        };
      }
    });

    const config = {
      language: 'zh',
      platforms: {
        deepseek: {
          name: 'DeepSeek',
          apiKey: 'test-key',
          auth: { type: 'bearer' }
        }
      }
    };

    const result = await fetchPlatformResult('deepseek', config, { lang: 'zh', includeRaw: true });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.value, 12.34);
    assert.strictEqual(result.currency, 'CNY');
    assert.ok(result.metrics.balance.fields.balance.ok);
  });

  await run('fetchPlatformResult supports kimi with API key only config', async () => {
    let requestedUrl = null;
    __setHttpClientForTests({
      requestJson: async ({ url }) => {
        requestedUrl = url;
        return {
          status: 200,
          data: {
            code: 0,
            data: { available_balance: 49.58894 },
            scode: '0x0',
            status: true
          }
        };
      }
    });

    const config = {
      language: 'zh',
      platforms: {
        kimi: {
          name: 'Moonshot AI (Kimi)',
          apiKey: 'test-key',
          auth: { type: 'bearer' }
        }
      }
    };

    const result = await fetchPlatformResult('kimi', config, { lang: 'zh' });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(requestedUrl, 'https://api.moonshot.cn/v1/users/me/balance');
    assert.ok(Math.abs(result.value - 49.58894) < 1e-9);
    assert.strictEqual(result.currency, 'CNY');
  });

  await run('fetchPlatformResult requires metrics for qwen', async () => {
    __setHttpClientForTests({
      requestJson: async () => {
        throw new Error('should not be called');
      }
    });

    const config = {
      language: 'zh',
      platforms: {
        qwen: {
          name: '通义千问',
          apiKey: 'x'
        }
      }
    };

    const result = await fetchPlatformResult('qwen', config, { lang: 'zh' });
    assert.strictEqual(result.ok, false);
    assert.ok(String(result.error).includes('metrics'));
  });

  await run('fetchPlatformResult errors on missing endpoint in explicit metric', async () => {
    __setHttpClientForTests({
      requestJson: async () => {
        throw new Error('should not be called');
      }
    });

    const config = {
      language: 'zh',
      platforms: {
        qwen: {
          name: '通义千问',
          apiKey: 'x',
          metrics: {
            balance: {
              endpoint: '',
              fields: [{ key: 'balance', path: 'data.balance' }]
            }
          }
        }
      }
    };

    const result = await fetchPlatformResult('qwen', config, { lang: 'zh' });
    assert.strictEqual(result.ok, false);
    assert.ok(String(result.error).includes('metrics.balance.endpoint'));
  });

  await run('fetchPlatformResult supports metrics with multiple fields', async () => {
    __setHttpClientForTests({
      requestJson: async ({ url }) => {
        if (String(url).includes('/plan')) {
          return { status: 200, data: { data: { plan: { name: 'Pro' } } } };
        }
        if (String(url).includes('/usage')) {
          return { status: 200, data: { data: { used: 10, limit: 100, remain: 90, period: '2026-02' } } };
        }
        if (String(url).includes('/balance')) {
          return { status: 200, data: { data: { balance: '12.5', currency: 'CNY' } } };
        }
        return { status: 404, data: { error: 'not found' } };
      }
    });

    const config = {
      language: 'zh',
      platforms: {
        demo: {
          name: 'Demo',
          apiKey: 'k',
          auth: { type: 'bearer' },
          metrics: {
            plan: {
              endpoint: 'https://example.com/plan',
              fields: [{ key: 'plan_name', path: 'data.plan.name' }]
            },
            usage: {
              endpoint: 'https://example.com/usage',
              fields: [
                { key: 'used_tokens', path: 'data.used', unit: 'tokens' },
                { key: 'limit_tokens', path: 'data.limit', unit: 'tokens' },
                { key: 'remain_tokens', path: 'data.remain', unit: 'tokens' },
                { key: 'period', path: 'data.period' }
              ]
            },
            balance: {
              endpoint: 'https://example.com/balance',
              fields: [{ key: 'balance', path: 'data.balance', currencyPath: 'data.currency', currency: 'CNY' }]
            }
          }
        }
      }
    };

    const result = await fetchPlatformResult('demo', config, { lang: 'zh', includeRaw: true });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.metrics.plan.fields.plan_name.value, 'Pro');
    assert.strictEqual(result.metrics.usage.fields.used_tokens.value, 10);
    assert.strictEqual(result.metrics.usage.fields.used_tokens.unit, 'tokens');
    assert.strictEqual(result.metrics.balance.fields.balance.value, 12.5);
    assert.strictEqual(result.metrics.balance.fields.balance.currency, 'CNY');
    assert.deepStrictEqual(result.metrics.plan.raw, { data: { plan: { name: 'Pro' } } });
  });
}

main().catch(err => {
  process.stderr.write(`${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});
