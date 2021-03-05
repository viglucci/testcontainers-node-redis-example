const Redis = require("ioredis");
const { GenericContainer } = require("testcontainers");
const { expect } = require("chai");
const uniqid = require("uniqid");

describe("RedisTest", () => {
  let container;
  let redisClient;
  let uniqKey;
  let uniqValue;

  before(async () => {
    // "redis" is the name of the Docker imaage to download and run
    container = await new GenericContainer("redis")
      // exposes the internal Docker port to the host machine
      .withExposedPorts(6379)
      .start();

    redisClient = new Redis({
      host: container.getHost(),
      // retrieves the port on the host machine which maps
      // to the exposed port in the Docker container
      port: container.getMappedPort(6379),
    });
  });

  beforeEach(() => {
    uniqKey = uniqid();
    uniqValue = uniqid();
  });

  after(async () => {
    await redisClient && redisClient.quit();
    await container && container.stop();
  });

  it("should set and retrieve values from Redis", async () => {
    await redisClient.set(uniqKey, uniqValue);
    expect(await redisClient.get(uniqKey)).to.equal(uniqValue);
  });

  it("should delete values from Redis", async () => {
    await redisClient.set(uniqKey, uniqValue);
    expect(await redisClient.get(uniqKey)).to.equal(uniqValue);
    await redisClient.del(uniqKey);
    expect(await redisClient.get(uniqKey)).to.equal(null);
  });
});
