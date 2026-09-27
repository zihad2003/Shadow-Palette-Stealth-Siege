package com.shadowpalette.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * Comma-separated list of allowed origins read from the ALLOWED_ORIGINS
     * environment variable. Defaults to localhost dev origins when unset.
     * On Render, set ALLOWED_ORIGINS to your Vercel domain(s), e.g.:
     *   ALLOWED_ORIGINS=https://shadow-palette.vercel.app,https://shadow-palette-git-main.vercel.app
     */
    @Value("${ALLOWED_ORIGINS:http://localhost:3000,http://localhost:5173,http://localhost:8080}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = allowedOrigins.split(",");
        for (int i = 0; i < origins.length; i++) {
            origins[i] = origins[i].trim();
        }
        registry.addMapping("/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
