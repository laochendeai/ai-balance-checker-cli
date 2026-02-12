#!/usr/bin/env node

// OpenWork API 配置
const OPENWORK_AGENT_ID = 'a44a8129-0df7-4d84-a0d9-75262123db88';
const OPENWORK_API_KEY = 'ow_fe60237a70c932d4352e9de22d8664f9f0e66dd7dcb93e6c';

// ClawTasks API 配置
const CLAWTASKS_AGENT_ID = '4053d798-1088-4f36-b6e4-0df04e7e3a5a';
const CLAWTASKS_API_KEY = '-ChL5VG3NLshLTit2eShWsNNlHOg5heF';

async function checkOpenWorkTasks() {
  console.log('\n📊 OpenWork 任务状态');
  console.log('=' .repeat(50));

  try {
    // 获取已提交的任务
    const response = await fetch('https://openwork.bot/api/agents/submissions', {
      headers: {
        'Authorization': `Bearer ${OPENWORK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.submissions && data.submissions.length > 0) {
      console.log(`\n✅ 已提交任务总数: ${data.submissions.length}`);

      // 统计各状态任务
      const statusCounts = {};
      let totalTokens = 0;

      data.submissions.forEach(sub => {
        const status = sub.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        totalTokens += sub.reward || 0;
      });

      console.log('\n状态分布:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

      console.log(`\n💰 预期奖励总计: ${totalTokens} tokens`);

      // 显示最近的任务
      console.log('\n📋 最近提交的任务:');
      data.submissions.slice(0, 5).forEach((sub, index) => {
        console.log(`\n${index + 1}. ${sub.title || 'N/A'}`);
        console.log(`   状态: ${sub.status}`);
        console.log(`   奖励: ${sub.reward || 0} tokens`);
        console.log(`   提交时间: ${sub.submittedAt || 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  没有找到已提交的任务');
    }

  } catch (error) {
    console.error(`\n❌ 获取 OpenWork 任务失败: ${error.message}`);
  }
}

async function checkClawTasksStatus() {
  console.log('\n\n📊 ClawTasks 账户状态');
  console.log('=' .repeat(50));

  try {
    // 获取账户信息
    const agentResponse = await fetch('https://clawtasks.com/api/agents', {
      headers: {
        'Authorization': `Bearer ${CLAWTASKS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!agentResponse.ok) {
      throw new Error(`HTTP ${agentResponse.status}: ${agentResponse.statusText}`);
    }

    const agentData = await agentResponse.json();

    if (agentData.agent) {
      const agent = agentData.agent;
      console.log(`\n账户名: ${agent.name}`);
      console.log(`钱包地址: ${agent.wallet_address}`);
      console.log(`验证状态: ${agent.verified ? '✅ 已验证' : '❌ 未验证'}`);
      console.log(`声望: ${agent.reputation || 0}`);

      // 获取已提交的 proposals
      const proposalsResponse = await fetch('https://clawtasks.com/api/proposals', {
        headers: {
          'Authorization': `Bearer ${CLAWTASKS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (proposalsResponse.ok) {
        const proposalsData = await proposalsResponse.json();

        if (proposalsData.proposals && proposalsData.proposals.length > 0) {
          console.log(`\n✅ 已提交的提案: ${proposalsData.proposals.length}`);

          proposalsData.proposals.slice(0, 5).forEach((prop, index) => {
            console.log(`\n${index + 1}. ${prop.bounty_title || 'N/A'}`);
            console.log(`   状态: ${prop.status}`);
            console.log(`   奖励: ${prop.bounty_amount || 0} USDC`);
          });
        } else {
          console.log('\n⚠️  没有找到已提交的提案');
        }
      }

      // 获取可用的 bounties
      const bountiesResponse = await fetch('https://clawtasks.com/api/bounties?status=open', {
        headers: {
          'Authorization': `Bearer ${CLAWTASKS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (bountiesResponse.ok) {
        const bountiesData = await bountiesResponse.json();

        if (bountiesData.bounties && bountiesData.bounties.length > 0) {
          const freeBounties = bountiesData.bounties.filter(b => b.amount === 0);
          const paidBounties = bountiesData.bounties.filter(b => b.amount > 0);

          console.log(`\n📋 可用的免费任务: ${freeBounties.length}`);
          console.log(`💰 可用的付费任务: ${paidBounties.length}`);
        }
      }
    } else {
      console.log('\n⚠️  无法获取账户信息');
    }

  } catch (error) {
    console.error(`\n❌ 获取 ClawTasks 状态失败: ${error.message}`);
  }
}

async function main() {
  await checkOpenWorkTasks();
  await checkClawTasksStatus();
}

main().catch(console.error);
