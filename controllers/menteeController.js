import axios from "axios";
// import Redis from "ioredis";
import mongoose from "mongoose";
// import * as dotenv from (dotenv);
import { redis } from "../utilities/redis.js";
// import { v2 as cloudinary } from "cloudinary";

import MentorProfileModel from "../models/mentorProfileModel.js";
import AIInterviewModel from "../models/aiInterviewsModel.js"
import InterviewModel from "../models/interviewModel.js"
import MenteeProfileModel from "../models/menteeProfileModel.js";
import { PrivateAIInterviewModel, CommunityAIInterviewModel  } from "../models/aiInterviewsModel.js";
import { createProfileSchema } from "../validator/menteeValidator.js";



// dotenv.config();

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

/* ─────────────────────────────────────────────────────────────
   HELPER — consistent error response
───────────────────────────────────────────────────────────── */
// const serverError = (res, error, context = "controller") => {
//   console.error(`[menteeController:${context}]`, error);
//   const message =
//     error?.details?.[0]?.message ??
//     error?.message ??
//     "Internal server error. Please try again later.";
//   return res.status(500).json({ success: false, field: null, message });
// };


const serverError = (res, error, context = "aiInterviewController") => {
  console.error(`[${context}]`, error);
  const message =
    error?.details?.[0]?.message ??
    error?.message ??
    "Internal server error. Please try again later.";
  return res.status(500).json({ success: false, field: null, message });
};

const VALID_CATEGORIES   = ["technical","behavioural","product","data","marketing","finance","science"];
const VALID_DIFFICULTIES = ["beginner","intermediate","advanced"];
const SORT_MAP = {
  popular:  { attempts: -1 },
  rating:   { rating:   -1 },
  newest:   { createdAt:-1 },
  shortest: { duration:  1 },
};

/* ─────────────────────────────────────────────────────────────
   DASHBOARD  GET /mentee/dashboard
   Returns the logged-in mentee's own profile + a limited list
   of recommended mentors. Never returns all profiles.
───────────────────────────────────────────────────────────── */

export const menteeDashboard = async (request, response) => {
  const { userId } = request.query; // ✅ from JWT middleware
  

  try {
    // 1. Fetch the logged-in mentee's own profile
    const menteeProfile = await MenteeProfileModel.findOne({ userId });

    // 2. Fetch a limited set of mentor recommendations (top 9)
    const recommendedMentors = await MentorProfileModel.find()
      .limit(9)
      .sort({ createdAt: -1 });
    console.log(recommendedMentors)
    if (!recommendedMentors || recommendedMentors.length === 0) {
      return response.status(404).json({
        success: false,
        message: "No professionals found",
      });
    }

    return response.status(200).json({
      success: true,
      message: "Dashboard data loaded successfully",
      result: {
        profile: menteeProfile ?? null,  // null if mentee hasn't created a profile yet
        recommendedMentors,
      },
    });

  } catch (error) {
    return serverError(response, error, "menteeDashboard");
  }
};


/* ─────────────────────────────────────────────────────────────
   PROFESSIONALS  GET /mentee/professionals
   Paginated, filtered, Redis-cached mentor listing.
───────────────────────────────────────────────────────────── */
export const Profesionals = async (req, res) => {
  const page  = Math.max(Number(req.query.page)  || 1,  1);
  const limit = Math.max(Number(req.query.limit) || 64, 1);
  const { field, experienceLevel, search } = req.query;

  try {
    const cacheKey = `MentorProfiles:${page}:${limit}:${field||"all"}:${experienceLevel||"all"}:${search||"all"}`;
    const cached   = await redis.get(cacheKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    let query = {};
    if (field)           query.field = field;
    if (experienceLevel) query.experienceLevel = experienceLevel;
    if (search) {
      query.$or = [
        { name:    { $regex: search, $options: "i" } },
        { surname: { $regex: search, $options: "i" } },
        { roles:   { $regex: search, $options: "i" } },
        { skills:  { $regex: search, $options: "i" } },
      ];
    }

    const [total, profiles] = await Promise.all([
      MentorProfileModel.countDocuments(query),
      MentorProfileModel.find(query).skip((page - 1) * limit).limit(limit),
    ]);

    if (!profiles?.length) {
      return res.status(404).json({ success: false, message: "No professional profiles found" });
    }

    const payload = {
      success: true,
      message: "Professional profiles retrieved successfully",
      pagination: {
        currentPage: page, limit,
        totalPages: Math.ceil(total / limit), totalResults: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      result: profiles,
    };

    await redis.setEx(cacheKey, 60, JSON.stringify(payload));
    return res.status(200).json(payload);

  } catch (error) {
    return serverError(res, error, "Profesionals");
  }
};


/* ─────────────────────────────────────────────────────────────
   PROFESSIONAL DETAILS  GET /mentee/professional-details/:id
───────────────────────────────────────────────────────────── */
export const individualBookPage = async (req, res) => {
  const { _id } = req.query;
  try {
    const profile = await MentorProfileModel.findById(_id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Mentor profile unavailable" });
    }
    return res.status(200).json({
      success: true,
      message: `${profile.name} ${profile.surname}'s profile`,
      result: profile,
    });
  } catch (error) {
    return serverError(res, error, "individualBookPage");
  }
};



/* ─────────────────────────────────────────────────────────────
   AI INTERVIEW HOME  GET /mentee/ai-home

   Returns the logged-in mentee's AI session stats AND the
   community interview library (with optional filters that
   mirror the frontend filter bar: search, category, sort).

   Matches frontend state:
     search  → req.query.search
     cat     → req.query.category   (e.g. "technical", "behavioural")
     sort    → req.query.sort       ("popular" | "rating" | "newest" | "shortest")
     tab     → "community" interviews always available; "mine" uses userId filter
───────────────────────────────────────────────────────────── */
export const aiInterviewHome = async (req, res) => {
  // const { userId } = req.user;
  const { search, category, sort, tab } = req.query;

  try {
    // ── 1. User's AI stats ──
    const [totalSessions, completedCount] = await Promise.all([
      AIInterviewModel.countDocuments({  }),
      AIInterviewModel.countDocuments({  status: "completed" }),
    ]);

    // ── 2. Interview library query ──
    let query = {};

    if (tab === "mine") {
      // "My interviews" tab — only interviews created by this user
      query.createdBy = userId;
    } else {
      // "Community" tab — all public interviews
      query.isPublic = true;
    }

    if (category && category !== "all") query.category = category;

    if (search?.trim()) {
      query.$or = [
        { title:       { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { tags:        { $regex: search.trim(), $options: "i" } },
      ];
    }

    // ── 3. Sort mapping (mirrors frontend sort state) ──
    const sortMap = {
      popular:  { attempts: -1 },
      rating:   { rating: -1 },
      newest:   { createdAt: -1 },
      shortest: { duration: 1 },
    };
    const sortOpt = sortMap[sort] ?? sortMap.popular;

    const interviews = await AIInterviewModel.find(query)
      .sort(sortOpt)
      .limit(100);                                    // reasonable cap

    return res.status(200).json({
      success: true,
      message: "AI interview home data loaded",
      result: {
        stats: {
          totalSessions,
          completedSessions: completedCount,
          completionRate: totalSessions > 0
            ? Math.round((completedCount / totalSessions) * 100)
            : 0,
        },
        interviews,
      },
    });

  } catch (error) {
    return serverError(res, error, "aiInterviewHome");
  }
};







/* ─────────────────────────────────────────────────────────────
   AI PRACTICE  POST /mentee/ai-practice
   Starts or resumes an AI practice session for the logged-in
   mentee using a specific community interview as the template.

   Frontend passes (via navigate state + body):
     interviewId  — the AIInterview being practiced
     sessionId    — omit to start new, include to resume
───────────────────────────────────────────────────────────── */
export const aiPractice = async (req, res) => {
  const { userId } = req.user;
  const { interviewId, sessionId } = req.body;

  try {
    if (sessionId) {
      // ── Resume existing session ──
      const session = await AISessionModel.findOne({ _id: sessionId, userId });
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "AI practice session not found or does not belong to you",
        });
      }
      return res.status(200).json({
        success: true,
        message: "AI practice session resumed",
        result: session,
      });
    }

    // ── Start a new session ──
    if (!interviewId) {
      return res.status(400).json({
        success: false,
        message: "interviewId is required to start a new practice session",
      });
    }

    const interview = await AIInterviewModel.findById(interviewId);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview template not found",
      });
    }

    const session = await AISessionModel.create({
      userId,
      interviewId,
      topic:      interview.title,
      category:   interview.category,
      difficulty: interview.difficulty,
      questions:  interview.questions,
      status:     "in_progress",
      startedAt:  new Date(),
      messages:   [],
    });

    // Increment attempt counter on the interview
    await AIInterviewModel.findByIdAndUpdate(interviewId, { $inc: { attempts: 1 } });

    return res.status(201).json({
      success: true,
      message: "AI practice session started",
      result: session,
    });

  } catch (error) {
    return serverError(res, error, "aiPractice");
  }
};


/* ─────────────────────────────────────────────────────────────
   CV ANALYZER  GET|POST /mentee/cv-analyzer
───────────────────────────────────────────────────────────── */
export const cvAnalyzer = async (req, res) => {
  const { userId } = req.user;

  try {
    if (req.method === "GET") {
      const profile = await MenteeProfileModel.findOne({ userId });
      if (!profile) {
        return res.status(404).json({ success: false, message: "Mentee profile not found" });
      }
      return res.status(200).json({
        success: true,
        message: "CV analyzer data loaded",
        result: { cv: profile.cv ?? null, analysisHistory: profile.cvAnalysisHistory ?? [] },
      });
    }

    if (req.method === "POST") {
      const { analysisResult } = req.body;
      if (!analysisResult) {
        return res.status(400).json({ success: false, message: "analysisResult is required" });
      }
      const updated = await MenteeProfileModel.findOneAndUpdate(
        { userId },
        { $push: { cvAnalysisHistory: { ...analysisResult, analyzedAt: new Date() } } },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ success: false, message: "Mentee profile not found" });
      }
      return res.status(200).json({
        success: true,
        message: "CV analysis saved",
        result: updated.cvAnalysisHistory,
      });
    }

  } catch (error) {
    return serverError(res, error, "cvAnalyzer");
  }
};


/* ─────────────────────────────────────────────────────────────
   INTERVIEWS  GET /mentee/interviews
───────────────────────────────────────────────────────────── */
export const interviews = async (req, res) => {
  // const { userId } = req.user;
   const { userId } = "userId";
  const { status, page = 1, limit = 20 } = req.query;

  try {
    const query = { menteeId: userId };
    if (status) query.status = status;

    const [total, results] = await Promise.all([
      InterviewModel.countDocuments(query),
      InterviewModel.find(query)
        .sort({ scheduledAt: -1 })
        .skip((Math.max(Number(page), 1) - 1) * Number(limit))
        .limit(Number(limit))
        .populate("mentorId", "name surname avatar roles field"),
    ]);

    return res.status(200).json({
      success: true,
      message: "Interviews retrieved",
      pagination: { currentPage: Number(page), totalResults: total, totalPages: Math.ceil(total / Number(limit)) },
      result: results,
    });
  } catch (error) {
    return serverError(res, error, "interviews");
  }
};


/* ─────────────────────────────────────────────────────────────
   REQUEST AN INTERVIEW  POST /mentee/request-an-interview

   Receives exactly the fields from the RequestSession
   multi-step form (all 4 steps combined on submit):

   Step 0 — session type selection
     sType      → sessionType   (e.g. "mock" | "cv" | "coaching" | "system")
     price      → amount        (taken from the mentor's sessionTypes array)
     duration   → duration      (string like "45 min" → stored as-is or parsed)

   Step 1 — date & time
     selectedDate.label → proposedDate   (e.g. "Mon 12 May")
     time               → proposedTime   (e.g. "09:00")

   Step 2 — goals & message
     goals[]   → goals           (array of selected goal strings)
     message   → message         (optional free-text to mentor)

   Step 3 — confirm (read-only summary, nothing new captured)

   mentorId comes from the professional's profile card (route param or query).
───────────────────────────────────────────────────────────── */
export const requestAnInterview = async (req, res) => {
  const { userId } = req.user;
  const {
    mentorId,
    sessionType,   // "mock" | "cv" | "coaching" | "system"
    amount,        // number — session fee in ZAR
    duration,      // string — e.g. "45 min"
    proposedDate,  // string — e.g. "Mon 12 May"
    proposedTime,  // string — e.g. "14:00"
    goals,         // string[] — selected goal chips
    message,       // string  — optional message to mentor
  } = req.body;

  try {
    // ── Required field validation ──
    if (!mentorId) {
      return res.status(400).json({
        success: false, field: "mentorId",
        message: "mentorId is required",
      });
    }

    // Mirrors canNext[0]: sType must be selected
    if (!sessionType) {
      return res.status(400).json({
        success: false, field: "sessionType",
        message: "Session type is required",
      });
    }

    // Mirrors canNext[1]: dateIdx !== null && time
    if (!proposedDate || !proposedTime) {
      return res.status(400).json({
        success: false, field: "proposedDate",
        message: "A date and time slot are required",
      });
    }

    // Mirrors canNext[2]: goals.length > 0
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({
        success: false, field: "goals",
        message: "At least one session goal must be selected",
      });
    }

    const VALID_SESSION_TYPES = ["mock", "cv", "coaching", "system"];
    if (!VALID_SESSION_TYPES.includes(sessionType)) {
      return res.status(400).json({
        success: false, field: "sessionType",
        message: `sessionType must be one of: ${VALID_SESSION_TYPES.join(", ")}`,
      });
    }

    const VALID_GOALS = [
      "Crack technical rounds",
      "Improve STAR answers",
      "System design prep",
      "Confidence building",
      "Salary negotiation",
      "CV improvement",
      "Career switch advice",
      "First job guidance",
    ];
    const invalidGoals = goals.filter(g => !VALID_GOALS.includes(g));
    if (invalidGoals.length > 0) {
      return res.status(400).json({
        success: false, field: "goals",
        message: `Invalid goals: ${invalidGoals.join(", ")}`,
      });
    }

    // ── Verify mentor exists ──
    const mentor = await MentorProfileModel.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({ success: false, message: "Mentor not found" });
    }

    // ── Create the interview request ──
    const newInterview = await InterviewModel.create({
      menteeId:    userId,
      mentorId,
      sessionType,                          // which type of session was selected
      amount:      Number(amount) || 0,     // fee in ZAR
      duration:    duration ?? "",          // "45 min" etc.
      proposedDate,                         // human-readable date label
      proposedTime,                         // "14:00" SAST
      goals,                                // array of selected goal strings
      message:     message?.trim() ?? "",   // optional message to mentor
      status:      "pending",               // awaiting mentor confirmation
      requestedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: `Session request sent to ${mentor.name} ${mentor.surname}. You will be notified once they confirm.`,
      result: {
        interviewId:  newInterview._id,
        sessionType:  newInterview.sessionType,
        proposedDate: newInterview.proposedDate,
        proposedTime: newInterview.proposedTime,
        duration:     newInterview.duration,
        amount:       newInterview.amount,
        status:       newInterview.status,
      },
    });

  } catch (error) {
    return serverError(res, error, "requestAnInterview");
  }
};


/* ─────────────────────────────────────────────────────────────
   JOIN SESSION  GET /mentee/join-session
───────────────────────────────────────────────────────────── */
export const joinSession = async (req, res) => {
  const { userId } = req.user;
  const { sessionId } = req.query;

  try {
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const session = await SessionModel.findOne({ _id: sessionId, menteeId: userId })
      .populate("mentorId", "name surname avatar field roles");

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found or not authorised" });
    }
    if (session.status === "cancelled") {
      return res.status(410).json({ success: false, message: "This session has been cancelled" });
    }

    return res.status(200).json({
      success: true,
      message: "Session loaded — you are authorised to join",
      result: {
        sessionId:   session._id,
        mentor:      session.mentorId,
        scheduledAt: session.scheduledAt,
        duration:    session.duration,
        meetingUrl:  session.meetingUrl  ?? null,
        roomToken:   session.roomToken   ?? null,
        status:      session.status,
      },
    });
  } catch (error) {
    return serverError(res, error, "joinSession");
  }
};


/* ─────────────────────────────────────────────────────────────
   APPLICATIONS  GET /mentee/applications
───────────────────────────────────────────────────────────── */
export const applications = async (req, res) => {
  const { userId } = req.user;
  const { status, page = 1, limit = 20 } = req.query;

  try {
    const query = { menteeId: userId };
    if (status) query.status = status;

    const [total, results] = await Promise.all([
      ApplicationModel.countDocuments(query),
      ApplicationModel.find(query)
        .sort({ appliedAt: -1 })
        .skip((Math.max(Number(page), 1) - 1) * Number(limit))
        .limit(Number(limit)),
    ]);

    return res.status(200).json({
      success: true,
      message: "Applications retrieved",
      pagination: { currentPage: Number(page), totalResults: total, totalPages: Math.ceil(total / Number(limit)) },
      result: results,
    });
  } catch (error) {
    return serverError(res, error, "applications");
  }
};


/* ─────────────────────────────────────────────────────────────
   FEEDBACK  GET|POST /mentee/feedback
───────────────────────────────────────────────────────────── */
export const feedback = async (req, res) => {
  const { userId } = req.user;

  try {
    if (req.method === "GET") {
      const list = await FeedbackModel.find({ menteeId: userId })
        .sort({ createdAt: -1 })
        .populate("sessionId mentorId", "scheduledAt name surname avatar");
      return res.status(200).json({ success: true, message: "Feedback retrieved", result: list });
    }

    if (req.method === "POST") {
      const { sessionId, mentorId, rating, comment } = req.body;
      if (!sessionId || !mentorId || !rating) {
        return res.status(400).json({ success: false, message: "sessionId, mentorId, and rating are required" });
      }
      const existing = await FeedbackModel.findOne({ sessionId, menteeId: userId });
      if (existing) {
        return res.status(409).json({ success: false, message: "Feedback already submitted for this session" });
      }
      const nf = await FeedbackModel.create({ menteeId: userId, mentorId, sessionId, rating, comment: comment ?? "" });
      return res.status(201).json({ success: true, message: "Feedback submitted", result: nf });
    }

  } catch (error) {
    return serverError(res, error, "feedback");
  }
};


/* ─────────────────────────────────────────────────────────────
   PAY  POST /mentee/pay
───────────────────────────────────────────────────────────── */
export const paySession = async (req, res) => {
  const { userId } = req.user;
  const { sessionId, paymentMethod, amount } = req.body;

  try {
    if (!sessionId || !amount) {
      return res.status(400).json({ success: false, message: "sessionId and amount are required" });
    }
    const session = await SessionModel.findOne({ _id: sessionId, menteeId: userId });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (session.isPaid) {
      return res.status(409).json({ success: false, message: "Session already paid" });
    }

    const payment = await PaymentModel.create({
      menteeId: userId, sessionId, amount,
      paymentMethod: paymentMethod ?? "card",
      status: "pending", initiatedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Payment initiated",
      result: { paymentId: payment._id, status: payment.status, amount: payment.amount },
    });
  } catch (error) {
    return serverError(res, error, "paySession");
  }
};


/* ─────────────────────────────────────────────────────────────
   REFUND  POST /mentee/refund
───────────────────────────────────────────────────────────── */
export const refund = async (req, res) => {
  const { userId } = req.user;
  const { paymentId, reason } = req.body;

  try {
    if (!paymentId) {
      return res.status(400).json({ success: false, message: "paymentId is required" });
    }
    const payment = await PaymentModel.findOne({ _id: paymentId, menteeId: userId });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }
    if (payment.status === "refunded") {
      return res.status(409).json({ success: false, message: "Already refunded" });
    }
    if (payment.status !== "successful") {
      return res.status(400).json({ success: false, message: "Only successful payments can be refunded" });
    }

    payment.status             = "refund_pending";
    payment.refundReason       = reason ?? "";
    payment.refundRequestedAt  = new Date();
    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Refund request submitted. Processing in 3–5 business days.",
      result: { paymentId: payment._id, status: payment.status },
    });
  } catch (error) {
    return serverError(res, error, "refund");
  }
};


/* ─────────────────────────────────────────────────────────────
   PAYMENT SUCCESSFUL  GET /mentee/payment-successful
───────────────────────────────────────────────────────────── */
export const paymentSuccessful = async (req, res) => {
  const { userId } = req.user;
  const { paymentId, sessionId } = req.query;

  try {
    const payment = await PaymentModel.findOneAndUpdate(
      { _id: paymentId, menteeId: userId },
      { status: "successful", paidAt: new Date() },
      { new: true }
    );
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }
    await SessionModel.findByIdAndUpdate(sessionId, { isPaid: true, paymentId: payment._id });
    return res.status(200).json({ success: true, message: "Payment confirmed. Session booked!", result: { paymentId: payment._id, status: payment.status } });
  } catch (error) {
    return serverError(res, error, "paymentSuccessful");
  }
};


/* ─────────────────────────────────────────────────────────────
   PAYMENT DECLINED  GET /mentee/payment-declined
───────────────────────────────────────────────────────────── */
export const paymentDeclined = async (req, res) => {
  const { userId } = req.user;
  const { paymentId } = req.query;

  try {
    const payment = await PaymentModel.findOneAndUpdate(
      { _id: paymentId, menteeId: userId },
      { status: "declined", declinedAt: new Date() },
      { new: true }
    );
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }
    return res.status(200).json({ success: false, message: "Payment declined. Please try a different method.", result: { paymentId: payment._id, status: payment.status } });
  } catch (error) {
    return serverError(res, error, "paymentDeclined");
  }
};


/* ─────────────────────────────────────────────────────────────
   SETTINGS  GET|PATCH /mentee/settings
───────────────────────────────────────────────────────────── */
export const settings = async (req, res) => {
  const { userId } = req.user;

  try {
    if (req.method === "GET") {
      const profile = await MenteeProfileModel.findOne({ userId })
        .select("name surname email notifications privacySettings");
      if (!profile) {
        return res.status(404).json({ success: false, message: "Profile not found" });
      }
      return res.status(200).json({ success: true, message: "Settings loaded", result: profile });
    }

    if (req.method === "PATCH") {
      const allowed = ["notifications", "privacySettings", "name", "surname"];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const updated = await MenteeProfileModel.findOneAndUpdate(
        { userId }, { $set: updates }, { new: true }
      ).select("name surname notifications privacySettings");
      return res.status(200).json({ success: true, message: "Settings updated", result: updated });
    }
  } catch (error) {
    return serverError(res, error, "settings");
  }
};


/* ─────────────────────────────────────────────────────────────
   MENTEE PROFILE CRUD  (unchanged logic, cleaner queries)
───────────────────────────────────────────────────────────── */
export const createMenteeProfile = async (req, res) => {
  const { name, surname, avatar, cv, linkedin, portfolio, github } = req.body;
  const { userId } = req.user;

  try {
    const { value, error } = createProfileSchema.validate({ name, surname, userId, avatar, cv, linkedin, github, portfolio });
    if (error) {
      return res.status(400).json({ success: false, field: error.details[0].context?.key ?? null, message: error.details[0].message });
    }
    const existing = await MenteeProfileModel.findOne({ userId });
    if (existing) {
      return res.status(409).json({ success: false, message: "Profile already exists. Use the update endpoint." });
    }
    const profile = await MenteeProfileModel.create({ userId, name, surname, avatar, cv, linkedin, portfolio, github });
    return res.status(201).json({ success: true, message: "Profile created", result: profile });
  } catch (error) {
    return serverError(res, error, "createMenteeProfile");
  }
};

export const viewMenteeProfile = async (req, res) => {
  const { userId } = req.user;
  try {
    const profile = await MenteeProfileModel.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "No profile found. Create one first." });
    }
    return res.status(200).json({ success: true, message: `${profile.name}'s profile`, profile });
  } catch (error) {
    return serverError(res, error, "viewMenteeProfile");
  }
};

export const updateMenteeProfile = async (req, res) => {
  const { userId } = req.user;
  const { name, surname, avatar, cv, portfolio, github, linkedin } = req.body;

  try {
    const { value, error } = createProfileSchema.validate({ name, surname, userId, avatar, cv, linkedin, github, portfolio });
    if (error) {
      return res.status(400).json({ success: false, field: error.details[0].context?.key ?? null, message: error.details[0].message });
    }
    const updated = await MenteeProfileModel.findOneAndUpdate(
      { userId },
      { name, surname, avatar, cv, linkedin, portfolio, github },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "No profile to update. Create one first." });
    }
    return res.status(200).json({ success: true, message: "Profile updated", updatedProfile: updated });
  } catch (error) {
    return serverError(res, error, "updateMenteeProfile");
  }
};

export const deleteMenteeprofile = async (req, res) => {
  const { userId } = req.user;
  try {
    const profile = await MenteeProfileModel.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "No profile to delete." });
    }
    await MenteeProfileModel.deleteOne({ userId });
    return res.status(200).json({ success: true, message: "Profile deleted" });
  } catch (error) {
    return serverError(res, error, "deleteMenteeprofile");
  }
};


/* ─────────────────────────────────────────────────────────────
   SESSION CANCEL  POST /mentee/cancel-session
───────────────────────────────────────────────────────────── */
export const cancelSession = async (req, res) => {
  const { userId } = req.user;
  const { sessionId, reason } = req.body;

  try {
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }
    const session = await SessionModel.findOne({ _id: sessionId, menteeId: userId });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (session.status === "cancelled") {
      return res.status(409).json({ success: false, message: "Session already cancelled" });
    }
    session.status       = "cancelled";
    session.cancelReason = reason ?? "";
    session.cancelledAt  = new Date();
    await session.save();
    return res.status(200).json({ success: true, message: "Session cancelled", result: { sessionId: session._id, status: session.status } });
  } catch (error) {
    return serverError(res, error, "cancelSession");
  }
};

export const bookSession = async (req, res) => requestAnInterview(req, res);







//  Before Update
// /* ─────────────────────────────────────────────────────────────
//    CREATE AI INTERVIEW  POST /mentee/ai-home/create

//    Receives exactly the fields from the CreateModal form:
//      Step 1 fields  →  title, description, category, difficulty,
//                         duration (minutes), visibility
//      Step 2 fields  →  questions (array of strings, min 2, max 12)

//    Mirrors CreateModal's FormData type:
//      { title, category, difficulty, duration, visibility,
//        description, questions: string[] }
// ───────────────────────────────────────────────────────────── */
// export const createAIInterview = async (req, res) => {
//   // const { userId } = req.user;
//   const {
//     title,
//     description,
//     category,
//     difficulty,
//     duration,
//     visibility,
//     questions,        // string[]
//   } = req.body;

//   try {
//     // ── Validation mirrors frontend's ok1 + ok2 guards ──
//     if (!title?.trim() || title.trim().length <= 5) {
//       return res.status(400).json({
//         success: false,
//         field: "title",
//         message: "Title must be longer than 5 characters",
//       });
//     }

//     if (!description?.trim() || description.trim().length <= 10) {
//       return res.status(400).json({
//         success: false,
//         field: "description",
//         message: "Description must be longer than 10 characters",
//       });
//     }

//     const VALID_CATEGORIES  = ["technical","behavioural","product","data","marketing","finance","science"];
//     const VALID_DIFFICULTIES = ["beginner","intermediate","advanced"];
//     const VALID_VISIBILITY  = ["public","private"];
    

//     if (!VALID_CATEGORIES.includes(category)) {
//       return res.status(400).json({
//         success: false, field: "category",
//         message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
//       });
//     }

//     if (!VALID_DIFFICULTIES.includes(difficulty)) {
//       return res.status(400).json({
//         success: false, field: "difficulty",
//         message: `Difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}`,
//       });
//     }

//     const parsedDuration = parseInt(duration, 10);
//     if (isNaN(parsedDuration) || parsedDuration < 5 || parsedDuration > 120) {
//       return res.status(400).json({
//         success: false, field: "duration",
//         message: "Duration must be between 5 and 120 minutes",
//       });
//     }

//     // Mirror frontend: questions.filter(q => q.trim().length > 0).length >= 2
//     const cleanQuestions = (questions ?? [])
//       .filter(q => typeof q === "string" && q.trim().length > 0)
//       .map(q => q.trim());

//     if (cleanQuestions.length < 2) {
//       return res.status(400).json({
//         success: false, field: "questions",
//         message: "At least 2 non-empty questions are required",
//       });
//     }

//     if (cleanQuestions.length > 12) {
//       return res.status(400).json({
//         success: false, field: "questions",
//         message: "Maximum 12 questions allowed",
//       });
//     }

//     // ── Create document ──
//     if (VALID_VISIBILITY[0] === "public")  {
//       const interview = await CommunityAIInterviewModel.create({
//         // createdBy:   userId,
//         createdBy:   "userId",
//         title:       title.trim(),
//         description: description.trim(),
//         category,
//         difficulty,
//         duration:    parsedDuration,
//         isPublic:    visibility === "public",
//         questions:   cleanQuestions,
//         attempts:    0,
//         rating:      0,
//         tags:        [],           // tags can be added in a future update endpoint
//       });

//       return res.status(201).json({
//         success: true,
//         message: "Interview published successfully. Students can now practice with it.",
//         result: interview,
//       });

//     } else if (VALID_VISIBILITY[1] === "private")  {
//       const interview = await PrivateAIInterviewModel.create({
//         // createdBy:   userId,
//         createdBy:   "userId",
//         title:       title.trim(),
//         description: description.trim(),
//         category,
//         difficulty,
//         duration:    parsedDuration,
//         isPublic:    visibility === "private",
//         questions:   cleanQuestions,
//         attempts:    0,
//         rating:      0,
//         tags:        [],           // tags can be added in a future update endpoint
//       });

//       return res.status(201).json({
//         success: true,
//         message: "Interview published successfully. Students can now practice with it.",
//         result: interview,
//       });

//     }   

//     // return res.status(201).json({
//     //   success: true,
//     //   message: "Interview published successfully. Students can now practice with it.",
//     //   result: interview,
//     // });

//   } catch (error) {
//     return serverError(res, error, "createAIInterview");
//   }
// };


// /* ─────────────────────────────────────────────────────────────
//    GET AI INTERVIEWS  GET /mentee/ai-home
//    ─────────────────────────────────────────────────────────────
//    Serves both the "community" and "mine" tabs from the
//    AIInterviewHome frontend page, plus the user's session stats.

//    Query params (mirror the frontend filter state exactly):
//    ┌─────────────┬────────────────────────────────────────────────┐
//    │ tab         │ "community" (default) | "mine"                 │
//    │ category    │ "all" (skip) | "technical" | "behavioural" … │
//    │ sort        │ "popular" | "rating" | "newest" | "shortest"  │
//    │ search      │ free-text — matches title, description, tags   │
//    └─────────────┴────────────────────────────────────────────────┘

//    Response shape consumed by the frontend:
//    {
//      success: true,
//      result: {
//        stats:      { totalSessions, completedSessions, completionRate },
//        interviews: AIInterview[]   ← normalised by frontend's normalise()
//      }
//    }
// ─────────────────────────────────────────────────────────────── */
export const getAIInterviews = async (req, res) => {
  // const { userId } = req.user;

  // ── 1. Parse & sanitise query params ──────────────────────
  const tab      = req.query.tab === "mine" ? "mine" : "community";
  const category = req.query.category?.trim().toLowerCase() ?? "";
  const sort     = ["popular","rating","newest","shortest"].includes(req.query.sort)
    ? req.query.sort
    : "popular";
  const search   = req.query.search?.trim() ?? "";

  try {
    // ── 2. User session stats (always included) ────────────
    const [totalSessions, completedCount] = await Promise.all([
      CommunityAIInterviewModel.countDocuments({  }),
      CommunityAIInterviewModel.countDocuments({  status: "completed" }),
    ]);

    const stats = {
      totalSessions,
      completedSessions: completedCount,
      completionRate: totalSessions > 0
        ? Math.round((completedCount / totalSessions) * 100)
        : 0,
    };

    // ── 3. Build interview query ───────────────────────────
    const query = {};

    if (tab === "mine") {
      // "My interviews" tab — interviews created by this user only
      query.createdBy = userId;
    } else {
      // "Community" tab — all public interviews
      query.isPublic = true;
    }

    // Category filter — skip if "all" or missing
    if (category && category !== "all") {
      const VALID = ["technical","behavioural","product","data","marketing","finance","science"];
      if (VALID.includes(category)) query.category = category;
    }

    // Full-text search across title, description, tags
    // Uses the compound text index defined on AIInterviewModel:
    //   { title: "text", description: "text", tags: "text" }
    if (search) {
      if (search.length <= 100) {
        // Use MongoDB text index when available for best performance
        query.$text = { $search: search };
      }
    }

    // ── 4. Sort mapping ────────────────────────────────────
    //  Mirrors the frontend's client-side sort logic exactly,
    //  now done server-side on the full dataset.
    const SORT_MAP = {
      popular:  { attempts: -1 },   // most practiced first
      rating:   { rating: -1 },     // highest rated first
      newest:   { createdAt: -1 },  // most recently created
      shortest: { duration: 1 },    // shortest first
    };
    const sortOpt = SORT_MAP[sort];

    // ── 5. Execute query ───────────────────────────────────
    // Populate createdBy so the frontend's normalise() can build
    // the "by Name Surname" display and the avatar URL fallback.
    const interviews = await CommunityAIInterviewModel
      .find()
      .sort(sortOpt)
      .limit(200)   // hard cap — paginate if catalogue grows large
      // .populate("createdBy", "name surname avatar")
      .lean();     // plain JS objects — faster serialisation

    return res.status(200).json({
      success: true,
      message: tab === "mine"
        ? "Your interviews loaded"
        : "Community interviews loaded",
      result: { stats, interviews },
    });

  } catch (error) {
    console.error("[getAIInterviews]", error);
    const message = error?.message ?? "Failed to load interviews. Please try again.";
    return res.status(500).json({ success: false, message });
  }
};

// /* ─────────────────────────────────────────────────────────────
//    GET SINGLE AI INTERVIEW  GET /mentee/ai-home/:interviewId
//    ─────────────────────────────────────────────────────────────
//    Returns a single interview by its _id so the ai-practice
//    page can bootstrap a session without re-navigating with state.

//    Also used when the user deep-links directly to a practice
//    session (e.g. from a shared URL or notification).
// ─────────────────────────────────────────────────────────────── */
// export const getSingleAIInterview = async (req, res) => {
//   const { interviewId } = req.params;

//   try {
//     const interview = await AIInterviewModel
//       .findById(interviewId)
//       .populate( "name surname avatar")
//       .lean();

//     if (!interview) {
//       return res.status(404).json({
//         success: false,
//         message: "Interview not found. It may have been deleted or made private.",
//       });
//     }

//     // Enforce visibility: private interviews can only be accessed by
//     // the creator themselves
//     // const { userId } = req.user;
//     const creatorId  = interview.createdBy?._id?.toString() ;

//     if (!interview.isPublic && creatorId !== userId.toString()) {
//       return res.status(403).json({
//         success: false,
//         message: "This interview is private.",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Interview loaded",
//       result: interview,
//     });

//   } catch (error) {
//     console.error("[getSingleAIInterview]", error);
//     return res.status(500).json({
//       success: false,
//       message: error?.message ?? "Failed to load interview.",
//     });
//   }
// };








// After Update


/* ─────────────────────────────────────────────────────────────
   CREATE AI INTERVIEW   POST /mentee/ai-home/create
   ─────────────────────────────────────────────────────────────
   Body fields — identical to the frontend FormData type:
     title        string
     description  string
     category     string   — one of VALID_CATEGORIES
     difficulty   string   — one of VALID_DIFFICULTIES
     duration     number   — parsed from string, 5-120
     visibility   string   — "public" | "private"
     questions    string[] — filtered for non-empty, min 2 max 12

   Routing rule (the core requirement):
     visibility === "public"  → CommunityAIInterviewModel
     visibility === "private" → PrivateAIInterviewModel
     (enforced by this function — NOT by checking VALID_VISIBILITY[0])
─────────────────────────────────────────────────────────────── */
export const createAIInterview = async (req, res) => {
  // const { userId } = req.user;   real ObjectId string from JWT middleware

  // Safe destructure with defaults — prevents crashes when req.body
  // is undefined or a field is missing
  const {
    title        = "",
    description  = "",
    category     = "",
    difficulty   = "",
    duration     = "",
    visibility   = "public",
    questions    = [],
  } = req.body ?? {};

  try {
    /* ── Validation — mirrors frontend ok1 + ok2 guards ── */
    if (!title.trim() || title.trim().length <= 5) {
      return res.status(400).json({
        success: false, field: "title",
        message: "Title must be longer than 5 characters",
      });
    }

    if (!description.trim() || description.trim().length <= 10) {
      return res.status(400).json({
        success: false, field: "description",
        message: "Description must be longer than 10 characters",
      });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false, field: "category",
        message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
      });
    }

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        success: false, field: "difficulty",
        message: `Difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}`,
      });
    }

    if (!["public","private"].includes(visibility)) {
      return res.status(400).json({
        success: false, field: "visibility",
        message: 'Visibility must be "public" or "private"',
      });
    }

    const parsedDuration = parseInt(duration, 10);
    if (isNaN(parsedDuration) || parsedDuration < 5 || parsedDuration > 120) {
      return res.status(400).json({
        success: false, field: "duration",
        message: "Duration must be between 5 and 120 minutes",
      });
    }

    // Mirror frontend: questions.filter(q => q.trim().length > 0)
    const cleanQuestions = Array.isArray(questions)
      ? questions
          .filter(q => typeof q === "string" && q.trim().length > 0)
          .map(q => q.trim())
      : [];

    if (cleanQuestions.length < 2) {
      return res.status(400).json({
        success: false, field: "questions",
        message: "At least 2 non-empty questions are required",
      });
    }

    if (cleanQuestions.length > 12) {
      return res.status(400).json({
        success: false, field: "questions",
        message: "Maximum 12 questions allowed",
      });
    }

    /* ── Choose the correct collection based on visibility ── */
    const Model    = visibility === "public" ? CommunityAIInterviewModel : PrivateAIInterviewModel;
    const isPublic = visibility === "public";

    const interview = await Model.create({
      createdBy:   "userId",           // real userId from JWT — never hardcoded
      title:       title.trim(),
      description: description.trim(),
      category,
      difficulty,
      duration:    parsedDuration,
      isPublic,                      // true in Community, false in Private
      questions:   cleanQuestions,
      attempts:    0,
      rating:      0,
      tags:        [],
    });

    return res.status(201).json({
      success: true,
      message: isPublic
        ? "Interview published to the community. Students can now practice with it."
        : "Interview saved privately. Only you can see and practice with it.",
      result: interview,
    });

  } catch (error) {
    return serverError(res, error, "createAIInterview");
  }
};



/* ─────────────────────────────────────────────────────────────
   GET SINGLE AI INTERVIEW   GET /mentee/ai-home/:interviewId
   ─────────────────────────────────────────────────────────────
   Checks CommunityAIInterviewModel first (most common case).
   Falls back to PrivateAIInterviewModel if not found there.
   Enforces ownership: only the creator can access private ones.
─────────────────────────────────────────────────────────────── */
// export const getSingleAIInterview = async (req, res) => {
//   // const { userId }      = req.user;
//   // const { interviewId } = req.params;

//   // Validate ObjectId format early — returns a clean 400 instead
//   // of a Mongoose CastError 500
//   if (!mongoose.Types.ObjectId.isValid(interviewId)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid interview ID format",
//     });
//   }

//   try {
//     // 1. Try community collection first (most interviews live here)
//     let interview = await CommunityAIInterviewModel
//       .findById()
//       .populate("createdBy", "name surname avatar")
//       .lean();

//     let source = "community";

//     // 2. Not found in community — check private collection
//     if (!interview) {
//       interview = await PrivateAIInterviewModel
//         .findById(interviewId)
//         .populate("createdBy", "name surname avatar")
//         .lean();
//       source = "private";
//     }

//     // 3. Not found in either collection
//     if (!interview) {
//       return res.status(404).json({
//         success: false,
//         message: "Interview not found. It may have been deleted.",
//       });
//     }

//     // 4. Enforce ownership on private interviews
//     if (source === "private") {
//       const creatorId =
//         interview.createdBy?._id?.toString() ??
//         interview.createdBy?.toString() ??
//         "";

//       if (creatorId !== userId.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: "This interview is private and does not belong to you.",
//         });
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Interview loaded",
//       result: { ...interview, source },  // include source so frontend knows which model it came from
//     });

//   } catch (error) {
//     return serverError(res, error, "getSingleAIInterview");
//   }
// };


// export const getSingleAIInterview = async (req, res) => {
//   // ✅ Bug 1 fixed — both destructured correctly from req
//   // const { userId }      = req.user;
//   // const { userId }      = "userId";
//   const { interviewId,userId } = req.query;

//   // Validate ObjectId format early — returns a clean 400 instead
//   // of a Mongoose CastError 500
//   if (!mongoose.Types.ObjectId.isValid(interviewId)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid interview ID format",
//     });
//   }

//   try {
//     // 1. Try community collection first (most interviews live here)
//     // ✅ Bug 2 fixed — interviewId now passed to findById()
//     let interview = await CommunityAIInterviewModel
//       .findById(interviewId)
//       .populate("createdBy", "name surname avatar")
//       .lean();

//     let source = "community";

//     // 2. Not found in community — check private collection
//     if (!interview) {
//       interview = await PrivateAIInterviewModel
//         .findById(interviewId)
//         .populate("createdBy", "name surname avatar")
//         .lean();
//       source = "private";
//     }

//     // 3. Not found in either collection
//     if (!interview) {
//       return res.status(404).json({
//         success: false,
//         message: "Interview not found. It may have been deleted.",
//       });
//     }

//     // 4. Enforce ownership on private interviews
//     if (source === "private") {
//       const creatorId =
//         interview.createdBy?._id?.toString() ??
//         interview.createdBy?.toString() ??
//         "";

//       // ✅ Bug 1 fix carries through — userId is now defined here
//       if (creatorId !== userId.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: "This interview is private and does not belong to you.",
//         });
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Interview loaded",
//       result: { ...interview, source },
//     });

//   } catch (error) {
//     // ✅ Bug 3 fixed — serverError was undefined; inline handler used instead
//     console.error("[getSingleAIInterview]", error);
//     return res.status(500).json({
//       success: false,
//       message: error?.message ?? "Internal server error. Please try again.",
//     });
//   }
// };


export const  getSingleAIInterview = async (req, res) => {
  const { _id } = req.query;
  try {
    const interview = await CommunityAIInterviewModel.findById(_id);
    if (!interview) {
      return res.status(404).json({ success: false, message: "Mentor profile unavailable" });
    }
    return res.status(200).json({
      success: true,
      message: `${interview._id} ${interview.title}'s profile`,
      result: interview,
    });
  } catch (error) {
    return serverError(res, error, " getSingleAIInterview");
  }
};




/* ─────────────────────────────────────────────────────────────
   GET COMMUNITY AI INTERVIEWS   GET /mentee/community-interviews
   ─────────────────────────────────────────────────────────────
   Reads from CommunityAIInterviewModel only.
   Shown in the "Community" tab on the frontend.
   Accessible to ALL logged-in mentees.

   FIX: Removed .populate("createdBy") — createdBy is stored as
   a plain String in the schema (not an ObjectId), so Mongoose
   was trying to look up a "User" model that doesn't exist in
   this service, causing MissingSchemaError.
   The raw userId string is returned instead; the frontend's
   normalise() already handles this case gracefully.

   Query params:
     category → "all" | one of VALID_CATEGORIES
     sort     → "popular" | "rating" | "newest" | "shortest"
     search   → free text matched against title, description, tags
─────────────────────────────────────────────────────────────── */
export const getCommunityAIInterviews = async (req, res) => {
  const category = (req.query.category ?? "").toString().trim().toLowerCase();
  const sort     = SORT_MAP[req.query.sort] ? req.query.sort : "popular";
  const search   = (req.query.search  ?? "").toString().trim();

  try {
    // All community interviews are public by definition
    const query = { isPublic: true };

    if (category && category !== "all" && VALID_CATEGORIES.includes(category)) {
      query.category = category;
    }

    // Regex search — avoids the $text index dependency on "User" model
    if (search) {
      const rx = { $regex: search, $options: "i" };
      query.$or = [
        { title:       rx },
        { description: rx },
        { tags:        rx },
      ];
    }

    const [interviews, total] = await Promise.all([
      CommunityAIInterviewModel
        .find(query)
        .sort(SORT_MAP[sort])
        .limit(200)
        // ✅ NO .populate() — createdBy is a String, not an ObjectId ref
        .lean(),
      CommunityAIInterviewModel.countDocuments({ isPublic: true }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Community interviews loaded",
      result: {
        stats: {
          totalCommunityInterviews: total,
          returned: interviews.length,
        },
        interviews,
      },
    });

  } catch (error) {
    return serverError(res, error, "getCommunityAIInterviews");
  }
};


/* ─────────────────────────────────────────────────────────────
   GET MY AI INTERVIEWS   GET /mentee/my-interviews
   ─────────────────────────────────────────────────────────────
   Reads from BOTH models filtered by the logged-in user's id.
   Combined and sorted before returning so the "My interviews"
   tab shows everything the user ever created.

   FIX: Same as above — removed .populate("createdBy") from
   both model queries. Since createdBy is stored as a String
   (the userId from JWT), it matches req.user.userId directly
   and no User model lookup is needed.

   Query params:
     category → filter applied to both collections
     sort     → applied after merging both lists
     search   → text filter applied to both collections
─────────────────────────────────────────────────────────────── */
export const getMyAIInterviews = async (req, res) => {
  // const { userId } = req.user;

  const category = (req.query.category ?? "").toString().trim().toLowerCase();
  const sort     = SORT_MAP[req.query.sort] ? req.query.sort : "newest";
  const search   = (req.query.search  ?? "").toString().trim();

  try {
    // createdBy is stored as a plain String — match directly against userId
    const query = { createdBy: "userId" };

    if (category && category !== "all" && VALID_CATEGORIES.includes(category)) {
      query.category = category;
    }

    if (search) {
      const rx = { $regex: search, $options: "i" };
      query.$or = [
        { title:       rx },
        { description: rx },
        { tags:        rx },
      ];
    }

    // Query both collections in parallel — ✅ NO .populate()
    const [privateInterviews, publicInterviews] = await Promise.all([
      PrivateAIInterviewModel.find(query).lean(),
      CommunityAIInterviewModel.find(query).lean(),
    ]);

    // Tag each document so the frontend can distinguish source collection
    const tagged = [
      ...privateInterviews.map(iv => ({ ...iv, isPublic: false })),
      ...publicInterviews.map(iv => ({ ...iv, isPublic: true  })),
    ];

    // Sort the merged list
    const sorted = tagged.sort((a, b) => {
      if (sort === "popular")  return b.attempts  - a.attempts;
      if (sort === "rating")   return b.rating    - a.rating;
      if (sort === "shortest") return a.duration  - b.duration;
      // "newest" — default
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return res.status(200).json({
      success: true,
      message: "Your interviews loaded",
      result: {
        stats: {
          total:   sorted.length,
          public:  publicInterviews.length,
          private: privateInterviews.length,
        },
        interviews: sorted,
      },
    });

  } catch (error) {
    return serverError(res, error, "getMyAIInterviews");
  }
};
