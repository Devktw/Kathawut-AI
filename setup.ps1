# 🛠 KARN AI - AUTOMATIC SETUP SCRIPT
$ErrorActionPreference = "Stop"

Write-Host "`n🚀 กำลังเตรียมระบบให้กานต์ (KARN) AI..." -ForegroundColor Cyan

# 1. เช็คและติดตั้ง Bun
if (!(Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "📦 ไม่พบ Bun ในเครื่อง... กำลังติดตั้งให้ครับ (รอสักครู่)" -ForegroundColor Yellow
    powershell -c "irm bun.sh/install.ps1 | iex"
    
    # อัปเดต Path ใน Session นี้เพื่อให้ใช้ bun ได้เลย
    $env:Path += ";$env:USERPROFILE\.bun\bin"
    Write-Host "✅ ติดตั้ง Bun เรียบร้อย!" -ForegroundColor Green
} else {
    Write-Host "✅ พบ Bun ในเครื่องแล้ว: $(bun --version)" -ForegroundColor Green
}

# 2. ติดตั้ง Dependencies
Write-Host "`n📦 กำลังติดตั้ง Library ที่จำเป็น..." -ForegroundColor Cyan
bun install


# 3. เสร็จสิ้นและเริ่มรัน
Write-Host "`n✨ ทุกอย่างพร้อมแล้ว! กำลังเริ่มระบบตั้งค่า (Setup Wizard)..." -ForegroundColor Magenta
Write-Host "--------------------------------------------------------"
bun start
