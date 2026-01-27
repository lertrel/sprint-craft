import type { BabylonApi, CameraLike, EngineLike, SceneLike, Vec3Like } from "../../src/sprint-craft/app";

export type FakeEngine = EngineLike & {
  canvas: HTMLCanvasElement;
  antialias: boolean;
  resizeCalls: number;
  renderLoop: (() => void) | null;
};

export type FakeScene = SceneLike & {
  engine: FakeEngine;
  renderCalls: number;
  createdMeshes: string[];
  createdMeshObjects: Mesh[];
  createdLights: string[];
  clearColor?: { r: number; g: number; b: number; a: number };
  fogMode?: number;
  fogDensity?: number;
  fogColor?: { r: number; g: number; b: number };
  ambientColor?: { r: number; g: number; b: number };
};

export type FakeCamera = CameraLike & {
  name: string;
  position: Vec3Like;
  scene: FakeScene;
  target: Vec3Like | null;
};

export function createFakeBabylon(): {
  babylon: BabylonApi;
  getLastEngine: () => FakeEngine | null;
  getLastScene: () => FakeScene | null;
  getLastCamera: () => FakeCamera | null;
} {
  let lastEngine: FakeEngine | null = null;
  let lastScene: FakeScene | null = null;
  let lastCamera: FakeCamera | null = null;

  class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  class Engine implements FakeEngine {
    canvas: HTMLCanvasElement;
    antialias: boolean;
    resizeCalls = 0;
    renderLoop: (() => void) | null = null;
    constructor(canvas: HTMLCanvasElement, antialias: boolean) {
      this.canvas = canvas;
      this.antialias = antialias;
      lastEngine = this;
    }
    runRenderLoop(cb: () => void) {
      this.renderLoop = cb;
    }
    resize() {
      this.resizeCalls += 1;
    }
    dispose() {
      // no-op
    }
  }

  class Scene implements FakeScene {
    engine: FakeEngine;
    renderCalls = 0;
    createdMeshes: string[] = [];
    createdMeshObjects: Mesh[] = [];
    createdLights: string[] = [];
    constructor(engine: FakeEngine) {
      this.engine = engine;
      lastScene = this;
    }
    render() {
      this.renderCalls += 1;
    }
    dispose() {
      // no-op
    }
  }

  class FreeCamera implements FakeCamera {
    name: string;
    position: Vec3Like;
    scene: FakeScene;
    rotation = { x: 0, y: 0, z: 0 };
    fov?: number;
    target: Vec3Like | null = null;
    constructor(name: string, position: Vec3Like, scene: FakeScene) {
      this.name = name;
      this.position = position;
      this.scene = scene;
      lastCamera = this;
    }
    setTarget(target: Vec3Like) {
      this.target = target;
    }
  }

  class HemisphericLight {
    constructor(name: string, _direction: Vec3Like, scene: FakeScene) {
      scene.createdLights.push(name);
    }
  }

  class Color3 {
    r: number;
    g: number;
    b: number;
    constructor(r: number, g: number, b: number) {
      this.r = r;
      this.g = g;
      this.b = b;
    }
  }

  class Color4 {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r: number, g: number, b: number, a: number) {
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
    }
  }

  class StandardMaterial {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scene: any;
    useVertexColor = false;
    disableLighting = false;
    alpha = 1;
    wireframe = false;
    useAlphaFromDiffuseTexture = false;
    backFaceCulling = true;
    diffuseTexture: DynamicTexture | null = null;
    diffuseColor: Color3 | null = null;
    emissiveColor: Color3 | null = null;
    specularColor: Color3 | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(name: string, scene: any) {
      this.name = name;
      this.scene = scene;
    }
    dispose() {
      // no-op
    }
  }

  class Mesh {
    static BILLBOARDMODE_ALL = 7;
    name: string;
    scene: FakeScene;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    material: any = null;
    disposed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appliedVertexData: any = null;
    position = { x: 0, y: 0, z: 0 };
    rotation = { x: 0, y: 0, z: 0 };
    scaling = { x: 1, y: 1, z: 1 };
    parent: Mesh | null = null;
    billboardMode = 0;
    isPickable = true;
    isVisible = true;
    edgesEnabled = false;
    edgesWidth = 0;
    edgesColor: Color4 | { r: number; g: number; b: number; a: number } | null = null;
    constructor(name: string, scene: FakeScene) {
      this.name = name;
      this.scene = scene;
      scene.createdMeshes.push(name);
      scene.createdMeshObjects.push(this);
      lastScene = scene;
    }
    enableEdgesRendering() {
      this.edgesEnabled = true;
    }
    dispose() {
      this.disposed = true;
    }
  }

  class DynamicTexture {
    name: string;
    size: { width: number; height: number };
    lastDrawText: string | null = null;
    lastDrawTextArgs:
      | {
          text: string;
          x: number | null;
          y: number | null;
          font: string;
          color: string;
          clearColor: string;
          invertY: boolean;
        }
      | null = null;
    hasAlpha = false;
    clearRectCalls = 0;
    lastClearRect: { x: number; y: number; width: number; height: number } | null = null;
    private context = {
      clearRect: (x: number, y: number, width: number, height: number) => {
        this.clearRectCalls += 1;
        this.lastClearRect = { x, y, width, height };
      }
    };
    constructor(name: string, size: { width: number; height: number }, _scene?: unknown, _generateMipMaps?: boolean) {
      this.name = name;
      this.size = size;
    }
    drawText(
      text: string,
      x: number | null = null,
      y: number | null = null,
      font = "",
      color = "",
      clearColor = "",
      invertY = false
    ) {
      this.lastDrawText = text;
      this.lastDrawTextArgs = { text, x, y, font, color, clearColor, invertY };
    }
    getContext() {
      return this.context;
    }
    getSize() {
      return this.size;
    }
    dispose() {
      // no-op
    }
  }

  class VertexData {
    positions?: number[];
    normals?: number[];
    indices?: number[];
    colors?: number[];
    applyToMesh(mesh: Mesh) {
      mesh.appliedVertexData = {
        positions: this.positions ?? [],
        normals: this.normals ?? [],
        indices: this.indices ?? [],
        colors: this.colors ?? []
      };
    }
  }

  const MeshBuilder = {
    CreateGround: (name: string, _options: { width: number; height: number; subdivisions?: number }, scene: FakeScene) => {
      scene.createdMeshes.push(name);
      return { name };
    },
    CreateBox: (name: string, _options: { width: number; height: number; depth: number }, scene: FakeScene) =>
      new Mesh(name, scene),
    CreatePlane: (name: string, _options: { width: number; height: number }, scene: FakeScene) =>
      new Mesh(name, scene)
  };

  const babylon: BabylonApi = {
    Engine,
    Scene,
    FreeCamera,
    Vector3,
    HemisphericLight,
    MeshBuilder,
    Mesh,
    VertexData,
    StandardMaterial,
    Color3,
    Color4,
    DynamicTexture
  };

  return {
    babylon,
    getLastEngine: () => lastEngine,
    getLastScene: () => lastScene,
    getLastCamera: () => lastCamera
  };
}

