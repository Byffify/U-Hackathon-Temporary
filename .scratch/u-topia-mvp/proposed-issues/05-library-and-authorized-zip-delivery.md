# 05: My Library and authorized ZIP delivery

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** ผู้ซื้อเห็นโปรเจกต์ที่มีสิทธิ์ใน My Library และรับ source ZIP หลัง backend ตรวจสิทธิ์บนเชน ผู้ไม่มีสิทธิ์ถูกปฏิเสธ และการรับไฟล์ผิดพลาดลองใหม่ได้โดยไม่ซื้อซ้ำ
**Blocked by:** 04 — Sponsored Fuji purchase with a 90/10 split.
**Status:** needs-info
**Spec coverage:** User stories 22–24, 31; access control and delivery retries.

## Acceptance criteria

- [ ] Library ดึงสิทธิ์ที่ผูกกับ authenticated wallet และแสดงสถานะซื้อจริง ไม่ปลดล็อกจาก browser flag
- [ ] Backend ตรวจ Fuji, authoritative contract, current holder และ listing ก่อนใช้กุญแจถอดรหัส ZIP
- [ ] Download ของ wallet ที่ถือสิทธิ์คืน archive ถูกต้องตรง release และใช้เองได้ โดยไม่ต้อง U-Bot หรือ deploy service
- [ ] Wallet ที่ไม่ถือสิทธิ์ใช้ CID, entitlement ID หรือ transaction hash ของผู้อื่นเปิด source ไม่ได้ และใช้เป็น U-Bot source ไม่ได้
- [ ] ลิงก์ดาวน์โหลด/session ของผู้ซื้อคนหนึ่งไม่กลายเป็น public reusable bypass ให้ wallet อื่น
- [ ] Network/storage download failure ลองใหม่ได้โดยไม่ส่งธุรกรรมซื้อใหม่ และ RPC failure ไม่ทำให้ access check ถูกข้าม
- [ ] แสดง UI downloading/error/retry และระบุว่า source ที่ส่งมอบแล้วไม่สามารถเรียกคืนสำเนาได้
- [ ] ทดสอบ source access denial และ allowed download หลัง real purchase รวม duplicate delivery requests

## Verification evidence

เปรียบเทียบ source ZIP ที่ได้รับกับต้นฉบับ และแสดงการปฏิเสธ wallet ที่ยังไม่ได้ซื้อโดยไม่มี secret ใน evidence
