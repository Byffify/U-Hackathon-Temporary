# Manual test steps — local demo (ไม่ deploy KEEPHUB L1)

> อัปเดตหลัง pull: config ปัจจุบันใช้ KEEPHUB Avalanche L1 chain ID **658440**, สัญลักษณ์ **PINEM**. รอบนี้ไม่ deploy เครือข่ายสาธารณะ โหมด UI demo ทดสอบ interaction เท่านั้น: Library และ Gemini **ไม่ส่ง ZIP จริง**; กดดาวน์โหลดควรแจ้ง unavailable โดยไม่แสดงว่าสร้างไฟล์จริงสำเร็จ เคสดาวน์โหลดจริงในคู่มือต้องใช้ Local API ที่ตั้งค่าพร้อมแล้วเท่านั้น

อัปเดต 16 ตุลาคม 2026 — 92 เคสจากคู่มือเดิม แยกขั้นตอนและ expected result ของทุกเคส เอกสารนี้ไม่ใช่ผลทดสอบและไม่ได้ส่งธุรกรรมใด ๆ

## เริ่มตรงไหน

1. ทดสอบ UI ด้วยโหมด demo ให้ครบ flow ก่อน ใช้ browser profile สำหรับทดสอบโดยเฉพาะ
2. ทดสอบ Local API จริงสำหรับ wallet/session/profile/project/upload/download ของ Creator
3. ทดสอบ Gemini จริงต่อเมื่อ API + worker มี config พร้อม หากไม่พร้อมให้ BLOCKED ห้ามใช้คำตอบจำลองนับว่าผ่าน provider จริง
4. ไม่ต้องใช้ Ankr/KEEPHUB L1 RPC หรือเติม เหรียญทดสอบ PINEM เพื่อทดสอบ UI demo และ source ของ Creator ใน Local API
5. กลุ่ม C/R ตรวจระบบเงินจริงบนเชนไม่ได้หากไม่มี Contract: ใช้เชนจำลองในเครื่องเพื่อ integration หรือระบุ BLOCKED สำหรับ manual API; UI demo ผ่านได้เฉพาะหน้าจอจำลอง

## เตรียมก่อนทดสอบ

- A = Creator, B = Buyer, C = ผู้ไม่มีสิทธิ์/ผู้ซื้อขายต่อ ใช้ browser profile แยกสำหรับ session ของแต่ละคน
- `site-v1.zip` มี index.html/README/source ของตนเอง; `site-v2.zip` มีเนื้อหาต่างกัน เตรียม PNG/JPEG จริง และ ZIP เสีย/ว่างเพื่อ negative test
- Project P เปิด resale + derivative; Project Q ปิดทั้งคู่; ราคา API ใช้ string ของ wei เช่น `1000000000000000` ไม่ใช่จำนวน AVAX แบบทศนิยม
- ทดสอบไฟล์อันตราย/limit/TTL/rate/quota เฉพาะ environment ทดสอบ ห้ามเปลี่ยน DB หลักหรือยิง flood เพื่อทำให้ quota หมด
- เปิด DevTools > Network > Preserve log; จด project/release/conversation/plan/job/token IDs ที่แต่ละ flow คืนมา ห้ามเดา ID

### UI demo

แก้ frontend/.env.development.local เฉพาะตัวแปรต่อไปนี้แล้ว restart Vite:

```dotenv
VITE_SERVICE_MODE=demo
```

```powershell
cd C:\Users\66809\Desktop\U-Hackathon-Temporary\frontend
npm run dev
```

เปิด http://127.0.0.1:4173 แล้วใช้ Demo Creator/Demo Buyer บนหน้า Connect หากต้อง reset ให้ลบเฉพาะ browser storage `utopia.demo.v1` ใน profile ทดสอบ (ข้อมูล demo ของ profile นั้นจะหาย)

### Local API จริง

ตั้ง frontend/.env.development.local แล้ว restart Vite:

```dotenv
VITE_SERVICE_MODE=api
VITE_API_BASE_URL=/api/v1
API_PROXY_TARGET=http://127.0.0.1:8000
```

Backend ต้องมี dependencies/migrations ตาม backend/README.md; .env ใช้ development/local storage และตั้ง AUTH_DOMAIN=127.0.0.1:4173, AUTH_URI=http://127.0.0.1:4173, FRONTEND_ORIGINS=["http://127.0.0.1:4173"] ให้ตรง browser ส่วน chain_id ใช้ค่า default 658440 ของแอป

Desktop checkout ยังไม่มี .venv ของตนเอง ณ เวลาจัดทำ ใช้ Python 3.12 runtime เดิมที่มี dependencies อยู่ได้ดังนี้ (ตรวจ path มีจริงก่อน):

```powershell
cd C:\Users\66809\Desktop\U-Hackathon-Temporary\backend
$qaPython = 'C:/Users/66809/Downloads/U-Hackathon-Temporary/backend/.venv/Scripts/python.exe'
& $qaPython -m alembic upgrade head
& $qaPython -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

ถ้า port ถูกใช้อยู่ ให้หยุดเฉพาะ API process เดิมของเราแล้วเริ่มใหม่ ไม่เปิดซ้ำ Gemini ต้องเปิดอีก terminal ใน backend ด้วย runtime เดียวกัน:

```powershell
& 'C:/Users/66809/Downloads/U-Hackathon-Temporary/backend/.venv/Scripts/python.exe' -m app.worker
```

Credentials ใน contracts/.env ไม่ถูกโหลดเป็น backend/.env โดยอัตโนมัติ และ API ที่กำลังรันจากอีก checkout ไม่ใช่หลักฐานว่า Desktop พร้อมแล้ว

### วิธีเรียก API กรณีหน้าจอเชื่อมไม่ครบ

อ่าน [คู่มือเดิม ส่วน 11](manual-test-demo.md#11-เรียก-api-จริงจาก-browser-เมื่อหน้าจอยังไม่เชื่อม) ซึ่งมี browser helper qaApi, wallet personal_sign, CSRF, multipart upload และ binary download

- เรียกจากหน้า Frontend ผ่าน proxy เพื่อให้ cookie/Origin ถูกต้อง; Swagger origin ไม่อยู่ allowlist อาจทำให้ auth POST ถูกปฏิเสธ
- ใช้ live /docs หรือ /openapi.json; ทุก mutation ที่มี session ต้องมี X-CSRF-Token และ Origin ที่ถูกต้อง
- หน้าจอ Library/Purchases/Resale ยังมี path/payload adapter ไม่ตรง Backend; Upload ZIP และ Gemini ปัจจุบันเชื่อม contract แล้ว แต่ต้องบันทึกผลทดสอบจริงแยกจาก demo ให้บันทึก UI integration FAIL/BLOCKED แล้วทดสอบ backend API แยก ไม่เปลี่ยนไป demo แล้วนับผ่านจริง
- Retry แบบเดิมต้องใช้ Idempotency-Key เดิม; operation ใหม่ใช้ key ใหม่; ห้ามใช้ qaApi JSON helper ดาวน์โหลด ZIP ให้ใช้ fetch + blob หรือ GET URL แทน

### เชนจำลองเมื่อไม่ deploy KEEPHUB L1

Contract tests จำลองเชนเอง ไม่ใช้กระเป๋า/คีย์จริง:

```powershell
cd C:\Users\66809\Desktop\U-Hackathon-Temporary\contracts
npm test
npm run build
```

หากต้องการ Backend integration เพิ่ม เปิด terminal แรก:

```powershell
cd C:\Users\66809\Desktop\U-Hackathon-Temporary\contracts
node scripts/local-test-chain.mjs
```

จากนั้น terminal ที่สอง:

```powershell
cd C:\Users\66809\Desktop\U-Hackathon-Temporary\backend
$env:LOCAL_EVM_TEST='1'
& 'C:/Users/66809/Downloads/U-Hackathon-Temporary/backend/.venv/Scripts/python.exe' -m pytest -q tests/test_evm_integration.py
Remove-Item Env:LOCAL_EVM_TEST
```

กด Ctrl+C หยุดเชนจำลองเมื่อจบ Fixture ใช้ test DB/storage แยกและ config Gateway เอง ไม่ได้เปลี่ยน API ที่ port 8000 ให้ใช้เชนจำลองอัตโนมัติ ผลชุดนี้เป็น automated integration ไม่ใช่ manual UI PASS และห้ามนำคีย์ใน .local/test-chain.json ไปใช้เครือข่ายจริง

## ลำดับทำงาน

S → A → P → U → G → D → O สำหรับ Local API; C/R ใช้ UI demo หรือ local-chain setup แยก สามารถใช้ source ของ A เองทำ G ได้โดยไม่รอซื้อบนเชน

## หน้าแรก / Explore / Navigation

เงื่อนไขก่อนเริ่ม: เปิด Frontend ที่ http://127.0.0.1:4173 และเตรียม Network/Console; API cases ใช้ local server ที่ migrate แล้ว

### S01

1. เปิด route หรือ endpoint ที่ระบุ แล้วบันทึก HTTP status/console และภาพหน้าจอ
2. เปิด GET `/health/live` และ `/health/ready` ที่ port 8000
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** 200 ทั้งคู่, ready เมื่อ migrations ครบ; live อย่างเดียวไม่ยืนยัน DB

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### S02

1. เปิด route หรือ endpoint ที่ระบุ แล้วบันทึก HTTP status/console และภาพหน้าจอ
2. เปิด `/docs`, ตรวจ live OpenAPI
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** มี auth/projects/commerce/Gemini และ PUT conversation sources

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### S03

1. เปิด route หรือ endpoint ที่ระบุ แล้วบันทึก HTTP status/console และภาพหน้าจอ
2. เปิด `/` แล้วกด Explore / Connect / My workspace / browser Back
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** route ถูกต้อง ไม่มีหน้าขาวหรือ console exception

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### S04

1. เปิด route หรือ endpoint ที่ระบุ แล้วบันทึก HTTP status/console และภาพหน้าจอ
2. เปิด `/explore` ค้นคำที่มี/ไม่มี กรอง stack เปลี่ยนหน้า
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ผลสัมพันธ์กับ query, มี empty state, ไม่มีรายการซ้ำข้ามหน้า

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### S05

1. เปิด route หรือ endpoint ที่ระบุ แล้วบันทึก HTTP status/console และภาพหน้าจอ
2. GET `/api/v1/explore` หรือ `/api/v1/projects?include_examples=true`
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** มีตัวอย่าง seeded หลัง migrations; ตัวอย่างระบุ `is_example:true` ไม่อ้างว่าซื้อ/ดาวน์โหลด source จริงได้

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### S06

1. เปิด route หรือ endpoint ที่ระบุ แล้วบันทึก HTTP status/console และภาพหน้าจอ
2. เปิด project และ creator public profile โดยไม่ login
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** อ่าน public data ได้ แต่ไม่เผย session/secret/source archive

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### S07

1. เปิด route หรือ endpoint ที่ระบุ แล้วบันทึก HTTP status/console และภาพหน้าจอ
2. เปิด URL ไม่รู้จักและ reload deep link
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** มี Not Found; route ที่มีจริงไม่กลายเป็น 404 จาก host

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### S08

1. เปิด route หรือ endpoint ที่ระบุ แล้วบันทึก HTTP status/console และภาพหน้าจอ
2. ลอง viewport 390px / desktop, Tab, Escape, modal
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ปุ่มไม่ล้น, focus ใช้ได้, ปิด modal แล้วกลับไปตำแหน่งเหมาะสม

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### S09

1. เปิด route หรือ endpoint ที่ระบุ แล้วบันทึก HTTP status/console และภาพหน้าจอ
2. DevTools Offline แล้วลองโหลด/บันทึก จากนั้น Online + retry
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** แสดง error ไม่แสดง success ลวง; กลับมาใช้งานได้

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

## Wallet / authentication / session

เงื่อนไขก่อนเริ่ม: ใช้โหมด API, Wallet ทดสอบ A/B และ browser profile แยก; chain ที่ Wallet เลือกต้อง 658440 สำหรับ login แต่ไม่ต้องถือ เหรียญทดสอบ PINEM เพื่อ personal_sign

### A01

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. เปิด protected route เช่น `/workspace/projects` ขณะ logout
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ขอ login และกลับหน้าที่ตั้งใจเมื่อสำเร็จ

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A02

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. Connect ด้วย A บน KEEPHUB L1 ยืนยัน personal_sign
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** challenge → verify สำเร็จ, มีบัญชี/session, เห็น A

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A03

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. login ครั้งแรก จด user.id แล้ว logout/login address เดิม
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ได้บัญชีเดิม ไม่สร้าง user ใหม่ทุกครั้ง

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A04

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. ปฏิเสธ connect หรือ signature ใน wallet
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ยังคง logout มีข้อความและ retry ได้

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A05

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. ใช้ chain อื่น / ไม่มี wallet extension
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** บอกให้เปลี่ยน KEEPHUB L1 / ติดตั้ง wallet ไม่สร้าง session

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A06

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. เรียก GET `/auth/session` หลัง reload และหลัง restart API
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** session เดิมยังใช้ได้เมื่อยังไม่หมดอายุ; UI ไม่หายเพราะ refresh

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A07

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. ส่ง challenge/signature เดิมซ้ำหลัง verify แล้ว
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ไม่สร้าง session ใหม่; ปฏิเสธ replay

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A08

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. ออก challenge แล้วรอเกิน 5 นาทีค่อย verify
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ปฏิเสธ challenge หมดอายุ

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A09

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. ใช้ลายเซ็น B กับ challenge A / แก้ message / verify จาก browser อีก profile
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ปฏิเสธ ไม่ login เป็น A

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A10

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. POST/PATCH ไม่มี CSRF, CSRF ผิด หรือ Origin ไม่อยู่ allowlist
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ปฏิเสธ 403 ไม่เปลี่ยนข้อมูล

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A11

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. logout แล้ว GET session และเรียก mutation
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** 401; logout ต้อง revoke จริง ไม่ใช่ลบ UI อย่างเดียว

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A12

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. เปลี่ยน account ใน wallet หลัง login
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** UI ต้องไม่ส่งธุรกรรมของ B โดยใช้ session A; หากไม่รองรับ automatic handling ต้อง logout/login ใหม่และบันทึก gap

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A13

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. login A ซ้ำใน browser อีก profile แล้วลอง session เก่า
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** session เก่าของบัญชีเดียวกันถูก revoke ตาม rotation; อาจต้อง login ใหม่ใน profile แรก

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A14

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. ใน test environment ลด SESSION_TTL_SECONDS แล้วรอหมดอายุ
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** GET session เป็น 401, UI ล้างสถานะและขอ login; อย่าลดค่าของ demo หลัก

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### A15

1. ถ้าเคสต้องเริ่มจาก login ให้ A เซ็น challenge ที่ backend คืนจริง และใช้ cookie/CSRF ของ profile นั้น
2. test environment ตั้ง auth rate limit ต่ำแล้วส่งเกินจำนวนที่ตั้ง
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** 429 พร้อมทาง retry ไม่เป็น 500; ไม่ยิง flood ต่อ public host และไม่คาดว่าค่าเริ่มต้นจะให้ login ไม่จำกัด

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

## Profile / avatar

เงื่อนไขก่อนเริ่ม: A login ผ่าน Local API แล้ว; เปิด /settings/profile หรือ /me/profile; จดค่า name/bio/avatar เดิม

### P01

1. อ่านโปรไฟล์ปัจจุบันก่อนแก้ไข และเตรียมรูปจริงกับไฟล์ปลอมสำหรับ upload
2. `/settings/profile` เปลี่ยนชื่อ bio และ reload
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** บันทึกจริง, public creator profile แสดงค่าที่อนุญาต

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### P02

1. อ่านโปรไฟล์ปัจจุบันก่อนแก้ไข และเตรียมรูปจริงกับไฟล์ปลอมสำหรับ upload
2. PATCH แค่ name แล้วตรวจ bio/avatar
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** field ที่ไม่ส่งไม่ถูกล้าง

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### P03

1. อ่านโปรไฟล์ปัจจุบันก่อนแก้ไข และเตรียมรูปจริงกับไฟล์ปลอมสำหรับ upload
2. name ว่าง/>80, bio >2000, URL javascript:, field แปลก, PATCH ว่าง
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** validation error; ข้อมูลเดิมยังอยู่

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### P04

1. อ่านโปรไฟล์ปัจจุบันก่อนแก้ไข และเตรียมรูปจริงกับไฟล์ปลอมสำหรับ upload
2. POST `/me/avatar` PNG/JPEG จริง แล้วเปิดรูป
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** upload สำเร็จ, URL โหลดได้; ปลอม PNG/ไฟล์เกิน limit ถูกปฏิเสธ

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### P05

1. อ่านโปรไฟล์ปัจจุบันก่อนแก้ไข และเตรียมรูปจริงกับไฟล์ปลอมสำหรับ upload
2. ส่ง `avatar_url:null`
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ล้างรูปได้ ไม่ทำให้ name/bio หาย

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

## Draft / images / source release / storage

เงื่อนไขก่อนเริ่ม: A login แล้วมี Project P; B/C อยู่คนละ browser profile; เตรียม ZIP v1/v2 และรูปจริง

### U01

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. A สร้าง P พร้อม title/description/stack/demo URL/price/terms/permissions
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** draft ถูกบันทึก มี project.id; เห็นใน `/me/projects`

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U02

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. logout หรือใช้ B อ่าน draft A / PATCH / upload
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ไม่เห็น draft private; เปลี่ยน/อัปโหลดของคนอื่นไม่ได้

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U03

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. ตั้งราคา 0, ลบ, decimal wei, title ว่าง, demo URL ไม่ใช่ http(s)
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** validation error ไม่สร้าง project เสีย

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U04

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. A อัปโหลดภาพและ ZIP v1 `version=1.0.0` พร้อม Idempotency-Key
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ได้ media/release ID จริง ไม่ใช่ progress จำลอง

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U05

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. ส่ง ZIP/เวอร์ชันเดิมด้วย key เดิมซ้ำ
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** คืน release เดิม ไม่มี duplicate; key เดิมแต่เนื้อหาอื่นต้อง conflict

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U06

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. ใช้ key ใหม่แต่ version เดิม; ZIP ว่าง/เสีย/path traversal
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ปฏิเสธ ไม่มี release ที่ใช้งานไม่ได้

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U07

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. archive >20MB, expanded >50MB, >1000 files, symlink/encrypted ZIP/path collision
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ปฏิเสธตาม limit ไม่แตกไฟล์ออกนอก storage; ทำบนเครื่องทดสอบ

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U08

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. A ดาวน์โหลด v1 จาก project-release endpoint
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** เปิด ZIP ได้ เนื้อหาตรงต้นฉบับ; sha256 ตรง release metadata

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U09

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. B/C ดาวน์โหลด source A โดยไม่มีสิทธิ์
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ปฏิเสธ แม้รู้ project/release ID; บาง flow อาจ 503 เมื่อ chain ยังไม่ตั้งค่า ซึ่งยังไม่ใช่การพิสูจน์ authorization บนเชน

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U10

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. ตรวจ release JSON / `.local/objects`
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** JSON ไม่มี wrapped_key/nonce; source object เป็น ciphertext ไม่ใช่ ZIP plaintext

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U11

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. restart API/worker แล้วอ่าน profile/project/release และดาวน์โหลด
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** SQLite + `.local` เดิมยังใช้ได้, ไม่สร้าง master key ใหม่ทับของเก่า

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U12

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. อัปโหลด v2 `version=1.1.0` โดย A
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** v1 ยัง immutable, v2 มี ID/hash ใหม่

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### U13

1. ใช้ /workspace/projects หรือ API /projects และ /me/projects; เก็บ project_id/release_id ที่คืนมาจริง
2. publish โดยยังไม่มี source release
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** conflict SOURCE_REQUIRED ไม่เผยแพร่

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

## Listing / purchase / library บนเชนจำลอง

เงื่อนไขก่อนเริ่ม: เคส API ต้องมี local-chain Gateway ที่เชื่อม Contract จริงในเครื่องพร้อม A/B/Sponsor test accounts; หากไม่มีให้ BLOCKED ไม่เรียก KEEPHUB L1 แทน

### C01

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. A ขอ POST `/projects/{id}/chain-transaction`, ตรวจ to/chain/value/data แล้วส่งผ่าน wallet
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** createListing ลงเชนจำลองจริง; A จ่าย gas เป็นเหรียญจำลอง

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C02

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. จาก receipt `ListingCreated` จด numeric listingId แล้ว POST `/projects/{id}/publish` ด้วย `chain_listing_id` เป็น string
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** Backend ตรวจ owner/price/terms/permissions ตรง จึง published และ public catalog เห็น

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C03

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. ลอง publish listing ของ B, ราคาหรือ terms ไม่ตรง, listing ผูก project อื่นแล้ว
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** conflict ไม่ปล่อย published ลวง

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C04

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. B สร้าง POST `/purchase-intents` ด้วย project_id และ key ใหม่
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ได้ intent ID, authorization, funding; typed uint256 เป็น decimal strings ห้ามแปลง Number

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C05

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. B ยังไม่มี escrow deposit แล้วพยายามซื้อ
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ไม่ยืนยันสิทธิ์/ขายสำเร็จ ห้าม debit seller credit หรือสร้างสิทธิ์ปลอม

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C06

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. B ตรวจและส่ง funding.deposit_transaction จาก wallet รอ receipt
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** depositOf(B) เพิ่ม; B จ่าย deposit gas เอง

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C07

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. ถ้า intent หมดอายุสร้างใหม่; B เซ็น authorization ด้วย eth_signTypedData_v4 แล้ว confirm
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** sponsor ส่ง buy; poll intent จน confirmed หลัง confirmations; ได้ entitlement_id

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C08

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. ส่ง confirm/poll ซ้ำ และ create ซ้ำด้วย key/payload เดิม
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** intent/tx เดิม ไม่ซื้อซ้ำ; key เดิม payload เปลี่ยนต้อง conflict

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C09

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. เซ็นด้วย wallet อื่น, เปลี่ยนราคา/nonce/domain, ใช้ intent หมดอายุ
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ปฏิเสธ ไม่มีสิทธิ์/การชำระใหม่

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C10

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. ขณะส่ง tx เน็ตขาด/refresh
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** อ่าน intent เดิมและ hash เดิมก่อน retry; ไม่สร้าง purchase ใหม่เพราะยังไม่รู้ผล

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C11

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. GET `/me/entitlements`, `/entitlements/{id}`, ดาวน์โหลด exact release
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** B เห็นสิทธิ์และได้ ZIP; C ไม่มีสิทธิ์

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C12

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. A เพิ่ม release ใหม่ใน listing เดิม แล้ว B ดาวน์โหลด v2
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** B ไม่ต้องซื้อซ้ำ แต่ไม่สามารถใช้สิทธิ์กับ listing ใหม่ของ A

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C13

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. A แก้ terms/permissions/price แล้ว updateListing และ publish ให้ตรง
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** การซื้อใหม่ใช้ terms ใหม่; token เก่าคง snapshot เดิม

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C14

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. A พยายามซื้อ listing ตนเอง
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** SELF_PURCHASE_FORBIDDEN; A เข้าถึง source ตนเองอยู่แล้ว

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### C15

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. เลือก P ที่มี source release; ใช้ local EVM เท่านั้น; UI demo ตรวจได้แค่การแสดงผลจำลอง
2. sponsor ไม่พร้อม/RPC ผิด chain/address ไม่มี Contract
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** fail closed 503/error ไม่มี confirmed หรือสิทธิ์จำลอง

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

## Resale / current ownership

เงื่อนไขก่อนเริ่ม: เคส API ต้องมีเชนจำลองและ B ถือ token ของ P จาก C; Q เป็น listing ที่ไม่อนุญาต resale

### R01

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. จด tokenId และ owner ก่อนทดสอบ; แยกจาก projectId/releaseId และตรวจ token ที่เหลือใน listing เดียวกัน
2. B ขอ POST `/resale-offers` ของ P พร้อม entitlement_id/price_wei/deadline อนาคต
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ได้ transaction preparation; ยังไม่ถือว่า active แค่ได้ API response

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### R02

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. จด tokenId และ owner ก่อนทดสอบ; แยกจาก projectId/releaseId และตรวจ token ที่เหลือใน listing เดียวกัน
2. B ส่ง transaction ผ่าน wallet รอ mined แล้ว GET offer
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** active=true, ราคา/ผู้ถือ/เวลา ตรงเชน

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### R03

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. จด tokenId และ owner ก่อนทดสอบ; แยกจาก projectId/releaseId และตรวจ token ที่เหลือใน listing เดียวกัน
2. C ซื้อด้วย intent `{resale_offer_id: tokenId}` → deposit → typed sign → confirm
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ownerOf token เปลี่ยนเป็น C, split 90/10, ไม่ใช่ mint สิทธิ์ซ้ำแทน resale

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### R04

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. จด tokenId และ owner ก่อนทดสอบ; แยกจาก projectId/releaseId และตรวจ token ที่เหลือใน listing เดียวกัน
2. B ดาวน์โหลด token ที่ขายไปแล้ว และ C ดาวน์โหลด
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** B ถูกปฏิเสธเมื่อไม่มี token อื่นใน listing; C ดาวน์โหลดได้

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### R05

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. จด tokenId และ owner ก่อนทดสอบ; แยกจาก projectId/releaseId และตรวจ token ที่เหลือใน listing เดียวกัน
2. B ถือสอง token ของ listing เดียวกันแล้วขายเพียงหนึ่ง
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** B ยังเข้าถึง listing ผ่าน token ที่เหลือ; ห้ามคาดว่า B ต้องถูกบล็อกทั้งหมด

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### R06

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. จด tokenId และ owner ก่อนทดสอบ; แยกจาก projectId/releaseId และตรวจ token ที่เหลือใน listing เดียวกัน
2. ขาย Q ที่ห้าม resale / คนไม่ใช่ holder ขอขาย/ยกเลิก / deadline อดีต
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ปฏิเสธ ไม่มี offer ใช้งานได้

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### R07

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. จด tokenId และ owner ก่อนทดสอบ; แยกจาก projectId/releaseId และตรวจ token ที่เหลือใน listing เดียวกัน
2. B ขอ cancel แล้วส่ง transaction จริง หรือรอ offer หมดอายุ
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** offer ซื้อไม่ได้หลังเชนยืนยัน cancel/หลัง deadline

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### R08

โหมด: local-chain API เท่านั้นสำหรับผลบนเชน; หากใช้ UI demo ให้บันทึกว่าเป็น simulation

1. จด tokenId และ owner ก่อนทดสอบ; แยกจาก projectId/releaseId และตรวจ token ที่เหลือใน listing เดียวกัน
2. ลอง ERC721 direct transfer จาก holder
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ถูกบล็อกตาม Contract; เปลี่ยนเจ้าของผ่าน resale ที่รองรับ

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

## Gemini / conversations / plans / quota / output

เงื่อนไขก่อนเริ่ม: A มี source v1 ของตนเอง; Local API และ worker ใช้ DB/storage เดียวกัน; Gemini config/key ต้องพร้อมสำหรับ provider test

### G01

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. A สร้าง conversation, PUT exact project_id/release_id ของ A
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** เก็บ source snapshot และ version; ไม่ใช้ source ล่าสุดโดยไม่ตั้งใจ

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G02

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. GET quota แล้ว POST estimates
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** แสดงหน่วย tokens, analysis/generation ceilings, expiry; estimate อย่างเดียวไม่หัก used/reserved

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G03

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. POST messages พร้อม estimate_id + key ใหม่ แล้ว poll job
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** 202 → queued/running → succeeded; worker เรียก provider จริง; history มีคำตอบ, quota settled

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G04

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. POST plans พร้อม estimate ใหม่ requirements และ target_stack
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ได้ planning job แล้ว plan state awaiting_confirmation; ยังไม่สร้าง output ZIP เพียงเพราะส่งข้อความ

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G05

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. revision แผน / ใช้ generation_budget ที่เล็กกว่าค่าสูงสุด
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** revision ใหม่แสดง scope/budget; revision เก่ายืนยันไม่ได้

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G06

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. confirm latest revision พร้อม key และ poll job
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** reserve quota ครั้งเดียว → generation → output_id; download ZIP ได้

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G07

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. ตรวจ ZIP ที่ได้
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** มีไฟล์ผลลัพธ์ คำสั่งรัน provenance/license และ validation report; เปิดโค้ดก่อนรันในสภาพแวดล้อมทดสอบแยก

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G08

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. confirm/retry ด้วย key เดิม
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** job เดิมไม่เรียก provider และคิด quota ซ้ำ

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G09

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. เปลี่ยน sources หรือส่งข้อความใหม่หลังมีแผนแต่ก่อน confirm
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** แผนเดิม stale; ต้อง estimate/plan ใหม่

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G10

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. B อ่าน chat/job/output ของ A หรือเลือก release ที่ไม่มีสิทธิ์
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ปฏิเสธ ไม่เปิด source/history/output ข้ามบัญชี

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G11

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. หยุด worker แล้ว enqueue; เปิด worker กลับ
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** งานค้าง queued จนมี worker ไม่สำเร็จลวง แล้วกลับมาทำงานได้

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G12

โหมด: controlled test environment; หากจำลองอย่างปลอดภัยไม่ได้ให้ BLOCKED และอ้างผล automated test แยก

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. ตั้ง quota ต่ำใน DB ทดสอบแยก/บัญชีใหม่ แล้วขอเกิน remaining
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** quota error; ไม่ติดลบ ไม่แจกเพิ่มจาก refresh/login/ซื้อ source

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G13

โหมด: controlled test environment; หากจำลองอย่างปลอดภัยไม่ได้ให้ BLOCKED และอ้างผล automated test แยก

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. โควตาหมดอายุ/ไม่ตั้ง key/provider error/429
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** error มีเหตุผล ไม่ fallback ไป model/project เสียเงิน; quota ไม่แสดงสำเร็จลวง

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G14

โหมด: controlled test environment; หากจำลองอย่างปลอดภัยไม่ได้ให้ BLOCKED และอ้างผล automated test แยก

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. worker/provider outcome ไม่แน่นอนระหว่าง request
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ไม่ retry อัตโนมัติแบบเสี่ยงเรียกซ้ำ; reserved อาจคงไว้รอ reconcile ไม่ควรคืนเงินฟรี

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G15

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. ใช้สอง source ที่มีสิทธิ์ → plan → confirm → ZIP
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** provenance อ้างทั้งสอง exact releases ไม่ใช่ source เดียว

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### G16

1. สร้าง conversation → PUT sources exact project/release → อ่าน quota; endpoint ใช้ /gemini/conversations และ /jobs
2. หลังขายสิทธิ์หมดแล้วเปิด source/chat เดิมหรือทำงานใหม่
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ตรวจสิทธิ์ซ้ำและปฏิเสธเมื่อไม่เป็น holder; ไฟล์ที่โหลดไปแล้วเรียกคืนไม่ได้

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

## Source import / derivative / sandbox

เงื่อนไขก่อนเริ่ม: มี archive ของตนเองพร้อม license/origin หรือมี output จาก G; อย่าใช้ archive ที่ไม่มีสิทธิ์

### D01

1. ใช้ /gemini/source-imports หรือ /outputs/{id}/project-draft ตามเคส; ตรวจ permission ของ source ทุกตัวก่อนทำ
2. POST `/gemini/source-imports` ใส่ file/origin/license_id/license_evidence แต่ ZIP hash ไม่อยู่ allowlist
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ถูกบล็อก แม้มีคำว่า MIT; ไม่เชื่อชื่อ license อย่างเดียว

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### D02

1. ใช้ /gemini/source-imports หรือ /outputs/{id}/project-draft ตามเคส; ตรวจ permission ของ source ทุกตัวก่อนทำ
2. ผู้ดูแลตรวจ license/หลักฐานและ exact SHA256 ของ archive ที่ตนมีสิทธิ์ แล้วใส่ allowlist ใน test config; restart
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** import archive นั้นได้และมี provenance; เปลี่ยน archive ต้องตรวจ/hash ใหม่

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### D03

1. ใช้ /gemini/source-imports หรือ /outputs/{id}/project-draft ตามเคส; ตรวจ permission ของ source ทุกตัวก่อนทำ
2. output ใช้ source ที่อนุญาต derivative ทุกตัว แล้ว POST `/outputs/{id}/project-draft` พร้อม ProjectInput
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ได้ draft ใหม่พร้อม provenance แล้วอัปโหลด/publish ตาม flow ปกติ

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### D04

1. ใช้ /gemini/source-imports หรือ /outputs/{id}/project-draft ตามเคส; ตรวจ permission ของ source ทุกตัวก่อนทำ
2. มี source หนึ่งตัวห้าม derivative / สิทธิ์หมด / build failed
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ไม่อนุญาต derivative publication; resale_allowed ไม่ใช่ derivative_allowed

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### D05

1. ใช้ /gemini/source-imports หรือ /outputs/{id}/project-draft ตามเคส; ตรวจ permission ของ source ทุกตัวก่อนทำ
2. ไม่มี Modal config แล้ว generate
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** validation ระบุ build=not-run ไม่ใช่ passed

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### D06

1. ใช้ /gemini/source-imports หรือ /outputs/{id}/project-draft ตามเคส; ตรวจ permission ของ source ทุกตัวก่อนทำ
2. ถ้าเปิด Modal: prebuilt image + trusted build command; ลอง output ผ่าน/ไม่ผ่าน
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** แสดงผลจริง build failure ทำให้ job failed และบล็อก publish; ไม่ execute generated code บน API host

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

## Persistence / restart / recovery / operations

เงื่อนไขก่อนเริ่ม: ใช้ local test DB/storage และเก็บสำรองก่อน recovery test; ห้ามทดสอบเสียหายกับข้อมูลที่ต้องเก็บ

### O01

1. จด profile/project/release/session/job ที่มีอยู่ก่อนหยุด process หรือจำลองปัญหา
2. restart API/worker โดยไม่ลบ DB/storage
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** session/โปรไฟล์/releases/ประวัติยังอยู่; งานที่ไม่แน่ใจไม่ถูกเรียก provider ซ้ำเงียบ ๆ

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### O02

1. จด profile/project/release/session/job ที่มีอยู่ก่อนหยุด process หรือจำลองปัญหา
2. backup DB + objects + master key ไปพื้นที่ทดสอบ แล้ว restore คู่กัน
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** source ดาวน์โหลดและถอดรหัสได้; backup DB ต้อง consistent ไม่ copy SQLite ระหว่างเขียนแบบไม่ประสาน

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### O03

ขอบเขตรอบนี้: **N/A — deferred** เพราะผู้ใช้หยุด deployment ไว้ เก็บเคสนี้ไว้ทำเมื่อมี host/HTTPS จริง

1. จด profile/project/release/session/job ที่มีอยู่ก่อนหยุด process หรือจำลองปัญหา
2. บน VM/host จริง: restart/redeploy
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ไฟล์/DB/key ยังอยู่บน persistent disk; ephemeral filesystem ไม่ผ่าน

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### O04

ขอบเขตรอบนี้: **N/A — deferred** เพราะผู้ใช้หยุด deployment ไว้ เก็บเคสนี้ไว้ทำเมื่อมี host/HTTPS จริง

1. จด profile/project/release/session/job ที่มีอยู่ก่อนหยุด process หรือจำลองปัญหา
2. ตรวจ HTTPS + CORS + secure cookie + FE origin หลัง deploy
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** login/refresh/logout/upload ได้ ไม่มี mixed-content/third-party cookie ปัญหา

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

### O05

1. จด profile/project/release/session/job ที่มีอยู่ก่อนหยุด process หรือจำลองปัญหา
2. ดู responses/logs/source maps/browser storage
3. ตรวจผลตามด้านล่าง แล้วบันทึก response/request_id หรือหลักฐานหน้าจอ โดยไม่แนบ secret

**Expected:** ไม่มี API key/private key/session token/wrapped source key หลุด

ผลจริง: __________  สถานะ: NOT RUN / PASS / FAIL / BLOCKED / N/A

## บันทึกบั๊กอย่างไร

```text
Case ID / mode / revision:
Prerequisite และ test data IDs:
Steps ที่ทำจริง:
Expected:
Actual:
HTTP status / error.code / request_id:
Screenshot หรือ local transaction hash (ไม่มี secret):
Status / blocker:
```

## เกณฑ์จบรอบนี้

- UI demo: ค้นหา → login demo → draft/upload → purchase/library → resale → Gemini plan/confirm/download พร้อม error states ผ่านในขอบเขต simulation
- Local API: nonce/signature/session/profile → owner source upload/download/persistence ผ่าน; เปิด Gemini จริงแล้วค่อยนับ G provider flow
- Blockchain: หากรัน local EVM ได้ให้บันทึกผลเชนจำลองแยกจาก UI; ไม่ต้อง deploy KEEPHUB L1 และไม่อ้างว่า public-chain acceptance ผ่าน
- Cloud/HTTPS/VM redeploy acceptance เป็น deferred ตามขอบเขตนี้
- ทุกเคสต้องมีผลจริง ไม่มีการติ๊ก PASS จากการอ่านคู่มือหรือ automated test ของคนละ flow
