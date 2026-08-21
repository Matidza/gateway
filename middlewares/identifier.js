import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
dotenv.config();

export function authenticateToken(request, response, next) {
    const token = request.cookies['refreshToken'] || request.headers['authorization']?.split(' ')[1];
    if (!token) {
        return response.status(401)
        .json({
            message: 'Authorization/Login is required',
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
        console.log(user)
        next();
    });
}
export default authenticateToken;
