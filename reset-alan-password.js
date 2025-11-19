require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

async function resetPassword() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const alan = await User.findOne({ username: 'alan' });
  
  if (!alan) {
    console.log('User alan not found');
    process.exit(1);
  }
  
  const newPassword = 'alan123';
  alan.password = await bcrypt.hash(newPassword, 10);
  await alan.save();
  
  console.log('✅ Password reset for alan to: alan123');
  
  await mongoose.connection.close();
}

resetPassword().catch(console.error);
