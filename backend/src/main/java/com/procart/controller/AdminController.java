package com.procart.controller;

import com.procart.dto.ProductDTO;
import com.procart.model.Order;
import com.procart.model.User;
import com.procart.repository.UserRepository;
import com.procart.service.OrderService;
import com.procart.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private ProductService productService;

    // NEW: Inject the UserRepository to fetch all accounts
    @Autowired
    private UserRepository userRepository;

    // 1. View every order ever placed
    @GetMapping("/orders")
    public List<Order> getAllOrdersForAdmin() {
        return orderService.getOrders();
    }

    // 2. View all products (including hidden details if we want later)
    @GetMapping("/products")
    public List<ProductDTO> getAllProductsForAdmin() {
        return productService.getAllProductsSafely();
    }

    // 3. NEW: View all users (Including Guest Shoppers!)
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }
}