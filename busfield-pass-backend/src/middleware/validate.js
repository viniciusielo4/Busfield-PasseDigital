const { ZodError } = require('zod');
const { AppError } = require('../errors');

// Valida params, query, body e headers com schemas do zod; resultado em req.valid.
module.exports = function validate(schemas) {
  return (req, res, next) => {
    try {
      req.valid = {};
      for (const part of ['params', 'query', 'body', 'headers']) {
        if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        return next(new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos.', details));
      }
      next(err);
    }
  };
};
