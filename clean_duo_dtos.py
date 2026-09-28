import os
import re

dirs = [
    "backend/src/main/java/com/shadowpalette/duo/dto/",
    "backend/src/main/java/com/shadowpalette/liveraid/dto/"
]

for d in dirs:
    if not os.path.exists(d):
        continue
    for filename in os.listdir(d):
        if not filename.endswith(".java"):
            continue
        path = os.path.join(d, filename)
        with open(path, "r") as f:
            content = f.read()
        
        # Remove @NotNull for userId/attackerId/hostId/guestId
        content = re.sub(r'\s*@NotNull\(message\s*=\s*"[^"]*"\)\s*private\s+Long\s+(userId|attackerId|hostId|guestId);', '', content)
        # Remove simple private Long userId;
        content = re.sub(r'\s*private\s+Long\s+(userId|attackerId|hostId|guestId);', '', content)
        
        with open(path, "w") as f:
            f.write(content)

print("Done cleaning Duo and LiveRaid DTOs.")
