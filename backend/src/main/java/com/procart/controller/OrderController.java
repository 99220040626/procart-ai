package com.procart.controller;

import com.procart.model.Order;
import com.procart.model.Product;
import com.procart.model.User;
import com.procart.model.UserAddress;
import com.procart.dto.OrderRequestDTO;
import com.procart.repository.ProductRepository;
import com.procart.repository.UserRepository;
import com.procart.repository.OrderRepository;
import com.procart.repository.UserAddressRepository;
import com.procart.service.OrderService;
import com.procart.service.EmailService;
import com.procart.service.FraudDetectionService; 
import jakarta.servlet.http.HttpServletRequest; 
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate; 
import org.springframework.web.bind.annotation.*;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired private OrderService orderService;
    @Autowired private ProductRepository productRepository;
    @Autowired private UserRepository userRepository; 
    @Autowired private OrderRepository orderRepository; 
    @Autowired private UserAddressRepository userAddressRepository;
    @Autowired private EmailService emailService; 
    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private FraudDetectionService fraudDetectionService;
    @Autowired private HttpServletRequest request;

    @PostMapping 
    @CacheEvict(value = {"allProducts", "pagedProducts", "recommendations"}, allEntries = true)
    public ResponseEntity<?> placeOrder(@Valid @RequestBody OrderRequestDTO orderRequest) {
        try {
            Product product = productRepository.findById(orderRequest.getProductId()).orElse(null);
            Order order = new Order();
            order.setUserId(orderRequest.getUserId());
            order.setProductId(orderRequest.getProductId());
            order.setQuantity(orderRequest.getQuantity());
            order.setPrice(orderRequest.getPrice()); 
            order.setStatus("SUCCESS"); 
            order.setShippingAddress(orderRequest.getShippingAddress());
            order.setPhoneNumber(orderRequest.getPhoneNumber());

            List<Order> recentOrders = orderService.getOrdersByUser(orderRequest.getUserId());
            fraudDetectionService.analyzeTransaction(order, recentOrders, request.getRemoteAddr());
            
            if (product != null) {
                int newStock = product.getStock() - orderRequest.getQuantity();
                product.setStock(Math.max(newStock, 0)); 
                productRepository.save(product); 
            }
            
            Order savedOrder = orderService.placeOrder(order);
            return ResponseEntity.ok(savedOrder); 
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Database failed to save: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public List<Order> getOrdersByUser(@PathVariable Long userId) { return orderService.getOrdersByUser(userId); }
    
    @GetMapping
    public List<Order> getOrders() { return orderService.getOrders(); }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            String newStatus = payload.get("status");
            Order updatedOrder = orderService.updateOrderStatus(id, newStatus);
            messagingTemplate.convertAndSend("/topic/orders/" + updatedOrder.getUserId(), updatedOrder);
            return ResponseEntity.ok(updatedOrder);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to update status: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/invoice")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable Long id) {
        try {
            Order order = orderService.getOrders().stream().filter(o -> o.getId().equals(id)).findFirst().orElseThrow();
            Product product = productRepository.findById(order.getProductId()).orElse(new Product());

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 26, Color.BLACK);
            Paragraph title = new Paragraph("PROCART INVOICE", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Order ID: #" + order.getId()));
            document.add(new Paragraph("Date: " + java.time.LocalDate.now().toString()));
            document.add(new Paragraph("Status: " + order.getStatus()));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);
            table.setSpacingAfter(10f);

            table.addCell("Item Name"); table.addCell("Quantity"); table.addCell("Unit Price"); table.addCell("Total Price");
            table.addCell(product.getName() != null ? product.getName() : "Premium Gear");
            table.addCell(String.valueOf(order.getQuantity()));
            table.addCell("Rs. " + order.getPrice());
            table.addCell("Rs. " + (order.getPrice() * order.getQuantity()));
            document.add(table);

            document.add(new Paragraph(" "));
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD);
            document.add(new Paragraph("Shipping Address:", boldFont));
            document.add(new Paragraph(order.getShippingAddress() != null ? order.getShippingAddress() : "N/A"));
            document.add(new Paragraph("Phone: " + (order.getPhoneNumber() != null ? order.getPhoneNumber() : "N/A")));

            document.add(new Paragraph(" "));
            Paragraph footer = new Paragraph("Thank you for shopping with ProCart!", FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 12, Color.GRAY));
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);
            document.close();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "ProCart_Invoice_" + order.getId() + ".pdf");
            return new ResponseEntity<>(baos.toByteArray(), headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/wallet/{userId}")
    public ResponseEntity<Integer> getWalletBalance(@PathVariable Long userId) {
        return userRepository.findById(userId).map(user -> ResponseEntity.ok(user.getWalletBalance())).orElse(ResponseEntity.ok(0));
    }

    @PostMapping("/user-checkout")
    @CacheEvict(value = {"allProducts", "pagedProducts", "recommendations"}, allEntries = true)
    public ResponseEntity<?> processUserCheckout(@RequestBody Map<String, Object> payload) {
        try {
            Long userId = Long.parseLong(payload.get("userId").toString());
            String address = (String) payload.get("shippingAddress");
            String phone = (String) payload.get("phoneNumber");
            int coinsUsed = Integer.parseInt(payload.getOrDefault("coinsUsed", "0").toString());
            double discountPercentage = Double.parseDouble(payload.getOrDefault("discount", "0").toString());
            List<Map<String, Object>> cartItems = (List<Map<String, Object>>) payload.get("items");
            
            // 🚀 NEW: Grab the screenshot from the frontend
            String screenshotBase64 = (String) payload.get("screenshotBase64");

            User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
            if (user.getWalletBalance() < coinsUsed) throw new RuntimeException("Insufficient ProCoins!");

            if (address != null && !address.trim().isEmpty()) {
                try {
                    List<UserAddress> existingAddresses = userAddressRepository.findByUserId(userId);
                    boolean isDuplicate = existingAddresses.stream().anyMatch(addr -> address.equalsIgnoreCase(addr.getStreetAddress()));
                    if (!isDuplicate) {
                        UserAddress newAddress = new UserAddress();
                        newAddress.setUserId(userId);
                        newAddress.setLabel(existingAddresses.isEmpty() ? "HOME" : "OTHER");
                        // 🛡️ TRUNCATION: Prevents the 255-char limit crash
                        String safeAddress = address.length() > 250 ? address.substring(0, 250) : address;
                        newAddress.setStreetAddress(safeAddress);
                        newAddress.setPhoneNumber(phone);
                        userAddressRepository.save(newAddress);
                    }
                } catch (Exception addrEx) {
                    System.err.println("Address Sync Bypassed: " + addrEx.getMessage());
                }
            }
            
            List<Order> recentOrders = orderService.getOrdersByUser(userId);
            String clientIp = request.getRemoteAddr();
            double subtotal = 0;
            StringBuilder summary = new StringBuilder();

            for (Map<String, Object> item : cartItems) {
                Long productId = Long.parseLong(item.get("id").toString());
                int qty = Integer.parseInt(item.get("quantity").toString());
                double price = Double.parseDouble(item.get("price").toString());

                Order order = new Order();
                order.setUserId(userId);
                order.setProductId(productId);
                order.setQuantity(qty);
                order.setPrice(price - (price * discountPercentage / 100));
                
                // 🚀 NEW: Set to PENDING and attach screenshot
                order.setStatus("PENDING");
                order.setPaymentScreenshot(screenshotBase64);
                
                // 🛡️ TRUNCATION
                order.setShippingAddress(address.length() > 250 ? address.substring(0, 250) : address);
                order.setPhoneNumber(phone);

                fraudDetectionService.analyzeTransaction(order, recentOrders, clientIp);

                Product product = productRepository.findById(productId).orElse(null);
                if (product != null) {
                    product.setStock(Math.max(product.getStock() - qty, 0));
                    productRepository.save(product);
                    summary.append(qty).append("x ").append(product.getName()).append(" | ");
                }
                orderService.placeOrder(order);
                subtotal += (price * qty);
            }

            user.setWalletBalance(user.getWalletBalance() - coinsUsed);
            double finalTotalPaid = subtotal - ((subtotal * discountPercentage) / 100) - coinsUsed;
            int coinsEarned = (int) (Math.max(finalTotalPaid, 0) * 0.10); 
            user.setWalletBalance(user.getWalletBalance() + coinsEarned);
            userRepository.save(user);

            // 🛰️ NON-BLOCKING EMAIL: Order succeeds even if the Wi-Fi blocks Gmail
            try {
                emailService.sendHtmlReceipt(user.getEmail(), user.getName(), summary.toString(), finalTotalPaid);
            } catch (Exception e) {
                System.err.println("SMTP Timeout: Order successful, but Email blocked by Campus Network.");
            }

            return ResponseEntity.ok(Map.of("message", "Order placed successfully!", "coinsEarned", coinsEarned));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/guest-checkout")
    @CacheEvict(value = {"allProducts", "pagedProducts", "recommendations"}, allEntries = true)
    public ResponseEntity<?> processGuestCheckout(@RequestBody Map<String, Object> payload) {
        try {
            String emailRaw = (String) payload.get("email");
            String email = (emailRaw != null && !emailRaw.trim().isEmpty()) ? emailRaw : "ghost_" + UUID.randomUUID().toString().substring(0, 8) + "@procart.local";
            String address = (String) payload.get("shippingAddress");
            String phone = (String) payload.get("phoneNumber");
            List<Map<String, Object>> cartItems = (List<Map<String, Object>>) payload.get("items");

            // 🚀 NEW: Grab the screenshot
            String screenshotBase64 = (String) payload.get("screenshotBase64");

            Optional<User> userOpt = userRepository.findByEmail(email);
            User user;
            if (userOpt.isPresent()) { user = userOpt.get(); } 
            else {
                user = new User();
                user.setEmail(email);
                user.setName("Ghost Entity");
                user.setRole("GUEST");
                user.setPassword(UUID.randomUUID().toString()); 
                user.setWalletBalance(0);
                user = userRepository.save(user); 
            }

            List<Order> recentOrders = orderService.getOrdersByUser(user.getId());
            String clientIp = request.getRemoteAddr();
            double totalSpent = 0;
            StringBuilder summary = new StringBuilder();

            for (Map<String, Object> item : cartItems) {
                Long productId = Long.parseLong(item.get("id").toString());
                int qty = Integer.parseInt(item.get("quantity").toString());
                double price = Double.parseDouble(item.get("price").toString());

                Order order = new Order();
                order.setUserId(user.getId());
                order.setProductId(productId);
                order.setQuantity(qty);
                order.setPrice(price);
                
                // 🚀 NEW: Set to PENDING and attach screenshot
                order.setStatus("PENDING");
                order.setPaymentScreenshot(screenshotBase64);
                
                order.setShippingAddress(address.length() > 250 ? address.substring(0, 250) : address);
                order.setPhoneNumber(phone);

                fraudDetectionService.analyzeTransaction(order, recentOrders, clientIp);

                Product product = productRepository.findById(productId).orElse(null);
                if (product != null) {
                    product.setStock(Math.max(product.getStock() - qty, 0));
                    productRepository.save(product);
                    summary.append(qty).append("x ").append(product.getName()).append(" | ");
                }
                orderService.placeOrder(order);
                totalSpent += (price * qty);
            }

            // 🛰️ NON-BLOCKING EMAIL
            try {
                String trackingLink = "http://localhost:3000/register"; 
                emailService.sendGuestReceiptAndTracking(email, summary.toString(), totalSpent, trackingLink);
            } catch (Exception e) {
                System.err.println("SMTP Timeout: Guest Order successful, Email blocked.");
            }

            return ResponseEntity.ok(Map.of("message", "Guest order placed successfully!"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/tracking")
    public ResponseEntity<?> updateTrackingLocation(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order != null) {
            order.setTrackingMessage(payload.get("message"));
            orderRepository.save(order);
            return ResponseEntity.ok(order);
        }
        return ResponseEntity.notFound().build();
    }
}