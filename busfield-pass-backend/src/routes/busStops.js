const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const stops = require('../services/stopService');

const router = Router();

router.get('/nearby', validate({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().int().min(50).max(5000).default(1000), // metros
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
}), async (req, res) => {
  const { lat, lng, radius, limit } = req.valid.query;
  res.json({ data: await stops.nearby({ lat, lng, radiusMeters: radius, limit }) });
});

router.get('/:id', validate({ params: z.object({ id: z.string().uuid() }) }), async (req, res) => {
  res.json({ busStop: await stops.getById(req.valid.params.id) });
});

module.exports = router;
