package com.procart.service;

import com.procart.model.Product;
import com.procart.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private ProductService productService;

    @Test
    public void testGetProductById() {
        // 1. Arrange: Create a fake product to simulate the database
        Product fakeProduct = new Product();
        fakeProduct.setId(1L);
        fakeProduct.setName("Gaming Laptop");
        fakeProduct.setPrice(85000.0);
        fakeProduct.setCategory("Electronics");

        // Tell Mockito: "When the service asks the repository for ID 1, return this fake product"
        when(productRepository.findById(1L)).thenReturn(Optional.of(fakeProduct));

        // 2. Act: Call the actual service method
        Product result = productService.getProductById(1L);

        // 3. Assert: Check if the service returned the correct data
        assertNotNull(result);
        assertEquals("Gaming Laptop", result.getName());
        assertEquals(85000.0, result.getPrice());
    }
}