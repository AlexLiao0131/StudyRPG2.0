import { TILE_SIZE,ELEVATION_HEIGHT } from "./coordinate-system.js";

function tileAt(state,x,y){return state?.map?.tiles?.find(tile=>tile.x===x&&tile.y===y)||null;}
function canonicalType(object){return globalThis.EnvironmentObjectEngine?.normalizeType?.(object?.type)||String(object?.type||"").toUpperCase();}
function groundY(state,x,y){const tile=tileAt(state,x,y);return Number(tile?.elevation||0)*ELEVATION_HEIGHT;}
function objectY(state,object){
  const tile=tileAt(state,object.x,object.y);if(!tile)return 0;
  if(object.floatOnWater===true&&tile.waterSurfaceZ!=null)return Number(tile.waterSurfaceZ)*ELEVATION_HEIGHT;
  return groundY(state,object.x,object.y);
}
function hash01(value){
  const text=String(value||"");let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return(h>>>0)/4294967295;
}

export class MapObjectRenderer{
  constructor(scene){
    this.scene=scene;
    this.nodes=new Map();
    this.materials={
      trunk:this.mat("prop-trunk",new BABYLON.Color3(.28,.17,.09)),
      deadTrunk:this.mat("prop-dead-trunk",new BABYLON.Color3(.25,.23,.20)),
      foliage:this.mat("prop-foliage",new BABYLON.Color3(.10,.34,.16)),
      bush:this.mat("prop-bush",new BABYLON.Color3(.13,.39,.18)),
      rock:this.mat("prop-rock",new BABYLON.Color3(.36,.38,.42)),
      generic:this.mat("prop-generic",new BABYLON.Color3(.38,.34,.28))
    };
  }

  mat(name,color){const material=new BABYLON.StandardMaterial(name,this.scene);material.diffuseColor=color;material.specularColor=BABYLON.Color3.Black();return material;}
  setNodeVisibility(node,value){node.getChildMeshes?.().forEach(mesh=>mesh.visibility=value);}
  root(object){const root=new BABYLON.TransformNode(`map-object-${object.id}`,this.scene);root.metadata={kind:"map-object",objectId:object.id,objectType:canonicalType(object)};return root;}
  mesh(root,mesh,material){mesh.parent=root;mesh.material=material;mesh.isPickable=false;return mesh;}

  createTree(object,dead=false){
    const root=this.root(object),seed=hash01(object.id),trunkMat=dead?this.materials.deadTrunk:this.materials.trunk;
    const trunk=this.mesh(root,BABYLON.MeshBuilder.CreateCylinder(`tree-trunk-${object.id}`,{height:1.25,diameter:.24,tessellation:7},this.scene),trunkMat);
    trunk.position.y=.625;
    if(!dead){
      const canopy=this.mesh(root,BABYLON.MeshBuilder.CreateCylinder(`tree-canopy-${object.id}`,{height:1.35,diameterTop:.10,diameterBottom:1.08,tessellation:8},this.scene),this.materials.foliage);
      canopy.position.y=1.48;
    }else{
      for(let i=0;i<2;i++){
        const branch=this.mesh(root,BABYLON.MeshBuilder.CreateCylinder(`dead-branch-${object.id}-${i}`,{height:.62,diameter:.08,tessellation:6},this.scene),trunkMat);
        branch.position.set((i?-.16:.16),1.05,0);branch.rotation.z=(i?-.7:.7);
      }
    }
    root.rotation.y=seed*Math.PI*2;root.scaling.setAll(.88+seed*.18);return root;
  }

  createStump(object){
    const root=this.root(object),stump=this.mesh(root,BABYLON.MeshBuilder.CreateCylinder(`stump-${object.id}`,{height:.34,diameter:.48,tessellation:8},this.scene),this.materials.trunk);
    stump.position.y=.17;root.rotation.y=hash01(object.id)*Math.PI*2;return root;
  }

  createLog(object){
    const root=this.root(object),log=this.mesh(root,BABYLON.MeshBuilder.CreateCylinder(`log-${object.id}`,{height:1.05,diameter:.30,tessellation:8},this.scene),this.materials.trunk);
    log.rotation.z=Math.PI/2;log.position.y=.18;root.rotation.y=hash01(object.id)*Math.PI*2;return root;
  }

  createBush(object){
    const root=this.root(object),seed=hash01(object.id);
    for(let i=0;i<3;i++){
      const sphere=this.mesh(root,BABYLON.MeshBuilder.CreateSphere(`bush-${object.id}-${i}`,{diameter:.58,segments:7},this.scene),this.materials.bush);
      sphere.position.set((i-1)*.24,.25+(i===1?.08:0),(i===1?.06:-.04));sphere.scaling.y=.72;
    }
    root.rotation.y=seed*Math.PI*2;root.scaling.setAll(.9+seed*.16);return root;
  }

  createBoulder(object){
    const root=this.root(object),rock=this.mesh(root,BABYLON.MeshBuilder.CreatePolyhedron(`boulder-${object.id}`,{type:2,size:.72},this.scene),this.materials.rock),seed=hash01(object.id);
    rock.scaling.set(.95+seed*.28,.75+seed*.48,.9+(1-seed)*.32);rock.rotation.set(seed*.35,seed*Math.PI*2,(1-seed)*.22);rock.position.y=.58;return root;
  }

  createGeneric(object){
    const root=this.root(object),mesh=this.mesh(root,BABYLON.MeshBuilder.CreateBox(`prop-${object.id}`,{width:.8,height:.8,depth:.8},this.scene),this.materials.generic);mesh.position.y=.4;return root;
  }

  createObject(object){
    switch(canonicalType(object)){
      case"TREE":return this.createTree(object,false);
      case"DEAD_TREE":return this.createTree(object,true);
      case"STUMP":return this.createStump(object);
      case"LOG":return this.createLog(object);
      case"BUSH":return this.createBush(object);
      case"BOULDER":
      case"ROCK":return this.createBoulder(object);
      default:return this.createGeneric(object);
    }
  }

  signature(object){return[canonicalType(object),object.destroyed?1:0,object.x,object.y,object.floatOnWater?1:0,object.durability??""].join("|");}

  sync(state){
    const alive=new Set();
    for(const object of state?.map?.objects||[]){
      if(object.destroyed||object.type==="CORE")continue;
      const key=`OBJECT:${object.id}`,signature=this.signature(object);alive.add(key);
      let entry=this.nodes.get(key);
      if(!entry||entry.signature!==signature){entry?.node?.dispose();entry={node:this.createObject(object),signature};this.nodes.set(key,entry);}
      const node=entry.node;node.position.set(Number(object.x||0)*TILE_SIZE,objectY(state,object),Number(object.y||0)*TILE_SIZE);
      const tile=tileAt(state,object.x,object.y);this.setNodeVisibility(node,tile?.fogged?.24:1);
    }
    for(const[key,entry]of this.nodes){if(alive.has(key))continue;entry.node.dispose();this.nodes.delete(key);}
  }

  diagnostics(){
    const byType={};for(const entry of this.nodes.values()){const type=entry.node.metadata?.objectType||"UNKNOWN";byType[type]=(byType[type]||0)+1;}return{total:this.nodes.size,byType};
  }
}
