const mongoose = require('mongoose');

const validateObjectId = (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID inválido fornecido na URL' });
  }
  next();
};

module.exports = validateObjectId;
