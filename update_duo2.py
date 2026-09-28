import os
import re

dtos_to_clean = [
    "backend/src/main/java/com/shadowpalette/duo/dto/DuoInviteRequest.java",
    "backend/src/main/java/com/shadowpalette/duo/dto/DuoDecisionRequest.java",
    "backend/src/main/java/com/shadowpalette/duo/dto/DuoReadyRequest.java",
    "backend/src/main/java/com/shadowpalette/duo/dto/DuoRaidStartRequest.java",
    "backend/src/main/java/com/shadowpalette/duo/dto/DuoPositionMessage.java",
    "backend/src/main/java/com/shadowpalette/duo/dto/DuoSignalMessage.java",
    "backend/src/main/java/com/shadowpalette/liveraid/dto/LiveRaidStartRequest.java",
    "backend/src/main/java/com/shadowpalette/liveraid/dto/LiveRaidJoinRequest.java",
    "backend/src/main/java/com/shadowpalette/liveraid/dto/LiveRaidPositionMessage.java"
]

for filepath in dtos_to_clean:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r") as f:
        content = f.read()

    # In DuoInviteRequest, we remove hostId (who am I) but KEEP guestId
    if "DuoInviteRequest" in filepath:
        content = re.sub(r'\s*private\s+Long\s+hostId;', '', content)
    # In DuoRaidStartRequest, remove hostId
    elif "DuoRaidStartRequest" in filepath:
        content = re.sub(r'\s*private\s+Long\s+hostId;', '', content)
    # In LiveRaidStartRequest, remove attackerId
    elif "LiveRaidStartRequest" in filepath:
        content = re.sub(r'\s*private\s+Long\s+attackerId;', '', content)
    else:
        # others, remove userId
        content = re.sub(r'\s*private\s+Long\s+userId;', '', content)

    with open(filepath, "w") as f:
        f.write(content)

services = [
    "backend/src/main/java/com/shadowpalette/duo/DuoService.java",
    "backend/src/main/java/com/shadowpalette/liveraid/LiveRaidService.java"
]

for filepath in services:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r") as f:
        content = f.read()

    # Add import
    if "import com.shadowpalette.security.SecurityUtils;" not in content:
        content = re.sub(r'(package com.shadowpalette.[a-z]+;\n)',
                         r'\1\nimport com.shadowpalette.security.SecurityUtils;\n', content)

    # In DuoService, replace request.getHostId() with SecurityUtils.getCurrentUserId()
    content = content.replace("request.getHostId()", "SecurityUtils.getCurrentUserId()")
    # In DuoService, replace request.getUserId() and msg.getUserId()
    content = content.replace("request.getUserId()", "SecurityUtils.getCurrentUserId()")
    content = content.replace("msg.getUserId()", "SecurityUtils.getCurrentUserId()")

    # In LiveRaidService, replace request.getAttackerId() and request.getUserId()
    content = content.replace("request.getAttackerId()", "SecurityUtils.getCurrentUserId()")
    content = content.replace("request.getUserId()", "SecurityUtils.getCurrentUserId()")

    with open(filepath, "w") as f:
        f.write(content)

print("Done updating DTOs and Services")
