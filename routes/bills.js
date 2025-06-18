const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const Friend = require('../models/friend');
const sharp = require('sharp');
const Bill = require('../models/bill');
const BillItem = require('../models/billitem');
const { isLoggedIn } = require('../middleware'); 
const nodemailer = require('nodemailer');
require('dotenv').config();



const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

//route to get the form to upload bill
router.get("/", async (req, res) => {
  const friends = await Friend.find({ userId: req.user._id });
  res.render("upload",{friends});
});

//route to upload bill

router.post('/new', isLoggedIn, upload.single('billImage'), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const processedImagePath = 'uploads/processed-' + req.file.filename;
    let splitType = req.body['split-style'];

    await sharp(req.file.path).resize(1024).toFile(processedImagePath);

    const result = await Tesseract.recognize(processedImagePath, 'eng');
    const extractedText = result.data.text;

    // Form se selected friends ke IDs
    let selectedFriendIds = req.body.sharedWith;

    // Agar sirf ek friend select hua toh wo string ho sakta hai, usko array me convert karo
    if (!Array.isArray(selectedFriendIds)) {
      selectedFriendIds = [selectedFriendIds];
    }

    // DB se sirf selected friends fetch karo (aur userId check bhi karo)
    const selectedFriends = await Friend.find({
      _id: { $in: selectedFriendIds },
      userId: req.user._id
    });

    // Full list me selected friends + user add karo
    const fullList = [
      ...selectedFriends, 
      { _id: req.user._id, name: req.user.username, email: req.user.email }
    ];

    // OCR se items extract karo
    const lines = extractedText.split('\n');
    const itemLines = lines.filter(line => /\D+\s+(\d{1,4}(?:\.\d{1,2})?)$/.test(line.trim()));

    const items = itemLines.map(line => {
      const parts = line.trim().split(/\s{2,}|\s(?=\d)/);
      const name = parts[0].trim();
      const price = parseFloat(parts[1]);
      return { name, price };
    });

    // Render result page with filtered friends
    res.render('ocr-result', {
      extractedText,
      items,
      fullList,
      splitType,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("OCR failed");
  }
});


router.post('/confirm', isLoggedIn, async (req, res) => {
  const { itemNames, itemPrices, assignedTo, splitType } = req.body;

  const bill = new Bill({
    ownerId: req.user._id,
    totalAmount: 0,
    participants: [],
    items: []
  });

  let friendShareMap = {};

  if (splitType === "equal") {
  // 50-50 splitting 
  let total = 0;

  for (let i = 0; i < itemNames.length; i++) {
    const name = itemNames[i];
    const price = parseFloat(itemPrices[i]);
    total += price;

    const billItem = new BillItem({
      billId: bill._id,
      name,
      amount: price,
      assignedTo: null
    });

    await billItem.save();
    bill.items.push(billItem._id);
  }

  const allFriendIds = [];

for (let key in assignedTo) {
  const ids = Array.isArray(assignedTo[key]) ? assignedTo[key] : [assignedTo[key]];
  allFriendIds.push(...ids);
}

//  owner in split
const uniqueFriendIds = [...new Set([...allFriendIds, req.user._id.toString()])];

const equalShare = total / uniqueFriendIds.length;

for (const fid of uniqueFriendIds) {
  friendShareMap[fid] = equalShare;
}

  bill.totalAmount = total;
}
 else {
    //  Dutch splitting
    for (let i = 0; i < itemNames.length; i++) {
      const name = itemNames[i];
      const price = parseFloat(itemPrices[i]);
      const assignedIds = Array.isArray(assignedTo[i]) ? assignedTo[i] : [assignedTo[i]];

      const share = price / assignedIds.length;

      assignedIds.forEach(fid => {
        friendShareMap[fid] = (friendShareMap[fid] || 0) + share;
      });

      const billItem = new BillItem({
        billId: bill._id,
        name,
        amount: price,
        assignedTo: null
      });

      await billItem.save();
      bill.items.push(billItem._id);
      bill.totalAmount += price;
    }
  }

  for (const fid in friendShareMap) {
    bill.participants.push({
      friendId: fid,
      shareAmount: friendShareMap[fid]
    });
  }

 await bill.save();
console.log("Redirecting to summary of bill:", bill._id.toString());
res.redirect(`/bills/summary/${bill._id.toString()}`);



});


router.get('/summary/:id', isLoggedIn, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('participants.friendId')
      .populate('items');
    if (!bill) {
      console.log("Bill not found for id:", req.params.id);  // 👈 Add this
      return res.status(404).send('Bill not found');
    }
    res.render('bill-summary', { bill });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



router.post('/send-mails/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('participants.friendId');

    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    for (let p of bill.participants) {
      if (p.friendId && p.shareAmount > 0) {
        try {
  await transporter.sendMail({
  from: `"UPIslice" <${process.env.EMAIL_USER}>`,
  to: p.friendId.email,
  subject: `Payment Reminder | Bill #${bill._id}`,
  text: `Hey ${p.friendId.name},

Hope you're doing great!! Just a friendly reminder that you recently enjoyed a meal with your friend ${req.user ? req.user.username : 'your friend'}.

As per the bill split, you owe: ₹${p.shareAmount.toFixed(2)}.

You can pay using the following UPI ID: ${req.user ? req.user.upiId : 'Not available'}

Please try to complete the payment at your earliest convenience.

Thanks a lot!
Dosti Yaari Pakki, Paisa Apna Apna :)

— Team UPIslice`
});

        } catch (error) {
          console.error(`Failed to send mail to ${p.friendId.email}:`, error);
        }
      }
    }

    res.render('successful.ejs');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error sending emails');
  }
});



module.exports = router;