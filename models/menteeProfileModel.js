import mongoose from "mongoose";

const menteeProfileSchema = new mongoose.Schema(
    {
        name:{
            type: String,
            required: [true, "Name is required!"],
            trim: true,        
        },
        surname:{
            type: String,
            required: [true, "Surname is required!"],
            trim: true,      
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserModel",
            required: true,
            
        },
        avatar: { type: String }, // URL to profile image
        cv: { type: String }, // URL to CV
        
        portfolio: { type: String, trim: true },
        linkedin: { type: String, required: true, trim: true },
        github: { type: String, trim: true }
    }, { timestamps: true});

const MenteeProfileModel = mongoose.model("MenteeProfileModel", menteeProfileSchema);
export default MenteeProfileModel