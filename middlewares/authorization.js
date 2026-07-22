export const authorize = (...allowedRoles) => 
    (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                meassage: "Unauthorized"
            })
        }
        if (!allowedRoles.includes(req.user.user_type)) {
            return res.status(403).json({
                message: "Forbiden: Only mentors/professionals are allowed!"
            })
        }
        next()
    }