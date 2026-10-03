// MIT hand mesh from immersive-web/webxr-input-profiles; see THIRD-PARTY.md.
import fs from 'node:fs';
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
const b=fs.readFileSync('/tmp/promdevs-spline-assets/left.glb');
const jsonLength=b.readUInt32LE(12), j=JSON.parse(b.subarray(20,20+jsonLength));
const bin=b.subarray(28+jsonLength);
function accessor(id){const a=j.accessors[id],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];const ct={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[a.componentType];return new ct(bin.buffer,bin.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*n);}
const primitive=j.meshes[0].primitives[0];const p=accessor(primitive.attributes.POSITION), ix=accessor(primitive.indices);
const assembly=new T.Group(), material=new T.MeshStandardMaterial({color:0xded8ca,roughness:.78});
for(const side of [-1,1]){
 const points=[];
 for(let i=0;i<p.length;i+=3){
  const x=-(p[i+2]-.00811395)*50;
  const z=-(p[i+1]-.05598624)*50;
  const bend=Math.max(0,z-4.1);
  points.push(side===-1?x-5.5:-x+5.5,41+(p[i]+.03732416)*50-.028*bend*bend,z+1);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));const indices=Array.from(ix);if(side===1)for(let k=0;k<indices.length;k+=3)[indices[k],indices[k+2]]=[indices[k+2],indices[k]];
 g.setIndex(indices);g.computeVertexNormals();const mesh=new T.Mesh(g,material);mesh.name=side===-1?'Apollo Left Hand':'Apollo Right Hand';assembly.add(mesh);
 const control=side===-1?[[-6.1,56.5,-7],[-8.9,51,-6],[-10,43.5,-3.5],[-7.5,41.3,-1],[-5.5,41,1]]:[[20.7,52,-11.8],[20.7,46.8,-8],[17.6,41.7,-3],[10.5,40.8,-.7],[5.5,41,1]];
 const path=new T.CatmullRomCurve3(control.map(p=>new T.Vector3(...p)));
 const arm=new T.TubeGeometry(path,64,1,24,false),ap=arm.getAttribute('position');
 for(let ring=0;ring<=64;ring++){
  const t=ring/64,c=path.getPointAt(t);
  const radius=t<.14?T.MathUtils.lerp(side===1?3.5:2.9,2.7,t/.14):t<.48?T.MathUtils.lerp(2.7,1.85,(t-.14)/.34):t<.7?T.MathUtils.lerp(1.85,2.0,(t-.48)/.22):T.MathUtils.lerp(2,1.48,(t-.7)/.3);
  for(let n=0;n<=24;n++){const k=ring*25+n,v=new T.Vector3().fromBufferAttribute(ap,k).sub(c).multiplyScalar(radius).add(c);ap.setXYZ(k,v.x,v.y,v.z);}
 }
 arm.computeVertexNormals();const am=new T.Mesh(arm,material);am.name=side===-1?'Apollo Left Arm':'Apollo Right Arm';assembly.add(am);
}
globalThis.FileReader=class { readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.()})}};
fs.writeFileSync('design/spline/apollo-arms-hands.glb',Buffer.from(await new GLTFExporter().parseAsync(assembly,{binary:true})));
const bounds=new T.Box3().setFromObject(assembly);console.log({min:bounds.min,max:bounds.max,size:bounds.getSize(new T.Vector3()),center:bounds.getCenter(new T.Vector3())});
