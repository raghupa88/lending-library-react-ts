package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.AdminLoanResponse;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/loans")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin - Loans")
@SecurityRequirement(name = "bearerAuth")
public class AdminLoanController {

    private final AdminService adminService;

    @GetMapping
    @Operation(summary = "List all loans, optionally filtered by status (active/overdue/returned)")
    public ResponseEntity<ApiResponse<List<AdminLoanResponse>>> list(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.listLoans(status)));
    }
}
