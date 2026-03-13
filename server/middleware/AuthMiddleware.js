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

export const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt; // Access the cookie you set in signup/login

  if (!token) return res.status(401).send("You are not authenticated!");

  jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
    if (err) return res.status(403).send("Token is not valid!");

    req.userId = payload.userId; // Extract the ID we embedded in the token
    next();
  });
};
