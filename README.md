# 🤖 กานต์ (KARN) — Kathawut AI Assistant

ผู้ช่วยส่วนตัว AI ทรงประสิทธิภาพที่รันบนเครื่องของคุณ เชื่อมต่อผ่าน Telegram และควบคุมระบบด้วย PowerShell พร้อมระบบความจำ 3 ชั้น (Sensory, Working, Long-term)

---

## ✨ ความสามารถเด่น (Key Features)

- 🧠 **Smart Memory System**: จดจำบริบทการคุย สรุปข้อความอัตโนมัติ และบันทึกข้อมูลสำคัญลงไฟล์ `memory.md`
- 🛠 **Automation Power**: ควบคุมเครื่องผ่าน PowerShell Tags (รันสคริปต์, ส่งไฟล์, ตั้งเวลาเตือน)
- 🌀 **Thai Language First**: ปรับแต่งมาเพื่อการสื่อสารภาษาไทยที่เป็นธรรมชาติและทรงพลัง
- ⚡ **Lightning Fast**: ขับเคลื่อนด้วย [Bun](https://bun.sh/) และ [Typhoon AI](https://opentyphoon.ai/)

---

## 🚀 การติดตั้งและเริ่มใช้งาน (Installation Guide)

### วิธีที่ 1: ติดตั้งแบบอัตโนมัติ (แนะนำ - คำสั่งเดียวจบ)

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/Devktw/Kathawut-AI/master/install.ps1 | iex
```

**Windows (CMD):**
```cmd
curl -o install.bat https://raw.githubusercontent.com/Devktw/Kathawut-AI/master/install.bat && install.bat
```

**macOS/Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/Devktw/Kathawut-AI/master/install.sh | bash
```

**Android (Termux):**
```bash
curl -fsSL https://raw.githubusercontent.com/Devktw/Kathawut-AI/master/install-termux.sh | bash
```

สคริปต์จะตรวจสอบและติดตั้ง Bun + KARN ให้อัตโนมัติ แล้วรัน `karn` ได้เลย

---

### วิธีที่ 2: ติดตั้งแบบแมนนวล

**ติดตั้ง Bun ก่อน** (ถ้ายังไม่มี):
```bash
# Windows
powershell -c "irm bun.sh/install.ps1|iex"

# macOS/Linux
curl -fsSL https://bun.sh/install | bash
```

**ติดตั้ง KARN**:
```bash
bun install -g kathawut-ai
karn
```

---

### วิธีที่ 3: Clone จาก GitHub (สำหรับ Developer)

สำหรับผู้ที่ต้องการแก้ไขหรือพัฒนาต่อ:

### 1. สิ่งที่ต้องเตรียม (Prerequisites)
- [Bun Runtime](https://bun.sh/) (แนะนำเวอร์ชันล่าสุด)
- [PowerShell 7](https://github.com/PowerShell/PowerShell) (สำหรับ Windows)
- **Telegram Bot Token**: สร้างได้จาก [@BotFather](https://t.me/BotFather)
- **Typhoon API Key**: สมัครใช้งานที่ [OpenTyphoon](https://opentyphoon.ai/)

### 2. ขั้นตอนการติดตั้ง
```powershell
# 1. Clone โปรเจกต์ไปยังเครื่องของคุณ
git clone https://github.com/YOUR_USERNAME/Kathawut-AI.git
cd Kathawut-AI

# 2. ติดตั้ง Library ที่จำเป็น
bun install
```

### 3. เริ่มรันระบบ (Setup Wizard)
ครั้งแรกที่คุณรัน ระบบจะเข้าสู่โหมด **Setup Wizard** อัตโนมัติใน Terminal:
```powershell
bun start
```
ระบบจะถามข้อมูล 2 ส่วน:
- **API Keys**: วาง `TYPHOON_API_KEY` และ `TELEGRAM_BOT_TOKEN`
- **AI Settings**: ตั้งค่า Model Name และ Base URL ของ Typhoon

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

- `src/index.ts`: จุดเริ่มต้นระบบ (Core Engine)
- `src/config.ts`: ระบบ Setup และจัดการค่าคอนฟิก
- `src/database.ts`: สมองส่วนจัดเก็บข้อมูล (SQLite + JSON Memory)
- `prompt.md`: บุคลิกภาพและคู่มือการตัดสินใจของบอท
- `.env`: (สร้างให้อัตโนมัติ) เก็บความลับของคุณ

---

## 🛠 คำสั่งพิศษ (Tag System)

กานต์ทำงานจริงผ่านระบบ Tag ในการตอบโต้:
- `[CMD: command]`: รันคำสั่ง PowerShell (เช่น `dir`, `systeminfo`)
- `[REMEMBER: key = value]`: บันทึกความจำระยะสั้น
- `[DOC: title] ... [/DOC]`: บันทึกข้อมูลยาวๆ ลง `memory.md`
- `[SCHEDULE: YYYY-MM-DD HH:MM:SS | msg]`: ตั้งเวลาเตือนความจำ
- `[SEND_FILE: path]`: ส่งไฟล์จากเครื่องไปยัง Telegram

---

## 📝 หมายเหตุ
- ไฟล์ `.env`, `database.sqlite`, `memory.md`, และ `settings.json` จะไม่ถูกอัปโหลดขึ้น GitHub เพื่อความปลอดภัย
- หากต้องการย้ายไปเครื่องอื่น ให้ Copy ไฟล์เหล่านี้ไปด้วย หรือรัน `bun start` ใหม่เพื่อตั้งค่าใหม่

---
*Powered by Kathawut
