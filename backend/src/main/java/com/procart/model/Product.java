package com.procart.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;

@Entity
public class Product implements Serializable { 

    private static final long serialVersionUID = 1L; 

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    
    // 🚀 NEW: The "Surge" Price (What the user sees)
    private double price;
    
    // 🚀 NEW: The Anchor Price (What the Admin originally set)
    @Column(name = "base_price", columnDefinition = "double default 0.0")
    private double basePrice; 
    
    private String category;
    private int stock;

    private String imageUrl;

    @Column(length = 1000)
    private String searchTags;

    @Column(columnDefinition = "TEXT")
    private String detailedDescription;

    @Column(name = "model_url")
    private String modelUrl;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean isActive = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_gallery", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "image_url")
    private List<String> galleryImages = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_variants", joinColumns = @JoinColumn(name = "product_id"))
    private List<ProductVariant> variants = new ArrayList<>();

    public Product() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getPrice() { return price; }
    
    // 🚀 UPDATED: Automatically lock in the base price the first time it is set!
    public void setPrice(double price) { 
        this.price = price; 
        if (this.basePrice == 0.0) {
            this.basePrice = price;
        }
    }

    // 🚀 NEW: Base Price Getters/Setters
    public double getBasePrice() { return basePrice; }
    public void setBasePrice(double basePrice) { this.basePrice = basePrice; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    
    public String getSearchTags() { return searchTags; }
    public void setSearchTags(String searchTags) { this.searchTags = searchTags; }
    
    public String getDetailedDescription() { return detailedDescription; }
    public void setDetailedDescription(String detailedDescription) { this.detailedDescription = detailedDescription; }

    public String getModelUrl() { return modelUrl; }
    public void setModelUrl(String modelUrl) { this.modelUrl = modelUrl; }
    
    public boolean isActive() { return isActive; }
    public void setActive(boolean isActive) { this.isActive = isActive; }

    public List<String> getGalleryImages() { return galleryImages; }
    public void setGalleryImages(List<String> galleryImages) { this.galleryImages = galleryImages; }

    public List<ProductVariant> getVariants() { return variants; }
    public void setVariants(List<ProductVariant> variants) { this.variants = variants; }

    @Embeddable
    public static class ProductVariant implements Serializable { 
        private static final long serialVersionUID = 1L; 
        
        private String color;
        private String size;
        private int variantStock;
        private String variantImageUrl; 

        public ProductVariant() {}

        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
        public String getSize() { return size; }
        public void setSize(String size) { this.size = size; }
        public int getVariantStock() { return variantStock; }
        public void setVariantStock(int variantStock) { this.variantStock = variantStock; }
        public String getVariantImageUrl() { return variantImageUrl; }
        public void setVariantImageUrl(String variantImageUrl) { this.variantImageUrl = variantImageUrl; }
    }
}