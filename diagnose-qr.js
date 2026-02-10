#!/usr/bin/env node

/**
 * QR Toolkit 深度诊断
 * 检查 DOM 结构、JS 执行状态、控制台错误
 */

const { chromium } = require('playwright');

async function diagnoseQRToolkit() {
  console.log('🔬 深度诊断 QR Toolkit...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  // 收集所有控制台消息
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text()
    });
  });

  // 收集所有请求
  const failedRequests = [];
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()
    });
  });

  try {
    console.log('📖 访问页面...');
    await page.goto('https://qr-toolkit.vercel.app/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ 页面加载完成\n');

    // 等待 JS 执行
    await page.waitForTimeout(3000);

    // 检查 1: 控制台错误
    console.log('='.repeat(60));
    console.log('📌 控制台日志分析');
    console.log('='.repeat(60));
    const errors = consoleLogs.filter(log => log.type === 'error');
    const warnings = consoleLogs.filter(log => log.type === 'warning');

    console.log(`\n错误 (${errors.length} 个):`);
    errors.forEach((err, i) => console.log(`  ${i + 1}. ${err.text}`));

    console.log(`\n警告 (${warnings.length} 个):`);
    warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn.text}`));

    console.log(`\n其他日志 (最近 10 条):`);
    consoleLogs.filter(log => !['error', 'warning'].includes(log.type))
      .slice(-10)
      .forEach((log, i) => console.log(`  ${i + 1}. [${log.type}] ${log.text.substring(0, 100)}`));

    // 检查 2: 失败的请求
    console.log('\n' + '='.repeat(60));
    console.log('📌 网络请求分析');
    console.log('='.repeat(60));

    if (failedRequests.length > 0) {
      console.log(`\n失败的请求 (${failedRequests.length} 个):`);
      failedRequests.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.url}`);
        console.log(`     错误: ${req.failure}`);
      });
    } else {
      console.log('\n✅ 所有请求成功');
    }

    // 检查 3: DOM 结构
    console.log('\n' + '='.repeat(60));
    console.log('📌 DOM 结构分析');
    console.log('='.repeat(60));

    // 检查 Generate 标签页
    const generateTab = await page.$('button[data-tab="generate"]');
    console.log('\nGenerate 标签页:', generateTab ? '✅ 存在' : '❌ 不存在');

    // 检查输入框
    const inputSelectors = [
      '#qr-text',
      'input[type="text"]',
      'textarea',
      '#text-input'
    ];

    console.log('\n查找输入框:');
    for (const selector of inputSelectors) {
      const element = await page.$(selector);
      if (element) {
        const type = await element.getAttribute('type');
        const id = await element.getAttribute('id');
        const placeholder = await element.getAttribute('placeholder');
        console.log(`  ✅ ${selector} (type=${type}, id=${id}, placeholder=${placeholder})`);
      } else {
        console.log(`  ❌ ${selector}`);
      }
    }

    // 检查语言切换按钮
    console.log('\n查找语言切换按钮:');
    const langSelectors = [
      '#lang-switch',
      '.lang-switch',
      'button[data-i18n="switchLanguage"]',
      'button:has-text("Switch")',
      'button:has-text("English")'
    ];

    for (const selector of langSelectors) {
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent();
        console.log(`  ✅ ${selector} (text="${text}")`);
      } else {
        console.log(`  ❌ ${selector}`);
      }
    }

    // 检查 4: JavaScript 状态
    console.log('\n' + '='.repeat(60));
    console.log('📌 JavaScript 状态');
    console.log('='.repeat(60));

    const jsStatus = await page.evaluate(() => {
      return {
        jQuery: typeof $ !== 'undefined',
        i18nLoaded: typeof i18n !== 'undefined',
        qrEngineLoaded: typeof QRCode !== 'undefined',
        qrToolkitLoaded: typeof QRToolkit !== 'undefined',
        documentReady: document.readyState,
        activeTab: document.querySelector('.tab.active')?.textContent,
        generatePanelVisible: document.querySelector('#generate-panel')?.offsetParent !== null,
        allPanels: Array.from(document.querySelectorAll('.panel')).map(p => ({
          id: p.id,
          visible: p.offsetParent !== null
        }))
      };
    });

    console.log('\n全局变量:');
    console.log(`  jQuery: ${jsStatus.jQuery ? '✅' : '❌'}`);
    console.log(`  i18n: ${jsStatus.i18nLoaded ? '✅' : '❌'}`);
    console.log(`  QRCode: ${jsStatus.qrEngineLoaded ? '✅' : '❌'}`);
    console.log(`  QRToolkit: ${jsStatus.qrToolkitLoaded ? '✅' : '❌'}`);

    console.log(`\n文档状态: ${jsStatus.documentReady}`);
    console.log(`活动标签页: ${jsStatus.activeTab || '无'}`);

    console.log('\n面板可见性:');
    jsStatus.allPanels.forEach(panel => {
      console.log(`  ${panel.id}: ${panel.visible ? '✅ 可见' : '❌ 隐藏'}`);
    });

    // 检查 5: 检查 Generate 面板内容
    console.log('\n' + '='.repeat(60));
    console.log('📌 Generate 面板内容');
    console.log('='.repeat(60));

    const generateContent = await page.evaluate(() => {
      const panel = document.querySelector('#generate-panel');
      if (!panel) return null;

      return {
        innerHTML: panel.innerHTML.substring(0, 500),
        childElementCount: panel.childElementCount
      };
    });

    if (generateContent) {
      console.log(`\n子元素数量: ${generateContent.childElementCount}`);
      console.log('\nHTML 预览:');
      console.log(generateContent.innerHTML);
    } else {
      console.log('\n❌ Generate 面板不存在');
    }

    // 检查 6: 尝试手动切换标签页
    console.log('\n' + '='.repeat(60));
    console.log('📌 手动测试标签页切换');
    console.log('='.repeat(60));

    console.log('\n点击 Merge 标签页...');
    const mergeTab = await page.$('button[data-tab="merge"]');
    if (mergeTab) {
      await mergeTab.click();
      await page.waitForTimeout(1000);

      const activeTab = await page.evaluate(() =>
        document.querySelector('.tab.active')?.textContent
      );
      console.log(`活动标签页: ${activeTab}`);

      await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/qr-merge-tab.png' });
      console.log('📸 Merge 标签页截图已保存');
    }

    // 检查 7: 完整页面 HTML 结构
    console.log('\n' + '='.repeat(60));
    console.log('📌 页面结构摘要');
    console.log('='.repeat(60));

    const structure = await page.evaluate(() => {
      return {
        title: document.title,
        lang: document.documentElement.lang,
        metaDescription: document.querySelector('meta[name="description"]')?.content,
        scriptCount: document.querySelectorAll('script').length,
        linkCount: document.querySelectorAll('link').length,
        styleCount: document.querySelectorAll('style').length,
        bodyClasses: document.body.className
      };
    });

    console.log('\n页面信息:');
    console.log(`  标题: ${structure.title}`);
    console.log(`  语言: ${structure.lang}`);
    console.log(`  描述: ${structure.metaDescription?.substring(0, 100)}`);
    console.log(`  脚本: ${structure.scriptCount} 个`);
    console.log(`  链接: ${structure.linkCount} 个`);
    console.log(`  样式: ${structure.styleCount} 个`);
    console.log(`  Body 类: ${structure.bodyClasses}`);

  } catch (error) {
    console.error('\n❌ 诊断失败:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('\n🔒 诊断完成');
  }
}

// 运行诊断
diagnoseQRToolkit().catch(console.error);
