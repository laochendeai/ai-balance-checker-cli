param(
  [string]$Config,
  [string]$Platform,
  [ValidateSet('zh', 'en')]
  [string]$Lang = 'zh'
)

$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
  Write-Error 'This GUI is Windows-only.'
  exit 1
}

function Restart-InStaIfNeeded {
  try {
    if ([System.Threading.Thread]::CurrentThread.ApartmentState -eq 'STA') { return }
  } catch {
    return
  }

  $argsList = @(
    '-Sta',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $PSCommandPath
  )
  if ($Config) { $argsList += @('-Config', $Config) }
  if ($Platform) { $argsList += @('-Platform', $Platform) }
  if ($Lang) { $argsList += @('-Lang', $Lang) }

  $exe = $null
  if (Get-Command pwsh -ErrorAction SilentlyContinue) { $exe = 'pwsh' }
  elseif (Get-Command powershell -ErrorAction SilentlyContinue) { $exe = 'powershell' }

  if (-not $exe) {
    Write-Error 'PowerShell executable not found.'
    exit 1
  }

  Start-Process -FilePath $exe -ArgumentList $argsList | Out-Null
  exit 0
}

Restart-InStaIfNeeded

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Resolve-ConfigPath([string]$ConfigArg) {
  $candidates = @()
  if ($ConfigArg) { $candidates += $ConfigArg }

  # repo root (script is in ./windows)
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $candidates += (Join-Path $repoRoot 'config.json')

  # current directory
  $candidates += (Join-Path (Get-Location) 'config.json')

  # home config
  $homeDir = $env:USERPROFILE
  if ($homeDir) { $candidates += (Join-Path $homeDir '.ai-balance-checker\config.json') }

  foreach ($p in $candidates) {
    if ($p -and (Test-Path $p)) { return (Resolve-Path $p).Path }
  }

  return $null
}

function Read-JsonFile([string]$Path) {
  if (-not $Path) { return $null }
  if (-not (Test-Path $Path)) { return $null }
  $raw = Get-Content -Raw -Path $Path
  if (-not $raw) { return $null }
  return $raw | ConvertFrom-Json
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Path $Path | Out-Null }
}

function Save-JsonFile([string]$Path, $Obj) {
  $dir = Split-Path -Parent $Path
  if ($dir) { Ensure-Dir $dir }
  ($Obj | ConvertTo-Json -Depth 10) | Set-Content -Path $Path -Encoding UTF8
}

$configPath = Resolve-ConfigPath $Config
if (-not $configPath) {
  [System.Windows.MessageBox]::Show('config.json not found. Copy config.example.json to config.json and add your API keys.', 'AI Balance GUI') | Out-Null
  exit 1
}

$configObj = Read-JsonFile $configPath
if (-not $configObj -or -not $configObj.platforms) {
  [System.Windows.MessageBox]::Show("Invalid config: $configPath", 'AI Balance GUI') | Out-Null
  exit 1
}

$platformKeys = @($configObj.platforms.PSObject.Properties.Name)
if ($platformKeys.Count -eq 0) {
  [System.Windows.MessageBox]::Show('No platforms found in config.', 'AI Balance GUI') | Out-Null
  exit 1
}

# Determine how to invoke CLI: prefer global ai-balance, else fall back to repo-local node index.js
$cliExe = $null
$cliPrefix = @()
if (Get-Command ai-balance -ErrorAction SilentlyContinue) {
  $cliExe = 'ai-balance'
} else {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $indexJs = Join-Path $repoRoot 'index.js'
  if (Test-Path $indexJs) {
    $cliExe = 'node'
    $cliPrefix = @($indexJs)
  }
}

if (-not $cliExe) {
  [System.Windows.MessageBox]::Show('Cannot find ai-balance command (npm link / npm i -g .) or local index.js.', 'AI Balance GUI') | Out-Null
  exit 1
}

$appDir = Join-Path $env:APPDATA 'ai-balance-checker'
$settingsPath = Join-Path $appDir 'gui.json'
Ensure-Dir $appDir

$settings = Read-JsonFile $settingsPath
if (-not $settings) {
  $settings = [pscustomobject]@{
    topmost = $true
    locked = $false
    intervalSec = 60
    platform = $null
    left = $null
    top = $null
    width = 340
    height = 220
  }
}

if (-not $Platform -and $settings.platform) { $Platform = [string]$settings.platform }
if (-not $Platform) { $Platform = [string]$platformKeys[0] }

function Get-PlatformDisplayName([string]$key) {
  try {
    $name = $configObj.platforms.$key.name
    if ($name) { return [string]$name }
  } catch {}
  return $key
}

function Invoke-AiBalance([string]$platformKey) {
  $args = @()
  if ($configPath) { $args += @('--config', $configPath) }
  $args += @('check', '--json', '--platform', $platformKey, '--lang', $Lang, '--no-spinner')
  $out = & $cliExe @cliPrefix @args 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw $out.Trim() }
  try {
    return $out | ConvertFrom-Json
  } catch {
    throw "Invalid JSON from cli: $out"
  }
}

function TryGetField($metrics, [string]$metricId, [string]$fieldKey) {
  if (-not $metrics) { return $null }
  $m = $metrics.$metricId
  if (-not $m -or $m.ok -ne $true) { return $null }
  $f = $m.fields.$fieldKey
  if (-not $f -or $f.ok -ne $true) { return $null }
  return $f
}

function FormatFieldValue($field) {
  if (-not $field) { return 'N/A' }
  $value = $field.value
  if ($null -eq $value -or $value -eq '') { return 'N/A' }
  $pieces = @([string]$value)
  if ($field.unit) { $pieces += [string]$field.unit }
  if ($field.currency -and (-not $field.unit -or ([string]$field.unit).ToUpperInvariant() -ne ([string]$field.currency).ToUpperInvariant())) {
    $pieces += [string]$field.currency
  }
  return ($pieces -join ' ')
}

function BuildDisplayText($platformResult) {
  $lines = @()
  $metrics = $platformResult.metrics

  $plan = TryGetField $metrics 'plan' 'plan_name'
  if ($plan) { $lines += ($(if ($Lang -eq 'zh') { '套餐' } else { 'Plan' }) + ": " + (FormatFieldValue $plan)) }

  $used = TryGetField $metrics 'usage' 'used_tokens'
  $limit = TryGetField $metrics 'usage' 'limit_tokens'
  $remain = TryGetField $metrics 'usage' 'remain_tokens'
  $period = TryGetField $metrics 'usage' 'period'

  if ($used -or $limit -or $remain -or $period) {
    $usageLabel = $(if ($Lang -eq 'zh') { '用量' } else { 'Usage' })
    $usageText = @()
    if ($used -and $limit) { $usageText += ("{0}/{1}" -f (FormatFieldValue $used), (FormatFieldValue $limit)) }
    elseif ($used) { $usageText += (FormatFieldValue $used) }
    if ($remain) { $usageText += ($(if ($Lang -eq 'zh') { '剩余' } else { 'Remaining' }) + " " + (FormatFieldValue $remain)) }
    if ($period) { $usageText += ($(if ($Lang -eq 'zh') { '周期' } else { 'Period' }) + " " + (FormatFieldValue $period)) }
    $lines += ($usageLabel + ": " + ($usageText -join ' | '))
  }

  $balance = TryGetField $metrics 'balance' 'balance'
  if ($balance) {
    $lines += ($(if ($Lang -eq 'zh') { '余额' } else { 'Balance' }) + ": " + (FormatFieldValue $balance))
  }

  if ($lines.Count -gt 0) { return ($lines -join "`n") }

  # Fallback: dump all extracted fields
  if ($metrics) {
    foreach ($metricProp in $metrics.PSObject.Properties) {
      $m = $metricProp.Value
      if (-not $m) { continue }
      $lines += ("[{0}]" -f $metricProp.Name)
      if ($m.ok -ne $true) {
        $lines += ("ERROR: {0}" -f $m.error)
        continue
      }
      foreach ($fieldProp in $m.fields.PSObject.Properties) {
        $lines += ("{0}: {1}" -f $fieldProp.Name, (FormatFieldValue $fieldProp.Value))
      }
    }
    return ($lines -join "`n")
  }

  return 'N/A'
}

$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="AI Balance"
        Width="340" Height="220"
        Topmost="True"
        ResizeMode="CanResizeWithGrip"
        WindowStartupLocation="Manual">
  <Grid Margin="10">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>

    <DockPanel Grid.Row="0" LastChildFill="False">
      <TextBlock Name="PlatformLabel" Text="Platform:" VerticalAlignment="Center" Margin="0,0,6,0"/>
      <ComboBox Name="PlatformCombo" Width="210" />
      <Button Name="RefreshButton" Content="Refresh" Margin="6,0,0,0" Width="80"/>
    </DockPanel>

    <TextBlock Name="StatusText" Grid.Row="1" Margin="0,8,0,0" Foreground="Gray" Text="Ready"/>

    <TextBlock Name="MainText" Grid.Row="2" Margin="0,8,0,0" TextWrapping="Wrap" FontFamily="Consolas" />

    <DockPanel Grid.Row="3" Margin="0,10,0,0" LastChildFill="False">
      <CheckBox Name="TopmostCheck" Content="Topmost" IsChecked="True" Margin="0,0,10,0"/>
      <CheckBox Name="LockCheck" Content="Lock" IsChecked="False" Margin="0,0,10,0"/>
      <TextBlock Name="IntervalLabel" Text="Auto:" VerticalAlignment="Center" Margin="0,0,4,0"/>
      <ComboBox Name="IntervalCombo" Width="90">
        <ComboBoxItem Content="Off" Tag="0" />
        <ComboBoxItem Content="30s" Tag="30" />
        <ComboBoxItem Content="60s" Tag="60" />
        <ComboBoxItem Content="300s" Tag="300" />
      </ComboBox>
    </DockPanel>
  </Grid>
</Window>
"@

[xml]$xamlXml = $xaml
$reader = New-Object System.Xml.XmlNodeReader $xamlXml
$window = [Windows.Markup.XamlReader]::Load($reader)

$PlatformLabel = $window.FindName('PlatformLabel')
$PlatformCombo = $window.FindName('PlatformCombo')
$RefreshButton = $window.FindName('RefreshButton')
$StatusText = $window.FindName('StatusText')
$MainText = $window.FindName('MainText')
$TopmostCheck = $window.FindName('TopmostCheck')
$LockCheck = $window.FindName('LockCheck')
$IntervalLabel = $window.FindName('IntervalLabel')
$IntervalCombo = $window.FindName('IntervalCombo')

if ($Lang -eq 'zh') {
  $PlatformLabel.Text = '平台:'
  $RefreshButton.Content = '刷新'
  $TopmostCheck.Content = '置顶'
  $LockCheck.Content = '锁定'
  $IntervalLabel.Text = '自动:'
  $window.Title = 'AI 套餐/用量/余额'
} else {
  $window.Title = 'AI Plan/Usage/Balance'
}

foreach ($key in $platformKeys) {
  $item = New-Object System.Windows.Controls.ComboBoxItem
  $item.Content = ("{0} ({1})" -f (Get-PlatformDisplayName $key), $key)
  $item.Tag = $key
  [void]$PlatformCombo.Items.Add($item)
}

function Select-Platform([string]$key) {
  for ($i = 0; $i -lt $PlatformCombo.Items.Count; $i++) {
    $it = $PlatformCombo.Items[$i]
    if ($it.Tag -eq $key) {
      $PlatformCombo.SelectedIndex = $i
      return
    }
  }
  $PlatformCombo.SelectedIndex = 0
}

Select-Platform $Platform

$window.Topmost = [bool]$settings.topmost
$TopmostCheck.IsChecked = $window.Topmost

$script:locked = [bool]$settings.locked
$LockCheck.IsChecked = $script:locked
if ($script:locked) { $window.ResizeMode = 'NoResize' }

if ($settings.width) { $window.Width = [double]$settings.width }
if ($settings.height) { $window.Height = [double]$settings.height }
if ($null -ne $settings.left) { $window.Left = [double]$settings.left }
if ($null -ne $settings.top) { $window.Top = [double]$settings.top }

function Set-IntervalCombo([int]$seconds) {
  for ($i = 0; $i -lt $IntervalCombo.Items.Count; $i++) {
    $it = $IntervalCombo.Items[$i]
    if ([int]$it.Tag -eq $seconds) {
      $IntervalCombo.SelectedIndex = $i
      return
    }
  }
  $IntervalCombo.SelectedIndex = 0
}

Set-IntervalCombo ([int]$settings.intervalSec)

$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds([int]$settings.intervalSec)

function Get-SelectedPlatformKey {
  $it = $PlatformCombo.SelectedItem
  if ($it -and $it.Tag) { return [string]$it.Tag }
  return [string]$platformKeys[0]
}

function Refresh-Now {
  $platformKey = Get-SelectedPlatformKey
  $displayName = Get-PlatformDisplayName $platformKey
  $StatusText.Text = ($(if ($Lang -eq 'zh') { '查询中...' } else { 'Checking...' }) + " $displayName")

  try {
    $data = Invoke-AiBalance $platformKey
    $result = $null
    if ($data -and $data.results -and $data.results.Count -gt 0) { $result = $data.results[0] }
    if (-not $result) { throw 'No result from CLI.' }
    $MainText.Text = BuildDisplayText $result
    $StatusText.Text = ($(if ($Lang -eq 'zh') { '更新时间' } else { 'Updated' }) + ": " + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))
    $settings.platform = $platformKey
  } catch {
    $MainText.Text = ''
    $StatusText.Text = ($(if ($Lang -eq 'zh') { '失败' } else { 'Failed' }) + ": " + $_.Exception.Message)
  }
}

$RefreshButton.Add_Click({ Refresh-Now })
$PlatformCombo.Add_SelectionChanged({ Refresh-Now })

$TopmostCheck.Add_Checked({ $window.Topmost = $true; $settings.topmost = $true })
$TopmostCheck.Add_Unchecked({ $window.Topmost = $false; $settings.topmost = $false })

$LockCheck.Add_Checked({
  $script:locked = $true
  $settings.locked = $true
  $window.ResizeMode = 'NoResize'
})
$LockCheck.Add_Unchecked({
  $script:locked = $false
  $settings.locked = $false
  $window.ResizeMode = 'CanResizeWithGrip'
})

$window.Add_MouseLeftButtonDown({
  if (-not $script:locked -and $_.ButtonState -eq 'Pressed') { $window.DragMove() }
})

$timer.Add_Tick({ Refresh-Now })
$IntervalCombo.Add_SelectionChanged({
  $it = $IntervalCombo.SelectedItem
  if (-not $it) { return }
  $sec = [int]$it.Tag
  $settings.intervalSec = $sec
  if ($sec -le 0) {
    $timer.Stop()
    return
  }
  $timer.Interval = [TimeSpan]::FromSeconds($sec)
  $timer.Start()
})

# Tray icon
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Visible = $true
$notifyIcon.Text = 'AI Balance'

$menu = New-Object System.Windows.Forms.ContextMenuStrip

$miShow = New-Object System.Windows.Forms.ToolStripMenuItem
$miShow.Text = $(if ($Lang -eq 'zh') { '显示/隐藏' } else { 'Show/Hide' })
$miShow.Add_Click({
  if ($window.Visibility -eq 'Visible') { $window.Hide() } else { $window.Show(); $window.Activate() }
})
[void]$menu.Items.Add($miShow)

$miRefresh = New-Object System.Windows.Forms.ToolStripMenuItem
$miRefresh.Text = $(if ($Lang -eq 'zh') { '立即刷新' } else { 'Refresh' })
$miRefresh.Add_Click({ Refresh-Now })
[void]$menu.Items.Add($miRefresh)

$miPlatforms = New-Object System.Windows.Forms.ToolStripMenuItem
$miPlatforms.Text = $(if ($Lang -eq 'zh') { '平台' } else { 'Platforms' })
foreach ($key in $platformKeys) {
  $mi = New-Object System.Windows.Forms.ToolStripMenuItem
  $mi.Text = ("{0} ({1})" -f (Get-PlatformDisplayName $key), $key)
  $mi.Tag = $key
  $mi.Add_Click({ param($sender, $e) Select-Platform ([string]$sender.Tag) })
  [void]$miPlatforms.DropDownItems.Add($mi)
}
[void]$menu.Items.Add($miPlatforms)

$miAuto = New-Object System.Windows.Forms.ToolStripMenuItem
$miAuto.Text = $(if ($Lang -eq 'zh') { '自动刷新' } else { 'Auto refresh' })
foreach ($sec in @(0, 30, 60, 300)) {
  $mi = New-Object System.Windows.Forms.ToolStripMenuItem
  $mi.Text = $(if ($sec -eq 0) { $(if ($Lang -eq 'zh') { '关闭' } else { 'Off' }) } else { "$sec s" })
  $mi.Tag = $sec
  $mi.Add_Click({ param($sender, $e) Set-IntervalCombo ([int]$sender.Tag) })
  [void]$miAuto.DropDownItems.Add($mi)
}
[void]$menu.Items.Add($miAuto)

$miTop = New-Object System.Windows.Forms.ToolStripMenuItem
$miTop.Text = $(if ($Lang -eq 'zh') { '置顶' } else { 'Topmost' })
$miTop.CheckOnClick = $true
$miTop.Checked = $window.Topmost
$miTop.Add_Click({
  $TopmostCheck.IsChecked = $miTop.Checked
})
[void]$menu.Items.Add($miTop)

$miLock = New-Object System.Windows.Forms.ToolStripMenuItem
$miLock.Text = $(if ($Lang -eq 'zh') { '锁定窗口' } else { 'Lock window' })
$miLock.CheckOnClick = $true
$miLock.Checked = $script:locked
$miLock.Add_Click({
  $LockCheck.IsChecked = $miLock.Checked
})
[void]$menu.Items.Add($miLock)

$miOpenConfig = New-Object System.Windows.Forms.ToolStripMenuItem
$miOpenConfig.Text = $(if ($Lang -eq 'zh') { '打开配置文件' } else { 'Open config' })
$miOpenConfig.Add_Click({
  if ($configPath) { Start-Process -FilePath notepad.exe -ArgumentList @($configPath) | Out-Null }
})
[void]$menu.Items.Add($miOpenConfig)

[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

$miExit = New-Object System.Windows.Forms.ToolStripMenuItem
$miExit.Text = $(if ($Lang -eq 'zh') { '退出' } else { 'Exit' })
$miExit.Add_Click({ $window.Close() })
[void]$menu.Items.Add($miExit)

$notifyIcon.ContextMenuStrip = $menu
$notifyIcon.Add_DoubleClick({
  $window.Show()
  $window.Activate()
})

$window.Add_Closing({
  try {
    $settings.left = $window.Left
    $settings.top = $window.Top
    $settings.width = $window.Width
    $settings.height = $window.Height
    Save-JsonFile $settingsPath $settings
  } catch {}

  try { $notifyIcon.Visible = $false; $notifyIcon.Dispose() } catch {}
})

# Start
$window.Show()
Refresh-Now

if ([int]$settings.intervalSec -gt 0) { $timer.Start() }

$app = New-Object System.Windows.Application
$app.Run($window) | Out-Null
