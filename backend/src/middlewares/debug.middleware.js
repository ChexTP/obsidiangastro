export const requestDebugLogger = (req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    if (process.env.NODE_ENV !== "test") {
      console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
    }
  });
  next();
};
