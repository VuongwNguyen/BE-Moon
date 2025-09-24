class successfullyResponse {
    constructor({ meta, message, statusResponse = true, statusCode = 200 }) {
      this.meta = meta;
      this.message = message;
      this.statusResponse = statusResponse;
      this.statusCode = statusCode;
    }
    json(res) {
      res.status(this.statusCode).json({
        statusResponse: this.statusResponse,
        message: this.message,
        statusCode: this.statusCode,
        meta: this.meta,
      });
    }
  }
  
  class errorResponse extends Error {
    constructor({ message = "", statusResponse = false, statusCode = 500 }) {
      super(message);
      this.statusResponse = statusResponse;
      this.statusCode = statusCode;
    }
  }
  
  module.exports = {
    successfullyResponse,
    errorResponse,
  };
  