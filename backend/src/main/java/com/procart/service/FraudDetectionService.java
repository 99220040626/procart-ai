package com.procart.service;

import com.procart.model.Order;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate; // 🚀 NEW: WebSocket Broadcaster
import net.devh.boot.grpc.client.inject.GrpcClient;
import com.procart.grpc.FraudServiceGrpc;
import com.procart.grpc.FraudRequest;
import com.procart.grpc.FraudResponse;

import java.util.List;

@Service
public class FraudDetectionService {

    @GrpcClient("fraudService")
    private FraudServiceGrpc.FraudServiceBlockingStub fraudStub;

    // 🚀 NEW: This lets us send live messages to the frontend
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void analyzeTransaction(Order currentOrder, List<Order> userRecentOrders, String clientIpAddress) {
        System.out.println("🛡️ [JAVA] Sending transaction to Python AI for analysis...");

        int recentOrdersCount = (userRecentOrders != null) ? userRecentOrders.size() : 0;

        FraudRequest request = FraudRequest.newBuilder()
                .setAmount((float) currentOrder.getPrice())
                .setQuantity(currentOrder.getQuantity())
                .setIpAddress(clientIpAddress != null ? clientIpAddress : "unknown")
                .setRecentOrders(recentOrdersCount)
                .build();

        FraudResponse response = fraudStub.checkFraud(request);

        System.out.println("🧠 [PYTHON AI] Returned Risk Score: " + response.getRiskScore());
        System.out.println("🧠 [PYTHON AI] Recommendation: " + response.getRecommendation());

        if ("BLOCK".equals(response.getRecommendation())) {
            System.out.println("🚨 TRANSACTION BLOCKED BY AI! Suspected Fraud.");
            
            // 🚀 NEW: Broadcast the live alert to the Admin Dashboard!
            String alertMessage = "🚨 FRAUD ATTEMPT BLOCKED! IP: " + clientIpAddress + " tried to buy " + currentOrder.getQuantity() + " items.";
            messagingTemplate.convertAndSend("/topic/admin/alerts", alertMessage);
            
            throw new RuntimeException("SECURITY ALERT: AI blocked transaction due to high fraud risk.");
        } else {
            System.out.println("✅ AI cleared the transaction. Proceeding to payment.");
            
            // 🚀 Optional: Broadcast successful high-value sales to a live sales ticker!
            if (currentOrder.getPrice() > 10000) {
                messagingTemplate.convertAndSend("/topic/admin/sales", "💰 HIGH VALUE SALE: ₹" + currentOrder.getPrice());
            }
        }
    }
}