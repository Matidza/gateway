import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import readline from "readline";
import GatewayUserModel from "./models/gatewayUserModel.js";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Database connection + server start
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/Inturn-Gateway-Service';

async function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    // await mongoose.connect(process.env.MONGO_URI);
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const existingAdmin = await GatewayUserModel.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      process.exit(0);
    }

    const email = await askQuestion("Enter admin email: ");
    const name = await askQuestion("Enter admin name: ");

    // const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new GatewayUserModel({
      email,
      name: name,
      role: "admin",
      verified: true,
    });

    await admin.save();
    console.log("\n✅ Super Admin created successfully!");
    console.log("📧 Email:", admin.email);
    console.log("🔑 Name:", admin.name);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  } finally {
    rl.close();
    mongoose.connection.close();
  }
}

createAdmin();
