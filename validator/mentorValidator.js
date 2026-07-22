import Joi from "joi";

/*
|--------------------------------------------------------------------------
| FIELD → ROLES MAPPING
| Must mirror mentorProfileModel.js
|--------------------------------------------------------------------------
*/

const FIELD_ROLES = {
  "Software & Tech": [
    "Front-end Developer",
    "Back-end Developer",
    "Full Stack Developer",
    "Mobile App Developer",
    "Data Analyst",
    "Data Scientist",
    "Machine Learning Engineer",
    "DevOps Engineer",
    "Cloud Engineer",
    "QA / Software Tester",
    "UI/UX Designer",
    "IT Support Technician",
    "Systems Administrator",
    "Cybersecurity Analyst",
  ],

  Healthcare: [
    "Registered Nurse",
    "Enrolled Nurse",
    "Medical Doctor (Intern)",
    "Pharmacist",
    "Pharmacy Assistant",
    "Physiotherapist",
    "Radiographer",
    "Occupational Therapist",
    "Clinical Psychologist",
    "Medical Laboratory Technician",
    "Healthcare Administrator",
    "Community Health Worker",
  ],

  "Finance & Accounting": [
    "Accounting Graduate",
    "Junior Accountant",
    "Auditor",
    "Financial Analyst",
    "Tax Consultant",
    "Bookkeeper",
    "Payroll Administrator",
    "Investment Analyst",
    "Banking Associate",
    "Risk Analyst",
  ],

  Legal: [
    "Candidate Attorney",
    "Legal Intern",
    "Paralegal",
    "Compliance Officer",
    "Legal Advisor",
    "Law Clerk",
  ],

  "Marketing & Media": [
    "Digital Marketing Specialist",
    "Social Media Manager",
    "Content Creator",
    "SEO Specialist",
    "Marketing Coordinator",
    "Brand Strategist",
    "Public Relations Officer",
    "Copywriter",
    "Email Marketing Specialist",
  ],

  Education: [
    "Foundation Phase Teacher",
    "Intermediate Phase Teacher",
    "Senior Phase Teacher",
    "FET Teacher",
    "Lecturer",
    "Teaching Assistant",
    "Tutor",
    "Curriculum Developer",
    "Education Administrator",
  ],

  Engineering: [
    "Civil Engineering Graduate",
    "Mechanical Engineering Graduate",
    "Electrical Engineering Graduate",
    "Chemical Engineering Graduate",
    "Industrial Engineer",
    "Mechatronics Engineer",
    "Engineering Technician",
    "Site Engineer",
  ],

  "Business & Management": [
    "Business Analyst",
    "Management Consultant",
    "Project Coordinator",
    "Operations Analyst",
    "Human Resources Officer",
    "Recruitment Consultant",
    "Office Administrator",
    "Supply Chain Analyst",
  ],
};

/*
|--------------------------------------------------------------------------
| COMMON SCHEMAS
|--------------------------------------------------------------------------
*/

const nameSchema = Joi.string().min(3).max(60).required();
const surnameSchema = Joi.string().min(3).max(60).required();
const avatarSchema = Joi.string().optional();//.uri()

const aboutUserSchema = Joi.string().min(5).max(600).required();

const fieldSchema = Joi.string()
  .valid(...Object.keys(FIELD_ROLES))
  .required();

const rolesSchema = Joi.array()
  .items(Joi.string())
  .min(1)
  .required()
  .custom((roles, helpers) => {
    const { field } = helpers.state.ancestors[0];
    const validRoles = FIELD_ROLES[field];

    if (!validRoles) {
      return helpers.error("any.invalid");
    }

    const invalidRoles = roles.filter(
      (role) => !validRoles.includes(role)
    );

    if (invalidRoles.length > 0) {
      return helpers.message(
        `Invalid role(s) for ${field}: ${invalidRoles.join(", ")}`
      );
    }

    return roles;
  });

const experienceLevelSchema = Joi.string()
  .valid(
    "Entry / Graduate",
    "Junior",
    "Mid-Level",
    "Senior",
    "Lead / Manager"
  )
  .required();

const priceSchema = Joi.number().positive().required();

const availabilitySchema = Joi.array().items(Joi.string()).optional();
const interviewFocusAreaSchema = Joi.array().items(Joi.string()).optional();

const currentJobTitleSchema = Joi.string().min(3).max(60).required();
const companyNameSchema = Joi.string().min(3).max(60).required();
const aboutCompanySchema = Joi.string().min(10).optional();

const experienceSchema = Joi.array().items(
  Joi.object({
    role: Joi.string().required(),
    company: Joi.string().required(),
    duration: Joi.string().required(),
    companyLogo: Joi.string().uri().optional(),
  })
);

const socialsSchema = Joi.object({
  linkedin: Joi.string(),
  twitter: Joi.string().optional(),
  github: Joi.string().optional(),
  website: Joi.string().optional(),
})
const skillsSchema = Joi.array().items(Joi.string()).optional();

const userIdSchema = Joi.string().required();

/*
|--------------------------------------------------------------------------
| CREATE PROFILE VALIDATOR
|--------------------------------------------------------------------------
*/

const createProfileSchema = Joi.object({
  name: nameSchema,
  surname: surnameSchema,
  avatar: avatarSchema,
  aboutUser: aboutUserSchema,

  field: fieldSchema,
  roles: rolesSchema,

  experienceLevel: experienceLevelSchema,
  price: priceSchema,
  availability: availabilitySchema,
  interviewFocusArea: interviewFocusAreaSchema,

  currentJobTitle: currentJobTitleSchema,
  companyName: companyNameSchema,
  aboutCompany: aboutCompanySchema,

  experience: experienceSchema,
  socials: socialsSchema,
  skills: skillsSchema,

  userId: userIdSchema,
});

/*
|--------------------------------------------------------------------------
| USER ID VALIDATOR
|--------------------------------------------------------------------------
*/

const createUseridSchema = Joi.object({
  userId: userIdSchema,
});

export {
  createProfileSchema,createUseridSchema,
};