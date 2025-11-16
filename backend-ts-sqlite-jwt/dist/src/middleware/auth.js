"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRoles = requireRoles;
const jwt_1 = require("../utils/jwt");
function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No autorizado' });
    }
    const token = header.split(' ')[1];
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        req.user = { id: decoded.sub, role: decoded.role };
        return next();
    }
    catch {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}
function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ message: 'No autorizado' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Prohibido' });
        }
        next();
    };
}
