const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const users = await User.find({ department: 'Ministry of Health' });
    console.log(users);
    process.exit(0);
  });
