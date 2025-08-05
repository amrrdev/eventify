export const INCREMENT_USAGE_SCRIPT = `
  local key = KEYS[1]
  local usageCount = redis.call("HINCRBY", key, "usageCount", 1)
  local data = redis.call("HMGET", key, "usageLimit", "active", "key", "ownerId")
  return {data[3], data[4], tostring(usageCount), data[1], data[2]}
`;
