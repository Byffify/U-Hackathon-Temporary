# 11: Publish and sell a permitted composed project

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** ผู้ใช้รับผลจาก U-Bot แล้วนำกลับมาเป็นผลงานใหม่บนโปรไฟล์ ลงขาย ZIP พร้อมข้อมูลต้นทาง เมื่อสิทธิ์อนุญาต ผู้ซื้อรายใหม่ซื้อและรับ source ได้โดยไม่มี upstream royalty
**Blocked by:** 10 — Confirm, compose, and download a validated output ZIP.
**Status:** needs-info
**Spec coverage:** User stories 32, 33; derivative eligibility and the complete create-to-resell loop.

## Acceptance criteria

- [ ] เปิด publishing flow จาก output ที่ผู้ใช้เป็นเจ้าของงานได้ โดยนำ ZIP/provenance ไปใช้และให้กรอกรายละเอียด ราคา ภาพ และ demo URL หากมี
- [ ] ตรวจ upstream permissions และ required notices ทุกต้นทางก่อนอนุญาตขาย derivative Unknown/disallowed source ทำให้ขายไม่ได้พร้อมเหตุผลที่ชัดเจน
- [ ] ผลงานใหม่มี listing และ independent buyer entitlements ของตัวเอง ไม่โอน token ต้นทางมาเป็นสินค้าของคนอื่น
- [ ] ถ้าต้นทางอนุญาต derivative sale ขายพร้อม source ได้โดยไม่มี source-redistribution toggle เพิ่มอีกชั้น
- [ ] เก็บ provenance ที่ตรวจย้อนกลับได้ และใช้ encrypted IPFS/publishing flow เดียวกับผลงานปกติ
- [ ] การซื้อ derivative บน Fuji แบ่ง seller/platform 90/10 และ sponsor ออก purchase gas ไม่มีส่วนแบ่งกลับต้นทาง
- [ ] ผู้ซื้อ derivative รับ source และ update ผ่านสิทธิ์ของ listing ใหม่ได้ ไม่ได้รับสิทธิ์แยกใน listing ต้นทางโดยอัตโนมัติ
- [ ] ทดสอบ allowed publication กับ blocked upstream case และ full purchase/download ของ derivative จริง

## Verification evidence

แสดง source listings → confirmed U-Bot output → new listing → Fuji purchase → buyer ZIP พร้อม proof ว่าไม่มี upstream royalty deduction
