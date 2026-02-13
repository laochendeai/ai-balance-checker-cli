# GLM API 配置说明

## 支持的 AI 提供商

OpenWork 增强脚本现在支持以下 AI 提供商：

1. **GLM (智谱AI)** - 推荐 ✅
2. OpenAI
3. Anthropic (Claude)

---

## GLM API 配置

### 1. 获取 API 密钥

1. 访问：https://open.bigmodel.cn/
2. 注册/登录账号
3. 进入控制台
4. 创建 API 密钥
5. 复制 API Key

### 2. 设置环境变量

在终端中运行以下命令（替换 `YOUR_API_KEY_HERE`）：

```bash
export GLM_API_KEY="YOUR_API_KEY_HERE"
```

### 3. 永久保存（推荐）

编辑你的 shell 配置文件：

```bash
# 如果使用 bash
echo 'export GLM_API_KEY="YOUR_API_KEY_HERE"' >> ~/.bashrc
source ~/.bashrc

# 如果使用 zsh
echo 'export GLM_API_KEY="YOUR_API_KEY_HERE"' >> ~/.zshrc
source ~/.zshrc
```

### 4. 验证配置

```bash
echo $GLM_API_KEY
```

应该显示你的 API Key。

---

## 使用 GLM 运行脚本

### 方式 1：直接运行

```bash
cd /home/ubuntu/.openclaw/workspace/openwork-auto-bot
node index-enhanced.js
```

### 方式 2：设置环境变量后运行

```bash
export GLM_API_KEY="YOUR_API_KEY_HERE"
cd /home/ubuntu/.openclaw/workspace/openwork-auto-bot
node index-enhanced.js
```

### 方式 3：单次设置（临时）

```bash
GLM_API_KEY="YOUR_API_KEY_HERE" node /home/ubuntu/.openclaw/workspace/openwork-auto-bot/index-enhanced.js
```

---

## 其他 AI 提供商配置

### OpenAI API

```bash
export OPENAI_API_KEY="YOUR_OPENAI_KEY"
```

### Anthropic (Claude) API

```bash
export ANTHROPIC_API_KEY="YOUR_ANTHROPIC_KEY"
```

---

## GLM API 参数

脚本使用以下 GLM 参数：

| 参数 | 值 | 说明 |
|------|-----|------|
| 模型 | glm-4 | 智谱 GLM-4 模型 |
| 最大 Token | 1000 | 输出长度限制 |
| 温度 | 0.7 | 创造性（0-2） |
| Base URL | https://open.bigmodel.cn/api/paas/v4 | API 端点 |

---

## 费用说明

GLM API 收费（参考，可能变动）：

- **glm-4**: 约 ¥0.1/1K tokens（输入） + ¥0.1/1K tokens（输出）
- 每个任务约消耗 500-1000 tokens
- 每个任务成本：约 ¥0.05-0.1

**预期成本：**
- 每天完成 10 个任务：¥0.5-1.0
- 每月完成 300 个任务：¥15-30

---

## 故障排除

### 问题 1：API Key 未设置

**错误信息：** `No AI provider available`

**解决方案：**
```bash
echo $GLM_API_KEY
```
检查是否有输出，如果没有，请重新设置环境变量。

### 问题 2：API 调用失败

**错误信息：** `GLM API failed`

**可能原因：**
1. API Key 错误
2. 账户余额不足
3. API 限流

**解决方案：**
1. 检查 API Key 是否正确
2. 登录 https://open.bigmodel.cn/ 检查余额
3. 减少并发调用

### 问题 3：生成内容质量低

**原因：** 温度参数设置

**解决方案：**
修改 `index-enhanced.js` 中的温度参数：
```javascript
temperature: 0.5  // 更保守，质量更高
```

---

## 测试连接

测试 GLM API 是否可用：

```bash
curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
  -H "Authorization: Bearer $GLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4",
    "messages": [
      {"role": "user", "content": "Hello, can you help me?"}
    ],
    "max_tokens": 100
  }'
```

如果返回正常响应，说明配置成功！

---

## 支持

如有问题，请检查：
1. 日志文件：`/home/ubuntu/.openclaw/workspace/openwork-auto-bot/logs/bot-enhanced.log`
2. GLM 文档：https://open.bigmodel.cn/dev/api

---

**配置完成后，脚本将优先使用 GLM API 生成任务内容！** 🚀
