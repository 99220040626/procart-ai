package com.procart.service;

import com.procart.model.Cart;
import com.procart.model.Order;
import com.procart.model.Product;
import com.procart.repository.CartRepository;
import com.procart.repository.OrderRepository;
import com.procart.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private CartRepository cartRepository;
    @Autowired
    private ProductRepository productRepository;

    public Order placeOrder(Order order) {
        order.setStatus("PLACED");
        return orderRepository.save(order);
    }

    public List<Order> getOrders() {
        return orderRepository.findAll();
    }

    public List<Order> getOrdersByUser(Long userId) {
        return orderRepository.findByUserId(userId);
    }

    public Order updateOrderStatus(Long id, Order updatedOrder) {
        Order order = orderRepository.findById(id).orElseThrow();
        order.setStatus(updatedOrder.getStatus());
        return orderRepository.save(order);
    }

    public List<Order> processCheckout(Long userId) {
        List<Cart> cartItems = cartRepository.findByUserId(userId);
        List<Order> orders = new ArrayList<>();

        for(Cart cart : cartItems) {
            Order order = new Order();
            order.setUserId(cart.getUserId());
            order.setProductId(cart.getProductId());
            order.setQuantity(cart.getQuantity());
            order.setPrice(cart.getPrice());
            order.setStatus("PLACED");

            Product product = productRepository.findById(cart.getProductId()).orElse(null);
            if(product != null) {
                product.setStock(product.getStock() - cart.getQuantity());
                productRepository.save(product);
            }
            orders.add(orderRepository.save(order));
        }
        cartRepository.deleteByUserId(userId);
        return orders;
    }
    // Add this inside your OrderService class
    public Order updateOrderStatus(Long id, String newStatus) {
        Order order = orderRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));
        
        order.setStatus(newStatus);
        return orderRepository.save(order);
    }
}