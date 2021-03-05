const Redis = require("ioredis");
const { GenericContainer, Network, Wait } = require("testcontainers");
const { expect } = require("chai");

describe("RedisClusterTest", () => {
  let container;
  let network;
  let redisClient;

  before(async () => {

    // "grokzen/redis-cluster" exposes 6 Redis nodes
    // on ports 7000 - 7005
    const ports = [
      7000, 7001, 7002,
      7003, 7004, 7005
    ];

    // we create a new Docker network so that we have a consistent way
    // to retrieve the internal addresses of the Redis nodes to build
    // the NAT map
    network = await new Network().start();

    // "grokzen/redis-cluster" is the name of the Docker
    // image to download and run
    container = await new GenericContainer("grokzen/redis-cluster")
      // exposes each of the internal Docker ports listed
      // in `ports` to the host machine
      .withExposedPorts(...ports)
      .withNetworkMode(network.getName())
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start();

    const networkIpAddress = container.getIpAddress(network.getName());

    const dockerHost = container.getHost();
    const hosts = ports.map((port) => {
      // { host: "localhost", port: 55305 }
      return { host: dockerHost, port: container.getMappedPort(port) };
    });

    /**
     * {
     *   "192.168.16.2:7000": "127.0.0.1:55305",
     *   "192.168.16.2:7001": "127.0.0.1:55306",
     *   ...
     * }
     */
    const natMap = ports.reduce((map, port) => {
      const hostPort = container.getMappedPort(port);
      const internalAddress = `${networkIpAddress}:${port}`;
      map[internalAddress] = { host: dockerHost, port: hostPort };
      return map;
    }, {});

    redisClient = new Redis.Cluster(hosts, { natMap });
  });

  after(async () => {
    await redisClient && redisClient.quit();
    await container && container.stop();
    await network && network.stop();
  });

  it("should set and retrieve values from the Redis cluster", async () => {
    await redisClient.set("key", "val");
    expect(await redisClient.get("key")).to.equal("val");
  });
});
