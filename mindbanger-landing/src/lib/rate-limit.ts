import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Ak ešte nemáš Upstash kľúče, rate limit bude zatiaľ ignorovaný a aplikácia nespadne.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

// Obmedzenie na 5 požiadaviek za minútu na jednu IP adresu
export const rateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: '@upstash/ratelimit',
    })
  : null;
