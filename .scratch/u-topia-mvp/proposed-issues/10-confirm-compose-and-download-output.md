# 10: Confirm, compose, and download a validated output ZIP

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** ผู้ใช้ยืนยันแผนล่าสุด U-Bot สำรองโควตาแล้วรวมฟีเจอร์จริงใน workspace แยก แสดงความคืบหน้า ผลตรวจ และให้ดาวน์โหลดโค้ด ZIP พร้อมวิธีรันและข้อมูลต้นทาง
**Blocked by:** 09 — Analyze source features and review a composition plan.
**Status:** needs-info
**Spec coverage:** User stories 41, 44–47; job execution, quota reservation, isolated validation, and output.

## Acceptance criteria

- [ ] เริ่ม generation จากการยืนยัน plan revision ปัจจุบันเท่านั้น Recheck source rights และ reserve quota แบบ atomic ก่อนส่งงาน
- [ ] Double-confirm ไม่สร้างงานซ้ำ และ concurrent jobs ใช้ quota ก้อนเดียวเกิน balance ไม่ได้
- [ ] มีสถานะ generating/completed/failed พร้อม job history ที่ยังอยู่หลัง refresh และรายละเอียดแก้ปัญหาที่ไม่เปิด secret
- [ ] งานรวมใช้ source/features ตามแผนจริง ทำใน workspace/resource limits ที่แยกจาก application server และเคารพ chosen target stack
- [ ] Meter usage ภายในงบที่ reserve หยุดงานแทนการใช้เกินเงียบ ๆ คืน reservation ที่ไม่ได้ใช้ และบันทึก provider usage ที่เกิดขึ้นจริงแม้งานล้มเหลว
- [ ] ส่ง ZIP ของ integrated output พร้อม setup/run instructions, dependency notes, license notices และ provenance ของ source releases
- [ ] ตรวจ archive integrity และ static/build checks ที่ทำได้ใน isolation รายงาน passed/failed/not-run ตามจริง ไม่แสดง failed build ว่าผ่าน
- [ ] ทดสอบ quota race, repeated confirmation, revoked source rights, provider failure, validation failure และ authorized output download
- [ ] Demonstrate real-model composition จาก fixtures ที่ใช้ได้ตามสิทธิ์ และ build ผลลัพธ์ตัวอย่างสำเร็จ ไม่แทนด้วย boilerplate ที่ไม่สัมพันธ์กับ source

## External prerequisites

Real model, quota budget configuration และ isolated execution environment ที่จำเป็นต่อการตรวจ output ต้องพร้อมตาม ticket 09 ไม่มีบริการ deploy ผลงานลูกค้าใน ticket นี้

## Verification evidence

เก็บ job/plan reference, metered usage, ผล build ของ output และ ZIP ที่ตรวจย้อนถึง source features ได้ พร้อม failure-path evidence
