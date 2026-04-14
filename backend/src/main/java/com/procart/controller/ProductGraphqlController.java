package com.procart.controller;

import com.procart.model.Product;
import com.procart.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Controller
public class ProductGraphqlController {

    @Autowired
    private ProductRepository productRepository;

    // 🚀 ROUTING FLAG: Sends GraphQL queries safely to the REPLICA DB!
    @Transactional(readOnly = true)
    @QueryMapping
    public List<Product> products() {
        return productRepository.findAll();
    }

    @Transactional(readOnly = true)
    @QueryMapping
    public Product productById(@Argument Long id) {
        return productRepository.findById(id).orElse(null);
    }
}