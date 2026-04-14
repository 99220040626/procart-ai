package com.procart.controller;

import com.procart.model.Order;
import com.procart.model.Product;
import com.procart.repository.OrderRepository;
import com.procart.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardStats() {
        List<Order> orders = orderRepository.findAll();
        List<Product> products = productRepository.findAll();

        // 1. Calculate Total Revenue (Only for successful/shipped/delivered orders)
        double totalRevenue = orders.stream()
                .filter(o -> !"CANCELLED".equals(o.getStatus()))
                .mapToDouble(o -> o.getPrice() * o.getQuantity())
                .sum();

        // 2. Count Total Orders
        int totalOrders = orders.size();

        // 3. Count Total Products in Inventory
        int totalProducts = products.size();

        // 4. Group Products by Category (Perfect for a Pie Chart!)
        Map<String, Long> categoryCounts = products.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getCategory() != null && !p.getCategory().isEmpty() ? p.getCategory() : "Uncategorized",
                        Collectors.counting()
                ));

        // Format data specifically for the React Recharts library
        List<Map<String, Object>> pieChartData = new ArrayList<>();
        categoryCounts.forEach((category, count) -> {
            pieChartData.add(Map.of("name", category, "value", count));
        });

        // 5. Package it all up into one neat JSON response
        Map<String, Object> response = new HashMap<>();
        response.put("totalRevenue", totalRevenue);
        response.put("totalOrders", totalOrders);
        response.put("totalProducts", totalProducts);
        response.put("pieChartData", pieChartData);

        return ResponseEntity.ok(response);
    }
}