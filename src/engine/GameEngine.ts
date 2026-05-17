import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  Color3,
  Color4,
  StandardMaterial,
  MeshBuilder,
  SceneLoader,
  DefaultRenderingPipeline,
  SSAORenderingPipeline,
  Animation
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera | null = null;
  private shadowGenerator: ShadowGenerator | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(this.canvas, true);
    this.scene = new Scene(this.engine);

    this.setupCamera();
    this.setupScene();
    this.setupLights();

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private setupScene() {
    // Transparent background so the beautiful CSS grand_line_bg.png shows through!
    this.scene.clearColor = new Color4(0, 0, 0, 0);

    // Default Rendering Pipeline (Bloom, Chromatic Aberration, Grain)
    const pipeline = new DefaultRenderingPipeline(
      'defaultPipeline',
      true, // isHDR
      this.scene,
      [this.camera!]
    );

    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.9;
    pipeline.bloomWeight = 0.15;
    pipeline.bloomKernel = 64;

    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 1.0; // Subtler effect

    // SSAO for better depth perception
    const ssao = new SSAORenderingPipeline('ssao', this.scene, 0.75, [this.camera!]);
    ssao.totalStrength = 1.0;
    ssao.radius = 0.001;
  }

  private setupCamera() {
    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3.5,
      15,
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(this.canvas, true);
    this.camera.lowerRadiusLimit = 5;
    this.camera.upperRadiusLimit = 30;
    this.camera.wheelPrecision = 50;
  }

  public rotateCameraForSide(side: 'w' | 'b') {
    if (!this.camera) return;
    this.camera.alpha = side === 'w' ? -Math.PI / 2 : Math.PI / 2;
  }

  private setupLights() {
    const ambientLight = new HemisphericLight(
      'ambientLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    ambientLight.intensity = 0.5;

    const dirLight = new DirectionalLight(
      'dirLight',
      new Vector3(-1, -2, -1),
      this.scene
    );
    dirLight.position = new Vector3(10, 20, 10);
    dirLight.intensity = 0.8;

    this.shadowGenerator = new ShadowGenerator(1024, dirLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;
  }

  public getScene(): Scene {
    return this.scene;
  }

  public getShadowGenerator(): ShadowGenerator | null {
    return this.shadowGenerator;
  }

  public focusCameraOn(target: Vector3, duration: number = 1000) {
    if (!this.camera) return;

    const animation = new Animation(
      'cameraFocus',
      'target',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keys = [
      { frame: 0, value: this.camera.target.clone() },
      { frame: 60, value: target }
    ];

    animation.setKeys(keys);
    this.camera.animations = [animation];
    this.scene.beginAnimation(this.camera, 0, 60, false);
  }

  public dispose() {
    this.engine.dispose();
  }
}
