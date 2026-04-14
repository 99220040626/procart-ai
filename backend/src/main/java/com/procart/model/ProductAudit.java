package com.procart.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class ProductAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long productId;
    private String action; // e.g., "CREATED", "UPDATED", "DELETED", "BULK_UPLOAD"
    private String details;
    private LocalDateTime timestamp = LocalDateTime.now();

    public ProductAudit() {}

    public ProductAudit(Long productId, String action, String details) {
        this.productId = productId;
        this.action = action;
        this.details = details;
    }

    public Long getId() { return id; }
    public Long getProductId() { return productId; }
    public String getAction() { return action; }
    public String getDetails() { return details; }
    public LocalDateTime getTimestamp() { return timestamp; }
}