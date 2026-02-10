#!/usr/bin/env node

/**
 * 检查 QR Toolkit 资源加载详情
 */

const { chromium } = require('playwright');

async function checkResources() {
  console.log('📦 检查资源加载...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  // 收集所有请求详情
  const requests = [];
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('qr-toolkit')) {
      requests.push({
        url: url,
        status: response.status(),
        ok: response.ok(),
        contentType: response.headers()['content-type'] || 'unknown'
      });
    }
  });

  try {
    await page.goto('https://qr-toolkit.vercel.app/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ 页面加载完成\n');

    console.log('='.repeat(80));
    console.log('📊 资源加载详情');
    console.log('='.repeat(80));

    if (requests.length === 0) {
      console.log('\n❌ 没有捕获到任何请求！');
    } else {
      requests.forEach((req, i) => {
        console.log(`\n${i + 1}. ${req.url}`);
        console.log(`   状态: ${req.status} ${req.ok ? '✅' : '❌'}`);
        console.log(`   Content-Type: ${req.contentType}`);
      });
    }

    // 检查关键资源
    console.log('\n' + '='.repeat(80));
    console.log('🔑 关键资源检查');
    console.log('='.repeat(80));

    const keyResources = [
      { name: 'i18n.js', url: 'i18n.js' },
      { name: 'app.mjs', url: 'app.mjs' },
      { name: 'merge.mjs', url: 'merge.mjs' },
      { name: 'style.css', url: 'style.css' }
    ];

    keyResources.forEach(resource => {
      const found = requests.find(req => req.url.includes(resource.url));
      if (found) {
        console.log(`\n${resource.name}:`);
        console.log(`  ✅ 已加载`);
        console.log(`  状态: ${found.status}`);
        console.log(`  Content-Type: ${found.contentType}`);
      } else {
        console.log(`\n${resource.name}:`);
        console.log(`  ❌ 未加载`);
      }
    });

    // 尝试直接访问脚本
    console.log('\n' + '='.repeat(80));
    console.log('🧪 直接访问测试');
    console.log('='.repeat(80));

    for (const resource of keyResources) {
      try {
        const url = `https://qr-toolkit.vercel.app/src/${resource.url}`;
        const response = await page.goto(url);
        const status = response.status();
        const contentType = response.headers()['content-type'];
        const content = await response.text();

        console.log(`\n${resource.name}:`);
        console.log(`  URL: ${url}`);
        console.log(`  状态: ${status} ${status === 200 ? '✅' : '❌'}`);
        console.log(`  Content-Type: ${contentType}`);
        console.log(`  内容长度: ${content.length} 字符`);

        if (status !== 200) {
          console.log(`  响应内容: ${content.substring(0, 200)}`);
        }
      } catch (error) {
        console.log(`\n${resource.name}:`);
        console.log(`  ❌ 错误: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('\n❌ 检查失败:', error.message);
  } finally {
    await browser.close();
  }
}

checkResources().catch(console.error);
