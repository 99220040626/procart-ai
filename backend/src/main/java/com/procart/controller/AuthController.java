package com.procart.controller;

import com.procart.dto.AuthResponseDTO; 
import com.procart.dto.LoginRequestDTO;
import com.procart.model.User;
import com.procart.security.JwtUtil; 
import com.procart.service.UserService;
import com.procart.service.EmailService;
import com.procart.repository.UserRepository; 
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository; 

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private EmailService emailService;

    // Temporary in-memory storage for Admin OTPs
    private Map<String, String> otpStorage = new ConcurrentHashMap<>();

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody User user) {
        try {
            userService.registerUser(user);
            return new ResponseEntity<>("User registered successfully!", HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>("Error: Email already exists!", HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDTO loginRequest) {
        User user = userService.loginUser(loginRequest.getEmail(), loginRequest.getPassword());
        
        if (user != null) {
            
            // 🚨 THE FIX: Your React app doesn't have an OTP screen yet!
            // When this 2FA block ran, React saved an empty token, causing the 403 Access Denied errors!
            // For now, we bypass the OTP and give the Admin their JWT token immediately.
            
            /* if ("ADMIN".equalsIgnoreCase(user.getRole())) {
                String otp = String.format("%06d", new Random().nextInt(999999));
                otpStorage.put(user.getEmail(), otp); 
                emailService.sendAdminOtpEmail(user.getEmail(), otp); 
                return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(Map.of("message", "OTP_REQUIRED", "email", user.getEmail()));
            }
            */

            // 🟢 Give EVERYONE (Users and Admins) their token immediately!
            String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
            return new ResponseEntity<>(new AuthResponseDTO(token, user.getRole(), user.getId()), HttpStatus.OK);
        } else {
            return new ResponseEntity<>("Invalid email or password", HttpStatus.UNAUTHORIZED);
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");

        // Check if OTP matches
        if (otp != null && otp.equals(otpStorage.get(email))) {
            otpStorage.remove(email); // Destroy OTP after use
            
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                // Issue the final JWT token!
                String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
                return new ResponseEntity<>(new AuthResponseDTO(token, user.getRole(), user.getId()), HttpStatus.OK);
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid or expired OTP");
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> googleData) {
        try {
            String email = googleData.get("email");
            String name = googleData.get("name");

            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null) {
                user = new User();
                user.setEmail(email);
                user.setName(name);
                user.setPassword(UUID.randomUUID().toString() + "_GOOGLE_SECRET");
                
                // Automatically make this specific email an Admin
                if ("sivasanthoshmanyam48@gmail.com".equalsIgnoreCase(email)) {
                    user.setRole("ADMIN");
                } else {
                    user.setRole("USER");
                }
                user = userRepository.save(user);
            }

            String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
            return new ResponseEntity<>(new AuthResponseDTO(token, user.getRole(), user.getId()), HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>("Error processing Google Login", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        Optional<User> userOptional = userRepository.findByEmail(email);
        
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            String token = UUID.randomUUID().toString();
            user.setResetToken(token);
            userRepository.save(user);

            String resetLink = "http://localhost:3000/reset-password?token=" + token;
            emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
        }
        return ResponseEntity.ok("If the email is registered, a reset link has been sent.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        Optional<User> userOptional = userRepository.findByResetToken(token);

        if (userOptional.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid or expired reset token.");
        }

        User user = userOptional.get();
        user.setPassword(newPassword);
        userService.registerUser(user); 
        
        user.setResetToken(null);
        userRepository.save(user);

        return ResponseEntity.ok("Password successfully reset.");
    }
}