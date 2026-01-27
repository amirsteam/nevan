# TypeScript Migration Cleanup Script
# Run this script to remove old JavaScript files after verifying the TypeScript versions work

# Frontend cleanup
$frontendFiles = @(
    "frontend/src/main.jsx",
    "frontend/src/App.jsx",
    "frontend/vite.config.js",
    "frontend/src/store/index.js",
    "frontend/src/store/cartSlice.js",
    "frontend/src/api/index.js",
    "frontend/src/api/products.js",
    "frontend/src/api/cart.js",
    "frontend/src/api/orders.js",
    "frontend/src/api/admin.js",
    "frontend/src/context/AuthContext.jsx",
    "frontend/src/context/index.js",
    "frontend/src/routes/index.jsx",
    "frontend/src/routes/ProtectedRoute.jsx",
    "frontend/src/routes/AdminRoute.jsx",
    "frontend/src/components/layout/Layout.jsx",
    "frontend/src/components/layout/Header.jsx",
    "frontend/src/components/layout/Footer.jsx",
    "frontend/src/components/layout/index.js",
    "frontend/src/utils/helpers.js",
    "frontend/src/vite-env.d.ts"  # Remove duplicate, keep types/global.d.ts
)

# Mobile cleanup
$mobileFiles = @(
    "mobile/App.js",
    "mobile/index.js",
    "mobile/src/store/index.js",
    "mobile/src/store/authSlice.js",
    "mobile/src/store/cartSlice.js",
    "mobile/src/api/axios.js",
    "mobile/src/api/auth.js",
    "mobile/src/api/cart.js",
    "mobile/src/api/products.js",
    "mobile/src/api/orders.js",
    "mobile/src/utils/storage.js",
    "mobile/src/navigation/RootNavigator.jsx",
    "mobile/src/navigation/TabNavigator.jsx",
    "mobile/src/navigation/HomeNavigator.jsx"
)

Write-Host "=== TypeScript Migration Cleanup ===" -ForegroundColor Cyan
Write-Host ""

# Verify TypeScript files exist before deleting JS files
Write-Host "Verifying TypeScript files exist..." -ForegroundColor Yellow

$allFilesExist = $true

# Check frontend TS files
$frontendTsFiles = @(
    "frontend/src/main.tsx",
    "frontend/src/App.tsx",
    "frontend/vite.config.ts",
    "frontend/src/store/index.ts"
)

foreach ($file in $frontendTsFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "Missing: $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "Some TypeScript files are missing. Aborting cleanup." -ForegroundColor Red
    exit 1
}

Write-Host "All TypeScript files verified!" -ForegroundColor Green
Write-Host ""

# Delete frontend files
Write-Host "Deleting old frontend JavaScript files..." -ForegroundColor Yellow
foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Deleted: $file" -ForegroundColor Gray
    }
}

# Delete mobile files
Write-Host "Deleting old mobile JavaScript files..." -ForegroundColor Yellow
foreach ($file in $mobileFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Deleted: $file" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run 'npm install' in frontend/ directory"
Write-Host "2. Run 'npm install' in mobile/ directory"
Write-Host "3. Test the application: 'npm run dev' in frontend/"
Write-Host "4. Convert remaining .jsx page files to .tsx as needed"
