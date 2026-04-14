package com.procart.repository;

import com.procart.model.ProductQA;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductQARepository extends JpaRepository<ProductQA, Long> {
    // Find all Q&A for a specific product
    List<ProductQA> findByProductIdOrderByIdDesc(Long productId);
    
    // Find all questions the Admin hasn't answered yet
    List<ProductQA> findByAnswerIsNullOrderByIdDesc(); 
}