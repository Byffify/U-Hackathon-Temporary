# 03: Discover, search, and try creator projects

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** ผู้ชมค้นพบผลงานจากหลายผู้สร้าง ค้นหาจากชื่อหรือรายละเอียด เปิดโปรไฟล์และหน้าผลงาน แล้วทดลองผ่าน demo URL เดิมได้โดยไม่ต้อง login
**Blocked by:** 02 — Publish a listing with encrypted source on IPFS.
**Status:** needs-info
**Spec coverage:** User stories 1–5; discovery and demo navigation.

## Acceptance criteria

- [ ] Explore แสดงรายการที่เผยแพร่จริงจากหลายบัญชี พร้อมภาพ ชื่อผู้สร้าง ราคา และ stack
- [ ] ค้นหาชื่อและรายละเอียดได้ มีสถานะกำลังโหลด ไม่มีผลงาน ไม่มีผลค้นหา และโหลดผิดพลาด
- [ ] เปิดรายละเอียดและโปรไฟล์สาธารณะได้ มีรายการผลงานของผู้สร้างและ public profile URL ที่นำไปใส่ résumé ได้
- [ ] หน้ารายละเอียดแสดงเงื่อนไขสิทธิ์ก่อนซื้อ และบอกว่า demo เป็นเว็บไซต์ที่ผู้สร้างเผยแพร่ไว้
- [ ] เปิด demo URL ได้ กรณีไม่มีหรือใช้ไม่ได้ไม่ทำให้หน้ารายละเอียดเสีย และไม่อ้างว่าปกปิดโค้ด frontend ทั้งหมด
- [ ] ใช้ภาษาอังกฤษใน UI และตรวจหน้า Explore, profile และรายละเอียดทั้ง desktop กับหน้าจอแคบ
- [ ] ทดสอบค้นพบ/ค้นหา/เปิดโปรไฟล์กับรายการที่สร้างผ่าน publishing flow ไม่ใช่เฉพาะ hardcoded cards

## Verification evidence

แสดงการค้นหาและเปิด demo จากรายการจริงอย่างน้อยสองผู้สร้าง พร้อมผลตรวจพฤติกรรมและภาพหน้า desktop/หน้าจอแคบ
