const logger = require("../utils/logger");

const basicAuth = (req, res, next) => {
  // Support Authorization header and common proxy alternatives
  let authHeader =
    req.headers.authorization ||
    req.headers["x-authorization"] ||
    req.headers["proxy-authorization"];

  logger.info("Checking authorization header");

  if (!authHeader) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Settings Microservice"');
    logger.error("No authorization header found");
    return res.status(401).json({ error: "Authentication required" });
  }

  // Case-insensitive Basic check
  const isBasic = authHeader.toLowerCase().startsWith("basic ");
  if (!isBasic) {
    logger.error("Invalid authorization scheme");
    res.setHeader("WWW-Authenticate", 'Basic realm="Settings Microservice"');
    return res.status(401).json({ error: "Authentication required" });
  }

  const base64Credentials = authHeader.slice(6); // Skip 'Basic '
  let credentials;
  try {
    logger.log("Decoding base64 credentials");
    credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
  } catch (e) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Settings Microservice"');
    return res.status(401).json({ error: "Invalid credentials format" });
  }

  const [username, password] = credentials.split(":");

  if (
    username === process.env.BASIC_AUTH_USER &&
    password === process.env.BASIC_AUTH_PASS
  ) {
    logger.log("Valid credentials");
    req.user = { username };
    return next();
  }

  logger.error("Invalid credentials", {
    username,
    password,
  });

  res.setHeader("WWW-Authenticate", 'Basic realm="Settings Microservice"');
  return res.status(401).json({ error: "Invalid credentials" });
};

const sessionAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }

  if (req.xhr || req.headers.accept?.indexOf("json") > -1) {
    return res.status(401).json({ error: "Session required" });
  }

  logger.debug("sessionAuth failed", {
    session: req.session,
  });

  return res.redirect("/login");
};

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.role === "admin") {
    return next();
  }

  if (req.xhr || req.headers.accept?.indexOf("json") > -1) {
    return res.status(403).json({ error: "Admin access required" });
  }

  return res.redirect("/dashboard");
};

module.exports = { basicAuth, sessionAuth, requireAdmin };
