"""Typeset a labeled contact sheet. Input panels are unchanged Blender renders."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,sys
root=Path(__file__).resolve().parents[2]
panels=Path(sys.argv[1]) if len(sys.argv)>1 else root/'previews/individual'
out=Path(sys.argv[2]) if len(sys.argv)>2 else root/'previews/brainrot-creature-lineup.png'
export=Path(sys.argv[3]) if len(sys.argv)>3 else root/'previews/exported'
modeldata=json.loads((export/'models.json').read_text())
W,H=2400,3010;BG='#11191a';INK='#e9e2d3';DIM='#a7b4af';ACCENT='#d0926d'
im=Image.new('RGB',(W,H),BG);draw=ImageDraw.Draw(im)
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';boldpath='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';monopath='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
F=lambda n,b=False:ImageFont.truetype(boldpath if b else fontpath,n)
M=lambda n:ImageFont.truetype(monopath,n)
left=58;gap=26;side=(W-left*2-gap*2)//3;render_h=side;label_h=108;panel_h=render_h+label_h;top=270
# Editorial header, explicit distinction from a live game capture.
draw.text((left,40),'OFFLINE ASSET RENDER',font=M(29),fill=ACCENT)
draw.text((W-left,44),'FIELD GUIDE  /  01—09',font=M(25),fill=DIM,anchor='ra')
draw.text((left,94),'BRAINROT BOULEVARD',font=F(76,True),fill=INK)
draw.text((left,195),'Stylized creatures · realism-inspired surfaces',font=F(29),fill=DIM)
draw.text((W-left,199),'ACTUAL MODELS  ·  PBR SURFACES  ·  BLENDER CYCLES',font=M(21),fill=DIM,anchor='ra')
draw.line((left,244,W-left,244),fill='#465251',width=2)
names=[m['name'] for m in modeldata['models']]+['The Uninvited']
rarity=['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC','SECRET','DIVINE','FORBIDDEN']
color=['#c3b5a0','#aaa98c','#93a496','#8fabb4','#d0ae73','#b6a1b5','#c88b70','#a9c3b1','#bb7667']
tri=[m['triangles'] for m in modeldata['models']]+[13926]
for i in range(9):
 x=left+(i%3)*(side+gap);y=top+(i//3)*(panel_h+gap)
 panel=Image.open(panels/f'{i+1:02d}-asset.png').convert('RGB').resize((side,render_h),Image.Resampling.LANCZOS)
 im.paste(panel,(x,y));draw=ImageDraw.Draw(im)
 draw.rectangle((x,y+render_h,x+side,y+panel_h),fill='#1b2627')
 draw.text((x+19,y+render_h+13),f'{i+1:02d}',font=M(27),fill=color[i])
 draw.text((x+78,y+render_h+12),names[i],font=F(31,True),fill=INK)
 draw.text((x+78,y+render_h+64),f'{rarity[i]}  /  {tri[i]:,} TRIANGLES',font=M(20),fill=DIM)
 draw.rectangle((x,y+panel_h-3,x+side,y+panel_h),fill=color[i])
y=top+3*panel_h+2*gap+36
draw.line((left,y,W-left,y),fill='#465251',width=2)
draw.text((left,y+25),'Imported from game geometry, generated texture maps and the original secret-creature GLB',font=F(23),fill=DIM)
draw.text((left,y+64),'Individual framing for surface inspection. Offline studio lighting; this is not a gameplay screenshot.',font=F(23),fill=DIM)
im.save(out,optimize=True)
# Compact JPEG companion for easy previewing; full PNG retains surface detail.
im.save(out.with_suffix('.jpg'),quality=93,subsampling=0,optimize=True)
print(out,im.size)
