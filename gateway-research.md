# OpenClaw Gateway 持续运行研究

## 研究目标

如何确保 OpenClaw Gateway 长期稳定运行，避免因长时间运行导致的问题。

---

## 当前运行机制

### Gateway 重启方式

#### 1. 内部重启（SIGUSR1 信号）
- **命令：** `gateway restart` 或 `openclaw gateway restart`
- **机制：** 发送 SIGUSR1 信号，触发内部重启
- **效果：** 进程 ID 不变，重新加载配置和子系统
- **优点：** 快速，不中断服务
- **缺点：** 不清理进程状态，长期运行可能积累问题

#### 2. 系统重启（systemctl）
- **命令：** `systemctl --user restart openclaw-gateway.service`
- **机制：** 完全杀死旧进程，启动新进程
- **效果：** 进程 ID 改变，完全清理状态
- **优点：** 彻底清理，避免长期运行问题
- **缺点：** 会短暂中断服务（通常 < 30 秒）

### Systemd 配置

```ini
Restart=always              # 进程退出时自动重启
RestartMode=normal           # 正常重启模式
RestartPreventExitStatus=    # 不阻止任何退出状态
```

**说明：** systemd 会在进程退出时自动重启，但内部重启（SIGUSR1）不会触发 systemd 重启。

---

## 问题分析

### 观察到的问题

1. **长时间运行：** Gateway 进程已运行超过 24 小时
2. **内部重启不生效：** 多次发送 SIGUSR1 后，进程 ID 保持不变
3. **需要手动重启：** 需要手动执行 `systemctl --user restart` 才能真正重启

### 可能的原因

1. **内存泄漏：** Node.js 应用长期运行可能积累未释放的内存
2. **连接池耗尽：** WebSocket 连接可能未正确关闭
3. **文件描述符泄露：** 未正确关闭的文件句柄
4. **状态累积：** 内存中的会话状态、缓存等不断累积

---

## 解决方案

### 方案 1：定时完全重启（推荐）

使用 OpenClaw Cron Job 定期重启 gateway。

**优点：**
- 自动化，无需人工干预
- 彻底清理状态
- 可配置重启间隔

**缺点：**
- 会短暂中断服务（通常 < 30 秒）
- 可能在任务进行中重启

**推荐配置：**
- **间隔：** 每 6-8 小时
- **重启方式：** systemctl restart
- **最佳时机：** 低峰期（如 UTC 04:00, 12:00, 20:00）

### 方案 2：健康检查 + 自动重启

创建监控脚本，定期检查 gateway 状态，发现异常时自动重启。

**优点：**
- 按需重启，减少不必要的中断
- 可检测更多异常情况

**缺点：**
- 需要额外的监控逻辑
- 可能错过某些隐性问题

### 方案 3：混合方案（最佳）

结合定时重启和健康检查：
- 每 8 小时定时完全重启
- 每 30 分钟健康检查
- 发现异常时立即重启

---

## 实施计划

### 立即实施

1. **创建定时重启 Cron Job**
   - 每 8 小时自动重启 gateway
   - 使用 systemctl restart

2. **创建健康检查脚本**
   - 检查 gateway 响应
   - 检查内存使用
   - 检查进程状态

### 后续优化

1. **监控指标**
   - 内存使用趋势
   - 连接数
   - 响应时间

2. **智能调度**
   - 根据负载动态调整重启间隔
   - 在空闲时段重启

3. **告警机制**
   - 重启失败时通知
   - 异常指标时告警

---

## 推荐配置

### Cron Job 配置（每 8 小时重启）

```json
{
  "id": "gateway-restart-8h",
  "name": "Gateway 定时重启（每 8 小时）",
  "enabled": true,
  "schedule": {
    "kind": "cron",
    "expr": "0 */8 * * *",
    "tz": "UTC"
  },
  "sessionTarget": "main",
  "payload": {
    "kind": "systemEvent",
    "text": "🔄 Gateway 定时重启提醒\n\n执行以下命令重启 gateway：\n\nsystemctl --user restart openclaw-gateway.service\n\n等待 30 秒后检查状态：\nopenclaw gateway status"
  }
}
```

### 健康检查脚本

```bash
#!/bin/bash
# gateway-health-check.sh

GATEWAY_STATUS=$(openclaw gateway status 2>&1)
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f%%", $3/$2 * 100}')
PROCESS_AGE=$(ps -p $(pgrep -f openclaw-gateway) -o etime= | tr -d ' ')

# 转换运行时间为小时数
if [[ $PROCESS_AGE == *"-"* ]]; then
    DAYS=${PROCESS_AGE%-*}
    HOURS=${PROCESS_AGE#*-}
    HOURS_TOTAL=$((DAYS * 24 + HOURS))
else
    HOURS_TOTAL=${PROCESS_AGE%%:*}
fi

# 检查条件
if [[ $HOURS_TOTAL -gt 8 ]]; then
    echo "⚠️ Gateway 运行时间过长（$HOURS_TOTAL 小时），建议重启"
    echo "systemctl --user restart openclaw-gateway.service"
fi

if [[ $MEMORY_USAGE -gt 90 ]]; then
    echo "⚠️ 内存使用过高（$MEMORY_USAGE），建议重启"
    echo "systemctl --user restart openclaw-gateway.service"
fi

if ! echo "$GATEWAY_STATUS" | grep -q "running.*active"; then
    echo "❌ Gateway 状态异常，正在重启"
    systemctl --user restart openclaw-gateway.service
fi
```

---

## 最佳实践

### 1. 定期重启频率

| 环境类型 | 推荐间隔 | 说明 |
|---------|---------|------|
| **生产环境** | 每 8-12 小时 | 平衡稳定性和可用性 |
| **开发环境** | 每 4-6 小时 | 快速迭代测试 |
| **高负载** | 每 6 小时 | 防止资源积累 |
| **低负载** | 每 12-24 小时 | 减少中断 |

### 2. 重启时机选择

- **低峰期：** 选择流量较低的时间段
- **避免：** 重要任务执行期间
- **通知：** 重启前发送通知（可选）

### 3. 监控指标

- **进程运行时间：** 超过阈值时告警
- **内存使用：** 超过 80% 时告警
- **响应时间：** 超过 5 秒时告警
- **连接数：** 异常增长时告警

---

## 总结

### 关键发现

1. **内部重启不彻底：** SIGUSR1 信号不清理进程状态
2. **需要完全重启：** 长期运行必须定期完全重启
3. **Systemd 自动恢复：** 进程退出后会自动重启

### 推荐方案

**混合方案：定时重启 + 健康检查**

1. 每 8 小时定时完全重启
2. 每 30 分钟健康检查
3. 发现异常立即重启

### 实施步骤

1. ✅ 创建定时重启 Cron Job
2. ⏳ 创建健康检查脚本
3. ⏳ 设置告警通知
4. ⏳ 监控和优化

---

**研究人：** 旺财
**时间：** 2026-02-12 12:30 UTC
**状态：** 研究完成，待实施
