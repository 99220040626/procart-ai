package com.procart.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    @Autowired
    private StringRedisTemplate redisTemplate;

    // Cache to hold the counting buckets for each IP
    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    // 🚀 THE FIX: Enterprise Standard Limit! (Max 300 requests per 1 minute)
    private Bucket createNewBucket() {
        // Allows 300 requests every 60 seconds (5 requests per second)
        Bandwidth limit = Bandwidth.classic(300, Refill.greedy(300, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Get the hacker's (or user's) IP Address
        String ip = request.getRemoteAddr();

        // 🛑 STEP 1: Check Redis. Is this IP already in Jail?
        if (Boolean.TRUE.equals(redisTemplate.hasKey("BANNED_" + ip))) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.getWriter().write("SECURITY ALERT: Your IP has been banned for 24 hours due to suspicious spam activity.");
            return; // Kills the request instantly. Does not touch your database!
        }

        // ✅ STEP 2: Grab their bucket and see if they have tokens left
        Bucket bucket = cache.computeIfAbsent(ip, k -> createNewBucket());

        if (bucket.tryConsume(1)) {
            // They are playing nice. Let them through.
            filterChain.doFilter(request, response);
        } else {
            // 🚨 STEP 3: RATE LIMIT EXCEEDED! Throw them in Redis Jail for 24 hours!
            redisTemplate.opsForValue().set("BANNED_" + ip, "true", 24, TimeUnit.HOURS);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("RATE LIMIT EXCEEDED: You have been temporarily banned for 24 hours.");
        }
    }
}