export const ok = (res, message, data = {}, status = 200) => {
  return res.status(status).json({ success: true, message, data });
};

export const fail = (res, message, status = 400, errors = []) => {
  return res.status(status).json({ success: false, message, errors });
};

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
