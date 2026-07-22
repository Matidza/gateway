import dotenv from 'dotenv'

dotenv.config();

export function errorHandler(err, req, res, next) {
    console.log("\n Error occured: ", err);
    res.status(err.statusCode || 500 ).json(({
        success: false,
        message: err.message || "Somethig went wrong on the server",
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined
    }))
}