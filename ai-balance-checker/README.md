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

## Supported Platforms

| Platform | Name | Status |
|----------|------|--------|
| qwen | 通义千问 | 🟡 API endpoint needed |
| doubao | 豆包 | 🟡 API endpoint needed |
| kimi | Moonshot AI (Kimi) | 🟢 Implemented |
| deepseek | DeepSeek | 🟢 Implemented |
| minimax | MiniMax | 🟡 API endpoint needed |
| zhipu | 智谱AI | 🟡 API endpoint needed |

## Installation

```bash
# Clone or download
git clone <repository-url>
cd ai-balance-checker

# Install dependencies
npm install

# Make executable (optional)
chmod +x index.js
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
    "kimi": {
      "name": "Moonshot AI (Kimi)",
      "apiKey": "your-kimi-api-key",
      "balanceEndpoint": "https://api.moonshot.cn/v1/user/info",
      "unit": "tokens",
      "currency": "CNY"
    },
    "deepseek": {
      "name": "DeepSeek",
      "apiKey": "your-deepseek-api-key",
      "balanceEndpoint": "https://api.deepseek.com/user/balance",
      "unit": "tokens",
      "currency": "CNY"
    }
  },
  "language": "zh"
}
```

### 3. Or use environment variables

```bash
export KIMI_API_KEY="your-key"
export DEEPSEEK_API_KEY="your-key"
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

# Show help
ai-balance --help
```

## Examples

```bash
$ ai-balance check
查询余额中...

Success - Moonshot AI (Kimi): 1000000 tokens
Success - DeepSeek: 500000 tokens

Currency: CNY

$ ai-balance check --platform kimi
Checking balance...

Success - Moonshot AI (Kimi): 1000000 tokens

$ ai-balance check --lang en
Checking balance...

Success - Moonshot AI (Kimi): 1000000 tokens
```

## Development

### Add new platform support

1. Add platform config to `config.example.json`
2. Add API handler in `index.js`:

```javascript
yourPlatform: async (config) => {
  if (!config.platforms.yourPlatform.apiKey) {
    throw new Error(i18n[lang].noKey);
  }
  
  try {
    const response = await axios.get('your-api-endpoint', {
      headers: {
        'Authorization': `Bearer ${config.platforms.yourPlatform.apiKey}`
      }
    });
    return { balance: response.data.balance, unit: 'tokens' };
  } catch (error) {
    throw new Error(`API error: ${error.message}`);
  }
}
```

3. Update supported platforms table in README.md

## API Endpoints

**Implemented:**
- Kimi: `https://api.moonshot.cn/v1/user/info`
- DeepSeek: `https://api.deepseek.com/user/balance`

**Need implementation:**
- Qwen (通义千问): TBA
- Doubao: TBA
- MiniMax: TBA
- Zhipu AI: TBA

## File Size

- `package.json`: ~500 bytes
- `index.js`: ~7 KB
- `config.example.json`: ~1 KB
- **Total**: ~9 KB

## Dependencies

- axios: ^1.6.0 (HTTP client)

## License

MIT

## Author

Wangcai (旺财)

## Roadmap

- [x] Basic CLI structure
- [x] Kimi balance check
- [x] DeepSeek balance check
- [ ] Qwen API integration
- [ ] Doubao API integration
- [ ] MiniMax API integration
- [ ] Zhipu AI API integration
- [ ] Balance history tracking
- [ ] Export to CSV/JSON
- [ ] Desktop GUI version
