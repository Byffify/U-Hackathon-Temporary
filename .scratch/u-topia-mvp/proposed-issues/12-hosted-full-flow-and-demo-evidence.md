# 12: Hosted full-flow acceptance and hackathon demo evidence

**Parent:** [U-topia MVP spec](../spec.md)
**Review:** Draft — proposed breakdown awaiting user review; not published to the implementation queue.
**What to build:** เปิด application ผ่าน hosted URL แล้วทำเส้นทางหลักตั้งแต่ค้นพบ ทดลอง ซื้อ รับอัปเดต ขายสิทธิ์ต่อ รวมฟีเจอร์ และขายผลงานใหม่ซ้ำได้ พร้อมหลักฐานบริการจริงและรายการข้อจำกัดที่ยังเหลือ
**Blocked by:** 03 — Discover, search, and try creator projects; 07 — Resell an existing entitlement with atomic settlement; 11 — Publish and sell a permitted composed project.
**Status:** needs-info
**Spec coverage:** All stories as integrated acceptance; real integration and demo acceptance in the parent spec.

## Acceptance criteria

- [ ] Hosted frontend/backend, persistent account/job/key storage, actual IPFS, Fuji contract และ sponsor เชื่อมกันจริง ใช้งานหลัง restart ได้
- [ ] เตรียม creators/buyers และ code fixtures ที่สิทธิ์ชัดเจนให้สาธิตผู้ซื้ออิสระหลายคนในรายการเดียวได้ โดยไม่ต้องแก้ข้อมูลหลังบ้านระหว่าง flow
- [ ] Demo discovery/search/profile/demo URL, publish, sponsored purchase, denied/allowed ZIP access และ free update ผ่าน UI จริง
- [ ] Demo permitted resale, blocked resale และ current-holder download/update โดยไม่กระทบผู้ซื้ออิสระรายอื่น
- [ ] Demo multiple-source feature planning, free-text additions, chosen stack, quota shortage/edit/re-estimate, explicit confirm และ real-model output ZIP ที่ผ่าน build ตัวอย่าง
- [ ] เลือก source ได้เกินสองรายการ และสาธิต mixed-stack planning พร้อม transformation ที่ตรวจแล้วหรือ conflict ที่ต้องแก้แผนอย่างตรงไปตรงมา
- [ ] Demo derivative publication/purchase/download โดยไม่มี upstream royalty และหัก fee 10% ตามจริง
- [ ] ตรวจ English UI ทั้ง desktop/หน้าจอแคบ รวม pending/error/retry states ที่เกี่ยวข้อง ไม่เพิ่ม feature scope ระหว่าง final check
- [ ] มี transaction references, IPFS ciphertext evidence, automated test results และ output validation report ที่ไม่มี secret
- [ ] แยกสิ่งที่ผ่านจริง สิ่งที่ทดสอบด้วย doubles และ external blockers อย่างชัดเจน ไม่ปิด ticket หาก real model หรือ purchase sponsorship ยังใช้ไม่ได้
- [ ] มีขั้นตอนเริ่มเดโม การตั้งค่าที่จำเป็น และกู้คืนข้อมูล/กุญแจที่เพียงพอให้ทำซ้ำได้ โดยไม่เปิด mainnet หรือ deploy ผลงานให้ลูกค้า

## Verification evidence

Hosted URL, Fuji deployment/transaction references, test summary, source/output fixture references และ demo script ที่ทำซ้ำได้ตามกำหนดส่ง
