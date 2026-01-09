import {
  Engine,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Vector3
} from "@babylonjs/core";
import { initAppFromDom } from "./sprint-craft/app";

initAppFromDom({
  babylon: { Engine, Scene, FreeCamera, Vector3, HemisphericLight, MeshBuilder }
});

