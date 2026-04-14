package com.procart.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict; 
import org.springframework.cache.annotation.Cacheable; 
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional; 
import org.springframework.web.bind.annotation.*;
import com.procart.model.Product;
import com.procart.dto.ProductDTO;
import com.procart.service.ProductService; 
import com.procart.repository.ProductRepository;
import com.procart.repository.ProductAuditRepository;

import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductAuditRepository auditRepo;

    // 🚀 NEW ENTERPRISE FEATURE: Global Cache Manager
    @Autowired
    private org.springframework.cache.CacheManager cacheManager;

    // 🚀 THE FIX: A dedicated endpoint to nuke the corrupted memory instantly
    @GetMapping("/clear-cache")
    public ResponseEntity<String> clearGlobalCache() {
        for (String cacheName : cacheManager.getCacheNames()) {
            cacheManager.getCache(cacheName).clear();
        }
        return ResponseEntity.ok("MATRIX MEMORY PURGED SUCCESSFULLY. ALL CACHES CLEARED.");
    }

    @Transactional(readOnly = true)
    @GetMapping
    @Cacheable(value = "allProducts") 
    public List<ProductDTO> getAllProducts(){
        return productService.getAllProductsSafely();
    }

    @PostMapping(consumes = {"multipart/form-data"})
    @CacheEvict(value = {"allProducts", "pagedProducts", "recommendations"}, allEntries = true) 
    public ResponseEntity<?> addProduct(
            @RequestParam("name") String name,
            @RequestParam("price") double price,
            @RequestParam("stock") int stock,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "searchTags", required = false) String searchTags, 
            @RequestParam(value = "detailedDescription", required = false) String detailedDescription,
            @RequestParam(value = "image", required = false) MultipartFile imageFile,
            @RequestParam(value = "gallery", required = false) List<MultipartFile> galleryFiles,
            @RequestParam(value = "model", required = false) MultipartFile modelFile) {
        
        try {
            Product product = new Product();
            product.setName(name);
            product.setPrice(price);
            product.setStock(stock);
            product.setCategory(category);
            product.setSearchTags(searchTags); 
            product.setDetailedDescription(detailedDescription);

            String uploadDirectory = "uploads/";
            Path uploadPath = Path.of(uploadDirectory);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            if (imageFile != null && !imageFile.isEmpty()) {
                String fileName = System.currentTimeMillis() + "_main_" + imageFile.getOriginalFilename();
                Files.copy(imageFile.getInputStream(), uploadPath.resolve(fileName));
                product.setImageUrl(fileName); 
            }

            if (galleryFiles != null && !galleryFiles.isEmpty()) {
                java.util.List<String> savedGallery = new java.util.ArrayList<>();
                for (MultipartFile file : galleryFiles) {
                    if (!file.isEmpty()) {
                        String gFileName = System.currentTimeMillis() + "_gallery_" + file.getOriginalFilename();
                        Files.copy(file.getInputStream(), uploadPath.resolve(gFileName));
                        savedGallery.add(gFileName);
                    }
                }
                product.setGalleryImages(savedGallery);
            }

            if (modelFile != null && !modelFile.isEmpty()) {
                String mFileName = System.currentTimeMillis() + "_model_" + modelFile.getOriginalFilename();
                Files.copy(modelFile.getInputStream(), uploadPath.resolve(mFileName));
                product.setModelUrl(mFileName);
            }

            Product savedProduct = productService.addProduct(product);
            return new ResponseEntity<>(savedProduct, HttpStatus.CREATED);

        } catch (Exception e) {
            return new ResponseEntity<>("Error adding product: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional(readOnly = true)
    @GetMapping("/{id}")
    public Product getProductById(@PathVariable Long id){
        return productService.getProductById(id);
    }

    @Transactional(readOnly = true)
    @GetMapping("/search")
    public List<Product> searchProduct(@RequestParam String name){
        return productService.searchProduct(name);
    }

    @Transactional(readOnly = true)
    @GetMapping("/filter")
    public ResponseEntity<List<Product>> filterProducts(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") Double minPrice,
            @RequestParam(defaultValue = "999999") Double maxPrice) {
        if ("All".equalsIgnoreCase(category)) {
            category = null;
        }
        List<Product> filteredProducts = productRepository.findWithFilters(category, minPrice, maxPrice);
        return ResponseEntity.ok(filteredProducts);
    }

    @PutMapping("/{id}")
    @CacheEvict(value = {"allProducts", "pagedProducts", "recommendations"}, allEntries = true)
    public Product updateProduct(@PathVariable Long id, @RequestBody Product product){
        return productService.updateProduct(id, product);
    }

    @DeleteMapping("/{id}")
    @CacheEvict(value = {"allProducts", "pagedProducts", "recommendations"}, allEntries = true)
    public String deleteProduct(@PathVariable Long id){
        productService.deleteProduct(id);
        return "Product deleted";
    }

    @Transactional(readOnly = true)
    @GetMapping("/paged")
    // 🚀 FIXED: Removed @Cacheable here to stop the 500 Jackson Error.
    public Page<ProductDTO> getProductsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String category) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return productService.getProductsPaged(category, pageable);
    }

    @Transactional(readOnly = true)
    @GetMapping("/recommendations")
    @Cacheable(value = "recommendations", key = "#category + '-' + #excludeId")
    public List<Product> getRecommendations(
            @RequestParam String category, 
            @RequestParam(defaultValue = "0") Long excludeId) {
        return productRepository.findTop4ByCategoryAndIdNotAndIsActiveTrue(category, excludeId);
    }

    @PostMapping(value = "/bulk-upload", consumes = {"multipart/form-data"})
    @CacheEvict(value = {"allProducts", "pagedProducts", "recommendations"}, allEntries = true)
    public ResponseEntity<?> uploadProductsInBulk(@RequestParam("file") MultipartFile file) {
        try {
            int count = productService.saveBulkFromExcel(file);
            return ResponseEntity.ok(java.util.Map.of("message", "Successfully uploaded " + count + " products!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @Transactional(readOnly = true)
    @GetMapping("/audit")
    public ResponseEntity<?> getAuditLogs() {
        return ResponseEntity.ok(auditRepo.findAll(Sort.by(Sort.Direction.DESC, "id")));
    }

    @PostMapping(value = "/visual-search", consumes = {"multipart/form-data"})
    public ResponseEntity<?> visualSearch(@RequestParam("image") MultipartFile image) {
        try {
            List<ProductDTO> matches = productService.performVisualSearch(image);
            return ResponseEntity.ok(matches);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(java.util.Map.of("error", e.getMessage()));
        }
    }
}