# 📤 คู่มือการเผยแพร่ KARN บน npm

## ขั้นตอนการเผยแพร่ครั้งแรก

### 1. สร้างบัญชี npm (ถ้ายังไม่มี)
```bash
npm adduser
```

### 2. ตรวจสอบว่า Build ผ่าน
```bash
bun run build
```

### 3. ทดสอบ Package ก่อนเผยแพร่
```bash
npm pack
```
คำสั่งนี้จะสร้างไฟล์ `.tgz` ให้ทดสอบติดตั้งก่อน:
```bash
npm install -g ./kathawut-ai-1.0.0.tgz
karn
```

### 4. เผยแพร่ขึ้น npm
```bash
npm publish
```

## การอัปเดตเวอร์ชันใหม่

### 1. อัปเดตเลขเวอร์ชันใน package.json
```bash
# Patch (1.0.0 -> 1.0.1) - แก้บั๊กเล็กน้อย
npm version patch

# Minor (1.0.0 -> 1.1.0) - เพิ่มฟีเจอร์ใหม่
npm version minor

# Major (1.0.0 -> 2.0.0) - เปลี่ยนแปลงใหญ่
npm version major
```

### 2. Push ไปยัง GitHub
```bash
git push && git push --tags
```

### 3. เผยแพร่เวอร์ชันใหม่
```bash
npm publish
```

## Checklist ก่อนเผยแพร่

- [ ] ทดสอบ `bun run build` ผ่าน
- [ ] ตรวจสอบ `package.json` ว่าข้อมูลครบถ้วน
- [ ] อัปเดต `README.md` ให้เป็นปัจจุบัน
- [ ] ตรวจสอบ `.npmignore` ว่าไม่มีไฟล์ที่ไม่ควรเผยแพร่
- [ ] ทดสอบติดตั้งด้วย `npm pack` ก่อน
- [ ] Commit และ Push ขึ้น GitHub
- [ ] เพิ่มเลขเวอร์ชันด้วย `npm version`

## คำสั่งที่มีประโยชน์

```bash
# ดูว่าจะเผยแพร่ไฟล์อะไรบ้าง
npm pack --dry-run

# ดูข้อมูล Package
npm view kathawut-ai

# ยกเลิกการเผยแพร่ (ภายใน 72 ชั่วโมง)
npm unpublish kathawut-ai@1.0.0

# ดู Package ที่เผยแพร่แล้ว
npm info kathawut-ai
```

## หมายเหตุสำคัญ

1. **ชื่อ Package ต้องไม่ซ้ำ**: ตรวจสอบที่ https://www.npmjs.com/package/kathawut-ai
2. **เวอร์ชันต้องไม่ซ้ำ**: ไม่สามารถเผยแพร่เวอร์ชันเดิมซ้ำได้
3. **ไฟล์ที่เผยแพร่**: เฉพาะที่ระบุใน `files` ใน package.json
4. **License**: ตรวจสอบว่าใช้ License ที่เหมาะสม (ปัจจุบันใช้ MIT)

## การทดสอบหลังเผยแพร่

```bash
# ติดตั้งจาก npm
npm install -g kathawut-ai

# ทดสอบรัน
karn

# ถอนการติดตั้ง
npm uninstall -g kathawut-ai
```

---
**เมื่อเผยแพร่สำเร็จ**: เพื่อนคุณจะสามารถติดตั้งได้ด้วย `npm install -g kathawut-ai` 🎉
