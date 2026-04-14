package com.procart.service;

import com.procart.dto.ProductDTO;
import com.procart.model.Product;
import com.procart.model.ProductAudit;
import com.procart.model.Review;
import com.procart.repository.ProductAuditRepository;
import com.procart.repository.ProductRepository;
import com.procart.repository.ReviewRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    @Autowired
    private ProductRepository repo;

    @Autowired
    private ReviewRepository reviewRepo;

    @Autowired
    private ProductAuditRepository auditRepo; 

    @Transactional(readOnly = true)
    @Cacheable(value = "productsCache") // 🚀 RAM-speed for the main list
    public List<ProductDTO> getAllProductsSafely() {
        List<Product> products = repo.findByIsActiveTrue(); 
        List<ProductDTO> safeProducts = new ArrayList<>();
        for(Product p : products) {
            safeProducts.add(mapToDTO(p));
        }
        return safeProducts;
    }

    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsPaged(String category, Pageable pageable) {
        Page<Product> productsPage;
        if (category != null && !category.isEmpty()) {
            productsPage = repo.findByCategoryAndIsActiveTrue(category, pageable);
        } else {
            productsPage = repo.findByIsActiveTrue(pageable);
        }
        return productsPage.map(this::mapToDTO);
    }

    private ProductDTO mapToDTO(Product p) {
        ProductDTO dto = new ProductDTO();
        dto.setId(p.getId());
        dto.setName(p.getName());
        dto.setPrice(p.getPrice());
        dto.setCategory(p.getCategory());
        dto.setImageUrl(p.getImageUrl()); 
        dto.setStock(p.getStock()); 
        dto.setSearchTags(p.getSearchTags()); 
        dto.setDetailedDescription(p.getDetailedDescription());
        dto.setModelUrl(p.getModelUrl());

        // ✅ FIX: Force initialization of lazy collections to prevent Hibernate 500 errors
        dto.setVariants(new ArrayList<>());
        if (p.getVariants() != null) {
            try {
                p.getVariants().size(); // Trigger load
                dto.setVariants(new ArrayList<>(p.getVariants()));
            } catch (Exception e) { log.error("Variant load failed for {}", p.getId()); }
        }

        dto.setGalleryImages(new ArrayList<>());
        if (p.getGalleryImages() != null) {
            try {
                p.getGalleryImages().size(); // Trigger load
                dto.setGalleryImages(new ArrayList<>(p.getGalleryImages()));
            } catch (Exception e) { log.error("Gallery load failed for {}", p.getId()); }
        }

        try {
            List<Review> reviews = reviewRepo.findByProductId(p.getId());
            if (reviews != null && !reviews.isEmpty()) {
                double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
                dto.setAverageRating(Math.round(avg * 10.0) / 10.0);
                dto.setReviewCount(reviews.size());
            } else {
                dto.setAverageRating(0.0);
                dto.setReviewCount(0);
            }
        } catch (Exception e) {
            dto.setAverageRating(0.0);
            dto.setReviewCount(0);
        }
        return dto;
    }

    @Transactional
    @CacheEvict(value = "productsCache", allEntries = true)
    public Product addProduct(Product product) { 
        Product saved = repo.save(product); 
        auditRepo.save(new ProductAudit(saved.getId(), "CREATED", "Admin added product: " + saved.getName()));
        return saved;
    }

    // 🚀 FULL IMPLEMENTATION: Save thousands of items from Excel
    @Transactional
    @CacheEvict(value = "productsCache", allEntries = true)
    public int saveBulkFromExcel(MultipartFile file) {
        int count = 0;
        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            Iterator<Row> rows = sheet.iterator();
            
            if (rows.hasNext()) rows.next(); // Skip header
            
            List<Product> batch = new ArrayList<>();
            while (rows.hasNext()) {
                Row row = rows.next();
                Product p = new Product();
                p.setName(formatter.formatCellValue(row.getCell(0)));
                p.setPrice(Double.parseDouble(formatter.formatCellValue(row.getCell(1))));
                p.setStock(Integer.parseInt(formatter.formatCellValue(row.getCell(2))));
                p.setCategory(formatter.formatCellValue(row.getCell(3)));
                p.setImageUrl(formatter.formatCellValue(row.getCell(4)));
                p.setActive(true);
                batch.add(p);
                count++;
            }
            repo.saveAll(batch);
            log.info("Bulk Matrix Load Successful: {} items.", count);
        } catch (Exception e) {
            log.error("Excel crash: {}", e.getMessage());
            throw new RuntimeException("Excel processing failed: " + e.getMessage());
        }
        return count;
    }

    public Product getProductById(Long id) { return repo.findById(id).orElse(null); }
    public List<Product> searchProduct(String name) { return repo.findByNameContainingIgnoreCaseAndIsActiveTrue(name); }
    
    @Transactional
    @CacheEvict(value = "productsCache", allEntries = true)
    public void deleteProduct(Long id) { 
        Product p = repo.findById(id).orElse(null);
        if(p != null) {
            p.setActive(false); 
            repo.save(p);
            auditRepo.save(new ProductAudit(id, "DELETED", "Admin soft-deleted product: " + p.getName()));
        }
    }
    
    @Transactional
    @CacheEvict(value = "productsCache", allEntries = true)
    public Product updateProduct(Long id, Product product) {
        Product existing = repo.findById(id).orElse(null);
        if(existing != null) {
            existing.setName(product.getName());
            existing.setPrice(product.getPrice());
            existing.setCategory(product.getCategory());
            existing.setStock(product.getStock());
            existing.setSearchTags(product.getSearchTags());
            existing.setDetailedDescription(product.getDetailedDescription());
            if(product.getImageUrl() != null) existing.setImageUrl(product.getImageUrl()); 
            
            Product saved = repo.save(existing);
            auditRepo.save(new ProductAudit(id, "UPDATED", "Admin updated product info: " + saved.getName()));
            return saved;
        }
        return null;
    }

    @Transactional(readOnly = true)
    public List<ProductDTO> performVisualSearch(MultipartFile image) {
        List<Product> allActive = repo.findByIsActiveTrue();
        List<Product> matchedProducts = new ArrayList<>();
        
        // 🚀 SECURED: Fetching token from Environment Variables instead of hardcoding
        String hfToken = System.getenv("HF_TOKEN");

        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224"))
                    .header("Authorization", "Bearer " + hfToken)
                    .header("Content-Type", "application/octet-stream")
                    .header("X-Wait-For-Model", "true")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(image.getBytes()))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                ObjectMapper mapper = new ObjectMapper();
                List<Map<String, Object>> predictions = mapper.readValue(response.body(), new TypeReference<List<Map<String, Object>>>() {});

                if (predictions != null && !predictions.isEmpty()) {
                    for (int i = 0; i < Math.min(5, predictions.size()); i++) {
                        String aiLabel = (String) predictions.get(i).get("label");
                        String[] tags = aiLabel.split(",");
                        for (String tag : tags) {
                            String cleanTag = tag.trim().toLowerCase();
                            for (Product p : allActive) {
                                if (isSmartMatch(p, cleanTag) && !matchedProducts.contains(p)) {
                                    matchedProducts.add(p);
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) { log.error("AI Tier 1 Error: {}", e.getMessage()); }

        if (matchedProducts.isEmpty()) {
            matchedProducts = new ArrayList<>(allActive);
            java.util.Collections.shuffle(matchedProducts);
        }

        List<ProductDTO> visualMatches = new ArrayList<>();
        int limit = Math.min(3, matchedProducts.size()); 
        for (int i = 0; i < limit; i++) visualMatches.add(mapToDTO(matchedProducts.get(i)));
        return visualMatches;
    }

    private boolean isSmartMatch(Product p, String aiTag) {
        String name = p.getName().toLowerCase();
        String cat = p.getCategory() != null ? p.getCategory().toLowerCase() : "";
        String dbTags = p.getSearchTags() != null ? p.getSearchTags().toLowerCase() : "";
        return name.contains(aiTag) || cat.contains(aiTag) || dbTags.contains(aiTag);
    }
}