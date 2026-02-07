# AI Balance Checker

Lightweight CLI tool for checking account balances across multiple AI platforms.

## Features

✅ Multi-platform support (Qwen, Doubao, Kimi, DeepSeek, MiniMax, Zhipu AI)
✅ Bilingual interface (Chinese/English)
✅ Minimal dependencies (only axios)
✅ Lightweight design (small release size)
✅ Config file support
✅ Environment variable support
✅ Clear error messages
✅ Optional JSON / raw output for scripting & debugging

## Supported Platforms

| Platform | Name | Status |
|----------|------|--------|
| deepseek | DeepSeek | 🟢 Default endpoint + default parser |
| zhipu | 智谱AI | 🟡 Default endpoint (need `balancePath`) |
| kimi | Moonshot AI (Kimi) | 🟡 Need `balanceEndpoint` + `balancePath` |
| qwen | 通义千问 | 🟡 Need `balanceEndpoint` + `balancePath` |
| doubao | 豆包 | 🟡 Need `balanceEndpoint` + `balancePath` |
| minimax | MiniMax | 🟡 Need `balanceEndpoint` + `balancePath` |

## Installation

```bash
# Clone or download
git clone <repository-url>
cd ai-balance-checker

# Install dependencies
npm install

# Make executable (optional, for running as ./index.js)
chmod +x index.js

# Install CLI command (pick one)
# Option A (recommended for local dev): link to global bin
npm link
# Option B: install globally
# npm install -g .
```

### Troubleshooting: `ai-balance` command not found

If you already ran `npm link` / `npm install -g .` but still see `ai-balance: command not found`,
make sure your npm global bin directory is in `PATH`:

```bash
echo "$(npm config get prefix)/bin"
export PATH="$(npm config get prefix)/bin:$PATH"
```

## Configuration

### 1. Create config file

```bash
cp config.example.json config.json
```

### 2. Edit config.json

```json
{
  "platforms": {
    "deepseek": {
      "name": "DeepSeek",
      "apiKey": "your-deepseek-api-key",
      "balanceEndpoint": "https://api.deepseek.com/user/balance",
      "method": "GET",
      "auth": { "type": "bearer" },
      "balancePath": "balance_infos[0].total_balance",
      "currencyPath": "balance_infos[0].currency"
    }
  },
  "language": "zh"
}
```

### Config fields

- `balanceEndpoint`: platform API URL
- `method`: `GET` / `POST` (default: `GET`)
- `auth`:
  - `{ "type": "bearer" }` (default) → `Authorization: Bearer <apiKey>`
  - `{ "type": "header", "headerName": "X-Api-Key" }`
  - `{ "type": "none" }`
- `balancePath`: response JSON path (supports `a.b[0].c`)
- `currencyPath`: optional JSON path for currency (e.g. `balance_infos[0].currency`)

### 3. Or use environment variables

```bash
export AI_BALANCE_DEEPSEEK_API_KEY="your-key"

# Supported aliases:
export DEEPSEEK_API_KEY="your-key"
export ZHIPU_API_KEY="your-key"
export BIGMODEL_API_KEY="your-key"
export KIMI_API_KEY="your-key"
export MOONSHOT_API_KEY="your-key"
export DASHSCOPE_API_KEY="your-key"
export MINIMAX_API_KEY="your-key"
export DOUBAO_API_KEY="your-key"
```

## Usage

```bash
# Check all platforms
ai-balance check

# Check specific platform
ai-balance check --platform kimi

# Use custom config file
ai-balance check --config ~/.config.json

# Set language
ai-balance check --lang en

# Output JSON
ai-balance check --json

# Include raw response (debug)
ai-balance check --raw

# Show help
ai-balance --help
```

## Examples

```bash
$ ai-balance check
查询余额中...

$ ai-balance check --platform deepseek --json
{
  "timestamp": "2026-02-07T00:00:00.000Z",
  "language": "zh",
  "results": [
    {
      "platform": "deepseek",
      "name": "DeepSeek",
      "ok": true,
      "value": 0,
      "unit": null,
      "currency": "CNY"
    }
  ]
}

$ ai-balance check --lang en
Checking balance...

Success - DeepSeek: 0 CNY
```

## Development

### Add new platform support (no code needed)

1. Add a new platform entry in `config.example.json`
2. Fill `balanceEndpoint` + `auth` + `balancePath`
3. Run with `--raw` once to find the correct JSON path, then set `balancePath`

## API Endpoints

**Default:**
- DeepSeek: `https://api.deepseek.com/user/balance`
- Zhipu: `https://open.bigmodel.cn/api/paas/v4/usage`

**Config required:**
- Qwen / Doubao / Kimi / MiniMax: set `balanceEndpoint` + `balancePath` in your config

## File Size

- `package.json`: ~500 bytes
- `index.js`: ~17 KB
- `config.example.json`: ~1 KB
- **Total**: ~19 KB

## Dependencies

- axios: ^1.6.0 (HTTP client)

## License

MIT

## Author

Wangcai (旺财)

## Roadmap

- [x] Basic CLI structure
- [x] DeepSeek balance check
- [x] Config-driven balance extraction (`balancePath`)
- [x] `--json` / `--raw` output
- [ ] Balance history tracking
- [ ] Export to CSV/JSON
- [ ] Desktop GUI version
