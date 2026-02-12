#!/bin/bash
# Gateway Health Check Script
# 检查 Gateway 状态，发现异常时建议重启

set -e

# 颜色定义
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# 获取 Gateway PID
GATEWAY_PID=$(pgrep -f "openclaw-gateway" | head -1)

if [ -z "$GATEWAY_PID" ]; then
    echo -e "${RED}❌ Gateway 进程未运行${NC}"
    echo "启动命令：systemctl --user start openclaw-gateway.service"
    exit 1
fi

# 获取进程运行时间
PROCESS_ELAPSED=$(ps -p $GATEWAY_PID -o etime= | tr -d ' ')

# 转换运行时间为小时数
if [[ $PROCESS_ELAPSED == *"-"* ]]; then
    # 格式：DD-HH:MM:SS
    DAYS=${PROCESS_ELAPSED%-*}
    TIME_PART=${PROCESS_ELAPSED#*-}
    HOURS_PART=${TIME_PART%%:*}
    HOURS_TOTAL=$((DAYS * 24 + 10#$HOURS_PART))
elif [[ $PROCESS_ELAPSED == *":"* ]]; then
    # 格式：HH:MM:SS
    HOURS_PART=${PROCESS_ELAPSED%%:*}
    HOURS_TOTAL=$((10#$HOURS_PART))
else
    # 格式：MM:SS 或其他
    HOURS_TOTAL=0
fi

# 获取 Gateway 状态
GATEWAY_STATUS=$(openclaw gateway status 2>&1 || true)
IS_RUNNING=$(echo "$GATEWAY_STATUS" | grep -c "running.*active" || true)

# 获取内存使用
MEMORY_INFO=$(free -h | grep "Mem:" | awk '{print $3 "/" $2 " (" int($3/$2*100) "%)"}')

# 获取 CPU 使用
CPU_USAGE=$(ps -p $GATEWAY_PID -o %cpu= | tr -d ' ')

# 获取内存占用（MB）
MEMORY_MB=$(ps -p $GATEWAY_PID -o rss= | awk '{print int($1/1024)}')

# 获取磁盘空间
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')

echo "📊 Gateway 健康检查报告"
echo "====================================="
echo ""
echo "🕐 运行时间: $PROCESS_ELAPSED ($HOURS_TOTAL 小时)"
echo "💾 内存使用: $MEMORY_MB MB"
echo "🔢 CPU 使用: ${CPU_USAGE}%"
echo "💿 磁盘使用: ${DISK_USAGE}%"
echo "📦 系统内存: $MEMORY_INFO"
echo ""

# 检查是否需要重启
NEED_RESTART=false
REASON=""

if [ $HOURS_TOTAL -gt 8 ]; then
    NEED_RESTART=true
    REASON="${REASON}运行时间过长 (${HOURS_TOTAL}h > 8h)\n"
fi

if [ $MEMORY_MB -gt 2048 ]; then
    NEED_RESTART=true
    REASON="${REASON}内存占用过高 (${MEMORY_MB}MB > 2GB)\n"
fi

if [ $DISK_USAGE -gt 90 ]; then
    NEED_RESTART=true
    REASON="${REASON}磁盘空间不足 (${DISK_USAGE}% > 90%)\n"
fi

if [ $IS_RUNNING -eq 0 ]; then
    NEED_RESTART=true
    REASON="${REASON}Gateway 状态异常\n"
fi

if [ "$NEED_RESTART" = true ]; then
    echo -e "${YELLOW}⚠️  发现以下问题：${NC}"
    echo -e "$REASON"
    echo ""
    echo -e "${YELLOW}建议执行：${NC}"
    echo "  systemctl --user restart openclaw-gateway.service"
    echo ""
    echo "等待 30 秒后检查状态："
    echo "  openclaw gateway status"
    echo ""
    echo -e "${RED}或者，手动执行内部重启（不完全重启）：${NC}"
    echo "  openclaw gateway restart"
else
    echo -e "${GREEN}✅ Gateway 运行正常，无需重启${NC}"
    echo ""
    echo "下次重启建议时间：$((8 - HOURS_TOTAL)) 小时后"
fi

echo ""
echo "====================================="
echo "检查时间: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "检查人: 旺财"
