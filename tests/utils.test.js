import redisClient from '../utils/redis';
import dbClient from '../utils/db';

describe('DB Client Tests', () => {
  it('should connect to MongoDB', async () => {
    expect(dbClient.isAlive()).toBe(true);
  });

  it('should count collections', async () => {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    expect(typeof users).toBe('number');
    expect(typeof files).toBe('number');
  });
});


describe('Redis Client Tests', () => {
  it('should connect to Redis server', async () => {
    expect(redisClient.isAlive()).toBe(true);
  });

  it('should set and get keys', async () => {
    await redisClient.set('test_key', 'test_value', 10);
    const value = await redisClient.get('test_key');
    expect(value).toBe('test_value');
  });

  it('should expire keys', async () => {
    await redisClient.set('test_key', 'test_value', 1);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const value = await redisClient.get('test_key');
    expect(value).toBe(null);
  });
});
