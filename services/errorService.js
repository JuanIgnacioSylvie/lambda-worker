function sendErrorResponse(res, error, message) {
  const details = error?.response?.data || error.message || 'Unknown error';
  console.error(`${message}:`, details);
  res.status(500).json({ error: message, details });
}

module.exports = {
  sendErrorResponse,
};
