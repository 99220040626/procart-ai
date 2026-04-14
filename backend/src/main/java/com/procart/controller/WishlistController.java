package com.procart.controller;

import com.procart.model.Wishlist;
import com.procart.repository.WishlistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.transaction.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    @Autowired
    private WishlistRepository wishlistRepository;

    // Get a user's entire wishlist
    @GetMapping("/{userId}")
    public List<Wishlist> getUserWishlist(@PathVariable Long userId) {
        return wishlistRepository.findByUserId(userId);
    }

    // Add an item to the wishlist
    @PostMapping
    public ResponseEntity<?> addToWishlist(@RequestBody Wishlist wishlist) {
        // Check if it's already there so we don't get duplicates!
        Wishlist existing = wishlistRepository.findByUserIdAndProductId(wishlist.getUserId(), wishlist.getProductId());
        
        Map<String, String> response = new HashMap<>();
        
        if (existing == null) {
            wishlistRepository.save(wishlist);
            response.put("message", "Added to wishlist");
            return ResponseEntity.ok(response);
        }
        
        response.put("message", "Already in wishlist");
        return ResponseEntity.badRequest().body(response);
    }

    // Remove an item from the wishlist
    @Transactional // Required by Spring when writing custom delete methods!
    @DeleteMapping("/{userId}/{productId}")
    public ResponseEntity<?> removeFromWishlist(@PathVariable Long userId, @PathVariable Long productId) {
        wishlistRepository.deleteByUserIdAndProductId(userId, productId);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Removed from wishlist");
        return ResponseEntity.ok(response);
    }
}