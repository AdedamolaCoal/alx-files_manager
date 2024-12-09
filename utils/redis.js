import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();

    this.connected = false;

    this.client.on('connect', () => {
      // console.log('Redis client connected');
      this.connected = true;
    });

    this.client.on('error', (err) => {
      console.error(`Redis client error: ${err}`);
      this.connected = false;
    });
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  }

  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.setex(key, duration, value, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
}

const redisClient = new RedisClient();
export default redisClient;
