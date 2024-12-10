import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class FilesController {
  static async postUpload(req, res) {
    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve user ID from Redis
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    let parentFile = null;
    if (parentId !== 0) {
      parentFile = await dbClient.db.collection('files').findOne({ _id: dbClient.ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileDocument = {
      userId: dbClient.ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? '0' : dbClient.ObjectId(parentId),
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDocument);
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    }

    // Handle file or image
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const localPath = path.join(folderPath, uuidv4());
    fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

    fileDocument.localPath = localPath;

    const result = await dbClient.db.collection('files').insertOne(fileDocument);

    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
    });
  }
  // GET /files/:id
  static async getShow(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const file = await dbClient.db.collection('files').findOne({ _id: dbClient.ObjectId(id), userId: dbClient.ObjectId(userId) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      const { _id, ...fileData } = file;
      res.status(200).json({ id: _id, ...fileData });
    } catch (error) {
      res.status(404).json({ error: 'Not found' });
    }
  }

  // GET /files
  static async getIndex(req, res) {
    const { parentId = '0', page = 0 } = req.query;
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pageNum = parseInt(page, 10);
    const limit = 20;
    const skip = pageNum * limit;

    try {
      const query = { userId: dbClient.ObjectId(userId) };
      if (parentId !== '0') {
        query.parentId = parentId === '0' ? '0' : dbClient.ObjectId(parentId);
      }

      const files = await dbClient.db.collection('files')
        .aggregate([
          { $match: query },
          { $skip: skip },
          { $limit: limit },
        ])
        .toArray();

      const result = files.map(({ _id, ...file }) => ({ id: _id, ...file }));
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /files/:id/publish
  static async putPublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const file = await dbClient.db.collection('files').findOne({ _id: dbClient.ObjectId(id), userId: dbClient.ObjectId(userId) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      await dbClient.db.collection('files').updateOne({ _id: file._id }, { $set: { isPublic: true } });

      const updatedFile = { id: file._id, ...file, isPublic: true };
      res.status(200).json(updatedFile);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /files/:id/unpublish
  static async putUnpublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const file = await dbClient.db.collection('files').findOne({ _id: dbClient.ObjectId(id), userId: dbClient.ObjectId(userId) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      await dbClient.db.collection('files').updateOne({ _id: file._id }, { $set: { isPublic: false } });

      const updatedFile = { id: file._id, ...file, isPublic: false };
      res.status(200).json(updatedFile);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  // GET /files/:id/data
  static async getFile(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    let userId = null;

    if (token) {
      userId = await redisClient.get(`auth_${token}`);
    }

    try {
      const file = await dbClient.db.collection('files').findOne({ _id: dbClient.ObjectId(id) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      if (!file.isPublic) {
        if (!userId || userId.toString() !== file.userId.toString()) {
          return res.status(404).json({ error: 'Not found' });
        }
      }

      if (!file.localPath) {
        return res.status(404).json({ error: 'Not found' });
      }

      try {
        const data = await fs.readFile(file.localPath);
        const mimeType = mime.lookup(file.name) || 'application/octet-stream';

        res.setHeader('Content-Type', mimeType);
        return res.status(200).send(data);
      } catch (err) {
        return res.status(404).json({ error: 'Not found' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default FilesController;
