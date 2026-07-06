package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.AdminUserResponse;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin - Users")
@SecurityRequirement(name = "bearerAuth")
public class AdminUserController {

    private final AdminService adminService;

    @GetMapping
    @Operation(summary = "List all members with plan and active-loan counts")
    public ResponseEntity<ApiResponse<List<AdminUserResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.listUsers()));
    }
}
