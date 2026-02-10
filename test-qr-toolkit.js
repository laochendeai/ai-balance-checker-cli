#!/usr/bin/env node

/**
 * QR Toolkit 问题诊断脚本
 * 测试多语言切换和核心功能
 */

const { chromium } = require('playwright');

async function testQRToolkit() {
  console.log('🔍 开始诊断 QR Toolkit...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  try {
    // 访问网站
    console.log('📖 访问 https://qr-toolkit.vercel.app/');
    await page.goto('https://qr-toolkit.vercel.app/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ 页面加载成功\n');

    // 截图初始状态
    await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/qr-initial.png' });
    console.log('📸 初始状态截图已保存');

    // 检查页面标题
    const title = await page.title();
    console.log('📄 页面标题:', title);

    // 检查控制台错误
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ 控制台错误:', msg.text());
      }
    });

    // 测试 1: 检查多语言切换按钮是否存在
    console.log('\n📌 测试 1: 多语言切换按钮');
    const langButton = await page.$('[data-i18n="switchLanguage"]');
    if (langButton) {
      console.log('✅ 语言切换按钮存在');
      const buttonText = await langButton.textContent();
      console.log('   按钮文本:', buttonText);
    } else {
      console.log('❌ 语言切换按钮不存在');

      // 尝试其他选择器
      console.log('   尝试查找其他按钮...');
      const allButtons = await page.$$('button');
      console.log(`   找到 ${allButtons.length} 个按钮`);
      for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
        const text = await allButtons[i].textContent();
        console.log(`   按钮 ${i + 1}: ${text?.substring(0, 30)}`);
      }
    }

    // 测试 2: 检查 i18n 相关元素
    console.log('\n📌 测试 2: i18n 元素');
    const i18nElements = await page.$$('[data-i18n]');
    console.log(`找到 ${i18nElements.length} 个 data-i18n 元素`);

    // 显示前 5 个
    for (let i = 0; i < Math.min(i18nElements.length, 5); i++) {
      const key = await i18nElements[i].getAttribute('data-i18n');
      const text = await i18nElements[i].textContent();
      console.log(`   [${key}]: ${text?.substring(0, 30)}`);
    }

    // 测试 3: 检查核心功能 - QR 生成器
    console.log('\n📌 测试 3: QR 生成器');
    const textInput = await page.$('#qr-text');
    if (textInput) {
      console.log('✅ 文本输入框存在');

      // 尝试输入
      await textInput.fill('测试文本');
      console.log('✅ 文本输入成功');

      // 等待 QR 生成
      await page.waitForTimeout(2000);

      // 检查 QR 码
      const qrCanvas = await page.$('#qr-code canvas');
      const qrImg = await page.$('#qr-code img');

      if (qrCanvas) {
        console.log('✅ QR 码生成成功（Canvas）');
      } else if (qrImg) {
        console.log('✅ QR 码生成成功（Image）');
      } else {
        console.log('❌ QR 码未生成');
      }

      // 截图
      await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/qr-after-input.png' });
      console.log('📸 输入后截图已保存');
    } else {
      console.log('❌ 文本输入框不存在');
    }

    // 测试 4: 尝试点击语言切换按钮
    console.log('\n📌 测试 4: 点击语言切换按钮');
    const switchBtn = await page.$('button:has-text("Switch"), button:has-text("切换"), .lang-switch');
    if (switchBtn) {
      console.log('✅ 找到语言切换按钮');
      await switchBtn.click();
      console.log('✅ 点击成功');

      await page.waitForTimeout(1000);

      // 再次截图
      await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/qr-after-lang-switch.png' });
      console.log('📸 切换语言后截图已保存');

      // 检查文本是否改变
      const newTitle = await page.title();
      console.log('   新页面标题:', newTitle);
    } else {
      console.log('❌ 找不到语言切换按钮');
    }

    // 测试 5: 检查页面源代码中的脚本加载
    console.log('\n📌 测试 5: 脚本加载检查');
    const scripts = await page.$$eval('script', scripts =>
      scripts.map(s => s.src).filter(src => src)
    );
    console.log('已加载的脚本:');
    scripts.forEach(src => {
      if (src.includes('i18n') || src.includes('qr')) {
        console.log(`   ✅ ${src}`);
      }
    });

    // 测试 6: 检查 localStorage
    console.log('\n📌 测试 6: LocalStorage 检查');
    const localStorage = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    console.log('LocalStorage 内容:', JSON.stringify(localStorage, null, 2));

    // 最终诊断
    console.log('\n' + '='.repeat(60));
    console.log('📊 诊断总结');
    console.log('='.repeat(60));

    if (consoleErrors.length > 0) {
      console.log(`\n⚠️ 发现 ${consoleErrors.length} 个控制台错误:`);
      consoleErrors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }

    console.log('\n📁 生成的诊断文件:');
    console.log('   - qr-initial.png (初始状态)');
    console.log('   - qr-after-input.png (输入后)');
    console.log('   - qr-after-lang-switch.png (切换语言后)');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('堆栈:', error.stack);
  } finally {
    await browser.close();
    console.log('\n🔒 浏览器已关闭');
  }
}

// 运行测试
testQRToolkit().catch(console.error);
