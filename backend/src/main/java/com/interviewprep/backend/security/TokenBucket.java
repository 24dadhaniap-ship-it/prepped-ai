package com.interviewprep.backend.security;

public class TokenBucket {
    private final long capacity;
    private final double refillRatePerSecond;
    private double tokens;
    private long lastRefillTime;

    public TokenBucket(long capacity, double refillRatePerSecond) {
        this.capacity = capacity;
        this.refillRatePerSecond = refillRatePerSecond;
        this.tokens = capacity;
        this.lastRefillTime = System.currentTimeMillis();
    }

    public synchronized boolean tryConsume() {
        refill();
        if (tokens >= 1.0) {
            tokens -= 1.0;
            return true;
        }
        return false;
    }

    private synchronized void refill() {
        long now = System.currentTimeMillis();
        double elapsedSeconds = (now - lastRefillTime) / 1000.0;
        tokens = Math.min(capacity, tokens + (elapsedSeconds * refillRatePerSecond));
        lastRefillTime = now;
    }
}
