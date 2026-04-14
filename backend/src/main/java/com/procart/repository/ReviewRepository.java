package com.procart.repository;

import com.procart.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    // Find all reviews for a specific product so we can calculate the average
    List<Review> findByProductId(Long productId);
}