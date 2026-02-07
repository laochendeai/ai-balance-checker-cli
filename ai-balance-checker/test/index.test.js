const assert = require('assert');

const {
  extractByPath,
  parseArgs,
  fetchPlatformResult,
  __setAxiosForTests
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
      raw: true
    });

    const args2 = parseArgs(['node', 'index.js', '--platform', 'deepseek', 'check']);
    assert.strictEqual(args2.command, 'check');
    assert.strictEqual(args2.platform, 'deepseek');
  });

  await run('fetchPlatformResult parses DeepSeek default shape', async () => {
    __setAxiosForTests(async () => ({
      status: 200,
      data: {
        balance_infos: [{ total_balance: '12.34', currency: 'CNY' }]
      }
    }));

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
    assert.deepStrictEqual(result.raw, {
      balance_infos: [{ total_balance: '12.34', currency: 'CNY' }]
    });
  });

  await run('fetchPlatformResult errors on missing endpoint', async () => {
    __setAxiosForTests(async () => {
      throw new Error('should not be called');
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
}

main().catch(err => {
  process.stderr.write(`${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});
