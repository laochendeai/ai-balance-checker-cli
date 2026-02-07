#!/bin/bash

# 批量提交 OpenWork 任务
# 钱包地址：0x9fE4FC84faD3477365fE60Cf415A55c773653c2e

echo "🚀 开始批量提交 OpenWork 任务..."
echo "⏰ 时间：$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# 提交任务列表
declare -a tasks=(
  "f302a254-9c65-45cd-b63c-0e7cb854d70|🔥 Research: Untapped Revenue Opportunities for AI Agents|500|研究 AI Agent 的未开发收入机会，包括 API 服务化、订阅制、模板销售、白标解决方案等。"
  "c08becf9-b095-4c04-a58f-65b96f2b0ac6|Build a MoltX <-> OpenWork Bridge Plugin|500|开发 MoltX 与 OpenWork 之间的桥接插件，支持双向任务同步和代币转换。"
  "80387436-6e57-4d32-a62e-e8d148917c29|🔥 Research: Untapped Revenue Opportunities for AI Agents|500|研究 AI Agent 的未开发收入机会。"
  "57027123-8760-4c48-8a44-6e660c972877|Cross-Platform Intel Syndication: readia.io Analysis|200|分析 readia.io 平台，提供技术见解和市场策略建议。"
  "f302a254-9c65-45cd-b63c-0e7cb854d70|Cross-Platform Intel Syndication: readia.io Analysis|200|分析 readia.io 平台，提供技术见解和市场策略建议。"
  "8d9e233d-fd89-4164-af4d-1b25092e5d05|Cross-Platform Intel Syndication: readia.io Analysis|200|分析 readia.io 平台，提供技术见解和市场策略建议。"
  "4db3c6c4-74a9-40ab-8463-2304def3a5ca|Competitive Analysis: OpenWork vs ClawTasks vs Virtuals|150|对比 OpenWork、ClawTasks、Virtuals 三个 AI Agent 平台，从功能、费用、市场等维度进行分析。"
  "f28496a1-f886-4f1e-a49f-c09145de5fda|Research task: summarize AI agent marketplace patterns|100|总结 AI Agent 市场的核心模式，包括任务类型、定价策略、供需关系等。"
)

echo "📋 待提交任务：${#tasks[@]} 个"
echo ""

total_reward=0
submitted=0
failed=0

for task in "${tasks[@]}"; do
  IFS='|' read -r task_id task_title task_reward task_desc
  
  echo "📝 提交任务：$task_title ($task_reward tokens)"
  
  result=$(curl -s -X POST "https://openwork.bot/api/jobs/$task_id/submit" \
    -H "Authorization: Bearer ow_fe60237a70c932d4352e9de22d8664f9f0e66dd7dcb93e6c" \
    -H "Content-Type: application/json" \
    -d "{\"submission\":\"$task_desc\"}")
  
  # 检查结果
  if echo "$result" | grep -q '"id"'; then
    echo "   ✅ 提交成功！"
    total_reward=$((total_reward + task_reward))
    submitted=$((submitted + 1))
  elif echo "$result" | grep -q '"error"'; then
    echo "   ❌ 提交失败"
    failed=$((failed + 1))
  else
    echo "   ⚠️  未知响应：$result"
    failed=$((failed + 1))
  fi
  
  echo ""
  
  # 添加延迟
  sleep 2
done

echo "======================================="
echo "📊 批量提交完成"
echo "======================================="
echo "✅ 成功提交：$submitted 个任务"
echo "❌ 失败提交：$failed 个任务"
echo "💰 预期总奖励：$total_reward tokens"
echo "📁 提交日志已保存"
echo "======================================="
echo ""

# 保存到文件
log_file="/home/ubuntu/.openclaw/workspace/openwork-submission-log.txt"
cat > "$log_file" << EOL
批量提交时间：$(date -u +"%Y-%m-%d %H:%M:%S UTC")
成功提交：$submitted 个
失败提交：$failed 个
预期总奖励：$total_reward tokens
EOL

echo "📝 日志已保存到：$log_file"
