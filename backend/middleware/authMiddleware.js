const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header (Looks like: "Bearer eyyy...")
      token = req.headers.authorization.split(" ")[1];

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Add the user ID and role to the request so the controller can use it
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };
