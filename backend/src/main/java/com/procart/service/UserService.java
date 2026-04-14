package com.procart.service;

import com.procart.model.User;
import com.procart.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public User registerUser(User user) {
        // If they don't provide a role, make them a normal "USER" by default
        if (user.getRole() == null || user.getRole().isEmpty()) {
            user.setRole("USER");
        }
        return userRepository.save(user);
    }

    public User loginUser(String email, String password) {
        Optional<User> user = userRepository.findByEmail(email);
        
        // Check if the user exists AND if the password matches
        if (user.isPresent() && user.get().getPassword().equals(password)) {
            return user.get(); // Success!
        }
        return null; // Failed!
    }
}