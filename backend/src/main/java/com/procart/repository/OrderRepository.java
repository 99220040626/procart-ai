package com.procart.repository;

import com.procart.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserId(Long userId);

    // 🚀 FIXED: Now correctly references the new orderDate field!
    @Query("SELECT o FROM Order o WHERE o.orderDate >= :sinceDate")
    List<Order> findOrdersSince(@Param("sinceDate") LocalDateTime sinceDate);

}