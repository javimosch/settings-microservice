const envPath =
  process.env.DOTENV_PATH ||
  process.env.ENV_FILE ||
  process.env.ENV_PATH ||
  ".env";

require("dotenv").config({
  path: envPath,
});
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const path = require("path");

const connectDB = require("./utils/database");
const logger = require("./utils/logger");
const { sessionAuth, requireAdmin } = require("./middleware/auth");
const { requireFeature } = require("./middleware/permissions");
const internalRoutes = require("./routes/internal");
const apiRoutes = require("./routes/api");
const userRoutes = require("./routes/users");
const { log } = require("winston");
const { upsertAdminUser } = require("./controllers/userController");

const app = express();
const PORT = process.env.PORT || 3000;

logger.info("Environment: " + process.env.NODE_ENV + " " + envPath);

connectDB();

// Trust proxy to properly detect HTTPS when behind a load balancer
// Default: 1 (trusts immediate proxy, works for single proxy)
// For multiple proxies (HAProxy->Traefik), set TRUST_PROXY=true or specific IPs
const trustProxy =
  process.env.TRUST_PROXY !== undefined
    ? process.env.TRUST_PROXY === "true"
      ? true
      : process.env.TRUST_PROXY.split(",")
    : 1;
app.set("trust proxy", trustProxy);

// Middleware to normalize headers from various proxy sources
app.use((req, res, next) => {
  // Normalize Authorization header case variations from proxies
  if (req.headers["x-authorization"] && !req.headers.authorization) {
    req.headers.authorization = req.headers["x-authorization"];
  }
  if (req.headers["proxy-authorization"] && !req.headers.authorization) {
    req.headers.authorization = req.headers["proxy-authorization"];
  }
  next();
});

// Helmet removed to avoid CSP issues with Alpine.js/Vue and CDN resources
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: true,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      touchAfter: 24 * 3600,
    }),
    cookie: {
      secure: process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.COOKIE_SAME_SITE || "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use("/api/", limiter);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  if (req.session.authenticated) {
    return res.redirect("/dashboard");
  }
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  if (req.session.authenticated) {
    return res.redirect("/dashboard");
  }
  res.render("pages/login", { error: null });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  logger.debug("Login attempt", { username });

  const User = require("./models/User");
  const bcrypt = require("bcrypt");

  try {
    let user = await User.findOne({ username, active: true });

    if (
      !user &&
      username === process.env.BASIC_AUTH_USER &&
      password === process.env.BASIC_AUTH_PASS
    ) {
      user = await upsertAdminUser(req, username, password);
      logger.info("Basic auth user created");
    }

    if (!user) {
      logger.warn("User not found");
      return res.render("pages/login", { error: "Invalid credentials" });
    }

    if (await bcrypt.compare(password, user.password)) {
      req.session.authenticated = true;
      req.session.username = username;
      req.session.userId = user._id;
      req.session.role = user.role;
      req.session.permissions = user.permissions;
      req.session.save();
      user.lastLogin = new Date();
      await user.save();
      logger.info("db auth login successful", username);
      return res.redirect("/dashboard");
    }
  } catch (error) {
    logger.error("Database login error:", error);
  }

  if (
    username === process.env.BASIC_AUTH_USER &&
    password === process.env.BASIC_AUTH_PASS
  ) {
    req.session.authenticated = true;
    req.session.username = username;
    req.session.role = "admin";
    logger.info("Basic auth login successful", username);
    return res.redirect("/dashboard");
  } else {
    logger.info("Invalid credentials (Basic auth check)", {
      username,
      password,
      basicAuthUser: process.env.BASIC_AUTH_USER,
      basicAuthPass: process.env.BASIC_AUTH_PASS || "".slice(0, 3) + "...",
    });
    return res.render("pages/login", { error: "Invalid credentials" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.get("/dashboard", sessionAuth, (req, res) => {
  res.render("pages/dashboard", {
    title: "Dashboard",
    user: req.session.username,
    userRole: req.session.role || "admin",
    userPermissions: req.session.permissions || {
      organizations: "all",
      features: {
        globalSettings: { read: true, write: true },
        clientSettings: { read: true, write: true },
        userSettings: { read: true, write: true },
        dynamicSettings: { read: true, write: true },
        dynamicAuth: { read: true, write: true },
        organizations: { read: true, write: true },
      },
    },
  });
});

app.get("/settings", sessionAuth, (req, res) => {
  const hasAnySettingAccess =
    req.session.permissions?.features?.globalSettings?.read ||
    req.session.permissions?.features?.clientSettings?.read ||
    req.session.permissions?.features?.userSettings?.read ||
    req.session.permissions?.features?.dynamicSettings?.read;

  if (!hasAnySettingAccess) {
    return res
      .status(403)
      .send("Access denied - You do not have permission to access settings");
  }

  res.render("pages/settings/index", {
    title: "Settings Management",
    user: req.session.username,
    userRole: req.session.role || "admin",
    permissions: req.session.permissions,
  });
});

app.get(
  "/dynamicauth",
  sessionAuth,
  requireFeature("dynamicAuth", "read"),
  (req, res) => {
    res.render("pages/auth/dynamicauth", {
      title: "Dynamic Auth Management",
      user: req.session.username,
      userRole: req.session.role || "admin",
    });
  },
);

app.get("/integration", sessionAuth, (req, res) => {
  if (req.session.role !== "admin") {
    return res.status(403).send("Access denied - Admins only");
  }

  res.render("pages/integration", {
    title: "Integration cURL Builder",
    user: req.session.username,
    userRole: req.session.role || "admin",
    userPermissions: req.session.permissions,
  });
});

app.get("/audit", sessionAuth, requireAdmin, (req, res) => {
  res.render("pages/audit", {
    title: "Audit Logs",
    user: req.session.username,
    userRole: req.session.role || "admin",
    userPermissions: req.session.permissions,
  });
});

app.use("/api/internal", internalRoutes);
app.use("/api", apiRoutes);
app.use("/users", userRoutes);

logger.info("GET /api/settings/global");

app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  logger.info(`Settings Microservice running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
