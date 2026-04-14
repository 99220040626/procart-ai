package com.procart.repository;

import com.procart.model.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface CartRepository extends JpaRepository<Cart, Long> {

    // Find all cart items for a specific user
    List<Cart> findByUserId(Long userId);

    // Delete all cart items for a specific user after checkout
    @Transactional
    void deleteByUserId(Long userId);
}