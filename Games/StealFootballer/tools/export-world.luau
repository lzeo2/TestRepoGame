local w=workspace.FootballPartyWorld
local function point(v)return {v.X,v.Y,v.Z}end
local function matrix(cf)local x,y,z,a,b,c,d,e,f,g,h,i=cf:GetComponents();return {a,d,g,0,b,e,h,0,c,f,i,0,x,y,z,1}end
local function static(p,stop)
 if not p:IsA("BasePart")or p:IsA("MeshPart")or p:FindFirstAncestorOfClass("Accessory")then return false end
 local a=p.Parent
 while a and a~=stop do if a.Name=="CrowdSpectators"or a.Name=="EditPreview"or a.Name=="Dynamic"or a.Name=="ShieldWalls"or a:FindFirstChildOfClass("Humanoid")then return false end;a=a.Parent end
 return true
end
local function collect(root,out,group,relative)
 for _,p in ipairs(root:GetDescendants())do if static(p,root)then
  local alpha=p:GetAttribute("StadiumTransparency");if alpha==nil then alpha=p.Transparency end
  local level=p:GetAttribute("StadiumLevel")or 0;local a=p.Parent
  while a and a~=root do level=math.max(level,a:GetAttribute("StadiumLevel")or 0);a=a.Parent end
  if alpha<.99 then table.insert(out,{name=p.Name,group=group,shape=p:IsA("WedgePart")and"Wedge"or(p:IsA("Part")and p.Shape.Name or"Block"),size=point(p.Size),
   matrix=matrix(relative and relative:ToObjectSpace(p.CFrame)or p.CFrame),color="#"..p.Color:ToHex(),opacity=1-alpha,collision=p.CanCollide,minLevel=level,material=p.Material.Name})end
 end end
end
local r={sourceRevision="30b0c28",parts={},stadiumParts={},bases={},market={start={-61,3.15,20},["end"]={53,3.15,20}},npcs={}}
for _,root in ipairs(w:GetChildren())do if root.Name~="HomeStadiums"and root.Name~="EditPreview"and root.Name~="Dynamic"and root.Name~="WorldNPCs"then collect(root,r.parts,root.Name)end end
local template=w.HomeStadiums.Base1;collect(template,r.stadiumParts,"homeStadium",template.Floor.CFrame)
local function meta(b,i)
 local floor=b.Floor;local m={index=i-1,sourceIndex=i,name=b:GetAttribute("ClubName"),color="#"..floor.Color:ToHex(),position=point(floor.Position+Vector3.new(0,floor.Size.Y/2,0)),
  spawn=point(b.Spawn.Position),deposit=point(b.Deposit.Position),shield=point(b.ShieldPad.Position),upgrade=point(b.UpgradePad.Position),slots={}}
 local slots=b.Slots
 for index=1,18 do local slot=slots:FindFirstChild("Slot"..index);if slot then
  local pad=slot:IsA("BasePart")and slot or(slot:FindFirstChild("Pad")or slot:FindFirstChildWhichIsA("BasePart",true))
  if pad then m.slots[index]={position=point(pad.Position+Vector3.new(0,pad.Size.Y/2,0)),angle=b.Spawn.Position.Z>floor.Position.Z and math.pi/2 or -math.pi/2}end end end
 local mini=b:FindFirstChild("BaseStadium");local f=mini and mini:FindFirstChild("Pitch",true)
 if not f then f=mini and mini:FindFirstChild("Floor",true)end
 local front=b.Spawn.Position.Z>floor.Position.Z and 1 or -1
 local miniPosition=Vector3.new(m.position[1],m.position[2]+.013,m.position[3]-3*front)
 m.miniPitch={position=point(miniPosition),size={24,.015,22},matrix=matrix(CFrame.new(miniPosition))}
 local arena=w.HomeStadiums:FindFirstChild("Base"..i)
 if arena then m.pitch={position=point(arena.Floor.Position),size=point(arena.Floor.Size),matrix=matrix(arena.Floor.CFrame),spawn=point(arena.SpawnHome.Position),walkway=point(arena.SpectatorWalk.Position)}end
 return m
end
for i=1,12 do table.insert(r.bases,meta(w.Bases["Base"..i],i))end
r.rivalBase=meta(w.Bases.RivalBase,0)
for _,m in ipairs(w.WorldNPCs:GetChildren())do if m:IsA("Model")then local pos=m:GetPivot().Position;table.insert(r.npcs,{name=m.Name,position=point(pos),kind=m.Name:lower():find("event")and"events"or m.Name:lower():find("coach")and"staff"or"shop"})end end
_G.CodexFootballWorldExport=game.HttpService:JSONEncode(r)
return game.HttpService:JSONEncode({length=#_G.CodexFootballWorldExport,parts=#r.parts,stadiumParts=#r.stadiumParts,bases=#r.bases,slots=#r.bases[1].slots,npcs=#r.npcs})
