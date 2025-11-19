require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function update() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const alan = await User.findOne({ username: 'alan' });
  alan.permissions.features.organizations.write = true;
  await alan.save();
  
  console.log('✅ Updated alan to have organizations write permission');
  
  await mongoose.connection.close();
}

update().catch(console.error);
