package com.procart.controller;

import com.procart.model.PromoCode;
import com.procart.repository.PromoCodeRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/promo")
public class PromoController {

    @Autowired
    private PromoCodeRepository promoCodeRepository;

    // ==========================================
    // NEW: Auto-Seeder! Re-creates the promo code if it was deleted.
    // ==========================================
    @PostConstruct
    public void initPromoCodes() {
        Optional<PromoCode> existing = promoCodeRepository.findByCodeAndActiveTrue("WELCOME10");
        
        if (existing.isEmpty()) {
            PromoCode promo = new PromoCode();
            promo.setCode("WELCOME10");
            promo.setDiscountPercentage(10); // 10% off
            promo.setExpiryDate(LocalDateTime.now().plusMonths(6)); // Valid for 6 months
            promo.setActive(true);
            
            promoCodeRepository.save(promo);
            System.out.println("✅ Automatically restored WELCOME10 promo code to the database!");
        }
    }

    @PostMapping("/validate")
    public ResponseEntity<?> validateCode(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        
        return promoCodeRepository.findByCodeAndActiveTrue(code)
            .map(promo -> {
                if (promo.getExpiryDate() != null && promo.getExpiryDate().isBefore(LocalDateTime.now())) {
                    return ResponseEntity.badRequest().body("This code has expired!");
                }
                return ResponseEntity.ok(Map.of("discount", promo.getDiscountPercentage()));
            })
            .orElse(ResponseEntity.badRequest().body("Invalid promo code."));
    }
}