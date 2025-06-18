const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
  name: String,
  amount: Number,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Friend' }
});

module.exports = mongoose.model('BillItem', billItemSchema);
