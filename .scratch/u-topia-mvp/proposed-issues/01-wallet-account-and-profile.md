# 01: Wallet account and creator profile

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** ผู้ใช้เข้าสู่ระบบด้วย wallet และมีโปรไฟล์ชื่อ รูป ประวัติ และลิงก์สาธารณะ โดยบัญชีเดียวใช้ซื้อและขายได้ สร้าง application ที่รันได้จริงพร้อมข้อมูลบัญชีถาวรผ่าน flow นี้
**Blocked by:** None (can start immediately).
**Status:** needs-info
**Spec coverage:** User stories 3, 6–9; identity and profiles.

## Acceptance criteria

- [ ] หน้าเว็บและข้อความระบบเป็นภาษาอังกฤษ แสดงสถานะเชื่อม wallet, ยกเลิกการเซ็น และผิดเครือข่ายอย่างชัดเจน
- [ ] การเข้าสู่ระบบพิสูจน์การควบคุม wallet ด้วย challenge ที่ผูกกับแอป มีอายุ และใช้ซ้ำไม่ได้
- [ ] ผู้ใช้แก้ชื่อ รูป และประวัติได้ ข้อมูลยังอยู่หลัง refresh และเข้าสู่ระบบใหม่
- [ ] เปิดโปรไฟล์ผ่าน public URL ได้โดยไม่ต้องเข้าสู่ระบบ ผู้ใช้คนอื่นแก้โปรไฟล์นั้นไม่ได้
- [ ] บัญชีไม่มีการแยกผู้ซื้อกับผู้ขาย และยังไม่ถือว่า wallet คนละใบเป็นบัญชีเดียวกัน
- [ ] มีการตรวจพฤติกรรม login สำเร็จ, signature ผิด/หมดอายุ/ใช้ซ้ำ และการพยายามแก้โปรไฟล์ผู้อื่น ผ่านขอบเขต application
- [ ] มีคำสั่งรันและตรวจแอปที่ทำซ้ำได้ พร้อมระบุ configuration ที่ต้องมี โดยไม่ฝัง secret ใน frontend

## Verification evidence

บันทึกคำสั่งและผลการทดสอบ รวมถึงตัวอย่างเปิด public profile หลังแก้ข้อมูลจริง
