# 06: Free listing updates for existing rights holders

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** ผู้สร้างเผยแพร่ ZIP เวอร์ชันใหม่ในรายการเดิม แล้วผู้มีสิทธิ์เดิมเห็นและดาวน์โหลดอัปเดตได้โดยไม่ซื้อซ้ำ
**Blocked by:** 05 — My Library and authorized ZIP delivery.
**Status:** needs-info
**Spec coverage:** User stories 16, 25; versioned releases and purchased terms.

## Acceptance criteria

- [ ] เจ้าของรายการอัปโหลด release ใหม่ที่เข้ารหัสและจัดเก็บสำเร็จได้ คนอื่นเผยแพร่ release แทนไม่ได้
- [ ] Library และหน้ารายละเอียดบอก release ที่พร้อมรับ ผู้ที่ซื้อก่อน release ใหม่ดาวน์โหลดได้โดยไม่เสียเงินเพิ่ม
- [ ] การเผยแพร่ release ล้มเหลวไม่ทำให้ source เวอร์ชันที่พร้อมใช้อยู่หายหรือแสดง ZIP ใหม่ว่าพร้อมทั้งที่ยังไม่สำเร็จ
- [ ] Listing ใหม่ไม่สืบทอดผู้ซื้อของ listing เก่า แม้เป็นผู้สร้างคนเดียวกัน
- [ ] สิทธิ์รับอัปเดตอิง current entitlement holder และเงื่อนไขตอนซื้อไม่เปลี่ยนย้อนหลังเพียงเพราะเปลี่ยน listing metadata
- [ ] ทดสอบซื้อ release แรก เพิ่ม release สอง รับด้วยสิทธิ์เดิม ปฏิเสธผู้ไม่มีสิทธิ์ และการลงเป็น listing ใหม่

## Verification evidence

แสดง source สองเวอร์ชันและการรับอัปเดตด้วย entitlement เดิมโดยไม่มี purchase transaction เพิ่ม
