package com.procart.repository;

import com.procart.model.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, Long> {
    
    // Find all saved items for a specific user
    List<Wishlist> findByUserId(Long userId);
    
    // Check if a user already saved a specific product
    Wishlist findByUserIdAndProductId(Long userId, Long productId);
    
    // Remove an item from the wishlist
    void deleteByUserIdAndProductId(Long userId, Long productId);
}