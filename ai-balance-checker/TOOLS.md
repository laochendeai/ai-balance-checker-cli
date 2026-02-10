# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## Coding Tools

### Codex CLI
- **配置文件：** ~/.codex/config.toml
- **模型：** gpt-5.2 (高推理强度 xhigh)
- **提供商：** crs (自定义)
- **API 端点：** http://47.237.11.85:3000/openai
- **认证密钥：** cr_1bf7d6c4f5d15e3aa6e823eed157e63d99fc0f1d30f5752326e4c77c07504fdb
- **个性：** pragmatic (务实型)
- **受信任项目：**
  - /home/ubuntu
  - /home/ubuntu/jjgz

### OpenCode
- **模型：** free 模型

### 使用要点
- **必须使用 pty:true** — coding agents 需要伪终端
- **Codex 需要 git 仓库** — 可在临时目录创建：`mktemp -d && cd $SCRATCH && git init`
- **常用命令：**
  - 单次执行：`codex exec "任务描述"`
  - 自动批准：`codex --full-auto "任务描述"`
  - 无沙盒：`codex --yolo "任务描述"` (最快但最危险)
