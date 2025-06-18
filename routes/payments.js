// routes/payments.js
const express = require('express');
const router = express.Router();

// For now, ek simple route add kar de
router.get('/', (req, res) => {
  res.send('Payments route is under construction');
});

module.exports = router;
