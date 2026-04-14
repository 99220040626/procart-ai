package com.procart.controller;

import com.procart.model.User;
import com.procart.repository.UserRepository;
import com.procart.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    @Autowired
    private EmailService emailService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/receipt")
    public ResponseEntity<?> triggerReceipt(@RequestBody Map<String, Object> request) {
        // Extract the data sent from React
        Long userId = Long.valueOf(request.get("userId").toString());
        double total = Double.valueOf(request.get("total").toString());
        String summary = request.get("summary").toString();

        // Find the user in the database so we know where to send the email!
        User user = userRepository.findById(userId).orElse(null);
        
        if (user != null && user.getEmail() != null) {
            emailService.sendHtmlReceipt(user.getEmail(), user.getName(), summary, total);
            return ResponseEntity.ok("Email receipt dispatched!");
        }
        
        return ResponseEntity.badRequest().body("Could not find user email.");
    }
}