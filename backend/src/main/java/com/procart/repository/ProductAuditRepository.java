package com.procart.repository;

import com.procart.model.ProductAudit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductAuditRepository extends JpaRepository<ProductAudit, Long> {
}