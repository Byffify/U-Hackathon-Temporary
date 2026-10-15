# UX/UI specification สำหรับสร้างเว็บใหม่โดยอ้างอิง Fastwork Selling

วันที่สำรวจ: 15 ตุลาคม 2026  
หน้าอ้างอิง: [Fastwork Selling ภาษาไทย](https://fastwork.com/th/selling) และ [ภาษาอังกฤษ](https://fastwork.com/selling)  
ขอบเขต: หน้า landing สำหรับชวนผู้ให้บริการ/ฟรีแลนซ์สมัครใช้งาน ไม่รวมหน้าหลังเข้าสู่ระบบ

> เอกสารนี้เป็นการถอดรูปแบบจากหน้าที่มองเห็นในเบราว์เซอร์ ไม่ใช่ design system ทางการของ Fastwork ค่าในหัวข้อ **วัดจากหน้าเว็บ** คือค่าที่ตรวจใน viewport เดสก์ท็อป 1280 × 720 และมือถือ 390 × 844 ส่วนค่าในหัวข้อ **ข้อเสนอสำหรับเว็บใหม่** เป็นแนวทางที่ควรปรับให้เข้ากับแบรนด์และธุรกิจใหม่

## 1. เป้าหมายและกลยุทธ์ UX

**เป้าหมายหลัก:** เปลี่ยนผู้ชมที่เป็นฟรีแลนซ์/ผู้ให้บริการให้เริ่มสมัครและสร้างโปรไฟล์  
**เป้าหมายรอง:** ให้เข้าใจคุณค่าของพอร์ตโฟลิโอ ความน่าเชื่อถือ วิธีรับงาน และเงื่อนไขค่าธรรมเนียมก่อนสมัคร

แนวคิดของหน้าอ้างอิงเรียงตามลำดับนี้:

1. **แรงบันดาลใจ:** ฮีโร่ภาพพอร์ตผลงานล้อมข้อความใหญ่ มี CTA และ countdown
2. **หลักฐานความน่าเชื่อถือ:** โปรไฟล์ตัวอย่าง สถิติ รีวิว ผลงาน และบริการที่สลับดูได้
3. **ปัญหาที่ผู้ชมรู้จัก:** sticky notes หลายใบในพื้นหลังเข้ม แสดง pain points ของฟรีแลนซ์
4. **เหตุผลเชิงเศรษฐกิจ:** อธิบายค่าธรรมเนียมจากลูกค้าที่พามาเองเทียบกับลูกค้าที่แพลตฟอร์มหาให้
5. **ความสามารถของระบบ:** พอร์ต/รีวิว การค้นพบ การชำระเงิน และการจัดการออเดอร์
6. **ปิดการขาย:** countdown และ CTA ซ้ำที่ส่วนท้าย

หลัก UX ที่ควรนำไปใช้: ใช้ CTA เดียวกันตลอดหน้า, ให้หลักฐานก่อนคำโฆษณา, อธิบายข้อจำกัดของราคา/ค่าธรรมเนียมใกล้ claim, และให้ผู้ชมเห็นหน้าตาผลลัพธ์จริงผ่านตัวอย่างที่โต้ตอบได้

## 2. สถาปัตยกรรมหน้าและลำดับคอนเทนต์

| ลำดับ | ส่วน | สิ่งที่ต้องมี | การกระทำของผู้ใช้ |
| --- | --- | --- | --- |
| 1 | Header | โลโก้, ตัวเลือกภาษา, CTA แบบ pill; ติดอยู่ด้านบนเมื่อเลื่อน | เปลี่ยนภาษา, เริ่มสมัคร |
| 2 | Hero | พาดหัว 2–3 บรรทัด, คำเด่นที่เป็นลายมือ/แอนิเมชัน, คำอธิบาย 1 บรรทัด, ภาพพอร์ตตามขอบ, countdown 4 ช่อง, CTA หลัก/รอง, scroll cue | เริ่มสมัคร, ไปอีเวนต์, เลื่อน |
| 3 | Human value + profile showcase | พาดหัวและ supporting copy, ชุดหมวดอาชีพ, โปรไฟล์ตัวอย่างขนาดใหญ่, สถิติ, แท็บผลงาน/บริการ/รีวิว/เกี่ยวกับ | สลับอาชีพและแท็บ |
| 4 | Social proof | จำนวนผู้ใช้/โปรไฟล์ และ CTA ซ้ำ | เริ่มสมัคร |
| 5 | Pain points | พื้นเข้ม, หัวข้อสั้น, sticky notes สีพาสเทล | อ่าน/ลากโน้ต หากมีการลากจริง |
| 6 | Fee proposition | แผงสีขาวมุมโค้ง, 2 กรณีค่าธรรมเนียม, ภาพประกอบ, ปุ่มข้อมูลเพิ่มเติม | เปิดโมดัลอธิบาย |
| 7 | Feature showcase | การ์ดภาพและข้อความสลับซ้ายขวา 4 เรื่อง: portfolio/reviews, discovery, payment, orders | เลื่อนอ่าน |
| 8 | Final CTA + footer | พาดหัวปิด, countdown, CTA หลัก/รอง, ข้อมูลบริษัท, privacy link | เริ่มสมัคร/ไปอีเวนต์ |

**เส้นทางที่ตรวจได้:** กด “เริ่มเลย” แล้วไป `/login?redirectTo=%2Fselling%2Fonboard...` เพื่อเข้าสู่ระบบก่อน onboarding; ไม่สามารถยืนยันขั้นตอน onboarding หลังล็อกอินจากหน้าสาธารณะได้

**ข้อเสนอสำหรับเว็บใหม่:** ออกแบบ onboarding ต่อจาก CTA เป็น 4 ขั้น: เลือกประเภทผู้ใช้ → ข้อมูลพื้นฐาน → สร้างโปรไฟล์/อัปโหลดผลงาน → ตรวจและเผยแพร่ ให้บันทึกความคืบหน้าและกลับมาทำต่อได้

## 3. Visual direction

ลักษณะโดยรวมคือ **editorial + product demo**: ฉากหลังขาวสว่าง, ตัวพิมพ์ใหญ่ที่เว้นพื้นที่มาก, ภาพผลงานจริงเป็นองค์ประกอบตกแต่ง, การ์ด product UI สีขาว และช่วงพื้นเข้มเพื่อแบ่งจังหวะ การ์ดและปุ่มใช้มุมโค้งมาก; accent สีสดใช้เฉพาะภาพ/ข้อความสำคัญ ไม่แย่ง CTA

### ค่าที่วัดจากหน้าเว็บ

| รายการ | ค่า/ลักษณะที่พบ |
| --- | --- |
| ฟอนต์ CSS หลัก | `Google Sans` พร้อม system sans fallbacks; ต้องตรวจสิทธิ์การใช้ฟอนต์ก่อนนำไปใช้เว็บใหม่ |
| สีพื้น body | `#F5F5F3` |
| พื้น section สว่าง | `#FFFFFF` |
| พื้น section เข้ม / CTA | `#131922` |
| สีข้อความส่วนใหญ่ | `#2B313B`; บางการ์ดใช้ `#171717` |
| หัวข้อ Hero เดสก์ท็อป | 57.6px / line-height 66.24px / weight 500 |
| หัวข้อ Hero มือถือ | 40px / line-height 46px / weight 500 |
| หัวข้อ section เดสก์ท็อป | 48px / line-height 55.2px / weight 500 |
| หัวข้อ section มือถือ | 36px / line-height 41.4px / weight 500 |
| หัวข้อ feature | 40px / line-height 46px / weight 400 |
| ปุ่มหลัก | พื้น `#131922`, ตัวอักษรขาว, radius 999px; เดสก์ท็อปตัวอักษร 16px, มือถือ header 14px |
| แผง fee | พื้นขาว, radius 32px, padding เดสก์ท็อปประมาณ 56px ด้านข้าง |
| Feature cards | radius ประมาณ 24px |
| ระยะ section ที่วัดได้ | ส่วนโปรไฟล์ใช้ padding แนวนอน 56px; ส่วน pain ใช้ 96px ด้านบน/56px ด้านข้าง/80px ด้านล่าง |

### ข้อเสนอ design tokens สำหรับเว็บใหม่

ใช้ token แบบ semantic เพื่อเปลี่ยนแบรนด์ทีหลังได้ ไม่อ้างสี Fastwork โดยตรงในคอมโพเนนต์:

```css
:root {
  --color-page: #f5f5f3;
  --color-surface: #ffffff;
  --color-ink: #131922;
  --color-text: #2b313b;
  --color-muted: #737373;
  --color-subtle: #8d9197;
  --color-border: #e7e8ea;
  --color-on-dark: #ffffff;
  --color-success: #008a18;
  --color-info: #cae4ff;
  --color-warning: #ffe98a;
  --color-note-green: #b9edbc;
  --color-note-lilac: #d8c3fa;
  --color-note-peach: #ffb5ab;
  --color-note-yellow: #ffe6a1;
  --color-note-aqua: #b1eeea;

  --font-sans: "Noto Sans Thai", "Inter", system-ui, sans-serif;
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
  --space-7: 48px; --space-8: 64px; --space-9: 80px;
  --radius-sm: 8px; --radius-md: 16px;
  --radius-card: 24px; --radius-panel: 32px; --radius-pill: 999px;
  --container: 1136px;
  --shadow-card: 0 8px 32px rgba(19, 25, 34, .08);
  --focus-ring: 0 0 0 3px rgba(37, 99, 235, .45);
}
```

ข้อเสนอเรื่องฟอนต์: ใช้ฟอนต์ไทยที่ได้รับอนุญาต เช่น Noto Sans Thai สำหรับข้อความไทย และ Inter สำหรับตัวเลข/อังกฤษ ตรวจ line-height ภาษาไทยแยกจากอังกฤษ เพราะสระ/วรรณยุกต์ใช้พื้นที่แนวตั้งต่างกัน

### Type scale ที่ควรตั้งเป็น token

| Token | เดสก์ท็อป | มือถือ | ใช้กับ |
| --- | --- | --- | --- |
| Display | 56/1.15, 500 | 40/1.15, 500 | Hero และ CTA ท้าย |
| H2 | 48/1.15, 500 | 36/1.2, 500 | หัวข้อ section |
| H3 | 40/1.15, 400 | 28/1.2, 500 | Feature headings |
| Card title | 24/1.25, 500 | 20/1.3, 500 | ชื่อโปรไฟล์/การ์ด |
| Body | 16/1.5, 400 | 16/1.5, 400 | คำอธิบาย |
| Small | 14/1.45, 400 | 14/1.45, 400 | รายละเอียด/สถิติ |
| Caption | 12/1.4, 500 | 12/1.4, 500 | ป้ายสถานะ |

หน่วย `56/1.15` หมายถึง font-size 56px และ line-height 1.15 ตารางนี้เป็นข้อเสนอให้จัดระบบ ไม่ใช่ค่าที่วัดได้ทุกตัวจากเว็บอ้างอิง

## 4. Layout และ responsive

### ข้อเสนอสำหรับเว็บใหม่

- **Container:** กว้างสุด 1136–1200px; padding ข้าง 56px บนจอใหญ่, 24px บนแท็บเล็ต, 20px บนมือถือ
- **Grid:** 12 คอลัมน์บนเดสก์ท็อป, 8 บนแท็บเล็ต, 4 บนมือถือ; gap 24px/20px/16px
- **Breakpoints เริ่มต้น:** `sm 480`, `md 768`, `lg 1024`, `xl 1280` px; ทดสอบ breakpoint ตามจุดที่เนื้อหาเริ่มล้นจริง
- **Hero:** เดสก์ท็อปให้ข้อความกลางและผลงานลอยตามขอบ; มือถือย่อภาพประกอบไว้ตามขอบล่าง/ขอบข้าง ไม่บังข้อความหรือ CTA
- **Profile showcase:** เดสก์ท็อปเป็นหมวดอาชีพด้านซ้าย + การ์ดโปรไฟล์ด้านขวา; มือถือเป็นแท็บหมวดเลื่อนแนวนอน + การ์ดเรียงแนวตั้ง
- **Feature blocks:** เดสก์ท็อปใช้ภาพกับข้อความ 2 คอลัมน์สลับด้าน; มือถือใช้ภาพก่อนข้อความหนึ่งคอลัมน์
- **CTA:** บนมือถือปุ่มหลักและรองเรียงแนวตั้ง กว้างตามพื้นที่อ่านสบาย; header CTA ให้แสดงเมื่อเลื่อนลงและไม่บดบังเนื้อหา
- **Countdown:** 4 ช่องในแถวเดียวหากพอ; จอแคบมากให้ลดขนาดช่อง ไม่บีบตัวเลขจนอ่านไม่ได้
- **Modal:** เดสก์ท็อปกว้างประมาณ 600px; มือถือเป็น dialog เต็มความกว้างลบระยะขอบ 16px และ scroll ภายในได้

**สิ่งที่เห็นจริงบนมือถือ 390px:** หัวข้อ Hero ลดเหลือ 40px, countdown ยังอยู่ 4 ช่อง, CTA เรียงแนวตั้ง, feature cards เปลี่ยนเป็นหนึ่งคอลัมน์, footer เป็นแผงเข้มขนาดเกือบเต็มจอ

## 5. Component inventory และสถานะ

| Component | Props/ข้อมูล | States ที่ต้องออกแบบ |
| --- | --- | --- |
| `SiteHeader` | logo, locale, CTA | top/compact-on-scroll, light/dark backdrop, mobile |
| `LanguageSwitcher` | locale list, current locale | closed/open, selected, focus, keyboard navigation |
| `Button` | variant primary/secondary/ghost, size, icon, href/action | default, hover, focus-visible, pressed, disabled, loading |
| `Countdown` | target date, labels, timezone | running, expired, unavailable; ไม่แสดง 0 ปลอมเมื่อข้อมูลล้มเหลว |
| `PortfolioTeaser` | image/video, creator, occupation, city | loaded, loading, error, reduced motion |
| `OccupationTabs` | categories | selected, hover, focus, scroll overflow |
| `ProfilePreview` | avatar, cover, bio, badges, stats, tags, content | loading, empty, populated, unavailable |
| `ProfileSectionTabs` | portfolio/services/reviews/about | selected, focus, empty panel |
| `ServiceCard` | title, price, sold count, rating/review count | normal, no rating, long title, localized currency |
| `SocialProof` | verified count and label | live count, unavailable, stale |
| `PainNote` | short problem text, color | static or draggable, focus, moved, reset |
| `FeeExplanation` | cases, fee, cap, note | informational, expandable/modal |
| `InfoModal` | title, list of benefits, CTA | open/close, focus trap, Escape, backdrop click |
| `FeaturePanel` | illustration/product UI, heading, body | alternating desktop, stacked mobile |
| `FooterCTA` | heading, countdown, CTA links | normal, expired campaign |

### Interaction contract

1. **CTA:** ใช้ label และปลายทางเดียวกันทุกตำแหน่ง; เก็บ `source` ใน URL/analytics ตามตำแหน่งปุ่ม โดยไม่แสดง query string ใน UI
2. **Language:** เปลี่ยนภาษาแล้ว URL ควรสะท้อน locale (`/th/...`, `/en/...`) และคง section ที่กำลังอ่านเมื่อทำได้; dropdown ต้องใช้แป้นพิมพ์ได้
3. **Occupation tabs:** เปลี่ยนโปรไฟล์ตัวอย่างโดยไม่โหลดทั้งหน้า; อัปเดต `aria-selected`, panel และ URL hash แบบไม่ทำให้ scroll กระโดด
4. **Profile tabs:** เปลี่ยน panel ตามแท็บ; รักษาขนาดพื้นที่หรือมี skeleton เพื่อไม่ให้ layout กระโดด
5. **Pain notes:** หากให้ลาก ต้องมีทางเลือกสำหรับ touch/keyboard และไม่ทำให้ CTA ใช้ยาก; บนมือถืออนุญาตให้เป็นการ์ดนิ่ง
6. **Fee modal:** เปิดจากปุ่มข้อมูล; โฟกัสย้ายเข้า dialog, ปิดแล้วกลับปุ่มเดิม, Escape ปิดได้, เบื้องหลังไม่รับการโต้ตอบ
7. **Scroll effects:** ใช้เฉพาะเพื่อช่วยลำดับเรื่อง; เมื่อ `prefers-reduced-motion` ให้หยุด parallax/blur/drag animation และยังเห็นเนื้อหาทั้งหมด

## 6. ข้อกำหนดคอนเทนต์และข้อมูล

- เขียนพาดหัวแบบ **ผลลัพธ์ที่ผู้ใช้ได้** ไม่ใช่รายการฟีเจอร์; supporting copy ไม่เกิน 2–3 บรรทัดในมือถือ
- ใช้ตัวอย่างโปรไฟล์ที่มีสิทธิ์ใช้งานจริง หรือข้อมูลสมมติที่ระบุชัด; หลีกเลี่ยงการนำชื่อ รูป และผลงานจากหน้าอ้างอิงมาใช้ในเว็บใหม่
- ตัวเลข social proof, rating, รายได้ และงานที่ขาย ต้องมีแหล่งข้อมูลและเวลาอัปเดต ไม่ควร hard-code เป็น claim ที่ตรวจสอบไม่ได้
- ข้อความค่าธรรมเนียมต้องแยก **ค่าธรรมเนียมแพลตฟอร์ม**, **ค่าชำระเงิน**, **เพดาน**, **สกุลเงิน** และเงื่อนไขการนับให้ชัด; หน้าอ้างอิงระบุ 0% สำหรับลูกค้าที่พามาเอง และ 18% จนถึงเพดาน $100 สำหรับลูกค้าที่แพลตฟอร์มหาให้ แต่เว็บใหม่ต้องใช้เงื่อนไขธุรกิจของตนเอง
- มี copy ภาษาไทย/อังกฤษอย่างน้อย; ออกแบบการตัดบรรทัดและความยาวปุ่มสำหรับข้อความไทยโดยเฉพาะ
- ทำ `alt` สำหรับภาพที่ให้ข้อมูล, `aria-hidden` สำหรับภาพตกแต่ง, และ transcript/คำอธิบายสำหรับสื่อที่จำเป็นต่อการเข้าใจ
- แยกเนื้อหาเป็น CMS/data config: hero, profiles, proof count, fee rules, features, CTA, legal links เพื่อเปลี่ยนได้โดยไม่แก้ component

## 7. Accessibility และคุณภาพ

- ใช้ semantic landmarks (`header`, `main`, `section`, `footer`), H1 เดียว และลำดับ H2/H3 ต่อเนื่อง
- คอนทราสต์ข้อความปกติอย่างน้อย 4.5:1, ข้อความใหญ่/องค์ประกอบ UI อย่างน้อย 3:1; สีเทาอ่อนบนพื้นขาวของเว็บอ้างอิงควรทดสอบจริงก่อนใช้
- พื้นที่กดอย่างน้อย 44 × 44px สำหรับ controls บนมือถือ; focus-visible ชัดบนพื้นสว่างและเข้ม
- Tabs ต้องใช้ Arrow keys, Home/End, Enter/Space ตามแพตเทิร์นที่เลือก; modal ต้อง trap focus และ restore focus
- Countdown ต้องไม่ประกาศทุกวินาทีผ่าน screen reader; ประกาศเฉพาะเหตุการณ์สำคัญ
- การเคลื่อนไหวไม่ควรขวางการอ่าน; ทดสอบ `prefers-reduced-motion` และการซูม 200%
- ภาพ Hero/PDP ใช้ responsive images, lazy-load ภาพใต้ fold, ระบุขนาดล่วงหน้าเพื่อลด CLS; โหลดฟอนต์เฉพาะน้ำหนักที่ใช้
- ทดสอบอย่างน้อย 320, 390, 768, 1024, 1280 และ 1440px พร้อม keyboard-only และเบราว์เซอร์หลัก

## 8. Analytics ที่ควรเก็บ

| Event | Properties |
| --- | --- |
| `landing_view` | locale, campaign, viewport_group |
| `cta_click` | placement (`hero`, `header`, `profile`, `footer`, `modal`), locale |
| `language_change` | from, to |
| `occupation_select` | occupation |
| `profile_tab_select` | tab, occupation |
| `fee_info_open` | placement |
| `onboarding_start` | source, locale |
| `onboarding_step_complete` | step, elapsed_time |

วัด conversion หลักจาก `landing_view → onboarding_start → profile_published`; แยกตาม viewport/locale และอย่าใช้ scroll depth เป็นความสำเร็จแทนการสมัคร

## 9. ขั้นตอนสร้างเว็บใหม่

1. **กำหนดธุรกิจ:** เขียน value proposition, ผู้ใช้เป้าหมาย, CTA, เงื่อนไขราคา/ค่าธรรมเนียม และหลักฐานที่ยืนยันได้
2. **สร้างคอนเทนต์:** ร่างข้อความไทย/อังกฤษ ภาพตัวอย่างโปรไฟล์ที่มีสิทธิ์ใช้ รีวิว/สถิติจริง และ legal copy
3. **ทำ wireframe:** เริ่มจากมือถือ 390px แล้วขยายสู่ 1280px; ยืนยันลำดับ section และจำนวน CTA
4. **ตั้ง design tokens:** สี, ฟอนต์, type scale, spacing, grid, radius, shadow, motion, breakpoints จากหัวข้อ 3–4
5. **สร้าง components:** เริ่ม Button/Header/Section/Modal/Tabs/Card ก่อนประกอบแต่ละ section
6. **ประกอบหน้า:** Hero → Profile → Pain → Fee → Features → Footer; ใช้ข้อมูล config แทน hard-code
7. **ต่อ flow:** CTA → login/signup → onboarding → publish; กำหนด error/empty/loading/success ทุกขั้น
8. **QA:** responsive, accessibility, ความเร็ว, localization, analytics, URL ของ CTA, เงื่อนไขธุรกิจ, ภาพ/ฟอนต์/รีวิวที่มีสิทธิ์ใช้
9. **ทดลอง:** A/B test พาดหัว Hero หรือคำ CTA ทีละประเด็น; วัด onboarding completion ไม่ใช่แค่จำนวนคลิก

### Definition of done สำหรับหน้า landing

- ทุก section อ่านเข้าใจได้โดยไม่ต้องดูแอนิเมชัน และมี CTA หลักที่ชัด
- มือถือ 320px ไม่มี horizontal overflow หรือข้อความ/ปุ่มถูกบัง
- ทุกปุ่มและแท็บใช้ keyboard ได้; modal เปิด/ปิดและจัดการ focus ถูกต้อง
- ข้อมูล social proof/fee มาจากแหล่งที่ตรวจสอบได้และมีหมายเหตุครบ
- CTA ทุกตำแหน่งพาเข้าสู่ flow ที่ถูกต้องพร้อม source tracking
- ผ่านการตรวจ contrast, reduced motion, ภาพไม่กระโดด, และผลทดสอบกับข้อความไทย/อังกฤษ

## 10. ขอบเขตหลักฐานและสิ่งที่ยังไม่ยืนยัน

สำรวจหน้าสาธารณะด้วยเบราว์เซอร์ที่ 1280 × 720 และ 390 × 844 รวมถึงการกดเปลี่ยนภาษา, ปุ่มเริ่มสมัคร และโมดัล “ทำไมต้องชวนลูกค้ามาที่ fastwork?”; ตรวจ computed CSS ของ element หลัก ค่าที่วัดอาจเปลี่ยนเมื่อเว็บอัปเดต จึงควรยึดโครงสร้างและพฤติกรรมมากกว่าการคัดค่าพิกเซลแบบตายตัว ไม่ได้เข้าสู่ระบบ จึงยังไม่เห็น onboarding จริงหลังหน้า login และไม่ได้ยืนยัน API/ระบบชำระเงินหลังบ้าน
