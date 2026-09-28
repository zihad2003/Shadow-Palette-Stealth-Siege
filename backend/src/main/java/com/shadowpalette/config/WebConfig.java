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
    @Value("${ALLOWED_ORIGINS:}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] patterns;
        if (allowedOrigins != null && !allowedOrigins.isBlank()) {
            patterns = allowedOrigins.split(",");
            for (int i = 0; i < patterns.length; i++) {
                patterns[i] = patterns[i].trim();
            }
        } else {
            patterns = new String[] { "*" };
        }
        registry.addMapping("/**")
                .allowedOriginPatterns(patterns)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
