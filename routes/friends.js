const express = require('express');
const router = express.Router();
const Friend = require('../models/friend');
const { isLoggedIn } = require('../middleware');

router.post('/add', isLoggedIn, async (req, res) => {
  try {
    const { name, email } = req.body;

    const existing = await Friend.findOne({
      $or: [{ email }, { name }],
      userId: req.user._id // ✅ Check only for current user's friends
    });

    if (existing) {
      req.flash('error', 'Friend with same email or name already exists in your list!');
      return res.redirect('/main');
    }

    const newFriend = new Friend({
      userId: req.user._id,
      name,
      email,
    });

    await newFriend.save();
    req.flash('success', 'Friend added successfully!');
    res.redirect('/main');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Server Error while adding friend.');
    res.redirect('/main');
  }
});



router.get('/:id/edit', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const friend = await Friend.findById(id);
  if (!friend || friend.userId.toString() !== req.user._id.toString()) {
    req.flash("error", "Unauthorized access.");
    return res.redirect('/main');
  }
  res.render('edit-friend.ejs', { friend });
});

// PUT: Update the friend
router.put('/:id', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { name, email} = req.body;

  const friend = await Friend.findById(id);
  if (!friend || friend.userId.toString() !== req.user._id.toString()) {
    req.flash("error", "Unauthorized update.");
    return res.redirect('/main');
  }

  friend.name = name;
  friend.email = email;
  await friend.save();

  req.flash("success", "Friend updated successfully!");
  res.redirect('/main');
});

// DELETE: Remove friend
router.delete('/:id', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const friend = await Friend.findById(id);

  if (!friend || friend.userId.toString() !== req.user._id.toString()) {
    req.flash("error", "Unauthorized delete.");
    return res.redirect('/main');
  }

  await Friend.findByIdAndDelete(id);
  req.flash("success", "Friend deleted.");
  res.redirect('/main');
});




module.exports = router;
