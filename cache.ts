
const redis = require('redis');
const { promisify } = require("util");
const client = redis.createClient();

module.exports = () => {
  const get = promisify(client.get).bind(client);
  const set = promisify(client.set).bind(client);

  const setConnections = async (flowId, connections) => {
    await set('connections:' + flowId, JSON.stringify(connections));
  }

  const getConnections = async (flowId) => {
    const connections = await get('connections:' + flowId);
    return JSON.parse(connections);
  }

  const getConnection = async (flowId, connectionId) => {
    const connections = await getConnections(flowId);
    return connections.find(c => c.id === connectionId);
  }

  return {
    get,
    set,
    setConnections,
    getConnection,
  }
}