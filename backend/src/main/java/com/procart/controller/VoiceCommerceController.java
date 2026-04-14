package com.procart.controller;

import com.procart.model.Product;
import com.procart.repository.ProductRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/voice")
public class VoiceCommerceController {

    @Autowired
    private ProductRepository productRepository;

    // 🚀 USING GROQ API KEY
    @Value("${groq.api.key}")
    private String groqApiKey;

    // 1️⃣ FOR GOOGLE ASSISTANT / ALEXA (Physical Smart Speakers)
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> handleVoiceCommand(@RequestBody Map<String, Object> payload) {
        System.out.println("🎙️ [VOICE AI] Received voice command from Google Assistant/Dialogflow!");
        String responseSpeech = "I'm sorry, I didn't understand that.";

        try {
            Map<String, Object> queryResult = (Map<String, Object>) payload.get("queryResult");
            Map<String, Object> parameters = (Map<String, Object>) queryResult.get("parameters");
            String action = (String) queryResult.get("action");
            
            if ("order.product".equals(action)) {
                String productName = (String) parameters.get("product_name");
                List<Product> matches = productRepository.findAll().stream()
                        .filter(p -> p.getName().toLowerCase().contains(productName.toLowerCase()))
                        .toList();

                if (matches.isEmpty()) {
                    responseSpeech = "I searched the ProCart warehouse, but I couldn't find any " + productName + ".";
                } else {
                    Product product = matches.get(0); 
                    if (product.getStock() > 0) {
                        int newStock = product.getStock() - 1;
                        product.setStock(newStock);
                        productRepository.save(product);
                        responseSpeech = "Success! I found the " + product.getName() + " for " + product.getPrice() + " rupees. I have placed the order and updated the warehouse stock.";
                    } else {
                        responseSpeech = "I found the " + product.getName() + ", but unfortunately, it is currently out of stock.";
                    }
                }
            } else if ("check.price".equals(action)) {
                 String productName = (String) parameters.get("product_name");
                 List<Product> matches = productRepository.findAll().stream()
                        .filter(p -> p.getName().toLowerCase().contains(productName.toLowerCase()))
                        .toList();
                  if(!matches.isEmpty()){
                      responseSpeech = "The current price of " + matches.get(0).getName() + " is " + matches.get(0).getPrice() + " rupees.";
                  } else {
                      responseSpeech = "I could not find that item to check the price.";
                  }
            }
        } catch (Exception e) {
            e.printStackTrace();
            responseSpeech = "There was a system error connecting to the database.";
        }

        Map<String, Object> response = new HashMap<>();
        response.put("fulfillmentText", responseSpeech); 
        return ResponseEntity.ok(response);
    }

    // 2️⃣ 🚀 THE TRUE GENERATIVE AI ENGINE FOR REACT (POWERED BY GROQ LLaMA 3.1)
    @PostMapping("/ask")
    public ResponseEntity<Map<String, Object>> handleTrueAIVoice(@RequestBody Map<String, String> payload) {
        String command = payload.get("text");
        System.out.println("🎙️ [WEB MIC] User said: " + command);

        try {
            // 1. Fetch all products to give the AI context of your store
            List<Product> products = productRepository.findAll();
            StringBuilder productInfo = new StringBuilder();
            for (Product p : products) {
                productInfo.append("[ID:").append(p.getId()).append(", Name:").append(p.getName()).append("] ");
            }

            // 2. The Master Prompt with the complete Site Map
            String prompt = "You are ProCart's highly intelligent AI Voice Assistant. The user just said: '" + command + "'.\n" +
                    "Here are the available products in the database: " + productInfo.toString() + "\n\n" +
                    "Determine the user's intent. You must return ONLY a raw, valid JSON object. Do not include markdown or backticks.\n" +
                    "Use this strict JSON format:\n" +
                    "{\"action\": \"ADD_TO_CART\" | \"REMOVE_FROM_CART\" | \"NAVIGATE\" | \"CLEAR_CART\" | \"CHAT\", \"reply\": \"Your conversational response to the user\", \"productId\": 123 (or null), \"route\": \"/cart\" (or null)}\n\n" +
                    "Rules:\n" +
                    "- If they want to add/buy an item, find the matching productId from the list. Action = ADD_TO_CART.\n" +
                    "- If they want to remove an item they mentioned, Action = REMOVE_FROM_CART and provide the productId.\n" +
                    "- If they ask a question or make conversation, Action = CHAT, and put the answer in 'reply'.\n" +
                    "- If they want to navigate, Action = NAVIGATE. You MUST use ONLY one of these exact routes: '/' (Home), '/products' (Products/Shop/Store), '/cart', '/profile', '/orders', '/wishlist', '/track', '/admin' (Admin Dashboard).";

            // 3. Setup Groq Request (OpenAI Compatible Format)
            RestTemplate restTemplate = new RestTemplate();
            ObjectMapper mapper = new ObjectMapper();

            // Format the message array required by Groq
            Map<String, Object> message = Map.of("role", "user", "content", prompt);
            Map<String, Object> requestBody = Map.of(
                "model", "llama-3.1-8b-instant", // THE FIX: Newly supported active model
                "messages", List.of(message),
                "temperature", 0.1 
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + groqApiKey);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // Groq API URL
            String groqUrl = "https://api.groq.com/openai/v1/chat/completions";

            // 4. Call the Groq API
            ResponseEntity<String> response = restTemplate.postForEntity(groqUrl, request, String.class);

            // 5. Extract and clean the JSON response from Groq
            JsonNode rootNode = mapper.readTree(response.getBody());
            String aiJsonResponseText = rootNode.path("choices").get(0).path("message").path("content").asText();
            
            // Clean markdown formatting if the AI gets chatty
            aiJsonResponseText = aiJsonResponseText.replace("```json", "").replace("```", "").trim();

            Map<String, Object> finalResponse = mapper.readValue(aiJsonResponseText, Map.class);

            // 6. If adding to cart, attach the actual Product object so React can render it
            if ("ADD_TO_CART".equals(finalResponse.get("action")) && finalResponse.get("productId") != null) {
                Long pId = Long.valueOf(finalResponse.get("productId").toString());
                Product p = productRepository.findById(pId).orElse(null);
                if (p != null) {
                    finalResponse.put("product", p);
                } else {
                    finalResponse.put("reply", "I couldn't find that exact item in the warehouse.");
                }
            }

            System.out.println("🤖 [GROQ AI DECISION]: " + aiJsonResponseText);
            return ResponseEntity.ok(finalResponse);

        } catch (Exception e) {
            System.err.println("❌ [GROQ AI ERROR]: Failed to connect to Groq!");
            System.err.println("❌ Exact Reason: " + e.getMessage());
            e.printStackTrace();
            
            return ResponseEntity.ok(Map.of(
                "action", "CHAT",
                "reply", "I am having trouble connecting to my neural network right now."
            ));
        }  
    }
}