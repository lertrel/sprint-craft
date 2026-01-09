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
  createdLights: string[];
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

  const MeshBuilder = {
    CreateGround: (name: string, _options: { width: number; height: number; subdivisions?: number }, scene: FakeScene) => {
      scene.createdMeshes.push(name);
      return { name };
    }
  };

  const babylon: BabylonApi = {
    Engine,
    Scene,
    FreeCamera,
    Vector3,
    HemisphericLight,
    MeshBuilder
  };

  return {
    babylon,
    getLastEngine: () => lastEngine,
    getLastScene: () => lastScene,
    getLastCamera: () => lastCamera
  };
}

