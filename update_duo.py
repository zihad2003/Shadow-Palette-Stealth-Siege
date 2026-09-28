import os
import re

files_to_update = [
    "backend/src/main/java/com/shadowpalette/duo/DuoController.java",
    "backend/src/main/java/com/shadowpalette/liveraid/LiveRaidController.java",
    "backend/src/main/java/com/shadowpalette/duo/DuoService.java",
    "backend/src/main/java/com/shadowpalette/liveraid/LiveRaidService.java"
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

    # Replace msg.getUserId() or request.getUserId() -> SecurityUtils.getCurrentUserId()
    content = re.sub(r'(msg|request|message)\.getUserId\(\)', 'SecurityUtils.getCurrentUserId()', content)
    # Replace msg.getAttackerId() or request.getAttackerId() -> SecurityUtils.getCurrentUserId()
    content = re.sub(r'(msg|request|message)\.getAttackerId\(\)', 'SecurityUtils.getCurrentUserId()', content)

    with open(filepath, "w") as f:
        f.write(content)

print("Done updating Duo and LiveRaid controllers/services.")
