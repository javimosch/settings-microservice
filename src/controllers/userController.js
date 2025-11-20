const User = require("../models/User");
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");
const { logEvent } = require("../utils/auditLogger");

exports.upsertAdminUser = async (req, username, password) => {
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return existingUser;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    username,
    email: "",
    password: hashedPassword,
    role: "admin",
    permissions: {
      organizations: "all",
      organizationIds: [],
      features: {
        globalSettings: {
          read: true,
          write: true,
        },
        clientSettings: {
          read: true,
          write: true,
        },
        userSettings: {
          read: true,
          write: true,
        },
        dynamicSettings: {
          read: true,
          write: true,
        },
        dynamicAuth: {
          read: true,
          write: true,
        },
        organizations: {
          read: true,
          write: true,
        },
      },
    },
    active: true,
  });

  await user.save();

  const userObj = user.toObject();
  delete userObj.password;
  await logEvent({
    req,
    organizationId: null,
    entityType: "user",
    entityId: user._id.toString(),
    action: "create",
    before: null,
    after: userObj,
    meta: {},
  });

  return user;
};

exports.renderUserManagement = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.render("pages/users/index", {
      title: "User Management",
      user: req.session.username,
      userRole: req.session.role,
      users,
    });
  } catch (error) {
    logger.error("Error rendering user management:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    logger.error("Error listing users:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role, permissions } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role,
      permissions,
      active: true,
    });

    await user.save();
    logger.info(`User created: ${username} by ${req.session.username}`);
    const userObj = user.toObject();
    delete userObj.password;
    await logEvent({
      req,
      organizationId: null,
      entityType: "user",
      entityId: user._id.toString(),
      action: "create",
      before: null,
      after: userObj,
      meta: {},
    });

    res.json({
      message: "User created successfully",
      user: { ...user.toObject(), password: undefined },
    });
  } catch (error) {
    logger.error("Error creating user:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password;
    }

    const before = await User.findById(id).select("-password");
    if (!before) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    logger.info(`User updated: ${user.username} by ${req.session.username}`);
    await logEvent({
      req,
      organizationId: null,
      entityType: "user",
      entityId: user._id.toString(),
      action: "update",
      before: before.toObject(),
      after: user.toObject(),
      meta: {},
    });
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    logger.error("Error updating user:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    await User.findByIdAndDelete(id);

    logger.info(`User deleted: ${user.username} by ${req.session.username}`);
    await logEvent({
      req,
      organizationId: null,
      entityType: "user",
      entityId: user._id.toString(),
      action: "delete",
      before: user.toObject(),
      after: null,
      meta: {},
    });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error("Error deleting user:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    logger.error("Error getting user:", error);
    res.status(404).json({ error: "User not found" });
  }
};
