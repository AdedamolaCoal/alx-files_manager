import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const uri = `mongodb://${host}:${port}`;
    
    this.client = new MongoClient(uri, { useUnifiedTopology: true });
    this.dbName = database;

    this.connected = false;

    this.client.connect()
      .then(() => {
        // console.log('MongoDB client connected');
        this.connected = true;
        this.db = this.client.db(this.dbName);
      })
      .catch((err) => {
        console.error(`MongoDB connection error: ${err}`);
        this.connected = false;
      });
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    if (!this.connected) {
      return 0;
    }

    try {
      const usersCollection = this.db.collection('users');
      return usersCollection.countDocuments();
    } catch (err) {
      console.error(`Error fetching user count: ${err}`);
      return 0;
    }
  }

  async nbFiles() {
    if (!this.connected) {
      return 0;
    }

    try {
      const filesCollection = this.db.collection('files');
      return filesCollection.countDocuments();
    } catch (err) {
      console.error(`Error fetching file count: ${err}`);
      return 0;
    }
  }

  async findUser(query) {
    return this.db.collection('users').findOne(query);
  }

  async findUserById(id) {
    return this.db.collection('users').findOne({ _id: ObjectId(id) });
  }
}

const dbClient = new DBClient();
export default dbClient;
