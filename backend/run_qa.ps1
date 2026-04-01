# UNIQUEOFY Backend QA Script
$BaseUrl = "http://localhost:5000/api"
$ErrorActionPreference = "SilentlyContinue"

function Log-Result {
    param (
        [string]$TestName,
        [bool]$Success,
        [string]$Details = ""
    )
    if ($Success) {
        Write-Host "✅ PASS: $TestName" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: $TestName" -ForegroundColor Red
        if ($Details) { Write-Host "   -> $Details" -ForegroundColor Yellow }
    }
}

Write-Host "`n🚀 STARTING BACKEND QA SUITE...`n" -ForegroundColor Cyan

function Request-OtpLogin {
    param(
        [string]$Phone,
        [string]$Label
    )

    try {
        Invoke-RestMethod -Uri "$BaseUrl/auth/send-otp" -Method Post -Body (@{ phone = $Phone } | ConvertTo-Json) -ContentType "application/json" | Out-Null
        $otp = Read-Host "Enter OTP for $Label ($Phone)"
        $loginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/verify-otp" -Method Post -Body (@{ phone = $Phone; otp = $otp } | ConvertTo-Json) -ContentType "application/json"
        $token = $loginRes.data.accessToken
        Log-Result "$Label Login" ($null -ne $token)
        return $token
    } catch {
        Log-Result "$Label Login" $false $_.Exception.Message
        return $null
    }
}

# --- 1. AUTHENTICATION ---
Write-Host "--- AUTHENTICATION ---" -ForegroundColor Cyan

# 1.1 Admin Login
# NOTE: Admin must be pre-seeded in the database with role 'admin'.
# Auto-admin promotion via phone number has been removed for security.
$adminToken = Request-OtpLogin -Phone "0000000000" -Label "Admin"
if (-not $adminToken) { exit }

# 1.2 User Login
$userToken = Request-OtpLogin -Phone "9876543210" -Label "User"
if (-not $userToken) { exit }

# 1.3 Invalid Login (Bad OTP)
try {
    Invoke-RestMethod -Uri "$BaseUrl/auth/verify-otp" -Method Post -Body '{"phone":"9876543210","otp":"000000"}' -ContentType "application/json" | Out-Null
    Log-Result "Invalid Login Blocked" $false "Should have failed"
} catch {
    Log-Result "Invalid Login Blocked" ($_.Exception.Response.StatusCode -eq "BadRequest")
}


# --- 2. SERVICES ---
Write-Host "`n--- SERVICES ---" -ForegroundColor Cyan

# 2.1 Create Service (Admin)
$uniqueName = "Test Service " + (Get-Date).Ticks
try {
    $svcBody = @{
        name = $uniqueName
        description = "Test Description"
        category = "Test"
        isActive = $true
    } | ConvertTo-Json
    
    $svcRes = Invoke-RestMethod -Uri "$BaseUrl/services" -Method Post -Body $svcBody -Headers @{Authorization="Bearer $adminToken"} -ContentType "application/json"
    $serviceId = $svcRes.data._id
    Log-Result "Create Service (Admin)" ($null -ne $serviceId)
} catch {
    Log-Result "Create Service (Admin)" $false $_.Exception.Message
}

# 2.2 Duplicate Service Check
try {
    Invoke-RestMethod -Uri "$BaseUrl/services" -Method Post -Body $svcBody -Headers @{Authorization="Bearer $adminToken"} -ContentType "application/json" | Out-Null
    Log-Result "Duplicate Service Blocked" $false "Should have failed"
} catch {
    Log-Result "Duplicate Service Blocked" ($_.Exception.Response.StatusCode -eq "BadRequest")
}

# 2.3 Public Get Services
try {
    $publicSvcs = Invoke-RestMethod -Uri "$BaseUrl/services" -Method Get
    Log-Result "Public Get Services" ($publicSvcs.data.Count -gt 0)
} catch {
    Log-Result "Public Get Services" $false $_.Exception.Message
}


# --- 3. ORDERS ---
Write-Host "`n--- ORDERS ---" -ForegroundColor Cyan

# 3.1 Create Order (User)
if ($serviceId) {
    try {
        $orderBody = @{
            services = @(@{ serviceId = $serviceId; name = $uniqueName; quantity = 1 })
            serviceDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
        } | ConvertTo-Json

        $orderRes = Invoke-RestMethod -Uri "$BaseUrl/orders" -Method Post -Body $orderBody -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json"
        $orderId = $orderRes.data._id
        Log-Result "Create Order (User)" ($null -ne $orderId)
    } catch {
        Log-Result "Create Order (User)" $false $_.Exception.Message
    }
} else {
    Log-Result "Create Order (User)" $false "Skipped: No Service ID"
}

# 3.2 Create Invalid Order (Empty Services)
try {
    $invalidOrderBody = @{
        services = @()
        serviceDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BaseUrl/orders" -Method Post -Body $invalidOrderBody -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json" | Out-Null
    Log-Result "Empty Order Blocked" $false "Should have failed"
} catch {
    Log-Result "Empty Order Blocked" ($_.Exception.Response.StatusCode -eq "BadRequest")
}

# 3.3 Get My Orders
try {
    $myOrders = Invoke-RestMethod -Uri "$BaseUrl/orders/myorders" -Method Get -Headers @{Authorization="Bearer $userToken"}
    Log-Result "Get My Orders" ($myOrders.data.Count -gt 0)
} catch {
    Log-Result "Get My Orders" $false $_.Exception.Message
}


# --- 4. ADMIN CONTROLS ---
Write-Host "`n--- ADMIN CONTROLS ---" -ForegroundColor Cyan

if ($orderId) {
    # 4.1 Update Status (CONFIRMED)
    try {
        $statusBody = @{ status = "CONFIRMED" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$BaseUrl/admin/orders/$orderId/status" -Method Put -Body $statusBody -Headers @{Authorization="Bearer $adminToken"} -ContentType "application/json" | Out-Null
        Log-Result "Admin: PENDING -> CONFIRMED" $true
    } catch {
        Log-Result "Admin: PENDING -> CONFIRMED" $false $_.Exception.Message
    }

    # 4.2 Invalid Transition (Back to PENDING)
    try {
        $badStatusBody = @{ status = "PENDING" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$BaseUrl/admin/orders/$orderId/status" -Method Put -Body $badStatusBody -Headers @{Authorization="Bearer $adminToken"} -ContentType "application/json" | Out-Null
        Log-Result "Invalid Transition Blocked" $false "Should have failed"
    } catch {
        Log-Result "Invalid Transition Blocked" ($_.Exception.Response.StatusCode -eq "BadRequest")
    }

    # 4.3 Update Status (COMPLETED)
    try {
        $statusBody = @{ status = "COMPLETED" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$BaseUrl/admin/orders/$orderId/status" -Method Put -Body $statusBody -Headers @{Authorization="Bearer $adminToken"} -ContentType "application/json" | Out-Null
        Log-Result "Admin: CONFIRMED -> COMPLETED" $true
    } catch {
        Log-Result "Admin: CONFIRMED -> COMPLETED" $false $_.Exception.Message
    }
    
    # 4.4 User Cancel Completed Order (Should Fail)
    try {
        Invoke-RestMethod -Uri "$BaseUrl/orders/$orderId/cancel" -Method Put -Headers @{Authorization="Bearer $userToken"} | Out-Null
        Log-Result "User Cancel Completed Order Blocked" $false "Should have failed"
    } catch {
        Log-Result "User Cancel Completed Order Blocked" ($_.Exception.Response.StatusCode -eq "BadRequest")
    }
}

# 4.5 Get Users (Admin Only)
try {
    $users = Invoke-RestMethod -Uri "$BaseUrl/admin/users" -Method Get -Headers @{Authorization="Bearer $adminToken"}
    Log-Result "Admin Get Users" ($users.data.Count -gt 0)
} catch {
    Log-Result "Admin Get Users" $false $_.Exception.Message
}

# 4.6 Get Users (User Access - Should Fail)
try {
    Invoke-RestMethod -Uri "$BaseUrl/admin/users" -Method Get -Headers @{Authorization="Bearer $userToken"} | Out-Null
    Log-Result "User Access to Admin Route Blocked" $false "Should have failed"
} catch {
    Log-Result "User Access to Admin Route Blocked" ($_.Exception.Response.StatusCode -eq "Forbidden")
}

Write-Host "`n✅ QA SUITE COMPLETE" -ForegroundColor Cyan
