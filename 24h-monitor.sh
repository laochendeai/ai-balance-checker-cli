#!/bin/bash
#
# 24小时监控系统运行脚本
# 用途：检查系统状态、跟踪收入、汇报进展
#

# 配置
LOG_DIR="$HOME/.openclaw/workspace/logs"
MEMORY_DIR="$HOME/.openclaw/workspace/memory"
HEARTBEAT_FILE="$HOME/.openclaw/workspace/HEARTBEAT.md"

# 创建日志目录（如果不存在）
mkdir -p "$LOG_DIR"
mkdir -p "$MEMORY_DIR"

# 函数：记录日志
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S UTC')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_DIR/24h-monitor.log"
}

# 函数：检查系统状态
check_system_status() {
    log "INFO" "开始系统状态检查..."

    # 检查 Gateway
    if pgrep -f "openclaw" > /dev/null 2>&1; then
        GATEWAY_PID=$(pgrep -f "openclaw" | awk '{print $1}')
        GATEWAY_STATUS="✅ 运行中 (PID: $GATEWAY_PID)"
    else
        GATEWAY_STATUS="❌ Gateway 未运行"
    fi

    # 检查磁盘空间
    DISK_USAGE=$(df -h / | awk '/dev\/root/ {print $5}' | cut -d'%' -f1)
    if [ "$DISK_USAGE" -gt 90 ]; then
        DISK_STATUS="⚠️ 磁盘空间不足 ($DISK_USAGE%)"
    else
        DISK_STATUS="✅ 磁盘空间正常 ($DISK_USAGE%)"
    fi

    # 检查内存使用
    MEM_TOTAL=$(free -h | awk '/Mem:/ {print $2}')
    MEM_USED=$(free -h | awk '/Mem:/ {print $3}')
    MEM_AVAILABLE=$(free -h | awk '/Mem:/ {print $7}')
    MEM_STATUS="✅ 内存使用 $MEM_USED / $MEM_TOTAL"

    # 检查 Git 状态
    if git status --short > /dev/null 2>&1; then
        GIT_STATUS="✅ Git 仓库有未提交的更改"
    else
        GIT_STATUS="✅ Git 仓库干净"
    fi

    # 汇总系统状态
    log "INFO" "系统状态汇总:"
    log "INFO" "  Gateway: $GATEWAY_STATUS"
    log "INFO" "  磁盘: $DISK_STATUS"
    log "INFO" "  内存: $MEM_STATUS"
    log "INFO" "  Git: $GIT_STATUS"
}

# 函数：检查项目状态
check_project_status() {
    log "INFO" "开始项目状态检查..."

    # 检查 QR Toolkit
    if curl -s -o /dev/null https://qr-toolkit.vercel.app/; then
        QR_STATUS="✅ QR Toolkit 在线"
    else
        QR_STATUS="❌ QR Toolkit 离线"
    fi

    # 检查 OpenWork API
    local openwork_api_key=$(cat "$HOME/.openclaw/workspace/openwork-auto-bot/config.json" | grep -oP '"apiKey":\s*"[^"]*"' | head -1)
    if [ -n "$openwork_api_key" ]; then
        # 测试 OpenWork API 连接
        if curl -s -X POST https://openwork.bot/api/missions -H "Authorization: Bearer $openwork_api_key" > /dev/null 2>&1; then
            OPENWORK_STATUS="✅ OpenWork API 可用"
        else
            OPENWORK_STATUS="❌ OpenWork API 不可用"
        fi
    else
        OPENWORK_STATUS="⚠️ OpenWork API Key 未配置"
    fi

    log "INFO" "项目状态汇总:"
    log "INFO" "  QR Toolkit: $QR_STATUS"
    log "INFO" "  OpenWork: $OPENWORK_STATUS"
}

# 函数：收入统计
calculate_income() {
    log "INFO" "开始收入统计..."

    # 读取昨日收入数据
    local yesterday=$(date -d "yesterday" '+%Y-%m-%d')
    local yesterday_file="$MEMORY_DIR/$yesterday.md"

    # 检查 ClawTasks 交易
    local clawtasks_income=$(cat "$MEMORY_DIR/clawtasks-transactions.md" 2>/dev/null | grep -oP "amount" | awk '{sum+=$1}' || echo "0")
    
    # 检查 OpenWork 收入
    local openwork_income=$(cat "$MEMORY_DIR/openwork-transactions.md" 2>/dev/null | grep -oP "amount" | awk '{sum+=$1}' || echo "0")
    
    # 检查 QR Toolkit AdSense 收入
    local adsense_income=$(cat "$MEMORY_DIR/adsense-income.md" 2>/dev/null | grep -oP "amount" | awk '{sum+=$1}' || echo "0")

    # 计算总收入
    local total_income=$((clawtasks_income + openwork_income + adsense_income))

    log "INFO" "收入统计汇总:"
    log "INFO" "  ClawTasks: \$${clawtasks_income}"
    log "INFO" "  OpenWork: \$${openwork_income}"
    log "INFO" "  AdSense: \$${adsense_income}"
    log "INFO" "  总收入: \$${total_income}"

    # 保存今日收入
    local today=$(date '+%Y-%m-%d')
    echo "# $today - 收入统计" > "$MEMORY_DIR/$today-income.md"
    echo "" >> "$MEMORY_DIR/$today-income.md"
    echo "## 当日收入" >> "$MEMORY_DIR/$today-income.md"
    echo "" >> "$MEMORY_DIR/$today-income.md"
    echo "- ClawTasks: \$${clawtasks_income}" >> "$MEMORY_DIR/$today-income.md"
    echo "- OpenWork: \$${openwork_income}" >> "$MEMORY_DIR/$today-income.md"
    echo "- AdSense: \$${adsense_income}" >> "$MEMORY_DIR/$today-income.md"
    echo "- 总收入: \$${total_income}" >> "$MEMORY_DIR/$today-income.md"
    echo "" >> "$MEMORY_DIR/$today-income.md"
    echo "## 累计收入" >> "$MEMORY_DIR/$today-income.md"
    echo "- 本周: \`计算中\`" >> "$MEMORY_DIR/$today-income.md"
    echo "- 本月: \`计算中\`" >> "$MEMORY_DIR/$today-income.md"
}

# 函数：生成日报
generate_daily_report() {
    local today=$(date '+%Y-%m-%d')
    local report_file="$MEMORY_DIR/$today-report.md"

    log "INFO" "生成日报: $report_file"

    cat > "$report_file" << EOF
# 24小时监控日报

**日期：** $today  
**生成时间：** $(date '+%Y-%m-%d %H:%M:%S UTC')

---

## 📊 系统状态

### 运行时间
- 上次检查：$(tail -20 "$LOG_DIR/24h-monitor.log" | grep "INFO" | tail -1 || echo "首次运行")
- 本次检查：$(date '+%Y-%m-%d %H:%M:%S UTC')

### Gateway 状态
$(pgrep -f "openclaw" > /dev/null 2>&1 && echo "- ✅ 运行中 (PID: $(pgrep -f "openclaw" | awk '{print $1}'))" || echo "- ❌ 未运行")

### 系统资源
- 磁盘: $(df -h / | awk '/dev\/root/ {print $5}')
- 内存: $(free -h | awk '/Mem:/ {print $3 "/" $2}')
- 负载: $(uptime | awk -F'load average:' '{print $2}' | awk '{print $1" " " $2" " " $3}')

---

## 📈 收入统计

### 今日收入
- ClawTasks: \`待统计\`
- OpenWork: \`待统计\`
- AdSense: \`待统计\`
- **总计:** \`待统计\`

### 本周/月累计
- 本周收入: \`计算中\`
- 本月收入: \`计算中\`

---

## 📋 任务完成情况

### 今日完成
- [ ] 24小时监控运行
- [ ] 系统状态检查
- [ ] 收入统计
- [ ] 日报生成

### 今日待办
- [ ] 检查 OpenWork 任务状态
- [ ] 完成 ClawTasks 任务
- [ ] QR Toolkit 推广执行

---

## 💰 目标进度

### 收入目标
- 今日目标: \$5
- 本周目标: \$50
- 本月目标: \$500

### 完成度
- 今日: \`0%\`
- 本周: \`0%\`
- 本月: \`0%\`

---

**报告生成时间：** $(date '+%Y-%m-%d %H:%M:%S UTC')

EOF

    log "INFO" "日报已生成: $report_file"
}

# 函数：更新 HEARTBEAT.md
update_heartbeat() {
    log "INFO" "更新 HEARTBEAT.md..."

    # 添加今日状态记录
    local today=$(date '+%Y-%m-%d')
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S UTC')
    
    # 在 HEARTBEAT.md 中添加今日状态
    if ! grep -q "$today" "$HEARTBEAT_FILE"; then
        echo "" >> "$HEARTBEAT_FILE"
        echo "### 📅 每日监控 - $today" >> "$HEARTBEAT_FILE"
        echo "" >> "$HEARTBEAT_FILE"
        echo "**检查时间：** $timestamp" >> "$HEARTBEAT_FILE"
        echo "- [ ] 24小时监控系统运行" >> "$HEARTBEAT_FILE"
        echo "- [ ] 系统状态检查" >> "$HEARTBEAT_FILE"
        echo "- [ ] 收入统计" >> "$HEARTBEAT_FILE"
        echo "- [ ] 日报生成" >> "$HEARTBEAT_FILE"
    fi
}

# 主执行流程
main() {
    log "INFO" "==================================="
    log "INFO" "24小时监控系统启动"
    log "INFO" "==================================="
    log "INFO" "开始执行监控任务..."

    # 1. 检查系统状态
    check_system_status
    
    # 2. 检查项目状态
    check_project_status
    
    # 3. 计算收入
    calculate_income
    
    # 4. 生成日报
    generate_daily_report
    
    # 5. 更新 HEARTBEAT.md
    update_heartbeat
    
    log "INFO" "==================================="
    log "INFO" "24小时监控系统完成"
    log "INFO" "==================================="
}

# 执行主函数
main
