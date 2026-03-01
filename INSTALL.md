# 📦 วิธีติดตั้ง KARN จาก npm

## ติดตั้งแบบอัตโนมัติ (แนะนำ - คำสั่งเดียวจบ)

### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/Devktw/Kathawut-AI/master/install.ps1 | iex
```

### Windows (CMD)
```cmd
curl -o install.bat https://raw.githubusercontent.com/Devktw/Kathawut-AI/master/install.bat && install.bat
```

หรือใช้ PowerShell ผ่าน CMD:
```cmd
powershell -c "irm https://raw.githubusercontent.com/Devktw/Kathawut-AI/master/install.ps1 | iex"
```

### macOS/Linux
```bash
curl -fsSL https://raw.githubusercontent.com/Devktw/Kathawut-AI/master/install.sh | bash
```

สคริปต์จะตรวจสอบและติดตั้ง Bun ให้อัตโนมัติถ้ายังไม่มี

---

## ติดตั้งแบบแมนนวล

### 1. ติดตั้ง Bun (ถ้ายังไม่มี)

**Windows:**
```powershell
powershell -c "irm bun.sh/install.ps1|iex"
```

**macOS/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. ติดตั้ง KARN

```bash
bun install -g kathawut-ai
```

หรือใช้ bunx (ไม่ต้องติดตั้ง):
```bash
bunx kathawut-ai
```

## เริ่มใช้งาน

หลังติดตั้งเสร็จ รันคำสั่ง:
```bash
karn
```

ระบบจะเข้าสู่โหมด Setup Wizard อัตโนมัติและถามข้อมูล:
1. **TYPHOON_API_KEY** - API Key จาก [OpenTyphoon](https://opentyphoon.ai/)
2. **TELEGRAM_BOT_TOKEN** - Bot Token จาก [@BotFather](https://t.me/BotFather)
3. **Base URL** - ค่าเริ่มต้น: `https://api.opentyphoon.ai/v1`
4. **Model Name** - ค่าเริ่มต้น: `typhoon-v2.5-30b-a3b-instruct`

## สิ่งที่ต้องเตรียม

- Bun Runtime (ติดตั้งจาก https://bun.sh/)
- Telegram Bot Token
- Typhoon API Key

## คำสั่งที่มีให้ใช้

- `karn` - เริ่มต้นบอท
- `/new` - ล้างประวัติการสนทนา (ใช้ใน Telegram)

## ไฟล์ที่สร้างขึ้นอัตโนมัติ

หลังรันครั้งแรก ระบบจะสร้างไฟล์เหล่านี้ในโฟลเดอร์ปัจจุบัน:
- `.env` - เก็บ API Keys
- `settings.json` - การตั้งค่า AI
- `database.sqlite` - ฐานข้อมูลความจำ
- `memory.md` - ความจำระยะยาว

## การอัปเดต

```bash
bun update -g kathawut-ai
```

## ปัญหาที่พบบ่อย

### ไม่พบคำสั่ง `karn`
ลองรันใหม่ด้วย:
```bash
bun install -g kathawut-ai --force
```

### Permission Error (Linux/Mac)
ตรวจสอบว่า Bun ติดตั้งถูกต้อง:
```bash
bun --version
```

---
สำหรับข้อมูลเพิ่มเติม: [GitHub Repository](https://github.com/Devktw/Kathawut-AI)
