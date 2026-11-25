const { z } = require('zod');

const paginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
const meta = (page, limit, total) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });

module.exports = { paginationSchema, meta };
