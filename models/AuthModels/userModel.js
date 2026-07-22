import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required!"],
      trim: true,
      unique: [true, "Email already exists"],
      minlength: [5, "Email must be a minimum of 5 characters"],
      lowercase: true,
    },

  },
  {
    timestamps: true, // ✅ Adds createdAt and updatedAt fields
  }
);

const UserModel = mongoose.model("UserModel", userSchema);

export default UserModel;
