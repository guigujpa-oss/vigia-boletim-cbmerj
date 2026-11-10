Set-Location "C:\Users\GMartins\.gemini\antigravity\scratch\csmar-dashboard"

$isRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $isRunning = $true
    }
} catch {
    $isRunning = $false
}

if (-not $isRunning) {
    Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "server.js" -WorkingDirectory "C:\Users\GMartins\.gemini\antigravity\scratch\csmar-dashboard" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

Start-Process "http://localhost:3001"
