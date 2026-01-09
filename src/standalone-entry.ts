import {
  Engine,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Vector3
} from "@babylonjs/core";
import { initAppFromDom } from "./sprint-craft/app";

// Entry used by `vite.standalone.config.ts` to generate an IIFE bundle.
initAppFromDom({
  babylon: { Engine, Scene, FreeCamera, Vector3, HemisphericLight, MeshBuilder }
});

