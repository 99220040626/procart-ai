package com.procart.controller;

import com.procart.model.UserAddress;
import com.procart.repository.UserAddressRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/addresses")
public class AddressController {

    @Autowired
    private UserAddressRepository addressRepository;

    @GetMapping("/{userId}")
    public List<UserAddress> getUserAddresses(@PathVariable Long userId) {
        return addressRepository.findByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<UserAddress> saveAddress(@RequestBody UserAddress address) {
        UserAddress saved = addressRepository.save(address);
        return ResponseEntity.ok(saved);
    }

    // 🚀 ENTERPRISE UPGRADE: Secure Deletion Endpoint for Cart Address Management
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAddress(@PathVariable Long id) {
        try {
            // Attempt to safely delete the address from the database
            addressRepository.deleteById(id);
            return ResponseEntity.ok().body(java.util.Map.of("message", "Address removed successfully"));
        } catch (Exception e) {
            // Graceful error handling if MySQL blocks the deletion (e.g., tied to an active order)
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }
}