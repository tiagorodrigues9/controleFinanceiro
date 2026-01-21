const Joi = require('joi');

// Schema para validação dos parâmetros do dashboard
const dashboardSchema = Joi.object({
  mes: Joi.number().integer().min(1).max(12).optional(),
  ano: Joi.number().integer().min(2020).max(2030).optional()
});

// Middleware de validação
const validateDashboard = (req, res, next) => {
  const { error } = dashboardSchema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      message: 'Parâmetros inválidos',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  next();
};

module.exports = {
  validateDashboard,
  dashboardSchema
};
