import os
import re

dtos = [
    "VisitStateRequest.java",
    "BuildingUpgradeRequest.java",
    "PlotClaimRequest.java",
    "DefensePlaceRequest.java",
    "BuildingPlaceRequest.java",
    "PresenceHeartbeatRequest.java",
    "VisitDecisionRequest.java",
    "RaidCompleteRequest.java",
    "VisitInviteRequest.java"
]

base_dir = "backend/src/main/java/com/shadowpalette/dto/"

for dto in dtos:
    path = os.path.join(base_dir, dto)
    if not os.path.exists(path):
        continue
    with open(path, "r") as f:
        content = f.read()
    
    # Remove @NotNull for userId/attackerId/hostId
    content = re.sub(r'\s*@NotNull\(message\s*=\s*"[^"]*"\)\s*private\s+Long\s+(userId|attackerId|hostId|guestId);', '', content)
    # Remove simple private Long userId;
    content = re.sub(r'\s*private\s+Long\s+(userId|attackerId|hostId|guestId);', '', content)
    
    with open(path, "w") as f:
        f.write(content)

print("Done replacing in DTOs.")
