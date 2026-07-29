package com.shadowpalette.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String errorCode;
    private final Double colorUsagePercent;

    public ApiException(HttpStatus status, String errorCode) {
        super(errorCode);
        this.status = status;
        this.errorCode = errorCode;
        this.colorUsagePercent = null;
    }

    public ApiException(HttpStatus status, String errorCode, Double colorUsagePercent) {
        super(errorCode);
        this.status = status;
        this.errorCode = errorCode;
        this.colorUsagePercent = colorUsagePercent;
    }
}
