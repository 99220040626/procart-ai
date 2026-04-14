package com.procart.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🛡️ ENCRYPTED: Name
    @Column(name = "name")
    @ColumnTransformer(
        read = "CAST(AES_DECRYPT(UNHEX(name), 'ProCartSuperSecretKey2026') AS CHAR)",
        write = "HEX(AES_ENCRYPT(?, 'ProCartSuperSecretKey2026'))"
    )
    private String name;

    // 🔓 UNENCRYPTED: Email (Required for login!)
    @Column(name = "email", unique = true)
    private String email;
    
    private String password;
    private String role; 

    private String resetToken;

    @Column(nullable = false, columnDefinition = "integer default 0")
    private int walletBalance = 0;

    public User() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getResetToken() { return resetToken; }
    public void setResetToken(String resetToken) { this.resetToken = resetToken; }

    public int getWalletBalance() { return walletBalance; }
    public void setWalletBalance(int walletBalance) { this.walletBalance = walletBalance; }
}