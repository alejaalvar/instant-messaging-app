/**
 * @file AuthMiddleware.js
 * @author Alejandro Alvarado
 * @brief JWT authentication middleware.
 *
 * @description
 * Create the middleware that verifies the JWT token
 * from the user. If the JWT is expired, it returns an
 * error. If it is not there, it returns an error. If
 * verification passes, control is passed to the next
 * function.
 */

import jwt from "jsonwebtoken";

/**
 * Express middleware that enforces JWT authentication on protected routes.
 *
 * Reads the `jwt` cookie set during login/signup, verifies the signature
 * against `JWT_KEY`, and attaches the decoded `userId` to `req` so that
 * downstream handlers can identify the caller without re-reading the token.
 * Rejects unauthenticated requests with 401 and invalid/expired tokens with 403.
 *
 * @param {import('express').Request}      req  - Express request.
 * @param {import('express').Response}     res  - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {void}
 */
export const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt; // Access the cookie you set in signup/login

  if (!token) return res.status(401).send("You are not authenticated!");

  jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
    if (err) return res.status(403).send("Token is not valid!");

    req.userId = payload.userId; // Extract the ID we embedded in the token
    next();
  });
};
