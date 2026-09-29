import os
import re

files_to_update = [
    "backend/src/main/java/com/shadowpalette/service/BuildingService.java",
    "backend/src/main/java/com/shadowpalette/service/DefenseService.java",
    "backend/src/main/java/com/shadowpalette/service/PlotService.java",
    "backend/src/main/java/com/shadowpalette/service/PresenceService.java",
    "backend/src/main/java/com/shadowpalette/service/RaidService.java",
    "backend/src/main/java/com/shadowpalette/builder/RaidSessionBuilder.java"
]

for filepath in files_to_update:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r") as f:
        content = f.read()

    # Add import if missing
    if "import com.shadowpalette.security.SecurityUtils;" not in content:
        content = re.sub(r'(package com.shadowpalette.[a-z]+;\n)',
                         r'\1\nimport com.shadowpalette.security.SecurityUtils;\n', content)

    # Replace request.getUserId() -> SecurityUtils.getCurrentUserId()
    content = content.replace("request.getUserId()", "SecurityUtils.getCurrentUserId()")
    # Replace request.getAttackerId() -> SecurityUtils.getCurrentUserId()
    content = content.replace("request.getAttackerId()", "SecurityUtils.getCurrentUserId()")
    # Replace request.getHostId() -> SecurityUtils.getCurrentUserId()
    content = content.replace("request.getHostId()", "SecurityUtils.getCurrentUserId()")

    with open(filepath, "w") as f:
        f.write(content)

print("Done updating services.")
