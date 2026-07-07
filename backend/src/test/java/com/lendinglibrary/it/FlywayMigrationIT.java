package com.lendinglibrary.it;

import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The H2 unit-test suite runs every migration in `MODE=PostgreSQL`
 * compatibility mode, which can mask real dialect gaps (case sensitivity,
 * numeric/date handling, Postgres-specific SQL Flyway generates). This is
 * the first test in the project to run the actual migration set against a
 * real Postgres — the "next hardening slice" ADR-007 explicitly deferred.
 */
@SpringBootTest
@Testcontainers
class FlywayMigrationIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    DataSource dataSource;

    @Autowired
    UserRepository userRepository;

    @Test
    void allMigrationsApplySuccessfullyToRealPostgres() throws Exception {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "select count(*) from flyway_schema_history where success = true")) {
            rs.next();
            assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(10);
        }
    }

    @Test
    void noFailedMigrations() throws Exception {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "select count(*) from flyway_schema_history where success = false")) {
            rs.next();
            assertThat(rs.getInt(1)).isZero();
        }
    }

    @Test
    void userEntityRoundTripsThroughTheRealDialect() {
        User saved = userRepository.save(User.builder()
                .email("pg-roundtrip@example.com")
                .passwordHash("hash")
                .firstName("Postgres")
                .lastName("Roundtrip")
                .build());

        assertThat(userRepository.findById(saved.getId())).isPresent();
        assertThat(userRepository.findByEmail("pg-roundtrip@example.com")).isPresent();
    }
}
