import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.155.0/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Set the background color to white
scene.background = new THREE.Color(0x00395e);

// Floor (large enough for big blocks)
const floorGeometry = new THREE.BoxGeometry(1000, 10, 1000);
const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x7f828f });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.y = -5;
scene.add(floor);

// Add a 300x300 light grey square to the floor
const squareGeometry = new THREE.PlaneGeometry(300, 300);
const squareMaterial = new THREE.MeshPhongMaterial({ color: 0xcfd0d5, side: THREE.DoubleSide });
const square = new THREE.Mesh(squareGeometry, squareMaterial);
square.rotation.x = -Math.PI / 2; // Lay flat on the floor
square.position.y = 0.1; // Slightly above the floor to avoid z-fighting
scene.add(square);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(500, 1000, 750);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Shapes array
const shapes = [];
function addShape(geometry, x, y, z, color = 0x44aa88) {
  const material = new THREE.MeshPhongMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  shapes.push(mesh);
}

// Start the three cubes inside the 300x300 square (|x| <= 150 and |z| <= 150)
addShape(new THREE.BoxGeometry(100, 100, 100), -75, 50, -300, 0xdfa1e4); // top left
addShape(new THREE.BoxGeometry(100, 100, 100), 75, 50, -300, 0x7638b3);  // top right
addShape(new THREE.BoxGeometry(100, 100, 100), 0, 50, 350, 0xdfa1e4);    // bottom center

// Three rectangles on the left (x < -200)
addShape(new THREE.BoxGeometry(200, 200, 100), -350, 100, -300, 0xa4e574); // left, back
addShape(new THREE.BoxGeometry(100, 200, 200), -350, 100, 0, 0x6e90bf);    // left, center
addShape(new THREE.BoxGeometry(200, 100, 200), -350, 50, 350, 0xffb400);   // left, front

// Three rectangles on the right (x > 200)
addShape(new THREE.BoxGeometry(200, 200, 100), 350, 100, -300, 0xffb400);  // right, back
addShape(new THREE.BoxGeometry(100, 200, 200), 350, 100, 0, 0xa4e574);     // right, center
addShape(new THREE.BoxGeometry(200, 100, 200), 350, 50, 350, 0x6e90bf);    // right, front

// Camera
camera.position.set(50, 600, 800);
camera.lookAt(0, 0, 0);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.enableZoom = false; // <--- Disable zooming
controls.mouseButtons = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE
};

// Drag and drop logic
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedShape = null;
let dragOffset = new THREE.Vector3();
let dragPlane = new THREE.Plane();
let isDragging = false;
let lastSelectedShape = null;
const gridSize = 10;

function getIntersectedShape(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(shapes);
  return intersects.length > 0 ? intersects[0] : null;
}

// Only handle dragging (left mouse button)
window.addEventListener('pointerdown', (event) => {
  if (event.button === 0) { // left mouse button
    const intersect = getIntersectedShape(event);
    if (intersect) {
      selectedShape = intersect.object;
      lastSelectedShape = selectedShape;
      isDragging = true;
      dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, selectedShape.position.y, 0)
      );
      raycaster.ray.intersectPlane(dragPlane, dragOffset);
      dragOffset.sub(selectedShape.position);
      // Disable OrbitControls while dragging
      controls.enabled = false;
    }
  }
});

window.addEventListener('pointermove', (event) => {
  if (!isDragging || !selectedShape) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersection = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
    const box = new THREE.Box3().setFromObject(selectedShape);
    const size = new THREE.Vector3();
    box.getSize(size);
    const x = Math.round((intersection.x - dragOffset.x) / gridSize) * gridSize;
    const z = Math.round((intersection.z - dragOffset.z) / gridSize) * gridSize;
    let maxY = size.y / 2;
    shapes.forEach(shape => {
      if (shape !== selectedShape) {
        const otherBox = new THREE.Box3().setFromObject(shape);
        const otherSize = new THREE.Vector3();
        otherBox.getSize(otherSize);
        const dx = Math.abs(shape.position.x - x);
        const dz = Math.abs(shape.position.z - z);
        if (
          dx < (size.x + otherSize.x) / 2 &&
          dz < (size.z + otherSize.z) / 2
        ) {
          maxY = Math.max(maxY, shape.position.y + otherSize.y / 2 + size.y / 2);
        }
      }
    });
    selectedShape.position.x = x;
    selectedShape.position.z = z;
    selectedShape.position.y = maxY;
  }
});

window.addEventListener('pointerup', () => {
  isDragging = false;
  selectedShape = null;
  // Re-enable OrbitControls after dragging
  controls.enabled = true;
});

// Prevent context menu on right-click for a smoother experience
window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

window.addEventListener('keydown', (event) => {
  if (!lastSelectedShape) return;
  let moved = false;
  let moveVec = new THREE.Vector3();

  // Get camera's forward and right directions on XZ plane
  const cameraDir = new THREE.Vector3();
  camera.getWorldDirection(cameraDir);
  cameraDir.y = 0;
  cameraDir.normalize();

  const rightDir = new THREE.Vector3();
  rightDir.crossVectors(camera.up, cameraDir).normalize();

  switch (event.key) {
    case 'ArrowUp':
      moveVec.copy(cameraDir).multiplyScalar(gridSize);
      moved = true;
      break;
    case 'ArrowDown':
      moveVec.copy(cameraDir).multiplyScalar(-gridSize);
      moved = true;
      break;
    case 'ArrowLeft':
      moveVec.copy(rightDir).multiplyScalar(gridSize); // Swapped direction
      moved = true;
      break;
    case 'ArrowRight':
      moveVec.copy(rightDir).multiplyScalar(-gridSize); // Swapped direction
      moved = true;
      break;
  }
  if (moved) {
    const box = new THREE.Box3().setFromObject(lastSelectedShape);
    const size = new THREE.Vector3();
    box.getSize(size);
    const x = Math.round((lastSelectedShape.position.x + moveVec.x) / gridSize) * gridSize;
    const z = Math.round((lastSelectedShape.position.z + moveVec.z) / gridSize) * gridSize;

    let maxY = size.y / 2;
    shapes.forEach(shape => {
      if (shape !== lastSelectedShape) {
        const otherBox = new THREE.Box3().setFromObject(shape);
        const otherSize = new THREE.Vector3();
        otherBox.getSize(otherSize);
        const dx2 = Math.abs(shape.position.x - x);
        const dz2 = Math.abs(shape.position.z - z);
        if (
          dx2 < (size.x + otherSize.x) / 2 &&
          dz2 < (size.z + otherSize.z) / 2
        ) {
          maxY = Math.max(maxY, shape.position.y + otherSize.y / 2 + size.y / 2);
        }
      }
    });

    lastSelectedShape.position.x = x;
    lastSelectedShape.position.z = z;
    lastSelectedShape.position.y = maxY;
  }
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();