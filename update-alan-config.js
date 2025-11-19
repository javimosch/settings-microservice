require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function update() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const alan = await User.findOne({ username: 'alan' });
  
  // Remove org write permission
  alan.permissions.features.organizations.write = false;
  
  // Remove global/user/dynamic settings permissions
  alan.permissions.features.globalSettings.read = false;
  alan.permissions.features.globalSettings.write = false;
  alan.permissions.features.userSettings.read = false;
  alan.permissions.features.userSettings.write = false;
  alan.permissions.features.dynamicSettings.read = false;
  alan.permissions.features.dynamicSettings.write = false;
  
  await alan.save();
  
  console.log('✅ Updated alan configuration:');
  console.log('  Organizations: read=true, write=false');
  console.log('  Client Settings: read=true, write=true');
  console.log('  Global Settings: read=false, write=false');
  console.log('  User Settings: read=false, write=false');
  console.log('  Dynamic Settings: read=false, write=false');
  
  await mongoose.connection.close();
}

update().catch(console.error);
