package com.shadowpalette.controller;

import com.shadowpalette.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import com.shadowpalette.security.SecurityConfig;
import com.shadowpalette.security.CustomAuthenticationEntryPoint;
import com.shadowpalette.security.AdminApiKeyFilter;
import com.shadowpalette.security.JwtAuthenticationFilter;

@WebMvcTest(controllers = {HealthController.class, PlayerController.class})
@Import({SecurityConfig.class, JwtUtil.class, CustomAuthenticationEntryPoint.class, AdminApiKeyFilter.class, JwtAuthenticationFilter.class})
@ActiveProfiles("test")
public class AuthorizationTest {

    @MockBean
    private com.shadowpalette.service.PlayerService playerService;
    
    @MockBean
    private javax.sql.DataSource dataSource;
    
    @MockBean
    private com.shadowpalette.repository.UserRepository userRepository;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Test
    public void givenNoAuth_whenAccessProtectedResource_thenUnauthorized() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/player/home"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void givenAuth_whenAccessProtectedResource_thenOkOrNotFound() throws Exception {
        String token = jwtUtil.generateToken(1L, "testUser");
        // /api/player/home requires a valid plot for this user, so it might return 404 NOT FOUND, but not 401 UNAUTHORIZED
        mockMvc.perform(MockMvcRequestBuilders.get("/api/player/home")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound()); // Expecting 404 because user 1 doesn't exist in DB
    }

    @Test
    public void givenNoAuth_whenAccessPublicHealth_thenOk() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/health"))
                .andExpect(status().isOk());
    }

    @Test
    public void givenNoAuth_whenAccessAdminHealth_thenForbidden() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/admin/health"))
                .andExpect(status().isForbidden());
    }

    @Test
    public void givenAdminKey_whenAccessAdminHealth_thenOk() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/admin/health")
                        .header("X-Admin-Api-Key", "dev-admin-key")) // Assuming this is set in application-test.yml
                .andExpect(status().isOk());
    }
}
