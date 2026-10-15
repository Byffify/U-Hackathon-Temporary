# 09: Analyze source features and review a composition plan

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** U-Bot อ่าน source ที่มีสิทธิ์แล้วเสนอรายการฟีเจอร์ ผู้ใช้เลือกหรือพิมพ์เพิ่ม เลือก stack เป้าหมาย เห็นแผนและโควตาที่จะใช้ แล้วปรับเพิ่ม/ลด/เปลี่ยนได้ก่อนเริ่มสร้างโค้ด
**Blocked by:** 08 — Select composition sources and activate account trial quota.
**Status:** needs-info
**Spec coverage:** User stories 36–40, 43, 47; real-model analysis and plan revision.

## Acceptance criteria

- [ ] ใช้ model adapter และ API จริงเพื่อวิเคราะห์ exact source releases ไม่คืน feature list ที่ hardcode แล้วอ้างว่าเป็นผลจาก AI
- [ ] บอก quota cost ของขั้นวิเคราะห์ก่อนเริ่ม และบันทึก metered analysis usage แยกจาก generation
- [ ] ผู้ใช้เลือก suggested source features และพิมพ์ requirement เพิ่มได้ พร้อมเลือก target stack โดยระบบไม่เปลี่ยนเองก่อนยืนยัน
- [ ] แสดงแผนที่ระบุ features, sources, target stack, dependencies/conflicts, estimated generation quota และ balance ที่เหลือ
- [ ] ปรับเพิ่ม/ลด/เปลี่ยน features หรือ sources/stack แล้วได้ plan revision และ estimate ใหม่ โดย revision เก่าใช้ยืนยันงานใหม่ไม่ได้
- [ ] Quota ไม่พอแสดง shortage ก่อน generation และเปิดให้แก้แผน ไม่มี automatic charge หรือ top-up flow
- [ ] กรณีต่าง stack ให้เสนอวิธีรวม/แปลงหรือข้อจำกัดที่ต้องปรับ ไม่สัญญาว่าทุกคู่รวมสำเร็จ
- [ ] การวิเคราะห์และดูแผนไม่เรียก generation endpoint; job คงอยู่ที่ awaiting confirmation
- [ ] Missing model configuration/provider failure แสดงสถานะจริงและไม่สร้างผลลัพธ์สำเร็จปลอม
- [ ] ทดสอบ revision invalidation, quota estimates, feature edits, conflict state และ no-generation-before-confirmation

## External prerequisites

ผู้ใช้พักการเลือก model provider ไว้ Ticket นี้จึงมี external blocker สำหรับ real integration จนกว่าจะมีเอกสาร/API และ configuration ที่ยืนยันแล้ว ต้องเลือก quota conversion จากต้นทุน provider โดยไม่ใช้ Tokenomist data API แทน code-generation model

## Verification evidence

แผนจาก real source ผ่าน real model พร้อม usage record, การแก้ feature และผลทดสอบว่ายังไม่มี generation call ก่อน confirm
