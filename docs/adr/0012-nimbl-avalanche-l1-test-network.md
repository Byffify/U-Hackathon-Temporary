# ใช้เครือข่ายทดสอบ NIMBL สำหรับ frontend และ marketplace

ผู้ใช้ระบุ Avalanche L1 สำหรับการทดสอบใหม่ โดยมี EVM chain ID 174511, RPC `https://nodes-prod.43.207.73.245.sslip.io/ext/bc/2BypykXr6eM22uoNFNV6fNcDHQJrN5fUQG5CjbjjQzPYZzjZXh/rpc`, explorer `https://2bypykxr.firn.gg` และ native gas token ชื่อ NIMBL การตัดสินใจนี้แทนที่เครือข่าย Fuji และ test AVAX ใน ADR-0004 สำหรับ frontend และการ deploy marketplace รุ่นปัจจุบัน

## Consequences

- Frontend ขอให้ wallet สลับหรือเพิ่ม chain 174511 พร้อมแสดงยอด native เป็น NIMBL และอ่าน marketplace address จาก `VITE_MARKETPLACE_ADDRESS`
- Contract บันทึก chain ID ณ เวลา deploy; EIP-712 authorization ผูกกับ chain ID และ contract address เพื่อไม่ให้ลายเซ็นใช้ข้าม deployment
- สคริปต์ deploy ของ NIMBL ตรวจ chain ID ก่อนส่งธุรกรรมและต้องมี NIMBL สำหรับ gas; สคริปต์ Fuji เก่ายังใช้แยกได้
- อัตราแบ่งรายได้ 90/10 และข้อจำกัดเรื่อง gas สำหรับธุรกรรมฝากเงินตาม ADR-0011 ยังเหมือนเดิม แต่หน่วยเงินเป็น NIMBL บนเครือข่ายนี้
- การเชื่อม wallet ไม่ใช่การยืนยันบัญชีกับ backend และยังไม่มีการส่งธุรกรรมซื้อใน frontend
