package com.procart.service;

import com.procart.model.Order;
import com.procart.model.Product;
import com.procart.repository.OrderRepository;
import com.procart.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DynamicPricingService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    // 🚀 CRON JOB: Runs automatically every hour (3600000 ms)
    @Scheduled(fixedRate = 3600000)
    @CacheEvict(value = {"allProducts", "pagedProducts", "recommendations"}, allEntries = true)
    public void runSurgePricingAlgorithm() {
        System.out.println("📈 [SURGE ENGINE] Waking up to calculate dynamic pricing...");

        List<Product> products = productRepository.findByIsActiveTrue();
        
        // Fetch all orders from the last 24 hours
        LocalDateTime twentyFourHoursAgo = LocalDateTime.now().minusHours(24);
        List<Order> recentOrders = orderRepository.findOrdersSince(twentyFourHoursAgo);

        for (Product product : products) {
            
            if (product.getBasePrice() == 0.0) {
                product.setBasePrice(product.getPrice());
            }

            // 🚀 FIXED: Accurately count items based on Product ID and Quantity!
            long soldCount = 0;
            for (Order order : recentOrders) {
                if (order.getProductId() != null && order.getProductId().equals(product.getId())) {
                    soldCount += order.getQuantity(); 
                }
            }

            // 🧮 THE ALGORITHM
            double newPrice = product.getBasePrice();

            if (soldCount > 5) {
                // 🔥 HIGH DEMAND: Surge price by 5%
                newPrice = product.getBasePrice() * 1.05;
                System.out.println("🔥 SURGE: " + product.getName() + " is hot! Price increased to ₹" + newPrice);
            } 
            else if (soldCount == 0 && product.getStock() > 20) {
                // 🧊 DEAD INVENTORY: Drop price by 10%
                newPrice = product.getBasePrice() * 0.90;
                System.out.println("🧊 DISCOUNT: " + product.getName() + " isn't selling. Price dropped to ₹" + newPrice);
            } 
            else {
                // ⚖️ NORMAL: Return to base price
                newPrice = product.getBasePrice();
            }

            // Save the updated price back to MySQL (Rounded to 2 decimals)
            product.setPrice(Math.round(newPrice * 100.0) / 100.0);
            productRepository.save(product);
        }

        System.out.println("✅ [SURGE ENGINE] Pricing update complete. Redis Cache Cleared.");
    }
}