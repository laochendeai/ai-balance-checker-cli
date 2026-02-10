#!/usr/bin/env node

/**
 * QR Toolkit 完整功能测试
 * 测试所有标签页和功能
 */

const { chromium } = require('playwright');

async function fullTestQRToolkit() {
  console.log('🧪 QR Toolkit 完整功能测试\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });

  // 收集控制台错误
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`❌ 控制台错误: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`❌ 页面错误: ${error.message}`);
  });

  try {
    console.log('='.repeat(80));
    console.log('📖 访问网站');
    console.log('='.repeat(80));

    await page.goto('https://qr-toolkit.vercel.app/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ 页面加载成功\n');

    // 等待 JS 执行
    await page.waitForTimeout(3000);

    // 检查全局对象
    const globalObjects = await page.evaluate(() => {
      return {
        i18n: typeof window.i18n !== 'undefined',
        QRToolkit: typeof window.QRToolkit !== 'undefined',
        QRCode: typeof window.QRCode !== 'undefined',
        docReady: document.readyState
      };
    });

    console.log('📊 全局对象状态:');
    console.log(`  i18n: ${globalObjects.i18n ? '✅' : '❌'}`);
    console.log(`  QRToolkit: ${globalObjects.QRToolkit ? '✅' : '❌'}`);
    console.log(`  QRCode: ${globalObjects.QRCode ? '✅' : '❌'}`);
    console.log(`  文档状态: ${globalObjects.docReady}\n`);

    // 测试 1: Generate 标签页
    console.log('='.repeat(80));
    console.log('📌 测试 1: Generate（二维码生成）');
    console.log('='.repeat(80));

    const generateTab = await page.$('button[data-tab="generate"]');
    if (!generateTab) {
      console.log('❌ Generate 标签不存在');
    } else {
      console.log('✅ Generate 标签存在');

      // 点击 Generate 标签
      await generateTab.click();
      await page.waitForTimeout(1000);

      // 查找输入框
      const payloadInput = await page.$('#payload');
      if (!payloadInput) {
        console.log('❌ 输入框 #payload 不存在');

        // 尝试其他选择器
        const textarea = await page.$('textarea');
        if (textarea) {
          console.log('✅ 找到 textarea');
        } else {
          console.log('❌ 完全找不到输入框');
        }
      } else {
        console.log('✅ 输入框 #payload 存在');

        // 输入测试文本
        await payloadInput.fill('https://example.com');
        console.log('✅ 输入文本成功');

        // 等待二维码生成
        await page.waitForTimeout(2000);

        // 检查二维码
        const qrCanvas = await page.$('#qr-code canvas');
        const qrImg = await page.$('#qr-code img');

        if (qrCanvas) {
          console.log('✅ 二维码生成成功（Canvas）');
        } else if (qrImg) {
          console.log('✅ 二维码生成成功（Image）');
        } else {
          console.log('❌ 二维码未生成');

          // 检查 #qr-code 元素
          const qrCodeDiv = await page.$('#qr-code');
          if (qrCodeDiv) {
            const innerHTML = await qrCodeDiv.innerHTML();
            console.log(`  #qr-code 内容: ${innerHTML.substring(0, 100)}`);
          }
        }
      }

      // 截图
      await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/test-generate.png' });
      console.log('📸 截图已保存: test-generate.png\n');
    }

    // 测试 2: Merge 标签页
    console.log('='.repeat(80));
    console.log('📌 测试 2: Merge（二维码合并）');
    console.log('='.repeat(80));

    const mergeTab = await page.$('button[data-tab="merge"]');
    if (!mergeTab) {
      console.log('❌ Merge 标签不存在');
    } else {
      console.log('✅ Merge 标签存在');
      await mergeTab.click();
      await page.waitForTimeout(1000);

      // 检查合并面板
      const mergePanel = await page.$('#merge-panel');
      if (!mergePanel) {
        console.log('❌ Merge 面板不存在');
      } else {
        console.log('✅ Merge 面板存在');

        // 检查上传按钮
        const uploadBtn = await page.$('input[type="file"]');
        if (uploadBtn) {
          console.log('✅ 上传按钮存在');
        } else {
          console.log('❌ 上传按钮不存在');
        }
      }

      await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/test-merge.png' });
      console.log('📸 截图已保存: test-merge.png\n');
    }

    // 测试 3: Scan 标签页
    console.log('='.repeat(80));
    console.log('📌 测试 3: Scan（扫码识别）');
    console.log('='.repeat(80));

    const scanTab = await page.$('button[data-tab="scan"]');
    if (!scanTab) {
      console.log('❌ Scan 标签不存在');
    } else {
      console.log('✅ Scan 标签存在');
      await scanTab.click();
      await page.waitForTimeout(1000);

      // 检查扫码面板
      const scanPanel = await page.$('#scan-panel');
      if (!scanPanel) {
        console.log('❌ Scan 面板不存在');
      } else {
        console.log('✅ Scan 面板存在');

        // 检查摄像头按钮
        const cameraBtn = await page.$('button:has-text("Camera"), button:has-text("摄像头")');
        if (cameraBtn) {
          console.log('✅ 摄像头按钮存在');
        } else {
          console.log('❌ 摄像头按钮不存在');
        }
      }

      await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/test-scan.png' });
      console.log('📸 截图已保存: test-scan.png\n');
    }

    // 测试 4: Batch 标签页
    console.log('='.repeat(80));
    console.log('📌 测试 4: Batch（批量生成）');
    console.log('='.repeat(80));

    const batchTab = await page.$('button[data-tab="batch"]');
    if (!batchTab) {
      console.log('❌ Batch 标签不存在');
    } else {
      console.log('✅ Batch 标签存在');
      await batchTab.click();
      await page.waitForTimeout(1000);

      // 检查批量面板
      const batchPanel = await page.$('#batch-panel');
      if (!batchPanel) {
        console.log('❌ Batch 面板不存在');
      } else {
        console.log('✅ Batch 面板存在');

        // 检查输入框
        const batchInput = await page.$('#batch-input');
        if (batchInput) {
          console.log('✅ 批量输入框存在');
        } else {
          console.log('❌ 批量输入框不存在');
        }
      }

      await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/test-batch.png' });
      console.log('📸 截图已保存: test-batch.png\n');
    }

    // 测试 5: About 标签页
    console.log('='.repeat(80));
    console.log('📌 测试 5: About（关于）');
    console.log('='.repeat(80));

    const aboutTab = await page.$('button[data-tab="about"]');
    if (!aboutTab) {
      console.log('❌ About 标签不存在');
    } else {
      console.log('✅ About 标签存在');
      await aboutTab.click();
      await page.waitForTimeout(1000);

      // 检查关于面板
      const aboutPanel = await page.$('#about-panel');
      if (!aboutPanel) {
        console.log('❌ About 面板不存在');
      } else {
        console.log('✅ About 面板存在');

        // 检查内容
        const aboutText = await aboutPanel.textContent();
        if (aboutText.length > 100) {
          console.log(`✅ About 内容正常 (${aboutText.length} 字符)`);
        } else {
          console.log('❌ About 内容异常');
        }
      }

      await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/test-about.png' });
      console.log('📸 截图已保存: test-about.png\n');
    }

    // 测试 6: 多语言切换
    console.log('='.repeat(80));
    console.log('📌 测试 6: 多语言切换');
    console.log('='.repeat(80));

    const langButtons = await page.$$('.lang-btn');
    console.log(`找到 ${langButtons.length} 个语言按钮`);

    if (langButtons.length >= 2) {
      console.log('✅ 语言按钮数量正常');

      // 获取当前文本
      const titleBefore = await page.$eval('[data-i18n="site.title"]', el => el.textContent);
      console.log(`当前标题: ${titleBefore}`);

      // 切换语言
      await langButtons[0].click();
      await page.waitForTimeout(1000);

      const titleAfter = await page.$eval('[data-i18n="site.title"]', el => el.textContent);
      console.log(`切换后标题: ${titleAfter}`);

      if (titleBefore !== titleAfter) {
        console.log('✅ 语言切换成功');
      } else {
        console.log('❌ 语言切换失败');
      }
    } else {
      console.log('❌ 语言按钮数量异常');
    }

    // 测试 7: 检查所有面板可见性
    console.log('\n' + '='.repeat(80));
    console.log('📌 测试 7: 面板可见性检查');
    console.log('='.repeat(80));

    const panels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.panel')).map(p => ({
        id: p.id,
        display: window.getComputedStyle(p).display,
        visible: p.offsetParent !== null
      }));
    });

    console.log('\n面板状态:');
    panels.forEach(p => {
      if (p.visible) {
        console.log(`  ✅ ${p.id}: 可见 (display=${p.display})`);
      } else {
        console.log(`  ❌ ${p.id}: 隐藏 (display=${p.display})`);
      }
    });

    // 总结
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试总结');
    console.log('='.repeat(80));

    if (errors.length > 0) {
      console.log(`\n⚠️ 发现 ${errors.length} 个错误:`);
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    } else {
      console.log('\n✅ 没有发现错误');
    }

    console.log('\n📁 生成的测试截图:');
    console.log('  - test-generate.png');
    console.log('  - test-merge.png');
    console.log('  - test-scan.png');
    console.log('  - test-batch.png');
    console.log('  - test-about.png');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('\n🔒 浏览器已关闭');
  }
}

// 运行测试
fullTestQRToolkit().catch(console.error);
