require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkAlan() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const alan = await User.findOne({ username: 'alan' });
  
  console.log('Alan Configuration:');
  console.log('===================');
  console.log('Organizations:', alan.permissions.organizations);
  console.log('Organization IDs:', alan.permissions.organizationIds);
  console.log('Resource Constraints:');
  console.log('  Client IDs:', alan.permissions.resourceConstraints.clientIds);
  console.log('  User IDs:', alan.permissions.resourceConstraints.userIds);
  console.log('  User ID Patterns:', alan.permissions.resourceConstraints.userIdPatterns);
  
  await mongoose.connection.close();
}

checkAlan().catch(console.error);
