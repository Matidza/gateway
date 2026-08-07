import mongoose from "mongoose";

const gatewayUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ["mentee", "professional", "admin"],
      default: "mentee",
    },
    refreshToken: {
      type: String,
      default: null,
    },
    email_verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("GatewayUserModel", gatewayUserSchema);