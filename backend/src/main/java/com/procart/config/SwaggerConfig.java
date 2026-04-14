package com.procart.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("ProCart Enterprise E-Commerce API")
                        .version("v1.0.0")
                        .description("Fully functional, auto-scaling backend API for the ProCart E-Commerce platform. Features include JWT Zero-Trust Security, Hugging Face AI Visual Search, Master-Replica DB routing, and Kubernetes auto-scaling.")
                        .contact(new Contact()
                                .name("ProCart Technologies") // Change this to your name/agency!
                                .email("contact@procart.com")
                                .url("https://github.com/yourusername"))
                        .license(new License()
                                .name("Commercial License")
                                .url("https://procart.com/license")))
                
                // 🚀 ENTERPRISE POLISH: Adds the "Authorize" padlock to the UI
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .name("bearerAuth")
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    
    }
}