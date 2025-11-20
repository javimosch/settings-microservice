const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("MongoDB connected successfully", {
      conn: process.env.MONGODB_URI.split("@")[1],
    });
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
