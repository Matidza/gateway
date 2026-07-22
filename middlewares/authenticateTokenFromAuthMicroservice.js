import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
dotenv.config();

//const JWT_SECRET = process.env.SECRET_ACCESS_TOKEN // same secret as Auth Service
/*** 
export function authenticateToken(req, res, next) {
    // ✅ Get token from cookie, not header
    const token = req.cookies.accessToken;

    if (!token) {
        return res.status(403).json({
            success: false,
            message: "Unauthorized: must be looged In to acess!"
        });
    }

    try {
        const jwtVerified = jwt.verify(token, process.env.SECRET_ACCESS_TOKEN);
        req.user = jwtVerified;
        next();
    } catch (err) {
        console.error("JWT Error:", err.message);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}
export default authenticateToken;

   */

export function authenticateToken(request, response, next) {
    const token = request.cookies['accessToken'] || request.headers['authorization']?.split(' ')[1];
    if (!token) {
        return response.status(401)
        .json({
            message: 'Authorization required',
            success: false
        })
    }
    jwt.verify(token, process.env.SECRET_ACCESS_TOKEN, (err, user) => {
        if (err) {
            return response.status(403)
            .json({
                message: "Invalid or expired accessToken"
            });
        }
        request.user = user;
        next();
    });
}
export default authenticateToken;