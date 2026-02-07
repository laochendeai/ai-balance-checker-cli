# AI Balance Checker

Lightweight CLI + Windows floating window for showing **plan / token usage / balance** across multiple AI platforms.

## Features

✅ Multi-platform support (Qwen, Doubao, Kimi, DeepSeek, MiniMax, Zhipu AI)
✅ Bilingual interface (Chinese/English)
✅ Minimal dependencies (**no runtime deps**)
✅ Lightweight design (small release size)
✅ Config file support
✅ Environment variable support
✅ Clear error messages
✅ Optional JSON / raw output for scripting & debugging
✅ Chinese interactive menu (`ai-balance menu`)
✅ Windows GUI: floating topmost window + tray menu (`ai-balance gui`)
✅ Terminal spinner (marquee-style progress), disable with `--no-spinner`

## Supported Platforms

| Platform | Name | Status |
|----------|------|--------|
| deepseek | DeepSeek | 🟢 Default `balance` endpoint + fields |
| zhipu | 智谱AI | 🟡 Default `usage` endpoint (configure field paths) |
| kimi | Moonshot AI (Kimi) | 🟡 Configure endpoints + field paths |
| qwen | 通义千问 | 🟡 Configure endpoints + field paths |
| doubao | 豆包 | 🟡 Configure endpoints + field paths |
| minimax | MiniMax | 🟡 Configure endpoints + field paths |

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
      "auth": { "type": "bearer" },
      "metrics": {
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

### Config fields

- Platform-level:
  - `apiKey`
  - `auth`:
  - `{ "type": "bearer" }` (default) → `Authorization: Bearer <apiKey>`
  - `{ "type": "header", "headerName": "X-Api-Key" }`
  - `{ "type": "none" }`
- `metrics` (recommended):
  - Each metric has:
    - `endpoint`, `method`, `auth` (optional override), `headers`, `query`, `body`, `timeoutMs`
    - `fields`: array of `{ key, path, unit?, currency?, currencyPath? }`
  - Supported JSON path syntax: `a.b[0].c`

### Legacy config (still supported)

Old keys like `balanceEndpoint` / `balancePath` / `currencyPath` still work (treated as `metrics.balance`).

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

# Disable spinner/progress (CI / piping)
ai-balance check --no-spinner

# Chinese interactive menu
ai-balance menu

# Windows GUI (topmost window + tray)
ai-balance gui

# Show help
ai-balance --help
```

## Examples

```bash
$ ai-balance check
查询中...

$ ai-balance check --platform deepseek --json
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
            "balance": {
              "ok": true,
              "value": 0,
              "unit": null,
              "currency": "CNY"
            }
          }
        }
      }
    }
  ]
}

$ ai-balance check --lang en
Checking...

Success - DeepSeek
  [Balance] Balance: 0 CNY
```

## Development

### Add new platform support (no code needed)

1. Add a new platform entry in `config.example.json`
2. Fill `metrics.<plan|usage|balance>.endpoint`
3. Run once with `--raw` to inspect the response
4. Set each `fields[].path` (JSON path)

## API Endpoints

**Default:**
- DeepSeek: `https://api.deepseek.com/user/balance`
- Zhipu (usage): `https://open.bigmodel.cn/api/paas/v4/usage`

**Config required:**
- Qwen / Doubao / Kimi / MiniMax: set `metrics.*.endpoint` + `fields[].path` in your config

## Windows GUI

- Script version: `npm run gui:win` or `ai-balance gui`
- Build exe (requires `ps2exe`): `npm run build:win-exe`
- Pin to taskbar: right-click the generated `ai-balance-gui.exe` → Pin to taskbar

Note: GUI calls the CLI (`ai-balance check --json`) to fetch data.

## File Size

- `package.json`: ~500 bytes
- `index.js`: ~35 KB
- `config.example.json`: ~2 KB

## Dependencies

- None (uses Node built-in `http/https`)

## License

MIT

## Author

Wangcai (旺财)

## Roadmap

- [x] Basic CLI structure
- [x] DeepSeek balance check
- [x] Config-driven balance extraction (`balancePath`)
- [x] `--json` / `--raw` output
- [x] Multi-metric support (plan / usage / balance)
- [x] Chinese menu + spinner
- [x] Windows floating GUI + tray
- [ ] Balance history tracking
- [ ] Export to CSV/JSON
