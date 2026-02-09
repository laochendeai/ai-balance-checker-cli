#!/usr/bin/env node

/**
 * 无头浏览器简单示例（稳定版）
 * 使用不容易被封的网站进行测试
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function simpleTest() {
  console.log('🎭 无头浏览器简单示例\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 示例 1: 访问页面并获取信息
  console.log('📌 示例 1: 访问页面');
  await page.goto('https://httpbin.org/html');

  const title = await page.title();
  const h1 = await page.textContent('h1');

  console.log('标题:', title);
  console.log('H1 内容:', h1);
  console.log('✅ 完成\n');

  // 示例 2: 截图
  console.log('📌 示例 2: 截图');
  await page.goto('https://httpbin.org/headers');
  await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/headers.png' });
  console.log('✅ 截图已保存: headers.png\n');

  // 示例 3: PDF 导出
  console.log('📌 示例 3: PDF 导出');
  await page.pdf({
    path: '/home/ubuntu/.openclaw/workspace/test.pdf',
    format: 'A4',
    printBackground: true
  });
  console.log('✅ PDF 已导出: test.pdf\n');

  // 示例 4: 获取 JSON API 数据
  console.log('📌 示例 4: 获取 API 数据');
  const response = await page.goto('https://httpbin.org/json');
  const data = await response.json();
  console.log('JSON 数据:', JSON.stringify(data, null, 2).substring(0, 200));
  console.log('✅ 完成\n');

  // 示例 5: 表单提交测试
  console.log('📌 示例 5: 模拟表单提交');
  await page.goto('https://httpbin.org/post', {
    method: 'POST',
    data: { name: '测试用户', email: 'test@example.com' }
  });

  const responseText = await page.textContent('body');
  const jsonText = responseText.match(/\{[\s\S]*\}/)?.[0] || '{}';
  const jsonData = JSON.parse(jsonText);

  console.log('表单提交成功');
  console.log('  姓名:', jsonData.form?.name);
  console.log('  邮箱:', jsonData.form?.email);
  console.log('✅ 完成\n');

  // 示例 6: 等待元素
  console.log('📌 示例 6: 等待元素加载');
  await page.goto('https://httpbin.org/delay/2');
  await page.waitForLoadState('networkidle');
  console.log('✅ 页面加载完成（2秒延迟）\n');

  await browser.close();
  console.log('─'.repeat(60));
  console.log('🎉 所有示例完成！');

  // 输出文件列表
  console.log('\n📁 生成的文件:');
  const files = [
    '/home/ubuntu/.openclaw/workspace/headers.png',
    '/home/ubuntu/.openclaw/workspace/test.pdf'
  ];

  files.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      console.log(`  ✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
      console.log(`  ❌ ${file} (不存在)`);
    }
  });
}

// 运行测试
simpleTest().catch(console.error);
