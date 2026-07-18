package com.interviewprep.backend.security;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {
    // Capacity of 10 requests, refills 1 token every 10 seconds (0.1 tokens/sec)
    private final long capacity = 10;
    private final double refillRate = 0.1;
    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    public boolean isAllowed(String key) {
        return buckets.computeIfAbsent(key, k -> new TokenBucket(capacity, refillRate)).tryConsume();
    }
}
