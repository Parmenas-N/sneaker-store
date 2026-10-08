module.exports = (req, res) => {
  res.status(200).json({
    message: "Sole Vault API is alive",
    timestamp: new Date().toISOString(),
  });
};