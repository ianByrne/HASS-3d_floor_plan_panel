// https://www.youtube.com/c/TheCGEssentials/search?query=floor plan
// https://github.com/funwithtriangles/blender-to-threejs-export-guide/blob/master/readme.md
// https://threejsfundamentals.org/threejs/lessons/threejs-lights.html
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_loader_obj.html
// https://threejs.org/docs/index.html?q=loader#examples/en/loaders/OBJLoader

/* TODO:
- LERP the brightness attribute (0..255 to 0..1)
- if color_mode == color_temp
  - convert the color_temp to RGB (sounds complicated)
- elseif color_mode == hs_color
  - use rgb_color
*/

import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

import * as THREE from './three.module.js';
import { GLTFLoader } from './three.gltfloader.js';
import { OrbitControls } from './three.orbitcontrols.js';

class FloorplanPanel extends LitElement {

  static get properties() {
    return {
      hass: { type: Object },
      narrow: { type: Boolean },
      route: { type: Object },
      panel: { type: Object },
      container: { type: Object },
      renderer: { type: Object },
      scene: { type: Object },
      camera: { type: Object },
      entities: { type: Object },
    };
  }

  constructor() {
    super();

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;

    camera.position.set(0, 9, 6);

    scene.background = new THREE.Color(0xCCCCCC);

    // Load floorplan model
    var lights = [];
    var sensors = [];
    var binarySensors = [];

    const loader = new GLTFLoader();
    
    loader.load(
      './3d-floor-plan.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = new THREE.MeshPhongMaterial();
          }

          if (child.isLight) {
            child.castShadow = true;

            this.setLightState(child);

            lights.push(child.name);
          }

          // TODO: Somehow import sensors and binarySensors
        });

        // Centre the floorplan scene
        var box = new THREE.Box3().setFromObject(gltf.scene);
        gltf.scene.position.x = (box.max.x - box.min.x) / -2;
        gltf.scene.position.z = (box.max.z - box.min.z) / -2;

        scene.add(gltf.scene);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded')
      },
      (error) => {
        console.log(error);
      }
    );

    // Ambient light
    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
    sunLight.position.set(0,20,0);
    sunLight.target.position.set(-5,0,0);
    scene.add(sunLight);
    scene.add(sunLight.target);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.entities = {
      "lights": lights,
      "sensors": sensors,
      "binarySensors": binarySensors
    };

    (function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }());
  }

  firstUpdated() {
    this.container = this.shadowRoot.getElementById("floorplan");
    this.renderer.setSize(this.container.clientWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    const controls = new OrbitControls(this.camera, this.container);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  render() {
    // Light states
    for(var i = 0; i < this.entities["lights"].length; i++)
    {
      var light = this.scene.getObjectByName(this.entities["lights"][i]);
      
      if (light !== undefined) {
        this.setLightState(light)
      }
    }

    // TODO: Set sensor and binarySensor states

    return html`
      <div id="floorplan"></div>
    `;
  }

  setLightState(light){
    // console.log(light);
    var name = light.parent.name.replace("|",".");
    var intensity = 1;
    var colour = 'white';
    
    if (this.hass.states[name] != undefined) {
      // console.log(this.hass.states[name]);
      intensity = this.hass.states[name].state == "on" ? 1 : 0;
      // colour = this.hass.states[name].state == "on" ? 'white' : 'blue';
    }
    
    light.intensity = intensity;
    light.color.set(colour);
  }

  static get styles() {
    return css`
      :host {
        background-color: #fafafa;
        padding: 0;
        display: block;
      }
      #floorplan {
        display: block;
        padding: 0;
        margin: 0 auto;
      }
    `;
  }
}
customElements.define("floorplan-panel", FloorplanPanel);