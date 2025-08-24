/**
 * Custom Error Class
 * Extends the built-in Error class to include a status code and optional data.
 */
class CustomError extends Error {
  statusCode: number;
  message: string;
  data: { [key: string]: any };

  /**
   * Constructor for the CustomError class.
   *
   * @param {number} statusCode - The HTTP status code.
   * @param {string} message - The error message.
   * @param {{ [key: string]: any }} data - Optional data associated with the error.
   */
  constructor(
    statusCode: number,
    message: string,
    data: { [key: string]: any } = {}
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static security(
    statusCode: number,
    message: string,
    data: { [key: string]: any } = {}
  ) {
    return new CustomError(statusCode, message, data);
  }
}

export default CustomError;
