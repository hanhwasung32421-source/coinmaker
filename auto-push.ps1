param(
  # 파일 변경 후 커밋/푸쉬까지 기다릴 디바운스(초)
  [double]$DebounceSeconds = 1.5,

  # 커밋 메시지 앞에 붙는 접두사
  [string]$MessagePrefix = "자동 커밋"
)

$ErrorActionPreference = "Stop"

function Write-Log([string]$Message) {
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  Write-Host "[$ts] $Message"
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$deployBat = Join-Path $repoRoot "deploy.bat"

if (-not (Test-Path $deployBat)) {
  throw "deploy.bat 을 찾을 수 없습니다: $deployBat"
}

Push-Location $repoRoot
try {
  # git repo 확인
  & git rev-parse --is-inside-work-tree *> $null
  if ($LASTEXITCODE -ne 0) { throw "현재 폴더는 git 저장소가 아닙니다: $repoRoot" }

  $branch = (& git rev-parse --abbrev-ref HEAD).Trim()
  if ($branch -eq "HEAD") { throw "Detached HEAD 상태입니다. 브랜치를 체크아웃한 뒤 다시 실행하세요." }

  Write-Log "감시 시작: $repoRoot"
  Write-Log "대상 브랜치: $branch"
  Write-Log "중지: Ctrl+C"

  $script:pending = $false
  $script:inProgress = $false

  $timer = New-Object System.Timers.Timer
  $timer.AutoReset = $false
  $timer.Interval = [Math]::Max(200, [int]($DebounceSeconds * 1000))

  $timer.add_Elapsed({
    if ($script:inProgress) {
      # 작업 중이면 한 번 더 예약
      $script:pending = $true
      $timer.Start()
      return
    }

    $script:inProgress = $true
    try {
      $status = & git status --porcelain
      if (-not $status -or $status.Count -eq 0) {
        return
      }

      # 변경 파일 요약(최대 6개)
      $items = @()
      foreach ($line in $status) {
        if (-not $line) { continue }
        # git status --porcelain: "XY path"
        $code = $line.Substring(0, 2).Trim()
        $path = $line.Substring(3).Trim()
        if (-not $path) { continue }
        $items += "$code $path"
        if ($items.Count -ge 6) { break }
      }

      $summary = if ($items.Count -gt 0) { $items -join ", " } else { "변경사항" }
      $msg = "$MessagePrefix: $summary"

      # 너무 길면 자르기(윈도 cmd/깃/원격 로그 가독성)
      if ($msg.Length -gt 120) { $msg = $msg.Substring(0, 117) + "..." }

      Write-Log "커밋/푸쉬 실행: $msg"

      # deploy.bat이 스테이징/커밋/푸쉬를 처리
      # PowerShell에서 .bat 호출은 자동으로 cmd를 통해 실행됩니다.
      & $deployBat $msg
      if ($LASTEXITCODE -ne 0) { throw "deploy.bat 실행 실패 (exit=$LASTEXITCODE)" }

      Write-Log "완료"
    }
    catch {
      Write-Log ("[ERROR] " + $_.Exception.Message)
    }
    finally {
      $script:inProgress = $false
      if ($script:pending) {
        $script:pending = $false
        $timer.Start()
      }
    }
  })

  $watcher = New-Object System.IO.FileSystemWatcher
  $watcher.Path = $repoRoot
  $watcher.IncludeSubdirectories = $true
  $watcher.NotifyFilter =
    [System.IO.NotifyFilters]::FileName `
    -bor [System.IO.NotifyFilters]::DirectoryName `
    -bor [System.IO.NotifyFilters]::LastWrite `
    -bor [System.IO.NotifyFilters]::Size

  function Should-IgnorePath([string]$fullPath) {
    if (-not $fullPath) { return $true }
    $p = $fullPath.Replace("/", "\").ToLowerInvariant()
    if ($p.Contains("\.git\")) { return $true }
    if ($p.Contains("\node_modules\")) { return $true }
    return $false
  }

  $handler = {
    if (Should-IgnorePath $Event.SourceEventArgs.FullPath) { return }
    # 이벤트가 폭주하므로 timer로 디바운스
    if ($timer.Enabled) { $timer.Stop() }
    $timer.Start()
  }

  Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $handler | Out-Null
  Register-ObjectEvent -InputObject $watcher -EventName Created -Action $handler | Out-Null
  Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $handler | Out-Null
  Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $handler | Out-Null

  $watcher.EnableRaisingEvents = $true

  try {
    while ($true) { Start-Sleep -Seconds 1 }
  }
  finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    $timer.Dispose()
  }
}
finally {
  Pop-Location
}
