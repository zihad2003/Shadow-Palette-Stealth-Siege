package com.shadowpalette;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

@SpringBootApplication
@EnableScheduling
public class ShadowPaletteApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShadowPaletteApplication.class, args);
    }

    /**
     * Logs whether the active JDBC connection is using SSL at startup.
     * This makes it easy to verify Aiven's sslMode=REQUIRED from Render's logs.
     */
    @Bean
    ApplicationRunner sslVerifier(DataSource dataSource) {
        return args -> {
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                // Works for MySQL — returns the cipher in use (empty string if no SSL).
                ResultSet rs = stmt.executeQuery("SHOW STATUS LIKE 'Ssl_cipher'");
                if (rs.next()) {
                    String cipher = rs.getString("Value");
                    if (cipher != null && !cipher.isEmpty()) {
                        System.out.println("[SSL-CHECK] ✅ Database connection is using SSL. Cipher: " + cipher);
                    } else {
                        System.out.println("[SSL-CHECK] ⚠️  Database connection is NOT using SSL.");
                    }
                } else {
                    System.out.println("[SSL-CHECK] ℹ️  Could not determine SSL status (non-MySQL driver?).");
                }
            } catch (Exception e) {
                // H2 or other non-MySQL driver — not an error, just informational.
                System.out.println("[SSL-CHECK] ℹ️  SSL check skipped (driver may not support SHOW STATUS): " + e.getMessage());
            }
        };
    }
}