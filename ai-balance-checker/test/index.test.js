const assert = require('assert');

const {
  extractByPath,
  parseArgs,
  fetchPlatformResult,
  __setHttpClientForTests,
  shouldUseSpinner
} = require('../index.js');

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
    const args = parseArgs([
      'node',
      'index.js',
      'check',
      '--platform',
      'deepseek',
      '--lang',
      'en',
      '--json',
      '--raw'
    ]);
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

  await run('fetchPlatformResult parses DeepSeek legacy balance shape', async () => {
    __setHttpClientForTests({
      requestJson: async () => ({
        status: 200,
        data: {
          balance_infos: [{ total_balance: '12.34', currency: 'CNY' }]
        }
      })
    });

    const config = {
      language: 'zh',
      platforms: {
        deepseek: {
          name: 'DeepSeek',
          apiKey: 'test-key',
          balanceEndpoint: 'https://api.deepseek.com/user/balance',
          auth: { type: 'bearer' },
          balancePath: 'balance_infos[0].total_balance',
          currencyPath: 'balance_infos[0].currency'
        }
      }
    };

    const result = await fetchPlatformResult('deepseek', config, { lang: 'zh', includeRaw: true });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.value, 12.34);
    assert.strictEqual(result.currency, 'CNY');
    assert.ok(result.metrics);
    assert.ok(result.metrics.balance);
    assert.strictEqual(result.metrics.balance.ok, true);
    assert.strictEqual(result.metrics.balance.fields.balance.ok, true);
    assert.strictEqual(result.metrics.balance.fields.balance.value, 12.34);
    assert.strictEqual(result.metrics.balance.fields.balance.currency, 'CNY');
    assert.deepStrictEqual(result.metrics.balance.raw, {
      balance_infos: [{ total_balance: '12.34', currency: 'CNY' }]
    });
  });

  await run('fetchPlatformResult uses Kimi default endpoint + balancePath', async () => {
    let requestedUrl = null;
    __setHttpClientForTests({
      requestJson: async ({ url }) => {
        requestedUrl = url;
        return {
          status: 200,
          data: {
            code: 0,
            data: { available_balance: 49.58894, voucher_balance: 46.58893, cash_balance: 3.00001 },
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
          auth: { type: 'bearer' },
          metrics: {
            balance: {
              endpoint: '',
              fields: [{ key: 'balance', path: '' }]
            }
          }
        }
      }
    };

    const result = await fetchPlatformResult('kimi', config, { lang: 'zh' });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(requestedUrl, 'https://api.moonshot.cn/v1/users/me/balance');
    assert.ok(Math.abs(result.value - 49.58894) < 1e-9);
    assert.strictEqual(result.currency, 'CNY');
    assert.strictEqual(result.metrics.balance.fields.balance.ok, true);
    assert.ok(Math.abs(result.metrics.balance.fields.balance.value - 49.58894) < 1e-9);
    assert.strictEqual(result.metrics.balance.fields.balance.currency, 'CNY');
  });

  await run('fetchPlatformResult errors on missing endpoint', async () => {
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
          balanceEndpoint: ''
        }
      }
    };

    const result = await fetchPlatformResult('qwen', config, { lang: 'zh' });
    assert.strictEqual(result.ok, false);
    assert.ok(String(result.error).includes('balanceEndpoint'));
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
