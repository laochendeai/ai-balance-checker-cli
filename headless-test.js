#!/usr/bin/env node

/**
 * 无头浏览器测试脚本
 * 测试 Playwright 基本功能
 */

const { chromium } = require('playwright');

async function test() {
  console.log('🚀 启动无头浏览器测试...\n');

  let browser;

  try {
    // 启动浏览器
    browser = await chromium.launch({
      headless: true,  // 无头模式
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    console.log('✅ 浏览器启动成功\n');

    // 创建页面
    const page = await browser.newPage();

    // 设置视口大小
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 访问测试页面
    console.log('📖 访问 https://example.com...');
    await page.goto('https://example.com', { waitUntil: 'networkidle' });

    // 获取页面标题
    const title = await page.title();
    console.log('📄 页面标题:', title);

    // 获取页面 URL
    const url = page.url();
    console.log('🔗 页面 URL:', url);

    // 截图
    const screenshotPath = '/home/ubuntu/.openclaw/workspace/test-screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('📸 截图已保存:', screenshotPath);

    // 获取页面文本内容
    const textContent = await page.textContent('body');
    console.log('\n📝 页面内容预览:');
    console.log('─'.repeat(60));
    console.log(textContent.substring(0, 300) + '...');
    console.log('─'.repeat(60));

    // 测试交互 - 点击页面元素
    console.log('\n🖱️ 测试点击功能...');
    try {
      const link = await page.$('a');
      if (link) {
        await link.click();
        console.log('✅ 点击成功');
      }
    } catch (error) {
      console.log('⚠️  无可点击元素');
    }

    console.log('\n✨ 所有测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  } finally {
    // 关闭浏览器
    if (browser) {
      await browser.close();
      console.log('🔒 浏览器已关闭');
    }
  }
}

// 运行测试
test().catch(console.error);
