package com.lendinglibrary.controller;

import com.lendinglibrary.api.controller.AdminLoanController;
import com.lendinglibrary.api.controller.AdminUserController;
import com.lendinglibrary.api.dto.AdminLoanResponse;
import com.lendinglibrary.api.dto.AdminUserResponse;
import com.lendinglibrary.application.service.AdminService;
import com.lendinglibrary.infrastructure.security.JwtProvider;
import com.lendinglibrary.infrastructure.security.UserDetailsServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({AdminUserController.class, AdminLoanController.class})
@AutoConfigureMockMvc(addFilters = false)
class AdminControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean AdminService adminService;
    @MockBean JwtProvider jwtProvider;
    @MockBean UserDetailsServiceImpl userDetailsService;

    @Test
    void listUsers_returnsMembersWithPlanAndLoanCount() throws Exception {
        var user = new AdminUserResponse(UUID.randomUUID(), "Test Member",
                "member@example.com", "member", true, "basic", 2, LocalDateTime.now());
        when(adminService.listUsers()).thenReturn(List.of(user));

        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].email").value("member@example.com"))
                .andExpect(jsonPath("$.data[0].plan").value("basic"))
                .andExpect(jsonPath("$.data[0].activeLoans").value(2));
    }

    @Test
    void listLoans_passesStatusFilter() throws Exception {
        var loan = new AdminLoanResponse(UUID.randomUUID(), UUID.randomUUID(),
                "The Alchemist", "Test Member", "member@example.com",
                LocalDateTime.now().minusDays(20), LocalDateTime.now().minusDays(6),
                null, "OVERDUE");
        when(adminService.listLoans(any())).thenReturn(List.of(loan));

        mockMvc.perform(get("/api/v1/admin/loans").param("status", "overdue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].status").value("OVERDUE"))
                .andExpect(jsonPath("$.data[0].bookTitle").value("The Alchemist"));
    }
}
