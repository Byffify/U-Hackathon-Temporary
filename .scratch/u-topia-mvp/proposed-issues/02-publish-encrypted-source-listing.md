# 02: Publish a listing with encrypted source on IPFS

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** ผู้สร้างกรอกข้อมูล ภาพ demo URL ราคา test AVAX และเงื่อนไขสิทธิ์ อัปโหลด ZIP ที่เข้ารหัสก่อน pin บน IPFS แล้วเผยแพร่หน้าผลงานได้เองโดยไม่ต้องรอแอดมิน
**Blocked by:** 01 — Wallet account and creator profile.
**Status:** needs-info
**Spec coverage:** User stories 4, 5, 10–15, 17; listings, source encryption, and publication.

## Acceptance criteria

- [ ] ผู้สร้างลงชื่อ รายละเอียด ภาพ stack demo URL ราคา และเงื่อนไขใช้งาน/ดัดแปลงได้ โดยเลือกอนุญาตขายสิทธิ์เดิมต่อแยกจากขายผลงานต่อยอด
- [ ] ใช้ ZIP เป็นแหล่ง source และรักษา stack เดิมของผู้สร้าง ไม่มีการบังคับแปลง framework
- [ ] มีการตรวจข้อมูลและ archive ก่อนเข้ารหัส ไม่รัน script ที่อัปโหลดบน application server
- [ ] ใช้การเข้ารหัสที่ตรวจความถูกต้องของข้อมูลได้ก่อนส่ง IPFS; ciphertext ที่ดึงกลับจาก CID เปิดเป็น source ZIP ตรง ๆ ไม่ได้
- [ ] Backend เก็บกุญแจนอกเชนโดยไม่รั่วใน listing, metadata, log หรือ public response พร้อมวิธีกู้คืนข้อมูลและกุญแจที่ตรวจได้
- [ ] เผยแพร่ทันทีหลังข้อมูลและ storage สำเร็จ มีหน้ารายละเอียดสาธารณะและลิงก์ demo เดิม; storage ล้มเหลวไม่แสดงรายการพร้อมขาย
- [ ] ผู้สร้างแก้เฉพาะรายการของตัวเองได้ ภาพ/ข้อมูลสาธารณะไม่เปิดเผย source ที่ยังไม่ได้อนุญาต
- [ ] ทดสอบ upload/publish สำเร็จ, ข้อมูลไม่ครบ, archive ใช้ไม่ได้, ciphertext ถูกแก้ และ IPFS ล้มเหลว

## External prerequisites

IPFS pinning, persistent storage และ server-side key protection ต้องตั้งค่าจริงเพื่อปิด ticket การทดสอบด้วย adapter จำลองอย่างเดียวไม่ผ่านการส่งมอบ IPFS

## Verification evidence

แสดงหน้าผลงานที่เผยแพร่จริงและ CID ของ ciphertext พร้อมผลทดสอบการป้องกัน source/key disclosure
