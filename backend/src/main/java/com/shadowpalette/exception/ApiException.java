package com.shadowpalette.exception;

import com.shadowpalette.dto.ValidatedOutcomeDto;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String errorCode;
    private final Double colorUsagePercent;
    private final Integer successfulRaidsNeeded;
    private final ValidatedOutcomeDto validatedOutcome;

    public ApiException(HttpStatus status, String errorCode) {
        super(errorCode);
        this.status = status;
        this.errorCode = errorCode;
        this.colorUsagePercent = null;
        this.successfulRaidsNeeded = null;
        this.validatedOutcome = null;
    }

    public ApiException(HttpStatus status, String errorCode, Double colorUsagePercent) {
        super(errorCode);
        this.status = status;
        this.errorCode = errorCode;
        this.colorUsagePercent = colorUsagePercent;
        this.successfulRaidsNeeded = null;
        this.validatedOutcome = null;
    }

    public ApiException(HttpStatus status, String errorCode, Integer successfulRaidsNeeded) {
        super(errorCode);
        this.status = status;
        this.errorCode = errorCode;
        this.colorUsagePercent = null;
        this.successfulRaidsNeeded = successfulRaidsNeeded;
        this.validatedOutcome = null;
    }

    public ApiException(HttpStatus status, String errorCode, ValidatedOutcomeDto validatedOutcome) {
        super(errorCode);
        this.status = status;
        this.errorCode = errorCode;
        this.colorUsagePercent = null;
        this.successfulRaidsNeeded = null;
        this.validatedOutcome = validatedOutcome;
    }
}
