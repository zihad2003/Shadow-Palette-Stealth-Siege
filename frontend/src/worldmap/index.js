/**
 * World map component catalog (36)
 *
 * Scene core
 *  1. WorldMapScene
 *  2. MapCameraRig
 *  3. MapLights
 *  4. ClayMaterials
 *  5. MapRaycaster
 *
 * Terrain
 *  6. Ocean
 *  7. WaterRipples
 *  8. ShoreFoam
 *  9. IslandBody
 * 10. BeachRing
 * 11. CliffShelf
 * 12. StonePlaza
 * 13. InnerRoadRing
 * 14. SpokeRoads
 * 15. HarborDock
 *
 * Plots
 * 16. PlotPad
 * 17. PlotField
 * 18. PlotMarker
 * 19. PlotSelectRing
 *
 * Buildings
 * 20. CraftHouseProp
 * 21. InkHouseProp
 * 22. SleepHouseProp
 * 23. CoinMintProp
 * 24. LighthouseProp
 * 25. WatchtowerProp
 *
 * Nature
 * 26. PineTree
 * 27. CherryTree
 * 28. RockCluster
 * 29. SeaStack
 * 30. CloudLayer
 * 31. AmbientDust
 *
 * Decor
 * 32. GateArch
 * 33. BridgeSpan
 * 34. BannerPole
 * 35. CenterFountain
 * 36. FogHaze
 */

export { createMapCamera, applyMapZoom } from './MapCameraRig.js';
export { createMapLights } from './MapLights.js';
export { clayMat, CLAY } from './clayMaterials.js';
export { composeIsland } from './composeIsland.js';
