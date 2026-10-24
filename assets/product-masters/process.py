import numpy as np, sys, json, os
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

A='/mnt/user-data/attachments/4fd73c98-7638-5ca6-acc8-7a87dfc39562/'
OUT='/home/claude/reset/public/products/'
MAS='/home/claude/reset/assets/product-masters/'
CANVAS=800; FIT=700  # product fits inside 700px, centred on an 800px white square

ITEMS=[
 ('94186287-image.png','benylin-dry-cough-syrup'),
 ('23939b4d-image.png','omron-flex-temp-digital-thermometer'),
 ('1632c6bb-image.png','mb-paracetamol-500mg-tablets-8x12'),
 ('4b6e2673-image.png','flo-baby-saline-nasal-drops-15ml'),
 ('27c5ff7f-image.png','dettol-antiseptic-liquid-100ml'),
 ('33e7d4c3-image.png','dr-max-vitamin-c-500mg-effervescent-20'),
 ('48835ffb-image.png','trioral-oral-rehydration-salts-sachet'),
 ('e98cdbb1-image.png','bristol-paracetamol-500mg-tablets-16'),
 ('a56c58f2-image.png','tesco-health-fabric-plasters-light-40'),
 ('2443a073-image.png','amodent-original-toothpaste-100ml'),
 ('1bf72685-image.png','rolaids-original-antacid-96-chewable'),
 ('d0c50d5a-image.png','burnaid-burn-gel-25g'),
 ('5c99c786-image.png','coldcap-original-capsules-12'),
 ('482e0c57-image.png','zyrtec-allergy-cetirizine-10mg-30-tablets'),
]
report={}
for f,slug in ITEMS:
    im=Image.open(A+f).convert('RGB')
    # lossless master
    im.save(MAS+slug+'.webp',lossless=True,quality=100,method=6)
    a=np.asarray(im).astype(np.int16)
    h,w,_=a.shape
    mx=a.max(2); mn=a.min(2); lum=a.mean(2); sat=(mx-mn)
    if slug.startswith('mb-'):
        # studio backdrop is a pale blue-grey gradient: replace only that backdrop with white
        r,g,b=a[...,0],a[...,1],a[...,2]
        light=(lum>205)&((b-r)>=6)&((b-g)>=0)
        lab,n=ndi.label(light)
        border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
        bg=np.isin(lab,list(border))
        m=Image.fromarray((bg*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))
        mm=np.asarray(m).astype(np.float32)[...,None]/255
        out=(a*(1-mm)+255*mm).astype(np.uint8)
        fg=~bg
    elif slug.startswith('coldcap-'):
        # source has a faint off-white rectangle behind the box: whiten only that flat backdrop
        c=np.median(np.concatenate([a[0],a[-1],a[:,0],a[:,-1]]),axis=0)
        dist=np.abs(a-c).max(2)
        light=(dist<=9)&(lum>228)
        lab,n=ndi.label(light)
        border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
        bg=np.isin(lab,list(border))
        m=Image.fromarray((bg*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
        mm=np.asarray(m).astype(np.float32)[...,None]/255
        out=(a*(1-mm)+255*mm).astype(np.uint8)
        fg=ndi.binary_opening(~bg,iterations=3)
        lab2,n2=ndi.label(fg)
        sizes=ndi.sum(fg,lab2,range(1,n2+1)); big=1+int(np.argmax(sizes))
        keep=ndi.binary_dilation(ndi.binary_fill_holes(lab2==big),iterations=6)
        out=np.where(keep[...,None],out,255).astype(np.uint8)
        fg=lab2==big
    else:
        out=a.astype(np.uint8)
        fg=(lum<244)|(sat>14)
    fg=ndi.binary_opening(fg,iterations=2)
    ys,xs=np.where(fg)
    box=(max(0,xs.min()-4),max(0,ys.min()-4),min(w,xs.max()+5),min(h,ys.max()+5))
    mode='mb-backdrop' if slug.startswith('mb-') else 'trim-only'; ring_bg=0
    img=Image.fromarray(out.astype(np.uint8)).crop(box)
    cw,ch=img.size
    s=min(FIT/cw,FIT/ch)
    ups=s>1.25
    s=min(s,1.25)
    nw,nh=max(1,round(cw*s)),max(1,round(ch*s))
    img=img.resize((nw,nh),Image.LANCZOS)
    canvas=Image.new('RGB',(CANVAS,CANVAS),(255,255,255))
    canvas.paste(img,((CANVAS-nw)//2,(CANVAS-nh)//2))
    canvas.save(OUT+slug+'.webp','WEBP',quality=88,method=6)
    report[slug]=dict(src=f,srcSize=[w,h],mode=mode,ringBg=round(float(ring_bg),2),trim=[int(x) for x in box],scale=round(s,2),limitedUpscale=bool(ups),kb=os.path.getsize(OUT+slug+'.webp')//1024)
    print(slug,report[slug])
json.dump(report,open('/tmp/claude-0/-home-claude/4fd73c98-7638-5ca6-acc8-7a87dfc39562/scratchpad/work/process-report.json','w'),indent=1)
# contact sheet
from PIL import ImageDraw
fs=sorted(os.listdir(OUT)); S=260; cols=5
sheet=Image.new('RGB',(cols*S,((len(fs)+cols-1)//cols)*(S+16)),(235,235,235)); d=ImageDraw.Draw(sheet)
for i,f in enumerate(fs):
    t=Image.open(OUT+f).convert('RGB').resize((S-10,S-10)); x=(i%cols)*S; y=(i//cols)*(S+16)
    sheet.paste(t,(x+5,y+16)); d.text((x+5,y+2),f[:34],fill=(200,0,0))
sheet.save('/tmp/claude-0/-home-claude/4fd73c98-7638-5ca6-acc8-7a87dfc39562/scratchpad/work/sheet2.png')
