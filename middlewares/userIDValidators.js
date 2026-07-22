import Joi from "joi";

// ✅ Common field schemas
const emailSchema = Joi.string()
  .min(5)
  .max(60)
  .required()
  .email({ tlds: { allow: ['com', 'net'] } })
  .messages({
    'string.email': 'Email must be a valid email address with .com or .net domain.',
    'string.empty': 'Email cannot be empty.',
    'any.required': 'Email is required.',
    'string.min': 'Email must be at least 5 characters long.',
    'string.max': 'Email must not exceed 60 characters.'
  });

const passwordPattern = new RegExp(
  '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:\'",.<>/?]).{8,}$'
);

const passwordSchema = Joi.string()
  .required()
  .pattern(passwordPattern)
  .messages({
    'string.pattern.base': 'Password must be at least 8 characters long, include uppercase and lowercase letters, a number, and a special character.',
    'string.empty': 'Password cannot be empty.',
    'any.required': 'Password is required.'
  });

const providedCodeSchema = Joi.number()
  .required()
  .messages({
    'number.base': 'Provided code must be a number.',
    'any.required': 'Provided code is required.'
  });

const oldPasswordSchema = passwordSchema;
const newPasswordSchema = passwordSchema;

// ✅ Auth schemas
const signUpSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema
});

const signInSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema
});

const acceptedCodeSchema = Joi.object({
  email: emailSchema,
  providedCodeValue: providedCodeSchema
});

const changePasswordSchema = Joi.object({
  oldPassword: oldPasswordSchema,
  newPassword: newPasswordSchema
});

const sendCodeSchema = Joi.object({
  email: emailSchema
});

const acceptForgotPasswordSchema = Joi.object({
  email: Joi.string()
    .min(5)
    .max(60)
    .required()
    .email({ tlds: { allow: false } }),
  providedCodeValue: providedCodeSchema,
  newPassword: passwordSchema
});

// ✅ Post-related schemas
const titleSchema = Joi.string()
  .min(3)
  .max(60)
  .required()
  .messages({
    'string.empty': 'Title cannot be empty.',
    'string.min': 'Title must be at least 3 characters long.',
    'string.max': 'Title must not exceed 60 characters.',
    'any.required': 'Title is required.'
  });

const descriptionSchema = Joi.string()
  .min(5)
  .max(600)
  .required()
  .messages({
    'string.empty': 'Description cannot be empty.',
    'string.min': 'Description must be at least 5 characters long.',
    'string.max': 'Description must not exceed 600 characters.',
    'any.required': 'Description is required.'
  });

const userIdSchema = Joi.string()
  .required()
  .messages({
    'string.empty': 'User ID is required.',
    'any.required': 'User ID is required.'
  });

const createPostSchema = Joi.object({
  userId: userIdSchema
});

// ✅ Export schemas
export {
  createPostSchema,
  signUpSchema,
  signInSchema,
  acceptedCodeSchema,
  changePasswordSchema,
  acceptForgotPasswordSchema,
  sendCodeSchema
};
