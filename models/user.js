const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  upiId:{
    type:String,
    required:true,
    unique:true
  },
  phoneno:{
    type:String,
    required:true,
    unique:true,
    // match: /^[0-9]{10}$/
  },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Friend' }],
  bills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }]
});

userSchema.plugin(passportLocalMongoose);  

module.exports = mongoose.model('User', userSchema);
