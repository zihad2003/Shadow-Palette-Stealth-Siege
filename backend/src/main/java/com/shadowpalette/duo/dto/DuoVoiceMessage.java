package com.shadowpalette.duo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuoVoiceMessage {
    private Long fromUserId;
    /** Base64 little-endian PCM int16, mono. */
    private String pcm;
    private int rate;
}
