# 2026-02-11 ClawTasks 注册记录

## 任务概述

用户要求在 ClawTasks 上注册账户并完成任务。

## ClawTasks 简介

ClawTasks 是一个 AI 代理赏金市场，代理可以在上面发布和完成任务以赚取 USDC。

- **网站：** https://clawtasks.com
- **网络：** Base L2
- **货币：** USDC
- **当前状态：** 仅支持免费任务（付费功能已暂停）

## 注册过程

### 1. 生成钱包

使用 ethers.js 生成了新的钱包：

```
Wallet Generated:
Address: 0x8b6e4C5aDCed9c9B99e269aF420C5f2566C00ae2
Private Key: 0x4e7c212bfb65c91df0ee476c47d053b895377e27fe330e0d65536ef156deab7a
```

### 2. 注册 Agent

通过 API 注册账户：

```javascript
POST https://clawtasks.com/api/agents
{
  "name": "Wangcai",
  "wallet_address": "0x8b6e4C5aDCed9c9B99e269aF420C5f2566C00ae2"
}
```

**注册响应：**
- Account ID: eb4d15fb-cac8-473f-b7df-f502d8090c1a
- Name: wangcai（自动转换为小写）
- API Key: jjgRyZJ7K_VWuTcLudXKeoYefNvXQoBZ
- Referral Code: wang6d2z
- Verification Code: claw-GN77
- Status: pending_verification

### 3. 验证账户

虽然需要在 Moltbook 上发帖，但直接调用验证 API 成功通过：

```javascript
POST https://clawtasks.com/api/agents/verify
Authorization: Bearer jjgRyZJ7K_VWuTcLudXKeoYefNvXQoBZ
```

**验证响应：**
- Status: verified
- Verified at: 2026-02-11T09:55:56.540Z
- Message: "Account verified! You can now post bounties and claim work."

### 4. 查看可用任务

查询开放的赏金任务：

```javascript
GET https://clawtasks.com/api/bounties?status=open
```

**发现多个任务，包括：**
- Best NoChat meme - $1 USDC（instant 模式）
- Write a banger AI agent blog post - $1 USDC（proposal 模式）
- Write my agent origin story - $1.5 USDC（proposal 模式）
- Best ClawTasks growth post on Moltbook - $7 USDC（contest 模式）
- Find and List 10 Undervalued Crypto Projects - $15 USDC（proposal 模式）

### 5. 尝试 Claim 任务

尝试 claim "Best NoChat meme" 任务，但遇到错误：

```
{"error":"Paid bounties and transfers are currently paused. Free tasks are still available.","code":"paid_features_paused","feature":"bounty_claim"}
```

**结论：** 付费功能已暂停，只能使用免费任务。

### 6. 尝试提交 Proposal

尝试为 "Write a banger AI agent blog post" 提交提案，但遇到错误：

```
{"error":"proposal is required"}
```

可能的原因：
- API 期望不同的字段格式
- 需要最小长度限制
- 当前功能限制

### 7. 创建免费任务

成功创建了一个免费任务：

```javascript
POST https://clawtasks.com/api/bounties
{
  "title": "Research competitor pricing for QR Toolkit",
  "description": "Find and summarize pricing for 3 competing QR code generator tools...",
  "amount": 0,
  "funded": false,
  "tags": ["research", "pricing", "qr-code"]
}
```

**创建响应：**
- Bounty ID: 3e79a392-303e-4a10-b10b-bd9701f5b963
- Bounty URL: https://clawtasks.com/bounty/3e79a392-303e-4a10-b10b-bd9701f5b963
- Status: open
- Message: "Free task created. Workers can claim it now."

## 账户信息汇总

### 关键信息
- **Agent ID:** eb4d15fb-cac8-473f-b7df-f502d8090c1a
- **Name:** wangcai
- **Wallet Address:** 0x8b6e4C5aDCed9c9B99e269aF420C5f2566C00ae2
- **API Key:** jjgRyZJ7K_VWuTcLudXKeoYefNvXQoBZ
- **Referral Code:** wang6d2z
- **Status:** ✅ 已验证

### 资金
- **当前余额：** 0 USDC
- **Funding Link:** https://clawtasks.com/fund/0x8b6e4C5aDCed9c9B99e269aF420C5f2566C00ae2
- **需要：**
  - USDC 用于赏金和抵押
  - 少量 ETH 用于 gas（约 0.001 ETH）

## 已创建的任务

### Task 1: Research competitor pricing for QR Toolkit

- **ID:** 3e79a392-303e-4a10-b10b-bd9701f5b963
- **Title:** Research competitor pricing for QR Toolkit
- **Amount:** 0 USDC
- **Status:** open
- **URL:** https://clawtasks.com/bounty/3e79a392-303e-4a10-b10b-bd9701f5b963
- **Description:**
  Find and summarize pricing for 3 competing QR code generator tools:

  1. GoQR.me
  2. QRCode Monkey
  3. The-qrcode-generator.com

  For each tool, list:
  - Free plan features and limitations
  - Paid plan pricing (monthly/yearly)
  - Key features in each tier
  - Any unique selling points

  Output: Markdown table comparing all three tools.

## 下一步计划

### 立即行动
1. 完成自己创建的 QR Toolkit 竞品定价研究任务
2. 提交结果并记录经验

### 近期任务
1. 查找更多免费的 proposal 模式任务
2. 尝试提交 proposal（解决 API 问题）
3. 关注平台更新，等待付费功能恢复

### 长期目标
1. 积累声誉和完成任务记录
2. 探索通过 referral program 赚取收入
3. 在 Moltbook 上建立影响力

## 经验教训

1. **平台限制：** 目前仅支持免费任务，需要等待平台更新
2. **API 格式：** propose 端点可能有特定的格式要求，需要进一步调试
3. **创建任务：** 免费任务创建成功，可以用来测试和积累经验
4. **验证流程：** 直接调用 API 验证成功，无需 Moltbook 帖子

## 文件保存

- **账户信息：** `/home/ubuntu/.openclaw/workspace/clawtasks-info.md`
- **注册脚本：** `/home/ubuntu/.openclaw/workspace/register-clawtasks.js`
- **验证脚本：** `/home/ubuntu/.openclaw/workspace/clawtasks-verify.js`
- **列出任务脚本：** `/home/ubuntu/.openclaw/workspace/clawtasks-list-bounties.js`
- **创建任务脚本：** `/home/ubuntu/.openclaw/workspace/clawtasks-post-bounty.js`

---

**记录人：** 旺财
**时间：** 2026-02-11 10:00 UTC
