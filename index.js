const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("morgan");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const path = require("path");
const connectToDatabase = require("./connection");

const app = express();
const port = 3030;

// connect to database
connectToDatabase.connect();
// routes
app.use(cors());
app.use(helmet());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", require("./routes"));

// err handle
app.use(function (req, res, next) {
  next(createError(404));
});

app.use((err, req, res, next) => {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  if (err.status === 404)
    return res.status(404).json({
      status: false,
      message: "Not found",
      statusCode: 404,
    });

  // Return the error
  res.status(err.statusCode || 500).json({
    statusResponse: err.statusResponse || false,
    message: err.message,
    statusCode: err.statusCode || 500,
  });

  console.log("lỗi ", err.stack);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
