// Database cleanup script - keeps only admin user
const { MongoClient } = require('mongodb');

async function cleanDatabase() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('voiceboard');
    
    // List current collections
    const collections = await db.listCollections().toArray();
    console.log('Current collections:', collections.map(c => c.name));
    
    // Backup admin user
    const adminUser = await db.collection('users').findOne({role: 'admin'});
    console.log('Admin user found:', adminUser ? adminUser.email : 'No admin found');
    
    // Delete non-admin users
    const deleteResult = await db.collection('users').deleteMany({role: {$ne: 'admin'}});
    console.log('Deleted', deleteResult.deletedCount, 'non-admin users');
    
    // Drop other collections if they exist
    const collectionsToDelete = [
      'classsessions', 'strokes', 'chatmessages',
      'sessionparticipants', 'aicontents', 'roomclasses', 'rooms',
      'otps', 'adminsessions'
    ];
    
    for (const collectionName of collectionsToDelete) {
      try {
        await db.collection(collectionName).drop();
        console.log('Dropped collection:', collectionName);
      } catch (error) {
        console.log('Collection', collectionName, 'does not exist or already dropped');
      }
    }
    
    // Verify final state
    const remainingUsers = await db.collection('users').find({}, {projection: {name: 1, email: 1, role: 1}}).toArray();
    console.log('\n=== Final Database State ===');
    console.log('Remaining users:', remainingUsers);
    
    const finalCollections = await db.listCollections().toArray();
    console.log('Final collections:', finalCollections.map(c => c.name));
    
    console.log('\n✅ Database cleanup completed successfully!');
    console.log('Only admin user preserved, all other data removed.');
    
  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await client.close();
  }
}

cleanDatabase();
