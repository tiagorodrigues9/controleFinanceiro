const { logger, logApiError } = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado`, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') {
    super(message, 409);
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log do erro
  logApiError(error, req, {
    errorType: error.constructor.name,
    isOperational: error.isOperational
  });

  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const message = 'Dados inválidos';
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    error = new ValidationError(message, errors);
  }

  // Erro de duplicação do Mongoose (MongoDB)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} já existe`;
    error = new ConflictError(message);
  }

  // Erro de Cast do Mongoose (ID inválido)
  if (err.name === 'CastError') {
    const message = 'Recurso não encontrado';
    error = new NotFoundError(message);
  }

  // Erro de JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token inválido';
    error = new UnauthorizedError(message);
  }

  // Erro de JWT expirado
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = new UnauthorizedError(message);
  }

  // Erro de sintaxe do JWT
  if (err.name === 'NotBeforeError') {
    const message = 'Token não ativado';
    error = new UnauthorizedError(message);
  }

  // Resposta de erro
  const response = {
    success: false,
    message: error.message || 'Erro interno do servidor'
  };

  // Adicionar detalhes em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    response.error = {
      name: error.name,
      stack: error.stack,
      isOperational: error.isOperational
    };
    
    if (error.errors) {
      response.errors = error.errors;
    }
  }

  // Adicionar código de erro se existir
  if (error.statusCode) {
    response.code = error.statusCode;
  }

  res.status(error.statusCode || 500).json(response);
};

// Middleware para capturar erros assíncronos
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  errorHandler,
  asyncHandler
};
