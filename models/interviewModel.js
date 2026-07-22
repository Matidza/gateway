import mongoose from "mongoose";

const { Schema } = mongoose;

const InterviewSchema = new Schema(
  {
    menteeId: {
      type: Schema.Types.ObjectId,
      ref: "MenteeProfile",
      required: true,
      index: true,
    },
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "MentorProfile",
      required: true,
      index: true,
    },
    field: {
      type: String,
      required: true, // Mapped to professional categories
    },
    targetRole: {
      type: String,
      required: true, // e.g., "Systems Administrator"
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 45,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    meetingLink: {
      type: String,
      default: "", // Populated automatically when status shifts to confirmed
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
    feedbackId: {
      type: Schema.Types.ObjectId,
      ref: "Feedback",
    },
    cancelReason: {
      type: String,
      default: "",
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes compound lookups commonly utilized on your dashboard metrics
InterviewSchema.index({ menteeId: 1, status: 1 });
InterviewSchema.index({ mentorId: 1, status: 1 });

const InterviewModel = mongoose.model("Interview", InterviewSchema);
export default InterviewModel;