import express from "express";
import mongoose from "mongoose";
import { redis } from "../utilities/redis.js";

import { createProfileSchema } from "../validator/mentorValidator.js"
import  MentorProfileModel  from "../models/mentorProfileModel.js";
import { withTransaction } from "../middlewares/withTranaction.js";

import * as dotenv from "dotenv";
// import { v2 as cloudinary} from "cloudinary";

dotenv.config();

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// })


export const mentorDashboard = async (request, response) => {
  const {_id} = request.query;
  const { userId } = request.user;
  try {
    const mentorProfilesToIterate = await MentorProfileModel.find()
    //console.log(mentorProfilesToIterate)
    // Iterate through the array to find the object with the same userId as the request user

    for (let object of mentorProfilesToIterate) {
      //console.log(object)
      // console.log(userId)
      // console.log(object.userId)
      // if (object.userId === userId) {
      //   console.log(true)
      // } else {
      //   break
      // }
      while (userId === object.userId.toString()) {
        const profile = object
        const _iid = object._id.toString()
        const mentorProfile = await MentorProfileModel.findOne({_id: _iid})
        
        if (!mentorProfile) {
          return response.status(400).json({
            success: false,
            message: `${mentorProfile.name} ${mentorProfile.surname} doesn't have a profile, create one!`
          })
        }
        
        if(userId === mentorProfile.userId.toString()) {
          console.log(profile)
          response.status(200).json({
            success:true,
            message: `Here's your profile ${mentorProfile.name} ${mentorProfile.surname}`,
            result: profile
          })
        } else if (userId !== mentorProfile.userId.toString()) {
          return response.staus(403).json({
            success: false,
            message: `Unauthorised!, Login into your account`
          })
        }
      }
    }

    /** PLAESE KEEP THE CODE BELOW AT ALL COST */
    // const mentorProfile = await MentorProfileModel.findOne({_id});
    // if (!mentorProfile) {
    //   return response.status(400).json({
    //       success: false,
    //       message: "Profile doesn't exist, create One !"
    //   })
    // }

    // response.status(200).json({
    //     success: true,
    //     message: `Here's your dashboard profile ${mentorProfile.name} ${mentorProfile.surname}`,
    //     profile: mentorProfile
    // })
  } catch (error) {
      console.log(error)
      return response.status(500).json({
          field: null,
          success: false,
          message: error.details[0].message,
          messages: "Internal server error. Please try again later."
      });
  }
}
export default mentorDashboard;

// Transaction: ✅
export const createMentorProfile = async (req, res) => {
  //const session = await mongoose.startSession();
  try {
    //session.startTransaction();
    const {
      name,
      surname,
      avatar,
      aboutUser,
      field,
      roles,
      experienceLevel,
      price,
      availability,
      interviewFocusArea,
      currentJobTitle,
      companyName,
      aboutCompany,
      experience,
      socials,
      skills,
    } = req.body;

    const { userId, user_type } = req.user;

    // 1️⃣ Validate request
    const { error } = createProfileSchema.validate(
      {
        name,
        surname,
        avatar,
        aboutUser,
        field,
        roles,
        experienceLevel,
        price,
        availability,
        interviewFocusArea,
        currentJobTitle,
        companyName,
        aboutCompany,
        experience,
        socials,
        skills,
        userId,
      },
      { abortEarly: true }
    );

    if (error) {
      //await session.abortTransaction();
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    // 2️⃣ Authorization
    if (user_type !== "mentor") {
      //await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Only mentors are allowed to create a profile.",
      });
    }

    // 3️⃣ Check duplicate
    const existingProfile = await MentorProfileModel
      .findOne({ userId })
      //.session(session);

    if (existingProfile) {
      //await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "You already have a mentor profile.",
      });
    }
    // const photoURL = await cloudinary.uploader.upload(avatar)
    // 4️⃣ Create profile (WITH session)
    const [newProfile] = await MentorProfileModel.create(
      [
        {
          userId,
          name,
          surname,
          avatar,// : phothoURL.url
          aboutUser,
          field,
          roles,
          experienceLevel,
          price,
          availability,
          interviewFocusArea,
          currentJobTitle,
          companyName,
          aboutCompany,
          experience,
          socials,
          skills,
        }
      ],
      //{ session }
    );

   // await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Mentor profile created successfully.",
      result: newProfile,
    });

  } catch (err) {
   // await session.abortTransaction();
    console.error("Create mentor profile error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again.",
    });
  // } finally {
  //   session.endSession();
  // }
}};


// ✅ View Mentor Profile/ Cached: ✅
export const viewProfile = async (request, response) => {
  const {_id} = request.query;
  const { userId } = request.user;
  try {
    const mentorProfilesToIterate = await MentorProfileModel.find()
    //console.log(mentorProfilesToIterate)
    // Iterate through the array to find the object with the same userId as the request user

    for (let object of mentorProfilesToIterate) {
      //console.log(object)
      // console.log(userId)
      // console.log(object.userId)
      // if (object.userId === userId) {
      //   console.log(true)
      // } else {
      //   break
      // }
      while (userId === object.userId.toString()) {
        const profile = object
        const _iid = object._id.toString()
        const mentorProfile = await MentorProfileModel.findOne({_id: _iid})
        
        if (!mentorProfile) {
          return response.status(400).json({
            success: false,
            message: `${mentorProfile.name} ${mentorProfile.surname} doesn't have a profile, create one!`
          })
        }
        
        if(userId === mentorProfile.userId.toString()) {
          console.log(profile)
          response.status(200).json({
            success:true,
            message: `Here's your profile ${mentorProfile.name} ${mentorProfile.surname}`,
            result: profile
          })
        } else if (userId !== mentorProfile.userId.toString()) {
          return response.staus(403).json({
            success: false,
            message: `Unauthorised!, Login into your account`
          })
        }
      }
    }

    /** PLAESE KEEP THE CODE BELOW AT ALL COST */
    // const mentorProfile = await MentorProfileModel.findOne({_id});
    // if (!mentorProfile) {
    //   return response.status(400).json({
    //       success: false,
    //       message: "Profile doesn't exist, create One !"
    //   })
    // }

    // response.status(200).json({
    //     success: true,
    //     message: `Here's your dashboard profile ${mentorProfile.name} ${mentorProfile.surname}`,
    //     profile: mentorProfile
    // })
  } catch (error) {
      console.log(error)
      return response.status(500).json({
          field: null,
          success: false,
          message: error.details[0].message,
          messages: "Internal server error. Please try again later."
      });
  }
}

// ✅ View Mentor Profile/ Transaction: ✅
export const updateProfile = async (request, response) => {
  //const session = await mongoose.startSession();
    const {_id} = request.query;
    const {
    name,
    surname,
    avatar,
    aboutUser,

    field,
    roles,

    experienceLevel,
    price,
    availability,
    interviewFocusArea,

    currentJobTitle,
    companyName,
    aboutCompany,

    experience,
    socials,
    skills,
    } = request.body;
  const { userId } = request.user;
  // const photoURL = await cloudinary.uploader.upload(avatar)

  try {
    // 1️⃣ Validate request body against Joi schema
    const { error } = createProfileSchema.validate(
      {
        name,
        surname,
        avatar,
        aboutUser,

        field,
        roles,

        experienceLevel,
        price,
        availability,
        interviewFocusArea,

        currentJobTitle,
        companyName,
        aboutCompany,

        experience,
        socials,
        skills,

        userId,
      },
      { abortEarly: true }
    );

    if (error) {
      //await session.abortTransaction();
      return response.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const profile = await MentorProfileModel.find()
    for (let char of profile) {
      while (userId === char.userId.toString()) {
        const _iid = char._id.toString()
        const existingProfile = await MentorProfileModel.findByIdAndUpdate({ _id: _iid}, {
          name,
          surname,
          avatar, // : photoURL.url || avatar
          aboutUser,

          field,
          roles,

          experienceLevel,
          price,
          availability,
          interviewFocusArea,

          currentJobTitle,
          companyName,
          aboutCompany,

          experience,
          socials,
          skills,
        })

        if (!existingProfile) {
          return response.status(404).json({
            success: false,
            message: `You don't have a profile to update, please create one`
          })
        }

        if (existingProfile.userId.toString() === userId) {
          const updatedProfile = await MentorProfileModel.findOne({_id: _iid})
          response.status(201).json({
            success: true,
            message: "Profile updated successfully",
            updatedProfile: updatedProfile
          })
        }
        else if (existingProfile.userId.toString() !== userId) {
          return response.status(403).json({
            success: false,
            message: "Unauthorized to update this profile, please login into your accout"
          })
        }

      }
    }

    /** PLAESE KEEP THE CODE BELOW AT ALL COST */
    // const existingProfile = await MentorProfileModel.findOne({_id})//.session(session);
    // if (!existingProfile) {
    //   //await session.abortTransaction();
    //     return response.status(404).json({
    //         success: false,
    //         message: "Profile doesn't exist, create one !"
    //     });
    // }

    // if (existingProfile.userId.toString() !== userId) {
    //   //await session.abortTransaction();
    //   return response.status(403).json({
    //     success: false,
    //     message: "Unauthorized, profile doesn't belong to user. Please login to your account",
    //   });
    // } else {
    //     existingProfile.name = name;
    //     existingProfile.surname = surname;
    //     existingProfile.avatar = avatar/**: phothoURL.url */|| existingProfile.avatar;
    //     existingProfile.aboutUser = aboutUser;

    //     existingProfile.field = field;
    //     existingProfile.roles = roles;
    //     existingProfile.price = price;
    //     existingProfile.experienceLevel = experienceLevel;

    //     existingProfile.currentJobTitle = currentJobTitle;
    //     existingProfile.companyName = companyName;
    //     existingProfile.aboutCompany = aboutCompany || existingProfile.aboutCompany;
    //     existingProfile.availability = availability || existingProfile.availability;

    //     // Interview Ficus
    //     existingProfile.interviewFocusArea = interviewFocusArea || existingProfile.interviewFocusArea;

    //     // Work History
    //     existingProfile.experience = experience || existingProfile.experience;
    //     existingProfile.socials = socials || existingProfile.socials;
    //     existingProfile.skills = skills || existingProfile.skills;

    //     // const updatedProfile = await existingProfile.save()//{ session }
    //     // await session.commitTransaction();

    //     response.status(200).json({
    //         success: true,
    //         message: "Profile was updated!",
    //         updatedProfile,
    //     })
    // }

  } catch (error) {
    console.error("Create mentor profile error:", error);

    return response.status(500).json({
      success: false,
      message: "Internal server error. Please try again.",
    });
  }

}

// ✅ View Mentor Profile / Transaction: ✅
export const deleteProfile = async (request, response) => {
    // const session = request.mongoSession;
    const {_id} = request.query;
    const {userId} = request.user;

    try {
        // find profile with session
        const profileToDelete = await MentorProfileModel.find()
        for (let char of profileToDelete) {
          while (userId === char.userId.toString()) {
            const _iid = char._id.toString()
            const existingProfile = await MentorProfileModel.findOne({_id: _iid})
            
            if (!existingProfile) {
              return response.status(404).json({
                success: false,
                message: `${existingProfile.name} ${existingProfile.surname}, you don't have profile to delete, create one!`
              })
            }

            if (existingProfile.userId.toString() === userId) {
              console.log(true)
              await MentorProfileModel.deleteOne({_id: _iid})
              response.status(201).json({
                success: true,
                message: "Profile delete successfully"
              })
            }
            else if (existingProfile.userId.toString() !== userId) {
              return response.status(403).json({
                success: false,
                message: "Unauthorized to delete this profile, please login into your accout"
              })
            }  

          }
        }
        // const existingProfile = await MentorProfileModel.findOne({_id}); //.session(session);
        // if (!existingProfile) {
        //     return response.status(404).json({
        //         success: false,
        //         message: "User doesn't have a profile o delete. Create one first."
        //     })
        // }

        /** PLAESE KEEP THE CODE BELOW AT ALL COST */
        // if (existingProfile.userId.toString() === userId) {
        //     //await MentorProfileModel.deleteOne({_id});////.session(session);
        //     response.status(201).json({
        //         success: true,
        //         message: "Profile delete successfully"
        //     })
        // } else if (existingProfile.userId.toString() !== userId) {
        //   //await session.abortTransaction();
        //     return response.status(403).json({
        //         success: false,
        //         message: "Unauthorized to delete this onboard profile."
        //     })
        // }
         
    } catch(error) {
        return response.status(500).json({
            success: false,
            field: null,
            message: error.details[0].message
        })
    }
};