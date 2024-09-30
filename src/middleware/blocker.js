export default (req, res) => {
  res.status(401).json({ message: "Permissão necessária." });
}