const JWT_SECRET_KEY =
  require("json-server-auth/dist/constants").JWT_SECRET_KEY;
const auth = require("json-server-auth");
const jsonServer = require("json-server");
const express = require("express");
const jwt = require("jsonwebtoken");

const router = jsonServer.router("db.json");

const server = express();
server.db = router.db;

server.get("/me", auth, (req, res, next) => {
  const token = req.header("Authorization")
    ? req.header("Authorization").replace("Bearer ", "")
    : null;
  if (token) {
    try {
      const data = jwt.verify(token, JWT_SECRET_KEY);

      const { db } = req.app;
      let user = db.get("users").find({ email: data.email }).value();
      res.json(user);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json("Your token has expired");
      } else {
        res.status(400).json("Something went wrong");
      }
    }
  } else {
    res.status(400).json("User not authorized");
  }
});

server.use(auth);
server.use(router);
server.listen(4444);
