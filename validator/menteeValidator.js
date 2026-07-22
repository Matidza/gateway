import Joi from "joi";

// ✅ Common field validations
const nameSchema = Joi.string().min(3).max(60).required().messages({
  "string.empty": "Name cannot be empty.",
  "string.min": "Name must be at least 3 characters long.",
  "string.max": "Name must not exceed 60 characters.",
  "any.required": "Name is required."
});

const surnameSchema = Joi.string().min(3).max(60).required().messages({
  "string.empty": "Surname cannot be empty.",
  "string.min": "Surname must be at least 3 characters long.",
  "string.max": "Surname must not exceed 60 characters.",
  "any.required": "Surname is required."
});


const userIdSchema = Joi.string().required().messages({
  "string.empty": "User ID is required.",
  "any.required": "User ID is required."
});
const linkedinSchema = Joi.string().required();
const  githubSchema = Joi.string().optional();
const  portfolioSchema = Joi.string().optional();
const avatarSchema = Joi.string().optional();//.uri()
const cvSchema = Joi.string().optional();//.uri()

// ✅ Main schema
const createProfileSchema = Joi.object({
  name: nameSchema,
  surname: surnameSchema,
  userId: userIdSchema,
  linkedin: linkedinSchema,
  portfolio: portfolioSchema,
  github: githubSchema,
  avatar: avatarSchema,
  cv: cvSchema
});

export { createProfileSchema };
