# ============================================================================
# FFmpeg Bridge HTTP Server (TcpListener) — HT_Automation Premiere Pro UXP
# ============================================================================

$port = 19888
$localAddr = [System.Net.IPAddress]::Parse("127.0.0.1")
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$defaultFfmpegExe = Join-Path $scriptDir "ffmpeg.exe"

# Kiem tra xem Server da dang chay va phan hoi tot chua
try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -TimeoutSec 2 -ErrorAction Stop
    if ($resp -and $resp.status -eq "ok") {
        Write-Host "====================================================================" -ForegroundColor Green
        Write-Host "   ✅ FFmpeg Bridge HTTP Server DA DANG CHAY SAN ROI!" -ForegroundColor Green
        Write-Host "   Server dang hoat dong ngam mượt mà tren may ban." -ForegroundColor Yellow
        Write-Host "====================================================================" -ForegroundColor Green
        Start-Sleep -Seconds 3
        exit 0
    }
} catch {
    # Server chua chay hoac dang bi treo -> Don dẹp tien trinh cu
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            $pidToKill = $c.OwningProcess
            if ($pidToKill -and $pidToKill -ne $PID) {
                Write-Host "Dang tat tien trinh cu bi treo tren port $port (PID $pidToKill)..." -ForegroundColor Yellow
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Milliseconds 500
    }
}

$server = New-Object System.Net.Sockets.TcpListener($localAddr, $port)
try {
    $server.Start()
} catch {
    Write-Host "Loi khoi tao socket: $($_.Exception.Message)" -ForegroundColor Red
    Start-Sleep -Seconds 5
    exit 1
}

Write-Host "====================================================================" -ForegroundColor Green
Write-Host "   ✅ FFmpeg Bridge HTTP Server Dang Chay Tai: http://127.0.0.1:$port/" -ForegroundColor Green
Write-Host "   Giu cua so nay chay ngam khi su dung HT_Automation trong Premiere Pro." -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Green

while ($true) {
    try {
        $client = $server.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
        
        $requestLine = $reader.ReadLine()
        if (-not $requestLine) {
            $client.Close()
            continue
        }

        $contentLength = 0
        while ($true) {
            $line = $reader.ReadLine()
            if (-not $line -or $line.Trim() -eq "") { break }
            if ($line -like "*Content-Length:*") {
                $parts = $line.Split(":")
                if ($parts.Length -ge 2) {
                    [int]::TryParse($parts[1].Trim(), [ref]$contentLength) | Out-Null
                }
            }
        }

        $bodyText = ""
        if ($contentLength -gt 0) {
            $buffer = New-Object char[] $contentLength
            $readCount = 0
            while ($readCount -lt $contentLength) {
                $c = $reader.Read($buffer, $readCount, $contentLength - $readCount)
                if ($c -le 0) { break }
                $readCount += $c
            }
            $bodyText = New-Object string($buffer, 0, $readCount)
        }

        # Service routes
        $isOptions = $requestLine.StartsWith("OPTIONS")
        $isHealth = $requestLine.Contains("/health")
        $isRun = $requestLine.Contains("/run")

        $responseBody = ""
        $statusCode = "200 OK"

        if ($isOptions) {
            $responseBody = ""
        } elseif ($isHealth) {
            $responseBody = '{"status":"ok","message":"FFmpeg Bridge Server is running"}'
        } elseif ($isRun) {
            $exePath = $defaultFfmpegExe
            $argsArr = @("-version")

            if ($bodyText -and $bodyText.Trim().Length -gt 0) {
                try {
                    $data = ConvertFrom-Json $bodyText
                    if ($data.exePath -and (Test-Path $data.exePath -PathType Leaf)) {
                        $exePath = $data.exePath
                    }
                    if ($data.args) {
                        $argsArr = $data.args
                    }
                } catch {}
            }

            if (-not (Test-Path $exePath)) {
                $exePath = $defaultFfmpegExe
            }

            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = $exePath
            $psi.UseShellExecute = $false
            $psi.RedirectStandardOutput = $true
            $psi.RedirectStandardError = $true
            $psi.CreateNoWindow = $true

            if ($argsArr) {
                $argList = @()
                foreach ($a in $argsArr) {
                    if ($a.Contains(" ")) {
                        $argList += "`"$a`""
                    } else {
                        $argList += $a
                    }
                }
                $psi.Arguments = [string]::Join(" ", $argList)
            }

            $proc = New-Object System.Diagnostics.Process
            $proc.StartInfo = $psi

            $stdOutText = ""
            $stdErrText = ""
            $exitCode = -1

            try {
                [void]$proc.Start()
                $stdOutTask = $proc.StandardOutput.ReadToEndAsync()
                $stdErrTask = $proc.StandardError.ReadToEndAsync()
                $proc.WaitForExit()
                $stdOutText = $stdOutTask.Result
                $stdErrText = $stdErrTask.Result
                $exitCode = $proc.ExitCode
            } catch {
                $stdErrText = $_.Exception.Message
                $exitCode = -1
            }

            $resultObj = @{
                exitCode = $exitCode
                stdout = $stdOutText
                stderr = $stdErrText
            }
            $responseBody = ConvertTo-Json $resultObj -Depth 3
        } else {
            $statusCode = "404 Not Found"
            $responseBody = '{"error":"Not found"}'
        }

        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($responseBody)
        $headerText = "HTTP/1.1 $statusCode`r`n" +
                      "Content-Type: application/json; charset=utf-8`r`n" +
                      "Content-Length: $($bodyBytes.Length)`r`n" +
                      "Access-Control-Allow-Origin: *`r`n" +
                      "Access-Control-Allow-Methods: GET, POST, OPTIONS`r`n" +
                      "Access-Control-Allow-Headers: Content-Type`r`n" +
                      "Connection: close`r`n`r`n"
        
        $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($headerText)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        if ($bodyBytes.Length -gt 0) {
            $stream.Write($bodyBytes, 0, $bodyBytes.Length)
        }
        $stream.Flush()
        $client.Close()
    } catch {
        # Keep server loop active
    }
}
