package com.procart.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id") 
    private Long userId;

    @Column(name = "product_id") 
    private Long productId;

    private int quantity;
    private double price;
    private String status;

    // 🚀 NEW: Holds the uploaded Payment Screenshot
    @Column(name = "payment_screenshot", columnDefinition = "LONGTEXT")
    private String paymentScreenshot;

    // 🛡️ ENCRYPTED: Shipping Address
    @Column(name = "shipping_address", columnDefinition = "TEXT")
    @ColumnTransformer(
        read = "CAST(AES_DECRYPT(UNHEX(shipping_address), 'ProCartSuperSecretKey2026') AS CHAR)",
        write = "HEX(AES_ENCRYPT(?, 'ProCartSuperSecretKey2026'))"
    )
    private String shippingAddress;

    // 🛡️ ENCRYPTED: Phone Number
    @Column(name = "phone_number")
    @ColumnTransformer(
        read = "CAST(AES_DECRYPT(UNHEX(phone_number), 'ProCartSuperSecretKey2026') AS CHAR)",
        write = "HEX(AES_ENCRYPT(?, 'ProCartSuperSecretKey2026'))"
    )
    private String phoneNumber;

    @Column(length = 500)
    private String trackingMessage = "Processing at Fulfillment Center";

    @Column(name = "order_date")
    private LocalDateTime orderDate;

    public Order() {
        this.orderDate = LocalDateTime.now(); 
    }

    // Getters and Setters
    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaymentScreenshot() { return paymentScreenshot; }
    public void setPaymentScreenshot(String paymentScreenshot) { this.paymentScreenshot = paymentScreenshot; }
    
    public String getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }
    
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getTrackingMessage() { return trackingMessage; }
    public void setTrackingMessage(String trackingMessage) { this.trackingMessage = trackingMessage; }

    public LocalDateTime getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDateTime orderDate) { this.orderDate = orderDate; }
}