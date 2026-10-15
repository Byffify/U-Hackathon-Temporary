# 07: Resell an existing entitlement with atomic settlement

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** ผู้ถือสิทธิ์เสนอขาย token สิทธิ์เดิมได้เมื่อเงื่อนไขอนุญาต ผู้ซื้อใหม่จ่าย test AVAX และรับสิทธิ์พร้อมกัน ผู้ขายเดิมเสียสิทธิ์ download/update ภายใต้ token นั้น โดยผู้ซื้อคนอื่นของรายการไม่ถูกกระทบ
**Blocked by:** 06 — Free listing updates for existing rights holders.
**Status:** needs-info
**Spec coverage:** User stories 28–31; resale restrictions and transferred update access.

## Acceptance criteria

- [ ] UI ให้ผู้ถือสิทธิ์เสนอขายได้เฉพาะ entitlement ที่ตนถือและอนุญาต resale แสดงราคาและเงื่อนไขให้ผู้ซื้อใหม่ตรวจ
- [ ] การชำระราคา โอน entitlement และแบ่ง 90/10 เป็น atomic settlement บน Fuji โดยการซื้อขายต่อใช้ purchase-gas sponsorship ตาม spec
- [ ] Current holder และ resale permission ตรวจใน contract การส่ง token โดยตรงไม่ใช่ทางเลี่ยงข้อจำกัด
- [ ] หลังขายต่อ wallet ใหม่ download source และรับอัปเดตจากรายการเดิมได้ Wallet เก่าเข้าถึงใหม่ด้วย entitlement ที่โอนแล้วไม่ได้
- [ ] Entitlement อิสระที่ยังถืออยู่อีกใบและผู้ซื้อคนอื่นไม่เสียสิทธิ์ตามไปด้วย
- [ ] Reject stale offer, replay, offer จากคนไม่ใช่เจ้าของ และรายการที่ห้าม resale โดยไม่มี partial payment
- [ ] โอนสิทธิ์ไม่สร้างหรือโอนโควตา U-Bot และไม่มีข้อความอ้างว่าลบ ZIP ที่เคยดาวน์โหลดแล้วได้
- [ ] ตรวจพฤติกรรมหลัง transfer ทั้ง public offer, library, source endpoint และ update delivery

## Verification evidence

Fuji resale transaction และการทดสอบ wallet เก่า/ใหม่/ผู้ซื้ออิสระ พร้อม accounting ที่ยืนยัน fee และ sponsor
