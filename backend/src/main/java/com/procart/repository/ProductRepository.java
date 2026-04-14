package com.procart.repository;

import com.procart.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    
    List<Product> findByIsActiveTrue();
    
    Page<Product> findByIsActiveTrue(Pageable pageable);

    List<Product> findByNameContainingIgnoreCaseAndIsActiveTrue(String name);
    
    Page<Product> findByCategoryAndIsActiveTrue(String category, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.isActive = true AND " +
           "(:category IS NULL OR :category = '' OR p.category = :category) AND " +
           "(p.price >= :minPrice) AND " +
           "(p.price <= :maxPrice)")
    List<Product> findWithFilters(@Param("category") String category, 
                                  @Param("minPrice") Double minPrice, 
                                  @Param("maxPrice") Double maxPrice);

    List<Product> findTop4ByCategoryAndIdNotAndIsActiveTrue(String category, Long id);
}