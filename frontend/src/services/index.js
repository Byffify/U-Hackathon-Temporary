import { projects as examples, creators } from "../data/creatorExamples.js";
import { splitSale } from "../utils/pricing.js";

export class ServiceError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.details = details;
  }
}
const fail = (code, message) => {
  throw new ServiceError(code, message);
};
const clone = (value) => structuredClone(value);
const KEY = "utopia.demo.v1";
const userFixtures = {
  buyer: {
    id: "buyer",
    name: "Demo Buyer",
    bio: "Exploring and building with KEEPHUB.",
    wallet: "demo:buyer",
  },
  creator: {
    id: "creator",
    name: "Demo Creator",
    bio: "Independent web creator.",
    wallet: "demo:creator",
  },
};
function initial() {
  const projects = examples.map((p, i) => ({
    ...p,
    creatorId: ["maya", "leo", "aria"][i],
    priceUnits: splitSale(p.price).total.toString(),
    demoUrl: "",
    resaleAllowed: true,
    derivativeAllowed: true,
    license:
      "Demo license: use and adapt; resale of this entitlement is allowed.",
    status: "published",
    releases: [
      { id: `${p.id}-v1`, version: "1.0.0", notes: "Initial demo release" },
    ],
    latestReleaseId: `${p.id}-v1`,
  }));
  projects.push({
    ...projects[0],
    id: "creator-demo",
    creatorId: "creator",
    creator: "Demo Creator",
    title: "My starter website",
    status: "draft",
    releases: [],
    latestReleaseId: null,
  });
  return {
    schemaVersion: 2,
    session: null,
    users: {
      ...Object.fromEntries(creators.map((c) => [c.id, c])),
      ...clone(userFixtures),
    },
    projects,
    entitlements: projects.slice(0, 3).map((p) => ({
      id: `ent-buyer-${p.id}`,
      projectId: p.id,
      holderId: "buyer",
      releaseId: p.latestReleaseId,
      resaleAllowed: p.resaleAllowed,
      derivativeAllowed: p.derivativeAllowed,
      license: p.license,
    })),
    purchases: [],
    offers: [],
    uploads: [],
    gemini: {},
  };
}
export function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error();
    return url.href;
  } catch {
    fail("INVALID_URL", "Use a complete http or https URL.");
  }
}
const money = (value) => {
  const text = String(value ?? "");
  if (!/^[1-9]\d*$/.test(text))
    fail(
      "INVALID_PRICE",
      "Price must be a positive integer string in smallest units.",
    );
  return text;
};
const id = (prefix) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
function demoService(storage) {
  let state;
  try {
    state = JSON.parse(storage?.getItem(KEY) || "null");
  } catch {
    state = null;
  }
  state ||= initial();
  if (state.schemaVersion !== 2) {
    for (const item of [...state.projects, ...state.offers])
      item.priceUnits = splitSale(item.priceUnits).total.toString();
    state.users = {
      ...Object.fromEntries(creators.map((c) => [c.id, c])),
      ...state.users,
    };
    state.schemaVersion = 2;
  }
  const read = () => clone(state);
  const write = (next) => {
    const serialized = JSON.stringify(next);
    try {
      storage?.setItem(KEY, serialized);
    } catch {
      fail(
        "STORAGE_UNAVAILABLE",
        "Demo changes could not be saved. Free browser storage and retry.",
      );
    }
    state = clone(next);
  };
  const requireUser = () =>
    state.users[state.session]
      ? clone(state.users[state.session])
      : fail("UNAUTHENTICATED", "Sign in to continue.");
  const project = (db, projectId) =>
    db.projects.find((p) => p.id === projectId) ||
    fail("NOT_FOUND", "Project not found.");
  const ownProject = (db, projectId) => {
    const p = project(db, projectId);
    if (p.creatorId !== requireUser().id)
      fail("FORBIDDEN", "Only the creator can change this project.");
    return p;
  };
  const checkDerivativeSources = (db, sources) => {
    const user = requireUser();
    for (const source of sources) {
      const original = project(db, source.projectId);
      if (!original.releases.some((r) => r.id === source.releaseId))
        fail("SOURCE_ACCESS", "Source release is unavailable.");
      if (
        original.creatorId !== user.id &&
        !db.entitlements.some(
          (e) =>
            e.projectId === source.projectId &&
            e.holderId === user.id &&
            e.derivativeAllowed === true,
        )
      )
        fail(
          "DERIVATIVE_FORBIDDEN",
          "Current source rights do not permit this derivative sale.",
        );
    }
  };
  const entitlement = (db, entId) =>
    db.entitlements.find(
      (e) => e.id === entId && e.holderId === requireUser().id,
    ) || fail("FORBIDDEN", "You do not hold this entitlement.");
  const enriched = (db, e) => ({
    ...e,
    project: clone(project(db, e.projectId)),
  });
  let gemini;
  return {
    mode: "demo",
    async call(operation, p = {}) {
      if (operation.startsWith("gemini.")) {
        gemini ||= import("./gemini-demo.js").then((m) =>
          m.createGeminiHandler({ read, write, requireUser }),
        );
        return (await gemini)(operation, p);
      }
      const db = read();
      let result;
      const isExploreList = operation === "explore.list";
      if (operation === "explore.list") operation = "projects.list";
      if (operation === "explore.get") operation = "projects.get";
      switch (operation) {
        case "auth.session":
          return db.users[db.session] ?? null;
        case "auth.demoLogin":
          if (!["buyer", "creator"].includes(p.account))
            fail("INVALID_ACCOUNT", "Choose a demo account.");
          db.session = p.account;
          result = db.users[p.account];
          break;
        case "auth.logout":
          db.session = null;
          result = null;
          break;
        case "auth.challenge":
        case "auth.verify":
          fail(
            "DEMO_ONLY",
            "Wallet authentication requires the live API. Choose a demo account.",
          );
          break;
        case "profiles.get":
          return (
            db.users[p.id ?? requireUser().id] ??
            fail("NOT_FOUND", "Profile not found.")
          );
        case "profiles.update": {
          const u = db.users[requireUser().id];
          if (!String(p.name ?? u.name).trim())
            fail("INVALID_PROFILE", "Enter your name.");
          u.name = String(p.name ?? u.name)
            .trim()
            .slice(0, 100);
          u.bio = String(p.bio ?? u.bio).slice(0, 1000);
          if (p.avatarUrl !== undefined) u.avatarUrl = safeUrl(p.avatarUrl);
          result = u;
          break;
        }
        case "projects.list": {
          let items = db.projects.filter(
            (x) => x.status === "published" || x.creatorId === db.session,
          );
          if (p.mine)
            items = items.filter((x) => x.creatorId === requireUser().id);
          if (p.creatorId)
            items = items.filter((x) => x.creatorId === p.creatorId);
          if (p.q)
            items = items.filter((x) =>
              `${x.title} ${x.description} ${x.creator}`
                .toLowerCase()
                .includes(String(p.q).toLowerCase()),
            );
          if (p.stack)
            items = items.filter((x) =>
              Array.isArray(x.stack)
                ? x.stack.includes(p.stack)
                : x.stack === p.stack,
            );
          const page = Math.max(1, Number.parseInt(p.page) || 1),
            pageSize = 12;
          return {
            items: items.slice((page - 1) * pageSize, page * pageSize),
            total: items.length,
            page,
            pageSize,
            ...(isExploreList
              ? {
                  stacks: [
                    ...new Set(
                      db.projects
                        .filter((item) => item.status === "published")
                        .flatMap((item) => item.stack),
                    ),
                  ].sort(),
                }
              : {}),
          };
        }
        case "projects.get": {
          const x = project(db, p.id ?? p.projectId);
          if (x.status !== "published" && x.creatorId !== db.session)
            fail("NOT_FOUND", "Project not found.");
          return x;
        }
        case "projects.save": {
          const user = requireUser();
          let provenance;
          if (p.outputRef) {
            const job = (db.gemini[user.id]?.chats ?? [])
              .flatMap((c) => c.jobs ?? [])
              .find((j) => j.id === p.outputRef);
            if (!job)
              fail(
                "OUTPUT_UNAVAILABLE",
                "Generated output was not found in your account.",
              );
            if (job.status !== "completed" || !job.output?.archiveId)
              fail(
                "OUTPUT_UNAVAILABLE",
                "A verified generated archive is required. Demo jobs cannot be published.",
              );
            if (!job.derivativeAllowed)
              fail(
                "DERIVATIVE_FORBIDDEN",
                "Source terms do not permit derivative sales.",
              );
            checkDerivativeSources(db, job.input.sources);
            provenance = {
              jobId: job.id,
              sources: clone(job.input.sources),
              archiveId: job.output.archiveId,
            };
          }
          let x = p.id
            ? ownProject(db, p.id)
            : {
                id: id("project"),
                creatorId: user.id,
                creator: user.name,
                status: "draft",
                releases: [],
                latestReleaseId: null,
              };
          for (const key of [
            "title",
            "description",
            "stack",
            "tone",
            "license",
            "resaleAllowed",
            "derivativeAllowed",
          ])
            if (p[key] !== undefined) x[key] = p[key];
          if (p.priceUnits !== undefined) x.priceUnits = money(p.priceUnits);
          if (p.demoUrl !== undefined) x.demoUrl = safeUrl(p.demoUrl);
          if (p.screenshots !== undefined) {
            if (!Array.isArray(p.screenshots) || p.screenshots.length > 8)
              fail("INVALID_IMAGES", "Use up to eight screenshot URLs.");
            x.screenshots = p.screenshots.map(safeUrl);
          }
          if (provenance) {
            x.outputRef = p.outputRef;
            x.provenance = provenance;
          }
          if (!p.id) db.projects.push(x);
          result = x;
          break;
        }
        case "images.upload": {
          const x = ownProject(db, p.projectId);
          if (
            !p.file ||
            !["image/png", "image/jpeg", "image/webp"].includes(p.file.type) ||
            !(p.file.size > 0)
          )
            fail("INVALID_IMAGE", "Choose a PNG, JPEG, or WebP image.");
          if (p.file.size > 10 * 1024 * 1024)
            fail("IMAGE_TOO_LARGE", "The screenshot limit is 10 MB.");
          const image = {
            id: id("image"),
            projectId: x.id,
            filename: p.file.name,
            size: p.file.size,
            mime: p.file.type,
            demo: true,
          };
          x.images ??= [];
          x.images.push(image);
          p.onProgress?.(100);
          result = image;
          break;
        }
        case "projects.upload": {
          const x = ownProject(db, p.projectId);
          if (!p.file || !/\.zip$/i.test(p.file.name) || p.file.size <= 0)
            fail("INVALID_ARCHIVE", "Choose a non-empty ZIP archive.");
          if (p.file.size > 100 * 1024 * 1024)
            fail("ARCHIVE_TOO_LARGE", "The archive limit is 100 MB.");
          const upload = {
            id: id("upload"),
            projectId: x.id,
            filename: p.file.name,
            size: p.file.size,
            demo: true,
          };
          db.uploads.push(upload);
          x.uploadId = upload.id;
          p.onProgress?.(100);
          result = upload;
          break;
        }
        case "projects.publish":
        case "projects.release": {
          const x = ownProject(db, p.id ?? p.projectId);
          if (x.provenance) checkDerivativeSources(db, x.provenance.sources);
          if (
            !x.title?.trim() ||
            !x.description?.trim() ||
            !x.license?.trim() ||
            !x.stack ||
            !x.uploadId
          )
            fail(
              "INCOMPLETE_PROJECT",
              "Add a title, description, stack, license, price, and ZIP before publishing.",
            );
          money(x.priceUnits);
          const uploadId = p.uploadId ?? x.uploadId;
          if (
            !db.uploads.some((u) => u.id === uploadId && u.projectId === x.id)
          )
            fail(
              "INVALID_ARCHIVE",
              "Choose an archive uploaded to this project.",
            );
          if (x.releases.some((r) => r.uploadId === uploadId))
            fail(
              "NEW_ARCHIVE_REQUIRED",
              "Upload a new ZIP archive for the next release.",
            );
          x.uploadId = uploadId;
          const version = String(
            p.version ?? (x.releases.length ? "" : "1.0.0"),
          ).trim();
          if (!version || x.releases.some((r) => r.version === version))
            fail("INVALID_VERSION", "Enter a new release version.");
          const release = {
            id: id("release"),
            version,
            notes: String(p.notes ?? ""),
            uploadId: x.uploadId,
          };
          x.releases.push(release);
          x.latestReleaseId = release.id;
          x.status = "published";
          result = x;
          break;
        }
        case "library.list":
          return db.entitlements
            .filter((e) => e.holderId === requireUser().id)
            .map((e) => enriched(db, e));
        case "library.get":
          return enriched(db, entitlement(db, p.id ?? p.entitlementId));
        case "library.download": {
          const e = entitlement(db, p.id ?? p.entitlementId);
          return {
            filename: `${e.projectId}.zip`,
            unavailable: true,
            message:
              "Demo only: no source archive is stored or available to download. Connect the live API for verified source delivery.",
          };
        }
        case "purchases.create": {
          const user = requireUser();
          if (!p.idempotencyKey)
            fail("IDEMPOTENCY_REQUIRED", "Provide a purchase request key.");
          const previous = db.purchases.find(
            (x) =>
              x.userId === user.id && x.idempotencyKey === p.idempotencyKey,
          );
          if (previous) {
            if (
              previous.projectId !== p.projectId ||
              previous.offerId !== (p.offerId ?? null)
            )
              fail(
                "IDEMPOTENCY_CONFLICT",
                "This request key belongs to a different purchase.",
              );
            return previous;
          }
          const x = project(db, p.projectId);
          if (x.status !== "published")
            fail("NOT_AVAILABLE", "This project is not published.");
          if (x.creatorId === user.id)
            fail("OWN_PROJECT", "Creators already own their source.");
          if (
            db.entitlements.some(
              (e) => e.projectId === x.id && e.holderId === user.id,
            )
          )
            fail("ALREADY_OWNED", "You already hold this project.");
          if (
            db.purchases.some(
              (q) =>
                q.userId === user.id &&
                q.projectId === x.id &&
                q.status === "pending",
            )
          )
            fail("PURCHASE_PENDING", "A purchase is already pending.");
          let e;
          if (p.offerId) {
            const offer =
              db.offers.find(
                (o) =>
                  o.id === p.offerId &&
                  o.projectId === x.id &&
                  o.status === "open",
              ) ||
              fail("OFFER_UNAVAILABLE", "This resale is no longer available.");
            e =
              db.entitlements.find(
                (v) =>
                  v.id === offer.entitlementId && v.holderId === offer.sellerId,
              ) ||
              fail(
                "OFFER_UNAVAILABLE",
                "The seller no longer holds this entitlement.",
              );
            if (offer.sellerId === user.id)
              fail("OWN_OFFER", "You cannot buy your own offer.");
            e.holderId = user.id;
            db.offers
              .filter((o) => o.entitlementId === e.id && o.status === "open")
              .forEach(
                (o) => (o.status = o.id === offer.id ? "sold" : "cancelled"),
              );
          } else {
            e = {
              id: id("ent"),
              projectId: x.id,
              holderId: user.id,
              releaseId: x.latestReleaseId,
              resaleAllowed: !!x.resaleAllowed,
              derivativeAllowed: !!x.derivativeAllowed,
              license: x.license,
            };
            db.entitlements.push(e);
          }
          result = {
            id: id("purchase"),
            userId: user.id,
            projectId: x.id,
            offerId: p.offerId ?? null,
            entitlementId: e.id,
            idempotencyKey: p.idempotencyKey,
            status: "confirmed",
            demo: true,
          };
          db.purchases.push(result);
          break;
        }
        case "purchases.confirm":
        case "purchases.get":
          return (
            db.purchases.find(
              (x) =>
                x.id === (p.id ?? p.purchaseId) &&
                x.userId === requireUser().id,
            ) || fail("NOT_FOUND", "Purchase not found.")
          );
        case "resales.create": {
          const e = entitlement(db, p.entitlementId);
          if (!e.resaleAllowed)
            fail(
              "RESALE_FORBIDDEN",
              "The purchased terms do not allow resale.",
            );
          if (
            db.offers.some(
              (o) => o.entitlementId === e.id && o.status === "open",
            )
          )
            fail("OFFER_EXISTS", "This entitlement already has an open offer.");
          result = {
            id: id("offer"),
            entitlementId: e.id,
            projectId: e.projectId,
            sellerId: e.holderId,
            priceUnits: money(p.priceUnits),
            status: "open",
          };
          db.offers.push(result);
          break;
        }
        case "resales.get": {
          const offer =
            db.offers.find((x) => x.id === (p.id ?? p.offerId)) ||
            fail("NOT_FOUND", "Resale not found.");
          const purchased =
            db.entitlements.find((e) => e.id === offer.entitlementId) ||
            fail("NOT_FOUND", "The offered entitlement was not found.");
          return {
            ...offer,
            project: project(db, offer.projectId),
            terms: {
              resaleAllowed: purchased.resaleAllowed,
              derivativeAllowed: purchased.derivativeAllowed,
              license: purchased.license,
            },
          };
        }
        default:
          fail("UNKNOWN_OPERATION", `Unknown service operation: ${operation}`);
      }
      write(db);
      return clone(result);
    },
  };
}

// API integration contract. Path params come from payload; unused fields form query/body.
export const API_ROUTES = {
  "auth.session": ["GET", "/auth/session"],
  "auth.challenge": ["POST", "/auth/challenges"],
  "auth.verify": ["POST", "/auth/verify"],
  "auth.logout": ["POST", "/auth/logout"],
  "profiles.get": ["GET", "/creators/:id"],
  "profiles.update": ["PATCH", "/me/profile"],
  "projects.list": ["GET", "/projects"],
  "projects.get": ["GET", "/projects/:id"],
  "explore.list": ["GET", "/projects"],
  "explore.get": ["GET", "/projects/:id"],
  "projects.save": ["POST", "/projects"],
  "projects.chainTransaction": ["POST", "/projects/:id/chain-transaction"],
  "projects.upload": ["POST", "/projects/:projectId/releases"],
  "projects.releases": ["GET", "/projects/:id/releases"],
  "images.upload": ["POST", "/projects/:projectId/images"],
  "projects.publish": ["POST", "/projects/:id/publish"],
  "projects.release": ["POST", "/projects/:id/releases"],
  "library.list": ["GET", "/me/entitlements"],
  "library.get": ["GET", "/entitlements/:id"],
  "library.download": ["GET", "/entitlements/:id/releases/:releaseId/download"],
  "purchases.create": ["POST", "/purchase-intents"],
  "purchases.get": ["GET", "/purchase-intents/:id"],
  "purchases.confirm": ["POST", "/purchase-intents/:id/confirm"],
  "resales.create": ["POST", "/resales"],
  "resales.get": ["GET", "/resales/:id"],
  "gemini.sources": ["GET", "/gemini/sources"],
  "gemini.list": ["GET", "/gemini/sessions"],
  "gemini.create": ["POST", "/gemini/sessions"],
  "gemini.get": ["GET", "/gemini/sessions/:sessionId"],
  "gemini.message": ["POST", "/gemini/sessions/:sessionId/messages"],
  "gemini.quote": ["POST", "/gemini/sessions/:sessionId/quote"],
  "gemini.plan": ["POST", "/gemini/sessions/:sessionId/plan"],
  "gemini.confirm": ["POST", "/gemini/sessions/:sessionId/confirm"],
  "gemini.job": ["GET", "/gemini/jobs/:jobId"],
  "gemini.download": ["POST", "/gemini/jobs/:jobId/download"],
  "gemini.import": ["POST", "/gemini/import"],
};
function apiService(baseUrl, fetchImpl) {
  const root = String(baseUrl).replace(/\/$/, "");
  let csrfToken = null;
  if (!(root.startsWith("/") && !root.startsWith("//"))) safeUrl(root);
  const imageUploadResult = (result) => ({
    ...result,
    url: root.startsWith("/") ? result.url : new URL(result.url, root).href,
  });
  const projectFromApi = (project) => {
    if (
      !project ||
      typeof project !== "object" ||
      !/^\d+$/.test(project.price_wei)
    )
      fail("INVALID_RESPONSE", "The API returned an invalid project.");
    const base = root.startsWith("/") ? globalThis.location?.origin : root;
    const images = Array.isArray(project.images) ? project.images : [];
    const screenshots = images.flatMap((value) => {
      try {
        const url = new URL(value, base);
        return ["http:", "https:"].includes(url.protocol) ? [url.href] : [];
      } catch {
        return [];
      }
    });
    return {
      ...project,
      creatorId: project.creator_id,
      creator: project.creator_name || "Creator",
      isExample: project.is_example === true,
      demoUrl: project.demo_url,
      priceUnits: project.price_wei,
      license: project.license_terms,
      resaleAllowed: project.resale_allowed,
      derivativeAllowed: project.derivative_allowed,
      status: project.is_example
        ? "example"
        : project.published
          ? "published"
          : "draft",
      screenshots,
    };
  };
  const entitlementFromApi = (right) => ({
    ...right,
    projectId: right.project_id,
    title: right.project_title,
    resaleAllowed: right.resale_allowed,
    derivativeAllowed: right.derivative_allowed,
    priceUnits: right.price_wei,
    status: "active",
  });
  const purchaseFromApi = (intent) => {
    const authorization = intent.authorization;
    const offerId =
      authorization?.primaryType === "ResalePurchase"
        ? authorization.message?.tokenId
        : null;
    return {
      ...intent,
      projectId: intent.project_id,
      offerId,
      authorization,
      funding: intent.funding,
      status: intent.status === "reverted" ? "failed" : intent.status,
      walletRequest:
        intent.status === "pending" && authorization
          ? {
              method: "eth_signTypedData_v4",
              params: [
                authorization.message?.buyer,
                JSON.stringify(authorization),
              ],
            }
          : null,
    };
  };
  const errorFrom = (data, status, operation) => {
    if (
      status === 401 &&
      operation !== "auth.session" &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("utopia:unauthorized"));
    return new ServiceError(
      data?.error?.code ?? data?.code ?? `HTTP_${status}`,
      data?.error?.message ?? data?.message ?? "The request failed.",
      data?.error?.details,
    );
  };
  const service = {
    mode: "api",
    async call(operation, payload = {}) {
      if (operation === "auth.demoLogin")
        fail("API_MODE", "Demo accounts are only available in demo mode.");
      const route = API_ROUTES[operation];
      if (!route)
        fail("UNKNOWN_OPERATION", `Unknown service operation: ${operation}`);
      let [method, path] = route;
      const p = { ...payload };
      if (operation === "profiles.get" && !p.id) path = "/me/profile";
      if (operation === "auth.challenge") {
        p.chain_id = Number(p.chainId);
        delete p.chainId;
      }
      if (operation === "auth.verify") {
        p.challenge_id = p.challengeId;
        delete p.challengeId;
        delete p.address;
      }
      if (operation === "profiles.update" && "avatarUrl" in p) {
        p.avatar_url = p.avatarUrl || null;
        delete p.avatarUrl;
      }
      if (operation === "projects.list" && p.creatorId) {
        p.creator_id = p.creatorId;
        delete p.creatorId;
      }
      if (operation === "projects.list" && p.mine) {
        path = "/me/projects";
        delete p.mine;
        delete p.page;
        delete p.creator_id;
      }
      if (operation === "projects.save") {
        if (Array.isArray(p.stack)) p.stack = p.stack.join(", ");
        if ("demoUrl" in p) p.demo_url = p.demoUrl || null;
        if ("priceUnits" in p) p.price_wei = p.priceUnits;
        if ("license" in p) p.license_terms = p.license;
        if ("resaleAllowed" in p) p.resale_allowed = p.resaleAllowed;
        if ("derivativeAllowed" in p)
          p.derivative_allowed = p.derivativeAllowed;
        delete p.demoUrl;
        delete p.priceUnits;
        delete p.license;
        delete p.resaleAllowed;
        delete p.derivativeAllowed;
        delete p.screenshots;
        delete p.outputRef;
      }
      if (operation === "projects.publish" && "chainListingId" in p) {
        p.chain_listing_id = p.chainListingId;
        delete p.chainListingId;
      }
      if (operation === "projects.save" && p.id) {
        method = "PATCH";
        path = "/projects/:id";
      }
      if (operation === "purchases.create") {
        if (p.offerId) p.resale_offer_id = p.offerId;
        else p.project_id = p.projectId;
        delete p.projectId;
        delete p.offerId;
      }
      if (operation === "purchases.confirm") {
        p.signature = p.signature ?? p.result;
        p.idempotencyKey ||= p.id;
        delete p.result;
      }
      const aliases = {
        id: p.projectId ?? p.entitlementId ?? p.purchaseId ?? p.offerId,
        sessionId: p.chatId ?? p.id,
        jobId: p.id,
      };
      path = path.replace(/:([A-Za-z]+)/g, (_, key) => {
        const value = p[key] ?? aliases[key];
        if (!value) fail("INVALID_REQUEST", `Missing ${key}.`);
        delete p[key];
        if (key === "sessionId") delete p.chatId;
        return encodeURIComponent(value);
      });
      delete p.onProgress;
      const headers = { Accept: "application/json" };
      if (
        csrfToken &&
        method !== "GET" &&
        !["auth.challenge", "auth.verify"].includes(operation)
      )
        headers["X-CSRF-Token"] = csrfToken;
      const idempotencyKey = p.idempotencyKey;
      if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
      delete p.idempotencyKey;
      let url = `${root}${path}`,
        body;
      if (operation === "library.download")
        return { url, filename: "source.zip" };
      if (method === "GET") {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(p))
          if (value !== undefined && value !== null)
            query.set(
              key,
              Array.isArray(value) ? value.join(",") : String(value),
            );
        if (query.size) url += `?${query}`;
      } else if (["projects.upload", "images.upload"].includes(operation)) {
        if (!p.file) fail("INVALID_ARCHIVE", "Choose a ZIP archive.");
        const form = new FormData();
        form.append("file", p.file);
        for (const [key, value] of Object.entries(p))
          if (key !== "file" && value != null) form.append(key, String(value));
        if (typeof XMLHttpRequest !== "undefined")
          return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.withCredentials = true;
            xhr.setRequestHeader("Accept", "application/json");
            if (csrfToken) xhr.setRequestHeader("X-CSRF-Token", csrfToken);
            if (idempotencyKey)
              xhr.setRequestHeader("Idempotency-Key", idempotencyKey);
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable)
                payload.onProgress?.(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onerror = () =>
              reject(
                new ServiceError(
                  "NETWORK_ERROR",
                  "Unable to reach the API. Please retry.",
                ),
              );
            xhr.onabort = () =>
              reject(new ServiceError("ABORTED", "Upload cancelled."));
            xhr.onload = () => {
              let data;
              try {
                data = JSON.parse(xhr.responseText);
              } catch {
                if (xhr.status < 200 || xhr.status >= 300) {
                  reject(errorFrom(null, xhr.status, operation));
                  return;
                }
                reject(
                  new ServiceError(
                    "INVALID_RESPONSE",
                    "The API returned an invalid response.",
                  ),
                );
                return;
              }
              if (xhr.status < 200 || xhr.status >= 300)
                reject(errorFrom(data, xhr.status, operation));
              else {
                const result = data.data ?? data;
                resolve(
                  operation === "images.upload"
                    ? imageUploadResult(result)
                    : result,
                );
              }
            };
            xhr.send(form);
          });
        body = form;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(p);
      }
      let response;
      try {
        response = await fetchImpl(url, {
          method,
          headers,
          body,
          credentials: "include",
        });
      } catch {
        fail("NETWORK_ERROR", "Unable to reach the API. Please retry.");
      }
      if (response.status === 204) return null;
      let data;
      try {
        data = await response.json();
      } catch {
        if (!response.ok) throw errorFrom(null, response.status, operation);
        fail("INVALID_RESPONSE", "The API returned an invalid response.");
      }
      if (!response.ok) {
        if (
          operation === "auth.session" &&
          response.status === 401 &&
          data?.error?.code === "UNAUTHENTICATED"
        ) {
          csrfToken = null;
          return null;
        }
        throw errorFrom(data, response.status, operation);
      }
      if (operation === "projects.list" || operation === "explore.list") {
        if (!Array.isArray(data?.data))
          fail("INVALID_RESPONSE", "The API returned an invalid project list.");
        if (operation === "projects.list" && payload.mine) {
          const page = Math.max(1, Math.floor(Number(payload.page) || 1));
          const pageSize = 20;
          return {
            items: data.data
              .slice((page - 1) * pageSize, page * pageSize)
              .map(projectFromApi),
            total: data.data.length,
            page,
            pageSize,
          };
        }
        if (!data.meta)
          fail("INVALID_RESPONSE", "The API returned an invalid project list.");
        return {
          items: data.data.map(projectFromApi),
          total: data.meta.total,
          page: data.meta.page,
          pageSize: data.meta.page_size,
          ...(operation === "explore.list"
            ? { stacks: data.meta.stacks ?? [] }
            : {}),
        };
      }
      const result = data?.data ?? data;
      if (operation === "images.upload") return imageUploadResult(result);
      if (operation.startsWith("purchases.")) return purchaseFromApi(result);
      if (operation === "projects.get" || operation === "explore.get")
        return projectFromApi(result);
      if (operation === "library.list") {
        if (!Array.isArray(result))
          fail("INVALID_RESPONSE", "The API returned an invalid library.");
        return result.map(entitlementFromApi);
      }
      if (operation === "library.get") {
        const right = entitlementFromApi(result);
        if (!right.projectId)
          fail("PROJECT_UNAVAILABLE", "The licensed project is unavailable.");
        const [project, releases] = await Promise.all([
          service.call("projects.get", { id: right.projectId }),
          service.call("projects.releases", { id: right.projectId }),
        ]);
        return {
          ...right,
          project: {
            ...project,
            releases,
            latestReleaseId: releases.at(-1)?.id || null,
          },
        };
      }
      if (operation === "auth.session" || operation === "auth.verify") {
        csrfToken = result.csrf_token;
        return result.user;
      }
      if (operation === "auth.logout") csrfToken = null;
      if (operation === "profiles.get" || operation === "profiles.update")
        return { ...result, avatarUrl: result.avatar_url };
      if (operation.endsWith(".download") && result?.url) safeUrl(result.url);
      return result;
    },
  };
  return service;
}
export function createService({
  mode = "demo",
  baseUrl = "/api/v1",
  storage,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!["demo", "api"].includes(mode))
    fail("INVALID_MODE", "Service mode must be demo or api.");
  if (mode === "api") return apiService(baseUrl, fetchImpl);
  if (storage === undefined) {
    try {
      storage = globalThis.localStorage;
    } catch {
      storage = undefined;
    }
  }
  return demoService(storage);
}
const env = import.meta.env ?? {};
export const mode = env.VITE_SERVICE_MODE === "demo" ? "demo" : "api";
export const service = createService({
  mode,
  baseUrl: env.VITE_API_BASE_URL || "/api/v1",
});
