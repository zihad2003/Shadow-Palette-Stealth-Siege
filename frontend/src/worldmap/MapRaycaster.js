import * as THREE from 'three';

export function createMapRaycaster(canvas, camera, plotRoot, { onHover, onSelect }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredId = null;

  function ndcFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function hitPlot(event) {
    ndcFromEvent(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(plotRoot.children, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj && obj.userData?.type !== 'plot') obj = obj.parent;
      if (obj?.userData?.plotId != null) return obj.userData.plotId;
    }
    return null;
  }

  function onMove(event) {
    const id = hitPlot(event);
    if (id !== hoveredId) {
      hoveredId = id;
      onHover?.(id);
    }
  }

  function onClick(event) {
    const id = hitPlot(event);
    if (id != null) onSelect?.(id);
  }

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('click', onClick);

  return () => {
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('click', onClick);
  };
}
