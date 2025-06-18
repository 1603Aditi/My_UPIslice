// models/friend.js
const mongoose = require("mongoose");

const friendSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: String,
  email: String, 
  
});

const Friend = mongoose.model("Friend", friendSchema);
module.exports = Friend;
