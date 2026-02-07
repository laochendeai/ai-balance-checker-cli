# AI Balance Checker（AI 套餐/用量/余额查询器）

一个轻量级的 **CLI + Windows 浮动窗口** 工具，用于显示各 AI 平台的 **套餐（Plan）/ Token 用量（Usage）/ 余额（Balance）**。核心思路是「配置驱动」：你在 `config.json` 里填好接口与字段路径，程序负责请求与展示。

## 主要特性

- 多平台：Qwen / Doubao / Kimi / DeepSeek / MiniMax / 智谱等（可扩展）
- 中文/英文：默认中文
- CLI 跑马灯/进度提示：终端里更直观（可 `--no-spinner` 关闭）
- 中文交互菜单：`ai-balance menu`
- Windows 浮动小窗 + 托盘菜单：`ai-balance gui`（可置顶、锁定、定时刷新）
- 脚本 & exe 两种交付：脚本体积最小；exe 便于固定到任务栏
- 无运行时依赖：使用 Node.js 内置 `http/https`（不再依赖 axios）

## 支持的平台（示例）

| Key | 平台 | 说明 |
|---|---|---|
| deepseek | DeepSeek | 内置 `balance` 示例 endpoint + 字段路径 |
| zhipu | 智谱AI | 内置 `usage` endpoint（需配置字段路径） |
| kimi | Moonshot / Kimi | 需要配置 endpoint + 字段路径 |
| qwen | 通义千问 | 需要配置 endpoint + 字段路径 |
| doubao | 豆包 | 需要配置 endpoint + 字段路径 |
| minimax | MiniMax | 需要配置 endpoint + 字段路径 |

> 说明：不同平台/账号的「套餐/用量/余额」字段名可能不同，本项目不硬编码解析规则，推荐通过 `--raw` 拿到返回 JSON 后再填 `path`。

## 安装

```bash
git clone <repository-url>
cd ai-balance-checker

npm install

# 可选：直接 ./index.js 运行
chmod +x index.js

# 安装命令（任选其一）
npm link
# 或
# npm install -g .
```

### 常见问题：`ai-balance` 找不到

如果 `npm link` / `npm i -g .` 之后仍提示 `command not found`，请确保 npm 全局 bin 已加入 PATH：

```bash
echo "$(npm config get prefix)/bin"
export PATH="$(npm config get prefix)/bin:$PATH"
```

## 配置（config.json）

### 1) 创建配置文件

```bash
cp config.example.json config.json
```

### 2) 推荐配置结构：`metrics`（套餐/用量/余额）

```json
{
  "platforms": {
    "deepseek": {
      "name": "DeepSeek",
      "apiKey": "your-key",
      "auth": { "type": "bearer" },
      "metrics": {
        "plan": {
          "endpoint": "",
          "method": "GET",
          "fields": [{ "key": "plan_name", "path": "" }]
        },
        "usage": {
          "endpoint": "",
          "method": "GET",
          "fields": [
            { "key": "used_tokens", "path": "", "unit": "tokens" },
            { "key": "limit_tokens", "path": "", "unit": "tokens" },
            { "key": "remain_tokens", "path": "", "unit": "tokens" },
            { "key": "period", "path": "" }
          ]
        },
        "balance": {
          "endpoint": "https://api.deepseek.com/user/balance",
          "method": "GET",
          "fields": [
            {
              "key": "balance",
              "path": "balance_infos[0].total_balance",
              "currencyPath": "balance_infos[0].currency"
            }
          ]
        }
      }
    }
  },
  "language": "zh"
}
```

### 字段说明（核心）

- 平台级：
  - `apiKey`
  - `auth`：
    - `{ "type": "bearer" }` → `Authorization: Bearer <apiKey>`
    - `{ "type": "header", "headerName": "X-Api-Key" }`
    - `{ "type": "none" }`
- `metrics`：
  - 每个 metric（如 `plan/usage/balance`）可配置：
    - `endpoint`, `method`, `auth`（可覆盖平台级）, `headers`, `query`, `body`, `timeoutMs`
    - `fields`: `{ key, path, unit?, currency?, currencyPath? }[]`
- `path` 支持 JSON 路径：`a.b[0].c` / `$.a.b[0].c`

### 旧版配置（仍兼容）

老版本使用 `balanceEndpoint` / `balancePath` / `currencyPath` 的配置仍可用（会被当作 `metrics.balance` 处理）。建议逐步迁移到 `metrics`，以支持「套餐/用量/余额」三类信息。

## 环境变量（覆盖 apiKey）

```bash
export AI_BALANCE_DEEPSEEK_API_KEY="your-key"

# 常见别名：
export DEEPSEEK_API_KEY="your-key"
export ZHIPU_API_KEY="your-key"
export BIGMODEL_API_KEY="your-key"
export KIMI_API_KEY="your-key"
export MOONSHOT_API_KEY="your-key"
export DASHSCOPE_API_KEY="your-key"
export MINIMAX_API_KEY="your-key"
export DOUBAO_API_KEY="your-key"
```

## 使用方法（CLI）

```bash
# 查询所有平台
ai-balance check

# 查询指定平台
ai-balance check --platform deepseek

# 指定配置文件
ai-balance check --config ~/.config.json

# 语言
ai-balance check --lang en

# 机器可读 JSON
ai-balance check --json

# 输出原始响应（调试 path 用）
ai-balance check --raw

# 关闭跑马灯/进度提示（适合重定向/CI）
ai-balance check --no-spinner

# 中文交互菜单
ai-balance menu
```

## Windows 浮动窗口（置顶 + 托盘）

### 启动

```powershell
ai-balance gui
# 或
npm run gui:win
```

GUI 会调用 CLI 获取数据（本机需要已安装 Node.js，并且能运行 `ai-balance` 或仓库内 `index.js`）。

### 配置文件位置

GUI 会按顺序尝试：
1. 启动参数 `-Config <path>`
2. 仓库根目录 `config.json`
3. 当前目录 `config.json`
4. `%USERPROFILE%\.ai-balance-checker\config.json`

### 生成 exe（便于固定到任务栏）

需要安装 PowerShell 模块 `ps2exe`：

```powershell
Install-Module ps2exe -Scope CurrentUser
npm run build:win-exe
```

生成文件：`dist/windows/ai-balance-gui.exe`  
固定到任务栏：右键 exe → “固定到任务栏”。

## 输出示例（JSON）

```json
{
  "timestamp": "2026-02-07T00:00:00.000Z",
  "language": "zh",
  "results": [
    {
      "platform": "deepseek",
      "name": "DeepSeek",
      "ok": true,
      "metrics": {
        "balance": {
          "ok": true,
          "fields": {
            "balance": { "ok": true, "value": 0, "unit": null, "currency": "CNY" }
          }
        }
      }
    }
  ]
}
```

## 无需改代码扩展平台（推荐流程）

1. 在 `config.json` 增加平台项与 `metrics.*.endpoint`
2. 先跑一次 `ai-balance check --platform <key> --raw` 拿到返回 JSON
3. 把需要展示的字段填到 `fields[].path`（`a.b[0].c`）

## License

MIT
