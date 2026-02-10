#!/usr/bin/env node

/**
 * 测试 JavaScript 执行
 */

const { chromium } = require('playwright');

async function testJSExecution() {
  console.log('🧪 测试 JavaScript 执行...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 收集所有控制台消息
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // 收集所有页面错误
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });

  try {
    console.log('📖 访问页面...');
    await page.goto('https://qr-toolkit.vercel.app/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ 页面加载完成\n');

    // 等待一段时间让脚本执行
    await page.waitForTimeout(5000);

    console.log('='.repeat(80));
    console.log('📊 控制台消息');
    console.log('='.repeat(80));

    if (consoleMessages.length === 0) {
      console.log('\n没有控制台消息');
    } else {
      console.log(`\n总计 ${consoleMessages.length} 条消息:\n`);
      consoleMessages.forEach((msg, i) => {
        console.log(`${i + 1}. [${msg.type}] ${msg.text}`);
        if (msg.location) {
          console.log(`   位置: ${msg.location.url}:${msg.location.lineNumber}`);
        }
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('❌ 页面错误');
    console.log('='.repeat(80));

    if (pageErrors.length === 0) {
      console.log('\n✅ 没有页面错误');
    } else {
      console.log(`\n发现 ${pageErrors.length} 个错误:\n`);
      pageErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.message}`);
        console.log(`   ${error.stack}`);
      });
    }

    // 手动执行 i18n.js
    console.log('\n' + '='.repeat(80));
    console.log('🔧 手动执行 i18n.js');
    console.log('='.repeat(80));

    try {
      const i18nCode = await page.evaluate(() => {
        const script = document.querySelector('script[src="./src/i18n.js"]');
        if (!script) return null;

        // 获取脚本内容
        const response = fetch(script.src)
          .then(res => res.text())
          .catch(() => null);

        return response;
      });

      if (i18nCode) {
        console.log(`\n✅ i18n.js 内容已获取 (${i18nCode.length} 字符)`);

        // 尝试执行
        const execResult = await page.evaluate((code) => {
          try {
            eval(code);
            return { success: true, i18nExists: typeof window.i18n !== 'undefined' };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }, i18nCode);

        console.log(`执行结果: ${JSON.stringify(execResult, null, 2)}`);

        // 检查 i18n 是否存在
        const i18nCheck = await page.evaluate(() => {
          return {
            i18nExists: typeof window.i18n !== 'undefined',
            i18nMethods: typeof window.i18n !== 'undefined' ? Object.keys(window.i18n) : [],
            currentLang: typeof window.i18n !== 'undefined' ? window.i18n.getCurrentLanguage?.() : null
          };
        });

        console.log(`i18n 状态: ${JSON.stringify(i18nCheck, null, 2)}`);
      }
    } catch (error) {
      console.log(`\n❌ 错误: ${error.message}`);
    }

    // 检查 DOM 事件
    console.log('\n' + '='.repeat(80));
    console.log('🎯 检查 DOM 和事件');
    console.log('='.repeat(80));

    const domStatus = await page.evaluate(() => {
      const payload = document.getElementById('payload');
      return {
        payloadExists: !!payload,
        payloadValue: payload?.value || null,
        payloadEvents: payload ? {
          click: !!payload.onclick,
          input: !!payload.oninput,
          change: !!payload.onchange,
          listeners: Object.keys(getEventListeners ? getEventListeners(payload) : {})
        } : null,
        documentReady: document.readyState
      };
    });

    console.log(`\nDOM 状态: ${JSON.stringify(domStatus, null, 2)}`);

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testJSExecution().catch(console.error);
