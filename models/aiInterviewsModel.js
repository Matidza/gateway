// import mongoose from "mongoose";

// const { Schema } = mongoose;

// /* ─────────────────────────────────────────────────────────────
//    SHARED BASE SCHEMA DEFINITION
//    Both CommunityAIInterview and PrivateAIInterview share the
//    same fields. We define them once and reuse them.

//    Field names match the frontend FormData type exactly:
//      title       → form.title
//      description → form.description
//      category    → form.category
//      difficulty  → form.difficulty
//      duration    → form.duration   (Number, minutes)
//      visibility  → derived: "public" → CommunityAIInterviewModel
//                              "private" → PrivateAIInterviewModel
//      questions   → form.questions  (string[], min 2 max 12)

//    System-managed (never sent from frontend):
//      createdBy   → userId from JWT (ObjectId ref to User)
//      attempts    → incremented each time a session is started
//      rating      → average of all linked session ratings
//      featured    → admin-toggled, default false
//      tags        → empty on creation, editable later
// ─────────────────────────────────────────────────────────────── */
// const baseFields = {
//   /* ── Ownership ── */
//   createdBy: {
//     // type:     Schema.Types.ObjectId,
//     type:     String,
//     ref:      "User",
//     required: [true, "createdBy (userId) is required"],
//     index:    true,
//   },

//   /* ── Step 1 form fields ── */
//   title: {
//     type:      String,
//     required:  [true, "Interview title is required"],
//     trim:      true,
//     minlength: [6,   "Title must be at least 6 characters"],
//     maxlength: [140, "Title cannot exceed 140 characters"],
//   },

//   description: {
//     type:      String,
//     required:  [true, "Description is required"],
//     trim:      true,
//     minlength: [11,   "Description must be at least 11 characters"],
//     maxlength: [600,  "Description cannot exceed 600 characters"],
//   },

//   category: {
//     type:     String,
//     required: [true, "Category is required"],
//     enum: {
//       values: ["technical","behavioural","product","data","marketing","finance","science"],
//       message:"Category must be one of: technical, behavioural, product, data, marketing, finance, science",
//     },
//     index: true,
//   },

//   difficulty: {
//     type:     String,
//     required: [true, "Difficulty is required"],
//     enum: {
//       values:  ["beginner","intermediate","advanced"],
//       message: "Difficulty must be one of: beginner, intermediate, advanced",
//     },
//     index: true,
//   },

//   // Parsed to Number by the controller before saving
//   duration: {
//     type:     Number,
//     required: [true, "Duration is required"],
//     min:      [5,    "Duration must be at least 5 minutes"],
//     max:      [120,  "Duration cannot exceed 120 minutes"],
//   },

//   /* ── Step 2 form fields ── */
//   // questions is string[] from the frontend (after filtering empty strings)
//   questions: {
//     type: [String],
//     validate: [
//       { validator: (arr) => Array.isArray(arr) && arr.length >= 2, message: "At least 2 questions are required" },
//       { validator: (arr) => Array.isArray(arr) && arr.length <= 12, message: "Maximum 12 questions allowed"  },
//     ],
//     default: [],
//   },

//   /* ── Tags (empty on creation, editable later) ── */
//   tags: {
//     type:    [String],
//     default: [],
//   },

//   /* ── System-managed counters ── */
//   attempts: {
//     type:    Number,
//     default: 0,
//     min:     0,
//   },

//   rating: {
//     type:    Number,
//     default: 0,
//     min:     0,
//     max:     5,
//   },

//   featured: {
//     type:    Boolean,
//     default: false,
//     index:   true,
//   },
// };

// const schemaOptions = {
//   timestamps: true,  // createdAt used for "newest" sort, updatedAt auto-managed
//   versionKey: false,
// };

// /* ─────────────────────────────────────────────────────────────
//    MODEL 1 — COMMUNITY AI INTERVIEW
//    Created when visibility === "public"
//    Stored in the "communityaiinterviews" collection.
//    Returned by getAIInterviews when tab === "community".
// ─────────────────────────────────────────────────────────────── */
// const CommunityAIInterviewSchema = new Schema(
//   {
//     ...baseFields,
//     // isPublic is always true here — enforced, not user-supplied
//     isPublic: {
//       type:    Boolean,
//       default: true,
//       immutable: true,  // cannot be flipped to private after creation
//     },
//   },
//   schemaOptions
// );

// /* Indexes for community tab query patterns:
//    - Filter by category, sort by createdAt  → compound
//    - Sort by attempts (popular)              → single
//    - Sort by rating                          → single
//    - Featured strip                          → compound
//    - Full-text search on title, description  → text
// */
// CommunityAIInterviewSchema.index({ isPublic: 1, category: 1, createdAt: -1 });
// CommunityAIInterviewSchema.index({ attempts: -1 });
// CommunityAIInterviewSchema.index({ rating: -1 });
// CommunityAIInterviewSchema.index({ featured: 1, attempts: -1 });
// CommunityAIInterviewSchema.index(
//   { title: "text", description: "text", tags: "text" },
//   { weights: { title: 10, tags: 5, description: 1 }, name: "community_interview_text" }
// );

// export const CommunityAIInterviewModel = mongoose.model(
//   "CommunityAIInterview",
//   CommunityAIInterviewSchema,
//   "communityaiinterviews"    // explicit collection name — avoids mongoose pluralisation quirks
// );


// /* ─────────────────────────────────────────────────────────────
//    MODEL 2 — PRIVATE AI INTERVIEW  (My Interviews)
//    Created when visibility === "private"
//    Stored in the "privateaiinterviews" collection.
//    Returned by getAIInterviews when tab === "mine".
//    Only the creator can read, practice, or delete these.
// ─────────────────────────────────────────────────────────────── */
// const PrivateAIInterviewSchema = new Schema(
//   {
//     ...baseFields,
//     isPublic: {
//       type:    Boolean,
//       default: false,
//       immutable: true,
//     },
//   },
//   schemaOptions
// );

// /* Indexes for "mine" tab — all queries are scoped to createdBy */
// PrivateAIInterviewSchema.index({ createdBy: 1, createdAt: -1 });
// PrivateAIInterviewSchema.index({ createdBy: 1, category: 1, createdAt: -1 });
// PrivateAIInterviewSchema.index({ createdBy: 1, attempts: -1 });

// export const PrivateAIInterviewModel = mongoose.model(
//   "PrivateAIInterview",
//   PrivateAIInterviewSchema,
//   "privateaiinterviews"
// );

// /* ─────────────────────────────────────────────────────────────
//    DEFAULT EXPORT — legacy import compatibility
//    The menteeController imports AIInterviewModel as default.
//    We export the community model as the default so that import
//    still resolves without breaking anything.
//    All new code should import the named exports directly.
// ─────────────────────────────────────────────────────────────── */
// export default CommunityAIInterviewModel;











import mongoose from "mongoose";

const { Schema } = mongoose;

/* ─────────────────────────────────────────────────────────────
   SHARED BASE SCHEMA DEFINITION
   Both CommunityAIInterview and PrivateAIInterview share the
   same fields. We define them once and reuse them.

   Field names match the frontend FormData type exactly:
     title       → form.title
     description → form.description
     category    → form.category
     difficulty  → form.difficulty
     duration    → form.duration   (Number, minutes)
     visibility  → derived: "public" → CommunityAIInterviewModel
                             "private" → PrivateAIInterviewModel
     questions   → form.questions  (string[], min 2 max 12)

   System-managed (never sent from frontend):
     createdBy   → userId from JWT (ObjectId ref to User)
     attempts    → incremented each time a session is started
     rating      → average of all linked session ratings
     featured    → admin-toggled, default false
     tags        → empty on creation, editable later
─────────────────────────────────────────────────────────────── */
const baseFields = {
  /* ── Ownership ── */
  createdBy: {
    //type:     Schema.Types.ObjectId,   // ObjectId — not String
    type:     String,
    ref:      "User",
    required: [true, "createdBy (userId) is required"],
    index:    true,
  },

  /* ── Step 1 form fields ── */
  title: {
    type:      String,
    required:  [true, "Interview title is required"],
    trim:      true,
    minlength: [6,   "Title must be at least 6 characters"],
    maxlength: [140, "Title cannot exceed 140 characters"],
  },

  description: {
    type:      String,
    required:  [true, "Description is required"],
    trim:      true,
    minlength: [11,   "Description must be at least 11 characters"],
    maxlength: [600,  "Description cannot exceed 600 characters"],
  },

  category: {
    type:     String,
    required: [true, "Category is required"],
    enum: {
      values: ["technical","behavioural","product","data","marketing","finance","science"],
      message:"Category must be one of: technical, behavioural, product, data, marketing, finance, science",
    },
    index: true,
  },

  difficulty: {
    type:     String,
    required: [true, "Difficulty is required"],
    enum: {
      values:  ["beginner","intermediate","advanced"],
      message: "Difficulty must be one of: beginner, intermediate, advanced",
    },
    index: true,
  },

  // Parsed to Number by the controller before saving
  duration: {
    type:     Number,
    required: [true, "Duration is required"],
    min:      [5,    "Duration must be at least 5 minutes"],
    max:      [120,  "Duration cannot exceed 120 minutes"],
  },

  /* ── Step 2 form fields ── */
  // questions is string[] from the frontend (after filtering empty strings)
  questions: {
    type: [String],
    validate: [
      { validator: (arr) => Array.isArray(arr) && arr.length >= 2, message: "At least 2 questions are required" },
      { validator: (arr) => Array.isArray(arr) && arr.length <= 12, message: "Maximum 12 questions allowed"  },
    ],
    default: [],
  },

  /* ── Tags (empty on creation, editable later) ── */
  tags: {
    type:    [String],
    default: [],
  },

  /* ── System-managed counters ── */
  attempts: {
    type:    Number,
    default: 0,
    min:     0,
  },

  rating: {
    type:    Number,
    default: 0,
    min:     0,
    max:     5,
  },

  featured: {
    type:    Boolean,
    default: false,
    index:   true,
  },
};

const schemaOptions = {
  timestamps: true,  // createdAt used for "newest" sort, updatedAt auto-managed
  versionKey: false,
};

/* ─────────────────────────────────────────────────────────────
   MODEL 1 — COMMUNITY AI INTERVIEW
   Created when visibility === "public"
   Stored in the "communityaiinterviews" collection.
   Returned by getAIInterviews when tab === "community".
─────────────────────────────────────────────────────────────── */
const CommunityAIInterviewSchema = new Schema(
  {
    ...baseFields,
    // isPublic is always true here — enforced, not user-supplied
    isPublic: {
      type:    Boolean,
      default: true,
      immutable: true,  // cannot be flipped to private after creation
    },
  },
  schemaOptions
);

/* Indexes for community tab query patterns:
   - Filter by category, sort by createdAt  → compound
   - Sort by attempts (popular)              → single
   - Sort by rating                          → single
   - Featured strip                          → compound
   - Full-text search on title, description  → text
*/
CommunityAIInterviewSchema.index({ isPublic: 1, category: 1, createdAt: -1 });
CommunityAIInterviewSchema.index({ attempts: -1 });
CommunityAIInterviewSchema.index({ rating: -1 });
CommunityAIInterviewSchema.index({ featured: 1, attempts: -1 });
CommunityAIInterviewSchema.index(
  { title: "text", description: "text", tags: "text" },
  { weights: { title: 10, tags: 5, description: 1 }, name: "community_interview_text" }
);

export const CommunityAIInterviewModel = mongoose.model(
  "CommunityAIInterview",
  CommunityAIInterviewSchema,
  "communityaiinterviews"    // explicit collection name — avoids mongoose pluralisation quirks
);


/* ─────────────────────────────────────────────────────────────
   MODEL 2 — PRIVATE AI INTERVIEW  (My Interviews)
   Created when visibility === "private"
   Stored in the "privateaiinterviews" collection.
   Returned by getAIInterviews when tab === "mine".
   Only the creator can read, practice, or delete these.
─────────────────────────────────────────────────────────────── */
const PrivateAIInterviewSchema = new Schema(
  {
    ...baseFields,
    isPublic: {
      type:    Boolean,
      default: false,
      immutable: true,
    },
  },
  schemaOptions
);

/* Indexes for "mine" tab — all queries are scoped to createdBy */
PrivateAIInterviewSchema.index({ createdBy: 1, createdAt: -1 });
PrivateAIInterviewSchema.index({ createdBy: 1, category: 1, createdAt: -1 });
PrivateAIInterviewSchema.index({ createdBy: 1, attempts: -1 });

export const PrivateAIInterviewModel = mongoose.model(
  "PrivateAIInterview",
  PrivateAIInterviewSchema,
  "privateaiinterviews"
);

/* ─────────────────────────────────────────────────────────────
   DEFAULT EXPORT — legacy import compatibility
   The menteeController imports AIInterviewModel as default.
   We export the community model as the default so that import
   still resolves without breaking anything.
   All new code should import the named exports directly.
─────────────────────────────────────────────────────────────── */
export default CommunityAIInterviewModel;