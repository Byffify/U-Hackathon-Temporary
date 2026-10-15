# 08: Select composition sources and activate account trial quota

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** ผู้ใช้เปิด U-Bot เลือกหลายโปรเจกต์ที่ตนมีสิทธิ์และนำเข้า open-source material พร้อมหลักฐานเงื่อนไขได้ เห็นสิทธิ์ต่อยอดของต้นทางและโควตาก้อนเดียวต่อบัญชี ก่อนเริ่มการวิเคราะห์ด้วยโมเดล
**Blocked by:** 05 — My Library and authorized ZIP delivery.
**Status:** needs-info
**Spec coverage:** User stories 34, 35, 42; source eligibility, provenance, and account quota.

## Acceptance criteria

- [ ] เลือก source projects อย่างน้อยสองรายการ และแสดงรายการที่สามหรือมากกว่าได้ โดยไม่มี hardcoded count ceiling แบบสองโปรเจกต์
- [ ] Purchased source ผูกกับ exact release และ current source-access rights; แค่มี CID หรือเคยเห็นรายการไม่พอ
- [ ] นำเข้า open-source material ผ่านช่องทางที่ระบุ origin, license evidence และ source snapshot ได้ โดยเก็บ provenance แยกจาก entitlement ที่ซื้อ
- [ ] แยกสิทธิ์ใช้เพื่อประกอบกับสิทธิ์ขายผลงานต่อยอด Unknown/incompatible rights ไม่ถูกโมเดลหรือ checkbox ตีความว่าอนุญาตโดยอัตโนมัติ
- [ ] ไม่บังคับ source stack เป็น framework เดียว และแสดงข้อจำกัดขนาด/resource ที่ตรวจได้โดยไม่อ้างว่ารองรับไม่จำกัด
- [ ] บัญชีได้รับ trial allowance ตาม configuration เพียงครั้งเดียวเมื่อเข้าใช้ composition ตามเกณฑ์ ไม่ได้จากการซื้อหรือขายต่อ
- [ ] Quota ยังอยู่หลัง refresh/reconnect/เริ่มวันใหม่ ไม่มี top-up UI หรือการแบ่งบัญชีผู้ซื้อกับผู้ขาย
- [ ] หาก allowance/trial configuration ไม่พร้อม แสดง unavailable state โดยไม่สร้างเครดิตตามค่าที่เดา
- [ ] ทดสอบ multi-source selection, unauthorized access, unknown license, provenance, one-time grant และ no-reset/no-purchase-credit behavior

## External prerequisites

ยังไม่ต้องมี model API เพื่อส่งมอบ source-selection flow นี้ จำนวน allowance และ trial end ต้องตั้งค่าอย่างชัดเจนสำหรับ trial จริง; ค่าทดสอบเป็น fixture ไม่ใช่ค่าผลิตภัณฑ์ที่ผู้ใช้เลือกแล้ว

## Verification evidence

แสดง source selection มากกว่าสองรายการพร้อม provenance และ persistent quota ของบัญชีเดียว โดยไม่มี generation จำลองที่อ้างว่าเป็นงานจริง
