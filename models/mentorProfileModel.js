import mongoose from "mongoose";


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
    "Senior Software Engineer",
    "Technical Coach",
    "Database Administrator",
    "Network Engineer",
    "Software Architect",
    "Game Developer"
  ],

  Healthcare: [
    "Registered Nurse",
    "Enrolled Nurse",
    "Medical Doctor (Intern)",
    "Medical Doctor (General Practitioner)",
    "Pharmacist",
    "Pharmacy Assistant",
    "Physiotherapist",
    "Radiographer",
    "Occupational Therapist",
    "Clinical Psychologist",
    "Medical Laboratory Technician",
    "Healthcare Administrator",
    "Community Health Worker",
    "Clinical Mentor",
    "Dietician",
    "Speech Therapist",
    "Emergency Care Practitioner",
    "Public Health Officer"
  ],

  "Finance & Accounting": [
    "Accounting Graduate",
    "Junior Accountant",
    "Senior Accountant",
    "Auditor",
    "Financial Analyst",
    "Investment Analyst",
    "Tax Consultant",
    "Bookkeeper",
    "Payroll Administrator",
    "Banking Associate",
    "Risk Analyst",
    "Credit Analyst",
    "Treasury Analyst",
    "Budget Analyst",
    "Management Accountant",
    "Finance Manager"
  ],

  Legal: [
    "Candidate Attorney",
    "Legal Intern",
    "Paralegal",
    "Compliance Officer",
    "Legal Advisor",
    "Law Clerk",
    "Corporate Lawyer",
    "Intellectual Property Lawyer",
    "Labor Relations Officer",
    "Legal Consultant"
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
    "Advertising Executive",
    "Market Research Analyst",
    "Event Marketing Coordinator",
    "Influencer Marketing Manager"
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
    "School Principal",
    "Guidance Counsellor",
    "Education Consultant",
    "E-Learning Specialist"
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
    "Structural Engineer",
    "Project Engineer",
    "Process Engineer",
    "Maintenance Engineer"
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
    "Executive Assistant",
    "Business Development Manager",
    "Operations Manager",
    "Project Manager",
    "Strategy Consultant",
    "Entrepreneur / Startup Founder",
    "Management Trainee"
  ],

  "Human Resources": [
    "HR Business Partner",
    "Talent Specialist",
    "Career Coach",
    "Recruitment Specialist",
    "HR Administrator",
    "Training & Development Officer",
    "Compensation & Benefits Analyst",
    "HR Coordinator",
    "Employee Relations Specialist",
    "HR Manager"
  ],

  Agriculture: [
    "Agricultural Engineer",
    "Farm Manager",
    "Agronomy Specialist",
    "Horticulturist",
    "Animal Scientist",
    "Agri-Business Consultant",
    "Soil Scientist",
    "Food Technologist",
    "Veterinary Technician",
    "Research Scientist"
  ],

  "Creative Arts & Design": [
    "Graphic Designer",
    "Illustrator",
    "Animator",
    "Fashion Designer",
    "Interior Designer",
    "Photographer",
    "Art Director",
    "Creative Consultant",
    "Set Designer",
    "Music Producer"
  ],

  "Hospitality & Tourism": [
    "Hotel Manager",
    "Event Coordinator",
    "Tour Guide",
    "Travel Consultant",
    "Food & Beverage Manager",
    "Chef",
    "Restaurant Manager",
    "Hospitality Consultant",
    "Front Office Manager",
    "Concierge"
  ],

  "Media & Communication": [
    "Journalist",
    "News Reporter",
    "Radio Presenter",
    "TV Producer",
    "Content Strategist",
    "Media Planner",
    "Public Relations Officer",
    "Social Media Analyst",
    "Copywriter",
    "Communications Specialist"
  ],

  "Science & Research": [
    "Laboratory Technician",
    "Research Scientist",
    "Environmental Scientist",
    "Biochemist",
    "Physicist",
    "Chemist",
    "Clinical Research Associate",
    "Data Scientist",
    "Statistician",
    "Research Assistant"
  ],

  "Law Enforcement & Security": [
    "Police Officer",
    "Crime Analyst",
    "Security Consultant",
    "Forensic Analyst",
    "Customs Officer",
    "Correctional Officer",
    "Private Investigator",
    "Security Manager",
    "Loss Prevention Officer",
    "Cybersecurity Specialist"
  ]
};


const mentorProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    surname: { type: String, required: true, trim: true },
    avatar: { type: String },
    aboutUser: { type: String, required: true, trim: true },

    field: {
      type: String,
      enum: Object.keys(FIELD_ROLES),
      required: true,
    },

    roles: {
      type: [String],
      required: true,
      validate: {
        validator: function (selectedRoles) {
          if (!this.field) return false;
          const validRoles = FIELD_ROLES[this.field];
          if (!validRoles) return false;
          return (
            Array.isArray(selectedRoles) &&
            selectedRoles.length > 0 &&
            selectedRoles.every((role) => validRoles.includes(role))
          );
        },
        message:
          "One or more selected roles are invalid for the chosen field",
      },
    },

    experienceLevel: {
      type: String,
      enum: [
        "Entry / Graduate",
        "Junior",
        "Mid-Level",
        "Senior",
        "Lead / Manager",
      ],
      required: true,
    },

    price: { type: Number, required: true },
    availability: [String],
    interviewFocusArea: [String],

    currentJobTitle: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    aboutCompany: { type: String, trim: true },

    experience: [
      {
        role: { type: String, trim: true },
        company: { type: String, trim: true },
        duration: { type: String, trim: true },
        companyLogo: { type: String },
      },
    ],

    socials: {
      linkedin: { type: String, required: true, trim: true },
      twitter: { type: String, trim: true },
      github: { type: String, trim: true },
      website: { type: String, trim: true },
    },

    skills: [String],

    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },

    testimonials: [
      {
        user: { type: String, trim: true },
        comment: { type: String, trim: true },
      },
    ],

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
  },
  { timestamps: true }
);

const MentorProfileModel = mongoose.model(
  "MentorProfileModel",
  mentorProfileSchema
);

export default MentorProfileModel;
export { FIELD_ROLES };