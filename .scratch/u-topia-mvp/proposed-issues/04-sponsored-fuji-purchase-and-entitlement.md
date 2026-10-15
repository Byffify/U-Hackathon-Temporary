# 04: Sponsored Fuji purchase with a 90/10 split

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** ผู้ซื้อเห็นเงื่อนไขแล้วจ่ายเฉพาะราคาสินค้าเป็น test AVAX บน Fuji รับ token สิทธิ์ของตัวเอง ผู้ขายรับ 90% แพลตฟอร์มหัก 10% และเป็นผู้จ่าย gas ของการซื้อ รวม contract, payment authorization, backend และ UI ซื้อจริงใน slice นี้
**Blocked by:** 02 — Publish a listing with encrypted source on IPFS.
**Status:** needs-info
**Spec coverage:** User stories 9, 18–21, 26, 27, 47; settlement and gas sponsorship.

## Acceptance criteria

- [ ] เลือกและบันทึกแนวทาง token/settlement ที่รองรับผู้ซื้อหลายคน เงื่อนไขสิทธิ์ที่บันทึกตอนซื้อ และการขายต่อแบบมีเงื่อนไข
- [ ] Buyer identity, listing, seller, price, terms และเครือข่ายตรวจได้จากแหล่งที่เชื่อถือได้ ไม่เชื่อราคา/address ที่ browser ส่งมาอย่างเดียว
- [ ] มี Fuji-compatible sponsorship ที่อนุมัติการใช้ test AVAX ของผู้ซื้อได้ โดย sponsor จ่าย gas ไม่ใช่จ่ายราคาสินค้าแทนผู้ซื้อ
- [ ] การซื้อหนึ่งครั้งจ่าย seller เท่ากับราคาลบ fee และ fee เท่ากับ 10% ใน integer units พร้อมกฎปัดเศษที่ไม่ทำให้ยอดรวมคลาดเคลื่อน
- [ ] ผู้ซื้อหลายบัญชีซื้อรายการเดียวกันได้และได้รับ entitlement อิสระ พร้อมสถานะยืนยันจริงและ transaction reference ใน UI
- [ ] พิสูจน์จากยอดและ receipt ว่าผู้ซื้อไม่มี purchase-gas debit เพิ่ม ผู้ขายได้รับ 90% ตามการปัดเศษ และ sponsor เป็นผู้รับต้นทุน gas
- [ ] ตรวจ signature/authorization แบบมีอายุและใช้ครั้งเดียว ป้องกัน replay, wrong price, wrong chain และการใช้ sponsor เป็น arbitrary relay
- [ ] ทดสอบ wallet rejection, buyer funds ไม่พอ, sponsor ใช้งานไม่ได้, reverted transaction และ repeated notification โดยไม่แสดงว่าซื้อสำเร็จผิดจริง
- [ ] ต่ออายุ/เปลี่ยนข้อมูล listing ไม่แก้เงื่อนไขที่ entitlement เก่าซื้อไว้โดยเงียบ

## External prerequisites

ต้องมีแนวทาง sponsorship ที่ทดสอบกับ native test AVAX ได้จริง พร้อม RPC, deployment wallet, sponsor funding และบริการที่จำเป็น การเลือกวิธีที่ยังทำให้ผู้ซื้อจ่าย gas แยกไม่ผ่าน spec หากไม่มีบริการพร้อม ให้รายงาน blocker ของ ticket นี้โดยไม่ทำให้ discovery/publishing หยุดตาม

## Verification evidence

Fuji contract address, transaction references ของผู้ซื้ออย่างน้อยสองคน และ balance/receipt accounting ที่พิสูจน์ fee กับผู้จ่าย gas จริง
