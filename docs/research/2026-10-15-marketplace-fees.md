# ค่าธรรมเนียมตลาดเทียบเคียง U-topia

ตรวจสอบ: 15 ตุลาคม 2026 จากแหล่งทางการ ข้อมูลนี้เป็น benchmark เพื่อเลือกอัตรา ยังไม่ใช่การตัดสินใจเปลี่ยน ADR-0003

## ตัวเลขที่ตรวจสอบได้

| แพลตฟอร์ม / ช่องทาง | ค่าธรรมเนียม | สิ่งที่ต้องแยกก่อนเทียบ |
| --- | --- | --- |
| Envato Market: ThemeForest / CodeCanyon | Author fee 50% ของ **item price** | มี buyer fee แยกใน list price จึงไม่ใช่ 50% ของราคาสุดท้ายทั้งหมด; ตาราง exclusive/non-exclusive แบบเก่าไม่ควรใช้เป็นอัตราปัจจุบัน [เอกสาร Earnings](https://help.author.envato.com/hc/en-us/articles/360000472943-Introduction-to-Earnings) |
| Codester | ผู้สร้างรับ 70% ของยอดขายที่เข้าเกณฑ์ หรือส่วนแพลตฟอร์ม 30% โดยอนุมานจาก 100−70 | ไม่บังคับขายที่เดียว รับขาย source code, scripts, themes และ plugins พร้อม checkout / ส่งไฟล์ [Seller program](https://www.codester.com/info/seller) |
| Gumroad: ขายผ่านโปรไฟล์หรือลิงก์ตรง | 10% + US$0.50 ต่อรายการ | **ไม่รวม** card processing 2.9% + US$0.30 หรือ PayPal fees; ไม่มีค่ารายเดือน [Fees](https://gumroad.com/help/article/66-gumroads-fees), [Pricing](https://gumroad.com/pricing) |
| Gumroad Discover | 30% ต่อรายการ | รวม processing แล้ว เป็นช่องทางที่ marketplace ช่วยหาลูกค้า [Fees](https://gumroad.com/help/article/66-gumroads-fees) |
| Lemon Squeezy: ecommerce | อัตราฐาน 5% + US$0.50 ต่อรายการ | รวม processing และบริการ Merchant of Record; ไม่มีค่ารายเดือน ecommerce แต่เพิ่ม 1.5% สำหรับธุรกรรมนอกสหรัฐฯ, 1.5% สำหรับ PayPal และ 0.5% สำหรับ subscription ตามกรณี [Pricing](https://www.lemonsqueezy.com/pricing), [Fees](https://docs.lemonsqueezy.com/help/getting-started/fees) |

Gumroad มีส่วนลดตามปริมาณ: เมื่อ paid sales ในเดือนปฏิทินถึง US$20,000 ยอดขายตรงใหม่ในเดือนนั้นลดเป็น 5% + US$0.50; Discover ยัง 30% และ processing ยังต้องพิจารณาต่างหาก [Gumroad Fees](https://gumroad.com/help/article/66-gumroads-fees)

ทั้ง Gumroad และ Lemon Squeezy ให้บริการ Merchant of Record ซึ่งรวมงานจัดเก็บและนำส่งภาษีการขายตามบริการของตน อัตรานี้จึงเทียบกับค่าธรรมเนียม smart contract อย่างเดียวไม่ได้ [Gumroad Pricing](https://gumroad.com/pricing), [Lemon Squeezy Pricing](https://www.lemonsqueezy.com/pricing)

## ข้อเสนอสำหรับ U-topia

ไม่มี “ค่าเฉลี่ยตลาด” ที่สรุปได้อย่างน่าเชื่อถือจากตัวอย่างนี้ เพราะฐานคำนวณ บริการ และแหล่งลูกค้าต่างกัน ตลาด source/template ที่ดูมีส่วนแพลตฟอร์ม 30% หรือ author fee 50% บนฐานเฉพาะ ขณะที่การขายตรงเริ่มต่ำกว่าและอาจมีค่าคงที่/processing เพิ่ม

ข้อเสนอเชิงผลิตภัณฑ์: เริ่ม **10% ของราคาขาย** เป็นอัตราทดลองที่สื่อสารง่าย ผู้ขายรับ 90% ก่อนค่าใช้จ่ายอื่น ไม่มีค่าคงที่ต่อคำสั่งซื้อ และแสดง gas แยกให้ชัดเจน อัตรานี้เป็นข้อเสนอของเรา ไม่ใช่อัตรามาตรฐานตลาดหรือหลักฐานว่าคุ้มทุนแน่นอน

ก่อนยืนยันความยั่งยืน ต้องประมาณต้นทุน IPFS pinning, storage, backend, การดูแลกุญแจ, support และการใช้งาน U-Bot โดยเฉพาะ AI ไม่จำกัดที่อาจมีต้นทุนต่อผู้ใช้เกินค่าธรรมเนียมจากการขายครั้งเดียว จึงควรกำหนดโควตาหรือราคาการใช้งาน AI แยกให้ชัดเจน อัตรา 5% ก็ใช้เป็นโปรโมชันเริ่มต้นได้ แต่ยังไม่มีข้อมูลต้นทุนรองรับว่าพอสำหรับทุกฟีเจอร์

อัตราสำหรับ license resale ต้องตกลงแยกว่าคิดเหมือนยอดขายแรกหรือไม่; การไม่มี upstream royalty ของ derivative sale ยังคงเป็นไปตาม ADR-0003
