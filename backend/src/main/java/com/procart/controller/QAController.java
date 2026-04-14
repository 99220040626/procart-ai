package com.procart.controller;

import com.procart.model.ProductQA;
import com.procart.repository.ProductQARepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/qa")
public class QAController {

    @Autowired
    private ProductQARepository qaRepo;

    // For Customers: Get all Q&A for a product
    @GetMapping("/product/{productId}")
    public List<ProductQA> getProductQA(@PathVariable Long productId) {
        return qaRepo.findByProductIdOrderByIdDesc(productId);
    }

    // For Admin: Get all unanswered questions
    @GetMapping("/admin/unanswered")
    public List<ProductQA> getUnanswered() {
        return qaRepo.findByAnswerIsNullOrderByIdDesc();
    }

    // For Customers: Ask a question
    @PostMapping("/ask")
    public ProductQA askQuestion(@RequestBody ProductQA qa) {
        return qaRepo.save(qa);
    }

    // For Admin: Answer a question
    @PutMapping("/answer/{id}")
    public ResponseEntity<?> answerQuestion(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        ProductQA qa = qaRepo.findById(id).orElseThrow(() -> new RuntimeException("Question not found"));
        qa.setAnswer(payload.get("answer"));
        return ResponseEntity.ok(qaRepo.save(qa));
    }
}