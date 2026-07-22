import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required!"],
      trim: true,
      unique: [true, "Email already exists, please use another email!"],
      minlength: [5, "Email must be a minimum of 5 characters"],
      lowercase: true,
    },

    avatar: { type: String }, // URL to profile image
    name: { type: String }, // URL to profile image
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },

    password: {
      type: String,
      // required: function () {
      //   return !this.provider || this.provider === "local";
      // },
      trim: true,
      select: false, // ✅ Hide password from query results
    },

    user_type: {
      type: String,
      // enum: ["mentee", "mentor", "company", "institution",  "admin"],
      // default: "mentee", // ✅ Uncomment if you want a default role
    },

    verified: {
      type: Boolean,
      default: false,
    },

    verificationCode: {
      type: String,
      select: false,
    },

    verificationCodeValidation: {
      type: Number,
      select: false,
    },

    forgotPasswordCode: {
      type: String,
      select: false,
    },

    forgotPasswordCodeValidation: {
      type: Number,
      select: false,
    },
  },
  {
    timestamps: true, // ✅ Adds createdAt and updatedAt fields automatically
  }
);

const UserModel = mongoose.model("UserModel", userSchema);

export default UserModel;
