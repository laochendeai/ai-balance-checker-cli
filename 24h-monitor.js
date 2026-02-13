#!/usr/bin/env node

/**
 * 24小时不间断赚钱监控系统
 *
 * - 自动运行AI任务平台脚本
 * - 监控Gateway状态
 * - 记录收入统计
 * - Telegram通知
 * - 异常报警
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const config = {
  // 监控间隔（毫秒）
  checkInterval: 30 * 60 * 1000,  // 30分钟

  // 工作目录
  workspace: '/home/ubuntu/.openclaw/workspace',

  // 日志文件
  logFile: '/home/ubuntu/.openclaw/workspace/logs/24h-monitor.log',

  // 统计文件
  statsFile: '/home/ubuntu/.openclaw/workspace/logs/income-stats.json',

  // Gateway最大运行时间（毫秒）
  gatewayMaxRuntime: 8 * 60 * 60 * 1000,  // 8小时

  // Telegram通知（可选）
  telegram: {
    enabled: false,
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
  }
};

// 日志函数
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  console.log(logMessage);

  // 写入日志文件
  const logEntry = data
    ? `${logMessage}\n${JSON.stringify(data, null, 2)}\n`
    : `${logMessage}\n`;

  fs.appendFileSync(config.logFile, logEntry, { flag: 'a' });
}

// Telegram通知
async function sendTelegramNotification(message) {
  if (!config.telegram.enabled || !config.telegram.botToken || !config.telegram.chatId) {
    return;
  }

  try {
    const { exec } = require('child_process');
    const command = `curl -s -X POST \
      "https://api.telegram.org/bot${config.telegram.botToken}/sendMessage" \
      -H "Content-Type: application/json" \
      -d '{"chat_id": "${config.telegram.chatId}", "text": "${message.replace(/"/g, '\\"')}"}'`;

    exec(command, (error) => {
      if (error) {
        log('WARN', 'Failed to send Telegram notification', { error: error.message });
      }
    });
  } catch (error) {
    log('WARN', 'Failed to send Telegram notification', { error: error.message });
  }
}

// 检查Gateway状态
async function checkGatewayStatus() {
  return new Promise((resolve) => {
    exec('openclaw gateway status', (error, stdout) => {
      if (error) {
        log('ERROR', 'Failed to check Gateway status', { error: error.message });
        resolve({ status: 'error', error: error.message });
        return;
      }

      // 解析输出
      const lines = stdout.split('\n');
      let pid = null;
      let runtime = null;
      let status = null;

      for (const line of lines) {
        const pidMatch = line.match(/pid (\d+)/);
        if (pidMatch) {
          pid = parseInt(pidMatch[1]);
        }

        const runtimeMatch = line.match(/state (\w+)/);
        if (runtimeMatch) {
          status = runtimeMatch[1];
        }
      }

      // 获取运行时间
      if (pid) {
        exec(`ps -p ${pid} -o etimes=`, (error, stdout) => {
          if (error) {
            log('WARN', 'Failed to get Gateway runtime', { error: error.message });
            resolve({ status, pid, runtime: null });
            return;
          }

          runtime = parseInt(stdout.trim()) * 1000; // 转换为毫秒
          resolve({ status, pid, runtime });
        });
      } else {
        resolve({ status, pid: null, runtime: null });
      }
    });
  });
}

// 运行OpenWork自动提交脚本
async function runOpenWorkBot() {
  log('INFO', '🤖 Running OpenWork AI bot...');

  return new Promise((resolve) => {
    const scriptPath = path.join(config.workspace, 'openwork-auto-bot');
    const command = `node ${scriptPath}/index-enhanced.js`;

    exec(command, { cwd: scriptPath }, (error, stdout, stderr) => {
      if (error) {
        log('ERROR', 'OpenWork bot failed', { error: error.message, stderr });
        resolve({ success: false, error: error.message });
        return;
      }

      log('INFO', '✅ OpenWork bot completed', { output: stdout });
      resolve({ success: true, output: stdout });
    });
  });
}

// 检查ClawTasks任务
async function checkClawTasks() {
  log('INFO', '🔍 Checking ClawTasks for available missions...');

  // TODO: 实现ClawTasks自动提交
  // 当前先记录日志，后续添加

  log('INFO', '✅ ClawTasks check completed (manual submission required)');
  return { success: true };
}

// 更新收入统计
function updateIncomeStats(source, amount, details = {}) {
  let stats = {};

  // 读取现有统计
  if (fs.existsSync(config.statsFile)) {
    try {
      stats = JSON.parse(fs.readFileSync(config.statsFile, 'utf8'));
    } catch (error) {
      log('WARN', 'Failed to read stats file, starting fresh', { error: error.message });
    }
  }

  // 初始化统计
  if (!stats[source]) {
    stats[source] = {
      total: 0,
      count: 0,
      history: []
    };
  }

  // 添加新记录
  stats[source].total += amount;
  stats[source].count += 1;
  stats[source].history.push({
    timestamp: new Date().toISOString(),
    amount,
    details
  });

  // 保留最近100条记录
  if (stats[source].history.length > 100) {
    stats[source].history = stats[source].history.slice(-100);
  }

  // 保存统计
  fs.writeFileSync(config.statsFile, JSON.stringify(stats, null, 2));

  log('INFO', `💰 Income stats updated`, {
    source,
    amount,
    total: stats[source].total,
    count: stats[source].count
  });
}

// 生成收入报告
function generateIncomeReport() {
  if (!fs.existsSync(config.statsFile)) {
    return 'No income data yet.';
  }

  const stats = JSON.parse(fs.readFileSync(config.statsFile, 'utf8'));

  let report = '📊 **24小时收入报告**\n\n';

  for (const [source, data] of Object.entries(stats)) {
    report += `**${source}**\n`;
    report += `- 总收入: ${data.total} tokens\n`;
    report += `- 任务数: ${data.count}\n`;
    report += `- 最近更新: ${data.history[data.history.length - 1]?.timestamp || 'N/A'}\n\n`;
  }

  const grandTotal = Object.values(stats).reduce((sum, s) => sum + s.total, 0);
  report += `**总收入: ${grandTotal} tokens**\n`;

  return report;
}

// 主循环
async function main() {
  log('INFO', '🚀 24小时不间断赚钱监控系统启动');

  let iteration = 0;

  while (true) {
    iteration++;

    log('INFO', `📍 开始第 ${iteration} 次检查`, {
      time: new Date().toISOString()
    });

    try {
      // 1. 检查Gateway状态
      log('INFO', '🔍 Checking Gateway status...');
      const gatewayStatus = await checkGatewayStatus();

      if (gatewayStatus.status === 'error') {
        log('ERROR', '⚠️ Gateway status check failed');
        await sendTelegramNotification('⚠️ Gateway status check failed!');
      } else if (gatewayStatus.runtime && gatewayStatus.runtime > config.gatewayMaxRuntime) {
        const runtimeHours = (gatewayStatus.runtime / (1000 * 60 * 60)).toFixed(1);
        log('WARN', `⚠️ Gateway running too long: ${runtimeHours} hours`);

        await sendTelegramNotification(
          `⚠️ Gateway running too long: ${runtimeHours} hours\n` +
          `Max allowed: ${config.gatewayMaxRuntime / (1000 * 60 * 60)} hours\n\n` +
          `Please restart: openclaw gateway restart`
        );
      } else {
        log('INFO', `✅ Gateway OK`, {
          status: gatewayStatus.status,
          runtime: gatewayStatus.runtime ? `${(gatewayStatus.runtime / 1000).toFixed(0)}s` : 'N/A'
        });
      }

      // 2. 运行OpenWork AI bot
      log('INFO', '🤖 Running OpenWork tasks...');
      const openworkResult = await runOpenWorkBot();

      if (openworkResult.success) {
        // 解析输出，提取收入信息
        // TODO: 从输出中解析实际收入
        log('INFO', '✅ OpenWork tasks completed');
      } else {
        log('WARN', '⚠️ OpenWork tasks failed');
      }

      // 3. 检查ClawTasks
      log('INFO', '🔍 Checking ClawTasks...');
      await checkClawTasks();

      // 4. 生成报告（每6次，约3小时）
      if (iteration % 6 === 0) {
        const report = generateIncomeReport();
        log('INFO', '📊 Income Report', { report });
        await sendTelegramNotification(report);
      }

      // 5. 等待下一次检查
      const waitTime = config.checkInterval / 1000 / 60; // 分钟
      log('INFO', `⏱️  Waiting ${waitTime} minutes until next check...`);

      await new Promise(resolve => setTimeout(resolve, config.checkInterval));

    } catch (error) {
      log('ERROR', '❌ Main loop error', { error: error.message, stack: error.stack });

      // 发送紧急通知
      await sendTelegramNotification(
        `🚨 24h Monitor Error: ${error.message}\n\n` +
        `Checking will continue...`
      );

      // 等待5分钟后重试
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
    }
  }
}

// 启动
main().catch(error => {
  log('ERROR', 'Fatal error', { error: error.message });
  process.exit(1);
});
