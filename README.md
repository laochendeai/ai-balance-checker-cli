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
| deepseek | DeepSeek | 内置 `balance` endpoint + 字段路径 |
| kimi | Moonshot / Kimi | 内置 `balance` endpoint + 字段路径 |
| zhipu | 智谱AI | 内置 `usage` endpoint（字段路径需用 `--raw` 自行确认后配置） |
| qwen | 通义千问 | 需要自行配置（部分平台可能无公开“余额/用量”API，或需要 AK/SK 签名） |
| doubao | 豆包 | 需要自行配置（可能需要 AK/SK 签名） |
| minimax | MiniMax | 需要自行配置（可能需要 AK/SK 签名） |

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

### endpoint 是什么？

`endpoint` 就是「查询套餐/用量/余额」对应的 **接口 URL**。它和你平时调用模型的 `chat/completions` 之类接口不是一回事。

> 你填了 Key 但仍提示 “未配置 endpoint”，通常表示：该平台的账单/额度接口没有填（或该平台本身不提供可用的公开查询 API）。

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

### 快速配置（只填 API Key）

以下平台支持“只填 `apiKey` 即可查询（endpoint/path 自动内置）”：

- `deepseek`
- `kimi`
- `zhipu`

也就是说，这三个平台你可以不写 `metrics`，程序会自动使用内置查询配置。

### 配置兼容性（重要）

旧字段（如 `balanceEndpoint` / `balancePath` / `currencyPath`）不再支持，出现时会直接报错并提示迁移路径。

最小迁移目标示例：

```json
{
  "platforms": {
    "deepseek": {
      "metrics": {
        "balance": {
          "endpoint": "https://api.deepseek.com/user/balance",
          "fields": [{ "key": "balance", "path": "balance_infos[0].total_balance" }]
        }
      }
    }
  }
}
```

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

## `.env`（可选：不想用 export 时）

如果你不想在 shell 里 `export`，可以在运行目录创建 `.env` 文件（不要提交到仓库），例如：

```bash
DASHSCOPE_API_KEY="xxx"
DEEPSEEK_API_KEY="xxx"
MOONSHOT_API_KEY="xxx"
```

程序启动时会自动读取：
- `./.env`
- `~/.ai-balance-checker/.env`

并把里面的 `KEY=VALUE` 当作环境变量使用（不会覆盖已存在的系统环境变量）。

> 小结：不强制你用 `export`。你也可以直接把 `apiKey` 写在 `config.json` 里，但更推荐用 `.env`/环境变量管理密钥，避免误提交。

### 网络/代理（解决 Request timeout）

如果你遇到 `Request timeout`（尤其在 WSL/公司网络/代理环境），可以在 `.env` 里加入代理与网络参数：

```bash
# 代理（按你的实际端口修改）
HTTPS_PROXY="http://127.0.0.1:7890"
HTTP_PROXY="http://127.0.0.1:7890"
NO_PROXY="localhost,127.0.0.1"

# 如遇到 IPv6 网络异常导致超时，可强制走 IPv4
AI_BALANCE_FORCE_IPV4="1"

# 全局默认超时（毫秒），可按需增大
AI_BALANCE_TIMEOUT_MS="60000"
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

# 包含未配置 endpoint 的平台（默认会跳过）
ai-balance check --all

# 中文交互菜单
ai-balance menu
```

### 退出码（便于 CI）

- 只要有至少一个平台查询成功：退出码 `0`
- 所有平台都失败：退出码 `1`

## Windows 浮动窗口（置顶 + 托盘）

> `gui` 仅支持 Windows。Linux/WSL 下会提示改用 `ai-balance check` 或 `ai-balance check --json`。

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
