package com.procart.repository;

import com.procart.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    
    // Teach Spring how to find a user by their email for Google Login!
    Optional<User> findByEmail(String email);

    // NEW: Teach Spring how to find a user by their secret reset token!
    Optional<User> findByResetToken(String resetToken);
}