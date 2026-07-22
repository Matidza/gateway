export const paginate = (model) => {
  return async (req, res, next) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.max(parseInt(req.query.limit) || 10, 1);
      const skip = (page - 1) * limit;

      const totalDocuments = await model.countDocuments();

      const results = await model
        .find()
        .skip(skip)
        .limit(limit);

      res.pagination = {
        data: results,
        meta: {
          total: totalDocuments,
          page,
          limit,
          totalPages: Math.ceil(totalDocuments / limit),
          hasNextPage: page * limit < totalDocuments,
          hasPrevPage: page > 1
        }
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};