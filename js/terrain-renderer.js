import { TILE_SIZE,ELEVATION_HEIGHT } from "./coordinate-system.js";

const SURFACE_SIZE=TILE_SIZE*.94;
const TOP_THICKNESS=.06;
const EDGE_THICKNESS=Math.max(.06,TILE_SIZE-SURFACE_SIZE+.01);
const DIRS=[
  {id:"N",dx:0,dy:-1,axis:"Z",sign:-1},
  {id:"E",dx:1,dy:0,axis:"X",sign:1},
  {id:"S",dx:0,dy:1,axis:"Z",sign:1},
  {id:"W",dx:-1,dy:0,axis:"X",sign:-1}
];

const keyOf=(x,y)=>`${x},${y}`;
const tilesOf=state=>state?.map?.tiles||state?.grid?.tiles||[];
const elevationOf=tile=>Number(tile?.elevation||0);

export class TerrainRenderer{
  constructor(scene){
    this.scene=scene;
    this.meshes=new Map();
    this.materials={
      soil:this.mat("soil",new BABYLON.Color3(.30,.42,.24)),
      forest:this.mat("forest",new BABYLON.Color3(.16,.34,.20)),
      sand:this.mat("sand",new BABYLON.Color3(.66,.58,.38)),
      rock:this.mat("rock",new BABYLON.Color3(.34,.36,.39)),
      mud:this.mat("mud",new BABYLON.Color3(.35,.27,.17)),
      wall:this.mat("wall",new BABYLON.Color3(.24,.25,.28))
    };
  }

  mat(name,color){
    const material=new BABYLON.StandardMaterial(name,this.scene);
    material.diffuseColor=color;
    material.specularColor=BABYLON.Color3.Black();
    return material;
  }

  topMaterial(tile){
    return tile.terrain==="MUD"?this.materials.mud:
      tile.terrain==="SAND"?this.materials.sand:
      tile.terrain==="FOREST"?this.materials.forest:
      tile.terrain==="WALL"?this.materials.wall:
      (tile.terrain==="HIGH_GROUND"||tile.material==="ROCK"?this.materials.rock:this.materials.soil);
  }

  sideMaterial(tile){
    if(tile.terrain==="WALL")return this.materials.wall;
    if(tile.terrain==="SAND")return this.materials.sand;
    if(elevationOf(tile)>0||tile.terrain==="HIGH_GROUND"||tile.material==="ROCK")return this.materials.rock;
    return this.materials.soil;
  }

  disposeTile(key){
    const entry=this.meshes.get(key);
    if(!entry)return;
    entry.root.dispose();
    this.meshes.delete(key);
  }

  signature(tile,byKey,boundaryBase){
    const neighbors=DIRS.map(dir=>{
      const neighbor=byKey.get(keyOf(tile.x+dir.dx,tile.y+dir.dy));
      return neighbor?elevationOf(neighbor):boundaryBase;
    });
    return[
      tile.terrain||"",
      tile.material||"",
      elevationOf(tile),
      tile.fogged?1:0,
      boundaryBase,
      ...neighbors
    ].join("|");
  }

  createTile(tile,byKey,boundaryBase,signature){
    const key=keyOf(tile.x,tile.y);
    const elevation=elevationOf(tile);
    const topY=elevation*ELEVATION_HEIGHT;
    const root=new BABYLON.TransformNode(`terrain-${key}`,this.scene);
    root.position.set(tile.x*TILE_SIZE,0,tile.y*TILE_SIZE);

    const top=BABYLON.MeshBuilder.CreateBox(
      `terrain-top-${key}`,
      {width:SURFACE_SIZE,depth:SURFACE_SIZE,height:TOP_THICKNESS},
      this.scene
    );
    top.parent=root;
    top.position.y=topY-TOP_THICKNESS/2;
    top.material=this.topMaterial(tile);
    top.metadata={kind:"terrain-top",x:tile.x,y:tile.y};
    top.isPickable=false;
    top.receiveShadows=true;

    const children=[top];
    const sideMaterial=this.sideMaterial(tile);

    for(const dir of DIRS){
      const neighbor=byKey.get(keyOf(tile.x+dir.dx,tile.y+dir.dy));
      const neighborElevation=neighbor?elevationOf(neighbor):boundaryBase;
      if(elevation<=neighborElevation+.0001)continue;

      const lowerY=neighborElevation*ELEVATION_HEIGHT;
      const height=(elevation-neighborElevation)*ELEVATION_HEIGHT;
      const options=dir.axis==="X"
        ?{width:EDGE_THICKNESS,depth:SURFACE_SIZE,height}
        :{width:SURFACE_SIZE,depth:EDGE_THICKNESS,height};

      const face=BABYLON.MeshBuilder.CreateBox(
        `terrain-cliff-${key}-${dir.id}`,
        options,
        this.scene
      );
      face.parent=root;
      face.position.y=(topY+lowerY)/2;
      if(dir.axis==="X")face.position.x=dir.sign*TILE_SIZE/2;
      else face.position.z=dir.sign*TILE_SIZE/2;
      face.material=sideMaterial;
      face.metadata={kind:"terrain-cliff",x:tile.x,y:tile.y,side:dir.id,fromElevation:elevation,toElevation:neighborElevation};
      face.isPickable=false;
      face.receiveShadows=true;
      children.push(face);
    }

    const visibility=tile.fogged?.38:1;
    children.forEach(mesh=>mesh.visibility=visibility);
    this.meshes.set(key,{root,children,signature});
  }

  sync(state){
    const tiles=tilesOf(state);
    const byKey=new Map(tiles.map(tile=>[keyOf(tile.x,tile.y),tile]));
    const minElevation=tiles.length?Math.min(...tiles.map(elevationOf)):0;
    const boundaryBase=minElevation-.25;
    const alive=new Set();

    for(const tile of tiles){
      const key=keyOf(tile.x,tile.y);alive.add(key);
      const signature=this.signature(tile,byKey,boundaryBase),current=this.meshes.get(key);
      if(current?.signature===signature)continue;
      this.disposeTile(key);this.createTile(tile,byKey,boundaryBase,signature);
    }

    for(const key of [...this.meshes.keys()])if(!alive.has(key))this.disposeTile(key);
  }
}
