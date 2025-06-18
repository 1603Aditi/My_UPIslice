const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  imageUrl: String,
  totalAmount: Number,
  createdAt: { type: Date, default: Date.now },
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BillItem' }],
  participants: [
    {
      friendId: { type: mongoose.Schema.Types.ObjectId, ref: 'Friend' },
      shareAmount: Number,
      isPaid: { type: Boolean, default: false },
      paymentDate: Date
    }
  ]
});

module.exports = mongoose.model('Bill', billSchema);
