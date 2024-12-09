import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Check if the email already exists in the database
    const existingUser = await dbClient.db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hash the password using SHA1
    const hashedPassword = sha1(password);

    // Create the new user
    const userDocument = {
      email,
      password: hashedPassword,
    };
    const result = await dbClient.db.collection('users').insertOne(userDocument);

    // Respond with the created user's id and email
    return res.status(201).json({
      id: result.insertedId,
      email,
    });
  }
}

export default UsersController;
