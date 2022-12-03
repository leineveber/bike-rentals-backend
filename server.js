const JWT_SECRET_KEY =
  require("json-server-auth/dist/constants").JWT_SECRET_KEY;
const auth = require("json-server-auth");
const jsonServer = require("json-server");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const nanoid = require("nanoid").nanoid;
const bodyParser = require("body-parser");

const router = jsonServer.router("db.json");

const server = express();
server.db = router.db;

server.use(
  cors({
    origin: "*",
  })
);

server.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

server.use(bodyParser.json());

server.get("/me", auth, (req, res, next) => {
  const token = req.header("Authorization")
    ? req.header("Authorization").replace("Bearer ", "")
    : null;
  if (token) {
    try {
      const data = jwt.verify(token, JWT_SECRET_KEY);

      const { db } = req.app;

      const user = db.get("users").find({ email: data.email }).value();

      res.json(user);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        res
          .status(401)
          .json("Your token has expired, please log in again to continue");
      } else {
        res.status(400).json("Something went wrong");
      }
    }
  } else {
    res.status(400).json("User not authorized");
  }
});

server.post("/rent", (req, res) => {
  const token = req.header("Authorization")
    ? req.header("Authorization").replace("Bearer ", "")
    : null;

  if (token) {
    try {
      const { bikeID, duration } = req.body;

      const data = jwt.verify(token, JWT_SECRET_KEY);

      const { db } = req.app;

      const userRecord = db.get("users").find({ email: data.email });
      const user = userRecord.value();

      const bikeRecord = db.get("bikes").find({ id: bikeID });
      const bike = bikeRecord.value();

      if (bikeID && duration && user && bike) {
        const dateFrom = Date.now();

        const rideID = nanoid();

        const newUserRent = {
          id: rideID,
          bikeID,
          dateFrom,
        };

        const newUser = {
          ...user,
          history: user?.history?.length
            ? [...user.history, newUserRent]
            : [newUserRent],
        };

        const newBikeRent = {
          id: rideID,
          userID: user.id,
          dateFrom,
        };

        const newBike = {
          ...bike,
          history: bike?.history?.length
            ? [...bike.history, newBikeRent]
            : [newBikeRent],
        };

        if (typeof duration === "number") {
          const dateTo = dateFrom + duration;

          newUserRent.dateTo = dateTo;
          newBikeRent.dateTo = dateTo;
        }

        userRecord.assign(newUser).write();
        bikeRecord.assign(newBike).write();

        res.json(newUserRent);
      } else {
        res.status(400).json("Something went wrong");
      }
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        res
          .status(401)
          .json("Your token has expired, please log in again to continue");
      } else {
        res.status(400).json("Something went wrong");
      }
    }
  } else {
    res.status(400).json("User not authorized");
  }
});

server.post("/rate", (req, res) => {
  const token = req.header("Authorization")
    ? req.header("Authorization").replace("Bearer ", "")
    : null;

  if (token) {
    try {
      const { bikeID, rating } = req.body;

      const data = jwt.verify(token, JWT_SECRET_KEY);

      const { db } = req.app;

      const userRecord = db.get("users").find({ email: data.email });
      const user = userRecord.value();

      const bikeRecord = db.get("bikes").find({ id: bikeID });
      const bike = bikeRecord.value();

      const newRating = {
        userID: user.id,
        rating,
      };

      const newBike = { ...bike, ratings: [...bike.ratings, newRating] };

      bikeRecord.assign(newBike).write();

      res.json(newBike);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        res
          .status(401)
          .json("Your token has expired, please log in again to continue");
      } else {
        res.status(400).json("Something went wrong");
      }
    }
  } else {
    res.status(400).json("User not authorized");
  }
});

server.post("/cancel", (req, res) => {
  const token = req.header("Authorization")
    ? req.header("Authorization").replace("Bearer ", "")
    : null;

  if (token) {
    try {
      const now = Date.now();

      const { rideID } = req.body;

      const data = jwt.verify(token, JWT_SECRET_KEY);

      const { db } = req.app;

      const userRecord = db.get("users").find({ email: data.email });
      const user = userRecord.value();

      const newUser = {
        ...user,
        history: user?.history
          ? user.history.map((rentedBike) =>
              rentedBike.id === rideID
                ? { ...rentedBike, dateTo: now }
                : rentedBike
            )
          : [],
      };

      const bikesRecord = db.get("bikes");
      const bikes = bikesRecord.value();

      const newBikes = bikes.map((bike) => ({
        ...bike,
        history: bike.history
          ? bike.history.map((historyItem) =>
              historyItem.id === rideID
                ? { ...historyItem, dateTo: now }
                : historyItem
            )
          : [],
      }));

      userRecord.assign(newUser).write();
      bikesRecord.assign(newBikes).write();

      res.json(newUser.history.find((rentedBike) => rentedBike.id === rideID));
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        res
          .status(401)
          .json("Your token has expired, please log in again to continue");
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
