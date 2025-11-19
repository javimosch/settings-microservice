require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkAlan() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const alan = await User.findOne({ username: 'alan' });
  
  if (!alan) {
    console.log('❌ User "alan" not found');
    process.exit(1);
  }
  
  console.log('✅ Found user: alan');
  console.log('Role:', alan.role);
  console.log('Permissions:');
  console.log('  Organizations:', alan.permissions.organizations);
  console.log('  Org IDs:', alan.permissions.organizationIds);
  console.log('  Features:');
  Object.keys(alan.permissions.features).forEach(feature => {
    const perm = alan.permissions.features[feature];
    console.log(`    ${feature}: read=${perm.read}, write=${perm.write}`);
  });
  
  await mongoose.connection.close();
}

checkAlan().catch(console.error);
