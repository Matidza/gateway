import mongoose from "mongoose";

export const withTransaction = (handler) => {
  return async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Attach session to request
      req.mongoSession = session;

      await handler(req, res, next);

      // If response already sent, commit
      if (!res.headersSent) {
        await session.commitTransaction();
      }
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  };
};