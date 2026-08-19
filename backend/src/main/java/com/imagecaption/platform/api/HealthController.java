package com.imagecaption.platform.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Health API", description = "Backend liveness health check endpoint")
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "Backend Liveness Check", description = "Returns status UP when the Spring Boot backend service is running.")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "backend"
        ));
    }
}
