# Frontend API contract

`frontend/src/services/index.js` exports `createService({mode='demo',baseUrl='/api/v1',storage,fetchImpl})`, singleton `service`, `mode`, and `API_ROUTES`. Call `await service.call(operation,payload={})`. Set `VITE_SERVICE_MODE=api` and optionally `VITE_API_BASE_URL` to use the live backend. API mode never falls back to demo. Auth and profile routes below match the delivered FastAPI backend; the remaining routes are a proposed interface and are not implemented by that backend yet.

Requests include cookies (`credentials: include`; multipart XHR uses `withCredentials`). Configure backend session cookies, CORS allowlist, and CSRF protection. The server independently validates authentication, ownership, payment, file contents, rights, and inputs. No provider secret belongs in browser code.

Success responses support either raw JSON or `{ "data": <result> }`. Errors use an appropriate non-2xx status and `{ "error": { "code": "...", "message": "...", "details": {} } }`. They reject with `ServiceError` exposing code/message/details. A 204 resolves null. HTTP 401 dispatches `utopia:unauthorized` except for auth.session, whose expired response must not recursively trigger session refresh.

All `priceUnits` are positive decimal integer strings in wei: 1 AVAX = 1000000000000000000 units. Never send floating point prices. Use splitSale(humanAvax).total.toString() when editing and formatAvax(BigInt(priceUnits)) when displaying.

## Route map

The table is derived from API_ROUTES. Paths are relative to the configured API base. `:id` consumes id or its projectId/entitlementId/purchaseId/offerId alias. Gemini `:sessionId` accepts chatId. Remaining GET payload fields become query parameters; remaining mutation fields become JSON. projects.save with id uses PATCH /projects/:id instead of POST /projects.

| Operation         | Method | Path                                 |
| ----------------- | ------ | ------------------------------------ |
| auth.session      | GET    | /auth/session                        |
| auth.challenge    | POST   | /auth/challenges                     |
| auth.verify       | POST   | /auth/verify                         |
| auth.logout       | POST   | /auth/logout                         |
| profiles.get      | GET    | /me/profile or /creators/:id         |
| profiles.update   | PATCH  | /me/profile                          |
| projects.list     | GET    | /projects                            |
| projects.get      | GET    | /projects/:id                        |
| projects.save     | POST   | /projects                            |
| projects.upload   | POST   | /projects/:projectId/uploads         |
| images.upload     | POST   | /projects/:projectId/images          |
| projects.publish  | POST   | /projects/:id/publish                |
| projects.release  | POST   | /projects/:id/releases               |
| library.list      | GET    | /library                             |
| library.get       | GET    | /library/:id                         |
| library.download  | POST   | /library/:id/download                |
| purchases.create  | POST   | /purchases                           |
| purchases.get     | GET    | /purchases/:id                       |
| purchases.confirm | POST   | /purchases/:id/confirm               |
| resales.create    | POST   | /resales                             |
| resales.get       | GET    | /resales/:id                         |
| gemini.sources    | GET    | /gemini/sources                      |
| gemini.list       | GET    | /gemini/sessions                     |
| gemini.create     | POST   | /gemini/sessions                     |
| gemini.get        | GET    | /gemini/sessions/:sessionId          |
| gemini.message    | POST   | /gemini/sessions/:sessionId/messages |
| gemini.quote      | POST   | /gemini/sessions/:sessionId/quote    |
| gemini.plan       | POST   | /gemini/sessions/:sessionId/plan     |
| gemini.confirm    | POST   | /gemini/sessions/:sessionId/confirm  |
| gemini.job        | GET    | /gemini/jobs/:jobId                  |
| gemini.download   | POST   | /gemini/jobs/:jobId/download         |
| gemini.import     | POST   | /gemini/import                       |

## Operation inputs and results

| Operation         | Input payload                                                                                                        | Result                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| auth.session      | none                                                                                                                 | User or null; stores CSRF token in adapter         |
| auth.challenge    | address, chainId                                                                                                     | {id,message}; message is signed by wallet          |
| auth.verify       | challengeId,address,signature                                                                                        | User; backend sets session cookie and CSRF token   |
| auth.logout       | none                                                                                                                 | Session revoked with CSRF header                    |
| auth.demoLogin    | account buyer or creator                                                                                             | User; demo only, no API route                      |
| profiles.get      | id optional, defaults me                                                                                             | Profile                                            |
| profiles.update   | name,bio,avatarUrl?                                                                                                  | Profile                                            |
| projects.list     | q?,stack?,page?,creatorId?,mine?                                                                                     | {items,total,page,pageSize}                        |
| projects.get      | id                                                                                                                   | Project                                            |
| projects.save     | id?,title,description,stack,priceUnits,demoUrl,license,resaleAllowed,derivativeAllowed,tone?,screenshots?,outputRef? | Draft/new or updated Project                       |
| projects.upload   | projectId,file,onProgress?                                                                                           | UploadRef {id,projectId,filename,size}             |
| images.upload     | projectId,file,onProgress?                                                                                           | ImageRef {id,projectId,url?,filename,mime,size}    |
| projects.publish  | id,uploadId?,version?,notes?                                                                                         | Published Project                                  |
| projects.release  | id,uploadId,version,notes                                                                                            | Project with new release                           |
| library.list      | none                                                                                                                 | Entitlement[] including project                    |
| library.get       | id                                                                                                                   | Entitlement including project                      |
| library.download  | id,releaseId?                                                                                                        | {url,filename} or {unavailable,message,filename}   |
| purchases.create  | projectId,offerId?,idempotencyKey                                                                                    | Purchase                                           |
| purchases.get     | id                                                                                                                   | Purchase owned by current user                     |
| purchases.confirm | id,result (wallet transaction response)                                                                              | Purchase after server verifies transaction         |
| resales.create    | entitlementId,priceUnits                                                                                             | Offer                                              |
| resales.get       | id                                                                                                                   | Offer including project and terms snapshot         |
| gemini.sources    | none                                                                                                                 | {sources,quota,analysisCost,generationCost}        |
| gemini.list       | none                                                                                                                 | Chat[]                                             |
| gemini.create     | title?                                                                                                               | Chat                                               |
| gemini.get        | chatId                                                                                                               | Chat                                               |
| gemini.message    | chatId,text,sources,stack,instruction                                                                                | Updated Chat                                       |
| gemini.quote      | chatId,sources,stack,instruction,kind                                                                                | {cost,balance,contextKey}                          |
| gemini.plan       | chatId,sources,stack,instruction                                                                                     | Plan                                               |
| gemini.confirm    | chatId,sources,stack,instruction,planId,revision,messageRevision,idempotencyKey,confirmed:true                                                      | Job                                                |
| gemini.job        | jobId                                                                                                                | Job                                                |
| gemini.download   | jobId                                                                                                                | {url,filename}                                     |
| gemini.import     | external source reference and license evidence                                                                       | Backend-verified source reference                  |

## Records and invariants

User/Profile: `{id,name,bio,avatarUrl?,wallet?}`. Public creator profiles may include initials,role,location,specialty,stack,projects,tone.

Project: `{id,title,description,stack,creatorId,creator,priceUnits,tone,demoUrl,resaleAllowed,derivativeAllowed,license,status,releases,latestReleaseId,screenshots?,images?,outputRef?,provenance?}`. Release: `{id,version,notes,uploadId?}`. Public screenshot URLs use HTTP(S) and are limited to eight. Source upload accepts a non-empty ZIP up to 100 MB; screenshots accept PNG/JPEG/WebP up to 10 MB. Multipart uploads contain a file part. `onProgress(percent)` is client-only, never serialized; XHR provides progress and fetch fallback does not.

Publish requires complete metadata and an archive uploaded for the same owned listing. Each new release requires a fresh owned upload and unique version. Previously purchased terms stay immutable; access includes later releases within the same listing. Source download URLs require current holder authorization.

Entitlement: `{id,projectId,holderId,project,releaseId,resaleAllowed,derivativeAllowed,license}`; permission/license fields are purchased snapshots. Offer: `{id,entitlementId,projectId,sellerId,priceUnits,status,project?,terms?}` with status open/sold/cancelled. `terms` exposes `{resaleAllowed,derivativeAllowed,license}` from the offered entitlement, not the current listing; checkout must display these terms. Resale transfers only that entitlement and leaves the listing and other holders intact. The server resolves competing buyers atomically.

Purchase: `{id,userId,projectId,offerId?,entitlementId?,idempotencyKey,status,walletRequest?,demo?}`. Status is pending/confirmed/failed. walletRequest is an EIP-1193 wallet request. The UI checks Fuji chain ID 0xa869 before wallet submission. Only backend-verified confirmation grants access; a client-provided transaction hash is evidence to verify. Mandatory idempotencyKey appears both in JSON and Idempotency-Key header and binds buyer/project/offer. Block duplicate pending purchases and duplicate ownership. Repeated confirmation must not double charge or issue duplicate entitlements.

Gemini source: `{projectId,releaseId,title,version,stack,derivativeAllowed,features?}`. Selected contexts use sources `[{projectId,releaseId,features?}]`, stack, instruction. Chat: `{id,title,messages,plans,jobs,context?,updatedAt}`. Plan: `{id,revision,messageRevision,contextKey,input,steps,cost,balance,limitations?}`. `messageRevision` is the number of persisted transcript messages included in the analysis. Generation requires explicit confirmation of the latest plan with identical source releases/features/stack/instruction and the current transcript revision. Sending a new message invalidates earlier plans and quotes; an unsent message blocks confirmation until sent and analyzed or cleared. Recheck source access, quota, plan revision, and transcript revision atomically. Confirmation sends the deterministic `chatId:planId:revision` idempotency key in both the body and `Idempotency-Key` header; repeated confirmation returns the same job without a second charge. Restore only the job whose `planId` matches the latest plan. Quota belongs to the account with no daily reset or purchase top-up.

A derivative draft outputRef must resolve to the current user's completed job with a verified output archive and source terms permitting derivative sales. Retain provenance `{jobId,sources,archiveId}` and recheck current rights before publishing. Never silently discard outputRef. External license evidence requires server verification; a URL or checkbox cannot establish rights.

## Raw JSON examples

GET /api/v1/projects?q=Flora&page=1 may return raw JSON directly:

```json
{
  "items": [
    {
      "id": "flora",
      "title": "Flora storefront",
      "creatorId": "maya",
      "priceUnits": "500000000000000000",
      "status": "published",
      "releases": [
        { "id": "flora-v1", "version": "1.0.0", "notes": "Initial release" }
      ],
      "latestReleaseId": "flora-v1",
      "resaleAllowed": true,
      "derivativeAllowed": true
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 12
}
```

POST /api/v1/purchases with Idempotency-Key: buyer-flora-1:

```json
{ "projectId": "flora", "idempotencyKey": "buyer-flora-1" }
```

An immediately verified result may use the envelope:

```json
{
  "data": {
    "id": "purchase-1",
    "userId": "buyer",
    "projectId": "flora",
    "entitlementId": "entitlement-1",
    "idempotencyKey": "buyer-flora-1",
    "status": "confirmed"
  }
}
```

A failed request returns a relevant status, for example HTTP 409:

```json
{
  "error": {
    "code": "PURCHASE_PENDING",
    "message": "A purchase is already pending."
  }
}
```

## Demo limitations

Demo persists account-scoped metadata in localStorage, without source ZIP bytes, image bytes, signatures, private keys, or model outputs. Purchases are explicitly simulated and confirm immediately without payment. Downloads are unavailable. Screenshot uploads return metadata without hosted URLs; entered public screenshot URLs load external images. Gemini jobs have simulated status, no archive, and cannot become derivative listings. Wallet authentication and external license imports reject explicitly. Demo does not validate backend security, payment, IPFS encryption, model quality, generated builds, or real delivery.
