import {Bull, Queue} from 'bull';
import dbClient from './utils/db.js';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs/promises';
import path from 'path';

const fileQueue = new Bull('fileQueue');
const userQueue = new Queue('userQueue');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const file = await dbClient.db.collection('files').findOne({
    _id: dbClient.ObjectId(fileId),
    userId,
  });

  if (!file) throw new Error('File not found');
  if (file.type !== 'image') throw new Error('File is not an image');

  const sizes = [500, 250, 100];

  try {
    for (const size of sizes) {
      const options = { width: size };
      const thumbnail = await imageThumbnail(file.localPath, options);
      const thumbnailPath = `${file.localPath}_${size}`;
      await fs.writeFile(thumbnailPath, thumbnail);
    }
  } catch (err) {
    throw new Error(`Error generating thumbnails: ${err.message}`);
  }
});


userQueue.process(async (job) => {
  const { userId } = job.data;

  // Validate job data
  if (!userId) throw new Error('Missing userId');

  // Fetch the user from the database
  const user = await dbClient.usersCollection.findOne({ _id: userId });
  if (!user) throw new Error('User not found');

  // Simulate sending a welcome email
  console.log(`Welcome ${user.email}!`);
});