package com.procart.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    // 🚀 OFFICIAL PHONEPE UAT (TEST) CREDENTIALS
    private final String MERCHANT_ID = "PGTESTPAYUAT";
    private final String SALT_KEY = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
    private final String SALT_INDEX = "1";
    private final String PHONEPE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";

    @PostMapping("/phonepe-init")
    public ResponseEntity<?> initPayment(@RequestBody Map<String, Object> data) {
        try {
            String transactionId = "TXN" + System.currentTimeMillis();
            // PhonePe expects the amount in Paise (₹1 = 100 paise)
            long amount = (long) (Double.parseDouble(data.get("amount").toString()) * 100);
            String userId = data.getOrDefault("userId", "MUID123").toString();

            // 1. Build the exact JSON payload PhonePe requires
            Map<String, Object> payload = new HashMap<>();
            payload.put("merchantId", MERCHANT_ID);
            payload.put("merchantTransactionId", transactionId);
            payload.put("merchantUserId", userId);
            payload.put("amount", amount);
            // 🚀 THE FIX: Tell PhonePe to redirect to your Vercel site after payment
            payload.put("redirectUrl", "https://procart-ai-nine.vercel.app/cart"); 
            payload.put("redirectMode", "REDIRECT");
            payload.put("callbackUrl", "https://webhook.site/callback"); 
            payload.put("paymentInstrument", Map.of("type", "PAY_PAGE"));

            ObjectMapper mapper = new ObjectMapper();
            String jsonPayload = mapper.writeValueAsString(payload);
            
            // 2. Convert to Base64
            String base64Payload = Base64.getEncoder().encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));

            // 3. Generate the X-VERIFY Checksum (SHA-256)
            String endpoint = "/pg/v1/pay";
            String stringToHash = base64Payload + endpoint + SALT_KEY;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(stringToHash.getBytes(StandardCharsets.UTF_8));
            
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            String xVerify = hexString.toString() + "###" + SALT_INDEX;

            // 4. Send the secure POST request to PhonePe servers
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PHONEPE_URL))
                    .header("Content-Type", "application/json")
                    .header("X-VERIFY", xVerify)
                    .POST(HttpRequest.BodyPublishers.ofString("{\"request\":\"" + base64Payload + "\"}"))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = mapper.readTree(response.body());

            // 5. Extract the secure payment link
            if (root.path("success").asBoolean()) {
                String redirectUrl = root.path("data").path("instrumentResponse").path("redirectInfo").path("url").asText();
                return ResponseEntity.ok(Map.of(
                        "redirectUrl", redirectUrl, 
                        "transactionId", transactionId
                ));
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "PhonePe Gateway Failed", "details", response.body()));
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Payment routing error: " + e.getMessage()));
        }
    }
}