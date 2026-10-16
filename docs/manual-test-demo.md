# Manual test — U-topia / KEEPHUB demo

> อัปเดตหลัง pull: config ปัจจุบันใช้ KEEPHUB Avalanche L1 chain ID **658440**, สัญลักษณ์ **PINEM**. รอบนี้ไม่ deploy เครือข่ายสาธารณะ โหมด UI demo ทดสอบ interaction เท่านั้น: Library และ Gemini **ไม่ส่ง ZIP จริง**; กดดาวน์โหลดควรแจ้ง unavailable โดยไม่แสดงว่าสร้างไฟล์จริงสำเร็จ เคสดาวน์โหลดจริงในคู่มือต้องใช้ Local API ที่ตั้งค่าพร้อมแล้วเท่านั้น

จัดทำ 16 ตุลาคม 2026 จากโค้ดใน workspace นี้ เป็นคู่มือทดสอบ ไม่ใช่รายงานว่าทดสอบผ่านแล้ว

## 1. ขอบเขตและวิธีบันทึกผล

มี 3 ระดับ ต้องบันทึกแยกกัน:

| ระดับ | ระบบที่ทดสอบ | ใช้ยืนยันอะไร |
| --- | --- | --- |
| UI demo | Frontend `VITE_SERVICE_MODE=demo` ใช้ browser storage / provider จำลอง | หน้าจอ การนำทาง interaction เท่านั้น |
| Local API | Python จริง + SQLite + encrypted local files + wallet login | บัญชี/session/upload/ownership และ Gemini จริงเมื่อเปิด worker และมี API ใช้ได้ |
| KEEPHUB L1 integration | Local API + Contract ที่ deploy จริงบน KEEPHUB L1 + funded wallets | การซื้อ สิทธิ์ ดาวน์โหลด ขายต่อ และการแบ่งเงินบนเชน |

สถานะของแต่ละเคส: `NOT RUN`, `PASS`, `FAIL`, `BLOCKED`, `N/A` พร้อมเหตุผล ห้ามนับ BLOCKED เป็น PASS

บันทึก: Case ID / commit หรือวันที่ / ระดับ / browser / wallet address สาธารณะ / ขั้นตอน / ผลจริง / expected / request_id / transaction hash / หลักฐาน ห้ามแนบ private key, API key, session cookie หรือ CSRF token

### เส้นทางลองหน้าจออย่างเดียว (UI demo)

ตั้ง `VITE_SERVICE_MODE=demo` ใน frontend/.env.development.local แล้ว restart Vite ใช้ browser profile แยกจาก API run และกลับ `api` ก่อนทดสอบ Backend

1. เปิด `/` → `/explore` → project detail → creator profile → demo link; ลอง search/filter/empty state
2. เปิด `/connect` เลือก demo creator → profile settings → `/workspace/projects` → new project → save draft → รูป/ZIP → publish → ตรวจ public detail
3. sign out → demo buyer → checkout → ยกเลิก/ยืนยันซื้อ → library → entitlement detail → download → เปิด resale
4. เข้า `/gemini` → สร้าง chat → เลือก source → ดู quota/estimate → ส่งคำถาม → ขอ plan → แก้ plan → confirm → download output
5. refresh ทุกหน้าหลัก → browser Back → logout → protected route ต้องขอ login; ลอง form ว่างและปุ่มซ้ำระหว่าง pending
6. ตรวจคำอธิบาย demo และ Network: โหมดนี้ใช้ fixture/browser storage ไม่มีการชำระบนเชนหรือเรียก Google จริง ผล ZIP/ภาพจำลองไม่ใช่หลักฐานการจัดเก็บ Backend

หากต้อง reset UI demo ให้ลบเฉพาะ browser storage key `utopia.demo.v1` ใน profile ทดสอบ จะทำให้ข้อมูล UI demo ของ profile นั้นหาย ห้าม reset DB/ไฟล์จริงเพื่อรีเซ็ตหน้าจอ

## 2. ข้อจำกัดที่พบจากโค้ดก่อนเริ่ม

Frontend มีบาง operation ที่ยังใช้ API คนละเส้นทางกับ Backend:

| ส่วน | Frontend เรียก | Backend ที่มีจริง |
| --- | --- | --- |
| อัปโหลด ZIP (path ตรงแล้ว) | POST `/projects/{id}/releases` | multipart `file`, `version` และ Idempotency-Key; ต้องทดสอบ payload/response ต่อ |
| Library | `/library` | GET `/me/entitlements` |
| รายละเอียด/ดาวน์โหลดสิทธิ์ | `/library/{id}`, POST download | GET `/entitlements/{id}`, GET `/entitlements/{id}/releases/{releaseId}/download` |
| ซื้อ | `/purchases` | `/purchase-intents` |
| ขายต่อ | `/resales` | `/resale-offers` |
| Gemini (เชื่อมแล้ว) | adapter ใช้ `/gemini/conversations`, `/jobs`, private binary download | source-import แบบ URL อย่างเดียวยังไม่รองรับ ต้องมี ZIP/license evidence |

อ้างอิง `frontend/src/services/index.js` และ router ใน `backend/app/` ต้องตรวจ payload/response และ wallet transaction orchestration ด้วย การเปลี่ยนชื่อ path อย่างเดียวไม่รับประกันว่าเชื่อมครบ

หากเคสหน้าจอติดตรงนี้ ให้บันทึกเป็น integration FAIL/BLOCKED พร้อม Network request แล้วทำ API case ต่อโดยตรง ห้ามสลับไป demo mode แล้วนับว่าผ่าน API จริง

`backend/openapi.json` เป็นไฟล์ snapshot อาจตามโค้ดไม่ทัน ให้ใช้ `http://127.0.0.1:8000/openapi.json` และ `/docs` จาก server ที่เพิ่งรีสตาร์ตเป็นหลัก

## 3. เตรียมสภาพแวดล้อม

### ผู้ทดสอบและไฟล์

- Wallet A: Creator / Wallet B: Buyer / Wallet C: Resale buyer หรือผู้ไม่มีสิทธิ์ ใช้ browser profile แยกเพื่อไม่ให้ cookie ปนกัน
- Deployer และ Sponsor เป็นกระเป๋าทดสอบ ค่า sponsor ต้องตรงกับ immutable sponsor ใน Contract
- Contract ยังไม่ deploy หรือ sponsor ไม่มี เหรียญทดสอบ PINEM: ทดสอบ local API ต่อได้ แต่เคสซื้อขายบน KEEPHUB L1 เป็น BLOCKED
- เตรียม `site-v1.zip`, `site-v2.zip`: index.html + README + source ของตนเอง เนื้อหาต่างกันและไม่ใส่ credentials
- เตรียม PNG/JPEG จริง, ไฟล์ text ที่เปลี่ยนนามสกุลเป็น PNG, ไฟล์ที่ไม่ใช่ ZIP, ZIP ว่าง และ ZIP ที่มี path `../escape.txt` สำหรับ negative test ในเครื่องทดสอบเท่านั้น
- เตรียม Project P ที่อนุญาต resale/derivative และ Project Q ที่ปิดทั้งสองสิทธิ์ เพื่อเทียบพฤติกรรม

### รัน Backend

ใช้ `.env` เดิม ห้ามคัดลอก `.env.example` ทับคีย์ที่ตั้งไว้แล้ว ตั้ง development/local storage/SQLite สำหรับเดโมในเครื่อง และใช้ origin เดียวกันตลอด:

```dotenv
ENVIRONMENT=development
FRONTEND_ORIGINS=["http://127.0.0.1:4173"]
AUTH_DOMAIN=127.0.0.1:4173
AUTH_URI=http://127.0.0.1:4173
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
STORAGE_BACKEND=local
SOURCE_STORAGE_BACKEND=local
STORAGE_ROOT=.local
```

KEEPHUB L1 เป็นค่า default 658440 อยู่แล้ว หากการตั้ง `CHAIN_ID=658440` ผ่าน env ทำให้เกิด Literal validation error ให้เอาบรรทัด override ออก ใช้ default แล้วบันทึก configuration defect นี้

```powershell
cd C:\Users\66809\Desktop\U-Hackathon-Temporary\backend
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

ถ้ามี process ใช้ port 8000 แล้ว ให้หยุด process ของแอปเดิมก่อนเปิดใหม่ ไม่ต้องเปิดซ้ำ สำหรับ Gemini เปิด terminal อีกอันที่โฟลเดอร์ backend:

```powershell
.venv/Scripts/python.exe -m app.worker
```

API และ worker ต้องใช้ revision, working directory, DATABASE_URL และ storage เดียวกัน ในเดโม SQLite ให้เริ่มด้วย API หนึ่ง process และ worker หนึ่ง process

### รัน Frontend เชื่อม API ในเครื่อง

แก้เฉพาะตัวแปรเหล่านี้ใน `frontend/.env.development.local` แล้วรีสตาร์ต Vite:

```dotenv
VITE_SERVICE_MODE=api
VITE_API_BASE_URL=/api/v1
API_PROXY_TARGET=http://127.0.0.1:8000
```

Vite proxy ในโค้ดมี default target เป็น port 8080 จึงต้อง override เป็น 8000 ให้ตรง Backend ไม่ใช้ URL Railway ที่อาจติดมากับ env เดิม

```powershell
cd C:\Users\66809\Desktop\U-Hackathon-Temporary\frontend
npm ci
npm run dev
```

เปิด `http://127.0.0.1:4173` และ DevTools > Network (Preserve log) ตรวจว่า `/api/v1` ไป server ในเครื่อง

Swagger อยู่คนละ origin กับ Frontend; auth POST ต้องมี allowed Origin และ mutation ต้องมี CSRF จึงไม่ควรคาดว่า Try it out ทุก endpoint จะทำงานทันที การ sign wallet ต้องทำใน browser ที่มี wallet extension

## 4. Smoke / Explore / Navigation

| ID | ทำอะไร | ผลที่ควรได้ |
| --- | --- | --- |
| S01 | เปิด GET `/health/live` และ `/health/ready` ที่ port 8000 | 200 ทั้งคู่, ready เมื่อ migrations ครบ; live อย่างเดียวไม่ยืนยัน DB |
| S02 | เปิด `/docs`, ตรวจ live OpenAPI | มี auth/projects/commerce/Gemini และ PUT conversation sources |
| S03 | เปิด `/` แล้วกด Explore / Connect / My workspace / browser Back | route ถูกต้อง ไม่มีหน้าขาวหรือ console exception |
| S04 | เปิด `/explore` ค้นคำที่มี/ไม่มี กรอง stack เปลี่ยนหน้า | ผลสัมพันธ์กับ query, มี empty state, ไม่มีรายการซ้ำข้ามหน้า |
| S05 | GET `/api/v1/explore` หรือ `/api/v1/projects?include_examples=true` | มีตัวอย่าง seeded หลัง migrations; ตัวอย่างระบุ `is_example:true` ไม่อ้างว่าซื้อ/ดาวน์โหลด source จริงได้ |
| S06 | เปิด project และ creator public profile โดยไม่ login | อ่าน public data ได้ แต่ไม่เผย session/secret/source archive |
| S07 | เปิด URL ไม่รู้จักและ reload deep link | มี Not Found; route ที่มีจริงไม่กลายเป็น 404 จาก host |
| S08 | ลอง viewport 390px / desktop, Tab, Escape, modal | ปุ่มไม่ล้น, focus ใช้ได้, ปิด modal แล้วกลับไปตำแหน่งเหมาะสม |
| S09 | DevTools Offline แล้วลองโหลด/บันทึก จากนั้น Online + retry | แสดง error ไม่แสดง success ลวง; กลับมาใช้งานได้ |

## 5. Wallet / session / profile

| ID | ทำอะไร | ผลที่ควรได้ |
| --- | --- | --- |
| A01 | เปิด protected route เช่น `/workspace/projects` ขณะ logout | ขอ login และกลับหน้าที่ตั้งใจเมื่อสำเร็จ |
| A02 | Connect ด้วย A บน KEEPHUB L1 ยืนยัน personal_sign | challenge → verify สำเร็จ, มีบัญชี/session, เห็น A |
| A03 | login ครั้งแรก จด user.id แล้ว logout/login address เดิม | ได้บัญชีเดิม ไม่สร้าง user ใหม่ทุกครั้ง |
| A04 | ปฏิเสธ connect หรือ signature ใน wallet | ยังคง logout มีข้อความและ retry ได้ |
| A05 | ใช้ chain อื่น / ไม่มี wallet extension | บอกให้เปลี่ยน KEEPHUB L1 / ติดตั้ง wallet ไม่สร้าง session |
| A06 | เรียก GET `/auth/session` หลัง reload และหลัง restart API | session เดิมยังใช้ได้เมื่อยังไม่หมดอายุ; UI ไม่หายเพราะ refresh |
| A07 | ส่ง challenge/signature เดิมซ้ำหลัง verify แล้ว | ไม่สร้าง session ใหม่; ปฏิเสธ replay |
| A08 | ออก challenge แล้วรอเกิน 5 นาทีค่อย verify | ปฏิเสธ challenge หมดอายุ |
| A09 | ใช้ลายเซ็น B กับ challenge A / แก้ message / verify จาก browser อีก profile | ปฏิเสธ ไม่ login เป็น A |
| A10 | POST/PATCH ไม่มี CSRF, CSRF ผิด หรือ Origin ไม่อยู่ allowlist | ปฏิเสธ 403 ไม่เปลี่ยนข้อมูล |
| A11 | logout แล้ว GET session และเรียก mutation | 401; logout ต้อง revoke จริง ไม่ใช่ลบ UI อย่างเดียว |
| A12 | เปลี่ยน account ใน wallet หลัง login | UI ต้องไม่ส่งธุรกรรมของ B โดยใช้ session A; หากไม่รองรับ automatic handling ต้อง logout/login ใหม่และบันทึก gap |
| A13 | login A ซ้ำใน browser อีก profile แล้วลอง session เก่า | session เก่าของบัญชีเดียวกันถูก revoke ตาม rotation; อาจต้อง login ใหม่ใน profile แรก |
| A14 | ใน test environment ลด SESSION_TTL_SECONDS แล้วรอหมดอายุ | GET session เป็น 401, UI ล้างสถานะและขอ login; อย่าลดค่าของ demo หลัก |
| A15 | test environment ตั้ง auth rate limit ต่ำแล้วส่งเกินจำนวนที่ตั้ง | 429 พร้อมทาง retry ไม่เป็น 500; ไม่ยิง flood ต่อ public host และไม่คาดว่าค่าเริ่มต้นจะให้ login ไม่จำกัด |
| P01 | `/settings/profile` เปลี่ยนชื่อ bio และ reload | บันทึกจริง, public creator profile แสดงค่าที่อนุญาต |
| P02 | PATCH แค่ name แล้วตรวจ bio/avatar | field ที่ไม่ส่งไม่ถูกล้าง |
| P03 | name ว่าง/>80, bio >2000, URL javascript:, field แปลก, PATCH ว่าง | validation error; ข้อมูลเดิมยังอยู่ |
| P04 | POST `/me/avatar` PNG/JPEG จริง แล้วเปิดรูป | upload สำเร็จ, URL โหลดได้; ปลอม PNG/ไฟล์เกิน limit ถูกปฏิเสธ |
| P05 | ส่ง `avatar_url:null` | ล้างรูปได้ ไม่ทำให้ name/bio หาย |

401 ของ session ก่อน login เป็นผลปกติ ไม่ใช่ smoke failure ส่วน cookie ต้อง HttpOnly และไม่มีคีย์ลับใน browser storage

## 6. Creator / draft / image / release / local persistence

เส้นทาง UI: `/workspace/projects` → `/workspace/projects/new` → edit → releases/new หาก API adapter ยังไม่ตรงให้ทำ API case ด้วยส่วน 11

| ID | ทำอะไร | ผลที่ควรได้ |
| --- | --- | --- |
| U01 | A สร้าง P พร้อม title/description/stack/demo URL/price/terms/permissions | draft ถูกบันทึก มี project.id; เห็นใน `/me/projects` |
| U02 | logout หรือใช้ B อ่าน draft A / PATCH / upload | ไม่เห็น draft private; เปลี่ยน/อัปโหลดของคนอื่นไม่ได้ |
| U03 | ตั้งราคา 0, ลบ, decimal wei, title ว่าง, demo URL ไม่ใช่ http(s) | validation error ไม่สร้าง project เสีย |
| U04 | A อัปโหลดภาพและ ZIP v1 `version=1.0.0` พร้อม Idempotency-Key | ได้ media/release ID จริง ไม่ใช่ progress จำลอง |
| U05 | ส่ง ZIP/เวอร์ชันเดิมด้วย key เดิมซ้ำ | คืน release เดิม ไม่มี duplicate; key เดิมแต่เนื้อหาอื่นต้อง conflict |
| U06 | ใช้ key ใหม่แต่ version เดิม; ZIP ว่าง/เสีย/path traversal | ปฏิเสธ ไม่มี release ที่ใช้งานไม่ได้ |
| U07 | archive >20MB, expanded >50MB, >1000 files, symlink/encrypted ZIP/path collision | ปฏิเสธตาม limit ไม่แตกไฟล์ออกนอก storage; ทำบนเครื่องทดสอบ |
| U08 | A ดาวน์โหลด v1 จาก project-release endpoint | เปิด ZIP ได้ เนื้อหาตรงต้นฉบับ; sha256 ตรง release metadata |
| U09 | B/C ดาวน์โหลด source A โดยไม่มีสิทธิ์ | ปฏิเสธ แม้รู้ project/release ID; บาง flow อาจ 503 เมื่อ chain ยังไม่ตั้งค่า ซึ่งยังไม่ใช่การพิสูจน์ authorization บนเชน |
| U10 | ตรวจ release JSON / `.local/objects` | JSON ไม่มี wrapped_key/nonce; source object เป็น ciphertext ไม่ใช่ ZIP plaintext |
| U11 | restart API/worker แล้วอ่าน profile/project/release และดาวน์โหลด | SQLite + `.local` เดิมยังใช้ได้, ไม่สร้าง master key ใหม่ทับของเก่า |
| U12 | อัปโหลด v2 `version=1.1.0` โดย A | v1 ยัง immutable, v2 มี ID/hash ใหม่ |
| U13 | publish โดยยังไม่มี source release | conflict SOURCE_REQUIRED ไม่เผยแพร่ |

## 7. Publish / purchase / library — ต้องพร้อม KEEPHUB L1

ก่อนเริ่ม: chain 658440, Contract มี bytecode, ABI ตรง, sponsor key ตรง sponsor(), A/B/C มี เหรียญทดสอบ PINEM สำหรับธุรกรรมที่ตนส่งเอง และ API ใช้ relayer หนึ่ง process ต่อ sponsor

| ID | ทำอะไร | ผลที่ควรได้ |
| --- | --- | --- |
| C01 | A ขอ POST `/projects/{id}/chain-transaction`, ตรวจ to/chain/value/data แล้วส่งผ่าน wallet | createListing ลง KEEPHUB L1 จริง; A จ่าย gas |
| C02 | จาก receipt `ListingCreated` จด numeric listingId แล้ว POST `/projects/{id}/publish` ด้วย `chain_listing_id` เป็น string | Backend ตรวจ owner/price/terms/permissions ตรง จึง published และ public catalog เห็น |
| C03 | ลอง publish listing ของ B, ราคาหรือ terms ไม่ตรง, listing ผูก project อื่นแล้ว | conflict ไม่ปล่อย published ลวง |
| C04 | B สร้าง POST `/purchase-intents` ด้วย project_id และ key ใหม่ | ได้ intent ID, authorization, funding; typed uint256 เป็น decimal strings ห้ามแปลง Number |
| C05 | B ยังไม่มี escrow deposit แล้วพยายามซื้อ | ไม่ยืนยันสิทธิ์/ขายสำเร็จ ห้าม debit seller credit หรือสร้างสิทธิ์ปลอม |
| C06 | B ตรวจและส่ง funding.deposit_transaction จาก wallet รอ receipt | depositOf(B) เพิ่ม; B จ่าย deposit gas เอง |
| C07 | ถ้า intent หมดอายุสร้างใหม่; B เซ็น authorization ด้วย eth_signTypedData_v4 แล้ว confirm | sponsor ส่ง buy; poll intent จน confirmed หลัง confirmations; ได้ entitlement_id |
| C08 | ส่ง confirm/poll ซ้ำ และ create ซ้ำด้วย key/payload เดิม | intent/tx เดิม ไม่ซื้อซ้ำ; key เดิม payload เปลี่ยนต้อง conflict |
| C09 | เซ็นด้วย wallet อื่น, เปลี่ยนราคา/nonce/domain, ใช้ intent หมดอายุ | ปฏิเสธ ไม่มีสิทธิ์/การชำระใหม่ |
| C10 | ขณะส่ง tx เน็ตขาด/refresh | อ่าน intent เดิมและ hash เดิมก่อน retry; ไม่สร้าง purchase ใหม่เพราะยังไม่รู้ผล |
| C11 | GET `/me/entitlements`, `/entitlements/{id}`, ดาวน์โหลด exact release | B เห็นสิทธิ์และได้ ZIP; C ไม่มีสิทธิ์ |
| C12 | A เพิ่ม release ใหม่ใน listing เดิม แล้ว B ดาวน์โหลด v2 | B ไม่ต้องซื้อซ้ำ แต่ไม่สามารถใช้สิทธิ์กับ listing ใหม่ของ A |
| C13 | A แก้ terms/permissions/price แล้ว updateListing และ publish ให้ตรง | การซื้อใหม่ใช้ terms ใหม่; token เก่าคง snapshot เดิม |
| C14 | A พยายามซื้อ listing ตนเอง | SELF_PURCHASE_FORBIDDEN; A เข้าถึง source ตนเองอยู่แล้ว |
| C15 | sponsor ไม่พร้อม/RPC ผิด chain/address ไม่มี Contract | fail closed 503/error ไม่มี confirmed หรือสิทธิ์จำลอง |

ตรวจ balance ก่อน/หลังที่ Contract: deposit ของผู้ซื้อหักตามราคา, platform credit = floor(price ×10/100), seller credit = ส่วนที่เหลือ เป็นเครดิตถอน ไม่ใช่โอนทันทีทุกครั้ง ลอง withdrawCredit/withdrawDeposit ด้วยกระเป๋าเจ้าของผ่าน ABI/ethers ในเครื่อง; ผู้ถอนจ่าย gas เอง ห้าม withdraw เกินยอดหรือถอนแทนคนอื่น

## 8. Resale / สิทธิ์หลังเปลี่ยนเจ้าของ

| ID | ทำอะไร | ผลที่ควรได้ |
| --- | --- | --- |
| R01 | B ขอ POST `/resale-offers` ของ P พร้อม entitlement_id/price_wei/deadline อนาคต | ได้ transaction preparation; ยังไม่ถือว่า active แค่ได้ API response |
| R02 | B ส่ง transaction ผ่าน wallet รอ mined แล้ว GET offer | active=true, ราคา/ผู้ถือ/เวลา ตรงเชน |
| R03 | C ซื้อด้วย intent `{resale_offer_id: tokenId}` → deposit → typed sign → confirm | ownerOf token เปลี่ยนเป็น C, split 90/10, ไม่ใช่ mint สิทธิ์ซ้ำแทน resale |
| R04 | B ดาวน์โหลด token ที่ขายไปแล้ว และ C ดาวน์โหลด | B ถูกปฏิเสธเมื่อไม่มี token อื่นใน listing; C ดาวน์โหลดได้ |
| R05 | B ถือสอง token ของ listing เดียวกันแล้วขายเพียงหนึ่ง | B ยังเข้าถึง listing ผ่าน token ที่เหลือ; ห้ามคาดว่า B ต้องถูกบล็อกทั้งหมด |
| R06 | ขาย Q ที่ห้าม resale / คนไม่ใช่ holder ขอขาย/ยกเลิก / deadline อดีต | ปฏิเสธ ไม่มี offer ใช้งานได้ |
| R07 | B ขอ cancel แล้วส่ง transaction จริง หรือรอ offer หมดอายุ | offer ซื้อไม่ได้หลังเชนยืนยัน cancel/หลัง deadline |
| R08 | ลอง ERC721 direct transfer จาก holder | ถูกบล็อกตาม Contract; เปลี่ยนเจ้าของผ่าน resale ที่รองรับ |

ไฟล์ที่ผู้ซื้อดาวน์โหลดไปแล้วลบคืนจากเครื่องเขาไม่ได้ ทดสอบได้เฉพาะการเข้าถึง Backend ครั้งถัดไป

## 9. Gemini / quota / jobs / output — ใช้ provider จริง

ใช้ source ของ A เองทดสอบ AI ได้โดยไม่ต้องรอซื้อบน KEEPHUB L1 เปิด API + worker และใช้ Free Tier project/key ที่ถูกต้อง การตั้ง flag ไม่เปลี่ยน billing ของ Google; provider 429 ไม่ถือว่าทดสอบ AI ผ่าน ห้ามใช้ UI demo เป็นหลักฐานว่า Gemini ถูกเรียกจริง

| ID | ทำอะไร | ผลที่ควรได้ |
| --- | --- | --- |
| G01 | A สร้าง conversation, PUT exact project_id/release_id ของ A | เก็บ source snapshot และ version; ไม่ใช้ source ล่าสุดโดยไม่ตั้งใจ |
| G02 | GET quota แล้ว POST estimates | แสดงหน่วย tokens, analysis/generation ceilings, expiry; estimate อย่างเดียวไม่หัก used/reserved |
| G03 | POST messages พร้อม estimate_id + key ใหม่ แล้ว poll job | 202 → queued/running → succeeded; worker เรียก provider จริง; history มีคำตอบ, quota settled |
| G04 | POST plans พร้อม estimate ใหม่ requirements และ target_stack | ได้ planning job แล้ว plan state awaiting_confirmation; ยังไม่สร้าง output ZIP เพียงเพราะส่งข้อความ |
| G05 | revision แผน / ใช้ generation_budget ที่เล็กกว่าค่าสูงสุด | revision ใหม่แสดง scope/budget; revision เก่ายืนยันไม่ได้ |
| G06 | confirm latest revision พร้อม key และ poll job | reserve quota ครั้งเดียว → generation → output_id; download ZIP ได้ |
| G07 | ตรวจ ZIP ที่ได้ | มีไฟล์ผลลัพธ์ คำสั่งรัน provenance/license และ validation report; เปิดโค้ดก่อนรันในสภาพแวดล้อมทดสอบแยก |
| G08 | confirm/retry ด้วย key เดิม | job เดิมไม่เรียก provider และคิด quota ซ้ำ |
| G09 | เปลี่ยน sources หรือส่งข้อความใหม่หลังมีแผนแต่ก่อน confirm | แผนเดิม stale; ต้อง estimate/plan ใหม่ |
| G10 | B อ่าน chat/job/output ของ A หรือเลือก release ที่ไม่มีสิทธิ์ | ปฏิเสธ ไม่เปิด source/history/output ข้ามบัญชี |
| G11 | หยุด worker แล้ว enqueue; เปิด worker กลับ | งานค้าง queued จนมี worker ไม่สำเร็จลวง แล้วกลับมาทำงานได้ |
| G12 | ตั้ง quota ต่ำใน DB ทดสอบแยก/บัญชีใหม่ แล้วขอเกิน remaining | quota error; ไม่ติดลบ ไม่แจกเพิ่มจาก refresh/login/ซื้อ source |
| G13 | โควตาหมดอายุ/ไม่ตั้ง key/provider error/429 | error มีเหตุผล ไม่ fallback ไป model/project เสียเงิน; quota ไม่แสดงสำเร็จลวง |
| G14 | worker/provider outcome ไม่แน่นอนระหว่าง request | ไม่ retry อัตโนมัติแบบเสี่ยงเรียกซ้ำ; reserved อาจคงไว้รอ reconcile ไม่ควรคืนเงินฟรี |
| G15 | ใช้สอง source ที่มีสิทธิ์ → plan → confirm → ZIP | provenance อ้างทั้งสอง exact releases ไม่ใช่ source เดียว |
| G16 | หลังขายสิทธิ์หมดแล้วเปิด source/chat เดิมหรือทำงานใหม่ | ตรวจสิทธิ์ซ้ำและปฏิเสธเมื่อไม่เป็น holder; ไฟล์ที่โหลดไปแล้วเรียกคืนไม่ได้ |

G12–G14 ใช้ test DB/config แยก ไม่ปรับบัญชีเดโมหลักเพื่อทำให้หมดโควตา และไม่ยิง request จำนวนมากเพื่อสร้าง 429 หากไม่มีวิธีจำลองอย่างปลอดภัยให้บันทึก BLOCKED แล้วอ้าง automated test แยก

API sequence ที่ต้องใช้ตามลำดับ:

```text
POST /gemini/conversations {title}
PUT /gemini/conversations/{id}/sources {sources:[{project_id,release_id}]}
GET /gemini/quota
POST /gemini/conversations/{id}/estimates
POST /gemini/conversations/{id}/messages {content,estimate_id}
GET /jobs/{job_id}                 # poll จนจบ
POST /gemini/conversations/{id}/estimates   # ใหม่หลัง source/message เปลี่ยน
POST /gemini/conversations/{id}/plans {estimate_id,requirements,target_stack}
GET /jobs/{job_id}
GET /gemini/conversations/{id}     # ดู plans[].id / revision / state
POST /gemini/plans/{plan_id}/confirm {revision}
GET /jobs/{job_id}
GET /outputs/{output_id}/download
```

## 10. Source import / derivative / sandbox

| ID | ทำอะไร | ผลที่ควรได้ |
| --- | --- | --- |
| D01 | POST `/gemini/source-imports` ใส่ file/origin/license_id/license_evidence แต่ ZIP hash ไม่อยู่ allowlist | ถูกบล็อก แม้มีคำว่า MIT; ไม่เชื่อชื่อ license อย่างเดียว |
| D02 | ผู้ดูแลตรวจ license/หลักฐานและ exact SHA256 ของ archive ที่ตนมีสิทธิ์ แล้วใส่ allowlist ใน test config; restart | import archive นั้นได้และมี provenance; เปลี่ยน archive ต้องตรวจ/hash ใหม่ |
| D03 | output ใช้ source ที่อนุญาต derivative ทุกตัว แล้ว POST `/outputs/{id}/project-draft` พร้อม ProjectInput | ได้ draft ใหม่พร้อม provenance แล้วอัปโหลด/publish ตาม flow ปกติ |
| D04 | มี source หนึ่งตัวห้าม derivative / สิทธิ์หมด / build failed | ไม่อนุญาต derivative publication; resale_allowed ไม่ใช่ derivative_allowed |
| D05 | ไม่มี Modal config แล้ว generate | validation ระบุ build=not-run ไม่ใช่ passed |
| D06 | ถ้าเปิด Modal: prebuilt image + trusted build command; ลอง output ผ่าน/ไม่ผ่าน | แสดงผลจริง build failure ทำให้ job failed และบล็อก publish; ไม่ execute generated code บน API host |

Modal ไม่จำเป็นสำหรับเดโมพื้นฐาน ให้ D06 เป็น N/A พร้อมเหตุผลเมื่อไม่ได้เปิด ส่วน D05 ต้องยังตรวจได้

## 11. เรียก API จริงจาก browser เมื่อหน้าจอยังไม่เชื่อม

เปิด DevTools Console ที่หน้า `http://127.0.0.1:4173` ซึ่ง proxy ไป API ในเครื่องแล้ว ใช้เฉพาะโค้ดที่อ่านและเข้าใจ ตัวอย่างนี้ไม่อ่าน private key จาก wallet:

```javascript
var qaCsrf;
async function qaApi(path, method = "GET", body, key) {
  const headers = {};
  if (qaCsrf && method !== "GET") headers["X-CSRF-Token"] = qaCsrf;
  if (key) headers["Idempotency-Key"] = key;
  const multipart = body instanceof FormData;
  if (body !== undefined && !multipart) headers["Content-Type"] = "application/json";
  const response = await fetch("/api/v1" + path, {
    method, credentials: "include", headers,
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || response.statusText), {status:response.status, payload});
  return payload.data;
}
var qaWallet = (await ethereum.request({method:"eth_requestAccounts"}))[0];
if (Number(await ethereum.request({method:"eth_chainId"})) !== 658440) throw new Error("Switch wallet to KEEPHUB L1 first");
var qaChallenge = await qaApi("/auth/challenges", "POST", {address:qaWallet, chain_id:658440});
var qaHex = "0x" + Array.from(new TextEncoder().encode(qaChallenge.message), b => b.toString(16).padStart(2,"0")).join("");
var qaSignature = await ethereum.request({method:"personal_sign", params:[qaHex,qaWallet]});
var qaSession = await qaApi("/auth/verify", "POST", {challenge_id:qaChallenge.id, signature:qaSignature});
qaCsrf = qaSession.csrf_token;
```

หลัง reload เรียก `qaSession = await qaApi('/auth/session'); qaCsrf = qaSession.csrf_token;` หลังประกาศ helper ใหม่ ห้าม copy token/cookie ลงผลรายงาน

สร้าง draft และอัปโหลด ZIP จริง (browser จะเปิด file picker):

```javascript
var qaProject = await qaApi("/projects", "POST", {
  title:"QA Site P", description:"Owned source for manual testing", stack:"HTML CSS JS",
  demo_url:"https://example.com", price_wei:"1000000000000000",
  license_terms:"QA demo: resale and derivative permitted", resale_allowed:true, derivative_allowed:true
});
var qaPicker = document.createElement("input"); qaPicker.type="file"; qaPicker.accept=".zip";
qaPicker.onchange = async () => {
  var form = new FormData(); form.append("file",qaPicker.files[0]); form.append("version","1.0.0");
  globalThis.qaRelease = await qaApi(`/projects/${qaProject.id}/releases`,"POST",form,crypto.randomUUID());
  console.log("Uploaded release",qaRelease.id);
};
qaPicker.click();
```

บันทึก release id หลัง upload เสร็จ; browser บางตัวต้อง trigger file picker จาก user gesture หากไม่เปิด ให้เลือกไฟล์ผ่าน UI หรือใช้ API client ที่จัดการ session/origin/CSRF ถูกต้อง

Transaction preparation ของ Backend มี `chain_id,to,data,value` แต่ RPC wallet รับ `from,to,data,value` และ value เป็น hex:

```javascript
async function qaSendTransaction(prepared) {
  if (prepared.chain_id !== 658440 || Number(await ethereum.request({method:"eth_chainId"})) !== 658440)
    throw new Error("Wrong chain");
  return ethereum.request({method:"eth_sendTransaction", params:[{
    from:qaWallet, to:prepared.to, data:prepared.data,
    value:"0x" + BigInt(prepared.value || "0").toString(16)
  }]});
}
// ตรวจ to/data/value ใน wallet ก่อนยืนยันทุกครั้ง
// var tx = await qaApi(`/projects/${qaProject.id}/chain-transaction`,"POST");
// var hash = await qaSendTransaction(tx);
```

รอ receipt success แล้ว decode event ListingCreated ด้วย ABI ที่ตรง Contract (ไฟล์ `backend/app/contract_abi.json` หรือ ethers ในเครื่อง) เพื่อหา listingId ห้ามเดาว่าเลขถัดไปเป็นของตนเพราะมี transaction อื่นแทรกได้

ซื้อใน browser profile B หลัง login ใหม่ (qaWallet ต้องเป็น B จริง):

```javascript
// ใช้ ID ของ published project A
// var purchase = await qaApi('/purchase-intents','POST',{project_id:'PROJECT_ID'},crypto.randomUUID());
// หาก escrow ไม่พอ ส่ง purchase.funding.deposit_transaction และรอ mined ก่อน
// await qaSendTransaction(purchase.funding.deposit_transaction);
// ถ้าใกล้หมดอายุให้สร้าง intent ใหม่หลัง deposit โดยไม่ deposit ซ้ำโดยไม่ตรวจ balance
// var sig = await ethereum.request({method:'eth_signTypedData_v4',params:[qaWallet,JSON.stringify(purchase.authorization)]});
// await qaApi(`/purchase-intents/${purchase.id}/confirm`,'POST',{signature:sig},crypto.randomUUID());
// await qaApi(`/purchase-intents/${purchase.id}`); // poll จน confirmed
```

ดาวน์โหลดเป็น binary ใช้ `fetch` + `response.blob()` หรือเปิด GET download URL บน origin เดียวกัน ห้ามใช้ qaApi ที่คาด JSON สำหรับ ZIP/image

## 12. Restart / deploy acceptance และเกณฑ์จบ

| ID | ทำอะไร | ผลที่ควรได้ |
| --- | --- | --- |
| O01 | restart API/worker โดยไม่ลบ DB/storage | session/โปรไฟล์/releases/ประวัติยังอยู่; งานที่ไม่แน่ใจไม่ถูกเรียก provider ซ้ำเงียบ ๆ |
| O02 | backup DB + objects + master key ไปพื้นที่ทดสอบ แล้ว restore คู่กัน | source ดาวน์โหลดและถอดรหัสได้; backup DB ต้อง consistent ไม่ copy SQLite ระหว่างเขียนแบบไม่ประสาน |
| O03 | บน VM/host จริง: restart/redeploy | ไฟล์/DB/key ยังอยู่บน persistent disk; ephemeral filesystem ไม่ผ่าน |
| O04 | ตรวจ HTTPS + CORS + secure cookie + FE origin หลัง deploy | login/refresh/logout/upload ได้ ไม่มี mixed-content/third-party cookie ปัญหา |
| O05 | ดู responses/logs/source maps/browser storage | ไม่มี API key/private key/session token/wrapped source key หลุด |

Local storage ปัจจุบันเป็น development mode และถูกบล็อกใน production; production Settings ยังบังคับ PostgreSQL/HTTPS ด้วย ดังนั้นการ deploy demo แบบ VM local disk ต้องเตรียมโหมดและการป้องกันที่เหมาะสมก่อน ไม่ควรแค่เปลี่ยน ENVIRONMENT=production แล้วคาดว่าจะใช้ local files ได้ทันที และ health ready ไม่ได้ตรวจ Gemini/RPC/sponsor ครบ

เกณฑ์พร้อมสาธิต: A login → สร้าง P/upload → publish บน KEEPHUB L1 → B deposit/buy → download → A upload v2 → B download โดยไม่ซื้อซ้ำ → B resale ให้ C → ตรวจสิทธิ์หลัง resale → C ใช้ Gemini plan/confirm/download output ผ่าน API จริง และบันทึกว่าหน้าจอใดเชื่อมสำเร็จ/ยังต้องใช้ API โดยตรง

ถ้าจะสาธิตเฉพาะ local upload + AI ให้ระบุขอบเขตนั้นและทำ C/R เป็น BLOCKED ไม่เรียกว่า marketplace end-to-end ผ่านแล้ว

## แบบบันทึกผล

```text
Run date / commit:
Mode: UI demo | Local API | KEEPHUB L1 integration
API / FE origin:
Case ID:
Status: NOT RUN | PASS | FAIL | BLOCKED | N/A
Steps / expected:
Actual:
Request ID / public transaction hash:
Evidence / blocker / next action:
```
