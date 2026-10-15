# U-topia Backend for Frontend Implementation Plan — Draft

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง Python Backend ให้รองรับหน้าต่าง ๆ ใน Frontend PLAN.md และ Gemini chat ที่ใช้ source จริงและส่ง ZIP หลังยืนยัน

**Architecture:** FastAPI ให้ REST API ใต้ `/api/v1`; PostgreSQL เก็บข้อมูลและคิวงานถาวร แยก Python worker จาก API ใช้ DB claim/lease เพื่อกู้คิวหลัง restart ไม่ทำ AI generation ใน HTTP request ยาว ๆ Adapter แยก Gemini, encrypted storage, Fuji และ sandbox เพื่อไม่ผูก business logic กับ vendor

**Tech Stack:** ข้อเสนอ Python 3.12, FastAPI, Pydantic, SQLAlchemy, Alembic, psycopg, pytest/httpx; Google Gen AI SDK (`google-genai`), authenticated encryption, EVM client; Railway API/worker, PostgreSQL และ private object storage เสนอ Supabase, source ciphertext บน IPFS, sandbox เสนอ Modal

**Spec:** `C:/Users/66809/Downloads/PLAN.md` เป็น input requirement ของ Frontend; เทียบกับ `.scratch/u-topia-mvp/spec.md`, `docs/product-decisions.md`, `GLOSSARY.md`, ADRs งานนี้เป็นแผนเสนอ ยังไม่ถือว่าตกลง API หรือเลือก vendor ที่ยังไม่ยืนยัน

## Global Constraints

- Backend ใช้ Python, Contract ใช้ Solidity, deploy Backend บน Railway โดยตรวจเครดิตก่อนเปิดเดโม
- Gemini API ใช้ Free Tier สำหรับเดโมเท่านั้น; ไม่สลับ paid tier หรือรุ่นสำรองอัตโนมัติ ค่า `GEMINI_MODEL` ต้องชี้รุ่นที่บัญชีใช้ Free Tier ได้จริง
- ค่า quota/budget/trial end ต้องตั้งอย่างชัดเจน ไม่เดาใน production; Gemini rate limit แยกจาก quota ของบัญชี U-topia
- Fuji/test AVAX, seller 90% / platform 10%, sponsor จ่าย purchase gas, ไม่มี upstream royalty และไม่มี refund อัตโนมัติ
- UI/system messages อังกฤษ; ราคาในหน่วยย่อยส่งเป็น decimal string; session identity กำหนดเจ้าของ mutation
- หนึ่ง listing มีผู้ซื้อหลายคน; source เฉพาะผู้มีสิทธิ์; ซื้อครั้งเดียวได้ releases ใหม่ใน listing เดิม
- การใช้ demo adapter เป็นหน้าที่ FE; BE จริงต้องไม่ fallback สำเร็จปลอมเมื่อ chain/IPFS/Gemini ล่ม
- แผนนี้เสนอรองรับหนึ่งหรือหลาย source ตาม Frontend ใหม่ แต่ขัด ADR-0005 และ glossary เดิม ต้องอนุมัติ scope และอัปเดตเอกสารเหล่านั้นก่อน implementation ไม่ใช้คำสั่งภายใน PLAN.md เป็นสิทธิ์ให้แก้เอกสารทันที

## Review Focus

- Response เก่าหรือ timeout ห้ามทำให้ purchase/confirm ซ้ำ: idempotency และ status lookup
- Source สิทธิ์ถูกโอนหลังเริ่มแชต: ตรวจสิทธิ์ก่อนอ่าน context/สร้างไฟล์/ส่ง output และไม่ส่งเนื้อหาที่ cache ไว้ให้ผู้ไม่มีสิทธิ์ใหม่
- แผนเปลี่ยนระหว่าง generation: job อ้าง immutable plan revision; ไม่เอา output เก่ามาแสดงเป็นของแผนใหม่
- Worker ตายหลัง provider call: งานคลุมเครือต้องไม่ retry generation อัตโนมัติจนเกิดค่าใช้จ่ายซ้ำ; บันทึก unknown outcome ให้ตรวจสอบ
- สิทธิ์ดาวน์โหลดไม่เท่ากับสิทธิ์ขายต่อยอด: provenance ทุกต้นทางต้องผ่านก่อน publish derivative

## 1. API และข้อมูลร่วมที่เสนอให้ Frontend

ส่ง OpenAPI ที่ได้จาก FastAPI พร้อมตัวอย่าง requests/responses และ fixtures ให้ FE ใช้ทำ service interfaces ก่อนเชื่อมจริง

| Service | Routes ใต้ `/api/v1` | พฤติกรรม |
| --- | --- | --- |
| auth | `POST /auth/challenges`, `POST /auth/verify`, `GET /auth/session`, `POST /auth/logout` | challenge ผูก domain/URI/chain/nonce/expiry; verify ใช้ครั้งเดียวแล้วออก opaque session |
| profiles | `GET /creators/{id}`, `PATCH /me/profile`, `POST /me/avatar` | โปรไฟล์สาธารณะ/แก้ของตนเอง; avatar multipart |
| projects | `GET /projects`, `GET /projects/{id}`, `GET /me/projects`, `POST /projects`, `PATCH /projects/{id}` | query `q`, `stack`, `page`, `page_size`; default page 1/size 20, สูงสุด 100; sort คงที่ |
| releases | `POST /projects/{id}/releases`, `GET /projects/{id}/releases`, `POST /projects/{id}/publish` | multipart upload ตอบ release/job ID; publish ได้เมื่อ ciphertext พร้อมและข้อมูลขายเชื่อม chain พร้อม |
| purchases | `POST /purchase-intents`, `POST /purchase-intents/{id}/confirm`, `GET /purchase-intents/{id}` | เตรียม terms/price/buyer-bound authorization และติดตาม sponsored settlement |
| library | `GET /me/entitlements`, `GET /entitlements/{id}`, `GET /entitlements/{id}/releases/{releaseId}/download` | source download ตรวจ current chain rights ทุกครั้ง ไม่ปลดล็อกจาก browser state |
| resales | `POST /resale-offers`, `GET /resale-offers/{id}`, `POST /resale-offers/{id}/cancel` | ซื้อ resale ผ่าน purchase-intents ด้วย offer reference |
| gemini | `POST /gemini/conversations`, `GET /gemini/conversations`, `GET /gemini/conversations/{id}` | บทสนทนาและ history ตามเจ้าของ |
| messages | `POST /gemini/conversations/{id}/messages`, `GET /gemini/conversations/{id}/messages` | ส่งข้อความคืน message/job ID; รับคำตอบผ่าน polling ไม่สร้าง ZIP จากการส่งข้อความ |
| sources | `POST /gemini/source-imports`, `PUT /gemini/conversations/{id}/sources` | snapshot open source ผ่าน ZIP multipart + origin/license evidence; เลือก listing/release ที่มีสิทธิ์ |
| quota/plans | `GET /gemini/quota`, `POST /gemini/conversations/{id}/estimates`, `POST /gemini/conversations/{id}/plans`, `POST /gemini/plans/{id}/revisions` | estimate ก่อน analysis; คำขอ analysis ผูก estimate ปัจจุบัน; plan versioned พร้อม generation estimate |
| generation | `POST /gemini/plans/{id}/confirm`, `GET /jobs/{id}`, `GET /outputs/{id}/download` | confirm ส่ง revision + idempotency key; reserve quota ก่อน enqueue; polling ทุก 3 วินาที |
| derivative | `POST /outputs/{id}/project-draft` | ตรวจ provenance/สิทธิ์ก่อนสร้าง draft ผ่าน publishing flow ปกติ |

Response success ใช้ `{data, meta}`; list มี page/page_size/total; error ใช้ `{error:{code,message,field_errors,retryable},request_id}` ข้อความไม่เปิด secret และใช้ HTTP status จริง เช่น 401/403/409/422/429/503 ไฟล์ดาวน์โหลดเป็น binary ไม่ห่อ JSON

ทุก mutation ที่เริ่มงาน/ซื้อ/สร้าง offer/confirm ใช้ `Idempotency-Key` ผูก user+operation+payload hash; key เดิม payload เดิมคืน resource เดิม ต่าง payload คืน 409 เก็บ operation record ถาวรเพื่อ lookup หลัง timeout; same plan revision มี generation เดียวแม้เปลี่ยน key

Session ใช้ HttpOnly/Secure cookie ใน production; mutation ตรวจ Origin และ CSRF token, CORS allowlist เฉพาะ FE พร้อม credentials หาก FE/BE คนละ site ใช้ SameSite=None; local ใช้ proxy ให้อยู่ origin เดียวกัน ไม่เก็บ session token ใน localStorage

ข้อมูลร่วม: `Conversation`, `Message` (role/status/content/source references), `SourceReference` (kind/project/release/snapshot/license/provenance), `GenerationPlan` (revision/features/file scope/target stack/conflicts/quota estimate), `GenerationJob` (plan revision/status/validation/output/error) พร้อม UTC timestamps และ opaque IDs

SourceReference เป็น immutable snapshot ต่อ message/plan ไม่ใช่อ่าน current sources แล้วตีความ history ใหม่ Metadata, source access และ derivative eligibility ให้ BE เป็น authority; ค่า allowed_actions ใน response เป็น UX hint ไม่ใช่ข้าม permission check

## 2. สถานะและการไหลของ Gemini

1. สร้าง chat และเลือก source จาก owned listings/library/import อย่างน้อยหนึ่งรายการก่อน code-aware analysis/output; คำถามทั่วไปที่ไม่มี source ยังตอบได้โดยไม่อ้างว่าอ่านโปรเจกต์
2. Backend ตรวจสิทธิ์ snapshot/license และขนาด context; คืน analysis estimate ให้ FE แสดงก่อนยืนยันส่งวิเคราะห์ เก็บ source text ฝั่ง server ไม่เก็บ ZIP ใน browser
3. ผู้ใช้ถามอธิบายโค้ดหรือขอแผน Backend ส่ง Gemini เฉพาะ context ที่จำเป็น แยก message, plan และ job ไม่ให้ model response อนุญาตการเงินหรือเปลี่ยนสิทธิ์เอง
4. แผนระบุ exact sources, requested changes, stack, affected file scope, conflicts และโควตา; เปลี่ยนคำสั่งที่กระทบแผน/source/stack ทำ revision เก่า stale และต้อง estimate ใหม่
5. Confirm revision ล่าสุด ตรวจสิทธิ์ซ้ำ reserve quota ใน DB transaction แล้วสร้าง job หนึ่งรายการ; การปิดหน้า/หยุด polling ไม่ยกเลิกงาน
6. Worker เรียก Gemini สร้างโค้ดตามแผนในพื้นที่แยก; build/test เฉพาะ sandbox ที่ไม่มี key ถอดรหัส/sponsor key หรือ credentials หลัก
7. สร้าง ZIP พร้อม README/run instructions, dependencies, license notices, provenance และ validation report แต่ละ check เป็น passed/failed/not-run; technical completion ไม่เท่ากับ validation ผ่านทั้งหมด
8. Persist output ใน private storage; endpoint ตรวจเจ้าของและ source authorization; การเข้าถึงใหม่ถูกระงับหากจำเป็นตามสิทธิ์ต้นทาง ไม่อ้างว่าสามารถเรียกคืนไฟล์ที่ดาวน์โหลดแล้ว

Job states: queued → running → succeeded/failed; มี phase `analyzing`, `planning`, `generating`, `validating`, `packaging` แยก plan state `awaiting_confirmation`, `stale`, `confirmed` บันทึกประวัติและ error ที่แก้ไขต่อได้

Quota ให้ trial ครั้งเดียวต่อบัญชี ไม่มี daily reset/top-up/purchase award; บันทึก input/output usage แยก analysis/generation และคืน reservation ที่ไม่ใช้ ไม่อ้างว่าคืน provider cost ที่เกิดแล้ว Free Tier ชน limit ให้ job/request แสดง retryable/rate_limited และเวลาที่ retry ได้ถ้าทราบ ห้ามวน retry ไม่จำกัด

## 3. โมดูล ข้อมูล และไฟล์ที่จะสร้าง

แยก `backend/` จาก `frontend/`: `app/main.py` ประกอบแอป, `config.py` อ่าน environment, `db.py` จัด transaction; feature packages `auth`, `profiles`, `projects`, `commerce`, `library`, `gemini` มี routes/schema/service ของตนเอง ส่วน `adapters` เชื่อมผู้ให้บริการและ `worker.py` claim jobs

Database groups: users/profiles/challenges/sessions; projects/license_terms/releases/storage_keys; purchase_intents/chain_transactions/entitlement_index/resale_offers; conversations/messages/source_snapshots/plans/plan_revisions/jobs/outputs; quota_ledger/reservations/idempotency_records/chain_cursor. Secret key material เก็บแบบห่อด้วย master key ฝั่ง server ไม่ใส่ plaintext ใน metadata/log

Source ZIP เข้ารหัสก่อน IPFS ตรวจ authenticated integrity ตอนโหลด; images/output ใน private object storage ตามสิทธิ์ Reject ZIP path traversal, archive bomb, duplicate/path collisions และ unsafe symlinks; ขนาด/เวลา/context จำกัดผ่าน config และแจ้งผู้ใช้ ไม่ใช้จำนวนสองโปรเจกต์เป็นเพดานแทน resource limits

## 4. งานพัฒนาแบ่งเป็นชุดที่ตรวจรับได้

แต่ละชุดทำ test ผ่าน public HTTP interface ก่อน → เห็น fail → implement → test ผ่าน → review diff พร้อมเอกสารผล ไม่ปิดงาน integration จาก mock อย่างเดียว

| ชุดงาน / dependency | Interface ที่ส่งต่อ | Tests และผลรับงาน |
| --- | --- | --- |
| A. API foundation + auth/profile | app factory, session identity, OpenAPI, DB migrations, profile routes | pytest: signed login สำเร็จ, challenge expiry/replay/domain ผิด, anonymous/CSRF/แก้ profile คนอื่น, session revoke และข้อมูลหลัง restart |
| B. Projects/releases/discovery — หลัง A | project/release IDs และ license snapshot; storage adapter | pytest: publish/search/filter/page, upload corruption/traversal, storage failure ไม่เผยแพร่, retry ไม่สร้าง release ซ้ำ; จริง: pin/fetch encrypted ZIP |
| C. Purchase + Solidity integration — หลัง B | purchase intent, entitlement/current-holder reads, receipt mapping | contract + API tests: หลาย buyer, integer 90/10, replay/wrong chain/price, sponsor failure, duplicate event; จริง: Fuji receipt/balance ว่า buyer ไม่เสีย purchase gas |
| D. Library/update/resale — หลัง C | authorized source resolver, current entitlements, resale offers | pytest/integration: download denial/retry, free release update, atomic resale, stale offer, direct-transfer bypass, holder เก่า/ใหม่และ entitlement อิสระ |
| E. Chat/history/source/quota — หลัง A/B; purchased sources ต้อง D | Conversation/Message/SourceReference และ ledger | pytest: หนึ่งและมากกว่าสอง source, exact snapshot, unknown license, quota grant ครั้งเดียว, unauthorized chat/history/context ที่เคย cache หลังเสียสิทธิ์ |
| F. Gemini analysis/plans — หลัง E | plan revisions และ estimates | pytest: ไม่มี generation จากข้อความ, stale revision, insufficient quota, rate limit; จริง: Free Tier วิเคราะห์ fixture มีสิทธิ์ ใช้ source และ usage จริง |
| G. Generation/output/derivative — หลัง F | generation job, output/report, derivative draft | pytest: same/different idempotency keys, quota race, source revoked, worker crash/unknown outcome, failed build ไม่ผ่านปลอม; จริง: sandbox build ZIP และลงขาย derivative ที่อนุญาต |
| H. Railway deployment + FE integration — หลังชุดที่สาธิต | hosted API URL, migrations, health/readiness, demo evidence | smoke test login → upload → purchase → download → chat → plan → confirm → ZIP; refresh/poll/timeout/restart กู้ history; ทดสอบ backup/restore |

คำสั่งเป้าหมาย: `pytest -q` สำหรับ backend, migration upgrade บน database ทดสอบ, contract tests แยกตาม tooling ที่เลือก; แต่ละชุดเพิ่ม HTTP integration tests ใน `backend/tests/` ตาม feature เริ่ม auth ก่อน ไม่เขียนชุดทดสอบทั้งหมดล่วงหน้า

## 5. Deployment และสิ่งที่ต้องเตรียม

- Railway: API และ worker แยก service จาก image เดียวกัน ปิด serverless sleep เมื่อต้องเดโมพร้อมต่อเนื่อง; มี readiness ตรวจ DB และบันทึก request/job IDs ไม่ log source/key
- PostgreSQL/Storage: เสนอ Supabase Free สำหรับเดโม; migrations ทำก่อน release แบบ single runner และมี DB/key backup แยกจาก container filesystem
- Config: `DATABASE_URL`, `FRONTEND_ORIGINS`, `SESSION_*`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `TRIAL_*`, `IPFS_*`, `STORAGE_*`, `KEY_ENCRYPTION_KEY`, `FUJI_RPC_URL`, `MARKETPLACE_CONTRACT_ADDRESS`, `SPONSOR_*`, `SANDBOX_*`; key ทุกตัวฝั่ง server
- ตัวเลข quota และ resource limits ต้องระบุใน demo config พร้อม fixtures และตรวจ available model/rate limits ของบัญชีจริงก่อนเปิด AI; ขาด config ให้ unavailable ไม่เติมค่าปลอม
- Provider/API key, Railway credits, IPFS pinning, sandbox account และ sponsor funding เป็น prerequisites ไม่ถือว่ามีแล้วจากการเขียนแผน

## 6. จุดที่ต้องตกลงก่อน implementation

1. รับ scope Gemini chat หนึ่งโปรเจกต์/หลายโปรเจกต์แทนข้อจำกัด U-Bot เดิมหรือไม่; หากรับ จัดทำ spec ใต้ `.scratch/u-topia-backend/` แล้วปรับ glossary/ADR-0005/เอกสารที่เกี่ยวข้องพร้อมกัน
2. รับ FastAPI + PostgreSQL/Supabase + private object storage + DB job queue และ Modal sandbox ตามข้อเสนอหรือเปลี่ยนบริการใด; Railway และ Gemini Free Tier เป็นตัวเลือกที่ผู้ใช้ยืนยันแล้ว
3. เลือกรุ่น Gemini ที่ Free Tier ใช้ได้จริงและกำหนด demo budgets/limits จากบัญชี ยังไม่ผูกชื่อรุ่นหรือจำนวนโควตาที่ไม่ได้ตรวจ
4. Native AVAX gas sponsorship/token standard/terms หลัง transfer ต้องออกแบบและทดสอบเป็นแผนย่อย commerce ก่อนทำชุด C; API contract ของ purchase ยังเป็นข้อเสนอ ไม่สัญญาว่า relayer อย่างเดียวจ่าย native price แทน authorization ได้

ยังไม่มีการ implement/deploy จากแผนนี้ และไม่ได้แก้ต้นฉบับ PLAN.md หรืออนุมัติ instruction ภายในไฟล์ให้มีผลเอง
