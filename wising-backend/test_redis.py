import asyncio
from upstash_redis.asyncio import Redis
import os
from dotenv import load_dotenv

load_dotenv()

async def test_redis():
    print("Testing Upstash Redis Connection...")
    redis = Redis(url=os.getenv("UPSTASH_REDIS_REST_URL"), token=os.getenv("UPSTASH_REDIS_REST_TOKEN"))
    
    print("Setting key 'test_key' to 'Hello from Antigravity!'...")
    await redis.set("test_key", "Hello from Antigravity!")
    
    print("Getting key 'test_key'...")
    val = await redis.get("test_key")
    print(f"Result: {val}")
    
    print("Testing complete. If you see 'Hello from Antigravity!', your Upstash Redis is working perfectly!")

if __name__ == "__main__":
    asyncio.run(test_redis())
