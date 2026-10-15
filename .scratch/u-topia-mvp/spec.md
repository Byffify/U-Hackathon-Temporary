> Current decision: ADR-0011 and .scratch/u-topia-frontend/spec.md supersede older multi-project-only/provider-deferred descriptions. Gemini is selected; one-project editing is in scope. Existing proposed full-stack tickets remain historical drafts.

# U-topia — Hackathon MVP

Status: ready-for-agent
Review: awaiting user review of this written spec
Delivery target: 16 October 2026, 12:00 Asia/Bangkok

เอกสารนี้สังเคราะห์ขอบเขตผลิตภัณฑ์ที่ผู้ใช้ยืนยัน โดยใช้คำศัพท์ใน glossary และข้อสรุป ADR เป็นฐาน กฎทางเทคนิคที่ระบุว่าเป็นข้อเสนอให้ตรวจในรอบ review นี้ ไม่ถือว่าผู้ใช้เลือกผู้ให้บริการหรือค่าตัวเลขที่ยังพักไว้แล้ว

## Problem Statement

ผู้สร้างเว็บไซต์ต้องการแสดงคุณค่าของผลงานให้คนค้นพบ ทดลอง และซื้อสิทธิ์ใช้โปรเจกต์ต้นฉบับ โดยไม่ต้องแจก source เต็มก่อนซื้อ ผู้ซื้ออยากได้ source ที่ส่งมอบได้จริง เงื่อนไขชัดเจน และเลือกนำฟีเจอร์จากหลายโปรเจกต์มาประกอบเป็นผลงานใหม่ผ่าน AI ได้

การทดลองเว็บไซต์ใน browser ไม่สามารถปิดบัง HTML, CSS และ JavaScript ที่ browser ได้รับ การป้องกันของ U-topia จึงมุ่งที่ ZIP ต้นฉบับที่เข้ารหัสและสิทธิ์รับไฟล์ ไม่อ้างว่าปิดบัง frontend ทุกส่วนหรือลบสำเนาที่ผู้ซื้อดาวน์โหลดแล้วได้

## Solution

สร้าง marketplace ภาษาอังกฤษ มี frontend, backend และ smart contract บน Avalanche Fuji ใช้ test AVAX ซื้อขาย ผู้สร้างมีโปรไฟล์ ลงภาพ รายละเอียด ราคา เงื่อนไขสิทธิ์ demo URL เดิม และ ZIP ซึ่งเข้ารหัสก่อนเก็บบน IPFS ปกติ เผยแพร่ได้โดยไม่รอแอดมินอนุมัติ

ผู้ซื้อจ่ายราคาที่แสดง ได้ token สิทธิ์ของตนเอง และรับ ZIP หลัง backend ยืนยัน wallet และสิทธิ์บนเชน หนึ่งรายการขายให้หลายคนได้ ซื้อแล้วรับอัปเดตในรายการเดิมฟรี ผู้ขายรับ 90% และ U-topia หัก 10% พร้อมออก gas ของการซื้อจากส่วนนี้

Gemini เป็นบริการเสริมเฉพาะงานรวมหลายโปรเจกต์ ผู้ใช้เลือกฟีเจอร์ พิมพ์ความต้องการเพิ่ม เลือก stack เป้าหมาย และตรวจแผนพร้อมโควตาก่อนยืนยัน จากนั้นรับโค้ด ZIP ไปใช้เองหรือกลับมาลงขายตามเงื่อนไขต้นทาง แพลตฟอร์มไม่ deploy ผลงานให้

## User Stories

### Discovery and identity

1. As a visitor, I want to browse projects from different creators, so that I can discover websites worth trying.
2. As a visitor, I want to search project titles and descriptions, so that I can find relevant work.
3. As a visitor, I want to view a creator profile through a shareable URL, so that I can discover their work from a résumé.
4. As a visitor, I want to see screenshots, a description, the declared stack, a price, and license conditions, so that I can understand an offer before buying.
5. As a visitor, I want to open the creator's existing demo URL, so that I can try the website.
6. As a user, I want to authenticate with my wallet, so that my account matches the identity used for source-access rights.
7. As a user, I want to set a name, profile image, and biography, so that other people can recognize me.
8. As a user, I want one account to buy and sell, so that I do not maintain separate identities.
9. As a user, I want clear wrong-network and wallet-rejection states, so that I know how to continue without an accidental transaction.

### Publishing and source protection

10. As a creator, I want to upload a ZIP with screenshots and project metadata, so that I can offer my source project for sale.
11. As a creator, I want to keep my original language and framework, so that publishing does not require converting my project.
12. As a creator, I want the source ZIP encrypted before it is stored on IPFS, so that discovering its CID does not disclose the source.
13. As a creator, I want to choose a test AVAX price and state the license conditions, so that buyers know what they receive.
14. As a creator, I want to choose whether original-license resale is allowed separately from derivative sales, so that those permissions are not confused.
15. As a creator, I want to publish without waiting for an administrator, so that I can complete the selling flow independently.
16. As a creator, I want to publish updates under the same listing, so that existing buyers can receive them without paying again.
17. As a creator, I want one listing to support multiple buyers, so that one sale does not exhaust the product.

### Purchase and delivery

18. As a buyer, I want to pay in test AVAX on Fuji, so that I can test the complete purchase without real money.
19. As a buyer, I want the platform to cover the purchase gas, so that my purchase does not require an additional gas payment.
20. As a buyer, I want to review the exact listing terms before signing, so that I understand use, modification, resale, and derivative permissions.
21. As a buyer, I want my successful purchase recorded on-chain, so that source-access rights can be verified independently of a browser success message.
22. As a buyer, I want purchased projects in My Library, so that I can find downloads and updates.
23. As a buyer, I want to receive the authorized ZIP, so that I can install, use, or deploy it myself.
24. As a buyer, I want to retry a failed download without another purchase, so that delivery errors do not cost me twice.
25. As a buyer, I want free updates in the same listing, so that my existing purchase stays useful.
26. As a creator, I want 90% of the sale proceeds, so that the 10% platform fee is predictable.
27. As a platform owner, I want gas paid from platform resources and accounted for against the fee, so that the seller's 90% is not silently reduced.

### Resale and derivatives

28. As a rights holder, I want to offer my existing access token for resale when permitted, so that I can sell rights I no longer want.
29. As a secondary buyer, I want payment and rights transfer to settle together, so that I do not pay without receiving the rights.
30. As a seller of existing rights, I want my transferred rights to end after settlement, so that the new holder becomes the authorized downloader for that entitlement.
31. As a rights holder, I want to know that previously downloaded copies cannot technically be recalled, so that I understand the limits of transfer enforcement.
32. As a creator of a permitted derivative, I want to publish a new listing with its source ZIP, so that I can sell the new product.
33. As a derivative seller, I want no upstream royalty deduction, so that only the platform fee is deducted from my sale.

### Gemini feature composition

34. As a Gemini user, I want to select multiple source projects without a fixed product-count ceiling, so that I can compose features from several sources.
35. As a Gemini user, I want to include compatible open-source material, so that composition can use both entitled purchases and appropriately licensed public code.
36. As a Gemini user, I want source features suggested after analysis, so that I can select the parts I need instead of merging every file blindly.
37. As a Gemini user, I want to type additional requirements, so that the suggested choices do not limit my intended result.
38. As a Gemini user, I want to choose a target stack, so that the output fits my intended use.
39. As a Gemini user, I want to see a composition plan, dependencies, conflicts, and expected quota use, so that I can decide before code generation begins.
40. As a Gemini user, I want to add, remove, or change features and recalculate the plan, so that I can fit the work to my quota.
41. As a Gemini user, I want generation to start only after my explicit confirmation, so that analysis is not mistaken for permission to generate.
42. As a Gemini user, I want a fixed trial allowance per account, so that I can use the service without buying credits during the trial.
43. As a Gemini user, I want a quota shortage explained before generation, so that I can change the plan rather than encounter an automatic extra charge.
44. As a Gemini user, I want one downloadable output ZIP with provenance and run instructions, so that I can take the composed project elsewhere.
45. As a Gemini user, I want validation results and remaining limitations reported accurately, so that generated code is not presented as verified when it has not been checked.
46. As a platform owner, I want concurrent jobs to share the account's quota safely, so that starting two jobs cannot overspend the same balance.
47. As a platform owner, I want unconfigured integrations and service failures represented honestly, so that a mock response is not mistaken for a working model, payment, or IPFS upload.

## Implementation Decisions

### Confirmed boundaries

- UI and system messages are English; creator-supplied content can be in any language.
- This is a full application with public discovery, creator profiles, publishing, purchases, downloads, updates, permitted resale, Gemini composition, and derivative publication. Scope is not silently reduced to static screens or a purchase-only demo.
- Wallet identity is shared across buying and selling. The backend proves control of the wallet before granting an authenticated session.
- Project source is supplied as ZIP, not as a protected repository link. The public demo stays on the creator's existing hosting.
- IPFS stores encrypted source. Decryption keys remain off-chain under backend custody and must be recoverable through secured operational backups.
- Fuji and test AVAX are used for all demo transactions. Frontend, backend, data storage, and IPFS hosting remain separate infrastructure responsibilities.
- The platform fee is 10% of the sale price. The seller receives 90%; the platform pays purchase gas and bears gas-price risk. The same fee applies to primary purchases and platform-mediated resale. No upstream royalty is deducted from derivative sales.
- Each buyer receives their own entitlement. A listing can have many buyers, and resale transfers only the seller's entitlement.
- Existing-rights resale and derivative-sale permissions are independent creator choices. A derivative allowed for sale can be sold with its source without another source-redistribution toggle.
- Gemini uses conversations with one or many authorized projects for explanation, editing and composition, per ADR-0011.
- The user chooses features and may choose a target stack. No seller or buyer is forced into React, Next.js, or another single framework.
- There is no fixed product rule limiting the number of selected projects. Runtime, model context, archive size, and quota still have finite limits; the application must explain them and allow a revised plan.
- Trial quota is one allocation per account, with no daily reset, automatic purchase credit award, or top-up feature.
- The output is code, not a hosted deployment. U-topia does not deploy the buyer's purchased or generated application.

### Proposed module contracts for written-spec review

These rules make the agreed behavior implementable and testable. They do not select a concrete framework, database, pinning vendor, exact Gemini model ID, or gas-sponsorship provider.

1. **Identity and profiles:** issue a short-lived, one-time signing challenge bound to this application; validate ownership, expiry, and replay protection before issuing a session. Mutations act on the session identity, not an arbitrary submitted address. A wallet address is one account; wallet linking or recovery is not inferred.
2. **Listings and releases:** maintain listing identity, creator, metadata, demo URL, stack declaration, price, license terms, and versioned encrypted releases. Technical validation and completed storage precede a buyable published state; human approval is not required. Creating a new release in the same listing does not require old buyers to purchase again.
3. **Entitlements and settlement:** represent each purchased entitlement separately, bound to a listing, holder, and recorded terms. Register enough authoritative purchase data on-chain to verify seller, price, fee, and transfer conditions rather than trusting frontend-submitted values. Changes to a listing do not silently rewrite purchased terms; new buyers see the terms offered at their purchase.
4. **Gas sponsorship:** support a purchase authorization whose buyer identity and spending authority are verifiable even when a sponsor submits or pays for execution. Sponsorship is restricted to intended marketplace operations; it is not an arbitrary transaction relay. Signed authorization must bind the listing or resale offer, price, buyer, expiry, and a single-use identifier. A simple transfer of platform AVAX into a buyer wallet is not proof of sponsored settlement.
5. **Native payment:** a sponsor covers gas, not the buyer's product price. The payment design must provide an authorized route for the buyer's test AVAX and must demonstrate the buyer has no extra purchase-gas debit. Platform liquidity must exist before execution; a fee collected after settlement cannot fund a transaction that has not yet been submitted.
6. **Money precision:** calculate in integer native-token units. Compute the fee as the sale amount multiplied by 1,000 divided by 10,000 with explicit integer rounding; pay the remaining amount to the seller so the split sums to the price. Show a testnet indicator and separate the sponsor's network expense from the seller split.
7. **Rights and source access:** verify chain, authoritative contract, current holder, listing, and settled purchase before source decryption. Repeated notifications or delivery retries do not mint or charge again. CID possession, a connected wallet, a transaction hash alone, or a frontend success event are not sufficient authorization. A temporary RPC failure fails closed without pretending the buyer has lost the purchase.
8. **Transfers and updates:** settlement checks that the seller currently owns the entitlement and its recorded terms permit resale. Payment, fee allocation, and transfer complete atomically or all fail. After transfer the new holder can access releases in the listing, including updates; the previous holder loses fresh access under that transferred entitlement. Another independently held entitlement is unaffected. Downloaded copies cannot be recalled.
9. **Archive storage:** encrypt each release before pinning it; keep key material outside public metadata and chain state. Preserve ciphertext integrity and release identity. Reject unsafe or unusable archives before publication, and extract source only into an isolated job workspace with bounded resources. Do not execute arbitrary uploaded scripts on the application server.
10. **Composition planning:** require at least one authorized source project, track the exact releases and source rights used, analyze features, accept free-text additions and target-stack selection, and produce a versioned plan. Editing the source set, features, stack or conversation instructions invalidates the old plan and requires fresh estimation and confirmation. Analysis may inspect source but does not start the output-generation phase.
11. **Open-source intake:** record origin and available license evidence for imported public material. Treat unknown or incompatible permission as a blocked source for the requested use, not as permission inferred by the model. Preserve required attribution and notices in the output. Public availability alone is not evidence of permission to resell source.
12. **Derivative eligibility:** maintain provenance for each included source. Download for an allowed use does not automatically mean the result is sellable; publication as a derivative requires all applicable upstream permissions to allow it. Source-owned-by-user material is treated according to that user's declared rights. A model's assertion cannot override stored terms.
13. **Trial quota:** grant the configured trial allowance once when an authenticated eligible account first enters composition, not per purchase. Record usage persistently; refresh, reconnect, or a new job does not reset it. A configured trial end bounds the allowance. Configuration must explicitly provide the initial allowance and unit conversion; no production amount is guessed from the absent model pricing.
14. **Quota reservation:** disclose that analysis can consume quota before starting analysis. Before generation, display the plan's generation allowance, compare with the remaining account balance, and reserve it atomically on confirmation. Meter analysis and generation separately, settle actual recorded usage within the reserved budget, and release unused reservations on completion or failure. An incurred provider cost is not described as refunded merely because output generation failed. Stop or fail the job rather than exceeding its configured budget silently.
15. **Job lifecycle:** expose analyzing, awaiting confirmation, generating, completed, and failed states with recoverable job history. Repeated confirmation of the same plan does not create duplicate work. Recheck required source access before generation. Report input incompatibility or resource limits with the opportunity to revise the plan, rather than claim support for every possible codebase.
16. **Output and validation:** package an integrated project and its setup instructions with dependency, provenance, and license notes. Check archive integrity, changed-file consistency, and available static/build validation in isolation. Distinguish checks that passed, failed, or could not run. A failed build must not appear as a successfully validated result; the user can see the failure and revise the plan. Generated source can re-enter the ordinary listing flow when permitted.
17. **External adapters:** separate the application-facing contracts for chain access, sponsored payment, encrypted storage, and model analysis/generation from provider-specific integration. Real credentials stay server-side. Contract tests may use controlled doubles, but end-to-end acceptance for IPFS, Fuji, gas sponsorship, and Gemini requires real services.
18. **Unavailable services:** if the model or allowance configuration is absent, make the composition service unavailable with a clear English message and do not consume quota. Keep configured marketplace features usable. This is a setup state, not permission to mark the complete Gemini feature delivered without a real model.
19. **UI states:** make pending transaction, wallet rejection, wrong chain, upload failure, unavailable demo, failed delivery, analysis failure, quota shortage, and job progress visible and retryable where appropriate. Do not display a paid or completed state before its underlying operation succeeds.

### Data relationships

- A user owns one profile and can create many listings, hold many entitlements, and run many composition jobs.
- A listing has many releases, one creator, and many independent entitlements. A resale offer references one entitlement and its current holder.
- A composition job references multiple exact source releases, selected source features, additional requirements, a target stack, a confirmed plan revision, quota reservations, and an output archive.
- An account has one trial allocation and a usage ledger. Entitlement transfer does not mint, transfer, or reset quota.
- A derivative listing records its source provenance. It has independent buyers and sale proceeds, with no upstream royalty allocation.

## Testing Decisions

### Primary verification boundary

Test externally visible application behavior through browser and application-service operations, backed by a deployed contract and controlled external adapters as appropriate. Preserve the complete user path instead of mirroring internal helper functions. This repo currently has setup documents only; there is no existing application test suite or prior test pattern to reuse.

### Required automated behavior checks

1. Authenticate wallet A; a replayed, expired, or wrong-wallet signature cannot authenticate as A. Wallet B cannot mutate A's profile or listing.
2. Publish a valid encrypted source release and discover it through Explore and the creator profile. An incomplete or failed storage operation does not produce a buyable listing.
3. Fetch the stored IPFS payload and confirm it is ciphertext rather than a readable ZIP; tampering prevents successful decryption. Public responses and chain metadata do not contain usable source keys.
4. A buyer with no entitlement cannot download or use the source in Gemini, even with its CID or another buyer's transaction hash.
5. A successful primary purchase produces the correct entitlement and 90/10 split. Test exact integer rounding, wrong price, wrong network, replayed purchase authorization, reverted settlement, and duplicate notification.
6. Buyers B and C can independently buy the same listing and receive access. One purchase does not change the other buyer's rights.
7. Verify sponsored purchase accounting from balances or equivalent authoritative receipts: buyer pays only the product price, seller receives the price less the 10% fee, and sponsor pays the actual network charge. Test sponsor unavailability and lack of authorized buyer funds without falsely reporting success.
8. After a successful purchase, a temporary download failure permits retry without a second charge. A temporary RPC outage does not bypass authorization.
9. Add an update under the same listing; an existing entitled buyer can download it for no new purchase. A new listing does not inherit the old listing's buyers.
10. Permitted resale transfers one entitlement atomically with payment and fee settlement. Old holder loses fresh access under that token; new holder gains source and update access. Disallowed resale and stale offers are rejected without partial payment.
11. Derivative publication respects upstream terms and retains provenance. No upstream royalty is deducted; platform fee still applies. Public code without known compatible rights is not automatically approved for resale.
12. Analyze multiple source projects, expose suggested features, accept free-text changes and a target stack, and show a plan. Changing the plan invalidates a previous confirmation or estimate. No generation call occurs before confirmation.
13. A quota shortage blocks generation before it begins and supports add/remove/change feature edits followed by recalculation. A UI can display more than two selected projects; runtime limits are explained rather than encoded as a fixed two-project product ceiling.
14. Quota is granted once per account, is unaffected by purchase or resale, does not reset with reconnect or a new day, and cannot be topped up. Concurrent confirmations cannot reserve the same balance twice.
15. Provider failure releases unused reservation, retains correctly metered incurred usage, and does not create a fake completed ZIP. Missing model configuration produces an unavailable state without a successful-job claim.
16. A successful composition produces a downloadable ZIP with integrated output, instructions, and provenance. Validation failures are visible and not labeled as passed. Publishing an allowed output uses the same ordinary seller flow.

### Real integration and demo acceptance

- Run primary purchase, independent second buyer, source access denial, authorized download, release update, permitted resale, and rejected resale on Fuji using test AVAX. Keep transaction references as evidence.
- Use actual encrypted IPFS storage and retrieval; a local file fixture alone does not satisfy this integration.
- Exercise at least one real-model composition using compatible licensed fixtures, selected features, a chosen target stack, a confirmed plan, metered quota, and a downloaded output ZIP. Validate the resulting project with the available stack's build check; do not silently substitute generated boilerplate unrelated to the selected source.
- Demonstrate mixed-stack planning and either a validated supported transformation or an explicit conflict requiring a revised plan. Do not claim universal successful stack conversion from a single example.
- Demonstrate a third or later selected source to verify the absence of a hard two-project UI rule, even if the approved test generation uses a smaller plan.
- Verify English copy, profile share URLs, and the full flow at desktop and narrow viewport sizes. Keep automated checks focused on behavior; visual verification covers layout, loading, and error-state clarity.

## Out of Scope

- Mainnet deployment and real-money payment in this release.
- Hosted execution or automatic deployment of purchased/generated projects for buyers.
- Autonomous AI agent work outside explicit user confirmation.
- Credit top-ups, credit sales, daily quota resets, and purchase-linked credit awards.
- Automatic refunds and upstream derivative-sale royalties.
- Hidden repository-link delivery, a service called IPFS.lock, and claims that IPFS encrypts the source automatically.
- Guaranteed secrecy of browser-delivered frontend code or technical deletion of downloaded copies after resale.
- Guaranteed successful composition of every arbitrary set of stacks or an unlimited runtime merely because source selection has no fixed count ceiling.
- An administrator approval queue before publishing.

These exclusions reflect the user's decisions or technical limits, not removal of the agreed discovery, purchase, resale, update, composition, and derivative-publication flows.

## Further Notes

### Deployment prerequisites held open explicitly

- **Model provider:** Gemini is selected by the user. Exact model ID, server-side API configuration and metering remain backend setup. The product uses chat for one or many authorized projects; no Gemini secret belongs in frontend code.
- **Quota configuration:** choose the initial allowance, unit conversion, analysis/generation budget rules, and trial end against the actual selected model's usage and platform budget. The behavior above is specified, but the numeric deployment settings remain a launch prerequisite rather than an invented product decision.
- **Sponsored-payment infrastructure:** choose and validate a Fuji-compatible implementation that can authorize the buyer's native payment while the platform funds gas. Provider credentials and test funding are operational prerequisites. A design that makes the buyer pay gas separately contradicts the agreed fee model.
- **Hosting and IPFS:** provision application hosting, persistent account/job/key storage, encryption-key protection, and IPFS pinning. Choice of vendor remains an implementation planning decision; storage persistence and successful restoration must be verified.
- **Token design:** pick a token representation and contract design that supports multiple independent buyers, conditional transfer, immutable purchased terms, and listing-level updates. A transfer hook or direct token transfer must not bypass resale restrictions.

### Readiness and review

The triage status means the product scope is ready to break into implementation work; it does not mean service credentials exist or every deployment prerequisite is satisfied. Written-spec review should confirm the proposed testing boundary and technical rules above, especially sponsored native payment, transferred update access, and quota reservation. Complete feature acceptance still requires real integration evidence.

The deadline is a target, not a claim that all flows have been implemented or can be completed within the remaining time. Work should follow demoable end-to-end slices, and remaining integration blockers should stay visible rather than being replaced with undisclosed mocks.
