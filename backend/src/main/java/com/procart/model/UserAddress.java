package com.procart.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;

@Entity
public class UserAddress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private String label; // e.g., "Home", "Office", "Parents"

    // 🛡️ ENCRYPTED: Street Address
    @Column(name = "street_address")
    @ColumnTransformer(
        read = "CAST(AES_DECRYPT(UNHEX(street_address), 'ProCartSuperSecretKey2026') AS CHAR)",
        write = "HEX(AES_ENCRYPT(?, 'ProCartSuperSecretKey2026'))"
    )
    private String streetAddress;

    // 🛡️ ENCRYPTED: Phone Number
    @Column(name = "phone_number")
    @ColumnTransformer(
        read = "CAST(AES_DECRYPT(UNHEX(phone_number), 'ProCartSuperSecretKey2026') AS CHAR)",
        write = "HEX(AES_ENCRYPT(?, 'ProCartSuperSecretKey2026'))"
    )
    private String phoneNumber;

    public UserAddress() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getStreetAddress() { return streetAddress; }
    public void setStreetAddress(String streetAddress) { this.streetAddress = streetAddress; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}