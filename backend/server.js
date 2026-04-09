require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// ─── STARTUP: VALIDATE REQUIRED ENV VARS ──────────────────────
const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_SECRET",
  "FRONTEND_URL",
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ─── PROCESS ERROR HANDLERS ───────────────────────────────────
process.on("unhandledRejection", (err) =>
  console.error("Unhandled rejection:", err),
);
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down.");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down.");
  process.exit(0);
});

// ─── SUPABASE INIT ────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.use(helmet());

if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    const proto = req.headers["x-forwarded-proto"];
    if (proto && proto !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

const allowedOrigins = new Set(
  (process.env.FRONTEND_URL || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);
[
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
].forEach((o) => allowedOrigins.add(o));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

// ─── RATE LIMITERS ────────────────────────────────────────────
let rateLimitStore;
try {
  if (process.env.REDIS_URL) {
    const { RedisStore } = require("rate-limit-redis");
    const Redis = require("ioredis");
    const redis = new Redis(process.env.REDIS_URL);
    redis.on("error", (err) =>
      console.warn(
        "Redis rate-limit error (falling back to memory):",
        err.message,
      ),
    );
    rateLimitStore = new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    });
    console.log("✅ Rate limiter using Redis store");
  } else {
    console.warn(
      "⚠️  REDIS_URL not set — rate limiter using in-memory store " +
        "(not suitable for multi-process production)",
    );
  }
} catch (err) {
  console.warn(
    "⚠️  Redis store init failed, falling back to memory:",
    err.message,
  );
}

const makeLimiter = (max, windowMs = 15 * 60 * 1000, message) =>
  rateLimit({
    windowMs,
    max,
    message: message || "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    ...(rateLimitStore ? { store: rateLimitStore } : {}),
  });

const apiLimiter = makeLimiter(
  100,
  15 * 60 * 1000,
  "Too many requests from this IP, please try again later.",
);
const adminLimiter = makeLimiter(
  20,
  15 * 60 * 1000,
  "Too many admin requests, please try again later.",
);
const authLimiter = makeLimiter(
  15,
  15 * 60 * 1000,
  "Too many attempts, please try again later.",
);

app.use(apiLimiter);

// ─── HELPERS ──────────────────────────────────────────────────
const requireAdmin = (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: "Unauthorized" });
    return false;
  }
  return true;
};

const isValidTagId = (id) => /^[a-z0-9-]{1,50}$/.test(id);

const ALLOWED_PLATFORMS = new Set([
  "facebook",
  "instagram",
  "linkedin",
  "whatsapp",
  "instapay",
  "telegram",
  "twitter",
  "threads",
  "snapchat",
  "youtube",
  "link",
]);

const isValidUrl = (str) => {
  if (typeof str !== "string" || str.length > 500) return false;
  if (str === "") return true;
  try {
    const u = new URL(str);
    return u.protocol === "https:";
  } catch {
    return /^[^\s<>"]{1,300}$/.test(str);
  }
};

const isValidPhone = (str) => {
  if (typeof str !== "string") return false;
  const clean = str.trim();
  if (clean === "") return true;
  if (clean.length > 30) return false;
  return /^[+\d\s\-().]{4,30}$/.test(clean);
};

const isValidEmail = (str) => {
  if (typeof str !== "string") return false;
  const clean = str.trim();
  if (clean === "") return true;
  if (clean.length > 200) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
};

const validateLink = (link) => {
  if (!link || typeof link !== "object") return false;
  const { platform, url, isCustomLink, label } = link;

  // waPhone must never reach the backend — reject if present
  if ("waPhone" in link) return false;

  // url is always required
  if (typeof url !== "string" || !isValidUrl(url)) return false;

  if (isCustomLink) {
    if (
      label !== undefined &&
      (typeof label !== "string" || label.length > 100)
    )
      return false;
  } else {
    if (!ALLOWED_PLATFORMS.has(platform)) return false;
  }

  return true;
};

const validatePageData = (data) => {
  if (!data || typeof data !== "object") return false;

  const strFields = ["name", "title", "description"];
  for (const field of strFields) {
    if (data[field] !== undefined && typeof data[field] !== "string")
      return false;
    if (typeof data[field] === "string" && data[field].length > 500)
      return false;
  }

  if (data.phone !== undefined && data.phone !== "") {
    if (!isValidPhone(data.phone)) return false;
  }

  if (data.links !== undefined) {
    if (!Array.isArray(data.links)) return false;
    if (data.links.length > 30) return false;
    for (const link of data.links) {
      if (!validateLink(link)) return false;
    }
  }

  if (data.phones !== undefined) {
    if (!Array.isArray(data.phones) || data.phones.length > 10) return false;
    for (const p of data.phones) {
      if (!p || typeof p.number !== "string") return false;
      if (!isValidPhone(p.number)) return false;
    }
  }

  if (data.emails !== undefined) {
    if (!Array.isArray(data.emails) || data.emails.length > 10) return false;
    for (const e of data.emails) {
      if (!e || typeof e.address !== "string") return false;
      if (!isValidEmail(e.address)) return false;
    }
  }

  return true;
};

const verifyToken = async (token) => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
};

const parseStorageUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  const marker = "/object/public/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const rest = url.slice(idx + marker.length);
  const slash = rest.indexOf("/");
  if (slash === -1) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
};

const deleteStorageFile = async (url) => {
  const parsed = parseStorageUrl(url);
  if (!parsed) return;
  const { error } = await supabase.storage
    .from(parsed.bucket)
    .remove([parsed.path]);
  if (error)
    console.warn(
      `Storage delete warning (${parsed.bucket}/${parsed.path}):`,
      error.message,
    );
};

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── ADMIN ENDPOINTS ──────────────────────────────────────────

app.post("/admin/login", adminLimiter, (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ ok: true });
});

app.get("/admin/tags", adminLimiter, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("id, is_active, is_setup, owner_id, created_at, page_data")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const tags = data.map((row) => ({
      tagId: row.id,
      isActive: row.is_active,
      isSetup: row.is_setup,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      phone: row.page_data?.phone || null,
    }));
    res.json({ tags });
  } catch (err) {
    console.error("Error fetching tags:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/admin/create-tag", adminLimiter, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const tagId = req.body.tagId?.trim().toLowerCase();
  if (!tagId) return res.status(400).json({ error: "Tag ID required" });
  if (!isValidTagId(tagId))
    return res.status(400).json({ error: "Invalid tag ID format." });
  try {
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("id", tagId)
      .single();
    if (existing) return res.status(409).json({ error: "Tag already exists" });

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const hashedCode = await bcrypt.hash(code, 10);

    const { error } = await supabase.from("tags").insert({
      id: tagId,
      verification_code: hashedCode,
      temp_code: code,
      is_setup: false,
      is_active: true,
      page_data: {},
      owner_id: null,
    });
    if (error) throw error;

    res.json({ message: "Tag created", tagId, code });
  } catch (err) {
    console.error("Error creating tag:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/admin/reset-code", adminLimiter, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const tagId = req.body.tagId?.trim().toLowerCase();
  if (!tagId) return res.status(400).json({ error: "Tag ID required" });
  try {
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("id", tagId)
      .single();
    if (!existing) return res.status(404).json({ error: "Tag not found" });

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const hashedCode = await bcrypt.hash(code, 10);

    const { error } = await supabase
      .from("tags")
      .update({
        verification_code: hashedCode,
        temp_code: code,
        is_setup: false,
        owner_id: null,
        claimed_at: null,
      })
      .eq("id", tagId);
    if (error) throw error;

    res.json({ message: "Code reset", tagId, code });
  } catch (err) {
    console.error("Error resetting code:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/admin/deactivate-tag", adminLimiter, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const tagId = req.body.tagId?.trim().toLowerCase();
  if (!tagId || !isValidTagId(tagId))
    return res.status(400).json({ error: "Invalid tag ID" });
  try {
    const { data, error } = await supabase
      .from("tags")
      .update({ is_active: false })
      .eq("id", tagId)
      .select("id")
      .single();
    if (error || !data) return res.status(404).json({ error: "Tag not found" });
    res.json({ message: "Tag deactivated", tagId });
  } catch (err) {
    console.error("Error deactivating tag:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/admin/delete-tag", adminLimiter, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const tagId = req.body.tagId?.trim().toLowerCase();
  if (!tagId || !isValidTagId(tagId))
    return res.status(400).json({ error: "Invalid tag ID" });
  try {
    const { data: tag } = await supabase
      .from("tags")
      .select("page_data")
      .eq("id", tagId)
      .single();
    const { data, error } = await supabase
      .from("tags")
      .delete()
      .eq("id", tagId)
      .select("id")
      .single();
    if (error || !data) return res.status(404).json({ error: "Tag not found" });
    if (tag?.page_data) {
      await Promise.allSettled([
        deleteStorageFile(tag.page_data.profilePic),
        deleteStorageFile(tag.page_data.coverPhoto),
      ]);
    }
    res.json({ message: "Tag deleted", tagId });
  } catch (err) {
    console.error("Error deleting tag:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/admin/reactivate-tag", adminLimiter, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const tagId = req.body.tagId?.trim().toLowerCase();
  if (!tagId || !isValidTagId(tagId))
    return res.status(400).json({ error: "Invalid tag ID" });
  try {
    const { data, error } = await supabase
      .from("tags")
      .update({ is_active: true })
      .eq("id", tagId)
      .select("id")
      .single();
    if (error || !data) return res.status(404).json({ error: "Tag not found" });
    res.json({ message: "Tag reactivated", tagId });
  } catch (err) {
    console.error("Error reactivating tag:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/public/tags", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("id, page_data")
      .eq("is_active", true)
      .eq("is_setup", true)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const tags = data.map((row) => ({
      tagId: row.id,
      name: row.page_data?.name || null,
      title: row.page_data?.title || null,
      profilePic: row.page_data?.profilePic || null,
    }));
    res.json({ tags });
  } catch (err) {
    console.error("Error fetching public tags:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── PUBLIC ENDPOINTS ─────────────────────────────────────────

app.get("/tag/:tagId", async (req, res) => {
  const tagId = req.params.tagId?.trim().toLowerCase();
  if (!tagId || !isValidTagId(tagId))
    return res.status(400).json({ error: "Invalid tag ID" });
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("is_active, is_setup, owner_id")
      .eq("id", tagId)
      .single();
    if (error || !data) return res.status(404).json({ error: "Tag not found" });
    if (!data.is_active) return res.json({ status: "deactivated" });
    if (data.owner_id)
      return res.json({
        status: "claimed",
        isSetup: data.is_setup,
        ownerId: data.owner_id,
      });
    return res.json({ status: "unclaimed", isSetup: false });
  } catch (err) {
    console.error(`Error fetching tag ${tagId}:`, err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/tag-code/:tagId", async (req, res) => {
  const tagId = req.params.tagId?.trim().toLowerCase();
  if (!tagId || !isValidTagId(tagId))
    return res.status(400).json({ error: "Invalid tag ID" });
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("temp_code, owner_id, is_active")
      .eq("id", tagId)
      .single();
    if (error || !data) return res.status(404).json({ error: "TAG_NOT_FOUND" });
    if (!data.is_active) return res.status(403).json({ error: "TAG_INACTIVE" });
    if (data.owner_id)
      return res.status(409).json({ error: "TAG_ALREADY_CLAIMED" });
    if (!data.temp_code)
      return res.status(404).json({ error: "CODE_NOT_AVAILABLE" });
    res.json({ code: data.temp_code });
  } catch (err) {
    console.error("tag-code error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/verify-code", authLimiter, async (req, res) => {
  const { tagId, code } = req.body;
  if (!tagId || !code)
    return res.status(400).json({ error: "Missing required fields" });
  if (!isValidTagId(tagId))
    return res.status(400).json({ error: "Invalid tag ID" });
  try {
    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("owner_id, verification_code")
      .eq("id", tagId)
      .single();
    if (tagError || !tag)
      return res.status(404).json({ error: "TAG_NOT_FOUND" });
    if (tag.owner_id)
      return res.status(409).json({ error: "TAG_ALREADY_CLAIMED" });
    const isMatch = await bcrypt.compare(
      code.trim().toUpperCase(),
      tag.verification_code,
    );
    if (!isMatch) return res.status(401).json({ error: "INVALID_CODE" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Verify code error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/claim-tag", authLimiter, async (req, res) => {
  const { tagId, code, email, password, isExistingUser } = req.body;
  if (!tagId || !code || !email)
    return res.status(400).json({ error: "Missing required fields" });
  if (!isValidTagId(tagId))
    return res.status(400).json({ error: "Invalid tag ID" });
  if (!isValidEmail(email))
    return res.status(400).json({ error: "Invalid email" });
  if (!isExistingUser && (typeof password !== "string" || password.length < 6)) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }
  try {
    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("owner_id, verification_code")
      .eq("id", tagId)
      .single();
    if (tagError || !tag)
      return res.status(404).json({ error: "TAG_NOT_FOUND" });
    if (tag.owner_id)
      return res.status(409).json({ error: "TAG_ALREADY_CLAIMED" });
    const isMatch = await bcrypt.compare(
      code.trim().toUpperCase(),
      tag.verification_code,
    );
    if (!isMatch) return res.status(401).json({ error: "INVALID_CODE" });

    let userId;
    if (isExistingUser) {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password,
        });
      if (signInError || !signInData?.user) {
        return res.status(401).json({ error: "INVALID_CREDENTIALS" });
      }
      userId = signInData.user.id;
    } else {
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: email.toLowerCase(),
          password,
          email_confirm: true,
        });
      if (createError) {
        if (createError.message.includes("already"))
          return res.status(400).json({ error: "EMAIL_IN_USE" });
        throw createError;
      }
      userId = newUser.user.id;
    }

    const { error: updateError } = await supabase
      .from("tags")
      .update({
        owner_id: userId,
        claimed_at: new Date().toISOString(),
        verification_code: null,
        temp_code: null,
      })
      .eq("id", tagId);
    if (updateError) throw updateError;

    res.json({ message: "Tag claimed successfully", uid: userId });
  } catch (err) {
    console.error("Claim error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/save-page", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  const { tagId, pageData, profilePic, coverPhoto } = req.body;
  if (!tagId) return res.status(400).json({ error: "Missing tagId" });
  if (!isValidTagId(tagId))
    return res.status(400).json({ error: "Invalid tag ID" });

  let parsedPageData;
  try {
    parsedPageData =
      typeof pageData === "string" ? JSON.parse(pageData) : pageData;
  } catch {
    return res.status(400).json({ error: "Invalid page data format" });
  }
  if (!validatePageData(parsedPageData))
    return res.status(400).json({ error: "Invalid page data" });

  try {
    const user = await verifyToken(token);
    if (!user)
      return res.status(401).json({ error: "Invalid or expired token" });

    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("owner_id, page_data")
      .eq("id", tagId)
      .single();

    if (tagError || !tag || tag.owner_id !== user.id) {
      return res.status(403).json({ error: "Unauthorized access to this tag" });
    }

    const oldData = tag.page_data || {};
    const oldProfilePic = oldData.profilePic || null;
    const oldCoverPhoto = oldData.coverPhoto || null;

    if (typeof profilePic === "string") {
      parsedPageData.profilePic = profilePic;
      if (oldProfilePic && oldProfilePic !== profilePic) {
        await deleteStorageFile(oldProfilePic);
      }
    } else if (profilePic === null) {
      parsedPageData.profilePic = null;
      if (oldProfilePic) {
        await deleteStorageFile(oldProfilePic);
      }
    } else {
      if (oldProfilePic) parsedPageData.profilePic = oldProfilePic;
    }

    if (typeof coverPhoto === "string") {
      parsedPageData.coverPhoto = coverPhoto;
      if (oldCoverPhoto && oldCoverPhoto !== coverPhoto) {
        await deleteStorageFile(oldCoverPhoto);
      }
    } else if (coverPhoto === null) {
      parsedPageData.coverPhoto = null;
      if (oldCoverPhoto) {
        await deleteStorageFile(oldCoverPhoto);
      }
    } else {
      if (oldCoverPhoto) parsedPageData.coverPhoto = oldCoverPhoto;
    }

    const { error: updateError } = await supabase
      .from("tags")
      .update({
        page_data: parsedPageData,
        is_setup: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tagId);

    if (updateError) throw updateError;
    res.json({ message: "Profile saved successfully" });
  } catch (err) {
    console.error("Save Page Error:", err);
    res.status(500).json({ error: "Failed to save page" });
  }
});

app.get("/card/:tagId", async (req, res) => {
  const tagId = req.params.tagId?.trim().toLowerCase();
  if (!tagId || !isValidTagId(tagId))
    return res.status(400).json({ error: "Invalid tag ID" });
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("is_setup, page_data")
      .eq("id", tagId)
      .single();
    if (error || !data) return res.status(404).json({ error: "Tag not found" });
    if (!data.is_setup)
      return res
        .status(404)
        .json({ error: "Profile not set up yet", code: "NOT_SETUP" });
    res.json(data.page_data);
  } catch (err) {
    console.error("Error fetching card:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/edit-data/:tagId", async (req, res) => {
  const tagId = req.params.tagId?.trim().toLowerCase();
  if (!tagId || !isValidTagId(tagId))
    return res.status(400).json({ error: "Invalid tag ID" });
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const user = await verifyToken(token);
    if (!user)
      return res.status(401).json({ error: "Invalid or expired token" });
    const { data, error } = await supabase
      .from("tags")
      .select("owner_id, page_data")
      .eq("id", tagId)
      .single();
    if (error || !data) return res.status(404).json({ error: "Tag not found" });
    if (data.owner_id !== user.id)
      return res.status(403).json({ error: "Unauthorized" });
    res.json(data.page_data || {});
  } catch (err) {
    console.error("Error fetching edit data:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── START ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));