#!/usr/bin/env node

/**
 * 无头浏览器实用示例集合
 * 展示常见自动化场景
 */

const { chromium } = require('playwright');

// 示例 1: 网页搜索
async function exampleSearch() {
  console.log('\n📌 示例 1: 网页搜索');
  console.log('─'.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.google.com');
  await page.fill('textarea[name="q"]', 'Playwright automation');
  await page.press('textarea[name="q"]', 'Enter');

  // 等待结果加载
  await page.waitForSelector('div#search');

  const results = await page.$$eval('div#search a', (links) =>
    links.slice(0, 5).map(link => link.textContent.trim())
  );

  console.log('搜索结果（前 5 条）:');
  results.forEach((result, i) => console.log(`${i + 1}. ${result}`));

  await browser.close();
  console.log('✅ 完成\n');
}

// 示例 2: 表单填写
async function exampleForm() {
  console.log('\n📌 示例 2: 表单填写');
  console.log('─'.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 访问一个测试表单
  await page.goto('https://httpbin.org/forms/post');

  // 填写表单字段
  await page.fill('input[name="custname"]', '测试用户');
  await page.fill('input[name="custtel"]', '13800138000');
  await page.fill('textarea[name="custemail"]', 'test@example.com');

  console.log('表单填写完成:');
  console.log('  姓名: 测试用户');
  console.log('  电话: 13800138000');
  console.log('  邮箱: test@example.com');

  await browser.close();
  console.log('✅ 完成\n');
}

// 示例 3: 数据抓取
async function exampleScrape() {
  console.log('\n📌 示例 3: 数据抓取');
  console.log('─'.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 访问 Hacker News
  await page.goto('https://news.ycombinator.com/');

  // 抓取新闻标题和链接
  const news = await page.$$eval('span.titleline > a', (items) =>
    items.slice(0, 5).map(item => ({
      title: item.textContent.trim(),
      url: item.href
    }))
  );

  console.log('Hacker News 前 5 条:');
  news.forEach((item, i) => {
    console.log(`${i + 1}. ${item.title}`);
    console.log(`   ${item.url}`);
  });

  await browser.close();
  console.log('✅ 完成\n');
}

// 示例 4: 性能监控
async function examplePerformance() {
  console.log('\n📌 示例 4: 性能监控');
  console.log('─'.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 启用性能监控
  await page.coverage.startJSCoverage();

  const startTime = Date.now();
  await page.goto('https://example.com');
  const loadTime = Date.now() - startTime;

  // 停止性能监控
  const [coverage] = await Promise.all([
    page.coverage.stopJSCoverage(),
  ]);

  console.log('性能指标:');
  console.log(`  页面加载时间: ${loadTime}ms`);
  console.log(`  JS 函数数量: ${coverage.length}`);

  await browser.close();
  console.log('✅ 完成\n');
}

// 示例 5: PDF 导出
async function examplePDF() {
  console.log('\n📌 示例 5: PDF 导出');
  console.log('─'.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://example.com');

  const pdfPath = '/home/ubuntu/.openclaw/workspace/test-page.pdf';
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true
  });

  console.log(`PDF 已导出: ${pdfPath}`);

  await browser.close();
  console.log('✅ 完成\n');
}

// 主函数
async function main() {
  console.log('🎭 无头浏览器实用示例集合\n');

  try {
    await exampleSearch();
    await exampleForm();
    await exampleScrape();
    await examplePerformance();
    await examplePDF();

    console.log('─'.repeat(60));
    console.log('🎉 所有示例运行完成！\n');
  } catch (error) {
    console.error('❌ 运行失败:', error.message);
  }
}

// 运行示例
main();
