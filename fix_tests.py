import os
import re

test_files = [
    "backend/src/test/java/com/shadowpalette/duo/DuoFlowTest.java",
    "backend/src/test/java/com/shadowpalette/liveraid/LiveRaidFlowTest.java",
    "backend/src/test/java/com/shadowpalette/service/RaidValidatorTest.java"
]

for filepath in test_files:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r") as f:
        content = f.read()

    # Remove .hostId(...)
    content = re.sub(r'\.hostId\([^)]*\)', '', content)
    # Remove .userId(...)
    content = re.sub(r'\.userId\([^)]*\)', '', content)
    # Remove .attackerId(...)
    content = re.sub(r'\.attackerId\([^)]*\)', '', content)

    with open(filepath, "w") as f:
        f.write(content)

print("Done fixing tests.")
