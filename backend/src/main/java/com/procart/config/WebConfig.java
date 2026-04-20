package com.procart.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.TimeUnit;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(
                        "https://*.vercel.app", 
                        "https://procart-ai-nine.vercel.app",
                        "http://localhost:3000", 
                        "http://localhost:8080"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization", "Content-Type", "X-Total-Count")
                .allowCredentials(true)
                .maxAge(3600); // Caches preflight OPTIONS requests for 1 hour to reduce network latency
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Fallback robust path resolution for cloud container environments (Render/Linux)
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:./uploads/", "file:uploads/", "classpath:/static/uploads/")
                .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().mustRevalidate());
    }
}