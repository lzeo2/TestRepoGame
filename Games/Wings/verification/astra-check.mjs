import Fe from"node:assert/strict";import{readFileSync as hw}from"node:fs";import{resolve as ym}from"node:path";import{createHash as dw}from"node:crypto";var fo=1;var po=3,vr=0,Hn=1,hs=2;var mo=0,go=1,_o=2,ds=0,Sr=1,Tr=2,Mr=3,Ar=4,xo=5,Er=6,wr=7;var Rr=301,fs=302;var yo=306,bo=1000,vo=1001,So=1002,Cr=1003;var To=1008;var Ir=1013,Nr=1014;var Mo=1021,Ao=1022;var Eo=1026,wo=1027,Ro=1028,Co=1029,Pr=1030,Io=1031,No=1032;var Po=37490;var Lo=36285;var ps=0,Fo=1,Lr="";var Fr="srgb",ms="",Dr="rg",Do="ga";var Uo=512,Ur=513,Bo=514,Br=515,gs=516,Oo=517,_s=518,ko=519,Or=35044;var xs=2000,ys=2001;var Vo={TEXTURE_COMPARE:"depthTextureCompare"};function du(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function ho(e){return document.createElementNS("http://www.w3.org/1999/xhtml",e)}var Zc={},Ri=null;function us(...e){let t="THREE."+e.shift();if(Ri)Ri("log",t,...e);else console.log(t,...e)}function fu(e){let t=e[0];if(typeof t==="string"&&t.startsWith("TSL:")){let n=e[1];if(n&&n.isStackTrace)e[0]+=" "+n.getLocation();else e[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return e}function Q(...e){e=fu(e);let t="THREE."+e.shift();if(Ri)Ri("warn",t,...e);else{let n=e[0];if(n&&n.isStackTrace)console.warn(n.getError(t));else console.warn(t,...e)}}function Y(...e){e=fu(e);let t="THREE."+e.shift();if(Ri)Ri("error",t,...e);else{let n=e[0];if(n&&n.isStackTrace)console.error(n.getError(t));else console.error(t,...e)}}function zt(...e){let t=e.join(" ");if(t in Zc)return;Zc[t]=!0,Q(...e)}class on{addEventListener(e,t){if(this._listeners===void 0)this._listeners={};let n=this._listeners;if(n[e]===void 0)n[e]=[];if(n[e].indexOf(t)===-1)n[e].push(t)}hasEventListener(e,t){let n=this._listeners;if(n===void 0)return!1;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let i=n[e];if(i!==void 0){let s=i.indexOf(t);if(s!==-1)i.splice(s,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let i=n.slice(0);for(let s=0,r=i.length;s<r;s++)i[s].call(this,e);e.target=null}}}var Qe=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],jc=1234567,ls=Math.PI/180,Ci=180/Math.PI;function zn(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Qe[e&255]+Qe[e>>8&255]+Qe[e>>16&255]+Qe[e>>24&255]+"-"+Qe[t&255]+Qe[t>>8&255]+"-"+Qe[t>>16&15|64]+Qe[t>>24&255]+"-"+Qe[n&63|128]+Qe[n>>8&255]+"-"+Qe[n>>16&255]+Qe[n>>24&255]+Qe[i&255]+Qe[i>>8&255]+Qe[i>>16&255]+Qe[i>>24&255]).toLowerCase()}function ee(e,t,n){return Math.max(t,Math.min(n,e))}function Go(e,t){return(e%t+t)%t}function Rm(e,t,n,i,s){return i+(e-t)*(s-i)/(n-t)}function Cm(e,t,n){if(e!==t)return(n-e)/(t-e);else return 0}function cs(e,t,n){return(1-n)*e+n*t}function Im(e,t,n,i){return cs(e,t,1-Math.exp(-n*i))}function Nm(e,t=1){return t-Math.abs(Go(e,t*2)-t)}function Pm(e,t,n){if(e<=t)return 0;if(e>=n)return 1;return e=(e-t)/(n-t),e*e*(3-2*e)}function Lm(e,t,n){if(e<=t)return 0;if(e>=n)return 1;return e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10)}function Fm(e,t){return e+Math.floor(Math.random()*(t-e+1))}function Dm(e,t){return e+Math.random()*(t-e)}function Um(e){return e*(0.5-Math.random())}function Bm(e){if(e!==void 0)jc=e;let t=jc+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Om(e){return e*ls}function km(e){return e*Ci}function Vm(e){return e>0&&Number.isInteger(e)&&2**Math.round(Math.log2(e))===e}function Gm(e){return Math.pow(2,Math.ceil(Math.log(e)/Math.LN2))}function zm(e){return Math.pow(2,Math.floor(Math.log(e)/Math.LN2))}function Hm(e,t,n,i,s){let{cos:r,sin:a}=Math,o=r(n/2),l=a(n/2),c=r((t+i)/2),u=a((t+i)/2),h=r((t-i)/2),d=a((t-i)/2),f=r((i-t)/2),p=a((i-t)/2);switch(s){case"XYX":e.set(o*u,l*h,l*d,o*c);break;case"YZY":e.set(l*d,o*u,l*h,o*c);break;case"ZXZ":e.set(l*h,l*d,o*u,o*c);break;case"XZX":e.set(o*u,l*p,l*f,o*c);break;case"YXY":e.set(l*f,o*u,l*p,o*c);break;case"ZYZ":e.set(l*p,l*f,o*u,o*c);break;default:Q("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Lt(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:case Uint8ClampedArray:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw Error("THREE.MathUtils: Invalid component type.")}}function de(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw Error("THREE.MathUtils: Invalid component type.")}}var wn={DEG2RAD:ls,RAD2DEG:Ci,generateUUID:zn,clamp:ee,euclideanModulo:Go,mapLinear:Rm,inverseLerp:Cm,lerp:cs,damp:Im,pingpong:Nm,smoothstep:Pm,smootherstep:Lm,randInt:Fm,randFloat:Dm,randFloatSpread:Um,seededRandom:Bm,degToRad:Om,radToDeg:km,isPowerOfTwo:Vm,ceilPowerOfTwo:Gm,floorPowerOfTwo:zm,setQuaternionFromProperEuler:Hm,normalize:de,denormalize:Lt};class Ue{static{Ue.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=ee(this.x,e.x,t.x),this.y=ee(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=ee(this.x,e,t),this.y=ee(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ee(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(ee(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),i=Math.sin(t),s=this.x-e.x,r=this.y-e.y;return this.x=s*n-r*i+e.x,this.y=s*i+r*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class ve{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,s,r,a){let o=n[i+0],l=n[i+1],c=n[i+2],u=n[i+3],h=s[r+0],d=s[r+1],f=s[r+2],p=s[r+3];if(u!==p||o!==h||l!==d||c!==f){let m=o*h+l*d+c*f+u*p;if(m<0)h=-h,d=-d,f=-f,p=-p,m=-m;let g=1-a;if(m<0.9995){let _=Math.acos(m),x=Math.sin(_);g=Math.sin(g*_)/x,a=Math.sin(a*_)/x,o=o*g+h*a,l=l*g+d*a,c=c*g+f*a,u=u*g+p*a}else{o=o*g+h*a,l=l*g+d*a,c=c*g+f*a,u=u*g+p*a;let _=1/Math.sqrt(o*o+l*l+c*c+u*u);o*=_,l*=_,c*=_,u*=_}}e[t]=o,e[t+1]=l,e[t+2]=c,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,i,s,r){let a=n[i],o=n[i+1],l=n[i+2],c=n[i+3],u=s[r],h=s[r+1],d=s[r+2],f=s[r+3];return e[t]=a*f+c*u+o*d-l*h,e[t+1]=o*f+c*h+l*u-a*d,e[t+2]=l*f+c*d+a*h-o*u,e[t+3]=c*f-a*u-o*h-l*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let{_x:n,_y:i,_z:s,_order:r}=e,{cos:a,sin:o}=Math,l=a(n/2),c=a(i/2),u=a(s/2),h=o(n/2),d=o(i/2),f=o(s/2);switch(r){case"XYZ":this._x=h*c*u+l*d*f,this._y=l*d*u-h*c*f,this._z=l*c*f+h*d*u,this._w=l*c*u-h*d*f;break;case"YXZ":this._x=h*c*u+l*d*f,this._y=l*d*u-h*c*f,this._z=l*c*f-h*d*u,this._w=l*c*u+h*d*f;break;case"ZXY":this._x=h*c*u-l*d*f,this._y=l*d*u+h*c*f,this._z=l*c*f+h*d*u,this._w=l*c*u-h*d*f;break;case"ZYX":this._x=h*c*u-l*d*f,this._y=l*d*u+h*c*f,this._z=l*c*f-h*d*u,this._w=l*c*u+h*d*f;break;case"YZX":this._x=h*c*u+l*d*f,this._y=l*d*u+h*c*f,this._z=l*c*f-h*d*u,this._w=l*c*u-h*d*f;break;case"XZY":this._x=h*c*u-l*d*f,this._y=l*d*u-h*c*f,this._z=l*c*f+h*d*u,this._w=l*c*u+h*d*f;break;default:Q("Quaternion: .setFromEuler() encountered an unknown order: "+r)}if(t===!0)this._onChangeCallback();return this}setFromAxisAngle(e,t){let n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],i=t[4],s=t[8],r=t[1],a=t[5],o=t[9],l=t[2],c=t[6],u=t[10],h=n+a+u;if(h>0){let d=0.5/Math.sqrt(h+1);this._w=0.25/d,this._x=(c-o)*d,this._y=(s-l)*d,this._z=(r-i)*d}else if(n>a&&n>u){let d=2*Math.sqrt(1+n-a-u);this._w=(c-o)/d,this._x=0.25*d,this._y=(i+r)/d,this._z=(s+l)/d}else if(a>u){let d=2*Math.sqrt(1+a-n-u);this._w=(s-l)/d,this._x=(i+r)/d,this._y=0.25*d,this._z=(o+c)/d}else{let d=2*Math.sqrt(1+u-n-a);this._w=(r-i)/d,this._x=(s+l)/d,this._y=(o+c)/d,this._z=0.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;if(n<0.00000001)if(n=0,Math.abs(e.x)>Math.abs(e.z))this._x=-e.y,this._y=e.x,this._z=0,this._w=n;else this._x=0,this._y=-e.z,this._z=e.y,this._w=n;else this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n;return this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(ee(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();if(e===0)this._x=0,this._y=0,this._z=0,this._w=1;else e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e;return this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let{_x:n,_y:i,_z:s,_w:r}=e,{_x:a,_y:o,_z:l,_w:c}=t;return this._x=n*c+r*a+i*l-s*o,this._y=i*c+r*o+s*a-n*l,this._z=s*c+r*l+n*o-i*a,this._w=r*c-n*a-i*o-s*l,this._onChangeCallback(),this}slerp(e,t){let{_x:n,_y:i,_z:s,_w:r}=e,a=this.dot(e);if(a<0)n=-n,i=-i,s=-s,r=-r,a=-a;let o=1-t;if(a<0.9995){let l=Math.acos(a),c=Math.sin(l);o=Math.sin(o*l)/c,t=Math.sin(t*l)/c,this._x=this._x*o+n*t,this._y=this._y*o+i*t,this._z=this._z*o+s*t,this._w=this._w*o+r*t,this._onChangeCallback()}else this._x=this._x*o+n*t,this._y=this._y*o+i*t,this._z=this._z*o+s*t,this._w=this._w*o+r*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class w{static{w.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){if(n===void 0)n=this.z;return this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Qc.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Qc.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*i,this.y=s[1]*t+s[4]*n+s[7]*i,this.z=s[2]*t+s[5]*n+s[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,s=e.elements,r=1/(s[3]*t+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*i+s[12])*r,this.y=(s[1]*t+s[5]*n+s[9]*i+s[13])*r,this.z=(s[2]*t+s[6]*n+s[10]*i+s[14])*r,this}applyQuaternion(e){let t=this.x,n=this.y,i=this.z,{x:s,y:r,z:a,w:o}=e,l=2*(r*i-a*n),c=2*(a*t-s*i),u=2*(s*n-r*t);return this.x=t+o*l+r*u-a*c,this.y=n+o*c+a*l-s*u,this.z=i+o*u+s*c-r*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*i,this.y=s[1]*t+s[5]*n+s[9]*i,this.z=s[2]*t+s[6]*n+s[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=ee(this.x,e.x,t.x),this.y=ee(this.y,e.y,t.y),this.z=ee(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=ee(this.x,e,t),this.y=ee(this.y,e,t),this.z=ee(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ee(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let{x:n,y:i,z:s}=e,{x:r,y:a,z:o}=t;return this.x=i*o-s*a,this.y=s*r-n*o,this.z=n*a-i*r,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return to.copy(this).projectOnVector(e),this.sub(to)}reflect(e){return this.sub(to.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(ee(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}var to=new w,Qc=new ve;class H{static{H.prototype.isMatrix3=!0}constructor(e,t,n,i,s,r,a,o,l){if(this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0)this.set(e,t,n,i,s,r,a,o,l)}set(e,t,n,i,s,r,a,o,l){let c=this.elements;return c[0]=e,c[1]=i,c[2]=a,c[3]=t,c[4]=s,c[5]=o,c[6]=n,c[7]=r,c[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,s=this.elements,r=n[0],a=n[3],o=n[6],l=n[1],c=n[4],u=n[7],h=n[2],d=n[5],f=n[8],p=i[0],m=i[3],g=i[6],_=i[1],x=i[4],b=i[7],S=i[2],v=i[5],A=i[8];return s[0]=r*p+a*_+o*S,s[3]=r*m+a*x+o*v,s[6]=r*g+a*b+o*A,s[1]=l*p+c*_+u*S,s[4]=l*m+c*x+u*v,s[7]=l*g+c*b+u*A,s[2]=h*p+d*_+f*S,s[5]=h*m+d*x+f*v,s[8]=h*g+d*b+f*A,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],r=e[4],a=e[5],o=e[6],l=e[7],c=e[8];return t*r*c-t*a*l-n*s*c+n*a*o+i*s*l-i*r*o}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],r=e[4],a=e[5],o=e[6],l=e[7],c=e[8],u=c*r-a*l,h=a*o-c*s,d=l*s-r*o,f=t*u+n*h+i*d;if(f===0)return this.set(0,0,0,0,0,0,0,0,0);let p=1/f;return e[0]=u*p,e[1]=(i*l-c*n)*p,e[2]=(a*n-i*r)*p,e[3]=h*p,e[4]=(c*t-i*o)*p,e[5]=(i*s-a*t)*p,e[6]=d*p,e[7]=(n*o-l*t)*p,e[8]=(r*t-n*s)*p,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,s,r,a){let o=Math.cos(s),l=Math.sin(s);return this.set(n*o,n*l,-n*(o*r+l*a)+r+e,-i*l,i*o,-i*(-l*r+o*a)+a+t,0,0,1),this}scale(e,t){return zt("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(no.makeScale(e,t)),this}rotate(e){return zt("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(no.makeRotation(-e)),this}translate(e,t){return zt("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(no.makeTranslation(e,t)),this}makeTranslation(e,t){if(e.isVector2)this.set(1,0,e.x,0,1,e.y,0,0,1);else this.set(1,0,e,0,1,t,0,0,1);return this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}var no=new H,Jc=new H().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),eu=new H().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);function Wm(){let e={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(s,r,a){if(this.enabled===!1||r===a||!r||!a)return s;if(this.spaces[r].transfer==="srgb")s.r=an(s.r),s.g=an(s.g),s.b=an(s.b);if(this.spaces[r].primaries!==this.spaces[a].primaries)s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ);if(this.spaces[a].transfer==="srgb")s.r=wi(s.r),s.g=wi(s.g),s.b=wi(s.b);return s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){if(s==="")return"linear";return this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return zt("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),e.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return zt("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),e.colorSpaceToWorking(s,r)}},t=[0.64,0.33,0.3,0.6,0.15,0.06],n=[0.2126,0.7152,0.0722],i=[0.3127,0.329];return e.define({["srgb-linear"]:{primaries:t,whitePoint:i,transfer:"linear",toXYZ:Jc,fromXYZ:eu,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:t,whitePoint:i,transfer:"srgb",toXYZ:Jc,fromXYZ:eu,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}}),e}var Le=Wm();function an(e){return e<0.04045?e*0.0773993808:Math.pow(e*0.9478672986+0.0521327014,2.4)}function wi(e){return e<0.0031308?e*12.92:1.055*Math.pow(e,0.41666)-0.055}var yi;class zo{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src))return e.src;if(typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{if(yi===void 0)yi=ho("canvas");yi.width=e.width,yi.height=e.height;let i=yi.getContext("2d");if(e instanceof ImageData)i.putImageData(e,0,0);else i.drawImage(e,0,0,e.width,e.height);n=yi}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=ho("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let i=n.getImageData(0,0,e.width,e.height),s=i.data;for(let r=0;r<s.length;r++)s[r]=an(s[r]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)if(t instanceof Uint8Array||t instanceof Uint8ClampedArray)t[n]=Math.floor(an(t[n]/255)*255);else t[n]=an(t[n]);return{data:t,width:e.width,height:e.height}}else return Q("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}var $m=0;class bs{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:$m++}),this.uuid=zn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;if(typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement)e.set(t.videoWidth,t.videoHeight,0);else if(typeof VideoFrame<"u"&&t instanceof VideoFrame)e.set(t.displayWidth,t.displayHeight,0);else if(t!==null)e.set(t.width,t.height,t.depth||0);else e.set(0,0,0);return e}set needsUpdate(e){if(e===!0)this.version++}toJSON(e){let t=e===void 0||typeof e==="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let s;if(Array.isArray(i)){s=[];for(let r=0,a=i.length;r<a;r++)if(i[r].isDataTexture)s.push(io(i[r].image));else s.push(io(i[r]))}else s=io(i);n.url=s}if(!t)e.images[this.uuid]=n;return n}}function io(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap)return zo.getDataURL(e);else if(e.data)return{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name};else return Q("Texture: Unable to serialize Texture."),{}}var qm=0,so=new w;class at extends on{constructor(e=at.DEFAULT_IMAGE,t=at.DEFAULT_MAPPING,n=1001,i=1001,s=1006,r=1008,a=1023,o=1009,l=at.DEFAULT_ANISOTROPY,c=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:qm++}),this.uuid=zn(),this.name="",this.source=new bs(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=r,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=o,this.offset=new Ue(0,0),this.repeat=new Ue(1,1),this.center=new Ue(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new H,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=c,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=e&&e.depth&&e.depth>1?!0:!1,this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(so).x}get height(){return this.source.getSize(so).y}get depth(){return this.source.getSize(so).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){Q(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let i=this[t];if(i===void 0){Q(`Texture.setValues(): property '${t}' does not exist.`);continue}if(i&&n&&(i.isVector2&&n.isVector2))i.copy(n);else if(i&&n&&(i.isVector3&&n.isVector3))i.copy(n);else if(i&&n&&(i.isMatrix3&&n.isMatrix3))i.copy(n);else this[t]=n}}toJSON(e){let t=e===void 0||typeof e==="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)n.userData=this.userData;if(!t)e.textures[this.uuid]=n;return n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case 1000:e.x=e.x-Math.floor(e.x);break;case 1001:e.x=e.x<0?0:1;break;case 1002:if(Math.abs(Math.floor(e.x)%2)===1)e.x=Math.ceil(e.x)-e.x;else e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case 1000:e.y=e.y-Math.floor(e.y);break;case 1001:e.y=e.y<0?0:1;break;case 1002:if(Math.abs(Math.floor(e.y)%2)===1)e.y=Math.ceil(e.y)-e.y;else e.y=e.y-Math.floor(e.y);break}if(this.flipY)e.y=1-e.y;return e}set needsUpdate(e){if(e===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate(e){if(e===!0)this.pmremVersion++}}at.DEFAULT_IMAGE=null;at.DEFAULT_MAPPING=300;at.DEFAULT_ANISOTROPY=1;class Ht{static{Ht.prototype.isVector4=!0}constructor(e=0,t=0,n=0,i=1){this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,s=this.w,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i+r[12]*s,this.y=r[1]*t+r[5]*n+r[9]*i+r[13]*s,this.z=r[2]*t+r[6]*n+r[10]*i+r[14]*s,this.w=r[3]*t+r[7]*n+r[11]*i+r[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);if(t<0.0001)this.x=1,this.y=0,this.z=0;else this.x=e.x/t,this.y=e.y/t,this.z=e.z/t;return this}setAxisAngleFromRotationMatrix(e){let t,n,i,s,r=0.01,a=0.1,o=e.elements,l=o[0],c=o[4],u=o[8],h=o[1],d=o[5],f=o[9],p=o[2],m=o[6],g=o[10];if(Math.abs(c-h)<0.01&&Math.abs(u-p)<0.01&&Math.abs(f-m)<0.01){if(Math.abs(c+h)<0.1&&Math.abs(u+p)<0.1&&Math.abs(f+m)<0.1&&Math.abs(l+d+g-3)<0.1)return this.set(1,0,0,0),this;t=Math.PI;let x=(l+1)/2,b=(d+1)/2,S=(g+1)/2,v=(c+h)/4,A=(u+p)/4,E=(f+m)/4;if(x>b&&x>S)if(x<0.01)n=0,i=0.707106781,s=0.707106781;else n=Math.sqrt(x),i=v/n,s=A/n;else if(b>S)if(b<0.01)n=0.707106781,i=0,s=0.707106781;else i=Math.sqrt(b),n=v/i,s=E/i;else if(S<0.01)n=0.707106781,i=0.707106781,s=0;else s=Math.sqrt(S),n=A/s,i=E/s;return this.set(n,i,s,t),this}let _=Math.sqrt((m-f)*(m-f)+(u-p)*(u-p)+(h-c)*(h-c));if(Math.abs(_)<0.001)_=1;return this.x=(m-f)/_,this.y=(u-p)/_,this.z=(h-c)/_,this.w=Math.acos((l+d+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=ee(this.x,e.x,t.x),this.y=ee(this.y,e.y,t.y),this.z=ee(this.z,e.z,t.z),this.w=ee(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=ee(this.x,e,t),this.y=ee(this.y,e,t),this.z=ee(this.z,e,t),this.w=ee(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ee(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class kr extends on{constructor(e=1,t=1,n={}){super();n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Ht(0,0,e,t),this.scissorTest=!1,this.viewport=new Ht(0,0,e,t),this.textures=[];let i={width:e,height:t,depth:n.depth},s=new at(i),r=n.count;for(let a=0;a<r;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};if(e.mapping!==void 0)t.mapping=e.mapping;if(e.wrapS!==void 0)t.wrapS=e.wrapS;if(e.wrapT!==void 0)t.wrapT=e.wrapT;if(e.wrapR!==void 0)t.wrapR=e.wrapR;if(e.magFilter!==void 0)t.magFilter=e.magFilter;if(e.minFilter!==void 0)t.minFilter=e.minFilter;if(e.format!==void 0)t.format=e.format;if(e.type!==void 0)t.type=e.type;if(e.anisotropy!==void 0)t.anisotropy=e.anisotropy;if(e.colorSpace!==void 0)t.colorSpace=e.colorSpace;if(e.flipY!==void 0)t.flipY=e.flipY;if(e.generateMipmaps!==void 0)t.generateMipmaps=e.generateMipmaps;if(e.internalFormat!==void 0)t.internalFormat=e.internalFormat;for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){if(this._depthTexture!==null&&this._depthTexture.renderTarget===this)this._depthTexture.renderTarget=null;if(e!==null&&e.renderTarget===null)e.renderTarget=this;this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,s=this.textures.length;i<s;i++)if(this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0)this.textures[i].isArrayTexture=this.textures[i].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let i=Object.assign({},e.textures[t].image);this.textures[t].source=new bs(i)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null)if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Re{static{Re.prototype.isMatrix4=!0}constructor(e,t,n,i,s,r,a,o,l,c,u,h,d,f,p,m){if(this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0)this.set(e,t,n,i,s,r,a,o,l,c,u,h,d,f,p,m)}set(e,t,n,i,s,r,a,o,l,c,u,h,d,f,p,m){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=i,g[1]=s,g[5]=r,g[9]=a,g[13]=o,g[2]=l,g[6]=c,g[10]=u,g[14]=h,g[3]=d,g[7]=f,g[11]=p,g[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Re().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){if(this.determinantAffine()===0)return e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this;return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,i=1/bi.setFromMatrixColumn(e,0).length(),s=1/bi.setFromMatrixColumn(e,1).length(),r=1/bi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*r,t[9]=n[9]*r,t[10]=n[10]*r,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,{x:n,y:i,z:s}=e,r=Math.cos(n),a=Math.sin(n),o=Math.cos(i),l=Math.sin(i),c=Math.cos(s),u=Math.sin(s);if(e.order==="XYZ"){let h=r*c,d=r*u,f=a*c,p=a*u;t[0]=o*c,t[4]=-o*u,t[8]=l,t[1]=d+f*l,t[5]=h-p*l,t[9]=-a*o,t[2]=p-h*l,t[6]=f+d*l,t[10]=r*o}else if(e.order==="YXZ"){let h=o*c,d=o*u,f=l*c,p=l*u;t[0]=h+p*a,t[4]=f*a-d,t[8]=r*l,t[1]=r*u,t[5]=r*c,t[9]=-a,t[2]=d*a-f,t[6]=p+h*a,t[10]=r*o}else if(e.order==="ZXY"){let h=o*c,d=o*u,f=l*c,p=l*u;t[0]=h-p*a,t[4]=-r*u,t[8]=f+d*a,t[1]=d+f*a,t[5]=r*c,t[9]=p-h*a,t[2]=-r*l,t[6]=a,t[10]=r*o}else if(e.order==="ZYX"){let h=r*c,d=r*u,f=a*c,p=a*u;t[0]=o*c,t[4]=f*l-d,t[8]=h*l+p,t[1]=o*u,t[5]=p*l+h,t[9]=d*l-f,t[2]=-l,t[6]=a*o,t[10]=r*o}else if(e.order==="YZX"){let h=r*o,d=r*l,f=a*o,p=a*l;t[0]=o*c,t[4]=p-h*u,t[8]=f*u+d,t[1]=u,t[5]=r*c,t[9]=-a*c,t[2]=-l*c,t[6]=d*u+f,t[10]=h-p*u}else if(e.order==="XZY"){let h=r*o,d=r*l,f=a*o,p=a*l;t[0]=o*c,t[4]=-u,t[8]=l*c,t[1]=h*u+p,t[5]=r*c,t[9]=d*u-f,t[2]=f*u-d,t[6]=a*c,t[10]=p*u+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Xm,e,Ym)}lookAt(e,t,n){let i=this.elements;if(ft.subVectors(e,t),ft.lengthSq()===0)ft.z=1;if(ft.normalize(),Sn.crossVectors(n,ft),Sn.lengthSq()===0){if(Math.abs(n.z)===1)ft.x+=0.0001;else ft.z+=0.0001;ft.normalize(),Sn.crossVectors(n,ft)}return Sn.normalize(),dr.crossVectors(ft,Sn),i[0]=Sn.x,i[4]=dr.x,i[8]=ft.x,i[1]=Sn.y,i[5]=dr.y,i[9]=ft.y,i[2]=Sn.z,i[6]=dr.z,i[10]=ft.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,s=this.elements,r=n[0],a=n[4],o=n[8],l=n[12],c=n[1],u=n[5],h=n[9],d=n[13],f=n[2],p=n[6],m=n[10],g=n[14],_=n[3],x=n[7],b=n[11],S=n[15],v=i[0],A=i[4],E=i[8],I=i[12],F=i[1],U=i[5],P=i[9],C=i[13],B=i[2],N=i[6],R=i[10],Z=i[14],z=i[3],re=i[7],V=i[11],J=i[15];return s[0]=r*v+a*F+o*B+l*z,s[4]=r*A+a*U+o*N+l*re,s[8]=r*E+a*P+o*R+l*V,s[12]=r*I+a*C+o*Z+l*J,s[1]=c*v+u*F+h*B+d*z,s[5]=c*A+u*U+h*N+d*re,s[9]=c*E+u*P+h*R+d*V,s[13]=c*I+u*C+h*Z+d*J,s[2]=f*v+p*F+m*B+g*z,s[6]=f*A+p*U+m*N+g*re,s[10]=f*E+p*P+m*R+g*V,s[14]=f*I+p*C+m*Z+g*J,s[3]=_*v+x*F+b*B+S*z,s[7]=_*A+x*U+b*N+S*re,s[11]=_*E+x*P+b*R+S*V,s[15]=_*I+x*C+b*Z+S*J,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],i=e[8],s=e[12],r=e[1],a=e[5],o=e[9],l=e[13],c=e[2],u=e[6],h=e[10],d=e[14],f=e[3],p=e[7],m=e[11],g=e[15],_=o*d-l*h,x=a*d-l*u,b=a*h-o*u,S=r*d-l*c,v=r*h-o*c,A=r*u-a*c;return t*(p*_-m*x+g*b)-n*(f*_-m*S+g*v)+i*(f*x-p*S+g*A)-s*(f*b-p*v+m*A)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],i=e[8],s=e[1],r=e[5],a=e[9],o=e[2],l=e[6],c=e[10];return t*(r*c-a*l)-n*(s*c-a*o)+i*(s*l-r*o)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let i=this.elements;if(e.isVector3)i[12]=e.x,i[13]=e.y,i[14]=e.z;else i[12]=e,i[13]=t,i[14]=n;return this}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],r=e[4],a=e[5],o=e[6],l=e[7],c=e[8],u=e[9],h=e[10],d=e[11],f=e[12],p=e[13],m=e[14],g=e[15],_=t*a-n*r,x=t*o-i*r,b=t*l-s*r,S=n*o-i*a,v=n*l-s*a,A=i*l-s*o,E=c*p-u*f,I=c*m-h*f,F=c*g-d*f,U=u*m-h*p,P=u*g-d*p,C=h*g-d*m,B=_*C-x*P+b*U+S*F-v*I+A*E;if(B===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let N=1/B;return e[0]=(a*C-o*P+l*U)*N,e[1]=(i*P-n*C-s*U)*N,e[2]=(p*A-m*v+g*S)*N,e[3]=(h*v-u*A-d*S)*N,e[4]=(o*F-r*C-l*I)*N,e[5]=(t*C-i*F+s*I)*N,e[6]=(m*b-f*A-g*x)*N,e[7]=(c*A-h*b+d*x)*N,e[8]=(r*P-a*F+l*E)*N,e[9]=(n*F-t*P-s*E)*N,e[10]=(f*v-p*b+g*_)*N,e[11]=(u*b-c*v-d*_)*N,e[12]=(a*I-r*U-o*E)*N,e[13]=(t*U-n*I+i*E)*N,e[14]=(p*x-f*S-m*_)*N,e[15]=(c*S-u*x+h*_)*N,this}scale(e){let t=this.elements,{x:n,y:i,z:s}=e;return t[0]*=n,t[4]*=i,t[8]*=s,t[1]*=n,t[5]*=i,t[9]*=s,t[2]*=n,t[6]*=i,t[10]*=s,t[3]*=n,t[7]*=i,t[11]*=s,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){if(e.isVector3)this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1);else this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1);return this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),i=Math.sin(t),s=1-n,{x:r,y:a,z:o}=e,l=s*r,c=s*a;return this.set(l*r+n,l*a-i*o,l*o+i*a,0,l*a+i*o,c*a+n,c*o-i*r,0,l*o-i*a,c*o+i*r,s*o*o+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,s,r){return this.set(1,n,s,0,e,1,r,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){let i=this.elements,{_x:s,_y:r,_z:a,_w:o}=t,l=s+s,c=r+r,u=a+a,h=s*l,d=s*c,f=s*u,p=r*c,m=r*u,g=a*u,_=o*l,x=o*c,b=o*u,{x:S,y:v,z:A}=n;return i[0]=(1-(p+g))*S,i[1]=(d+b)*S,i[2]=(f-x)*S,i[3]=0,i[4]=(d-b)*v,i[5]=(1-(h+g))*v,i[6]=(m+_)*v,i[7]=0,i[8]=(f+x)*A,i[9]=(m-_)*A,i[10]=(1-(h+p))*A,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){let i=this.elements;e.x=i[12],e.y=i[13],e.z=i[14];let s=this.determinantAffine();if(s===0)return n.set(1,1,1),t.identity(),this;let r=bi.set(i[0],i[1],i[2]).length(),a=bi.set(i[4],i[5],i[6]).length(),o=bi.set(i[8],i[9],i[10]).length();if(s<0)r=-r;Nt.copy(this);let l=1/r,c=1/a,u=1/o;return Nt.elements[0]*=l,Nt.elements[1]*=l,Nt.elements[2]*=l,Nt.elements[4]*=c,Nt.elements[5]*=c,Nt.elements[6]*=c,Nt.elements[8]*=u,Nt.elements[9]*=u,Nt.elements[10]*=u,t.setFromRotationMatrix(Nt),n.x=r,n.y=a,n.z=o,this}makePerspective(e,t,n,i,s,r,a=2000,o=!1){let l=this.elements,c=2*s/(t-e),u=2*s/(n-i),h=(t+e)/(t-e),d=(n+i)/(n-i),f,p;if(o)f=s/(r-s),p=r*s/(r-s);else if(a===2000)f=-(r+s)/(r-s),p=-2*r*s/(r-s);else if(a===2001)f=-r/(r-s),p=-r*s/(r-s);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=c,l[4]=0,l[8]=h,l[12]=0,l[1]=0,l[5]=u,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=f,l[14]=p,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,i,s,r,a=2000,o=!1){let l=this.elements,c=2/(t-e),u=2/(n-i),h=-(t+e)/(t-e),d=-(n+i)/(n-i),f,p;if(o)f=1/(r-s),p=r/(r-s);else if(a===2000)f=-2/(r-s),p=-(r+s)/(r-s);else if(a===2001)f=-1/(r-s),p=-s/(r-s);else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=c,l[4]=0,l[8]=0,l[12]=h,l[1]=0,l[5]=u,l[9]=0,l[13]=d,l[2]=0,l[6]=0,l[10]=f,l[14]=p,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}var bi=new w,Nt=new Re,Xm=new w(0,0,0),Ym=new w(1,1,1),Sn=new w,dr=new w,ft=new w,tu=new Re,nu=new ve;class vs{constructor(e=0,t=0,n=0,i=vs.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let i=e.elements,s=i[0],r=i[4],a=i[8],o=i[1],l=i[5],c=i[9],u=i[2],h=i[6],d=i[10];switch(t){case"XYZ":if(this._y=Math.asin(ee(a,-1,1)),Math.abs(a)<0.9999999)this._x=Math.atan2(-c,d),this._z=Math.atan2(-r,s);else this._x=Math.atan2(h,l),this._z=0;break;case"YXZ":if(this._x=Math.asin(-ee(c,-1,1)),Math.abs(c)<0.9999999)this._y=Math.atan2(a,d),this._z=Math.atan2(o,l);else this._y=Math.atan2(-u,s),this._z=0;break;case"ZXY":if(this._x=Math.asin(ee(h,-1,1)),Math.abs(h)<0.9999999)this._y=Math.atan2(-u,d),this._z=Math.atan2(-r,l);else this._y=0,this._z=Math.atan2(o,s);break;case"ZYX":if(this._y=Math.asin(-ee(u,-1,1)),Math.abs(u)<0.9999999)this._x=Math.atan2(h,d),this._z=Math.atan2(o,s);else this._x=0,this._z=Math.atan2(-r,l);break;case"YZX":if(this._z=Math.asin(ee(o,-1,1)),Math.abs(o)<0.9999999)this._x=Math.atan2(-c,l),this._y=Math.atan2(-u,s);else this._x=0,this._y=Math.atan2(a,d);break;case"XZY":if(this._z=Math.asin(-ee(r,-1,1)),Math.abs(r)<0.9999999)this._x=Math.atan2(h,l),this._y=Math.atan2(a,s);else this._x=Math.atan2(-c,d),this._y=0;break;default:Q("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}if(this._order=t,n===!0)this._onChangeCallback();return this}setFromQuaternion(e,t,n){return tu.makeRotationFromQuaternion(e),this.setFromRotationMatrix(tu,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return nu.setFromEuler(this),this.setFromQuaternion(nu,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){if(this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0)this._order=e[3];return this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}vs.DEFAULT_ORDER="XYZ";class Ho{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}var Km=0,iu=new w,vi=new ve,sn=new Re,fr=new w,rs=new w,Zm=new w,jm=new ve,su=new w(1,0,0),ru=new w(0,1,0),au=new w(0,0,1),ou={type:"added"},Qm={type:"removed"},Si={type:"childadded",child:null},ro={type:"childremoved",child:null};class Ft extends on{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:Km++}),this.uuid=zn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ft.DEFAULT_UP.clone();let e=new w,t=new vs,n=new ve,i=new w(1,1,1);function s(){n.setFromEuler(t,!1)}function r(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Re},normalMatrix:{value:new H}}),this.matrix=new Re,this.matrixWorld=new Re,this.matrixAutoUpdate=Ft.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Ft.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ho,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return vi.setFromAxisAngle(e,t),this.quaternion.multiply(vi),this}rotateOnWorldAxis(e,t){return vi.setFromAxisAngle(e,t),this.quaternion.premultiply(vi),this}rotateX(e){return this.rotateOnAxis(su,e)}rotateY(e){return this.rotateOnAxis(ru,e)}rotateZ(e){return this.rotateOnAxis(au,e)}translateOnAxis(e,t){return iu.copy(e).applyQuaternion(this.quaternion),this.position.add(iu.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(su,e)}translateY(e){return this.translateOnAxis(ru,e)}translateZ(e){return this.translateOnAxis(au,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(sn.copy(this.matrixWorld).invert())}lookAt(e,t,n){if(e.isVector3)fr.copy(e);else fr.set(e,t,n);let i=this.parent;if(this.updateWorldMatrix(!0,!1),rs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)sn.lookAt(rs,fr,this.up);else sn.lookAt(fr,rs,this.up);if(this.quaternion.setFromRotationMatrix(sn),i)sn.extractRotation(i.matrixWorld),vi.setFromRotationMatrix(sn),this.quaternion.premultiply(vi.invert())}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}if(e===this)return Y("Object3D.add: object can't be added as a child of itself.",e),this;if(e&&e.isObject3D)e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(ou),Si.child=e,this.dispatchEvent(Si),Si.child=null;else Y("Object3D.add: object not an instance of THREE.Object3D.",e);return this}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);if(t!==-1)e.parent=null,this.children.splice(t,1),e.dispatchEvent(Qm),ro.child=e,this.dispatchEvent(ro),ro.child=null;return this}removeFromParent(){let e=this.parent;if(e!==null)e.remove(this);return this}clear(){return this.remove(...this.children)}attach(e){if(this.updateWorldMatrix(!0,!1),sn.copy(this.matrixWorld).invert(),e.parent!==null)e.parent.updateWorldMatrix(!0,!1),sn.multiply(e.parent.matrixWorld);return e.applyMatrix4(sn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(ou),Si.child=e,this.dispatchEvent(Si),Si.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}return}getObjectsByProperty(e,t,n=[]){if(this[e]===t)n.push(this);let i=this.children;for(let s=0,r=i.length;s<r;s++)i[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(rs,e,Zm),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(rs,jm,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(e){e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;if(t!==null)e(t),t.traverseAncestors(e)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let{x:t,y:n,z:i}=e,s=this.matrix.elements;s[12]+=t-s[0]*t-s[4]*n-s[8]*i,s[13]+=n-s[1]*t-s[5]*n-s[9]*i,s[14]+=i-s[2]*t-s[6]*n-s[10]*i}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||e){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,e=!0}let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let i=this.parent;if(e===!0&&i!==null)i.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||n){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,n=!0}if(t===!0){let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==="string",n={};if(t)e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"};let i={};if(i.uuid=this.uuid,i.type=this.type,i.name=this.name,i.castShadow=this.castShadow,i.receiveShadow=this.receiveShadow,i.visible=this.visible,i.frustumCulled=this.frustumCulled,i.renderOrder=this.renderOrder,i.static=this.static,i.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0)i.userData=this.userData;if(i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.pivot!==null)i.pivot=this.pivot.toArray();if(this.morphTargetDictionary!==void 0)i.morphTargetDictionary=Object.assign({},this.morphTargetDictionary);if(this.morphTargetInfluences!==void 0)i.morphTargetInfluences=this.morphTargetInfluences.slice();if(this.isInstancedMesh){if(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)i.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map((a)=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map((a)=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null)i.colorsTexture=this._colorsTexture.toJSON(e);if(this.boundingSphere!==null)i.boundingSphere=this.boundingSphere.toJSON();if(this.boundingBox!==null)i.boundingBox=this.boundingBox.toJSON()}function s(a,o){if(a[o.uuid]===void 0)a[o.uuid]=o.toJSON(e);return o.uuid}if(this.isScene){if(this.background){if(this.background.isColor)i.background=this.background.toJSON();else if(this.background.isTexture)i.background=this.background.toJSON(e).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)i.environment=this.environment.toJSON(e).uuid}else if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let o=a.shapes;if(Array.isArray(o))for(let l=0,c=o.length;l<c;l++){let u=o[l];s(e.shapes,u)}else s(e.shapes,o)}}if(this.isSkinnedMesh){if(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)s(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let o=0,l=this.material.length;o<l;o++)a.push(s(e.materials,this.material[o]));i.material=a}else i.material=s(e.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){let o=this.animations[a];i.animations.push(s(e.animations,o))}}if(t){let a=r(e.geometries),o=r(e.materials),l=r(e.textures),c=r(e.images),u=r(e.shapes),h=r(e.skeletons),d=r(e.animations),f=r(e.nodes);if(a.length>0)n.geometries=a;if(o.length>0)n.materials=o;if(l.length>0)n.textures=l;if(c.length>0)n.images=c;if(u.length>0)n.shapes=u;if(h.length>0)n.skeletons=h;if(d.length>0)n.animations=d;if(f.length>0)n.nodes=f}return n.object=i,n;function r(a){let o=[];for(let l in a){let c=a[l];delete c.metadata,o.push(c)}return o}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let i=e.children[n];this.add(i.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}Ft.DEFAULT_UP=new w(0,1,0);Ft.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ft.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var pu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Tn={h:0,s:0,l:0},pr={h:0,s:0,l:0};function ao(e,t,n){if(n<0)n+=1;if(n>1)n-=1;if(n<0.16666666666666666)return e+(t-e)*6*n;if(n<0.5)return t;if(n<0.6666666666666666)return e+(t-e)*6*(0.6666666666666666-n);return e}class Be{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let i=e;if(i&&i.isColor)this.copy(i);else if(typeof i==="number")this.setHex(i);else if(typeof i==="string")this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t="srgb"){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Le.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=Le.workingColorSpace){return this.r=e,this.g=t,this.b=n,Le.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=Le.workingColorSpace){if(e=Go(e,1),t=ee(t,0,1),n=ee(n,0,1),t===0)this.r=this.g=this.b=n;else{let s=n<=0.5?n*(1+t):n+t-n*t,r=2*n-s;this.r=ao(r,s,e+0.3333333333333333),this.g=ao(r,s,e),this.b=ao(r,s,e-0.3333333333333333)}return Le.colorSpaceToWorking(this,i),this}setStyle(e,t="srgb"){function n(s){if(s===void 0)return;if(parseFloat(s)<1)Q("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let s,r=i[1],a=i[2];switch(r){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:Q("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){let s=i[1],r=s.length;if(r===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);else if(r===6)return this.setHex(parseInt(s,16),t);else Q("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t="srgb"){let n=pu[e.toLowerCase()];if(n!==void 0)this.setHex(n,t);else Q("Color: Unknown color "+e);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=an(e.r),this.g=an(e.g),this.b=an(e.b),this}copyLinearToSRGB(e){return this.r=wi(e.r),this.g=wi(e.g),this.b=wi(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e="srgb"){return Le.workingToColorSpace(Je.copy(this),e),Math.round(ee(Je.r*255,0,255))*65536+Math.round(ee(Je.g*255,0,255))*256+Math.round(ee(Je.b*255,0,255))}getHexString(e="srgb"){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Le.workingColorSpace){Le.workingToColorSpace(Je.copy(this),t);let{r:n,g:i,b:s}=Je,r=Math.max(n,i,s),a=Math.min(n,i,s),o,l,c=(a+r)/2;if(a===r)o=0,l=0;else{let u=r-a;switch(l=c<=0.5?u/(r+a):u/(2-r-a),r){case n:o=(i-s)/u+(i<s?6:0);break;case i:o=(s-n)/u+2;break;case s:o=(n-i)/u+4;break}o/=6}return e.h=o,e.s=l,e.l=c,e}getRGB(e,t=Le.workingColorSpace){return Le.workingToColorSpace(Je.copy(this),t),e.r=Je.r,e.g=Je.g,e.b=Je.b,e}getStyle(e="srgb"){Le.workingToColorSpace(Je.copy(this),e);let{r:t,g:n,b:i}=Je;if(e!=="srgb")return`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`;return`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(Tn),this.setHSL(Tn.h+e,Tn.s+t,Tn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Tn),e.getHSL(pr);let n=cs(Tn.h,pr.h,t),i=cs(Tn.s,pr.s,t),s=cs(Tn.l,pr.l,t);return this.setHSL(n,i,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,i=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*i,this.g=s[1]*t+s[4]*n+s[7]*i,this.b=s[2]*t+s[5]*n+s[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}var Je=new Be;Be.NAMES=pu;class Ss{constructor(e=new w(1/0,1/0,1/0),t=new w(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Pt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Pt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Pt.copy(t).multiplyScalar(0.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let r=0,a=s.count;r<a;r++){if(e.isMesh===!0)e.getVertexPosition(r,Pt);else Pt.fromBufferAttribute(s,r);Pt.applyMatrix4(e.matrixWorld),this.expandByPoint(Pt)}else{if(e.boundingBox!==void 0){if(e.boundingBox===null)e.computeBoundingBox();mr.copy(e.boundingBox)}else{if(n.boundingBox===null)n.computeBoundingBox();mr.copy(n.boundingBox)}mr.applyMatrix4(e.matrixWorld),this.union(mr)}}let i=e.children;for(let s=0,r=i.length;s<r;s++)this.expandByObject(i[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Pt),Pt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;if(e.normal.x>0)t=e.normal.x*this.min.x,n=e.normal.x*this.max.x;else t=e.normal.x*this.max.x,n=e.normal.x*this.min.x;if(e.normal.y>0)t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y;else t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y;if(e.normal.z>0)t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z;else t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z;return t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(as),gr.subVectors(this.max,as),Ti.subVectors(e.a,as),Mi.subVectors(e.b,as),Ai.subVectors(e.c,as),Mn.subVectors(Mi,Ti),An.subVectors(Ai,Mi),Vn.subVectors(Ti,Ai);let t=[0,-Mn.z,Mn.y,0,-An.z,An.y,0,-Vn.z,Vn.y,Mn.z,0,-Mn.x,An.z,0,-An.x,Vn.z,0,-Vn.x,-Mn.y,Mn.x,0,-An.y,An.x,0,-Vn.y,Vn.x,0];if(!oo(t,Ti,Mi,Ai,gr))return!1;if(t=[1,0,0,0,1,0,0,0,1],!oo(t,Ti,Mi,Ai,gr))return!1;return _r.crossVectors(Mn,An),t=[_r.x,_r.y,_r.z],oo(t,Ti,Mi,Ai,gr)}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Pt).distanceTo(e)}getBoundingSphere(e){if(this.isEmpty())e.makeEmpty();else this.getCenter(e.center),e.radius=this.getSize(Pt).length()*0.5;return e}intersect(e){if(this.min.max(e.min),this.max.min(e.max),this.isEmpty())this.makeEmpty();return this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){if(this.isEmpty())return this;return rn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),rn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),rn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),rn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),rn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),rn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),rn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),rn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(rn),this}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}var rn=[new w,new w,new w,new w,new w,new w,new w,new w],Pt=new w,mr=new Ss,Ti=new w,Mi=new w,Ai=new w,Mn=new w,An=new w,Vn=new w,as=new w,gr=new w,_r=new w,Gn=new w;function oo(e,t,n,i,s){for(let r=0,a=e.length-3;r<=a;r+=3){Gn.fromArray(e,r);let o=s.x*Math.abs(Gn.x)+s.y*Math.abs(Gn.y)+s.z*Math.abs(Gn.z),l=t.dot(Gn),c=n.dot(Gn),u=i.dot(Gn);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>o)return!1}return!0}var De=new w,xr=new Ue,Jm=0;class Vr extends on{constructor(e,t,n=!1){super();if(Array.isArray(e))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Jm++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(e){if(e===!0)this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)xr.fromBufferAttribute(this,t),xr.applyMatrix3(e),this.setXY(t,xr.x,xr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)De.fromBufferAttribute(this,t),De.applyMatrix3(e),this.setXYZ(t,De.x,De.y,De.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)De.fromBufferAttribute(this,t),De.applyMatrix4(e),this.setXYZ(t,De.x,De.y,De.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)De.fromBufferAttribute(this,t),De.applyNormalMatrix(e),this.setXYZ(t,De.x,De.y,De.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)De.fromBufferAttribute(this,t),De.transformDirection(e),this.setXYZ(t,De.x,De.y,De.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];if(this.normalized)n=Lt(n,this.array);return n}setComponent(e,t,n){if(this.normalized)n=de(n,this.array);return this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];if(this.normalized)t=Lt(t,this.array);return t}setX(e,t){if(this.normalized)t=de(t,this.array);return this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];if(this.normalized)t=Lt(t,this.array);return t}setY(e,t){if(this.normalized)t=de(t,this.array);return this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];if(this.normalized)t=Lt(t,this.array);return t}setZ(e,t){if(this.normalized)t=de(t,this.array);return this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];if(this.normalized)t=Lt(t,this.array);return t}setW(e,t){if(this.normalized)t=de(t,this.array);return this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){if(e*=this.itemSize,this.normalized)t=de(t,this.array),n=de(n,this.array);return this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){if(e*=this.itemSize,this.normalized)t=de(t,this.array),n=de(n,this.array),i=de(i,this.array);return this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,s){if(e*=this.itemSize,this.normalized)t=de(t,this.array),n=de(n,this.array),i=de(i,this.array),s=de(s,this.array);return this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:"dispose"})}}var eg=new Ss,os=new w,lo=new w;class Ts{constructor(e=new w,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;if(t!==void 0)n.copy(t);else eg.setFromPoints(e).getCenter(n);let i=0;for(let s=0,r=e.length;s<r;s++)i=Math.max(i,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);if(t.copy(e),n>this.radius*this.radius)t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center);return t}getBoundingBox(e){if(this.isEmpty())return e.makeEmpty(),e;return e.set(this.center,this.center),e.expandByScalar(this.radius),e}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;os.subVectors(e,this.center);let t=os.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),i=(n-this.radius)*0.5;this.center.addScaledVector(os,i/n),this.radius+=i}return this}union(e){if(e.isEmpty())return this;if(this.isEmpty())return this.copy(e),this;if(this.center.equals(e.center)===!0)this.radius=Math.max(this.radius,e.radius);else lo.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(os.copy(e.center).add(lo)),this.expandByPoint(os.copy(e.center).sub(lo));return this}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}class Gr{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=35044,this.updateRanges=[],this.version=0,this.uuid=zn()}onUploadCallback(){}set needsUpdate(e){if(e===!0)this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let i=0,s=this.stride;i<s;i++)this.array[e+i]=t.array[n+i];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){if(e.arrayBuffers===void 0)e.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=zn();if(e.arrayBuffers[this.array.buffer._uuid]===void 0)e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer;let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){if(e.arrayBuffers===void 0)e.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=zn();if(e.arrayBuffers[this.array.buffer._uuid]===void 0)e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer));let t={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return t.usage=this.usage,t}}var tt=new w;class Ms{constructor(e,t,n,i=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=i}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)tt.fromBufferAttribute(this,t),tt.applyMatrix4(e),this.setXYZ(t,tt.x,tt.y,tt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)tt.fromBufferAttribute(this,t),tt.applyNormalMatrix(e),this.setXYZ(t,tt.x,tt.y,tt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)tt.fromBufferAttribute(this,t),tt.transformDirection(e),this.setXYZ(t,tt.x,tt.y,tt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];if(this.normalized)n=Lt(n,this.array);return n}setComponent(e,t,n){if(this.normalized)n=de(n,this.array);return this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){if(this.normalized)t=de(t,this.array);return this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){if(this.normalized)t=de(t,this.array);return this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){if(this.normalized)t=de(t,this.array);return this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){if(this.normalized)t=de(t,this.array);return this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];if(this.normalized)t=Lt(t,this.array);return t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];if(this.normalized)t=Lt(t,this.array);return t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];if(this.normalized)t=Lt(t,this.array);return t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];if(this.normalized)t=Lt(t,this.array);return t}setXY(e,t,n){if(e=e*this.data.stride+this.offset,this.normalized)t=de(t,this.array),n=de(n,this.array);return this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,i){if(e=e*this.data.stride+this.offset,this.normalized)t=de(t,this.array),n=de(n,this.array),i=de(i,this.array);return this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this}setXYZW(e,t,n,i,s){if(e=e*this.data.stride+this.offset,this.normalized)t=de(t,this.array),n=de(n,this.array),i=de(i,this.array),s=de(s,this.array);return this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this.data.array[e+3]=s,this}clone(e){if(e===void 0){us("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let i=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[i+s])}return new Vr(new this.array.constructor(t),this.itemSize,this.normalized)}else{if(e.interleavedBuffers===void 0)e.interleavedBuffers={};if(e.interleavedBuffers[this.data.uuid]===void 0)e.interleavedBuffers[this.data.uuid]=this.data.clone(e);return new Ms(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}}toJSON(e){if(e===void 0){us("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let i=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[i+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else{if(e.interleavedBuffers===void 0)e.interleavedBuffers={};if(e.interleavedBuffers[this.data.uuid]===void 0)e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e);return{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}}var co=new w,tg=new w,ng=new H;class zr{constructor(e=new w(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let i=co.subVectors(n,t).cross(tg.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let i=e.delta(co),s=this.normal.dot(i);if(s===0){if(this.distanceToPoint(e.start)===0)return t.copy(e.start);return null}let r=-(e.start.dot(this.normal)+this.constant)/s;if(n===!0&&(r<0||r>1))return null;return t.copy(e.start).addScaledVector(i,r)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||ng.getNormalMatrix(e),i=this.coplanarPoint(co).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}}class Hr extends at{constructor(e,t){super({width:e,height:t});this.isFramebufferTexture=!0,this.magFilter=1003,this.minFilter=1003,this.generateMipmaps=!1,this.needsUpdate=!0}}class Wr extends at{constructor(e=[],t=301,n,i,s,r,a,o,l,c){super(e,t,n,i,s,r,a,o,l,c);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class As extends at{constructor(e,t,n=1014,i,s,r,a=1003,o=1003,l,c=1026,u=1){if(c!==1026&&c!==1027)throw Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let h={width:e,height:t,depth:u};super(h,i,s,r,a,o,c,n,l);this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new bs(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}}function mu(e){let t={};for(let n in e){t[n]={};for(let i in e[n]){let s=e[n][i];if(lu(s))if(s.isRenderTargetTexture)Q("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[n][i]=null;else t[n][i]=s.clone();else if(Array.isArray(s))if(lu(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();t[n][i]=r}else t[n][i]=s.slice();else t[n][i]=s}}return t}function nt(e){let t={};for(let n=0;n<e.length;n++){let i=mu(e[n]);for(let s in i)t[s]=i[s]}return t}function lu(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function Ei(e,t){if(!e||e.constructor===t)return e;if(typeof t.BYTES_PER_ELEMENT==="number")return new t(e);return Array.prototype.slice.call(e)}function uo(e){return e!==void 0&&e.inTangents!==void 0&&e.outTangents!==void 0}class Wn{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,i=t[n],s=t[n-1];n:{e:{let r;t:{i:if(!(e<i)){for(let a=n+2;;){if(i===void 0){if(e<s)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(s=i,i=t[++n],e<i)break e}r=t.length;break t}if(!(e>=s)){let a=t[1];if(e<a)n=2,s=a;for(let o=n-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===o)break;if(i=s,s=t[--n-1],e>=s)break e}r=n,n=0;break t}break n}while(n<r){let a=n+r>>>1;if(e<t[a])r=a;else n=a+1}if(i=t[n],s=t[n-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,s,i)}return this.interpolate_(n,s,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,s=e*i;for(let r=0;r!==i;++r)t[r]=n[s+r];return t}interpolate_(){throw Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class Wo extends Wn{constructor(e,t,n,i){super(e,t,n,i);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_(e,t,n){let i=this.parameterPositions,s=e-2,r=e+1,a=i[s],o=i[r];if(a===void 0)switch(this.getSettings_().endingStart){case 2401:s=e,a=2*t-n;break;case 2402:s=i.length-2,a=t+i[s]-i[s+1];break;default:s=e,a=n}if(o===void 0)switch(this.getSettings_().endingEnd){case 2401:r=e,o=2*n-t;break;case 2402:r=1,o=n+i[1]-i[0];break;default:r=e-1,o=t}let l=(n-t)*0.5,c=this.valueSize;this._weightPrev=l/(t-a),this._weightNext=l/(o-n),this._offsetPrev=s*c,this._offsetNext=r*c}interpolate_(e,t,n,i){let s=this.resultBuffer,r=this.sampleValues,a=this.valueSize,o=e*a,l=o-a,c=this._offsetPrev,u=this._offsetNext,h=this._weightPrev,d=this._weightNext,f=(n-t)/(i-t),p=f*f,m=p*f,g=-h*m+2*h*p-h*f,_=(1+h)*m+(-1.5-2*h)*p+(-0.5+h)*f+1,x=(-1-d)*m+(1.5+d)*p+0.5*f,b=d*m-d*p;for(let S=0;S!==a;++S)s[S]=g*r[c+S]+_*r[l+S]+x*r[o+S]+b*r[u+S];return s}}class $o extends Wn{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let s=this.resultBuffer,r=this.sampleValues,a=this.valueSize,o=e*a,l=o-a,c=(n-t)/(i-t),u=1-c;for(let h=0;h!==a;++h)s[h]=r[l+h]*u+r[o+h]*c;return s}}class qo extends Wn{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}}class Xo extends Wn{interpolate_(e,t,n,i){let s=this.resultBuffer,r=this.sampleValues,a=this.valueSize,o=e*a,l=o-a,c=this.inTangents,u=this.outTangents;if(!c||!u){let f=(n-t)/(i-t),p=1-f;for(let m=0;m!==a;++m)s[m]=r[l+m]*p+r[o+m]*f;return s}let h=a*2,d=e-1;for(let f=0;f!==a;++f){let p=r[l+f],m=r[o+f],g=d*h+f*2,_=u[g],x=u[g+1],b=e*h+f*2,S=c[b],v=c[b+1],A=sg(n,t,_,S,i);s[f]=gu(A,p,x,v,m)}return s}}function gu(e,t,n,i,s){let r=1-e;return r*r*r*t+3*r*r*e*n+3*r*e*e*i+e*e*e*s}function ig(e,t,n,i,s){let r=1-e;return 3*r*r*(n-t)+6*r*e*(i-n)+3*e*e*(s-i)}function sg(e,t,n,i,s){let r=(e-t)/(s-t);for(let a=0;a<8;a++){let o=gu(r,t,n,i,s)-e;if(Math.abs(o)<0.0000000001)break;let l=ig(r,t,n,i,s);if(Math.abs(l)<0.0000000001)break;r=Math.max(0,Math.min(1,r-o/l))}return r}class St{constructor(e,t,n,i){if(e===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Ei(t,this.TimeBufferType),this.values=Ei(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Ei(e.times,Array),values:Ei(e.values,Array)};let i=e.getInterpolation();if(i!==e.DefaultInterpolation)n.interpolation=i;if(uo(e.settings))n.settings={inTangents:Ei(e.settings.inTangents,Array),outTangents:Ei(e.settings.outTangents,Array)}}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new qo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new $o(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Wo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Xo(this.times,this.values,this.getValueSize(),e);if(this.settings)t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents;return t}setInterpolation(e){let t;switch(e){case 2300:t=this.InterpolantFactoryMethodDiscrete;break;case 2301:t=this.InterpolantFactoryMethodLinear;break;case 2302:t=this.InterpolantFactoryMethodSmooth;break;case 2303:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(n);return Q("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302;case this.InterpolantFactoryMethodBezier:return 2303}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e;if(uo(this.settings))cu(this.settings.inTangents,e),cu(this.settings.outTangents,e)}return this}trim(e,t){let n=this.times,i=n.length,s=0,r=i-1;while(s!==i&&n[s]<e)++s;while(r!==-1&&n[r]>t)--r;if(++r,s!==0||r!==i){if(s>=r)r=Math.max(r,1),s=r-1;let a=this.getValueSize();this.times=n.slice(s,r),this.values=this.values.slice(s*a,r*a)}return this}validate(){let e=!0,t=this.getValueSize();if(t-Math.floor(t)!==0)Y("KeyframeTrack: Invalid value size in track.",this),e=!1;let n=this.times,i=this.values,s=n.length;if(s===0)Y("KeyframeTrack: Track is empty.",this),e=!1;let r=null;for(let a=0;a!==s;a++){let o=n[a];if(typeof o==="number"&&isNaN(o)){Y("KeyframeTrack: Time is not a valid number.",this,a,o),e=!1;break}if(r!==null&&r>o){Y("KeyframeTrack: Out of order keys.",this,a,o,r),e=!1;break}r=o}if(i!==void 0){if(du(i))for(let a=0,o=i.length;a!==o;++a){let l=i[a];if(isNaN(l)){Y("KeyframeTrack: Value is not a valid number.",this,a,l),e=!1;break}}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===2302,s=e.length-1,r=1;for(let a=1;a<s;++a){let o=!1,l=e[a],c=e[a+1];if(l!==c&&(a!==1||l!==e[0]))if(!i){let u=a*n,h=u-n,d=u+n;for(let f=0;f!==n;++f){let p=t[u+f];if(p!==t[h+f]||p!==t[d+f]){o=!0;break}}}else o=!0;if(o){if(a!==r){e[r]=e[a];let u=a*n,h=r*n;for(let d=0;d!==n;++d)t[h+d]=t[u+d]}++r}}if(s>0){e[r]=e[s];for(let a=s*n,o=r*n,l=0;l!==n;++l)t[o+l]=t[a+l];++r}if(r!==e.length)this.times=e.slice(0,r),this.values=t.slice(0,r*n);else this.times=e,this.values=t;return this}clone(){let e=this.times.slice(),t=this.values.slice(),i=new this.constructor(this.name,e,t);if(i.createInterpolant=this.createInterpolant,uo(this.settings))i.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()};return i}}function cu(e,t){for(let n=0,i=e.length;n!==i;n+=2)e[n]*=t}St.prototype.ValueTypeName="";St.prototype.TimeBufferType=Float32Array;St.prototype.ValueBufferType=Float32Array;St.prototype.DefaultInterpolation=2301;class $n extends St{constructor(e,t,n){super(e,t,n)}}$n.prototype.ValueTypeName="bool";$n.prototype.ValueBufferType=Array;$n.prototype.DefaultInterpolation=2300;$n.prototype.InterpolantFactoryMethodLinear=void 0;$n.prototype.InterpolantFactoryMethodSmooth=void 0;class Yo extends St{constructor(e,t,n,i){super(e,t,n,i)}}Yo.prototype.ValueTypeName="color";class Ko extends St{constructor(e,t,n,i){super(e,t,n,i)}}Ko.prototype.ValueTypeName="number";class Zo extends Wn{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let s=this.resultBuffer,r=this.sampleValues,a=this.valueSize,o=(n-t)/(i-t),l=e*a;for(let c=l+a;l!==c;l+=4)ve.slerpFlat(s,0,r,l-a,r,l,o);return s}}class $r extends St{constructor(e,t,n,i){super(e,t,n,i)}InterpolantFactoryMethodLinear(e){return new Zo(this.times,this.values,this.getValueSize(),e)}}$r.prototype.ValueTypeName="quaternion";$r.prototype.InterpolantFactoryMethodSmooth=void 0;class qn extends St{constructor(e,t,n){super(e,t,n)}}qn.prototype.ValueTypeName="string";qn.prototype.ValueBufferType=Array;qn.prototype.DefaultInterpolation=2300;qn.prototype.InterpolantFactoryMethodLinear=void 0;qn.prototype.InterpolantFactoryMethodSmooth=void 0;class jo extends St{constructor(e,t,n,i){super(e,t,n,i)}}jo.prototype.ValueTypeName="vector";class Qo{constructor(e,t,n){let i=this,s=!1,r=0,a=0,o=void 0,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(c){if(a++,s===!1){if(i.onStart!==void 0)i.onStart(c,r,a)}s=!0},this.itemEnd=function(c){if(r++,i.onProgress!==void 0)i.onProgress(c,r,a);if(r===a){if(s=!1,i.onLoad!==void 0)i.onLoad()}},this.itemError=function(c){if(i.onError!==void 0)i.onError(c)},this.resolveURL=function(c){if(c=c.normalize("NFC"),o)return o(c);return c},this.setURLModifier=function(c){return o=c,this},this.addHandler=function(c,u){return l.push(c,u),this},this.removeHandler=function(c){let u=l.indexOf(c);if(u!==-1)l.splice(u,2);return this},this.getHandler=function(c){for(let u=0,h=l.length;u<h;u+=2){let d=l[u],f=l[u+1];if(d.global)d.lastIndex=0;if(d.test(c))return f}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){if(!this._abortController)this._abortController=new AbortController;return this._abortController}}var _u=new Qo;class qr{constructor(e){if(this.manager=e!==void 0?e:_u,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(i,s){n.load(e,i,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}qr.DEFAULT_MATERIAL_NAME="__DEFAULT";var yr=new w,br=new ve,Gt=new w;class Jo extends Ft{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Re,this.projectionMatrix=new Re,this.projectionMatrixInverse=new Re,this.coordinateSystem=2000,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){if(super.updateMatrixWorld(e),this.matrixWorld.decompose(yr,br,Gt),Gt.x===1&&Gt.y===1&&Gt.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(yr,br,Gt.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){if(super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(yr,br,Gt),Gt.x===1&&Gt.y===1&&Gt.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(yr,br,Gt.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}var En=new w,uu=new Ue,hu=new Ue;class Es extends Jo{constructor(e=50,t=1,n=0.1,i=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=0.5*this.getFilmHeight()/e;this.fov=Ci*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(ls*0.5*this.fov);return 0.5*this.getFilmHeight()/e}getEffectiveFOV(){return Ci*2*Math.atan(Math.tan(ls*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){En.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),t.set(En.x,En.y).multiplyScalar(-e/En.z),En.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),n.set(En.x,En.y).multiplyScalar(-e/En.z)}getViewSize(e,t){return this.getViewBounds(e,uu,hu),t.subVectors(hu,uu)}setViewOffset(e,t,n,i,s,r){if(this.aspect=e/t,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(ls*0.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,s=-0.5*i,r=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:o,fullHeight:l}=r;s+=r.offsetX*i/o,t-=r.offsetY*n/l,i*=r.width/o,n*=r.height/l}let a=this.filmOffset;if(a!==0)s+=e*a/this.getFilmWidth();this.projectionMatrix.makePerspective(s,s+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);if(t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null)t.object.view=Object.assign({},this.view);return t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}var el="\\[\\]\\.:\\/",rg=new RegExp("["+el+"]","g"),tl="[^"+el+"]",ag="[^"+el.replace("\\.","")+"]",og=/((?:WC+[\/:])*)/.source.replace("WC",tl),lg=/(WCOD+)?/.source.replace("WCOD",ag),cg=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",tl),ug=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",tl),hg=new RegExp("^"+og+lg+cg+ug+"$"),dg=["material","materials","bones","map"];class xu{constructor(e,t,n){let i=n||fe.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,i=this._bindings[n];if(i!==void 0)i.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,s=n.length;i!==s;++i)n[i].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}}class fe{constructor(e,t,n){this.path=t,this.parsedPath=n||fe.parseTrackName(t),this.node=fe.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){if(!(e&&e.isAnimationObjectGroup))return new fe(e,t,n);else return new fe.Composite(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(rg,"")}static parseTrackName(e){let t=hg.exec(e);if(t===null)throw Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){let s=n.nodeName.substring(i+1);if(dg.indexOf(s)!==-1)n.nodeName=n.nodeName.substring(0,i),n.objectName=s}if(n.propertyName===null||n.propertyName.length===0)throw Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(s){for(let r=0;r<s.length;r++){let a=s[r];if(a.name===t||a.uuid===t)return a;let o=n(a.children);if(o)return o}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,{objectName:n,propertyName:i,propertyIndex:s}=t;if(!e)e=fe.findNode(this.rootNode,t.nodeName),this.node=e;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Q("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){Y("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Y("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Y("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let c=0;c<e.length;c++)if(e[c].name===l){l=c;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Y("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Y("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Y("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){Y("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}let r=e[i];if(r===void 0){let l=t.nodeName;Y("PropertyBinding: Trying to update property for track: "+l+"."+i+" but it wasn't found.",e);return}let a=this.Versioning.None;if(this.targetObject=e,e.isMaterial===!0)a=this.Versioning.NeedsUpdate;else if(e.isObject3D===!0)a=this.Versioning.MatrixWorldNeedsUpdate;let o=this.BindingType.Direct;if(s!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){Y("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Y("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if(e.morphTargetDictionary[s]!==void 0)s=e.morphTargetDictionary[s]}o=this.BindingType.ArrayElement,this.resolvedProperty=r,this.propertyIndex=s}else if(r.fromArray!==void 0&&r.toArray!==void 0)o=this.BindingType.HasFromToArray,this.resolvedProperty=r;else if(Array.isArray(r))o=this.BindingType.EntireArray,this.resolvedProperty=r;else this.propertyName=i;this.getValue=this.GetterByBindingType[o],this.setValue=this.SetterByBindingTypeAndVersioning[o][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}fe.Composite=xu;fe.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};fe.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};fe.prototype.GetterByBindingType=[fe.prototype._getValue_direct,fe.prototype._getValue_array,fe.prototype._getValue_arrayElement,fe.prototype._getValue_toArray];fe.prototype.SetterByBindingTypeAndVersioning=[[fe.prototype._setValue_direct,fe.prototype._setValue_direct_setNeedsUpdate,fe.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[fe.prototype._setValue_array,fe.prototype._setValue_array_setNeedsUpdate,fe.prototype._setValue_array_setMatrixWorldNeedsUpdate],[fe.prototype._setValue_arrayElement,fe.prototype._setValue_arrayElement_setNeedsUpdate,fe.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[fe.prototype._setValue_fromArray,fe.prototype._setValue_fromArray_setNeedsUpdate,fe.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var mw=new Float32Array(1);class ws{static{ws.prototype.isMatrix2=!0}constructor(e,t,n,i){if(this.elements=[1,0,0,1],e!==void 0)this.set(e,t,n,i)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,i){let s=this.elements;return s[0]=e,s[2]=t,s[1]=n,s[3]=i,this}}if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));if(typeof window<"u")if(window.__THREE__)Q("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="186";var fx=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,px=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,mx=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,gx=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,_x=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,xx=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,yx=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,bx=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,vx=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Sx=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Tx=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Mx=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Ax=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Ex=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,wx=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Rx=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Cx=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Ix=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Nx=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Px=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Lx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Fx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Dx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Ux=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Bx=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Ox=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,kx=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Vx=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Gx=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,zx=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Hx="gl_FragColor = linearToOutputTexel( gl_FragColor );",Wx=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,$x=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,qx=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Xx=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Yx=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Kx=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Zx=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,jx=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Qx=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Jx=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ey=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,ty=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,ny=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,iy=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,sy=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,ry=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,ay=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,oy=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,ly=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,cy=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,uy=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,hy=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,dy=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,fy=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,py=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,my=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,gy=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,_y=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,xy=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,yy=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,by=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,vy=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Sy=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Ty=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,My=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Ay=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Ey=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,wy=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Ry=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Cy=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Iy=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ny=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Py=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Ly=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Fy=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Dy=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Uy=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,By=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Oy=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,ky=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Vy=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Gy=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,zy=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Hy=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Wy=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,$y=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,qy=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Xy=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Yy=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Ky=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Zy=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,jy=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Qy=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Jy=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,eb=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,tb=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,nb=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,ib=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,sb=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,rb=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,ab=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,ob=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,lb=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,cb=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,ub=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,hb=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,db=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,fb=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,pb=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,gb=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,_b=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,xb=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,yb=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,bb=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,vb=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Sb=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Tb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Mb=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ab=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Eb=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,wb=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`;var Rb=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Cb=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ib=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Nb=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Pb=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lb=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Fb=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Db=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ub=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Bb=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Ob=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kb=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Vb=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Gb=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,zb=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Hb=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Wb=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,$b=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,qb=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,te={alphahash_fragment:fx,alphahash_pars_fragment:px,alphamap_fragment:mx,alphamap_pars_fragment:gx,alphatest_fragment:_x,alphatest_pars_fragment:xx,aomap_fragment:yx,aomap_pars_fragment:bx,batching_pars_vertex:vx,batching_vertex:Sx,begin_vertex:Tx,beginnormal_vertex:Mx,bsdfs:Ax,iridescence_fragment:Ex,bumpmap_pars_fragment:wx,clipping_planes_fragment:Rx,clipping_planes_pars_fragment:Cx,clipping_planes_pars_vertex:Ix,clipping_planes_vertex:Nx,color_fragment:Px,color_pars_fragment:Lx,color_pars_vertex:Fx,color_vertex:Dx,common:Ux,cube_uv_reflection_fragment:Bx,defaultnormal_vertex:Ox,displacementmap_pars_vertex:kx,displacementmap_vertex:Vx,emissivemap_fragment:Gx,emissivemap_pars_fragment:zx,colorspace_fragment:Hx,colorspace_pars_fragment:Wx,envmap_fragment:$x,envmap_common_pars_fragment:qx,envmap_pars_fragment:Xx,envmap_pars_vertex:Yx,envmap_physical_pars_fragment:ry,envmap_vertex:Kx,fog_vertex:Zx,fog_pars_vertex:jx,fog_fragment:Qx,fog_pars_fragment:Jx,gradientmap_pars_fragment:ey,lightmap_pars_fragment:ty,lights_lambert_fragment:ny,lights_lambert_pars_fragment:iy,lights_pars_begin:sy,lights_toon_fragment:ay,lights_toon_pars_fragment:oy,lights_phong_fragment:ly,lights_phong_pars_fragment:cy,lights_physical_fragment:uy,lights_physical_pars_fragment:hy,lights_fragment_begin:dy,lights_fragment_maps:fy,lights_fragment_end:py,lightprobes_pars_fragment:my,logdepthbuf_fragment:gy,logdepthbuf_pars_fragment:_y,logdepthbuf_pars_vertex:xy,logdepthbuf_vertex:yy,map_fragment:by,map_pars_fragment:vy,map_particle_fragment:Sy,map_particle_pars_fragment:Ty,metalnessmap_fragment:My,metalnessmap_pars_fragment:Ay,morphinstance_vertex:Ey,morphcolor_vertex:wy,morphnormal_vertex:Ry,morphtarget_pars_vertex:Cy,morphtarget_vertex:Iy,normal_fragment_begin:Ny,normal_fragment_maps:Py,normal_pars_fragment:Ly,normal_pars_vertex:Fy,normal_vertex:Dy,normalmap_pars_fragment:Uy,clearcoat_normal_fragment_begin:By,clearcoat_normal_fragment_maps:Oy,clearcoat_pars_fragment:ky,iridescence_pars_fragment:Vy,opaque_fragment:Gy,packing:zy,premultiplied_alpha_fragment:Hy,project_vertex:Wy,dithering_fragment:$y,dithering_pars_fragment:qy,roughnessmap_fragment:Xy,roughnessmap_pars_fragment:Yy,shadowmap_pars_fragment:Ky,shadowmap_pars_vertex:Zy,shadowmap_vertex:jy,shadowmask_pars_fragment:Qy,skinbase_vertex:Jy,skinning_pars_vertex:eb,skinning_vertex:tb,skinnormal_vertex:nb,specularmap_fragment:ib,specularmap_pars_fragment:sb,tonemapping_fragment:rb,tonemapping_pars_fragment:ab,transmission_fragment:ob,transmission_pars_fragment:lb,uv_pars_fragment:cb,uv_pars_vertex:ub,uv_vertex:hb,worldpos_vertex:db,background_vert:fb,background_frag:pb,backgroundCube_vert:mb,backgroundCube_frag:gb,cube_vert:_b,cube_frag:xb,depth_vert:yb,depth_frag:bb,distance_vert:vb,distance_frag:Sb,equirect_vert:Tb,equirect_frag:Mb,linedashed_vert:Ab,linedashed_frag:Eb,meshbasic_vert:wb,meshbasic_frag:Rb,meshlambert_vert:Cb,meshlambert_frag:Ib,meshmatcap_vert:Nb,meshmatcap_frag:Pb,meshnormal_vert:Lb,meshnormal_frag:Fb,meshphong_vert:Db,meshphong_frag:Ub,meshphysical_vert:Bb,meshphysical_frag:Ob,meshtoon_vert:kb,meshtoon_frag:Vb,points_vert:Gb,points_frag:zb,shadow_vert:Hb,shadow_frag:Wb,sprite_vert:$b,sprite_frag:qb},D={common:{diffuse:{value:new Be(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new H},alphaMap:{value:null},alphaMapTransform:{value:new H},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new H}},envmap:{envMap:{value:null},envMapRotation:{value:new H},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new H}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new H}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new H},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new H},normalScale:{value:new Ue(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new H},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new H}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new H}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new H}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new Be(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new w},probesMax:{value:new w},probesResolution:{value:new w}},points:{diffuse:{value:new Be(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new H},alphaTest:{value:0},uvTransform:{value:new H}},sprite:{diffuse:{value:new Be(16777215)},opacity:{value:1},center:{value:new Ue(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new H},alphaMap:{value:null},alphaMapTransform:{value:new H},alphaTest:{value:0}}},yu={basic:{uniforms:nt([D.common,D.specularmap,D.envmap,D.aomap,D.lightmap,D.fog]),vertexShader:te.meshbasic_vert,fragmentShader:te.meshbasic_frag},lambert:{uniforms:nt([D.common,D.specularmap,D.envmap,D.aomap,D.lightmap,D.emissivemap,D.bumpmap,D.normalmap,D.displacementmap,D.fog,D.lights,{emissive:{value:new Be(0)},envMapIntensity:{value:1}}]),vertexShader:te.meshlambert_vert,fragmentShader:te.meshlambert_frag},phong:{uniforms:nt([D.common,D.specularmap,D.envmap,D.aomap,D.lightmap,D.emissivemap,D.bumpmap,D.normalmap,D.displacementmap,D.fog,D.lights,{emissive:{value:new Be(0)},specular:{value:new Be(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:te.meshphong_vert,fragmentShader:te.meshphong_frag},standard:{uniforms:nt([D.common,D.envmap,D.aomap,D.lightmap,D.emissivemap,D.bumpmap,D.normalmap,D.displacementmap,D.roughnessmap,D.metalnessmap,D.fog,D.lights,{emissive:{value:new Be(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:te.meshphysical_vert,fragmentShader:te.meshphysical_frag},toon:{uniforms:nt([D.common,D.aomap,D.lightmap,D.emissivemap,D.bumpmap,D.normalmap,D.displacementmap,D.gradientmap,D.fog,D.lights,{emissive:{value:new Be(0)}}]),vertexShader:te.meshtoon_vert,fragmentShader:te.meshtoon_frag},matcap:{uniforms:nt([D.common,D.bumpmap,D.normalmap,D.displacementmap,D.fog,{matcap:{value:null}}]),vertexShader:te.meshmatcap_vert,fragmentShader:te.meshmatcap_frag},points:{uniforms:nt([D.points,D.fog]),vertexShader:te.points_vert,fragmentShader:te.points_frag},dashed:{uniforms:nt([D.common,D.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:te.linedashed_vert,fragmentShader:te.linedashed_frag},depth:{uniforms:nt([D.common,D.displacementmap]),vertexShader:te.depth_vert,fragmentShader:te.depth_frag},normal:{uniforms:nt([D.common,D.bumpmap,D.normalmap,D.displacementmap,{opacity:{value:1}}]),vertexShader:te.meshnormal_vert,fragmentShader:te.meshnormal_frag},sprite:{uniforms:nt([D.sprite,D.fog]),vertexShader:te.sprite_vert,fragmentShader:te.sprite_frag},background:{uniforms:{uvTransform:{value:new H},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:te.background_vert,fragmentShader:te.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new H}},vertexShader:te.backgroundCube_vert,fragmentShader:te.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:te.cube_vert,fragmentShader:te.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:te.equirect_vert,fragmentShader:te.equirect_frag},distance:{uniforms:nt([D.common,D.displacementmap,{referencePosition:{value:new w},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:te.distance_vert,fragmentShader:te.distance_frag},shadow:{uniforms:nt([D.lights,D.fog,{color:{value:new Be(0)},opacity:{value:1}}]),vertexShader:te.shadow_vert,fragmentShader:te.shadow_frag}};yu.physical={uniforms:nt([yu.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new H},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new H},clearcoatNormalScale:{value:new Ue(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new H},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new H},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new H},sheen:{value:0},sheenColor:{value:new Be(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new H},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new H},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new H},transmissionSamplerSize:{value:new Ue},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new H},attenuationDistance:{value:0},attenuationColor:{value:new Be(0)},specularColor:{value:new Be(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new H},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new H},anisotropyVector:{value:new Ue},anisotropyMap:{value:null},anisotropyMapTransform:{value:new H}}]),vertexShader:te.meshphysical_vert,fragmentShader:te.meshphysical_frag};var Xb=new H;Xb.set(-1,0,0,0,1,0,0,0,1);var x2={[Sr]:"LINEAR_TONE_MAPPING",[Tr]:"REINHARD_TONE_MAPPING",[Mr]:"CINEON_TONE_MAPPING",[Ar]:"ACES_FILMIC_TONE_MAPPING",[Er]:"AGX_TONE_MAPPING",[wr]:"NEUTRAL_TONE_MAPPING",[xo]:"CUSTOM_TONE_MAPPING"};var y2=new Float32Array(16),b2=new Float32Array(9),v2=new Float32Array(4);var S2={[Sr]:"Linear",[Tr]:"Reinhard",[Mr]:"Cineon",[Ar]:"ACESFilmic",[Er]:"AgX",[wr]:"Neutral",[xo]:"Custom"};var T2={[fo]:"SHADOWMAP_TYPE_PCF",[po]:"SHADOWMAP_TYPE_VSM"};var M2={[Rr]:"ENVMAP_TYPE_CUBE",[fs]:"ENVMAP_TYPE_CUBE",[yo]:"ENVMAP_TYPE_CUBE_UV"};var A2={[fs]:"ENVMAP_MODE_REFRACTION"};var E2={[mo]:"ENVMAP_BLENDING_MULTIPLY",[go]:"ENVMAP_BLENDING_MIX",[_o]:"ENVMAP_BLENDING_ADD"};var Yb=new H;Yb.set(-1,0,0,0,1,0,0,0,1);var w2=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);var xe={carrier:{kind:"carrier",maxHp:8000,halfLength:166,halfWidth:38,deckHeight:20,model:"models/carrier.glb",island:{center:[30,38,20],half:[8,18,22]},turrets:[{id:"ciws_bow_port",kind:"ciws",mannable:!0,offset:[-36,18,-150]},{id:"ciws_bow_stbd",kind:"ciws",mannable:!0,offset:[36,18,-140]},{id:"ciws_aft_port",kind:"ciws",mannable:!0,offset:[-36,18,150]},{id:"ciws_island",kind:"ciws",mannable:!0,offset:[38,58,10]}]},destroyer:{kind:"destroyer",maxHp:3000,halfLength:78,halfWidth:10,deckHeight:9,model:"models/destroyer.glb",island:{center:[0,22,-10],half:[8,13,16]},turrets:[{id:"gun_fwd",kind:"gun",mannable:!0,offset:[0,11,-52]},{id:"ciws_fwd",kind:"ciws",mannable:!0,offset:[0,30,-24]},{id:"ciws_aft",kind:"ciws",mannable:!0,offset:[0,18,34]}]}},ln=1200,Nu=600,nl={gun:0.15,rockets:1.6,missile_lock:3,missile_scanner:3.5,bomb:3,aa:0},Xr=6,il=3200;var Ii=2*Math.PI/1500;var Kb=[{dx:-260,dz:0},{dx:260,dz:120}],Zb=[{dx:-600,dz:-500},{dx:600,dz:-500},{dx:0,dz:750}],Ce=[0,1,2,3].flatMap((e)=>{let t=[0,Math.PI,-Math.PI/2,Math.PI/2][e],n=3200*Math.sin(t),i=3200*Math.cos(t),s=t-Math.PI/2,r=Math.cos(s),a=Math.sin(s),o=(l,c)=>[n+l*r+c*a,0,i-l*a+c*r];return[...Kb.map((l,c)=>({id:c===0?`t${e}-carrier`:`t${e}-carrier${c+1}`,team:e,kind:"carrier",position:o(l.dx,l.dz),heading:s})),...Zb.map((l,c)=>({id:`t${e}-dd${c+1}`,team:e,kind:"destroyer",position:o(l.dx,l.dz),heading:s}))]});function Pu(e,t,n){let i=Ii*Math.max(0,t),s=Math.cos(i),r=Math.sin(i),a=e.position[0],o=e.position[2],l=n??{position:[0,0,0],heading:0,velocity:[0,0,0],yawRate:0},c=a*s+o*r,u=-a*r+o*s;return l.position[0]=c,l.position[1]=0,l.position[2]=u,l.heading=e.heading+i,l.velocity[0]=Ii*u,l.velocity[1]=0,l.velocity[2]=-Ii*c,l.yawRate=Ii,l}function Yr(e,t){let n=Math.cos(e.heading),i=Math.sin(e.heading);return[e.position[0]+t[0]*n+t[2]*i,e.position[1]+t[1],e.position[2]-t[0]*i+t[2]*n]}function Ni(e,t){let n=t[0]-e.position[0],i=t[2]-e.position[2],s=Math.cos(e.heading),r=Math.sin(e.heading);return[n*s-i*r,t[1]-e.position[1],n*r+i*s]}var ta=1e4,pe=ta/2,Tt=0,ku=3500,Vu=1464421959,Jr=-40,Xn=25,jb=ta/Xn,Lu=0.26,Fu={jet:2.2,heli:1.9};var Fi=xe.carrier,Ns={catapults:[[-14,40],[6,52],[-14,78],[6,90],[-14,116],[6,128]],heloSpots:[[-27,92],[-27,124],[-27,154],[24,120],[24,150]]},ot=Ce.length,Xe=Ce.map((e)=>({...e,position:[e.position[0],0,e.position[2]]})),na=new Float64Array(ot),ia=new Float64Array(ot),Du=Ce.map(()=>[0,0,0]),Cn=new Uint8Array(ot).fill(1),Gu=new Uint8Array(ot).fill(1),Ps=new Uint8Array(ot).fill(1),zu=new Uint8Array(ot).fill(1),Qb=20,Cs=[[],[],[],[]];Ce.forEach((e,t)=>{if(e.kind==="carrier")Cs[e.team].push(t)});var sa=new Float64Array(ot),ea=new Float64Array(ot);Ce.forEach((e,t)=>{let n=xe[e.kind];na[t]=Math.sin(e.heading),ia[t]=Math.cos(e.heading),sa[t]=Math.hypot(n.halfLength,n.halfWidth)+1,ea[t]=Math.max(n.deckHeight,n.island.center[1]+n.island.half[1])});var rl=0,al=4,ul=Xe.slice(),Pi={position:[0,0,0],heading:0,velocity:[0,0,0]},Hu=new Map(Ce.map((e,t)=>[e.id,t]));function Wu(e,t){rl=Math.max(0,e);let n=Math.max(0,Math.min(4,Math.floor(t))),i=n!==al;al=n;for(let s=0;s<ot;s++){Pu(Ce[s],rl,Pi);let r=Xe[s];r.position[0]=Pi.position[0],r.position[2]=Pi.position[2],r.heading=Pi.heading,na[s]=Math.sin(r.heading),ia[s]=Math.cos(r.heading),Du[s][0]=Pi.velocity[0],Du[s][2]=Pi.velocity[2],Gu[s]=Ce[s].team<n?1:0}if($u()||i)ul=Xe.filter((s,r)=>Cn[r]===1);for(let s of Yu)hl(s)}function $u(){let e=!1;for(let t=0;t<ot;t++){let n=Gu[t]&&zu[t]?1:0;if(Cn[t]!==n)Cn[t]=n,e=!0}return e}function qu(e,t=1/0){if(!e)return;for(let n of e){let i=Hu.get(n.id);if(i===void 0)continue;Ps[i]=n.sunk?0:1,zu[i]=!n.sunk||t-n.sunkAt<Qb?1:0}if($u())ul=Xe.filter((n,i)=>Cn[i]===1);for(let n of Yu)hl(n)}function ra(){return{matchTime:rl,teams:al}}function lt(){return ul}function un(e){let t=Hu.get(e);return t===void 0?null:Xe[t]}function Xu(e){let t=Cs[e];for(let n of t)if(Ps[n])return n;return t[0]}function Ls(e){return Xe[Xu(e)]}var Wt={x:0,z:0};function ol(e,t,n){let i=Xe[e].position,s=t-i[0],r=n-i[2],a=ia[e],o=na[e];Wt.x=s*a-r*o,Wt.z=s*o+r*a}function ll(e,t,n,i,s){let r=Xe[e].position,a=ia[e],o=na[e];return s[0]=r[0]+t*a+i*o,s[1]=n,s[2]=r[2]-t*o+i*a,s}function hl(e){let t=Xu(e.team);e.center[0]=Xe[t].position[0],e.center[2]=Xe[t].position[2],e.heading=Xe[t].heading,e.helipads.forEach((n,i)=>ll(t,Ns.heloSpots[i][0],Fi.deckHeight,Ns.heloSpots[i][1],n))}var Yu=[0,1,2,3].map((e)=>{let t=Ls(e),n={team:e,heading:t.heading,center:[t.position[0],Fi.deckHeight,t.position[2]],runwayLength:Fi.halfLength*2,runwayWidth:Fi.halfWidth*2,safeRadius:ln,helipads:Ns.heloSpots.slice(0,4).map(()=>[0,0,0])};return hl(n),n});function Yn(e,t,n){let i=Math.imul(e|0,374761393)^Math.imul(t|0,668265263)^n;return i=Math.imul(i^i>>>13,1274126177),((i^i>>>16)>>>0)/4294967296}function dl(e,t,n=Vu){let i=Math.floor(e),s=Math.floor(t),r=e-i,a=t-s,o=r*r*(3-2*r),l=a*a*(3-2*a),c=Yn(i,s,n),u=Yn(i+1,s,n),h=Yn(i,s+1,n),d=Yn(i+1,s+1,n);return(c+(u-c)*o+(h-c)*l+(c-u-h+d)*o*l)*2-1}function Kr(e,t,n,i){let s=0,r=0.5,a=1;for(let o=0;o<i;o++)s+=dl(e*a,t*a,n+o*101)*r,a*=2.03,r*=0.5;return s}function Uu(e,t,n,i){let s=0,r=0.5,a=1,o=1;for(let l=0;l<i;l++){let c=1-Math.abs(dl(e*a,t*a,n+l*131));c*=c*o,o=Math.min(1,c*2),s+=c*r,a*=2.1,r*=0.5}return s}function Rn(e,t,n){let i=n<=e?0:n>=t?1:(n-e)/(t-e);return i*i*(3-2*i)}function Ku(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}var fl=1500,Jb=1000;function Zu(e,t){return Math.abs(Math.hypot(e,t)-il)-Jb}function ev(e,t,n){return Zu(e,t)<n}var Bu=1700;function tv(e){let t=Ku(e^88701),n=[],i=[],s=[];n.push({x:0,z:0,r:820,amp:1}),i.push({name:"Mainland",x:0,z:0,radius:900,height:0});for(let a=0;a<3;a++){let o=a/3*Math.PI*2+t()*0.8,l=450+t()*350;n.push({x:Math.cos(o)*l,z:Math.sin(o)*l,r:420+t()*220,amp:0.9})}for(let a=0,o=0;a<4&&o<200;o++){let l=t()*Math.PI*2,c=1050+t()*350,u=200+t()*180,h=Math.cos(l)*c,d=Math.sin(l)*c;if(n.some((f)=>Math.hypot(f.x-h,f.z-d)<f.r*0.6+u))continue;n.push({x:h,z:d,r:u,amp:0.8}),i.push({name:`Isle ${i.length+1}`,x:h,z:d,radius:u,height:0}),a++}let r=t()*Math.PI*2;s.push({x:Math.cos(r)*260,z:Math.sin(r)*260,r:600,h:430+t()*80}),s.push({x:Math.cos(r+2.6)*520,z:Math.sin(r+2.6)*520,r:420,h:280+t()*60});for(let a=0,o=0;a<9&&o<2000;o++){let l=t()*Math.PI*2,c=4500+t()*450,u=90+t()*140,h=Math.cos(l)*c,d=Math.sin(l)*c;if(Math.abs(h)>pe-250||Math.abs(d)>pe-250)continue;if(ev(h,d,u*1.6+150))continue;n.push({x:h,z:d,r:u,amp:0.6+t()*0.35}),a++}return{blobs:n,peaks:s,names:i}}var cl=Vu,ju=tv(cl),P2=ju.names,Se=jb,ue=Se+1,$t=500,cn=ta/$t,Zr=null;function nv(e){let t=typeof performance<"u"?performance.now():Date.now(),{blobs:n,peaks:i}=ju,s=new Float32Array(ue*ue),r=new Float32Array(ue*ue),a=new Float32Array(ue*ue),o=new Uint8Array(Se*Se),l=new Float32Array(ue*ue),c=500,u=ta/500,h=[];for(let g=0;g<u;g++)for(let _=0;_<u;_++){let x=-pe+(_+0.5)*500,b=-pe+(g+0.5)*500;h.push(n.filter((S)=>Math.hypot(x-S.x,b-S.z)<S.r*1.2+310+360))}for(let g=0;g<=Se;g++)for(let _=0;_<=Se;_++){let x=g*ue+_,b=_===0||g===0||_===Se||g===Se,S=b?0:(Yn(_,g,e^4369)-0.5)*2*Lu*Xn,v=b?0:(Yn(_,g,e^8738)-0.5)*2*Lu*Xn,A=-pe+_*Xn+S,E=-pe+g*Xn+v;r[x]=A,a[x]=E;let I=h[Math.min(u-1,Math.floor((E+pe)/500))*u+Math.min(u-1,Math.floor((A+pe)/500))];if(I.length===0){s[x]=Jr;continue}let F=A+Kr(A*0.0009,E*0.0009,e+7,4)*320,U=E+Kr(A*0.0009+31.7,E*0.0009-12.3,e+9,4)*320,P=0;for(let z=0;z<I.length;z++){let re=I[z],V=F-re.x,J=U-re.z,Ge=(V*V+J*J)/(re.r*re.r);if(Ge>=1.44)continue;let Ae=(1-Rn(0.25,1.2,Math.sqrt(Ge)))*re.amp;if(Ae>P)P=Ae}if(P>0)P-=(Kr(A*0.0016,E*0.0016,e+13,3)*0.5+0.25)*0.42*Rn(0,0.6,P)*(1-Rn(0.6,1,P)*0.5);if(P<=0.001){s[x]=Jr;continue}l[x]=P;let C=(Kr(A*0.0011,E*0.0011,e+21,4)*0.5+0.5)*120,B=Uu(F*0.0011,U*0.0011,e+33,4)*200*Rn(0.45,1,P),N=-30+P*95+(C+B)*Rn(0.2,0.75,P);for(let z of i){let re=Math.hypot(A-z.x,E-z.z)/z.r;if(re<1){let V=1-re;N+=z.h*V*V*(3-2*V)*(0.8+0.4*Uu(A*0.002,E*0.002,e+41,2))}}let R=Math.abs(dl(F*0.0011+5.1,U*0.0011-2.7,e+55)),Z=1-Rn(0.035,0.09,R);if(Z>0&&N>-2)N=N+(Math.min(N,-4+R*120)-N)*Z*Rn(0.25,0.5,P);s[x]=Math.max(Jr,N)}iv(s,l,e);let d=38;for(let g=1;g<Se;g++)for(let _=1;_<Se;_++){let x=g*ue+_,b=(s[x-1]+s[x+1]+s[x-ue]+s[x+ue])*0.25;if(s[x]-b>d)s[x]=b+d}let f=new Float32Array(s.length);for(let g=0;g<3;g++){f.set(s);for(let _=1;_<Se;_++)for(let x=1;x<Se;x++){let b=_*ue+x;if(f[b]<=0)continue;s[b]=f[b]*0.4+(f[b-1]+f[b+1]+f[b-ue]+f[b+ue])*0.15}}for(let g=0;g<s.length;g++){if(s[g]<=-12)continue;let _=Math.hypot(r[g],a[g]);if(_<il&&_>Bu-250)s[g]=Math.min(s[g],-1-(_-(Bu-250))*0.08);let x=Zu(r[g],a[g]);if(x<700){let b=Rn(0,700,x);s[g]=Math.min(s[g],-12+(s[g]+12)*b)}}for(let g=0;g<Se;g++)for(let _=0;_<Se;_++)o[g*Se+_]=Yn(_,g,e^13107)<0.5?0:1;let p=new Float32Array(cn*cn).fill(Tt);for(let g=0;g<=Se;g++)for(let _=0;_<=Se;_++){let x=g*ue+_,b=Math.min(cn-1,Math.floor((r[x]+pe)/$t)),S=Math.min(cn-1,Math.floor((a[x]+pe)/$t));for(let v=-1;v<=1;v++)for(let A=-1;A<=1;A++){let E=b+A,I=S+v;if(E<0||I<0||E>=cn||I>=cn)continue;let F=I*cn+E;if(s[x]>p[F])p[F]=s[x]}}let m=(typeof performance<"u"?performance.now():Date.now())-t;return{seed:e,h:s,vx:r,vz:a,diag:o,bound:p,ms:m}}function iv(e,t,n){let i=Ku(n^58381),s=14000,r=0.3,a=3,o=0.3,l=0.25,c=0.03,u=4,h=40,d=(f,p)=>{let m=f|0,g=p|0,_=f-m,x=p-g,b=g*ue+m;return e[b]*(1-_)*(1-x)+e[b+1]*_*(1-x)+e[b+ue]*(1-_)*x+e[b+ue+1]*_*x};for(let f=0;f<14000;f++){let p=1+i()*(Se-2),m=1+i()*(Se-2);if(t[(m|0)*ue+(p|0)]<0.3)continue;let g=0,_=0,x=1,b=1,S=0;for(let v=0;v<40;v++){let A=p|0,E=m|0,I=p-A,F=m-E,U=E*ue+A,P=e[U],C=e[U+1],B=e[U+ue],N=e[U+ue+1],R=(C-P)*(1-F)+(N-B)*F,Z=(B-P)*(1-I)+(N-C)*I,z=P*(1-I)*(1-F)+C*I*(1-F)+B*(1-I)*F+N*I*F;g=g*0.3-R*0.7,_=_*0.3-Z*0.7;let re=Math.hypot(g,_);if(re<0.000001)break;if(g/=re,_/=re,p+=g,m+=_,p<1||m<1||p>=Se-1||m>=Se-1)break;let J=d(p,m)-z;if(z<-2)break;let Ge=Math.max(-J*x*b*3,0.01);if(S>Ge||J>0){let Ae=J>0?Math.min(J,S):(S-Ge)*0.3;S-=Ae,e[U]+=Ae*(1-I)*(1-F),e[U+1]+=Ae*I*(1-F),e[U+ue]+=Ae*(1-I)*F,e[U+ue+1]+=Ae*I*F}else{let Ae=Math.min((Ge-S)*0.25,-J);e[U]-=Ae*(1-I)*(1-F),e[U+1]-=Ae*I*(1-F),e[U+ue]-=Ae*(1-I)*F,e[U+ue+1]-=Ae*I*F,S+=Ae}x=Math.sqrt(Math.max(0,x*x-J*4)),b*=0.97}}}function pl(){if(!Zr||Zr.seed!==cl)Zr=nv(cl);return Zr}var Li={h:0};function jr(e,t,n,i,s,r){let a=e.vx[t],o=e.vz[t],l=e.vx[n],c=e.vz[n],u=e.vx[i],h=e.vz[i],d=(c-h)*(a-u)+(u-l)*(o-h),f=((c-h)*(s-u)+(u-l)*(r-h))/d,p=((h-o)*(s-u)+(a-u)*(r-h))/d,m=1-f-p,g=-0.000001;if(f<-0.000001||p<-0.000001||m<-0.000001)return!1;let _=e.h[i];return Li.h=_+f*(e.h[t]-_)+p*(e.h[n]-_),!0}function Rs(e,t,n,i,s){if(t<0||n<0||t>=Se||n>=Se)return!1;let r=n*ue+t,a=r+1,o=r+ue,l=o+1;if(e.diag[n*Se+t]===0)return jr(e,r,o,a,i,s)||jr(e,a,o,l,i,s);return jr(e,r,o,l,i,s)||jr(e,r,l,a,i,s)}var sv=[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];function Qu(e,t){if(!(e>-pe&&e<pe&&t>-pe&&t<pe))return Jr;let n=pl(),i=(e+pe)/Xn,s=(t+pe)/Xn,r=Math.floor(i),a=Math.floor(s),o=i-r<0.5?-1:1,l=s-a<0.5?-1:1;if(Rs(n,r,a,e,t))return Li.h;if(Rs(n,r+o,a,e,t))return Li.h;if(Rs(n,r,a+l,e,t))return Li.h;if(Rs(n,r+o,a+l,e,t))return Li.h;for(let[u,h]of sv)if(Rs(n,r+u,a+h,e,t))return Li.h;let c=Math.min(Se,Math.max(0,Math.round(s)))*ue+Math.min(Se,Math.max(0,Math.round(i)));return n.h[c]}function Fs(e,t){for(let n=0;n<ot;n++){if(!Cn[n])continue;let i=Xe[n].position,s=sa[n],r=e-i[0],a=t-i[2];if(r>s||r<-s||a>s||a<-s)continue;ol(n,e,t);let o=xe[Ce[n].kind];if(Math.abs(Wt.x)<=o.halfWidth&&Math.abs(Wt.z)<=o.halfLength)return n}return-1}function Ju(e,t){let n=Fs(e,t);return n<0?null:Xe[n]}function eh(e){let t=xe[Ce[e].kind],n=t.island;if(Math.abs(Wt.x-n.center[0])<=n.half[0]&&Math.abs(Wt.z-n.center[2])<=n.half[2])return n.center[1]+n.half[1];return t.deckHeight}var Qr=[0,0,0];function aa(e,t){if(Fs(e,t)<0)return null;let i=Ii;return Qr[0]=i*t,Qr[1]=0,Qr[2]=-i*e,Qr}function rv(e,t,n){let i=Tt;for(let s=0;s<ot;s++){if(!Cn[s])continue;let r=Xe[s].position,a=sa[s]+n;if(Math.abs(e-r[0])<=a&&Math.abs(t-r[2])<=a&&ea[s]>i)i=ea[s]}return i}function In(e,t){if(!(e>-pe&&e<pe&&t>-pe&&t<pe))return Tt;let n=Fs(e,t);if(n>=0)return Math.max(eh(n),Is(e,t));let i=pl(),s=Math.floor((e+pe)/$t),r=Math.floor((t+pe)/$t);if(i.bound[r*cn+s]<=Tt)return Tt;return Is(e,t)}function Is(e,t){let n=Qu(e,t);return n>Tt?n:Tt}function sl(e,t){if(!(e>-pe&&e<pe&&t>-pe&&t<pe))return Tt;let i=pl().bound[Math.floor((t+pe)/$t)*cn+Math.floor((e+pe)/$t)],s=rv(e,t,$t);return s>i?s:i}function oa(e,t){if(Fs(e,t)>=0)return!1;return Qu(e,t)<=Tt}function av(e,t){let n=Fs(e,t);if(n<0||Ce[n].kind!=="carrier")return!1;return eh(n)===Fi.deckHeight}function la(e,t){if(t[1]>ku)return!1;for(let n=0;n<ot;n++){if(!Cn[n]||!Ps[n]||Ce[n].team!==e)continue;let i=Xe[n].position,s=t[0]-i[0],r=t[2]-i[2];if(s*s+r*r<ln*ln)return!0}return!1}function th(e,t,n){let i=Math.max(0,Math.floor(n)),s=0;for(let d of Cs[e])if(Ps[d])s++;let r=Cs[e][0];if(s>0){let d=i%s;for(let f of Cs[e])if(Ps[f]&&d--===0){r=f;break}}let a=s>0?Math.floor(i/s):i,o=Fi.deckHeight,l=[0,0,0];if(t==="apache"){let d=Ns.heloSpots,[f,p]=d[a%d.length];return{position:ll(r,f,o+Fu.heli,p,l),yaw:Xe[r].heading,onGround:!0}}let c=Ns.catapults,[u,h]=c[a%c.length];return{position:ll(r,u,o+Fu.jet,h,l),yaw:Xe[r].heading,onGround:!0}}function Ou(e,t,n,i,s){ol(e,t[0],t[2]);let{x:r,z:a}=Wt;ol(e,n[0],n[2]);let{x:o,z:l}=Wt,c=0,u=1;for(let h=0;h<3;h++){let d=h===0?r:h===1?t[1]:a,p=(h===0?o:h===1?n[1]:l)-d,m=i[h]-s[h],g=i[h]+s[h];if(Math.abs(p)<0.000000001){if(d<m||d>g)return null;continue}let _=(m-d)/p,x=(g-d)/p;if(_>x){let b=_;_=x,x=b}if(_>c)c=_;if(x<u)u=x;if(c>u)return null}return c}var nh={},ih={};for(let e of Object.keys(xe)){let t=xe[e];nh[e]=[0,(t.deckHeight-15)/2,0],ih[e]=[t.halfWidth,(t.deckHeight+15)/2,t.halfLength]}function ov(e,t){let n=null;for(let i=0;i<ot;i++){if(!Cn[i])continue;let s=xe[Ce[i].kind],r=sa[i]+5,a=Xe[i].position;if(Math.max(e[0],t[0])<a[0]-r||Math.min(e[0],t[0])>a[0]+r||Math.max(e[2],t[2])<a[2]-r||Math.min(e[2],t[2])>a[2]+r)continue;if(Math.min(e[1],t[1])>ea[i])continue;let o=Ou(i,e,t,nh[s.kind],ih[s.kind]);if(o!==null&&(n===null||o<n))n=o;let l=Ou(i,e,t,s.island.center,s.island.half);if(l!==null&&(n===null||l<n))n=l}return n}var lv=9;function Nn(e,t){let n=cv(e,t),i=ov(e,t);return n===null?i:i===null?n:Math.min(n,i)}function cv(e,t){let n=e[0],i=e[1],s=e[2],r=t[0]-n,a=t[1]-i,o=t[2]-s,l=i<t[1]?i:t[1],c=Math.sqrt(r*r+o*o);if(l>Tt){let g=Math.max(sl(n,s),sl(t[0],t[2]));if(c>$t*0.5){let _=Math.ceil(c/($t*0.5));for(let x=1;x<_;x++)g=Math.max(g,sl(n+r*x/_,s+o*x/_))}if(l>g)return null}let u=i-Is(n,s);if(u<=0)return 0;let h=Math.sqrt(c*c+a*a);if(h<0.000000001)return null;let d=Math.abs(a)/Math.max(c,0.000000001),f=Math.min(1,1.5/h),p=0,m=u;while(p<1){let g=c>0.000000001?m/(lv+d)/c:m/Math.max(Math.abs(a),0.000000001);if(g<f)g=f;let _=p+g;if(_>1)_=1;let x=i+a*_-Is(n+r*_,s+o*_);if(x<=0){let b=p,S=_;for(let v=0;v<18;v++){let A=(b+S)*0.5;if(i+a*A-Is(n+r*A,s+o*A)<=0)S=A;else b=A}return S}p=_,m=x}return null}var qt={groundHeight:In,onRunway:av,isWater:oa,half:pe,ceiling:ku};var j={cannon20:{id:"cannon20",name:"20mm Vulcan",kind:"gun",damage:9,splash:0,rate:16,speed:1150,ttl:1.15,ammo:600,refill:15,refillDelay:2,spread:0.0025},chaingun30:{id:"chaingun30",name:"30mm Chain Gun",kind:"gun",damage:16,splash:4,rate:10,speed:900,ttl:1.5,ammo:300,refill:15,refillDelay:2,spread:0.004,turret:!0},gau8:{id:"gau8",name:"GAU-8 Avenger",kind:"gun",damage:14,splash:2,rate:30,speed:1100,ttl:1.2,ammo:1100,refill:15,refillDelay:2,spread:0.005},rockets:{id:"rockets",name:"Hydra 70 Rockets",kind:"rockets",damage:60,splash:12,rate:8,speed:700,ttl:4,ammo:38,refill:20,refillDelay:2,spread:0.015},aim9:{id:"aim9",name:"Heat-Seeker",kind:"missile_lock",damage:120,splash:12,rate:0.25,speed:280,ttl:6,ammo:2,refill:40,refillDelay:4,range:1100,lockCone:0.08,lockTime:2.2,turnRate:1.6},tvmissile:{id:"tvmissile",name:"Radar Missile",kind:"missile_lock",damage:130,splash:12,rate:0.2,speed:300,ttl:7,ammo:2,refill:40,refillDelay:4,range:1500,lockCone:0.07,lockTime:2.5,turnRate:1.5,turret:!0},hellfire:{id:"hellfire",name:"Hellfire",kind:"missile_lock",damage:130,splash:12,rate:0.25,speed:260,ttl:8,ammo:4,refill:40,refillDelay:4,range:1500,lockCone:0.07,lockTime:2.5,turnRate:1.5,turret:!0},maverick:{id:"maverick",name:"Maverick",kind:"missile_lock",damage:150,splash:14,rate:0.2,speed:280,ttl:8,ammo:2,refill:40,refillDelay:4,range:1500,lockCone:0.07,lockTime:2.5,turnRate:1.4,turret:!0},aim47:{id:"aim47",name:"Long-Range Interceptor",kind:"missile_scanner",damage:160,splash:16,rate:0.2,speed:450,ttl:22,ammo:3,refill:50,refillDelay:5,range:8000,lockCone:0.08,lockTime:3,turnRate:1.3,turret:!0},bomb:{id:"bomb",name:"Bomb",kind:"bomb",damage:900,splash:45,rate:0.6,speed:0,ttl:40,ammo:8,refill:60,refillDelay:6,turret:!0},radarpulse:{id:"radarpulse",name:"Radar Pulse",kind:"pulse",damage:0,splash:4000,rate:0.05,speed:0,ttl:8,ammo:-1,refill:0,refillDelay:0,turret:!0}},sh=600,rh=4,ah=8,ml={fighter:{kind:"fighter",name:"F/A-18F Super Hornet",model:"models/fa18.glb",flight:"jet",maxHp:450,radius:8,cruise:135,boost:185,stall:55,seatWeapons:[["cannon20","aim9"],["tvmissile",null]],flares:12,seatNames:["Pilot","Weapons Officer"]},apache:{kind:"apache",name:"AH-64 Apache",model:"models/apache.glb",flight:"heli",maxHp:550,radius:7.5,cruise:75,boost:98,stall:0,seatWeapons:[["rockets",null],["chaingun30","hellfire"]],flares:10,seatNames:["Pilot","Gunner"]},warthog:{kind:"warthog",name:"A-10 Warthog",model:"models/a10.glb",flight:"jet",maxHp:850,radius:8.5,cruise:105,boost:135,stall:45,seatWeapons:[["gau8","rockets"],["maverick",null]],flares:16,seatNames:["Pilot","Weapons Officer"]},blackbird:{kind:"blackbird",name:"YF-12 Blackbird",model:"models/yf12.glb",flight:"jet",maxHp:380,radius:12,cruise:190,boost:260,stall:75,seatWeapons:[[null,null],["aim47","radarpulse"]],flares:8,seatNames:["Pilot","Radar Officer"]},bomber:{kind:"bomber",name:"B-2 Spirit",model:"models/b2.glb",flight:"jet",maxHp:900,radius:18,cruise:150,boost:180,stall:70,seatWeapons:[["bomb",null],["bomb",null]],flares:10,seatNames:["Pilot","Bombardier"],stealth:!0}},K={...ml,"astra-interceptor":{...ml.fighter,kind:"astra-interceptor",name:"Astra Interceptor",model:"models/astra-interceptor.glb",cruise:145.8,boost:199.8},"astra-trainer":{...ml.fighter,kind:"astra-trainer",name:"Astra Trainer",model:"models/astra-trainer.glb",cruise:121.5,boost:166.5}},Kn=Object.keys(K);var oh={fighter:[0,1.6,-5.2],apache:[0,2.5,-1.2],warthog:[0,1.7,-4.4],blackbird:[0,1.6,-9],bomber:[0,2.2,-9],"astra-interceptor":[0,1.35,-3],"astra-trainer":[0,1.35,-0.65]},lh={fighter:[0,-1.4,-3],apache:[0,-1.3,-4.2],warthog:[0,-1.5,-2],blackbird:[0,-2.4,-15],bomber:[0,-3,-4],"astra-interceptor":[0,-1.4,-3],"astra-trainer":[0,-1.4,-0.65]},uv={fighter:9,apache:2.5,warthog:8,blackbird:4,bomber:3,"astra-interceptor":9,"astra-trainer":6},ch={fighter:1.5,apache:0.6,warthog:1.5,blackbird:1.5,bomber:2,"astra-interceptor":1.5,"astra-trainer":1.5},hv=2,dv=8,uh=1.5,hh={fighter:{dist:26,height:6},apache:{dist:24,height:7},warthog:{dist:28,height:7},blackbird:{dist:40,height:9},bomber:{dist:60,height:13},"astra-interceptor":{dist:26,height:6},"astra-trainer":{dist:22,height:6}},dh={"astra-interceptor":0.02,"astra-trainer":0.035},Xt=new w(0,1,0),fh=new Re,he=new w,pt=new w,et=new ve,hn=new ve,ph=new ve,gl=new ve,_l=new w,mh=new w,fv=6;function gh(e,t){let n=K[e];if(n.flight!=="jet")return 0;return fv*wn.smoothstep(t,n.cruise*1.02,n.cruise+(n.boost-n.cruise)*0.4)}var pv=35,mv=10,gv=0.8,_v=0.12,xv=4;function yv(e,t,n,i,s,r,a,o){let l=t[1]*n[2]-t[2]*n[1],c=t[2]*n[0]-t[0]*n[2],u=t[0]*n[1]-t[1]*n[0],h=Math.tan(i),d=Math.tan(s),f=t[0]+l*h+n[0]*d,p=t[1]+c*h+n[1]*d,m=t[2]+u*h+n[2]*d,g=Math.hypot(f,p,m);if(f/=g,p/=g,m/=g,p>-0.001)return o[0]=f,o[1]=p,o[2]=m,!1;let _=a(r[0],r[2]),x=0,b=0,S=0;for(let F=0;F<2;F++){let U=(e[1]-_)/-p;x=e[0]+f*U,b=_,S=e[2]+m*U,_=a(x,S)}let v=x-r[0],A=b-r[1],E=S-r[2],I=Math.hypot(v,A,E)||1;return o[0]=v/I,o[1]=A/I,o[2]=E/I,!0}var bv=0.06,_h=0.7,xh=0.3;function vv(e,t){let n=Sv.set(0,0,-1).applyQuaternion(e),i=yh.set(1,0,0).applyQuaternion(e),s=bh.set(0,1,0).applyQuaternion(e),r=Math.atan2(-n.x,-n.z),a=Math.asin(wn.clamp(n.y,-1,1)),o=Math.atan2(-i.y,s.y),l=wn.smoothstep(Math.abs(o),Math.PI/3,Math.PI*0.85),c=xh+(1-xh)*l,u=_h+(1-_h)*l;return vh.setFromAxisAngle(Xt,r),t.copy(vh).multiply(Sh.setFromAxisAngle(yh.set(1,0,0),a*u)).multiply(Sh.setFromAxisAngle(bh.set(0,0,1),-o*c)),t}var Sv=new w,yh=new w,bh=new w,vh=new ve,Sh=new ve;class xl{camera;mode="menu";zoom=1;gunZoom=1;baseFov=62;blend=1;fromPos=new w;fromQuat=new ve;pos=new w;quat=new ve;fov=62;time=0;shakeAmt=0;orbitAngle=0;followQ=new ve;followInit=!1;chaseLook=new w(0,0,-1);chaseLookInit=!1;bombLook=new w(0,-1,0);bombHeading=new w(0,0,-1);bombInit=!1;bombEye=new w;bombFwd=new w(0,-1,0);bombUp=new w(0,0,-1);constructor(e){this.camera=e;this.pos.copy(e.position),this.quat.copy(e.quaternion)}setMode(e){if(e===this.mode)return;this.mode=e,this.fromPos.copy(this.camera.position),this.fromQuat.copy(this.camera.quaternion),this.blend=0}shake(e){this.shakeAmt=Math.min(2,this.shakeAmt+e)}orbit(e,t,n,i,s){this.orbitAngle+=e*s;let r=this.orbitAngle;this.pos.set(t[0]+Math.cos(r)*n,t[1]+i,t[2]+Math.sin(r)*n),he.set(t[0],t[1]+i*0.15,t[2]),this.lookAt(this.pos,he,Xt),this.fov=this.baseFov}chase(e,t,n,i,s,r){let a=hh[t],o=Math.hypot(i[0],i[1],i[2]),l=a.dist*this.zoom*(1+Math.min(o,260)/900),c=a.height*this.zoom;if(!this.chaseLookInit||this.chaseLook.dot(s)<0.2)this.chaseLook.copy(s),this.chaseLookInit=!0;else this.chaseLook.lerp(s,1-Math.exp(-e/bv)).normalize();let u=this.chaseLook;this.pos.set(n[0],n[1],n[2]).addScaledVector(u,-l).addScaledVector(Xt,c);let h=r(this.pos.x,this.pos.z)+3;if(this.pos.y<h)this.pos.y=h;he.set(n[0],n[1],n[2]).addScaledVector(u,400).addScaledVector(Xt,c*0.6),this.lookAt(this.pos,he,Xt),this.fov=this.baseFov+Math.min(14,Math.max(0,o-80)*0.06)+gh(t,o)}chaseBody(e,t,n,i,s,r,a,o){let l=hh[t];et.set(s[0],s[1],s[2],s[3]);let c=t==="apache";if(c)vv(et,et);if(!this.followInit)this.followQ.copy(et),this.followInit=!0;if(this.followQ.slerp(et,1-Math.exp(-e*(c?5:7))),hn.copy(this.followQ),r||a)hn.multiply(ph.setFromAxisAngle(Xt,r)).multiply(gl.setFromAxisAngle(_l.set(1,0,0),a));let u=Math.hypot(i[0],i[1],i[2]),h=l.dist*this.zoom*(1+Math.min(u,260)/900),d=l.height*this.zoom;he.set(n[0],n[1],n[2]),this.pos.set(0,d,h).applyQuaternion(hn).add(he);let f=o(this.pos.x,this.pos.z)+3;if(this.pos.y<f)this.pos.y=f;pt.set(0,d*0.55,-80).applyQuaternion(hn).add(he),mh.set(0,1,0).applyQuaternion(hn),this.lookAt(this.pos,pt,mh),this.fov=this.baseFov+Math.min(14,Math.max(0,u-80)*0.06)+gh(t,u)}cockpitBody(e,t,n,i,s,r){et.set(i[0],i[1],i[2],i[3]);let a=oh[t];this.pos.set(a[0],a[1],a[2]).applyQuaternion(et).add(he.set(n[0],n[1],n[2])),hn.copy(et).multiply(ph.setFromAxisAngle(Xt,s)).multiply(gl.setFromAxisAngle(_l.set(1,0,0),r+(dh[t]??0))),this.quat.copy(hn),this.fov=this.baseFov+6}resetFollow(){this.followInit=!1,this.chaseLookInit=!1}cockpit(e,t,n,i,s){et.set(i[0],i[1],i[2],i[3]);let r=oh[t];this.pos.set(r[0],r[1],r[2]).applyQuaternion(et).add(he.set(n[0],n[1],n[2])),pt.set(0,1,0).applyQuaternion(et).lerp(Xt,0.35).normalize(),he.copy(this.pos).add(s),this.lookAt(this.pos,he,pt),this.quat.multiply(gl.setFromAxisAngle(_l.set(1,0,0),dh[t]??0)),this.fov=this.baseFov+6}bombsight(e,t,n,i,s,r){et.set(i[0],i[1],i[2],i[3]);let a=lh[t];if(this.pos.set(a[0],a[1],a[2]).applyQuaternion(et).add(he.set(n[0],n[1],n[2])),this.pos.y-=ch[t],pt.set(0,0,-1).applyQuaternion(et),pt.y=0,pt.lengthSq()<0.000001)pt.set(0,0,-1);pt.normalize(),he.copy(this.pos).add(s),this.lookAt(this.pos,he,pt),this.fov=60/Math.max(hv,Math.min(dv,r))}bombcam(e,t,n,i=1){if(he.set(n[0],n[1],n[2]),he.lengthSq()<0.000001)he.set(0,-1,0);if(he.normalize(),he.y-=gv,he.normalize(),!this.bombInit)this.bombLook.copy(he),this.bombInit=!0;else this.bombLook.lerp(he,1-Math.exp(-e/_v)).normalize();if(pt.set(n[0],0,n[2]),pt.lengthSq()>0.0001)this.bombHeading.copy(pt.normalize());this.pos.set(t[0],t[1],t[2]).addScaledVector(this.bombLook,-pv),this.pos.y+=mv;let s=In(this.pos.x,this.pos.z)+uh;if(this.pos.y<s)this.pos.y=s;he.set(t[0],t[1],t[2]).addScaledVector(this.bombLook,200),this.lookAt(this.pos,he,this.bombHeading),this.bombEye.copy(this.pos),this.bombFwd.set(0,0,-1).applyQuaternion(this.quat),this.bombUp.set(0,1,0).applyQuaternion(this.quat),this.fov=55/Math.max(1,Math.min(xv,i))}bombcamAim(e,t,n,i){let s=this.bombEye,r=this.bombFwd,a=this.bombUp;return yv([s.x,s.y,s.z],[r.x,r.y,r.z],[a.x,a.y,a.z],e,t,n,In,i)}resetBombcam(){this.bombInit=!1}gunner(e,t,n,i,s,r=null){if(et.set(i[0],i[1],i[2],i[3]),r)this.pos.copy(r);else{let o=lh[t];this.pos.set(o[0],o[1],o[2]).applyQuaternion(et).add(he.set(n[0],n[1],n[2]))}this.pos.addScaledVector(s,uv[t]),this.pos.y-=ch[t];let a=In(this.pos.x,this.pos.z)+uh;if(this.pos.y<a)this.pos.y=a;he.copy(this.pos).add(s),this.lookAt(this.pos,he,Xt),this.fov=60/this.gunZoom}death(e,t,n,i){let s=110+n*25,r=n*0.35+0.6;if(this.pos.set(t[0]+Math.cos(r)*s,t[1]+45+n*14,t[2]+Math.sin(r)*s),i)this.pos.y=Math.max(this.pos.y,i(this.pos.x,this.pos.z)+25,i(t[0],t[2])+30);he.set(t[0],t[1],t[2]),this.lookAt(this.pos,he,Xt),this.fov=this.baseFov}apply(e){this.time+=e;let t=this.camera;if(this.blend<1){this.blend=Math.min(1,this.blend+e/0.7);let i=this.blend*this.blend*(3-2*this.blend);t.position.lerpVectors(this.fromPos,this.pos,i),t.quaternion.slerpQuaternions(this.fromQuat,this.quat,i)}else t.position.copy(this.pos),t.quaternion.copy(this.quat);if(this.shakeAmt>0.001){let i=this.shakeAmt,s=this.time*40;hn.setFromAxisAngle(he.set(Math.sin(s*1.3),Math.cos(s*1.7),Math.sin(s*0.7)).normalize(),i*0.012),t.quaternion.multiply(hn),this.shakeAmt*=Math.exp(-e*5)}let n=wn.lerp(t.fov,this.fov,1-Math.exp(-e*8));if(Math.abs(n-t.fov)>0.01)t.fov=n,t.updateProjectionMatrix()}lookAt(e,t,n){fh.lookAt(e,t,n),this.quat.setFromRotationMatrix(fh)}}var Tv=[/^StackTrace\.js$/,/^TSLCore\.js$/,/^.*Node\.js$/,/^three\.webgpu.*\.js$/];function Mv(e){let t=/(?:at\s+(.+?)\s+\()?(?:(.+?)@)?([^@\s()]+):(\d+):(\d+)/;return e.split(`
`).map((n)=>{let i=n.match(t);if(!i)return null;let s=i[1]||i[2]||"",r=i[3].split("?")[0],a=parseInt(i[4],10),o=parseInt(i[5],10),l=r.split("/").pop();return{fn:s,file:l,line:a,column:o}}).filter((n)=>n&&!Tv.some((i)=>i.test(n.file)))}class Ut{constructor(e=null){this.isStackTrace=!0,this.stack=Mv(e?e:Error().stack)}getLocation(){if(this.stack.length===0)return"[Unknown location]";let e=this.stack[0],t=e.fn;return`${t?`"${t}()" at `:""}"${e.file}:${e.line}"`}getError(e){if(this.stack.length===0)return e;let t=this.stack.map((n)=>{let i=`${n.file}:${n.line}:${n.column}`;if(n.fn)return`    at ${n.fn} (${i})`;return`    at ${i}`}).join(`
`);return`${e}
${t}`}}function Vl(e,t=0){let n=3735928559^t,i=1103547991^t;if(Array.isArray(e))for(let s=0,r;s<e.length;s++)r=e[s],n=Math.imul(n^r,2654435761),i=Math.imul(i^r,1597334677);else for(let s=0,r;s<e.length;s++)r=e.charCodeAt(s),n=Math.imul(n^r,2654435761),i=Math.imul(i^r,1597334677);return n=Math.imul(n^n>>>16,2246822507),n^=Math.imul(i^i>>>13,3266489909),i=Math.imul(i^i>>>16,2246822507),i^=Math.imul(n^n>>>13,3266489909),4294967296*(2097151&i)+(n>>>0)}var Gh=(e)=>Vl(e),Av=(e)=>Vl(e),zh=(...e)=>Vl(e),Ev=new Map([[1,"float"],[2,"vec2"],[3,"vec3"],[4,"vec4"],[9,"mat3"],[16,"mat4"]]);function wv(e){return Ev.get(e)}function ga(e){if(e===void 0||e===null)return null;let t=typeof e;if(e.isNode===!0)return"node";else if(t==="number")return"float";else if(t==="boolean")return"bool";else if(t==="string")return"string";else if(t==="function")return"shader";else if(e.isVector2===!0)return"vec2";else if(e.isVector3===!0)return"vec3";else if(e.isVector4===!0)return"vec4";else if(e.isMatrix2===!0)return"mat2";else if(e.isMatrix3===!0)return"mat3";else if(e.isMatrix4===!0)return"mat4";else if(e.isColor===!0)return"color";else if(e instanceof ArrayBuffer)return"ArrayBuffer";return null}function Rv(e){if(e.isDepthTexture===!0)return"float";let t=e.format,n;if(t===Ro||t===Co||t===Eo||t===wo||t===Mo)n=1;else if(t===Pr||t===Io)n=2;else if(t===Ao||t===No)n=3;else n=4;let i;if(e.type===Nr)i="uint";else if(e.type===Ir)i="int";else i="float";if(n===1)return i;let s=wv(n);if(i!=="float")s=i[0]+s;return s}function Gl(e,...t){let n=e?e.slice(-4):void 0;if(t.length===1){if(n==="vec2")t=[t[0],t[0]];else if(n==="vec3")t=[t[0],t[0],t[0]];else if(n==="vec4")t=[t[0],t[0],t[0],t[0]]}if(e==="color")return new Be(...t);else if(n==="vec2")return new Ue(...t);else if(n==="vec3")return new w(...t);else if(n==="vec4")return new Ht(...t);else if(n==="mat2")return new ws(...t);else if(n==="mat3")return new H(...t);else if(n==="mat4")return new Re(...t);else if(e==="bool")return t[0]||!1;else if(e==="float"||e==="int"||e==="uint")return t[0]||0;else if(e==="string")return t[0]||"";else if(e==="ArrayBuffer")return Iv(t[0]);return null}function Cv(e){let t="",n=new Uint8Array(e);for(let i=0;i<n.length;i++)t+=String.fromCharCode(n[i]);return btoa(t)}function Iv(e){return Uint8Array.from(atob(e),(t)=>t.charCodeAt(0)).buffer}function Hh(e){return e[0]!==void 0&&e[0]!==null&&(e[0].isNode||Object.getPrototypeOf(e[0])!==Object.prototype)}var Ds={VERTEX:"vertex",FRAGMENT:"fragment"},le={NONE:"none",FRAME:"frame",RENDER:"render",OBJECT:"object"};var yl={READ_ONLY:"readOnly",WRITE_ONLY:"writeOnly",READ_WRITE:"readWrite"},Nv=["fragment","vertex"];var z2=[...Nv,"compute"],qs=["x","y","z","w"],Pv={analyze:"setup",generate:"analyze"},Lv=0;class G extends on{static get type(){return"Node"}constructor(e=null){super();if(this.nodeType=e,this.updateType=le.NONE,this.updateBeforeType=le.NONE,this.updateAfterType=le.NONE,this.version=0,this.name="",this.global=!1,this.parents=!1,this.isNode=!0,this._beforeNodes=null,this._cacheKey=null,this._uuid=null,this._cacheKeyVersion=0,this.id=Lv++,this.stackTrace=null,G.captureStackTrace===!0)this.stackTrace=new Ut}set needsUpdate(e){if(e===!0)this.version++}get uuid(){if(this._uuid===null)this._uuid=wn.generateUUID();return this._uuid}get type(){return this.constructor.type}onUpdate(e,t){return this.updateType=t,this.update=e.bind(this),this}onFrameUpdate(e){return this.onUpdate(e,le.FRAME)}onRenderUpdate(e){return this.onUpdate(e,le.RENDER)}onObjectUpdate(e){return this.onUpdate(e,le.OBJECT)}onReference(e){return this.updateReference=e.bind(this),this}updateReference(){return this}isGlobal(){return this.global}*getChildren(){for(let{childNode:e}of this._getChildren())yield e}dispose(){this.dispatchEvent({type:"dispose"})}traverse(e){e(this);for(let t of this.getChildren())t.traverse(e)}_getChildren(e=new Set){let t=[];e.add(this);for(let n of Object.getOwnPropertyNames(this)){let i=this[n];if(n.startsWith("_")===!0||e.has(i))continue;if(Array.isArray(i)===!0)for(let s=0;s<i.length;s++){let r=i[s];if(r&&r.isNode===!0)t.push({property:n,index:s,childNode:r})}else if(i&&i.isNode===!0)t.push({property:n,childNode:i});else if(i&&Object.getPrototypeOf(i)===Object.prototype)for(let s in i){if(s.startsWith("_")===!0)continue;let r=i[s];if(r&&r.isNode===!0)t.push({property:n,index:s,childNode:r})}}return t}getCacheKey(e=!1,t=null){if(e=e||this.version!==this._cacheKeyVersion,e===!0||this._cacheKey===null){if(t===null)t=new Set;let n=[];for(let{property:i,childNode:s}of this._getChildren(t))n.push(Gh(i.slice(0,-4)),s.getCacheKey(e,t));this._cacheKey=zh(Av(n),this.customCacheKey()),this._cacheKeyVersion=this.version}return this._cacheKey}customCacheKey(){return this.id}getScope(){return this}getHash(){return String(this.id)}getUpdateType(){return this.updateType}getUpdateBeforeType(){return this.updateBeforeType}getUpdateAfterType(){return this.updateAfterType}getElementType(e){let t=this.getNodeType(e);return e.getElementType(t)}getMemberType(){return"void"}getNodeType(e,t=null){let n=e.getDataFromNode(this),i;if(t!==null){if(n.typeFromOutput=n.typeFromOutput||{},i=n.typeFromOutput[t],i===void 0)i=this.generateNodeType(e,t),n.typeFromOutput[t]=i}else if(i=n.type,i===void 0)i=this.generateNodeType(e),n.type=i;return i}generateNodeType(e,t=null){let n=e.getNodeProperties(this);if(n.outputNode)return n.outputNode.getNodeType(e,t);return this.nodeType}getShared(e){let t=this.getHash(e),n=e.getNodeFromHash(t),i=null;if(n&&n!==this)i=n;else if(e.context.overrideNodes){let s=e.context.overrideNodes.get(this);if(s){let r=e.getDataFromNode(this);if(r.isOverwritten!==!0)r.isOverwritten=!0,i=s(e).overrideNode(this,null),r.sharedNode=i;else i=r.sharedNode}}return i||this}getArrayCount(){return null}setup(e){let t=e.getNodeProperties(this),n=0;for(let i of this.getChildren())t["node"+n++]=i;return t.outputNode||null}analyze(e,t=null){let n=e.increaseUsage(this);if(this.parents===!0){let i=e.getDataFromNode(this,"any");i.stages=i.stages||{},i.stages[e.shaderStage]=i.stages[e.shaderStage]||[],i.stages[e.shaderStage].push(t)}if(n===1){let i=e.getNodeProperties(this);for(let s of Object.values(i))if(s&&s.isNode===!0)s.build(e,this)}}generate(e,t){let{outputNode:n}=e.getNodeProperties(this);if(n&&n.isNode===!0)return n.build(e,t)}updateBefore(){Q("Abstract function.")}updateAfter(){Q("Abstract function.")}update(){Q("Abstract function.")}before(e){if(this._beforeNodes===null)this._beforeNodes=[];return this._beforeNodes.push(e),this}build(e,t=null){let n=this.getShared(e);if(this!==n)return n.build(e,t);if(this._beforeNodes!==null){let o=this._beforeNodes;this._beforeNodes=null;for(let l of o)l.build(e,t);this._beforeNodes=o}let i=e.getDataFromNode(this);i.buildStages=i.buildStages||{},i.buildStages[e.buildStage]=!0;let s=Pv[e.buildStage];if(s&&i.buildStages[s]!==!0){let o=e.getBuildStage();e.setBuildStage(s),this.build(e),e.setBuildStage(o)}e.addChain(this);let r=null,a=e.getBuildStage();if(a==="setup"){e.addNode(this),this.updateReference(e);let o=e.getNodeProperties(this);if(o.initialized!==!0){o.initialized=!0,o.outputNode=this.setup(e)||o.outputNode||null;for(let l of Object.values(o))if(l&&l.isNode===!0){if(l.parents===!0){let c=e.getNodeProperties(l);c.parents=c.parents||[],c.parents.push(this)}l.build(e)}e.addSequentialNode(this)}r=o.outputNode}else if(a==="analyze")this.analyze(e,t);else if(a==="generate"){if(this.generate.length<2){let l=this.getNodeType(e),c=e.getDataFromNode(this);if(r=c.snippet,r===void 0)if(c.generated===void 0)c.generated=!0,r=this.generate(e)||"",c.snippet=r;else Q("Node: Recursion detected.",this),r="/* Recursion detected. */";else if(c.flowCodes!==void 0&&e.context.nodeBlock!==void 0)e.addFlowCodeHierarchy(this,e.context.nodeBlock);r=e.format(r,l,t)}else r=this.generate(e,t)||"";if(r===""&&t!==null&&t!=="void"&&t!=="OutputType")Y(`TSL: Invalid generated code, expected a "${t}".`),r=e.generateConst(t)}return e.removeChain(this),r}getSerializeChildren(){return this._getChildren()}serialize(e){let t=this.getSerializeChildren(),n={};for(let{property:i,index:s,childNode:r}of t)if(s!==void 0){if(n[i]===void 0)n[i]=Number.isInteger(s)?[]:{};n[i][s]=r.toJSON(e.meta).uuid}else n[i]=r.toJSON(e.meta).uuid;if(Object.keys(n).length>0)e.inputNodes=n}deserialize(e){if(e.inputNodes!==void 0){let t=e.meta.nodes;for(let n in e.inputNodes)if(Array.isArray(e.inputNodes[n])){let i=[];for(let s of e.inputNodes[n])i.push(t[s]);this[n]=i}else if(typeof e.inputNodes[n]==="object"){let i={};for(let s in e.inputNodes[n]){let r=e.inputNodes[n][s];i[s]=t[r]}this[n]=i}else{let i=e.inputNodes[n];this[n]=t[i]}}}toJSON(e){let{uuid:t,type:n}=this,i=e===void 0||typeof e==="string";if(i)e={textures:{},images:{},nodes:{}};let s=e.nodes[t];if(s===void 0){if(s={uuid:t,type:n,meta:e,metadata:{version:4.7,type:"Node",generator:"Node.toJSON"}},i!==!0)e.nodes[s.uuid]=s;this.serialize(s),delete s.meta}function r(a){let o=[];for(let l in a){let c=a[l];delete c.metadata,o.push(c)}return o}if(i){let a=r(e.textures),o=r(e.images),l=r(e.nodes);if(a.length>0)s.textures=a;if(o.length>0)s.images=o;if(l.length>0)s.nodes=l}return s}}G.captureStackTrace=!1;class Xs extends G{static get type(){return"ArrayElementNode"}constructor(e,t){super();this.node=e,this.indexNode=t,this.isArrayElementNode=!0}generateNodeType(e){return this.node.getElementType(e)}getMemberType(e,t){return this.node.getMemberType(e,t)}generate(e){let t=this.indexNode.getNodeType(e),n=this.node.build(e),i=this.indexNode.build(e,!e.isVector(t)&&e.isInteger(t)?t:"uint");return`${n}[ ${i} ]`}}class zl extends G{static get type(){return"ConvertNode"}constructor(e,t){super();this.node=e,this.convertTo=t}generateNodeType(e){let t=this.node.getNodeType(e),n=null;for(let i of this.convertTo.split("|"))if(n===null||e.getTypeLength(t)===e.getTypeLength(i))n=i;return n}serialize(e){super.serialize(e),e.convertTo=this.convertTo}deserialize(e){super.deserialize(e),this.convertTo=e.convertTo}generate(e,t){let n=this.node,i=this.getNodeType(e),s=n.build(e,i);return e.format(s,i,t)}}class it extends G{static get type(){return"TempNode"}constructor(e=null){super(e);this.isTempNode=!0}hasDependencies(e){return e.getDataFromNode(this).usageCount>1}build(e,t){if(e.getBuildStage()==="generate"){let i=e.getVectorType(this.getNodeType(e,t)),s=e.getDataFromNode(this);if(s.propertyName!==void 0)return e.format(s.propertyName,i,t);else if(i!=="void"&&t!=="void"&&this.hasDependencies(e)){let r=super.build(e,i),a=e.getVarFromNode(this,null,i),o=e.getPropertyName(a);return e.addLineFlowCode(`${o} = ${r}`,this),s.snippet=r,s.propertyName=o,e.format(s.propertyName,i,t)}}return super.build(e,t)}}class Wh extends it{static get type(){return"JoinNode"}constructor(e=[],t=null){super(t);this.nodes=e}generateNodeType(e){if(this.nodeType!==null)return e.getVectorType(this.nodeType);return e.getTypeFromLength(this.nodes.reduce((t,n)=>t+e.getTypeLength(n.getNodeType(e)),0))}generate(e,t){let n=this.getNodeType(e),i=e.getTypeLength(n),s=this.nodes,r=e.getComponentType(n),a=[],o=0;for(let c of s){if(o>=i){Y(`TSL: Length of parameters exceeds maximum length of function '${n}()' type.`,this.stackTrace);break}let u=c.getNodeType(e),h=e.getTypeLength(u),d;if(o+h>i)Y(`TSL: Length of '${n}()' data exceeds maximum length of output type.`,this.stackTrace),h=i-o,u=e.getTypeFromLength(h);if(o+=h,d=c.build(e,u),e.getComponentType(u)!==r){let p=e.getTypeFromLength(h,r);d=e.format(d,u,p)}a.push(d)}let l=`${e.getType(n)}( ${a.join(", ")} )`;return e.format(l,n,t)}}var Fv=qs.join("");class $h extends G{static get type(){return"SplitNode"}constructor(e,t="x"){super();this.node=e,this.components=t,this.isSplitNode=!0}getVectorLength(){let e=this.components.length;for(let t of this.components)e=Math.max(qs.indexOf(t)+1,e);return e}getComponentType(e){return e.getComponentType(this.node.getNodeType(e))}generateNodeType(e){return e.getTypeFromLength(this.components.length,this.getComponentType(e))}getScope(){return this.node.getScope()}generate(e,t){let n=this.node,i=e.getTypeLength(n.getNodeType(e)),s=null;if(i>1){let r=null;if(this.getVectorLength()>=i)r=e.getTypeFromLength(this.getVectorLength(),this.getComponentType(e));let o=n.build(e,r);if(this.components.length===i&&this.components===Fv.slice(0,this.components.length))s=e.format(o,r,t);else s=e.format(`${o}.${this.components}`,this.getNodeType(e),t)}else s=n.build(e,t);return s}serialize(e){super.serialize(e),e.components=this.components}deserialize(e){super.deserialize(e),this.components=e.components}}class qh extends it{static get type(){return"SetNode"}constructor(e,t,n){super();this.sourceNode=e,this.components=t,this.targetNode=n}generateNodeType(e){return this.sourceNode.getNodeType(e)}generate(e){let{sourceNode:t,components:n,targetNode:i}=this,s=this.getNodeType(e),r=e.getComponentType(i.getNodeType(e)),a=e.getTypeFromLength(n.length,r),o=i.build(e,a),l=t.build(e,s),c=e.getTypeLength(s),u=[];for(let h=0;h<c;h++){let d=qs[h];if(d===n[0])u.push(o),h+=n.length-1;else u.push(l+"."+d)}return`${e.getType(s)}( ${u.join(", ")} )`}}class Xh extends it{static get type(){return"FlipNode"}constructor(e,t){super();this.sourceNode=e,this.components=t}generateNodeType(e){return this.sourceNode.getNodeType(e)}generate(e){let{components:t,sourceNode:n}=this,i=this.getNodeType(e),s=n.build(e),r=e.getVarFromNode(this),a=e.getPropertyName(r);e.addLineFlowCode(a+" = "+s,this);let o=e.getTypeLength(i),l=[],c=0;for(let u=0;u<o;u++){let h=qs[u];if(h===t[c])l.push("1.0 - "+(a+"."+h)),c++;else l.push(a+"."+h)}return`${e.getType(i)}( ${l.join(", ")} )`}}class _a extends G{static get type(){return"InputNode"}constructor(e,t=null){super(t);this.isInputNode=!0,this.value=e,this.precision=null}generateNodeType(){if(this.nodeType===null)return ga(this.value);return this.nodeType}getInputType(e){return this.getNodeType(e)}setPrecision(e){return this.precision=e,this}serialize(e){if(super.serialize(e),e.value=this.value,this.value&&this.value.toArray)e.value=this.value.toArray();if(e.valueType=ga(this.value),e.nodeType=this.nodeType,e.valueType==="ArrayBuffer")e.value=Cv(e.value);e.precision=this.precision}deserialize(e){if(super.deserialize(e),this.nodeType=e.nodeType,this.value=Array.isArray(e.value)?Gl(e.valueType,...e.value):e.value,this.precision=e.precision||null,this.value&&this.value.fromArray)this.value=this.value.fromArray(e.value)}generate(){Q("Abstract function.")}}var Th=/float|u?int/;class Bt extends _a{static get type(){return"ConstNode"}constructor(e,t=null){super(e,t);this.isConstNode=!0}generateConst(e){return e.generateConst(this.getNodeType(e),this.value)}generate(e,t){let n=this.getNodeType(e);if(Th.test(n)&&Th.test(t))return e.generateConst(t,this.value);return e.format(this.generateConst(e),n,t)}}class Yh extends G{static get type(){return"MemberNode"}constructor(e,t){super();this.structNode=e,this.property=t,this.isMemberNode=!0}hasMember(e){if(this.structNode.isMemberNode){if(this.structNode.hasMember(e)===!1)return!1}return this.structNode.getMemberType(e,this.property)!=="void"}generateNodeType(e){if(this.hasMember(e)===!1)return"float";return this.structNode.getMemberType(e,this.property)}getMemberType(e,t){if(this.hasMember(e)===!1)return"float";let n=this.getNodeType(e);return e.getStructTypeNode(n).getMemberType(e,t)}generate(e){if(this.hasMember(e)===!1){Q(`TSL: Member "${this.property}" does not exist in struct.`,this.stackTrace);let n=this.getNodeType(e);return e.generateConst(n)}return this.structNode.build(e)+"."+this.property}}var Ws=null,Cl=new Map;function T(e,t){if(Cl.has(e)){Q(`TSL: Redefinition of method chaining '${e}'.`);return}if(typeof t!=="function")throw Error(`THREE.TSL: Node element ${e} is not a function`);if(Cl.set(e,t),e!=="assign")G.prototype[e]=function(...n){return this.isStackNode?this.addToStack(t(...n)):t(this,...n)},G.prototype[e+"Assign"]=function(...n){return this.isStackNode?this.assign(n[0],t(...n)):this.assign(t(this,...n))}}var Dv=(e)=>e.replace(/r|s/g,"x").replace(/g|t/g,"y").replace(/b|p/g,"z").replace(/a|q/g,"w"),Mh=(e)=>Dv(e).split("").sort().join("");G.prototype.assign=function(...e){if(this.isStackNode!==!0){if(Ws!==null)Ws.assign(this,...e);else Y("TSL: No stack defined for assign operation. Make sure the assign is inside a Fn().",new Ut);return this}else{let t=Cl.get("assign");return this.addToStack(t(...e))}};G.prototype.toVarIntent=function(){return this};G.prototype.get=function(e){return new Yh(this,e)};var zs={};function ca(e,t,n){zs[e]=zs[t]=zs[n]={get(){this._cache=this._cache||{};let a=this._cache[e];if(a===void 0)a=new $h(this,e),this._cache[e]=a;return a},set(a){this[e].assign(O(a))}};let i=e.toUpperCase(),s=t.toUpperCase(),r=n.toUpperCase();G.prototype["set"+i]=G.prototype["set"+s]=G.prototype["set"+r]=function(a){let o=Mh(e);return new qh(this,o,O(a))},G.prototype["flip"+i]=G.prototype["flip"+s]=G.prototype["flip"+r]=function(){let a=Mh(e);return new Xh(this,a)}}var Yt=["x","y","z","w"],Kt=["r","g","b","a"],Zt=["s","t","p","q"];for(let e=0;e<4;e++){let t=Yt[e],n=Kt[e],i=Zt[e];ca(t,n,i);for(let s=0;s<4;s++){t=Yt[e]+Yt[s],n=Kt[e]+Kt[s],i=Zt[e]+Zt[s],ca(t,n,i);for(let r=0;r<4;r++){t=Yt[e]+Yt[s]+Yt[r],n=Kt[e]+Kt[s]+Kt[r],i=Zt[e]+Zt[s]+Zt[r],ca(t,n,i);for(let a=0;a<4;a++)t=Yt[e]+Yt[s]+Yt[r]+Yt[a],n=Kt[e]+Kt[s]+Kt[r]+Kt[a],i=Zt[e]+Zt[s]+Zt[r]+Zt[a],ca(t,n,i)}}}for(let e=0;e<32;e++)zs[e]={get(){this._cache=this._cache||{};let t=this._cache[e];if(t===void 0)t=new Xs(this,new Bt(e,"uint")),this._cache[e]=t;return t},set(t){this[e].assign(O(t))}};Object.defineProperties(G.prototype,zs);var Uv=function(e,t=null){let n=ga(e);if(n==="node")return e;else if(t===null&&(n==="float"||n==="boolean")||n&&n!=="shader"&&n!=="string")return O(Il(e,t));else if(n==="shader")return e.isFn?e:q(e);return e},Bv=function(e,t=null){for(let n in e)e[n]=O(e[n],t);return e},Ov=function(e,t=null){let n=e.length;for(let i=0;i<n;i++)e[i]=O(e[i],t);return e},Kh=function(e,t=null,n=null,i=null){function s(u){if(i!==null){if(u=O(Object.assign(u,i)),i.intent===!0)u=u.toVarIntent()}else u=O(u);return u}let r,a=t,o,l;function c(u){let h;if(a)h=/[a-z]/i.test(a)?a+"()":a;else h=e.type;if(o!==void 0&&u.length<o)return Y(`TSL: "${h}" parameter length is less than minimum required.`,new Ut),u.concat(Array(o-u.length).fill(0));else if(l!==void 0&&u.length>l)return Y(`TSL: "${h}" parameter length exceeds limit.`,new Ut),u.slice(0,l);return u}if(t===null)r=(...u)=>s(new e(...Bi(c(u))));else if(n!==null)n=O(n),r=(...u)=>s(new e(t,...Bi(c(u)),n));else r=(...u)=>s(new e(t,...Bi(c(u))));return r.setParameterLength=(...u)=>{if(u.length===1)o=l=u[0];else if(u.length===2)[o,l]=u;return r},r.setName=(u)=>(a=u,r),r},kv=function(e,...t){return new e(...Bi(t))};class Zh extends G{constructor(e,t){super();this.shaderNode=e,this.rawInputs=t,this.isShaderCallNodeInternal=!0}generateNodeType(e){return this.shaderNode.nodeType||this.getOutputNode(e).getNodeType(e)}getElementType(e){return this.getOutputNode(e).getElementType(e)}getMemberType(e,t){return this.getOutputNode(e).getMemberType(e,t)}call(e){let{shaderNode:t,rawInputs:n}=this,i=e.getNodeProperties(t),s=e.getClosestSubBuild(t.subBuilds)||"",r=s||"default";if(i[r])return i[r];let{subBuildFn:a,fnCall:o}=e;e.subBuildFn=s,e.fnCall=this;let l=null;if(t.layout){if(n){let h=t.layout.inputs;if(Hh(n)){let d=n;for(let f=0;f<h.length;f++){let p=d[f];if(p&&p.isNode)p.build(e)}}else{let d=n[0];for(let f of h){let p=d[f.name];if(p&&p.isNode)p.build(e)}}}let c=e.buildFunctionNode(t);e.addInclude(c);let u=n?Vv(n):null;l=c.call(u)}else{let c=new Proxy(e,{get:(p,m,g)=>{let _;if(Symbol.iterator===m)_=function*(){yield void 0};else _=Reflect.get(p,m,g);return _}}),u=n?Gv(n):null,h=Array.isArray(n)?n.length>0:n!==null,d=t.jsFunc,f=h||d.length>1?d(u,c):d(c);l=O(f)}if(e.subBuildFn=a,e.fnCall=o,t.once)i[r]=l;return l}setupOutput(e){return e.addStack(),e.stack.outputNode=this.call(e),e.removeStack()}getOutputNode(e){let t=e.getNodeProperties(this),n=e.getSubBuildOutput(this);return t[n]=t[n]||this.setupOutput(e),t[n].subBuild=e.getClosestSubBuild(this),t[n]}build(e,t=null){let n=null,i=e.getBuildStage(),s=e.getNodeProperties(this),r=e.getSubBuildOutput(this),a=this.getOutputNode(e),o=e.fnCall;if(e.fnCall=this,i==="setup"){let l=e.getSubBuildProperty("initialized",this);if(s[l]!==!0){if(s[l]=!0,s[r]=this.getOutputNode(e),s[r].build(e),this.shaderNode.subBuilds)for(let c of e.chaining){let u=e.getDataFromNode(c,"any");u.subBuilds=u.subBuilds||new Set;for(let h of this.shaderNode.subBuilds)u.subBuilds.add(h)}}n=s[r]}else if(i==="analyze")a.build(e,t);else if(i==="generate")n=a.build(e,t)||"";return e.fnCall=o,n}}function Vv(e){let t;if(ql(e),Hh(e))t=[...e];else t=e[0];return t}function Gv(e){let t=0;return ql(e),new Proxy(e,{get:(n,i,s)=>{let r;if(i==="length")return r=e.length,r;if(Symbol.iterator===i)r=function*(){for(let a of e)yield O(a)};else{if(e.length>0){if(Object.getPrototypeOf(e[0])===Object.prototype){let a=e[0];if(a[i]===void 0)r=a[t++];else r=Reflect.get(a,i,s)}else if(e[0]instanceof G)if(e[i]===void 0)r=e[t++];else r=Reflect.get(e,i,s)}else r=Reflect.get(n,i,s);r=O(r)}return r}})}class jh extends G{constructor(e,t){super(t);this.jsFunc=e,this.layout=null,this.global=!0,this.once=!1}setLayout(e){return this.layout=e,this}getLayout(){return this.layout}call(e=null){return new Zh(this,e)}setup(){return this.call()}}var zv=[!1,!0],Hv=[0,1,2,3],Wv=[-1,-2],Qh=[0.5,1.5,0.3333333333333333,0.000001,1e6,Math.PI,Math.PI*2,1/Math.PI,2/Math.PI,1/(Math.PI*2),Math.PI/2],Hl=new Map;for(let e of zv)Hl.set(e,new Bt(e));var Wl=new Map;for(let e of Hv)Wl.set(e,new Bt(e,"uint"));var $l=new Map([...Wl].map((e)=>new Bt(e.value,"int")));for(let e of Wv)$l.set(e,new Bt(e,"int"));var xa=new Map([...$l].map((e)=>new Bt(e.value)));for(let e of Qh)xa.set(e,new Bt(e));for(let e of Qh)xa.set(-e,new Bt(-e));var ya={bool:Hl,uint:Wl,ints:$l,float:xa},Ah=new Map([...Hl,...xa]),Il=(e,t)=>{if(Ah.has(e))return Ah.get(e);else if(e.isNode===!0)return e;else return new Bt(e,t)},ke=function(e,t=null){return(...n)=>{for(let s of n)if(s===void 0)return Y(`TSL: Invalid parameter for the type "${e}".`,new Ut),new Bt(0,e);if(n.length===0||!["bool","float","int","uint"].includes(e)&&n.every((s)=>{let r=typeof s;return r!=="object"&&r!=="function"}))n=[Gl(e,...n)];if(n.length===1&&t!==null&&t.has(n[0]))return ua(t.get(n[0]));if(n.length===1){let s=Il(n[0],e);if(s.nodeType===e)return ua(s);return ua(new zl(s,e))}let i=n.map((s)=>Il(s));return ua(new Wh(i,e))}};function $v(e){if(e&&e.isNode)e.traverse((t)=>{if(t.isConstNode)e=t.value});return Boolean(e)}var qv=(e)=>e!==void 0&&e!==null?e.nodeType||e.convertTo||(typeof e==="string"?e:null):null;function Xv(e,t){return new jh(e,t)}var O=(e,t=null)=>Uv(e,t),ua=(e,t=null)=>O(e,t).toVarIntent(),ql=(e,t=null)=>new Bv(e,t),Bi=(e,t=null)=>new Ov(e,t),Ke=(e,t=null,n=null,i=null)=>new Kh(e,t,n,i),k=(e,...t)=>new kv(e,...t),L=(e,t=null,n=null,i={})=>new Kh(e,t,n,{...i,intent:!0});var Yv=0;class Jh extends G{constructor(e,t=null){super();let n=null;if(t!==null)if(typeof t==="object")n=t.return;else{if(typeof t==="string")n=t;else Y("TSL: Invalid layout type.",new Ut);t=null}if(this.shaderNode=new Xv(e,n),t!==null)this.setLayout(t);this.isFn=!0}setLayout(e){let t=this.shaderNode.nodeType;if(typeof e.inputs!=="object"){let n={name:"fn"+Yv++,type:t,inputs:[]};for(let i in e){if(i==="return")continue;n.inputs.push({name:i,type:e[i]})}e=n}return this.shaderNode.setLayout(e),this}generateNodeType(e){return this.shaderNode.getNodeType(e)||"float"}call(...e){let t=this.shaderNode.call(e);if(this.shaderNode.nodeType==="void")t.toStack();return t.toVarIntent()}once(e=null){return this.shaderNode.once=!0,this.shaderNode.subBuilds=e,this}generate(e){let t=this.getNodeType(e);return Y('TSL: "Fn()" was declared but not invoked. Try calling it like "Fn()( ...params )".',this.stackTrace),e.generateConst(t)}}function q(e,t=null){let n=new Jh(e,t);return new Proxy(()=>{},{apply(i,s,r){return n.call(...r)},get(i,s,r){return Reflect.get(n,s,r)},set(i,s,r,a){return Reflect.set(n,s,r,a)}})}var Di=(...e)=>Ws.If(...e);function Kv(e){if(Ws)Ws.addToStack(e);return e}T("toStack",Kv);var Zv=new ke("color"),ae=new ke("float",ya.float),ba=new ke("int",ya.ints),jv=new ke("uint",ya.uint),va=new ke("bool",ya.bool),Jn=new ke("vec2"),Qv=new ke("ivec2"),Jv=new ke("uvec2"),eS=new ke("bvec2"),Ie=new ke("vec3"),tS=new ke("ivec3"),nS=new ke("uvec3"),iS=new ke("bvec3"),ge=new ke("vec4"),sS=new ke("ivec4"),rS=new ke("uvec4"),aS=new ke("bvec4"),ed=new ke("mat2"),ei=new ke("mat3"),td=new ke("mat4");T("toColor",Zv);T("toFloat",ae);T("toInt",ba);T("toUint",jv);T("toBool",va);T("toVec2",Jn);T("toIVec2",Qv);T("toUVec2",Jv);T("toBVec2",eS);T("toVec3",Ie);T("toIVec3",tS);T("toUVec3",nS);T("toBVec3",iS);T("toVec4",ge);T("toIVec4",sS);T("toUVec4",rS);T("toBVec4",aS);T("toMat2",ed);T("toMat3",ei);T("toMat4",td);var oS=Ke(Xs).setParameterLength(2),lS=(e,t)=>new zl(O(e),t);T("element",oS);T("convert",lS);class Oi extends G{static get type(){return"PropertyNode"}constructor(e,t=null,n=!1,i=null){super(e);this.name=t,this.varying=n,this.placeholderNode=O(i),this.isPropertyNode=!0,this.global=!0}getNodeType(e){let t=super.getNodeType(e);if(t==="output")return e.getOutputType();return t}customCacheKey(){return Gh(this.type+":"+(this.name||"")+":"+(this.varying?"1":"0"))}getHash(e){return this.name||super.getHash(e)}generate(e){let t;if(this.varying===!0)t=e.getVaryingFromNode(this,this.name),t.needsInterpolation=!0;else if(t=e.getVarFromNode(this,this.name),this.placeholderNode!==null){if(e.hasWriteUsage(this)===!1){let n=this.placeholderNode.build(e,this.getNodeType(e));e.addLineFlowCode(`${e.getPropertyName(t)} = ${n}`,this)}}return e.getPropertyName(t)}}var ti=(e,t,n=null)=>new Oi(e,t,!1,n),Sa=(e,t,n=null)=>new Oi(e,t,!0,n),Eh=k(Oi,"vec4","DiffuseColor");var bl=k(Oi,"float","dashSize"),wh=k(Oi,"float","gapSize");class Xl extends G{static get type(){return"UniformGroupNode"}constructor(e,t=!1,n=1,i=null){super("string");this.name=e,this.shared=t,this.order=n,this.updateType=i,this.isUniformGroup=!0}update(){this.needsUpdate=!0}serialize(e){super.serialize(e),e.name=this.name,e.version=this.version,e.shared=this.shared}deserialize(e){super.deserialize(e),this.name=e.name,this.version=e.version,this.shared=e.shared}}var cS=(e,t=1,n=null)=>new Xl(e,!1,t,n),Yl=(e,t=0,n=null)=>new Xl(e,!0,t,n),H2=Yl("frame",0,le.FRAME),We=Yl("render",0,le.RENDER),uS=cS("object",1,le.OBJECT);class ki extends _a{static get type(){return"UniformNode"}constructor(e,t=null){super(e,t);this.isUniformNode=!0,this.name="",this.groupNode=uS}setName(e){return this.name=e,this}label(e){return Q('TSL: "label()" has been deprecated. Use "setName()" instead.',new Ut),this.setName(e)}setGroup(e){return this.groupNode=e,this}getGroup(){return this.groupNode}getUniformHash(e){return this.getHash(e)}getSharedNode(e){let t=this.getUniformHash(e),n=e.getNodeFromHash(t);if(n===void 0)e.setHashNode(this,t),n=this;return n}onUpdate(e,t){return e=e.bind(this),super.onUpdate((n)=>{let i=e(n,this);if(i!==void 0)this.value=i},t)}getInputType(e){let t=super.getInputType(e);if(t==="bool")t="uint";return t}generate(e,t){let n=this.getNodeType(e),i=this.getSharedNode(e),s=i.getInputType(e),r=e.getUniformFromNode(i,s,e.shaderStage,this.name||e.context.nodeName),a=e.getPropertyName(r);if(e.context.nodeName!==void 0)delete e.context.nodeName;let o=a;if(n==="bool"){let l=e.getDataFromNode(this),c=l.propertyName;if(c===void 0){let u=e.getVarFromNode(this,null,"bool");c=e.getPropertyName(u),l.propertyName=c,o=e.format(a,s,n),e.addLineFlowCode(`${c} = ${o}`,this)}o=c}return e.format(o,n,t)}}var $e=(e,t)=>{let n=qv(t||e);if(n===e)e=Gl(n);if(e&&e.isNode===!0){let i=e.value;e.traverse((s)=>{if(s.isConstNode===!0)i=s.value}),e=i}return new ki(e,n)};class Nl extends it{static get type(){return"ArrayNode"}constructor(e,t,n=null){super(e);this.count=t,this.values=n,this.isArrayNode=!0}getArrayCount(){return this.count}generateNodeType(e){if(this.nodeType===null)return this.values[0].getNodeType(e);return this.nodeType}getElementType(e){return this.getNodeType(e)}getMemberType(e,t){if(this.nodeType===null)return this.values[0].getMemberType(e,t);return super.getMemberType(e,t)}generate(e){let t=this.getNodeType(e);return e.generateArray(t,this.count,this.values)}}var Pl=(...e)=>{let t;if(e.length===1){let n=e[0].map((i)=>O(i));t=new Nl(null,n.length,n)}else{let n=e[0],i=e[1];t=new Nl(n,i)}return t};T("toArray",(e,t)=>Pl(Array(t).fill(e)));class nd extends it{static get type(){return"AssignNode"}constructor(e,t){super();this.targetNode=e,this.sourceNode=t,this.isAssignNode=!0}hasDependencies(){return!1}generateNodeType(e,t){return t!=="void"?this.targetNode.getNodeType(e):"void"}needsSplitAssign(e){let{targetNode:t}=this;if(e.isAvailable("swizzleAssign")===!1&&t.isSplitNode&&t.components.length>1){let n=e.getTypeLength(t.node.getNodeType(e));return qs.join("").slice(0,n)!==t.components}return!1}setup(e){let{targetNode:t,sourceNode:n}=this,i=t.getScope(),s=e.getDataFromNode(i);s.assign=!0;let r=e.getNodeProperties(this);r.sourceNode=n,r.targetNode=t.context({assign:!0})}generate(e,t){let{targetNode:n,sourceNode:i}=e.getNodeProperties(this),s=this.needsSplitAssign(e),r=n.build(e),a=n.getNodeType(e),o=i.build(e,a),l=i.getNodeType(e),c=e.getDataFromNode(this),u;if(c.initialized===!0){if(t!=="void")u=r}else if(s){let h=e.getVarFromNode(this,null,a),d=e.getPropertyName(h);e.addLineFlowCode(`${d} = ${o}`,this);let f=n.node,m=f.node.context({assign:!0}).build(e);for(let g=0;g<f.components.length;g++){let _=f.components[g];e.addLineFlowCode(`${m}.${_} = ${d}[ ${g} ]`,this)}if(t!=="void")u=r}else if(u=`${r} = ${o}`,t==="void"||l==="void"){if(e.addLineFlowCode(u,this),t!=="void")u=r}return c.initialized=!0,e.format(u,a,t)}}var hS=Ke(nd).setParameterLength(2);T("assign",hS);class id extends it{static get type(){return"FunctionCallNode"}constructor(e=null,t={}){super();this.functionNode=e,this.parameters=t}setParameters(e){return this.parameters=e,this}getParameters(){return this.parameters}generateNodeType(e){return this.functionNode.getNodeType(e)}getMemberType(e,t){return this.functionNode.getMemberType(e,t)}generate(e){let t=[],n=this.functionNode,i=n.getInputs(e),s=this.parameters,r=(o,l)=>{let c=l.type,u=c==="pointer",h;if(u)h="&"+o.build(e);else h=o.build(e,c);return h};if(Array.isArray(s)){if(s.length>i.length)Y("TSL: The number of provided parameters exceeds the expected number of inputs in 'Fn()'."),s.length=i.length;else if(s.length<i.length){Y("TSL: The number of provided parameters is less than the expected number of inputs in 'Fn()'.");while(s.length<i.length)s.push(ae(0))}for(let o=0;o<s.length;o++)t.push(r(s[o],i[o]))}else for(let o of i){let l=s[o.name];if(l!==void 0)t.push(r(l,o));else Y(`TSL: Input '${o.name}' not found in 'Fn()'.`),t.push(r(ae(0),o))}return`${n.build(e,"property")}( ${t.join(", ")} )`}}var dS=(e,...t)=>(t=t.length>1||t[0]&&t[0].isNode===!0?Bi(t):ql(t[0]),new id(O(e),t));T("call",dS);var fS={"==":"equal","!=":"notEqual","<":"lessThan",">":"greaterThan","<=":"lessThanEqual",">=":"greaterThanEqual","%":"mod"};class Ee extends it{static get type(){return"OperatorNode"}constructor(e,t,n,...i){super();if(i.length>0){let s=new Ee(e,t,n);for(let r=0;r<i.length-1;r++)s=new Ee(e,s,i[r]);t=s,n=i[i.length-1]}this.op=e,this.aNode=t,this.bNode=n,this.isOperatorNode=!0}getOperatorMethod(e,t){return e.getMethod(fS[this.op],t)}generateNodeType(e,t=null){let n=this.op,i=this.aNode,s=this.bNode,r=i.getNodeType(e),a=s?s.getNodeType(e):null;if(r==="void"||a==="void")return t||"void";else if(n==="%")return r;else if(n==="~"||n==="&"||n==="|"||n==="^"||n===">>"||n==="<<")return e.getIntegerType(r);else if(n==="&&"||n==="||"||n==="^^")return"bool";else if(n==="!"){let o=e.getTypeLength(r);return o>1?`bvec${o}`:"bool"}else if(n==="=="||n==="!="||n==="<"||n===">"||n==="<="||n===">="){let o=Math.max(e.getTypeLength(r),e.getTypeLength(a));return o>1?`bvec${o}`:"bool"}else{if(e.isMatrix(r)){if(a==="float")return r;else if(e.isVector(a))return e.getVectorFromMatrix(r);else if(e.isMatrix(a))return r}else if(e.isMatrix(a)){if(r==="float")return a;else if(e.isVector(r))return e.getVectorFromMatrix(a)}if(e.getTypeLength(a)>e.getTypeLength(r))return a;return r}}generate(e,t){let n=this.op,{aNode:i,bNode:s}=this,r=this.getNodeType(e,t),a=null,o=null;if(r!=="void")if(a=i.getNodeType(e),o=s?s.getNodeType(e):null,n==="<"||n===">"||n==="<="||n===">="||n==="=="||n==="!="){if(e.isVector(a))o=a;else if(e.isVector(o))a=o;else if(a!==o)a=o="float"}else if(n===">>"||n==="<<")a=r,o=e.changeComponentType(o,"uint");else if(n==="%")a=r,o=e.isInteger(a)&&e.isInteger(o)?o:a;else if(e.isMatrix(a))if(o==="float")o="float";else if(e.isVector(o))o=e.getVectorFromMatrix(a);else if(e.isMatrix(o));else a=o=r;else if(e.isMatrix(o))if(a==="float")a="float";else if(e.isVector(a))a=e.getVectorFromMatrix(o);else a=o=r;else a=o=r;else a=o=r;let l=i.build(e,a),c=s?s.build(e,o):null,u=e.getFunctionOperator(n);if(t!=="void"){let h=e.renderer.coordinateSystem===xs;if(n==="=="||n==="!="||n==="<"||n===">"||n==="<="||n===">=")if(h)if(e.isVector(a))return e.format(`${this.getOperatorMethod(e,t)}( ${l}, ${c} )`,r,t);else return e.format(`( ${l} ${n} ${c} )`,r,t);else return e.format(`( ${l} ${n} ${c} )`,r,t);else if(n==="%")if(e.isInteger(o))return e.format(`( ${l} % ${c} )`,r,t);else return e.format(`${this.getOperatorMethod(e,r)}( ${l}, ${c} )`,r,t);else if(n==="!")if(h&&e.isVector(a))return e.format(`not( ${l} )`,t);else return e.format(`( ${n} ${l} )`,a,t);else if(n==="~")return e.format(`( ${n} ${l} )`,a,t);else if(u)return e.format(`${u}( ${l}, ${c} )`,r,t);else if(e.isMatrix(a)&&o==="float")return e.format(`( ${c} ${n} ${l} )`,r,t);else if(a==="float"&&e.isMatrix(o))return e.format(`${l} ${n} ${c}`,r,t);else{let d=`( ${l} ${n} ${c} )`;if(!h&&r==="bool"&&e.isVector(a)&&e.isVector(o))d=`all${d}`;return e.format(d,r,t)}}else if(a!=="void")if(u)return e.format(`${u}( ${l}, ${c} )`,r,t);else if(e.isMatrix(a)&&o==="float")return e.format(`${c} ${n} ${l}`,r,t);else return e.format(`${l} ${n} ${c}`,r,t)}serialize(e){super.serialize(e),e.op=this.op}deserialize(e){super.deserialize(e),this.op=e.op}}var pS=L(Ee,"+").setParameterLength(2,1/0).setName("add"),Ll=L(Ee,"-").setParameterLength(2,1/0).setName("sub"),ni=L(Ee,"*").setParameterLength(2,1/0).setName("mul"),sd=L(Ee,"/").setParameterLength(2,1/0).setName("div"),rd=L(Ee,"%").setParameterLength(2).setName("mod"),mS=L(Ee,"==").setParameterLength(2).setName("equal"),gS=L(Ee,"!=").setParameterLength(2).setName("notEqual"),_S=L(Ee,"<").setParameterLength(2).setName("lessThan"),xS=L(Ee,">").setParameterLength(2).setName("greaterThan"),yS=L(Ee,"<=").setParameterLength(2).setName("lessThanEqual"),bS=L(Ee,">=").setParameterLength(2).setName("greaterThanEqual"),vS=L(Ee,"&&").setParameterLength(2,1/0).setName("and"),SS=L(Ee,"||").setParameterLength(2,1/0).setName("or"),TS=L(Ee,"!").setParameterLength(1).setName("not"),MS=L(Ee,"^^").setParameterLength(2).setName("xor"),AS=L(Ee,"&").setParameterLength(2).setName("bitAnd"),ES=L(Ee,"~").setParameterLength(1).setName("bitNot"),wS=L(Ee,"|").setParameterLength(2).setName("bitOr"),RS=L(Ee,"^").setParameterLength(2).setName("bitXor"),CS=L(Ee,"<<").setParameterLength(2).setName("shiftLeft"),IS=L(Ee,">>").setParameterLength(2).setName("shiftRight"),NS=q(([e])=>(e.addAssign(1),e)),PS=q(([e])=>(e.subAssign(1),e)),LS=q(([e])=>{let t=ba(e).toConst();return e.addAssign(1),t}),FS=q(([e])=>{let t=ba(e).toConst();return e.subAssign(1),t});T("add",pS);T("sub",Ll);T("mul",ni);T("div",sd);T("mod",rd);T("equal",mS);T("notEqual",gS);T("lessThan",_S);T("greaterThan",xS);T("lessThanEqual",yS);T("greaterThanEqual",bS);T("and",vS);T("or",SS);T("not",TS);T("xor",MS);T("bitAnd",AS);T("bitNot",ES);T("bitOr",wS);T("bitXor",RS);T("shiftLeft",CS);T("shiftRight",IS);T("incrementBefore",NS);T("decrementBefore",PS);T("increment",LS);T("decrement",FS);class y extends it{static get type(){return"MathNode"}constructor(e,t,n=null,i=null){super();if((e===y.MAX||e===y.MIN)&&arguments.length>3){let s=new y(e,t,n);for(let r=3;r<arguments.length-1;r++)s=new y(e,s,arguments[r]);t=s,n=arguments[arguments.length-1],i=null}this.method=e,this.aNode=t,this.bNode=n,this.cNode=i,this.isMathNode=!0}getInputType(e){let t=this.aNode.getNodeType(e),n=this.bNode?this.bNode.getNodeType(e):null,i=this.cNode?this.cNode.getNodeType(e):null,s=e.isMatrix(t)?0:e.getTypeLength(t),r=e.isMatrix(n)?0:e.getTypeLength(n),a=e.isMatrix(i)?0:e.getTypeLength(i);if(s>r&&s>a)return t;else if(r>a)return n;else if(a>s)return i;return t}generateNodeType(e){let t=this.method;if(t===y.LENGTH||t===y.DISTANCE||t===y.DOT||t===y.DETERMINANT)return"float";else if(t===y.CROSS)return"vec3";else if(t===y.ALL||t===y.ANY)return"bool";else if(t===y.EQUALS)return e.changeComponentType(this.aNode.getNodeType(e),"bool");else return this.getInputType(e)}setup(e){let{aNode:t,bNode:n,method:i}=this,s=null;if(i===y.ONE_MINUS)s=Ll(1,t);else if(i===y.RECIPROCAL)s=sd(1,t);else if(i===y.DIFFERENCE)s=Kl(Ll(t,n));else if(i===y.TRANSFORM_DIRECTION){let r,a;if(e.isMatrix(t.getNodeType(e)))r=t,a=n;else r=n,a=t;s=Ta(ni(r,ge(Ie(a),0)).xyz)}if(s!==null)return s;else return super.setup(e)}generate(e,t){if(e.getNodeProperties(this).outputNode)return super.generate(e,t);let i=this.method,s=this.getNodeType(e),r=this.getInputType(e),a=this.aNode,o=this.bNode,l=this.cNode,c=e.renderer.coordinateSystem;if(i===y.NEGATE)return e.format("( - "+a.build(e,r)+" )",s,t);else{let u=[];if(i===y.CROSS)u.push(a.build(e,s),o.build(e,s));else if(c===xs&&i===y.STEP)u.push(a.build(e,e.getTypeLength(a.getNodeType(e))===1?"float":r),o.build(e,r));else if(c===xs&&(i===y.MIN||i===y.MAX))u.push(a.build(e,r),o.build(e,e.getTypeLength(o.getNodeType(e))===1?e.getComponentType(r):r));else if(i===y.REFRACT)u.push(a.build(e,r),o.build(e,r),l.build(e,"float"));else if(i===y.MIX)u.push(a.build(e,r),o.build(e,r),l.build(e,e.getTypeLength(l.getNodeType(e))===1?"float":r));else{if(c===ys&&i===y.ATAN&&o!==null)i="atan2";if(e.shaderStage!=="fragment"&&(i===y.DFDX||i===y.DFDY))Y(`TSL: '${i}' is not supported in the ${e.shaderStage} stage.`,this.stackTrace),i="/*"+i+"*/";if(u.push(a.build(e,r)),o!==null)u.push(o.build(e,r));if(l!==null)u.push(l.build(e,r))}return e.format(`${e.getMethod(i,s)}( ${u.join(", ")} )`,s,t)}}serialize(e){super.serialize(e),e.method=this.method}deserialize(e){super.deserialize(e),this.method=e.method}}y.ALL="all";y.ANY="any";y.RADIANS="radians";y.DEGREES="degrees";y.EXP="exp";y.EXP2="exp2";y.LOG="log";y.LOG2="log2";y.SQRT="sqrt";y.INVERSE_SQRT="inversesqrt";y.FLOOR="floor";y.CEIL="ceil";y.NORMALIZE="normalize";y.FRACT="fract";y.SIN="sin";y.SINH="sinh";y.COS="cos";y.COSH="cosh";y.TAN="tan";y.TANH="tanh";y.ASIN="asin";y.ASINH="asinh";y.ACOS="acos";y.ACOSH="acosh";y.ATAN="atan";y.ATANH="atanh";y.ABS="abs";y.SIGN="sign";y.LENGTH="length";y.NEGATE="negate";y.ONE_MINUS="oneMinus";y.DFDX="dFdx";y.DFDY="dFdy";y.ROUND="round";y.RECIPROCAL="reciprocal";y.TRUNC="trunc";y.FWIDTH="fwidth";y.TRANSPOSE="transpose";y.DETERMINANT="determinant";y.INVERSE="inverse";y.EQUALS="equals";y.MIN="min";y.MAX="max";y.STEP="step";y.REFLECT="reflect";y.DISTANCE="distance";y.DIFFERENCE="difference";y.DOT="dot";y.CROSS="cross";y.POW="pow";y.TRANSFORM_DIRECTION="transformDirection";y.MIX="mix";y.CLAMP="clamp";y.REFRACT="refract";y.SMOOTHSTEP="smoothstep";y.FACEFORWARD="faceforward";var DS=ae(Math.PI),W2=ae(Math.PI*2),$2=ae(Math.PI*2),q2=ae(Math.PI*0.5),US=L(y,y.ALL).setParameterLength(1),BS=L(y,y.ANY).setParameterLength(1),OS=L(y,y.RADIANS).setParameterLength(1),kS=L(y,y.DEGREES).setParameterLength(1),VS=L(y,y.EXP).setParameterLength(1),GS=L(y,y.EXP2).setParameterLength(1),zS=L(y,y.LOG).setParameterLength(1),HS=L(y,y.LOG2).setParameterLength(1),ad=L(y,y.SQRT).setParameterLength(1),WS=L(y,y.INVERSE_SQRT).setParameterLength(1),$S=L(y,y.FLOOR).setParameterLength(1),qS=L(y,y.CEIL).setParameterLength(1),Ta=L(y,y.NORMALIZE).setParameterLength(1),od=L(y,y.FRACT).setParameterLength(1),ld=L(y,y.SIN).setParameterLength(1),XS=L(y,y.SINH).setParameterLength(1),YS=L(y,y.COS).setParameterLength(1),KS=L(y,y.COSH).setParameterLength(1),ZS=L(y,y.TAN).setParameterLength(1),jS=L(y,y.TANH).setParameterLength(1),QS=L(y,y.ASIN).setParameterLength(1),JS=L(y,y.ASINH).setParameterLength(1),eT=L(y,y.ACOS).setParameterLength(1),tT=L(y,y.ACOSH).setParameterLength(1),nT=L(y,y.ATAN).setParameterLength(1,2),iT=L(y,y.ATANH).setParameterLength(1),Kl=L(y,y.ABS).setParameterLength(1),cd=L(y,y.SIGN).setParameterLength(1),sT=L(y,y.LENGTH).setParameterLength(1),rT=L(y,y.NEGATE).setParameterLength(1),aT=L(y,y.ONE_MINUS).setParameterLength(1),oT=L(y,y.DFDX).setParameterLength(1),lT=L(y,y.DFDY).setParameterLength(1),cT=L(y,y.ROUND).setParameterLength(1),uT=L(y,y.RECIPROCAL).setParameterLength(1),hT=L(y,y.TRUNC).setParameterLength(1),dT=L(y,y.FWIDTH).setParameterLength(1),fT=L(y,y.TRANSPOSE).setParameterLength(1),pT=L(y,y.DETERMINANT).setParameterLength(1),mT=L(y,y.INVERSE).setParameterLength(1),gT=L(y,y.MIN).setParameterLength(2,1/0),_T=L(y,y.MAX).setParameterLength(2,1/0),Fl=L(y,y.STEP).setParameterLength(2),xT=L(y,y.REFLECT).setParameterLength(2),yT=L(y,y.DISTANCE).setParameterLength(2),bT=L(y,y.DIFFERENCE).setParameterLength(2),Ma=L(y,y.DOT).setParameterLength(2),vT=L(y,y.CROSS).setParameterLength(2),ud=L(y,y.POW).setParameterLength(2),ST=(e)=>ni(e,e),TT=(e)=>ni(e,e,e),MT=(e)=>ni(e,e,e,e),AT=L(y,y.TRANSFORM_DIRECTION).setParameterLength(2),ET=(e,t)=>Ta(ni(t,ge(Ie(e),0)).xyz),wT=(e,t)=>Ta(ge(Ie(e),0).mul(t).xyz),RT=(e)=>ni(cd(e),ud(Kl(e),0.3333333333333333)),CT=(e)=>Ma(e,e),Pn=L(y,y.MIX).setParameterLength(3),hd=(e,t=0,n=1)=>new y(y.CLAMP,O(e),O(t),O(n)),dd=(e)=>hd(e),IT=L(y,y.REFRACT).setParameterLength(3),$s=L(y,y.SMOOTHSTEP).setParameterLength(3),NT=L(y,y.FACEFORWARD).setParameterLength(3),PT=q(([e])=>{let s=Ma(e.xy,Jn(12.9898,78.233)),r=rd(s,DS);return od(ld(r).mul(43758.5453))}),LT=(e,t,n)=>Pn(t,n,e),FT=(e,t,n)=>$s(t,n,e),DT=(e,t)=>Fl(t,e);T("all",US);T("any",BS);T("radians",OS);T("degrees",kS);T("exp",VS);T("exp2",GS);T("log",zS);T("log2",HS);T("sqrt",ad);T("inverseSqrt",WS);T("floor",$S);T("ceil",qS);T("normalize",Ta);T("fract",od);T("sin",ld);T("sinh",XS);T("cos",YS);T("cosh",KS);T("tan",ZS);T("tanh",jS);T("asin",QS);T("asinh",JS);T("acos",eT);T("acosh",tT);T("atan",nT);T("atanh",iT);T("abs",Kl);T("sign",cd);T("length",sT);T("lengthSq",CT);T("negate",rT);T("oneMinus",aT);T("dFdx",oT);T("dFdy",lT);T("round",cT);T("reciprocal",uT);T("trunc",hT);T("fwidth",dT);T("min",gT);T("max",_T);T("step",DT);T("reflect",xT);T("distance",yT);T("dot",Ma);T("cross",vT);T("pow",ud);T("pow2",ST);T("pow3",TT);T("pow4",MT);T("transformDirection",AT);T("transformNormalByViewMatrix",ET);T("transformNormalByInverseViewMatrix",wT);T("mix",LT);T("clamp",hd);T("refract",IT);T("smoothstep",FT);T("faceForward",NT);T("difference",bT);T("saturate",dd);T("cbrt",RT);T("transpose",fT);T("determinant",pT);T("inverse",mT);T("rand",PT);class fd extends G{static get type(){return"ConditionalNode"}constructor(e,t,n=null){super();this.condNode=e,this.ifNode=t,this.elseNode=n}generateNodeType(e){let{ifNode:t,elseNode:n}=e.getNodeProperties(this);if(t===void 0)return e.flowBuildStage(this,"setup"),this.getNodeType(e);let i=t.getNodeType(e);if(n!==null){let s=n.getNodeType(e);if(e.getTypeLength(s)>e.getTypeLength(i))return s}return i}setup(e){let t=this.condNode,n=this.ifNode.isolate(),i=this.elseNode?this.elseNode.isolate():null,s=e.context.nodeBlock;if(e.getDataFromNode(n).parentNodeBlock=s,i!==null)e.getDataFromNode(i).parentNodeBlock=s;let r=e.context.uniformFlow,a=e.getNodeProperties(this);a.condNode=t,a.ifNode=r?n:n.context({nodeBlock:n}),a.elseNode=i?r?i:i.context({nodeBlock:i}):null}generate(e,t){let n=this.getNodeType(e),i=e.getDataFromNode(this);if(i.nodeProperty!==void 0)return i.nodeProperty;let{condNode:s,ifNode:r,elseNode:a}=e.getNodeProperties(this),o=e.currentFunctionNode,l=t!=="void",c=l?ti(n).build(e):"";i.nodeProperty=c;let u=s.build(e,"bool");if(e.context.uniformFlow&&a!==null){let f=r.build(e,n),p=a.build(e,n),m=e.getTernary(u,f,p);return e.format(m,n,t)}e.addFlowCode(`
${e.tab}if ( ${u} ) {

`).addFlowTab();let d=r.build(e,n);if(d){if(l)d=c+" = "+d+";";else if(d="return "+d+";",o===null)Q("TSL: Return statement used in an inline 'Fn()'. Define a layout struct to allow return values.",this.stackTrace),d="// "+d}if(e.removeFlowTab().addFlowCode(e.tab+"\t"+d+`

`+e.tab+"}"),a!==null){e.addFlowCode(` else {

`).addFlowTab();let f=a.build(e,n);if(f){if(l)f=c+" = "+f+";";else if(f="return "+f+";",o===null)Q("TSL: Return statement used in an inline 'Fn()'. Define a layout struct to allow return values.",this.stackTrace),f="// "+f}e.removeFlowTab().addFlowCode(e.tab+"\t"+f+`

`+e.tab+`}

`)}else e.addFlowCode(`

`);return e.format(c,n,t)}}var pd=Ke(fd).setParameterLength(2,3);T("select",pd);class Zl extends G{static get type(){return"ContextNode"}constructor(e=null,t={}){super();this.isContextNode=!0,this.node=e,this.value=t}getScope(){return this.node.getScope()}generateNodeType(e){return this.node.getNodeType(e)}getFlowContextData(){let e=[];return this.traverse((t)=>{if(t.isContextNode===!0)e.push(t.value)}),Object.assign({},...e)}getMemberType(e,t){return this.node.getMemberType(e,t)}analyze(e){if(e.increaseUsage(this)===1){let n=e.addContext(this.value);this.node.build(e,this),e.setContext(n)}}setup(e){let t=e.addContext(this.value),n=this.node.build(e);return e.setContext(t),n}generate(e,t){let n=e.addContext(this.value),i=this.node.build(e,t);return e.setContext(n),i}}var Vi=(e=null,t={})=>{let n=e;if(n===null||n.isNode!==!0)t=n||t,n=null;return new Zl(n,t)},UT=(e)=>Vi(e,{uniformFlow:!0}),md=(e,t)=>Vi(e,{nodeName:t});function BT(e,t,n=null){return Vi(n,{getShadow:({light:i,shadowColorNode:s})=>{if(t===i)return s.mul(e);return s}})}function OT(e,t=null){return Vi(t,{getAO:(n,{material:i})=>{if(i.transparent===!0)return n;return n!==null?n.mul(e):e}})}function kT(e,t,n=null){let i=e.max(0.001);return Vi(n,{getAO:(s,{material:r})=>{if(r.transparent===!0)return s;return s!==null?s.mul(i):i},getGI:(s,{material:r})=>{if(r.transparent===!0)return s;let a=t.div(i);return s!==null?s.add(a):a}})}function VT(e,t){return Q('TSL: "label()" has been deprecated. Use "setName()" instead.'),md(e,t)}T("context",Vi);T("label",VT);T("uniformFlow",UT);T("setName",md);T("builtinShadowContext",(e,t,n)=>BT(t,n,e));T("builtinAOContext",(e,t)=>OT(t,e));T("builtinGIContext",(e,t,n)=>kT(t,n,e));class gd extends G{static get type(){return"VarNode"}constructor(e,t=null,n=!1){super();this.node=e,this.name=t,this.global=!0,this.isVarNode=!0,this.readOnly=n,this.parents=!0,this.intent=!1}setIntent(e){return this.intent=e,this}isIntent(e){if(e.getDataFromNode(this).forceDeclaration===!0)return!1;return this.intent}getIntent(){return this.intent}getMemberType(e,t){return this.node.getMemberType(e,t)}getElementType(e){return this.node.getElementType(e)}generateNodeType(e){return this.node.getNodeType(e)}getArrayCount(e){return this.node.getArrayCount(e)}isAssign(e){return e.getDataFromNode(this).assign}build(...e){let t=e[0],n=this.getShared(t);if(this!==n)return n.build(...e);if(this._hasStack(t)===!1&&t.buildStage==="setup"){if(t.context.nodeLoop||t.context.nodeBlock){let i=!1;if(this.node.isShaderCallNodeInternal&&this.node.shaderNode.getLayout()===null){if(t.fnCall&&t.fnCall.shaderNode){if(t.getDataFromNode(this.node.shaderNode).hasLoop){let a=t.getDataFromNode(this);a.forceDeclaration=!0,i=!0}}}let s=t.getBaseStack();if(i)s.addToStackBefore(this);else s.addToStack(this)}}if(this.isIntent(t)){if(this.isAssign(t)!==!0)return this.node.build(...e)}return super.build(...e)}generate(e){let{node:t,name:n,readOnly:i}=this,{renderer:s}=e,r=s.backend.isWebGPUBackend===!0,a=!1,o=!1;if(i)a=e.isDeterministic(t),o=r?i:a;let l=this.getNodeType(e);if(l=="void"){if(this.isIntent(e)!==!0)Y('TSL: ".toVar()" can not be used with void type.',this.stackTrace);return t.build(e)}let c=e.getVectorType(l),u=t.build(e,c),h=e.getVarFromNode(this,n,c,void 0,o),d=e.getPropertyName(h),f=d;if(o)if(r)f=a?`const ${d}`:`let ${d}`;else{let p=t.getArrayCount(e);f=`const ${e.getVar(h.type,d,p)}`}return e.addLineFlowCode(`${f} = ${u}`,this),d}_hasStack(e){return e.getDataFromNode(this).stack!==void 0}}var jl=Ke(gd),GT=(e,t=null)=>jl(e,t).toStack(),zT=(e,t=null)=>jl(e,t,!0).toStack(),HT=(e)=>jl(e).setIntent(!0).toStack();T("toVar",GT);T("toConst",zT);T("toVarIntent",HT);class _d extends G{static get type(){return"SubBuild"}constructor(e,t,n=null){super(n);this.node=e,this.name=t,this.isSubBuildNode=!0}generateNodeType(e){if(this.nodeType!==null)return this.nodeType;e.addSubBuild(this.name);let t=this.node.getNodeType(e);return e.removeSubBuild(),t}build(e,...t){e.addSubBuild(this.name);let n=this.node.build(e,...t);return e.removeSubBuild(),n}}var Rh=(e,t,n=null)=>new _d(O(e),t,n);class xd extends G{static get type(){return"VaryingNode"}constructor(e,t=null){super();this.node=Rh(e,"VERTEX"),this.name=t,this.isVaryingNode=!0,this.interpolationType=null,this.interpolationSampling=null,this.global=!0}setInterpolation(e,t=null){return this.interpolationType=e,this.interpolationSampling=t,this}getHash(e){return this.name||super.getHash(e)}generateNodeType(e){return this.node.getNodeType(e)}setupVarying(e){let t=e.getNodeProperties(this),n=t.varying;if(n===void 0){let i=this.name,s=this.getNodeType(e),r=this.interpolationType,a=this.interpolationSampling;t.varying=n=e.getVaryingFromNode(this,i,s,r,a),t.node=Rh(this.node,"VERTEX")}return n.needsInterpolation||(n.needsInterpolation=e.shaderStage==="fragment"),n}setup(e){this.setupVarying(e),e.flowNodeFromShaderStage(Ds.VERTEX,this.node)}analyze(e){this.setupVarying(e),e.flowNodeFromShaderStage(Ds.VERTEX,this.node)}generate(e){let t=e.getSubBuildProperty("property",e.currentStack),n=e.getNodeProperties(this),i=this.setupVarying(e);if(n[t]===void 0){let s=this.getNodeType(e),r=e.getPropertyName(i,Ds.VERTEX);if(e.shaderStage===Ds.VERTEX){let a=n.node.build(e,s);e.addLineFlowCode(`${r} = ${a}`,this)}else e.flowNodeFromShaderStage(Ds.VERTEX,n.node,s,r);n[t]=r}return e.getPropertyName(i)}}var Ys=Ke(xd).setParameterLength(1,2),WT=(e)=>Ys(e);T("toVarying",Ys);T("toVertexStage",WT);var $T=q(([e])=>{let t=e.mul(0.9478672986).add(0.0521327014).pow(2.4),n=e.mul(0.0773993808),i=e.lessThanEqual(0.04045);return Pn(t,n,i)}).setLayout({name:"sRGBTransferEOTF",type:"vec3",inputs:[{name:"color",type:"vec3"}]}),qT=q(([e])=>{let t=e.pow(0.41666).mul(1.055).sub(0.055),n=e.mul(12.92),i=e.lessThanEqual(0.0031308);return Pn(t,n,i)}).setLayout({name:"sRGBTransferOETF",type:"vec3",inputs:[{name:"color",type:"vec3"}]}),Ql="WorkingColorSpace",XT="OutputColorSpace";class Jl extends it{static get type(){return"ColorSpaceNode"}constructor(e,t,n){super("vec4");this.colorNode=e,this.source=t,this.target=n}resolveColorSpace(e,t){if(t===Ql)return Le.workingColorSpace;else if(t===XT)return e.context.outputColorSpace||e.renderer.outputColorSpace;return t}setup(e){let{colorNode:t}=this,n=this.resolveColorSpace(e,this.source),i=this.resolveColorSpace(e,this.target),s=t;if(Le.enabled===!1||n===i||!n||!i)return s;if(Le.getTransfer(n)===Fr)s=ge($T(s.rgb),s.a);if(Le.getPrimaries(n)!==Le.getPrimaries(i))s=ge(ei(Le._getMatrix(new H,n,i)).mul(s.rgb),s.a);if(Le.getTransfer(i)===Fr)s=ge(qT(s.rgb),s.a);return s}}var YT=(e,t)=>new Jl(O(e),Ql,t),yd=(e,t)=>new Jl(O(e),t,Ql);T("workingToColorSpace",YT);T("colorSpaceToWorking",yd);class ec extends Xs{static get type(){return"ReferenceElementNode"}constructor(e,t){super(e,t);this.referenceNode=e,this.isReferenceElementNode=!0}generateNodeType(){return this.referenceNode.uniformType}generate(e){let t=super.generate(e),n=this.referenceNode.getNodeType(e),i=this.getNodeType(e);return e.format(t,n,i)}}class bd extends G{static get type(){return"ReferenceBaseNode"}constructor(e,t,n=null,i=null){super();this.property=e,this.uniformType=t,this.object=n,this.count=i,this.properties=e.split("."),this.reference=n,this.node=null,this.group=null,this.updateType=le.OBJECT}setGroup(e){return this.group=e,this}element(e){return new ec(this,O(e))}setNodeType(e){let t=$e(null,e);if(this.group!==null)t.setGroup(this.group);this.node=t}generateNodeType(e){if(this.node===null)this.updateReference(e),this.updateValue();return this.node.getNodeType(e)}getValueFromReference(e=this.reference){let{properties:t}=this,n=e[t[0]];for(let i=1;i<t.length;i++)n=n[t[i]];return n}updateReference(e){return this.reference=this.object!==null?this.object:e.object,this.reference}setup(){return this.updateValue(),this.node}update(){this.updateValue()}updateValue(){if(this.node===null)this.setNodeType(this.uniformType);let e=this.getValueFromReference();if(Array.isArray(e))this.node.array=e;else this.node.value=e}}class vd extends bd{static get type(){return"RendererReferenceNode"}constructor(e,t,n=null){super(e,t,n);this.renderer=n,this.setGroup(We)}updateReference(e){return this.reference=this.renderer!==null?this.renderer:e.renderer,this.reference}}var KT=(e,t,n=null)=>new vd(e,t,n);class Sd extends it{static get type(){return"ToneMappingNode"}constructor(e,t=jT,n=null){super("vec3");this._toneMapping=e,this.exposureNode=t,this.colorNode=n}customCacheKey(){return zh(this._toneMapping)}setToneMapping(e){return this._toneMapping=e,this}getToneMapping(){return this._toneMapping}setup(e){let t=this.colorNode||e.context.color,n=this._toneMapping;if(n===ds)return t;let i=null,s=e.renderer.library.getToneMappingFunction(n);if(s!==null)i=ge(s(t.rgb,this.exposureNode),t.a);else Y("ToneMappingNode: Unsupported Tone Mapping configuration.",n),i=t;return i}}var ZT=(e,t,n)=>new Sd(e,O(t),O(n)),jT=KT("toneMappingExposure","float");T("toneMapping",(e,t,n)=>ZT(t,n,e));var Ch=new WeakMap;function Ih(e,t){let n=Ch.get(e);if(n===void 0)n=new Gr(e,t),Ch.set(e,n);return n}class dn extends _a{static get type(){return"BufferAttributeNode"}constructor(e,t=null,n=0,i=0){super(e,t);if(this.isBufferNode=!0,this.bufferType=t,this.bufferStride=n,this.bufferOffset=i,this.usage=Or,this.instanced=!1,this.attribute=null,this.global=!0,e&&e.isBufferAttribute===!0&&e.itemSize<=4)this.attribute=e,this.usage=e.usage,this.instanced=e.isInstancedBufferAttribute}getHash(e){let t;if(this.bufferStride===0&&this.bufferOffset===0){let n=e.globalCache.getData(this.value);if(n===void 0)n={node:this},e.globalCache.setData(this.value,n);t=n.node.id}else t=this.id;return String(t)}generateNodeType(e){if(this.bufferType===null)this.bufferType=e.getTypeFromAttribute(this.attribute);return this.bufferType}setup(e){if(this.attribute!==null)return;let t=this.getNodeType(e),n=e.getTypeLength(t),i=this.value,s=this.bufferStride||n,r=this.bufferOffset,a;if(i.isInterleavedBuffer===!0)a=i;else if(i.isBufferAttribute===!0)a=Ih(i.array,s);else a=Ih(i,s);let o=new Ms(a,n,r);a.setUsage(this.usage),this.attribute=o,this.attribute.isInstancedBufferAttribute=this.instanced}generate(e){let t=this.getNodeType(e),n=e.context.nodeName;if(n!==void 0)delete e.context.nodeName;let i=e.getBufferAttributeFromNode(this,t,n),s=e.getPropertyName(i),r=null;if(e.shaderStage==="vertex"||e.shaderStage==="compute")this.name=s,r=s;else{let a;if(n)a=n+"Varying";r=Ys(this,a).build(e,t)}return r}getInputType(){return"bufferAttribute"}setUsage(e){if(this.usage=e,this.attribute&&this.attribute.isBufferAttribute===!0)this.attribute.usage=e;return this}setInstanced(e){return this.instanced=e,this}}function QT(e,t=null,n=0,i=0,s=Or,r=!1){if(t==="mat3"||t===null&&e.itemSize===9)return ei(new dn(e,"vec3",9,0).setUsage(s).setInstanced(r),new dn(e,"vec3",9,3).setUsage(s).setInstanced(r),new dn(e,"vec3",9,6).setUsage(s).setInstanced(r));else if(t==="mat4"||t===null&&e.itemSize===16)return td(new dn(e,"vec4",16,0).setUsage(s).setInstanced(r),new dn(e,"vec4",16,4).setUsage(s).setInstanced(r),new dn(e,"vec4",16,8).setUsage(s).setInstanced(r),new dn(e,"vec4",16,12).setUsage(s).setInstanced(r));return new dn(e,t,n,i).setUsage(s)}var JT=(e,t=null,n=0,i=0)=>QT(e,t,n,i);T("toAttribute",(e)=>JT(e.value,e.bufferType));class Te extends G{static get type(){return"IndexNode"}constructor(e){super("uint");this.scope=e,this.isIndexNode=!0}generate(e){let t=this.getNodeType(e),n=this.scope,i;if(n===Te.VERTEX)i=e.getVertexIndex();else if(n===Te.INSTANCE)i=e.getInstanceIndex();else if(n===Te.DRAW)i=e.getDrawIndex();else if(n===Te.INVOCATION_LOCAL)i=e.getInvocationLocalIndex();else if(n===Te.INVOCATION_SUBGROUP)i=e.getInvocationSubgroupIndex();else if(n===Te.SUBGROUP)i=e.getSubgroupIndex();else throw Error("THREE.IndexNode: Unknown scope: "+n);let s;if(e.shaderStage==="vertex"||e.shaderStage==="compute")s=i;else s=Ys(this).build(e,t);return s}}Te.VERTEX="vertex";Te.INSTANCE="instance";Te.SUBGROUP="subgroup";Te.INVOCATION_LOCAL="invocationLocal";Te.INVOCATION_SUBGROUP="invocationSubgroup";Te.DRAW="draw";var Nh=k(Te,Te.VERTEX),eM=k(Te,Te.INSTANCE),X2=k(Te,Te.SUBGROUP),Y2=k(Te,Te.INVOCATION_SUBGROUP),K2=k(Te,Te.INVOCATION_LOCAL),Z2=k(Te,Te.DRAW);class Td extends G{static get type(){return"ComputeNode"}constructor(e,t){super("void");this.isComputeNode=!0,this.computeNode=e,this.workgroupSize=t,this.count=null,this.dispatchSize=null,this.version=1,this.name="",this.onInitFunction=null,this.countNode=null,this.updateBeforeType=le.FRAME}setName(e){return this.name=e,this}label(e){return Q('TSL: "label()" has been deprecated. Use "setName()" instead.',new Ut),this.setName(e)}onInit(e){return this.onInitFunction=e,this}getUpdateBeforeType(e){return e.compute!==this?this.updateBeforeType:le.NONE}updateBefore({renderer:e}){e.compute(this)}setup(e){if(this.count!==null&&this.countNode===null)this.countNode=$e(this.count,"uint").onObjectUpdate(()=>this.count);let t=this.computeNode.build(e);if(t){let n=e.getNodeProperties(this);n.outputComputeNode=t.outputNode,t.outputNode=null}return t}generate(e,t){let{shaderStage:n}=e;if(n==="compute"){let i=this.computeNode.build(e,"void");if(i!=="")e.addLineFlowCode(i,this);if(this.count!==null&&e.allowEarlyReturns===!0){let s=this.countNode.build(e,"uint"),r=eM.build(e,"uint");e.flow.code=`${e.tab}if ( ${r} >= ${s} ) { return; }

${e.flow.code}`}}else{let s=e.getNodeProperties(this).outputComputeNode;if(s)return s.build(e,t)}}}var Md=(e,t=[64])=>{if(t.length===0||t.length>3)Y("TSL: compute() workgroupSize must have 1, 2, or 3 elements",new Ut);for(let n=0;n<t.length;n++){let i=t[n];if(typeof i!=="number"||i<=0||!Number.isInteger(i))Y(`TSL: compute() workgroupSize element at index [ ${n} ] must be a positive integer`,new Ut)}while(t.length<3)t.push(1);return new Td(O(e),t)},tM=(e,t,n)=>{let i=Md(e,n);if(typeof t==="number")i.count=t;else i.dispatchSize=t;return i};T("compute",tM);T("computeKernel",Md);class Ad extends G{static get type(){return"IsolateNode"}constructor(e,t=!0){super();this.node=e,this.parent=t,this.isIsolateNode=!0}generateNodeType(e){let t=e.getCache(),n=e.getCacheFromNode(this,this.parent);e.setCache(n);let i=this.node.getNodeType(e);return e.setCache(t),i}build(e,...t){let n=e.getCache(),i=e.getCacheFromNode(this,this.parent);e.setCache(i);let s=this.node.build(e,...t);return e.setCache(n),s}setParent(e){return this.parent=e,this}getParent(){return this.parent}}var Ed=(e)=>new Ad(O(e));function nM(e,t=!0){return Q('TSL: "cache()" has been deprecated. Use "isolate()" instead.'),Ed(e).setParent(t)}T("cache",nM);T("isolate",Ed);class wd extends G{static get type(){return"BypassNode"}constructor(e,t){super();this.isBypassNode=!0,this.outputNode=e,this.callNode=t}generateNodeType(e){return this.outputNode.getNodeType(e)}generate(e){let t=this.callNode.build(e,"void");if(t!=="")e.addLineFlowCode(t,this);return this.outputNode.build(e)}}var iM=Ke(wd).setParameterLength(2);T("bypass",iM);var Rd=q(([e,t,n,i=ae(0),s=ae(1),r=va(!1)])=>{let a=e.sub(t).div(n.sub(t));if($v(r))a=a.clamp();return a.mul(s.sub(i)).add(i)});function sM(e,t,n,i=ae(0),s=ae(1)){return Rd(e,t,n,i,s,!0)}T("remap",Rd);T("remapClamp",sM);class Cd extends G{static get type(){return"ExpressionNode"}constructor(e="",t="void"){super(t);this.snippet=e}generate(e,t){let n=this.getNodeType(e),i=this.snippet;if(n==="void")e.addLineFlowCode(i,this);else return e.format(i,n,t)}}var Ln=Ke(Cd).setParameterLength(1,2),rM=(e)=>(e?pd(e,Ln("discard")):Ln("discard")).toStack();T("discard",rM);var aM=q(([e])=>ge(e.rgb.mul(e.a),e.a),{color:"vec4",return:"vec4"}),oM=q(([e])=>e.a.equal(0).select(ge(0),ge(e.rgb.div(e.a),e.a)),{color:"vec4",return:"vec4"});class Id extends it{static get type(){return"RenderOutputNode"}constructor(e,t,n){super("vec4");this.colorNode=e,this._toneMapping=t,this.outputColorSpace=n,this.isRenderOutputNode=!0}setToneMapping(e){return this._toneMapping=e,this}getToneMapping(){return this._toneMapping}setup({context:e}){let t=this.colorNode||e.color;t=ge(t.rgb,t.a.clamp(0,1)),t=oM(t);let n=(this._toneMapping!==null?this._toneMapping:e.toneMapping)||ds,i=(this.outputColorSpace!==null?this.outputColorSpace:e.outputColorSpace)||Lr;if(n!==ds)t=t.toneMapping(n);if(i!==Lr&&i!==Le.workingColorSpace)t=t.workingToColorSpace(i);return t=aM(t),t}}var lM=(e,t=null,n=null)=>new Id(O(e),t,n);T("renderOutput",lM);class Nd extends it{static get type(){return"DebugNode"}constructor(e,t=null){super();this.node=e,this.callback=t}generateNodeType(e){return this.node.getNodeType(e)}setup(e){return this.node.build(e)}analyze(e){return this.node.build(e)}generate(e){let t=this.callback,n=this.node.build(e);if(t!==null)t(e,n);else{let i="--- TSL debug - "+e.shaderStage+" shader ---",s="-".repeat(i.length),r="";r+="// #"+i+`#
`,r+=e.flow.code.replace(/^\t/mg,"")+`
`,r+="/* ... */ "+n+` /* ... */
`,r+="// #"+s+`#
`,us(r)}return n}}var cM=(e,t=null)=>new Nd(O(e),t).toStack();T("debug",cM);class Pd extends on{constructor(){super();this._renderer=null,this.currentFrame=null,this.isRunning=!1,this.enabled=!0}get nodeFrame(){return this._renderer._nodes.nodeFrame}setRenderer(e){return this._renderer=e,this}getRenderer(){return this._renderer}begin(){this.isRunning=!0}finish(){this.isRunning=!1}inspect(){}computeAsync(){}beginCompute(){}finishCompute(){}beginRender(){}finishRender(){}copyTextureToTexture(){}copyFramebufferToTexture(){}dispose(){if(this.isRunning===!0)this.finish();this.dispatchEvent({type:"dispose"})}}class Ld extends G{static get type(){return"InspectorNode"}constructor(e,t="",n=null){super();this.node=e,this.name=t,this.callback=n,this.updateType=le.FRAME,this.isInspectorNode=!0}getName(){return this.name||this.node.name}update(e){e.renderer.inspector.inspect(this)}generateNodeType(e){return this.node.getNodeType(e)}setup(e){let t=this.node;if(e.context.inspector===!0&&this.callback!==null)t=this.callback(t);if(e.renderer.backend.isWebGPUBackend!==!0&&e.renderer.inspector.constructor!==Pd)zt('TSL: ".toInspector()" is only available with WebGPU.');return t}}function uM(e,t="",n=null){return e=O(e),e.before(new Ld(e,t,n))}T("toInspector",uM);class Fd extends G{static get type(){return"AttributeNode"}constructor(e,t=null){super(t);this.global=!0,this._attributeName=e}getHash(e){return this.getAttributeName(e)}generateNodeType(e){let t=this.nodeType;if(t===null){let n=this.getAttributeName(e);if(e.hasGeometryAttribute(n)){let i=e.geometry.getAttribute(n);t=e.getTypeFromAttribute(i)}else t="float"}return t}setAttributeName(e){return this._attributeName=e,this}getAttributeName(){return this._attributeName}generate(e){let t=this.getAttributeName(e),n=this.getNodeType(e);if(e.hasGeometryAttribute(t)===!0){let s=e.geometry.getAttribute(t),r=e.getTypeFromAttribute(s),a=e.getAttribute(t,r);if(e.shaderStage==="vertex")return e.format(a.name,r,n);else return Ys(this).build(e,n)}else return Q(`AttributeNode: Vertex attribute "${t}" not found on geometry.`),e.generateConst(n)}serialize(e){super.serialize(e),e.global=this.global,e._attributeName=this._attributeName}deserialize(e){super.deserialize(e),this.global=e.global,this._attributeName=e._attributeName}}var Fn=(e,t=null)=>new Fd(e,t),Aa=(e=0)=>Fn("uv"+(e>0?e:""),"vec2");class Dd extends G{static get type(){return"TextureSizeNode"}constructor(e,t=null){super("uvec2");this.isTextureSizeNode=!0,this.textureNode=e,this.levelNode=t}generate(e){let t=this.textureNode.build(e,"property"),n=this.levelNode===null?"0":this.levelNode.build(e,"int"),i=e.generateTextureSize(this.textureNode.value,t,n);return e.format(i,this.getNodeType(e))}}var Ph=Ke(Dd).setParameterLength(1,2);class Ud extends ki{static get type(){return"MaxMipLevelNode"}constructor(e){super(0);this._textureNode=e,this.updateType=le.FRAME}get textureNode(){return this._textureNode}get texture(){return this._textureNode.value}update(){let e=this.texture,t=e.images,n=t&&t.length>0?t[0]&&t[0].image||t[0]:e.image;if(n&&n.width!==void 0){let{width:i,height:s}=n;this.value=Math.log2(Math.max(i,s))}}}var hM=Ke(Ud).setParameterLength(1);class Bd extends Error{constructor(e,t=null){super(e);this.name="NodeError",this.stackTrace=t}}var Od=new at;class Ea extends ki{static get type(){return"TextureNode"}constructor(e=Od,t=null,n=null,i=null){super(e);this.isTextureNode=!0,this.uvNode=t,this.levelNode=n,this.biasNode=i,this.compareNode=null,this.depthNode=null,this.gradNode=null,this.gatherNode=null,this.offsetNode=null,this.sampler=!0,this.updateMatrix=!1,this.updateType=le.NONE,this.referenceNode=null,this._value=e,this._matrixUniform=null,this._flipYUniform=null,this._samplerComparison=!1,this.setUpdateMatrix(t===null)}set value(e){if(this.referenceNode)this.referenceNode.value=e;else this._value=e}get value(){return this.referenceNode?this.referenceNode.value:this._value}getUniformHash(){return this.value.uuid}generateNodeType(){if(this.gatherNode!==null)return"vec4";return Rv(this.value)}getInputType(){return"texture"}getDefaultUV(){return Aa(this.value.channel)}updateReference(){return this.value}getTransformedUV(e){if(this._matrixUniform===null)this._matrixUniform=$e(this.value.matrix);return this._matrixUniform.mul(Ie(e,1)).xy}setUpdateMatrix(e){return this.updateMatrix=e,this}setupUV(e,t){if(e.isFlipY()){if(this._flipYUniform===null)this._flipYUniform=$e(!1);if(t=t.toVar(),this.sampler)t=this._flipYUniform.select(t.flipY(),t);else t=this._flipYUniform.select(t.setY(ba(Ph(this,this.levelNode).y).sub(t.y).sub(1)),t)}return t}setup(e){let t=e.getNodeProperties(this);t.referenceNode=this.referenceNode;let n=this.value;if(!n||n.isTexture!==!0)throw new Bd("THREE.TSL: `texture( value )` function expects a valid instance of THREE.Texture().",this.stackTrace);let i=q(()=>{let o=this.uvNode;if((o===null||e.context.forceUVContext===!0)&&e.context.getUV)o=e.context.getUV(this,e);if(!o)o=this.getDefaultUV();if(this.updateMatrix===!0)o=this.getTransformedUV(o);return o=this.setupUV(e,o),this.updateType=this._matrixUniform!==null||this._flipYUniform!==null?le.OBJECT:le.NONE,o})(),s=this.levelNode;if(s===null&&e.context.getTextureLevel)s=e.context.getTextureLevel(this);let r=null,a=null;if(this.compareNode!==null)if(e.renderer.hasCompatibility(Vo.TEXTURE_COMPARE))r=this.compareNode;else{let o=n.compareFunction;if(o===null||o===Ur||o===Br||o===gs||o===_s)a=this.compareNode;else r=this.compareNode,zt('TSL: Only "LessCompare", "LessEqualCompare", "GreaterCompare" and "GreaterEqualCompare" are supported for depth texture comparison fallback.')}t.uvNode=i,t.levelNode=s,t.biasNode=this.biasNode,t.compareNode=r,t.compareStepNode=a,t.gradNode=this.gradNode,t.gatherNode=this.gatherNode,t.depthNode=this.depthNode,t.offsetNode=this.offsetNode}generateUV(e,t){return t.build(e,this.sampler===!0?"vec2":"ivec2")}generateOffset(e,t){return t.build(e,"ivec2")}generateSnippet(e,t,n,i,s,r,a,o,l,c,u){let h=this.value,d;if(s)d=e.generateTextureBias(h,t,n,s,r,c);else if(o)d=e.generateTextureGrad(h,t,n,o,r,c);else if(l)if(a)d=e.generateTextureGatherCompare(h,t,n,a,r,c,u);else d=e.generateTextureGather(h,t,n,l,r,c,u);else if(a)d=e.generateTextureCompare(h,t,n,a,r,c);else if(this.sampler===!1)d=e.generateTextureLoad(h,t,n,i,r,c);else if(i)d=e.generateTextureLevel(h,t,n,i,r,c);else d=e.generateTexture(h,t,n,r,c);return d}generate(e,t){let n=this.value,i=e.getNodeProperties(this),s=super.generate(e,"property");if(/^sampler/.test(t)){if(t==="samplerComparison"){this._samplerComparison=!0;let r=this.getSharedNode(e);r._samplerComparison=!0}return s+"_sampler"}else if(e.isReference(t))return s;else{let r=e.getDataFromNode(this),a=this.getNodeType(e),o=r.propertyName;if(o===void 0){let{uvNode:c,levelNode:u,biasNode:h,compareNode:d,compareStepNode:f,depthNode:p,gradNode:m,gatherNode:g,offsetNode:_}=i,x=this.generateUV(e,c),b=u?u.build(e,"float"):null,S=h?h.build(e,"float"):null,v=p?p.build(e,"int"):null,A=d?d.build(e,"float"):null,E=f?f.build(e,"float"):null,I=m?[m[0].build(e,"vec2"),m[1].build(e,"vec2")]:null,F=g?g.build(e,"int"):null,U=_?this.generateOffset(e,_):null,P=this._flipYUniform?this._flipYUniform.build(e,"bool"):null,C=v;if(C===null&&n.isArrayTexture&&this.isTexture3DNode!==!0)C="0";let B=e.getVarFromNode(this);o=e.getPropertyName(B);let N=this.generateSnippet(e,s,x,b,S,C,A,I,F,U,P),R;if(n.isDepthTexture===!0&&F===null)R="float";else R=n.type===Nr?"uvec4":n.type===Ir?"ivec4":"vec4";if(N=e.format(N,R,a),E!==null){let Z=n.compareFunction;if(Z===gs||Z===_s)N=Fl(Ln(N,a),Ln(E,"float")).build(e,a);else N=Fl(Ln(E,"float"),Ln(N,a)).build(e,a)}e.addLineFlowCode(`${o} = ${N}`,this),r.snippet=N,r.propertyName=o}let l=o;if(e.needsToWorkingColorSpace(n))l=yd(Ln(l,a),n.colorSpace).setup(e).build(e,a);return e.format(l,a,t)}}setSampler(e){return this.sampler=e,this}getSampler(){return this.sampler}sample(e){let t=this.clone();return t.uvNode=O(e),t.referenceNode=this.getBase(),O(t)}load(e){return this.sample(e).setSampler(!1)}blur(e){let t=this.clone();t.biasNode=O(e).mul(hM(t)),t.referenceNode=this.getBase();let n=t.value;if(t.generateMipmaps===!1&&(n&&n.generateMipmaps===!1||n.minFilter===Cr||n.magFilter===Cr))Q("TSL: texture().blur() requires mipmaps and sampling. Use .generateMipmaps=true and .minFilter/.magFilter=THREE.LinearFilter in the Texture."),t.biasNode=null;return O(t)}level(e){let t=this.clone();return t.levelNode=O(e),t.referenceNode=this.getBase(),O(t)}size(e){return Ph(this,e)}bias(e){let t=this.clone();return t.biasNode=O(e),t.referenceNode=this.getBase(),O(t)}getBase(){return this.referenceNode?this.referenceNode.getBase():this}compare(e){let t=this.clone();return t.compareNode=O(e),t.referenceNode=this.getBase(),O(t)}grad(e,t){let n=this.clone();return n.gradNode=[O(e),O(t)],n.referenceNode=this.getBase(),O(n)}gather(e=0){let t=this.clone();return t.gatherNode=O(e),t.referenceNode=this.getBase(),O(t)}isSampleCompare(){return this.compareNode!==null||this._samplerComparison===!0}depth(e){let t=this.clone();return t.depthNode=O(e),t.referenceNode=this.getBase(),O(t)}offset(e){let t=this.clone();return t.offsetNode=O(e),t.referenceNode=this.getBase(),O(t)}serialize(e){super.serialize(e),e.value=this.value.toJSON(e.meta).uuid,e.sampler=this.sampler,e.updateMatrix=this.updateMatrix,e.updateType=this.updateType}deserialize(e){super.deserialize(e),this.value=e.meta.textures[e.value],this.sampler=e.sampler,this.updateMatrix=e.updateMatrix,this.updateType=e.updateType}update(){let e=this.value,t=this._matrixUniform;if(t!==null)t.value=e.matrix;if(e.matrixAutoUpdate===!0)e.updateMatrix();let n=this._flipYUniform;if(n!==null)n.value=e.image instanceof ImageBitmap&&e.flipY===!0||e.isRenderTargetTexture===!0||e.isFramebufferTexture===!0||e.isDepthTexture===!0}clone(){let e=new this.constructor(this.value,this.uvNode,this.levelNode,this.biasNode);return e.sampler=this.sampler,e.depthNode=this.depthNode,e.compareNode=this.compareNode,e.gradNode=this.gradNode,e.gatherNode=this.gatherNode,e.offsetNode=this.offsetNode,e}}var dM=Ke(Ea).setParameterLength(1,4).setName("texture"),fM=(e=Od,t=null,n=null,i=null)=>{let s;if(e&&e.isTextureNode===!0){if(s=O(e.clone()),s.referenceNode=e.getBase(),t!==null)s.uvNode=O(t);if(n!==null)s.levelNode=O(n);if(i!==null)s.biasNode=O(i)}else s=dM(e,t,n,i);return s};class tc extends ki{static get type(){return"BufferNode"}constructor(e,t,n=0){super(e,t);this.isBufferNode=!0,this.bufferType=t,this.bufferCount=n,this.updateRanges=[]}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}getElementType(e){return this.getNodeType(e)}getInputType(){return"buffer"}}var pM=(e,t,n)=>new tc(e,t,n);class kd extends Xs{static get type(){return"UniformArrayElementNode"}constructor(e,t){super(e,t);this.isArrayBufferElementNode=!0}generate(e){let t=super.generate(e),n=this.getNodeType(e),i=this.node.getPaddedType();return e.format(t,i,n)}}class Vd extends tc{static get type(){return"UniformArrayNode"}constructor(e,t=null){super(null);this.array=e,this.elementType=t===null?ga(e[0]):t,this.paddedType=this.getPaddedType(),this.updateType=le.RENDER,this.isArrayBufferNode=!0}generateNodeType(){return this.paddedType}getElementType(){return this.elementType}getPaddedType(){let e=this.elementType,t="vec4";if(e==="mat2")t="mat2";else if(/mat/.test(e)===!0)t="mat4";else if(e.charAt(0)==="i")t="ivec4";else if(e.charAt(0)==="u")t="uvec4";return t}update(){this.updateBuffer()}onUpdate(e,t){return e=e.bind(this),super.onUpdate((n,i)=>{e(n,i),this.updateBuffer()},t)}updateBuffer(){let{array:e,value:t}=this,n=this.elementType;if(n==="float"||n==="int"||n==="uint")for(let i=0;i<e.length;i++){let s=i*4;t[s]=e[i]}else if(n==="color")for(let i=0;i<e.length;i++){let s=i*4,r=e[i];t[s]=r.r,t[s+1]=r.g,t[s+2]=r.b||0}else if(n==="mat2")for(let i=0;i<e.length;i++){let s=i*4,r=e[i];t[s]=r.elements[0],t[s+1]=r.elements[1],t[s+2]=r.elements[2],t[s+3]=r.elements[3]}else if(n==="mat3")for(let i=0;i<e.length;i++){let s=i*16,r=e[i];t[s]=r.elements[0],t[s+1]=r.elements[1],t[s+2]=r.elements[2],t[s+4]=r.elements[3],t[s+5]=r.elements[4],t[s+6]=r.elements[5],t[s+8]=r.elements[6],t[s+9]=r.elements[7],t[s+10]=r.elements[8],t[s+15]=1}else if(n==="mat4")for(let i=0;i<e.length;i++){let s=i*16,r=e[i];for(let a=0;a<r.elements.length;a++)t[s+a]=r.elements[a]}else for(let i=0;i<e.length;i++){let s=i*4,r=e[i];t[s]=r.x,t[s+1]=r.y,t[s+2]=r.z||0,t[s+3]=r.w||0}}setup(e){let t=this.array.length,n=this.elementType,i=Float32Array,s=this.paddedType,r=e.getTypeLength(s);if(n.charAt(0)==="i")i=Int32Array;if(n.charAt(0)==="u")i=Uint32Array;return this.value=new i(t*r),this.bufferCount=t,this.bufferType=s,this.updateBuffer(),super.setup(e)}element(e){return new kd(this,O(e))}}var jt=(e,t)=>new Vd(e,t);class Gd extends G{constructor(e){super("float");this.name=e,this.isBuiltinNode=!0}generate(){return this.name}}var Ks=Ke(Gd).setParameterLength(1),Us,Bs;class Oe extends G{static get type(){return"ScreenNode"}constructor(e){super();this.scope=e,this.isViewportNode=!0}generateNodeType(){if(this.scope===Oe.VIEWPORT)return"vec4";else return"vec2"}update({renderer:e}){let t=e.getRenderTarget();if(this.scope===Oe.VIEWPORT)if(t!==null)Bs.copy(t.viewport);else e.getViewport(Bs),Bs.multiplyScalar(e.getPixelRatio());else if(t!==null)Us.width=t.width,Us.height=t.height;else e.getDrawingBufferSize(Us)}setup(){let e=this.scope,t=null;if(e===Oe.SIZE)t=$e(Us||(Us=new Ue)).setGroup(We);else if(e===Oe.VIEWPORT)t=$e(Bs||(Bs=new Ht)).setGroup(We);else t=Jn(zd.div(Lh));let n=le.NONE;if(this.scope===Oe.SIZE||this.scope===Oe.VIEWPORT)n=le.RENDER;return this.updateType=n,t}generate(e){if(this.scope===Oe.COORDINATE){let t=e.getFragCoord();if(e.isFlipY()){let n=e.getNodeProperties(Lh).outputNode.build(e);t=`${e.getType("vec2")}( ${t}.x, ${n}.y - ${t}.y )`}return t}return super.generate(e)}}Oe.COORDINATE="coordinate";Oe.VIEWPORT="viewport";Oe.SIZE="size";Oe.UV="uv";var mM=$e(1).setGroup(We).onRenderUpdate(({renderer:e})=>e.getPixelRatio()),nc=k(Oe,Oe.UV),Lh=k(Oe,Oe.SIZE),zd=k(Oe,Oe.COORDINATE),Hs=k(Oe,Oe.VIEWPORT),j2=Hs.zw,Q2=zd.sub(Hs.xy);var vl=null,ha=null,Sl=null,da=null,Tl=null,fa=null,Ml=null,pa=null;var wa=$e(0,"uint").setName("u_cameraIndex").setGroup(Yl("cameraIndex")).toVarying("v_cameraIndex"),Os=$e("float").setName("cameraNear").setGroup(We).onRenderUpdate(({camera:e})=>e.near),ks=$e("float").setName("cameraFar").setGroup(We).onRenderUpdate(({camera:e})=>e.far),Ui=q(({camera:e})=>{let t;if(e.isArrayCamera&&e.cameras.length>0){let n=[];for(let i of e.cameras)n.push(i.projectionMatrix);if(ha===null)ha=jt(n).setGroup(We).setName("cameraProjectionMatrices");else ha.array=n;t=ha.element(e.isMultiViewCamera?Ks("gl_ViewID_OVR"):wa)}else{if(vl===null)vl=$e(e.projectionMatrix).setName("cameraProjectionMatrix").setGroup(We).onRenderUpdate(({camera:n})=>n.projectionMatrix);t=vl}return t}).once()(),gM=q(({camera:e})=>{let t;if(e.isArrayCamera&&e.cameras.length>0){let n=[];for(let i of e.cameras)n.push(i.projectionMatrixInverse);if(da===null)da=jt(n).setGroup(We).setName("cameraProjectionMatricesInverse");else da.array=n;t=da.element(e.isMultiViewCamera?Ks("gl_ViewID_OVR"):wa)}else{if(Sl===null)Sl=$e(e.projectionMatrixInverse).setName("cameraProjectionMatrixInverse").setGroup(We).onRenderUpdate(({camera:n})=>n.projectionMatrixInverse);t=Sl}return t}).once()(),ic=q(({camera:e})=>{let t;if(e.isArrayCamera&&e.cameras.length>0){let n=[];for(let i of e.cameras)n.push(i.matrixWorldInverse);if(fa===null)fa=jt(n).setGroup(We).setName("cameraViewMatrices");else fa.array=n;t=fa.element(e.isMultiViewCamera?Ks("gl_ViewID_OVR"):wa)}else{if(Tl===null)Tl=$e(e.matrixWorldInverse).setName("cameraViewMatrix").setGroup(We).onRenderUpdate(({camera:n})=>n.matrixWorldInverse);t=Tl}return t}).once()(),Hd=q(({camera:e})=>{let t;if(e.isArrayCamera&&e.cameras.length>0){let n=[];for(let i of e.cameras)n.push(i.matrixWorld);if(pa===null)pa=jt(n).setGroup(We).setName("cameraWorldMatrices");else pa.array=n;t=pa.element(e.isMultiViewCamera?Ks("gl_ViewID_OVR"):wa)}else{if(Ml===null)Ml=$e(e.matrixWorld).setName("cameraWorldMatrix").setGroup(We).onRenderUpdate(({camera:n})=>n.matrixWorld);t=Ml}return t}).once()();var Fh=new Ts;class ye extends G{static get type(){return"Object3DNode"}constructor(e,t=null){super();this.scope=e,this.object3d=t,this.updateType=le.OBJECT,this.uniformNode=new ki(null)}generateNodeType(){let e=this.scope;if(e===ye.WORLD_MATRIX)return"mat4";else if(e===ye.POSITION||e===ye.VIEW_POSITION||e===ye.DIRECTION||e===ye.SCALE)return"vec3";else if(e===ye.RADIUS)return"float"}update(e){let t=this.object3d,n=this.uniformNode,i=this.scope;if(i===ye.WORLD_MATRIX)n.value=t.matrixWorld;else if(i===ye.POSITION)n.value=n.value||new w,n.value.setFromMatrixPosition(t.matrixWorld);else if(i===ye.SCALE)n.value=n.value||new w,n.value.setFromMatrixScale(t.matrixWorld);else if(i===ye.DIRECTION)n.value=n.value||new w,t.getWorldDirection(n.value);else if(i===ye.VIEW_POSITION){let s=e.camera;n.value=n.value||new w,n.value.setFromMatrixPosition(t.matrixWorld),n.value.applyMatrix4(s.matrixWorldInverse)}else if(i===ye.RADIUS){let s=e.object.geometry;if(s.boundingSphere===null)s.computeBoundingSphere();Fh.copy(s.boundingSphere).applyMatrix4(t.matrixWorld),n.value=Fh.radius}}generate(e){let t=this.scope;if(t===ye.WORLD_MATRIX)this.uniformNode.nodeType="mat4";else if(t===ye.POSITION||t===ye.VIEW_POSITION||t===ye.DIRECTION||t===ye.SCALE)this.uniformNode.nodeType="vec3";else if(t===ye.RADIUS)this.uniformNode.nodeType="float";return this.uniformNode.build(e)}serialize(e){super.serialize(e),e.scope=this.scope}deserialize(e){super.deserialize(e),this.scope=e.scope}}ye.WORLD_MATRIX="worldMatrix";ye.POSITION="position";ye.SCALE="scale";ye.VIEW_POSITION="viewPosition";ye.DIRECTION="direction";ye.RADIUS="radius";class mt extends ye{static get type(){return"ModelNode"}constructor(e){super(e)}update(e){this.object3d=e.object,super.update(e)}}var J2=k(mt,mt.DIRECTION),Wd=k(mt,mt.WORLD_MATRIX),eI=k(mt,mt.POSITION),tI=k(mt,mt.SCALE),nI=k(mt,mt.VIEW_POSITION),iI=k(mt,mt.RADIUS),_M=$e(new H).onObjectUpdate(({object:e},t)=>t.value.getNormalMatrix(e.matrixWorld));var Dl=q((e)=>e.context.modelViewMatrix||xM).once()().toVar("modelViewMatrix"),xM=ic.mul(Wd);var yM=q((e)=>{if(e.shaderStage!=="fragment")return zt("TSL: `clipSpace` is only available in fragment stage."),ge();return e.context.clipSpace.toVarying("v_clipSpace")}).once()(),Dt=Fn("position","vec3");var ct=q((e)=>{if(e.shaderStage==="fragment"&&e.material.vertexNode){let t=gM.mul(yM);return t.xyz.div(t.w).toVar("positionView")}return e.context.setupPositionView().toVarying("v_positionView")},"vec3").once(["POSITION","VERTEX"])(),$d=q((e)=>{let t;if(e.camera.isOrthographicCamera)t=Ie(0,0,1);else t=ct.negate().toVarying("v_positionViewDirection").normalize();return t.toVar("positionViewDirection")},"vec3").once(["POSITION"])();class qd extends G{static get type(){return"FrontFacingNode"}constructor(){super("bool");this.isFrontFacingNode=!0}generate(e){if(e.shaderStage!=="fragment")return"true";let{material:t}=e;if(t.side===Hn)return"false";return e.getFrontFacing()}}var bM=k(qd),Xd=ae(bM).mul(2).sub(1),Ra=q(([e],{material:t})=>{let n=t.side;if(n===Hn)e=e.mul(-1);else if(n===hs)e=e.mul(Xd);return e});var vM=Fn("normal","vec3"),SM=q((e)=>{if(e.geometry.hasAttribute("normal")===!1)return Q('TSL: Vertex attribute "normal" not found on geometry.'),Ie(0,1,0);return vM},"vec3").once()().toVar("normalLocal"),TM=ct.dFdx().cross(ct.dFdy()).normalize().toVar("normalFlat"),MM=q((e)=>{let t;if(e.isFlatShading())t=TM;else t=Yd(SM).toVarying("v_normalViewGeometry").normalize();return t},"vec3").once()().toVar("normalViewGeometry");var gt=q((e)=>{let t;if(e.subBuildFn==="NORMAL"||e.subBuildFn==="VERTEX"){if(t=MM,e.isFlatShading()!==!0)t=Ra(t)}else t=e.context.setupNormal().context({getUV:null,getTextureLevel:null});return t},"vec3").once(["NORMAL","VERTEX"])().toVar("normalView"),AM=gt.transformNormalByInverseViewMatrix(ic).toVar("normalWorld"),EM=q(({subBuildFn:e,context:t})=>{let n;if(e==="NORMAL"||e==="VERTEX")n=gt;else n=t.setupClearcoatNormal().context({getUV:null,getTextureLevel:null});return n},"vec3").once(["NORMAL","VERTEX"])().toVar("clearcoatNormalView"),wM=q(([e,t=Wd])=>ei(t).inverse().transpose().mul(e).normalize());T("transformNormal",wM);var Yd=q(([e],t)=>{let n=t.context.modelNormalViewMatrix;if(n)return e.transformNormalByViewMatrix(n);return _M.mul(e).transformNormalByViewMatrix(ic)}),sI=q(()=>(Q('TSL: "transformedNormalView" is deprecated. Use "normalView" instead.'),gt)).once(["NORMAL","VERTEX"])(),rI=q(()=>(Q('TSL: "transformedNormalWorld" is deprecated. Use "normalWorld" instead.'),AM)).once(["NORMAL","VERTEX"])(),aI=q(()=>(Q('TSL: "transformedClearcoatNormalView" is deprecated. Use "clearcoatNormalView" instead.'),EM)).once(["NORMAL","VERTEX"])(),Al=new Re,RM=$e(0).onReference(({material:e})=>e).onObjectUpdate(({material:e})=>e.refractionRatio);var CM=$e(new Re).onReference(function(e){return e.material}).onObjectUpdate(function({material:e,scene:t}){let i=(t.environment!==null||t.environmentNode&&t.environmentNode.isNode)&&e.envMap===null?t.environmentRotation:e.envMapRotation;if(i)Al.makeRotationFromEuler(i).transpose();else Al.identity();return Al}),IM=$d.negate().reflect(gt),NM=$d.negate().refract(gt,RM),PM=IM.transformDirection(Hd).toVar("reflectVector"),LM=NM.transformDirection(Hd).toVar("refractVector"),FM=new Wr;class Kd extends Ea{static get type(){return"CubeTextureNode"}constructor(e,t=null,n=null,i=null){super(e,t,n,i);this.isCubeTextureNode=!0}getInputType(){if(this.value.isDepthTexture===!0)return"cubeDepthTexture";return"cubeTexture"}getDefaultUV(){let e=this.value;if(e.mapping===Rr)return PM;else if(e.mapping===fs)return LM;else return Y('CubeTextureNode: Mapping "%s" not supported.',e.mapping),Ie(0,0,0)}setUpdateMatrix(){}setupUV(e,t){let n=this.value;if(n.isDepthTexture===!0){if(e.renderer.coordinateSystem===ys)return Ie(t.x,t.y.negate(),t.z);return t}if(t=CM.mul(t),e.renderer.coordinateSystem===ys||!n.isRenderTargetTexture)t=Ie(t.x.negate(),t.yz);return t}generateUV(e,t){return t.build(e,this.sampler===!0?"vec3":"ivec3")}}var DM=Ke(Kd).setParameterLength(1,4).setName("cubeTexture"),UM=(e=FM,t=null,n=null,i=null)=>{let s;if(e&&e.isCubeTextureNode===!0){if(s=O(e.clone()),s.referenceNode=e,t!==null)s.uvNode=O(t);if(n!==null)s.levelNode=O(n);if(i!==null)s.biasNode=O(i)}else s=DM(e,t,n,i);return s};class sc extends G{static get type(){return"ReferenceNode"}constructor(e,t,n=null,i=null){super();this.property=e,this.uniformType=t,this.object=n,this.count=i,this.properties=e.split("."),this.reference=n,this.node=null,this.group=null,this.name=null,this.updateType=le.OBJECT}element(e){return new ec(this,O(e))}setGroup(e){return this.group=e,this}setName(e){return this.name=e,this}label(e){return Q('TSL: "label()" has been deprecated. Use "setName()" instead.'),this.setName(e)}setNodeType(e){let t=null;if(this.count!==null)t=pM(null,e,this.count);else if(Array.isArray(this.getValueFromReference()))t=jt(null,e),t.updateType=le.OBJECT;else if(e==="texture")t=fM(null);else if(e==="cubeTexture")t=UM(null);else t=$e(null,e);if(this.group!==null)t.setGroup(this.group);if(this.name!==null)t.setName(this.name);this.node=t}generateNodeType(e){if(this.node===null)this.updateReference(e),this.updateValue();return this.node.getNodeType(e)}getValueFromReference(e=this.reference){let{properties:t}=this,n=e[t[0]];for(let i=1;i<t.length;i++)n=n[t[i]];return n}updateReference(e){return this.reference=this.object!==null?this.object:e.object,this.reference}setup(){return this.updateValue(),this.node}update(){this.updateValue()}updateValue(){if(this.node===null)this.setNodeType(this.uniformType);let e=this.getValueFromReference();if(Array.isArray(e))this.node.array=e;else this.node.value=e}}var Dh=(e,t,n)=>new sc(e,t,n);class Zd extends sc{static get type(){return"MaterialReferenceNode"}constructor(e,t,n=null){super(e,t,n);this.material=n,this.isMaterialReferenceNode=!0}updateReference(e){return this.reference=this.material!==null?this.material:e.material,this.reference}}var BM=(e,t,n=null)=>new Zd(e,t,n),jd=Aa(),OM=ct.dFdx(),kM=ct.dFdy(),Qd=jd.dFdx(),Jd=jd.dFdy(),ef=gt,tf=kM.cross(ef),nf=ef.cross(OM),Ul=tf.mul(Qd.x).add(nf.mul(Jd.x)),Bl=tf.mul(Qd.y).add(nf.mul(Jd.y)),Uh=Ul.dot(Ul).max(Bl.dot(Bl)),sf=Uh.equal(0).select(0,Uh.inverseSqrt()),VM=Ul.mul(sf).toVar("tangentViewFrame"),GM=Bl.mul(sf).toVar("bitangentViewFrame"),rf=Fn("tangent","vec4"),zM=rf.xyz.toVar("tangentLocal"),af=q((e)=>{let t;if(e.subBuildFn==="VERTEX"||e.geometry.hasAttribute("tangent"))t=Dl.mul(ge(zM,0)).xyz.toVarying("v_tangentView").normalize();else t=VM;if(e.isFlatShading()!==!0)t=Ra(t);return t},"vec3").once(["NORMAL","VERTEX"])().toVar("tangentView");var HM=q(([e,t],n)=>{let i=e.mul(rf.w).xyz;if(n.subBuildFn==="NORMAL"&&n.isFlatShading()!==!0)i=i.toVarying(t);return i}).once(["NORMAL"]);var WM=q((e)=>{let t;if(e.subBuildFn==="VERTEX"||e.geometry.hasAttribute("tangent"))t=HM(gt.cross(af),"v_bitangentView").normalize();else t=GM;if(e.isFlatShading()!==!0)t=Ra(t);return t},"vec3").once(["NORMAL","VERTEX"])().toVar("bitangentView");var $M=ei(af,WM,gt).toVar("TBNViewMatrix");var Bh=(e)=>Ie(e,ad(dd(ae(1).sub(Ma(e,e)))));class of extends it{static get type(){return"NormalMapNode"}constructor(e,t=null){super("vec3");this.node=e,this.scaleNode=t,this.normalMapType=ps,this.unpackNormalMode=ms}setup(e){let{normalMapType:t,scaleNode:n,unpackNormalMode:i}=this,s=this.node.mul(2).sub(1);if(t===ps){if(i===Dr)s=Bh(s.xy);else if(i===Do)s=Bh(s.yw);else if(i!==ms)Y(`THREE.NodeMaterial: Unexpected unpack normal mode: ${i}`)}else if(i!==ms)Y(`THREE.NodeMaterial: Normal map type '${t}' is not compatible with unpack normal mode '${i}'`);if(n!==null){let a=n;if(e.isFlatShading()===!0)a=Ra(a);s=Ie(s.xy.mul(a),s.z)}let r=null;if(t===Fo)r=Yd(s);else if(t===ps)r=$M.mul(s).normalize();else Y(`NodeMaterial: Unsupported normal map type: ${t}`),r=gt;return r}}var Oh=Ke(of).setParameterLength(1,2),qM=q(({textureNode:e,bumpScale:t})=>{let n=(s)=>e.isolate().context({getUV:(r)=>s(r.uvNode||Aa()),forceUVContext:!0}),i=ae(n((s)=>s));return Jn(ae(n((s)=>s.add(s.dFdx()))).sub(i),ae(n((s)=>s.add(s.dFdy()))).sub(i)).mul(t)}),XM=q((e)=>{let{surf_pos:t,surf_norm:n,dHdxy:i}=e,s=t.dFdx().normalize(),r=t.dFdy().normalize(),a=n,o=r.cross(a),l=a.cross(s),c=s.dot(o).mul(Xd),u=c.sign().mul(i.x.mul(o).add(i.y.mul(l)));return c.abs().mul(n).sub(u).normalize()});class lf extends it{static get type(){return"BumpMapNode"}constructor(e,t=null){super("vec3");this.textureNode=e,this.scaleNode=t}setup(e){if(e.material.wireframe===!0)return gt;let t=this.scaleNode!==null?this.scaleNode:1,n=qM({textureNode:this.textureNode,bumpScale:t});return XM({surf_pos:ct,surf_norm:gt,dHdxy:n})}}var YM=Ke(lf).setParameterLength(1,2),kh=new Map;class M extends G{static get type(){return"MaterialNode"}constructor(e){super();this.scope=e}getCache(e,t){let n=kh.get(e);if(n===void 0)n=BM(e,t),kh.set(e,n);return n}getFloat(e){return this.getCache(e,"float")}getColor(e){return this.getCache(e,"color")}getTexture(e){return this.getCache(e==="map"?"map":e+"Map","texture")}setup(e){let t=e.context.material,n=this.scope,i=null;if(n===M.COLOR){let s=t.color!==void 0?this.getColor(n):Ie();if(t.map&&t.map.isTexture===!0)i=s.mul(this.getTexture("map"));else i=s}else if(n===M.OPACITY){let s=this.getFloat(n);if(t.alphaMap&&t.alphaMap.isTexture===!0)i=s.mul(this.getTexture("alpha"));else i=s}else if(n===M.SPECULAR_STRENGTH)if(t.specularMap&&t.specularMap.isTexture===!0)i=this.getTexture("specular").r;else i=ae(1);else if(n===M.SPECULAR_INTENSITY){let s=this.getFloat(n);if(t.specularIntensityMap&&t.specularIntensityMap.isTexture===!0)i=s.mul(this.getTexture(n).a);else i=s}else if(n===M.SPECULAR_COLOR){let s=this.getColor(n);if(t.specularColorMap&&t.specularColorMap.isTexture===!0)i=s.mul(this.getTexture(n).rgb);else i=s}else if(n===M.ROUGHNESS){let s=this.getFloat(n);if(t.roughnessMap&&t.roughnessMap.isTexture===!0)i=s.mul(this.getTexture(n).g);else i=s}else if(n===M.METALNESS){let s=this.getFloat(n);if(t.metalnessMap&&t.metalnessMap.isTexture===!0)i=s.mul(this.getTexture(n).b);else i=s}else if(n===M.EMISSIVE){let s=this.getFloat("emissiveIntensity"),r=this.getColor(n).mul(s);if(t.emissiveMap&&t.emissiveMap.isTexture===!0)i=r.mul(this.getTexture(n));else i=r}else if(n===M.NORMAL)if(t.normalMap){if(i=Oh(this.getTexture("normal"),this.getCache("normalScale","vec2")),i.normalMapType=t.normalMapType,t.normalMap.format==Pr||t.normalMap.format==Lo||t.normalMap.format==Po)i.unpackNormalMode=Dr}else if(t.bumpMap)i=YM(this.getTexture("bump").r,this.getFloat("bumpScale"));else i=gt;else if(n===M.CLEARCOAT){let s=this.getFloat(n);if(t.clearcoatMap&&t.clearcoatMap.isTexture===!0)i=s.mul(this.getTexture(n).r);else i=s}else if(n===M.CLEARCOAT_ROUGHNESS){let s=this.getFloat(n);if(t.clearcoatRoughnessMap&&t.clearcoatRoughnessMap.isTexture===!0)i=s.mul(this.getTexture(n).r);else i=s}else if(n===M.CLEARCOAT_NORMAL)if(t.clearcoatNormalMap)i=Oh(this.getTexture(n),this.getCache(n+"Scale","vec2"));else i=gt;else if(n===M.SHEEN){let s=this.getColor("sheenColor").mul(this.getFloat("sheen"));if(t.sheenColorMap&&t.sheenColorMap.isTexture===!0)i=s.mul(this.getTexture("sheenColor").rgb);else i=s}else if(n===M.SHEEN_ROUGHNESS){let s=this.getFloat(n);if(t.sheenRoughnessMap&&t.sheenRoughnessMap.isTexture===!0)i=s.mul(this.getTexture(n).a);else i=s;i=i.clamp(0.0001,1)}else if(n===M.ANISOTROPY)if(t.anisotropyMap&&t.anisotropyMap.isTexture===!0){let s=this.getTexture(n);i=ed(Vs.x,Vs.y,Vs.y.negate(),Vs.x).mul(s.rg.mul(2).sub(Jn(1)).normalize().mul(s.b))}else i=Vs;else if(n===M.IRIDESCENCE_THICKNESS){let s=Dh("1","float",t.iridescenceThicknessRange);if(t.iridescenceThicknessMap){let r=Dh("0","float",t.iridescenceThicknessRange);i=s.sub(r).mul(this.getTexture(n).g).add(r)}else i=s}else if(n===M.TRANSMISSION){let s=this.getFloat(n);if(t.transmissionMap)i=s.mul(this.getTexture(n).r);else i=s}else if(n===M.THICKNESS){let s=this.getFloat(n);if(t.thicknessMap)i=s.mul(this.getTexture(n).g);else i=s}else if(n===M.IOR)i=this.getFloat(n);else if(n===M.LIGHT_MAP)if(t.lightMap)i=this.getTexture(n).rgb.mul(this.getFloat("lightMapIntensity"));else i=Ie(0);else if(n===M.AO)if(t.aoMap)i=this.getTexture(n).r.sub(1).mul(this.getFloat("aoMapIntensity")).add(1);else i=ae(1);else if(n===M.LINE_DASH_OFFSET)i=t.dashOffset?this.getFloat(n):ae(0);else{let s=this.getNodeType(e);i=this.getCache(n,s)}return i}}M.ALPHA_TEST="alphaTest";M.COLOR="color";M.OPACITY="opacity";M.SHININESS="shininess";M.SPECULAR="specular";M.SPECULAR_STRENGTH="specularStrength";M.SPECULAR_INTENSITY="specularIntensity";M.SPECULAR_COLOR="specularColor";M.REFLECTIVITY="reflectivity";M.ROUGHNESS="roughness";M.METALNESS="metalness";M.NORMAL="normal";M.CLEARCOAT="clearcoat";M.CLEARCOAT_ROUGHNESS="clearcoatRoughness";M.CLEARCOAT_NORMAL="clearcoatNormal";M.EMISSIVE="emissive";M.ROTATION="rotation";M.SHEEN="sheen";M.SHEEN_ROUGHNESS="sheenRoughness";M.ANISOTROPY="anisotropy";M.IRIDESCENCE="iridescence";M.IRIDESCENCE_IOR="iridescenceIOR";M.IRIDESCENCE_THICKNESS="iridescenceThickness";M.IOR="ior";M.TRANSMISSION="transmission";M.THICKNESS="thickness";M.ATTENUATION_DISTANCE="attenuationDistance";M.ATTENUATION_COLOR="attenuationColor";M.LINE_SCALE="scale";M.LINE_DASH_SIZE="dashSize";M.LINE_GAP_SIZE="gapSize";M.LINE_WIDTH="linewidth";M.LINE_DASH_OFFSET="dashOffset";M.POINT_SIZE="size";M.DISPERSION="dispersion";M.RETROREFLECTIVITY="retroreflectivity";M.LIGHT_MAP="light";M.AO="ao";var oI=k(M,M.ALPHA_TEST),lI=k(M,M.COLOR),cI=k(M,M.SHININESS),uI=k(M,M.EMISSIVE),hI=k(M,M.OPACITY),dI=k(M,M.SPECULAR),fI=k(M,M.SPECULAR_INTENSITY),pI=k(M,M.SPECULAR_COLOR),mI=k(M,M.SPECULAR_STRENGTH),gI=k(M,M.REFLECTIVITY),_I=k(M,M.ROUGHNESS),xI=k(M,M.METALNESS),yI=k(M,M.NORMAL),bI=k(M,M.CLEARCOAT),vI=k(M,M.CLEARCOAT_ROUGHNESS),SI=k(M,M.CLEARCOAT_NORMAL),TI=k(M,M.ROTATION),MI=k(M,M.SHEEN),AI=k(M,M.SHEEN_ROUGHNESS),EI=k(M,M.ANISOTROPY),wI=k(M,M.IRIDESCENCE),RI=k(M,M.IRIDESCENCE_IOR),CI=k(M,M.IRIDESCENCE_THICKNESS),II=k(M,M.TRANSMISSION),NI=k(M,M.THICKNESS),PI=k(M,M.IOR),LI=k(M,M.ATTENUATION_DISTANCE),FI=k(M,M.ATTENUATION_COLOR),KM=k(M,M.LINE_SCALE),ZM=k(M,M.LINE_DASH_SIZE),jM=k(M,M.LINE_GAP_SIZE),Ol=k(M,M.LINE_WIDTH),QM=k(M,M.LINE_DASH_OFFSET),DI=k(M,M.POINT_SIZE),UI=k(M,M.DISPERSION),BI=k(M,M.RETROREFLECTIVITY),OI=k(M,M.LIGHT_MAP),kI=k(M,M.AO),Vs=$e(new Ue).onReference(function(e){return e.material}).onRenderUpdate(function({material:e}){this.value.set(e.anisotropy*Math.cos(e.anisotropyRotation),e.anisotropy*Math.sin(e.anisotropyRotation))});class He extends G{static get type(){return"EventNode"}constructor(e,t){super("void");if(this.eventType=e,this.callback=t,e===He.OBJECT)this.updateType=le.OBJECT;else if(e===He.MATERIAL)this.updateType=le.RENDER;else if(e===He.FRAME)this.updateType=le.FRAME;else if(e===He.AFTER_OBJECT)this.updateAfterType=le.OBJECT;else if(e===He.BEFORE_OBJECT)this.updateBeforeType=le.OBJECT;else if(e===He.BEFORE_MATERIAL)this.updateBeforeType=le.RENDER;else if(e===He.BEFORE_FRAME)this.updateBeforeType=le.FRAME}setup(e){let{eventType:t,callback:n}=this;if(t===He.BEFORE_RENDER_PIPELINE){let i=e.context.onBeforePipelineCallbacks;if(i)i.push(n)}else if(t===He.AFTER_RENDER_PIPELINE){let i=e.context.onAfterPipelineCallbacks;if(i)i.push(n)}return super.setup(e)}update(e){this.callback(e)}updateBefore(e){this.callback(e)}updateAfter(e){this.callback(e)}}He.OBJECT="object";He.MATERIAL="material";He.FRAME="frame";He.AFTER_OBJECT="afterObject";He.BEFORE_OBJECT="beforeObject";He.BEFORE_MATERIAL="beforeMaterial";He.BEFORE_FRAME="beforeFrame";He.BEFORE_RENDER_PIPELINE="beforeRenderPipeline";He.AFTER_RENDER_PIPELINE="afterRenderPipeline";class cf extends G{static get type(){return"LoopNode"}constructor(e=[]){super("void");this.params=e}getVarName(e){return String.fromCharCode(105+e)}getProperties(e){let t=e.getNodeProperties(this);if(t.stackNode!==void 0)return t;let n={},i=this._getInternalParams();for(let o=0,l=i.length-1;o<l;o++){let c=i[o],u=c.isNode!==!0&&c.name||this.getVarName(o),h=c.isNode!==!0&&c.type||"int";n[u]=Ln(u,h)}let s=e.addStack(),r=i[i.length-1](n);t.returnsNode=r.context({nodeLoop:r}),t.stackNode=s;let a=i[0];if(a.isNode!==!0&&typeof a.update==="function"){let o=q(a.update)(n);t.updateNode=o.context({nodeLoop:o})}return e.removeStack(),t}_getInternalParams(){let e=this.params;if(typeof e[0]==="function")return[va(!0),e[0]];return e}setup(e){if(this.getProperties(e),e.fnCall){let t=e.getDataFromNode(e.fnCall.shaderNode);t.hasLoop=!0}}generate(e){let t=this.getProperties(e),n=this._getInternalParams(),i=t.stackNode;for(let r=0,a=n.length-1;r<a;r++){let o=n[r],l=!1,c=null,u=null,h=null,d=null,f=null,p=null;if(o.isNode)if(o.getNodeType(e)==="bool")l=!0,d="bool",u=o.build(e,d);else d="int",h=this.getVarName(r),c="0",u=o.build(e,d),f="<";else{if(d=o.type||"int",h=o.name||this.getVarName(r),c=o.start,u=o.end,f=o.condition,p=o.update,typeof c==="number")c=e.generateConst(d,c);else if(c&&c.isNode)c=c.build(e,d);if(typeof u==="number")u=e.generateConst(d,u);else if(u&&u.isNode)u=u.build(e,d);if(c!==void 0&&u===void 0)c=c+" - 1",u="0",f=">=";else if(u!==void 0&&c===void 0)c="0",f="<";if(f===void 0)if(Number(c)>Number(u))f=">=";else f="<"}let m;if(l)m=`while ( ${u} )`;else{let g={start:c,end:u},{start:_,end:x}=g,b,S=()=>f.includes("<")?"+=":"-=";if(p!==void 0&&p!==null)switch(typeof p){case"function":b=e.flowStagesNode(t.updateNode,"void").code.replace(/\t|;/g,"");break;case"number":b=h+" "+S()+" "+e.generateConst(d,p);break;case"string":b=h+" "+p;break;default:if(p.isNode)b=h+" "+S()+" "+p.build(e);else Y("TSL: 'Loop( { update: ... } )' is not a function, string or number.",this.stackTrace),b="break /* invalid update */"}else{if(d==="int"||d==="uint")p=f.includes("<")?"++":"--";else p=S()+" 1.";b=h+" "+p}let v=e.getVar(d,h)+" = "+_,A=h+" "+f+" "+x;m=`for ( ${v}; ${A}; ${b} )`}e.addFlowCode((r===0?`
`:"")+e.tab+m+` {

`).addFlowTab()}let s=i.build(e,"void");t.returnsNode.build(e,"void"),e.removeFlowTab().addFlowCode(`
`+e.tab+s);for(let r=0,a=n.length-1;r<a;r++)e.addFlowCode((r===0?"":e.tab)+`}

`).removeFlowTab();e.addFlowTab()}}var Gs=(...e)=>new cf(Bi(e,"int")).toStack();var Zn=new Ue;class uf extends Ea{static get type(){return"ViewportTextureNode"}constructor(e=nc,t=null,n=null){let i=null;if(n===null)i=new Hr,i.minFilter=To,n=i;else i=n;super(n,e,t);this.generateMipmaps=!1,this.defaultFramebuffer=i,this.isOutputTextureNode=!0,this.updateBeforeType=le.RENDER,this._cacheTextures=new WeakMap}getTextureForReference(e=null){let t,n;if(this.referenceNode)t=this.referenceNode.defaultFramebuffer,n=this.referenceNode._cacheTextures;else t=this.defaultFramebuffer,n=this._cacheTextures;if(e===null)return t;if(n.has(e)===!1){let i=t.clone();n.set(e,i)}return n.get(e)}updateReference(e){let t=e.renderer,n=t.getRenderTarget(),i=t.getCanvasTarget(),s=n?n:i;return this.value=this.getTextureForReference(s),this.value}updateBefore(e){let t=e.renderer,n=t.getRenderTarget(),i=t.getCanvasTarget(),s=n?n:i;if(s===null)t.getDrawingBufferSize(Zn);else if(s.getDrawingBufferSize)s.getDrawingBufferSize(Zn);else Zn.set(s.width,s.height);let r=this.getTextureForReference(s);if(r.image.width!==Zn.width||r.image.height!==Zn.height)r.image.width=Zn.width,r.image.height=Zn.height,r.needsUpdate=!0;let a=r.generateMipmaps;r.generateMipmaps=this.generateMipmaps,t.copyFramebufferToTexture(r),r.generateMipmaps=a}clone(){let e=new this.constructor(this.uvNode,this.levelNode,this.value);return e.generateMipmaps=this.generateMipmaps,e}}var El=null;class hf extends uf{static get type(){return"ViewportDepthTextureNode"}constructor(e=nc,t=null,n=null){if(n===null){if(El===null)El=new As;n=El}super(e,t,n)}}var JM=Ke(hf).setParameterLength(0,3);class ut extends G{static get type(){return"ViewportDepthNode"}constructor(e,t=null){super("float");this.scope=e,this.valueNode=t,this.isViewportDepthNode=!0}generate(e){let{scope:t}=this;if(t===ut.DEPTH_BASE)return e.getFragDepth();return super.generate(e)}setup({camera:e}){let{scope:t}=this,n=this.valueNode,i=null;if(t===ut.DEPTH_BASE){if(n!==null)i=df().assign(n)}else if(t===ut.DEPTH)if(e.isPerspectiveCamera)i=e1(ct.z,Os,ks);else i=wl(ct.z,Os,ks);else if(t===ut.LINEAR_DEPTH)if(n!==null)if(e.isPerspectiveCamera){let s=t1(n,Os,ks);i=wl(s,Os,ks)}else i=n;else i=wl(ct.z,Os,ks);return i}}ut.DEPTH_BASE="depthBase";ut.DEPTH="depth";ut.LINEAR_DEPTH="linearDepth";var wl=(e,t,n)=>e.add(t).div(t.sub(n));var e1=(e,t,n)=>t.add(e).mul(n).div(n.sub(t).mul(e));var t1=q(([e,t,n],i)=>{if(i.renderer.reversedDepthBuffer===!0)return t.mul(n).div(t.sub(n).mul(e).sub(t));else return t.mul(n).div(n.sub(t).mul(e).sub(n))});var df=Ke(ut,ut.DEPTH_BASE),n1=k(ut,ut.DEPTH),i1=Ke(ut,ut.LINEAR_DEPTH).setParameterLength(0,1),VI=i1(JM());n1.assign=(e)=>df(e);class Qn extends G{static get type(){return"ClippingNode"}constructor(e=Qn.DEFAULT){super();this.scope=e}setup(e){super.setup(e);let t=e.clippingContext,{intersectionPlanes:n,unionPlanes:i}=t;if(this.hardwareClipping=e.hardwareClipping,this.scope===Qn.ALPHA_TO_COVERAGE)return this.setupAlphaToCoverage(n,i);else if(this.scope===Qn.HARDWARE)return this.setupHardwareClipping(i,e);else return this.setupDefault(n,i)}setupAlphaToCoverage(e,t){return q(()=>{let n=ae().toVar("distanceToPlane"),i=ae().toVar("distanceToGradient"),s=ae(1).toVar("clipOpacity"),r=t.length;if(this.hardwareClipping===!1&&r>0){let o=jt(t).setGroup(We);Gs(r,({i:l})=>{let c=o.element(l);n.assign(ct.dot(c.xyz).negate().add(c.w)),i.assign(n.fwidth().div(2)),s.mulAssign($s(i.negate(),i,n))})}let a=e.length;if(a>0){let o=jt(e).setGroup(We),l=ae(1).toVar("intersectionClipOpacity");Gs(a,({i:c})=>{let u=o.element(c);n.assign(ct.dot(u.xyz).negate().add(u.w)),i.assign(n.fwidth().div(2)),l.mulAssign($s(i.negate(),i,n).oneMinus())}),s.mulAssign(l.oneMinus())}Eh.a.mulAssign(s),Eh.a.equal(0).discard()})()}setupDefault(e,t){return q(()=>{let n=t.length;if(this.hardwareClipping===!1&&n>0){let s=jt(t).setGroup(We);Gs(n,({i:r})=>{let a=s.element(r);ct.dot(a.xyz).greaterThan(a.w).discard()})}let i=e.length;if(i>0){let s=jt(e).setGroup(We),r=va(!0).toVar("clipped");Gs(i,({i:a})=>{let o=s.element(a);r.assign(ct.dot(o.xyz).greaterThan(o.w).and(r))}),r.discard()}})()}setupHardwareClipping(e,t){let n=e.length;return t.enableHardwareClipping(n),q(()=>{let i=jt(e).setGroup(We),s=Ks(t.getClipDistance());Gs(n,({i:r})=>{let a=i.element(r),o=ct.dot(a.xyz).sub(a.w).negate();s.element(r).assign(o)})})()}}Qn.ALPHA_TO_COVERAGE="alphaToCoverage";Qn.DEFAULT="default";Qn.HARDWARE="hardware";var ma=Sa("vec3","worldStart"),kl=Sa("vec3","worldEnd"),ff=Sa("float","lineDistance"),jn=Sa("vec4","worldPos"),Vh=q(({start:e,end:t})=>{let n=Ui.element(2).element(2),i=Ui.element(3).element(2);return n.greaterThan(0).select(i.negate().div(n.add(1)),i.mul(-0.5).div(n)).sub(e.z).div(t.z.sub(e.z))},{start:"vec4",end:"vec4",return:"float"}),s1=q(({p1:e,p2:t,p3:n,p4:i})=>{let s=e.sub(n),r=i.sub(n),a=t.sub(e),o=s.dot(r),l=r.dot(a),c=s.dot(a),u=r.dot(r),d=a.dot(a).mul(u).sub(l.mul(l)),p=o.mul(l).sub(c.mul(u)).div(d).clamp(),m=o.add(l.mul(p)).div(u).clamp();return Jn(p,m)},{p1:"vec3",p2:"vec3",p3:"vec3",p4:"vec3",return:"vec2"}),GI=q(({material:e})=>{let{_useDash:t,_useWorldUnits:n}=e,i=Fn("instanceStart"),s=Fn("instanceEnd"),r=ge(Dl.mul(ge(i,1))).toVar("start"),a=ge(Dl.mul(ge(s,1))).toVar("end"),o,l;if(t)o=ae(Fn("instanceDistanceStart")).toVar("distanceStart"),l=ae(Fn("instanceDistanceEnd")).toVar("distanceEnd");if(n)ma.assign(r.xyz),kl.assign(a.xyz);let c=Hs.z.div(Hs.w),u=Ui.element(2).element(3).equal(-1);if(Di(u,()=>{Di(r.z.lessThan(0).and(a.z.greaterThan(0)),()=>{let _=Vh({start:r,end:a});if(a.assign(ge(Pn(r.xyz,a.xyz,_),a.w)),t)l.assign(Pn(o,l,_))}).ElseIf(a.z.lessThan(0).and(r.z.greaterThanEqual(0)),()=>{let _=Vh({start:a,end:r});if(r.assign(ge(Pn(a.xyz,r.xyz,_),r.w)),t)o.assign(Pn(l,o,_))})}),t){let _=e.dashScaleNode?ae(e.dashScaleNode):KM,x=e.offsetNode?ae(e.offsetNode):QM,b=Dt.y.lessThan(0.5).select(_.mul(o),_.mul(l));b=b.add(x),ff.assign(b)}let h=Ui.mul(r),d=Ui.mul(a),f=h.xyz.div(h.w),p=d.xyz.div(d.w),m=p.xy.sub(f.xy).toVar();m.x.assign(m.x.mul(c)),m.assign(m.normalize());let g=ge().toVar();if(n){let _=a.xyz.sub(r.xyz).normalize(),x=Pn(r.xyz,a.xyz,0.5).normalize(),b=_.cross(x).normalize(),S=_.cross(b);jn.assign(Dt.y.lessThan(0.5).select(r,a));let v=Ol.mul(0.5);if(jn.addAssign(ge(Dt.x.lessThan(0).select(b.mul(v),b.mul(v).negate()),0)),!t)jn.addAssign(ge(Dt.y.lessThan(0.5).select(_.mul(v).negate(),_.mul(v)),0)),jn.addAssign(ge(S.mul(v),0)),Di(Dt.y.greaterThan(1).or(Dt.y.lessThan(0)),()=>{jn.subAssign(ge(S.mul(2).mul(v),0))});g.assign(Ui.mul(jn));let A=Ie().toVar();A.assign(Dt.y.lessThan(0.5).select(f,p)),g.z.assign(A.z.mul(g.w))}else{let _=Jn(m.y,m.x.negate()).toVar("offset");m.x.assign(m.x.div(c)),_.x.assign(_.x.div(c)),_.assign(Dt.x.lessThan(0).select(_.negate(),_)),Di(Dt.y.lessThan(0),()=>{_.assign(_.sub(m))}).ElseIf(Dt.y.greaterThan(1),()=>{_.assign(_.add(m))}),_.assign(_.mul(Ol)),_.assign(_.div(Hs.w.div(mM))),g.assign(Dt.y.lessThan(0.5).select(h,d)),_.assign(_.mul(g.w)),g.assign(g.add(ge(_,0,0)))}return g})(),zI=q(({material:e,renderer:t})=>{let{_useAlphaToCoverage:n,_useDash:i,_useWorldUnits:s}=e,r=Aa();if(i){let o=e.dashSizeNode?ae(e.dashSizeNode):ZM,l=e.gapSizeNode?ae(e.gapSizeNode):jM;bl.assign(o),wh.assign(l),r.y.lessThan(-1).or(r.y.greaterThan(1)).discard(),ff.mod(bl.add(wh)).greaterThan(bl).discard()}let a=ae(1).toVar("alpha");if(s){let o=jn.xyz.normalize().mul(1e5),l=kl.sub(ma),c=s1({p1:ma,p2:kl,p3:Ie(0,0,0),p4:o}),u=ma.add(l.mul(c.x)),h=o.mul(c.y),p=u.sub(h).length().div(Ol);if(!i)if(n&&t.currentSamples>0){let m=p.fwidth();a.assign($s(m.negate().add(0.5),m.add(0.5),p).oneMinus())}else p.greaterThan(0.5).discard()}else if(n&&t.currentSamples>0){let o=r.x,l=r.y.greaterThan(0).select(r.y.sub(1),r.y.add(1)),c=o.mul(o).add(l.mul(l)),u=ae(c.fwidth()).toVar("dlen");Di(r.y.abs().greaterThan(1),()=>{a.assign($s(u.oneMinus(),u.add(1),c).oneMinus())})}else Di(r.y.abs().greaterThan(1),()=>{let o=r.x,l=r.y.greaterThan(0).select(r.y.sub(1),r.y.add(1));o.mul(o).add(l.mul(l)).greaterThan(1).discard()});return a})();var HI=ae(1/Math.PI);var WI=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);var $I=Ie(0.04),qI=ae(1);var XI=ti("vec3"),YI=ti("vec3"),KI=ti("vec3");class rc extends Zl{static get type(){return"OverrideContextNode"}constructor(e,t=null){super(t,{overrideNodes:e});this.isOverrideContextNode=!0}getFlowContextData(){let e=[];this.traverse((i)=>{if(i.isOverrideContextNode===!0)e.push(i.value.overrideNodes)});let t=new Map(e.flatMap((i)=>Array.from(i.entries()))),n=super.getFlowContextData();return n.overrideNodes=t,n}}function r1(e,t=null,n=null){if(t&&t.isNode){let i=t;t=()=>i}return new rc(new Map([[e,t]]),n)}T("overrideNode",(e,t,n)=>r1(t,n,e));function a1(e,t=null){let n=new Map;for(let[i,s]of e){let r=s!==null?typeof s==="function"?s:()=>s:null;n.set(i,r)}return new rc(n,t)}T("overrideNodes",(e,t)=>a1(t,e));var ZI=new zr,jI=new w,QI=new w,JI=new w,eN=new Re,tN=new w(0,0,-1),nN=new Ht,iN=new w,sN=new w,rN=new Ht,aN=new Ue,o1=new kr,oN=nc.flipX();o1.depthTexture=new As(1,1);var lN=ge(Pl([-1,-1,3]).element(Nh),Pl([3,-1,-1]).element(Nh),0,1);var cN=ei(Ie(1.6605,-0.1246,-0.0182),Ie(-0.5876,1.1329,-0.1006),Ie(-0.0728,-0.0083,1.1187)),uN=ei(Ie(0.6274,0.0691,0.0164),Ie(0.3293,0.9195,0.088),Ie(0.0433,0.0113,0.8956));class be extends G{static get type(){return"CodeNode"}constructor(e="",t=[],n=""){super("code");this.isCodeNode=!0,this.global=!0,this.code=e,this.includes=t,this.language=n}setIncludes(e){return this.includes=e,this}getIncludes(){return this.includes}generate(e){let t=this.getIncludes(e);for(let i of t)i.build(e,"void");let n=e.getCodeFromNode(this,this.getNodeType(e));return n.code=this.code,n.code}serialize(e){super.serialize(e),e.code=this.code,e.language=this.language}deserialize(e){super.deserialize(e),this.code=e.code,this.language=e.language}}var hN=ti("vec3","totalDiffuse"),dN=ti("vec3","totalSpecular"),fN=ti("vec3","outgoingLight");class pf{constructor(e,t,n=null,i="",s=!1){this.type=e,this.name=t,this.count=n,this.qualifier=i,this.isConst=s}}pf.isNodeFunctionInput=!0;class mf{constructor(e,t,n="",i=""){this.type=e,this.inputs=t,this.name=n,this.precision=i}getCode(){Q("Abstract function.")}}mf.isNodeFunction=!0;var pN={[vr]:Hn,[Hn]:vr,[hs]:hs};var mN={textureGather:new be(`
vec4 tsl_textureGather( const int comp, sampler2D map, vec2 coord, ivec2 offset, bool flipY ) {
	if ( flipY ) offset.y = - offset.y;
	vec2 size = vec2( textureSize( map, 0 ) );
	vec2 st = floor( coord * size + vec2( offset ) - 0.5 );
	vec4 ij = vec4( st + 0.5, st + 1.5 ) / size.xyxy;
	vec4 ret = vec4(
		textureLod( map, ij.xw, 0.0 )[ comp ],
		textureLod( map, ij.zw, 0.0 )[ comp ],
		textureLod( map, ij.zy, 0.0 )[ comp ],
		textureLod( map, ij.xy, 0.0 )[ comp ]
	);
	return flipY ? ret.wzyx : ret;
}
`),textureGatherArray:new be(`
vec4 tsl_textureGather_array( const int comp, sampler2DArray map, vec3 coord, ivec2 offset, bool flipY ) {
	if ( flipY ) offset.y = - offset.y;
	vec2 size = vec2( textureSize( map, 0 ).xy );
	vec2 st = floor( coord.xy * size + vec2( offset ) - 0.5 );
	vec4 ij = vec4( st + 0.5, st + 1.5 ) / size.xyxy;
	vec4 ret = vec4(
		textureLod( map, vec3( ij.xw, coord.z ), 0.0 )[ comp ],
		textureLod( map, vec3( ij.zw, coord.z ), 0.0 )[ comp ],
		textureLod( map, vec3( ij.zy, coord.z ), 0.0 )[ comp ],
		textureLod( map, vec3( ij.xy, coord.z ), 0.0 )[ comp ]
	);
	return flipY ? ret.wzyx : ret;
}
`),textureGatherCompare:new be(`
vec4 tsl_textureGatherCompare( sampler2DShadow map, vec2 coord, ivec2 offset, float ref, bool flipY ) {
	if ( flipY ) offset.y = - offset.y;
	vec2 size = vec2( textureSize( map, 0 ) );
	vec2 st = floor( coord * size + vec2( offset ) - 0.5 );
	vec4 ij = vec4( st + 0.5, st + 1.5 ) / size.xyxy;
	vec4 ret = vec4(
		textureLod( map, vec3( ij.xw, ref ), 0.0 ),
		textureLod( map, vec3( ij.zw, ref ), 0.0 ),
		textureLod( map, vec3( ij.zy, ref ), 0.0 ),
		textureLod( map, vec3( ij.xy, ref ), 0.0 )
	);
	return flipY ? ret.wzyx : ret;
}
`),textureGatherCompareArray:new be(`
vec4 tsl_textureGatherCompare_array( sampler2DArrayShadow map, vec3 coord, ivec2 offset, float ref, bool flipY ) {
	if ( flipY ) offset.y = - offset.y;
	vec2 size = vec2( textureSize( map, 0 ).xy );
	vec2 st = floor( coord.xy * size + vec2( offset ) - 0.5 );
	vec4 ij = vec4( st + 0.5, st + 1.5 ) / size.xyxy;
	vec4 ret = vec4(
		texture( map, vec4( ij.xw, coord.z, ref ) ),
		texture( map, vec4( ij.zw, coord.z, ref ) ),
		texture( map, vec4( ij.zy, coord.z, ref ) ),
		texture( map, vec4( ij.xy, coord.z, ref ) )
	);
	return flipY ? ret.wzyx : ret;
}
`),floatpack_snorm_4x8:new be("uint tsl_packSnorm4x8( vec4 v ) { uvec4 u = uvec4( ivec4( round( clamp( v, -1.0, 1.0 ) * 127.0 ) ) & 0xff ); return u.x | u.y << 8 | u.z << 16 | u.w << 24; }"),floatpack_unorm_4x8:new be("uint tsl_packUnorm4x8( vec4 v ) { uvec4 u = uvec4( round( clamp( v, 0.0, 1.0 ) * 255.0 ) ); return u.x | u.y << 8 | u.z << 16 | u.w << 24; }"),floatunpack_snorm_4x8:new be("vec4 tsl_unpackSnorm4x8( uint x ) { return max( vec4( ivec4( x << 24, x << 16, x << 8, x ) >> 24 ) / 127.0, -1.0 ); }"),floatunpack_unorm_4x8:new be("vec4 tsl_unpackUnorm4x8( uint x ) { return vec4( uvec4( x, x >> 8, x >> 16, x >> 24 ) & 0xffu ) / 255.0; }")};var Rl=typeof self<"u"&&self.GPUShaderStage?self.GPUShaderStage:{VERTEX:1,FRAGMENT:2,COMPUTE:4};class ac{constructor(){this.label="",this.layout=null,this.entries=[]}reset(){this.label="",this.layout=null,this.entries.length=0}}class ii{constructor(){this.label="",this.size=0,this.usage=0,this.mappedAtCreation=!1}reset(){this.label="",this.size=0,this.usage=0,this.mappedAtCreation=!1}}class Gi{constructor(){this.label=""}reset(){this.label=""}}class oc{constructor(){this.label="",this.colorFormats=null,this.depthStencilFormat=void 0,this.sampleCount=1,this.depthReadOnly=!1,this.stencilReadOnly=!1}reset(){this.label="",this.colorFormats=null,this.depthStencilFormat=void 0,this.sampleCount=1,this.depthReadOnly=!1,this.stencilReadOnly=!1}}class gf{constructor(){this.view=null,this.depthSlice=void 0,this.resolveTarget=void 0,this.clearValue=void 0,this.loadOp=void 0,this.storeOp=void 0}reset(){this.view=null,this.depthSlice=void 0,this.resolveTarget=void 0,this.clearValue=void 0,this.loadOp=void 0,this.storeOp=void 0}}class _f{constructor(){this.label="",this.colorAttachments=[],this.depthStencilAttachment=void 0,this.occlusionQuerySet=void 0,this.timestampWrites=void 0,this.maxDrawCount=50000000}reset(){this.label="",this.colorAttachments.length=0,this.depthStencilAttachment=void 0,this.occlusionQuerySet=void 0,this.timestampWrites=void 0,this.maxDrawCount=50000000}}class lc{constructor(){this.label="",this.layout=null,this.vertex=null,this.primitive={},this.depthStencil=void 0,this.multisample=new xf,this.fragment=null}reset(){this.label="",this.layout=null,this.vertex=null,this.primitive={},this.depthStencil=void 0,this.multisample.reset(),this.fragment=null}}class xf{constructor(){this.count=1,this.mask=4294967295,this.alphaToCoverageEnabled=!1}reset(){this.count=1,this.mask=4294967295,this.alphaToCoverageEnabled=!1}}class cc{constructor(){this.label="",this.code="",this.compilationHints=[]}reset(){this.label="",this.code="",this.compilationHints.length=0}}class Ca{constructor(){this.label="",this.size={width:0,height:1,depthOrArrayLayers:1},this.mipLevelCount=1,this.sampleCount=1,this.dimension="2d",this.format=void 0,this.usage=void 0,this.viewFormats=[],this.textureBindingViewDimension=void 0}reset(){this.label="",this.size.width=0,this.size.height=1,this.size.depthOrArrayLayers=1,this.mipLevelCount=1,this.sampleCount=1,this.dimension="2d",this.format=void 0,this.usage=void 0,this.viewFormats.length=0,this.textureBindingViewDimension=void 0}}class Ia{constructor(){this.label="",this.format=void 0,this.dimension=void 0,this.usage=0,this.aspect="all",this.baseMipLevel=0,this.mipLevelCount=void 0,this.baseArrayLayer=0,this.arrayLayerCount=void 0,this.swizzle="rgba"}reset(){this.label="",this.format=void 0,this.dimension=void 0,this.usage=0,this.aspect="all",this.baseMipLevel=0,this.mipLevelCount=void 0,this.baseArrayLayer=0,this.arrayLayerCount=void 0,this.swizzle="rgba"}}var gN=new ac,_N=new ii,xN=new Gi,yN=new oc,bN=new _f,vN=new lc,SN=new gf,TN=new cc,MN=new Ca,AN=new Ia;class yf{constructor(){this.label="",this.addressModeU="clamp-to-edge",this.addressModeV="clamp-to-edge",this.addressModeW="clamp-to-edge",this.magFilter="nearest",this.minFilter="nearest",this.mipmapFilter="nearest",this.lodMinClamp=0,this.lodMaxClamp=32,this.compare=void 0,this.maxAnisotropy=1}reset(){this.label="",this.addressModeU="clamp-to-edge",this.addressModeV="clamp-to-edge",this.addressModeW="clamp-to-edge",this.magFilter="nearest",this.minFilter="nearest",this.mipmapFilter="nearest",this.lodMinClamp=0,this.lodMaxClamp=32,this.compare=void 0,this.maxAnisotropy=1}}class Zs{constructor(){this.texture=null,this.mipLevel=0,this.origin={x:0,y:0,z:0},this.aspect="all"}reset(){this.texture=null,this.mipLevel=0,this.origin.x=0,this.origin.y=0,this.origin.z=0,this.aspect="all"}}class bf{constructor(){this.buffer=null,this.offset=0,this.bytesPerRow=void 0,this.rowsPerImage=void 0}reset(){this.buffer=null,this.offset=0,this.bytesPerRow=void 0,this.rowsPerImage=void 0}}class vf{constructor(){this.offset=0,this.bytesPerRow=void 0,this.rowsPerImage=void 0}reset(){this.offset=0,this.bytesPerRow=void 0,this.rowsPerImage=void 0}}class Sf{constructor(){this.source=null,this.origin={x:0,y:0},this.flipY=!1}reset(){this.source=null,this.origin.x=0,this.origin.y=0,this.flipY=!1}}class Tf extends Zs{constructor(){super();this.colorSpace="srgb",this.premultipliedAlpha=!1}reset(){super.reset(),this.colorSpace="srgb",this.premultipliedAlpha=!1}}class uc{constructor(){this.width=0,this.height=1,this.depthOrArrayLayers=1}reset(){this.width=0,this.height=1,this.depthOrArrayLayers=1}}var EN=new ii,wN=new Gi,RN=new yf,CN=new Zs,IN=new bf,NN=new vf,PN=new Sf,LN=new Tf,FN=new Ca,DN=new uc,UN={[Uo]:"never",[Ur]:"less",[Bo]:"equal",[Br]:"less-equal",[gs]:"greater",[_s]:"greater-equal",[ko]:"always",[Oo]:"not-equal"};var BN={[yl.READ_ONLY]:"read",[yl.WRITE_ONLY]:"write",[yl.READ_WRITE]:"read_write"},ON={[bo]:"repeat",[vo]:"clamp",[So]:"mirror"},kN={vertex:Rl.VERTEX,fragment:Rl.FRAGMENT,compute:Rl.COMPUTE};var VN={tsl_xor:new be("fn tsl_xor( a : bool, b : bool ) -> bool { return ( a || b ) && !( a && b ); }"),mod_float:new be("fn tsl_mod_float( x : f32, y : f32 ) -> f32 { return x - y * floor( x / y ); }"),mod_vec2:new be("fn tsl_mod_vec2( x : vec2f, y : vec2f ) -> vec2f { return x - y * floor( x / y ); }"),mod_vec3:new be("fn tsl_mod_vec3( x : vec3f, y : vec3f ) -> vec3f { return x - y * floor( x / y ); }"),mod_vec4:new be("fn tsl_mod_vec4( x : vec4f, y : vec4f ) -> vec4f { return x - y * floor( x / y ); }"),equals_bool:new be("fn tsl_equals_bool( a : bool, b : bool ) -> bool { return a == b; }"),equals_bvec2:new be("fn tsl_equals_bvec2( a : vec2f, b : vec2f ) -> vec2<bool> { return vec2<bool>( a.x == b.x, a.y == b.y ); }"),equals_bvec3:new be("fn tsl_equals_bvec3( a : vec3f, b : vec3f ) -> vec3<bool> { return vec3<bool>( a.x == b.x, a.y == b.y, a.z == b.z ); }"),equals_bvec4:new be("fn tsl_equals_bvec4( a : vec4f, b : vec4f ) -> vec4<bool> { return vec4<bool>( a.x == b.x, a.y == b.y, a.z == b.z, a.w == b.w ); }"),repeatWrapping_float:new be("fn tsl_repeatWrapping_float( coord: f32 ) -> f32 { return fract( coord ); }"),mirrorWrapping_float:new be("fn tsl_mirrorWrapping_float( coord: f32 ) -> f32 { let mirrored = fract( coord * 0.5 ) * 2.0; return 1.0 - abs( 1.0 - mirrored ); }"),clampWrapping_float:new be("fn tsl_clampWrapping_float( coord: f32 ) -> f32 { return clamp( coord, 0.0, 1.0 ); }"),inverse_mat2:new be(`
fn tsl_inverse_mat2( m : mat2x2<f32> ) -> mat2x2<f32> {

	let det = m[ 0 ][ 0 ] * m[ 1 ][ 1 ] - m[ 0 ][ 1 ] * m[ 1 ][ 0 ];

	return mat2x2<f32>(
		m[ 1 ][ 1 ], - m[ 0 ][ 1 ],
		- m[ 1 ][ 0 ], m[ 0 ][ 0 ]
	) * ( 1.0 / det );

}
`),inverse_mat3:new be(`
fn tsl_inverse_mat3( m : mat3x3<f32> ) -> mat3x3<f32> {

	let a00 = m[ 0 ][ 0 ]; let a01 = m[ 0 ][ 1 ]; let a02 = m[ 0 ][ 2 ];
	let a10 = m[ 1 ][ 0 ]; let a11 = m[ 1 ][ 1 ]; let a12 = m[ 1 ][ 2 ];
	let a20 = m[ 2 ][ 0 ]; let a21 = m[ 2 ][ 1 ]; let a22 = m[ 2 ][ 2 ];

	let b01 = a22 * a11 - a12 * a21;
	let b11 = - a22 * a10 + a12 * a20;
	let b21 = a21 * a10 - a11 * a20;

	let det = a00 * b01 + a01 * b11 + a02 * b21;

	return mat3x3<f32>(
		b01, ( - a22 * a01 + a02 * a21 ), ( a12 * a01 - a02 * a11 ),
		b11, ( a22 * a00 - a02 * a20 ), ( - a12 * a00 + a02 * a10 ),
		b21, ( - a21 * a00 + a01 * a20 ), ( a11 * a00 - a01 * a10 )
	) * ( 1.0 / det );

}
`),inverse_mat4:new be(`
fn tsl_inverse_mat4( m : mat4x4<f32> ) -> mat4x4<f32> {

	let a00 = m[ 0 ][ 0 ]; let a01 = m[ 0 ][ 1 ]; let a02 = m[ 0 ][ 2 ]; let a03 = m[ 0 ][ 3 ];
	let a10 = m[ 1 ][ 0 ]; let a11 = m[ 1 ][ 1 ]; let a12 = m[ 1 ][ 2 ]; let a13 = m[ 1 ][ 3 ];
	let a20 = m[ 2 ][ 0 ]; let a21 = m[ 2 ][ 1 ]; let a22 = m[ 2 ][ 2 ]; let a23 = m[ 2 ][ 3 ];
	let a30 = m[ 3 ][ 0 ]; let a31 = m[ 3 ][ 1 ]; let a32 = m[ 3 ][ 2 ]; let a33 = m[ 3 ][ 3 ];

	let b00 = a00 * a11 - a01 * a10;
	let b01 = a00 * a12 - a02 * a10;
	let b02 = a00 * a13 - a03 * a10;
	let b03 = a01 * a12 - a02 * a11;
	let b04 = a01 * a13 - a03 * a11;
	let b05 = a02 * a13 - a03 * a12;
	let b06 = a20 * a31 - a21 * a30;
	let b07 = a20 * a32 - a22 * a30;
	let b08 = a20 * a33 - a23 * a30;
	let b09 = a21 * a32 - a22 * a31;
	let b10 = a21 * a33 - a23 * a31;
	let b11 = a22 * a33 - a23 * a32;

	let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

	return mat4x4<f32>(
		a11 * b11 - a12 * b10 + a13 * b09,
		a02 * b10 - a01 * b11 - a03 * b09,
		a31 * b05 - a32 * b04 + a33 * b03,
		a22 * b04 - a21 * b05 - a23 * b03,
		a12 * b08 - a10 * b11 - a13 * b07,
		a00 * b11 - a02 * b08 + a03 * b07,
		a32 * b02 - a30 * b05 - a33 * b01,
		a20 * b05 - a22 * b02 + a23 * b01,
		a10 * b10 - a11 * b08 + a13 * b06,
		a01 * b08 - a00 * b10 - a03 * b06,
		a30 * b04 - a31 * b02 + a33 * b00,
		a21 * b02 - a20 * b04 - a23 * b00,
		a11 * b07 - a10 * b09 - a12 * b06,
		a00 * b09 - a01 * b07 + a02 * b06,
		a31 * b01 - a30 * b03 - a32 * b00,
		a20 * b03 - a21 * b01 + a22 * b00
	) * ( 1.0 / det );

}
`),biquadraticTexture:new be(`
fn tsl_biquadraticTexture( map : texture_2d<f32>, coord : vec2f, iRes : vec2u, level : u32 ) -> vec4f {

	let res = vec2f( iRes );

	let uvScaled = coord * res;
	let uvWrapping = ( ( uvScaled % res ) + res ) % res;

	// https://www.shadertoy.com/view/WtyXRy

	let uv = uvWrapping - 0.5;
	let iuv = floor( uv );
	let f = fract( uv );

	let rg1 = textureLoad( map, vec2u( iuv + vec2( 0.5, 0.5 ) ) % iRes, level );
	let rg2 = textureLoad( map, vec2u( iuv + vec2( 1.5, 0.5 ) ) % iRes, level );
	let rg3 = textureLoad( map, vec2u( iuv + vec2( 0.5, 1.5 ) ) % iRes, level );
	let rg4 = textureLoad( map, vec2u( iuv + vec2( 1.5, 1.5 ) ) % iRes, level );

	return mix( mix( rg1, rg2, f.x ), mix( rg3, rg4, f.x ), f.y );

}
`),biquadraticTextureArray:new be(`
fn tsl_biquadraticTexture_array( map : texture_2d_array<f32>, coord : vec2f, iRes : vec2u, layer : u32, level : u32 ) -> vec4f {

	let res = vec2f( iRes );

	let uvScaled = coord * res;
	let uvWrapping = ( ( uvScaled % res ) + res ) % res;

	// https://www.shadertoy.com/view/WtyXRy

	let uv = uvWrapping - 0.5;
	let iuv = floor( uv );
	let f = fract( uv );

	let rg1 = textureLoad( map, vec2u( iuv + vec2( 0.5, 0.5 ) ) % iRes, layer, level );
	let rg2 = textureLoad( map, vec2u( iuv + vec2( 1.5, 0.5 ) ) % iRes, layer, level );
	let rg3 = textureLoad( map, vec2u( iuv + vec2( 0.5, 1.5 ) ) % iRes, layer, level );
	let rg4 = textureLoad( map, vec2u( iuv + vec2( 1.5, 1.5 ) ) % iRes, layer, level );

	return mix( mix( rg1, rg2, f.x ), mix( rg3, rg4, f.x ), f.y );

}
`)};var l1="";if((typeof navigator<"u"&&/Firefox|Deno/g.test(navigator.userAgent))!==!0)l1+=`diagnostic( off, derivative_uniformity );
`;var GN=new ii,zN=new Gi,c1=new Map([[Int8Array,["sint8","snorm8"]],[Uint8Array,["uint8","unorm8"]],[Int16Array,["sint16","snorm16"]],[Uint16Array,["uint16","unorm16"]],[Int32Array,["sint32"]],[Uint32Array,["uint32"]],[Float32Array,["float32"]]]);if(typeof Float16Array<"u")c1.set(Float16Array,["float16"]);var HN=new ac,WN=new ii,$N=new Ia;class Mf{constructor(){this.label="",this.layout=null,this.compute=null}reset(){this.label="",this.layout=null,this.compute=null}}class Af{constructor(){this.label="",this.bindGroupLayouts=null}reset(){this.label="",this.bindGroupLayouts=null}}var qN=new Mf,XN=new Af,YN=new oc,KN=new lc;class hc{constructor(){this.label="",this.type=void 0,this.count=0}reset(){this.label="",this.type=void 0,this.count=0}}var ZN=new ii,jN=new Gi,QN=new hc;class Ef{constructor(){this.label="",this.timestampWrites=void 0}reset(){this.label="",this.timestampWrites=void 0}}class wf{constructor(){this.querySet=null,this.beginningOfPassWriteIndex=void 0,this.endOfPassWriteIndex=void 0}reset(){this.querySet=null,this.beginningOfPassWriteIndex=void 0,this.endOfPassWriteIndex=void 0}}var JN=new ii,eP=new Gi,tP=new Ef,nP=new hc,iP=new cc,sP=new wf,rP=new Zs,aP=new Zs,oP=new Ca,lP=new Ia,cP=new uc;var Rf=[0.28,0.86,-0.43];var u1={sand:"#5d5849",sandWet:"#3f3c33",grass:"#2d4529",grassLight:"#365231",grassDeep:"#243a22",forestFloor:"#1f331d",rock:"#363a37",rockLight:"#464b47",rockDark:"#2a2d2b",snow:"#6c7471",seabed:"#2b302c",treeLight:"#22381f",treeMid:"#1d3220",treeDeep:"#16281a",trunk:"#221d19",palmLeaf:"#24391f",shallow:"#3a4d48",water:"#2e3b38",deep:"#1f2b2a",foam:"#b8c4c0",zenith:"#1c2725",horizon:"#303b38",offWhite:"#7d8380",concrete:"#6b6f6c",paving:"#5e6260",pavingDark:"#4c504e",marking:"#b8bdb9",glass:"#2c3438",roof:"#5a5f5c",sunLight:"#aebdbb",hemiSky:"#5a6865",hemiGround:"#131a19"};function h1(e){let t=parseInt(e.slice(1),16),n=(i)=>{let s=i/255;return Math.round((s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4))*255)};return[n(t>>16&255),n(t>>8&255),n(t&255)]}var hP=Object.fromEntries(Object.entries(u1).map(([e,t])=>[e,h1(t)]));var d1=new w(...Rf).normalize();var Cf={"astra-interceptor":{file:"astra-interceptor",pivots:[],stores:[],spinners:[],afterburners:[],anchors:[{key:"gun",node:"gun_muzzle"}],placeholder:{length:17.15,span:12,heli:!1},shadow:[12,17.15]},"astra-trainer":{file:"astra-trainer",pivots:["propeller"],stores:[],afterburners:[],spinners:[{name:"propeller",axis:"z",speed:40,driver:"engine"}],anchors:[{key:"gun",node:"gun_muzzle"}],placeholder:{length:9.55,span:11.2,heli:!1},shadow:[11.2,9.55]},fighter:{file:"fa18",pivots:["gear","pilot_1","pilot_2","targeting_pod_head","afterburner_L","afterburner_R","missile_L1","missile_L2","missile_R1","missile_R2","wingtip_missile_L","wingtip_missile_R"],stores:[{weapons:[[0,1]],order:["missile_L2","missile_R2","wingtip_missile_L","wingtip_missile_R"]},{weapons:[[1,0],[1,1]],order:["missile_L1","missile_R1"]}],spinners:[],afterburners:[{name:"afterburner_L",axis:"y",cone:{dir:"y",sign:-1,length:1.5}},{name:"afterburner_R",axis:"y",cone:{dir:"y",sign:-1,length:1.5}}],ballPod:{name:"targeting_pod_head",seat:1,maxUp:0.15},anchors:[{key:"gun",node:"gun_muzzle"},{key:"afterburner_L",node:"afterburner_L"},{key:"afterburner_R",node:"afterburner_R"},{key:"targeting_pod_head",node:"targeting_pod_head"}],placeholder:{length:17.5,span:13,heli:!1},shadow:[14,18]},apache:{file:"apache",pivots:["main_rotor","tail_rotor","turret_chin","turret_chin_pitch","pilot_1","pilot_2","gear","hellfire_L1","hellfire_L2","hellfire_L3","hellfire_L4","hellfire_R1","hellfire_R2","hellfire_R3","hellfire_R4"],stores:[{weapons:[[1,1]],order:["hellfire_L4","hellfire_R4","hellfire_L3","hellfire_R3","hellfire_L2","hellfire_R2","hellfire_L1","hellfire_R1"]}],spinners:[{name:"main_rotor",axis:"y",speed:-30,driver:"rotor"},{name:"tail_rotor",axis:"x",speed:70,driver:"rotor"}],afterburners:[],turret:{yaw:"turret_chin",pitch:"turret_chin_pitch",seat:1,yawMax:1.92,pitchMin:-1.05,pitchMax:0.19},anchors:[{key:"gun",node:"turret_chin_barrel",tip:!0},{key:"turret_chin_barrel",node:"turret_chin_barrel",tip:!0},{key:"rocket_pod_L",node:"rocket_pod_L",tip:!0},{key:"rocket_pod_R",node:"rocket_pod_R",tip:!0},{key:"exhaust_L",node:"exhaust_L"},{key:"exhaust_R",node:"exhaust_R"},{key:"main_rotor",node:"main_rotor"}],placeholder:{length:16,span:5.2,heli:!0},shadow:[13,16]},warthog:{file:"a10",pivots:["gau8_barrels","engine_fan_L","engine_fan_R","pilot_1","pilot_2","gear","missile_L1","missile_R1","targeting_pod_head"],attach:{targeting_pod_window:"targeting_pod_head"},stores:[{weapons:[[1,0],[1,1]],order:["missile_R1","missile_L1"]}],spinners:[{name:"gau8_barrels",axis:"z",speed:45,driver:"gun"},{name:"engine_fan_L",axis:"z",speed:40,driver:"engine"},{name:"engine_fan_R",axis:"z",speed:-40,driver:"engine"}],afterburners:[],rollPod:{name:"targeting_pod_head",seat:1},anchors:[{key:"gun",node:"gau8_barrels",tip:!0},{key:"exhaust_L",node:"engine_exhaust_cone_L"},{key:"exhaust_R",node:"engine_exhaust_cone_R"},{key:"rocket_pod_L",node:"rocket_pod_L1",tip:!0},{key:"rocket_pod_R",node:"rocket_pod_R1",tip:!0},{key:"flares_L",node:"flares_L"},{key:"flares_R",node:"flares_R"},{key:"targeting_pod_head",node:"targeting_pod_head"}],placeholder:{length:16.3,span:17.5,heli:!1},shadow:[18.5,16.5]},blackbird:{file:"yf12",pivots:["afterburner_L","afterburner_R","fin_L","fin_R","missile_1","missile_2","missile_3","pilot_1","pilot_2","gear"],stores:[{weapons:[[0,0],[0,1]],order:["missile_3","missile_2","missile_1"]}],spinners:[],afterburners:[{name:"afterburner_L",axis:"z",cone:{dir:"z",sign:1,length:2.4}},{name:"afterburner_R",axis:"z",cone:{dir:"z",sign:1,length:2.4}}],rudders:{names:["fin_L","fin_R"],gain:-0.9,max:0.4},anchors:[{key:"gun",node:"pitot_tube"},{key:"afterburner_L",node:"afterburner_L"},{key:"afterburner_R",node:"afterburner_R"},{key:"missile_bay_L",node:"missile_bay_L"},{key:"missile_bay_R",node:"missile_bay_R"}],placeholder:{length:31,span:17,heli:!1},shadow:[17,30]},bomber:{file:"b2",pivots:["pilot_1","pilot_2","gear","bomb_bay_doors_L","bomb_bay_doors_R","bomb_1","bomb_2","bomb_3","bomb_4","bomb_5","bomb_6","bomb_7","bomb_8"],stores:[{weapons:[[1,0]],order:["bomb_8","bomb_7","bomb_6","bomb_5","bomb_4","bomb_3","bomb_2","bomb_1"]}],spinners:[],afterburners:[],doors:{names:[["bomb_bay_doors_L",1.45],["bomb_bay_doors_R",-1.45]],axis:"z",seat:1},anchors:[{key:"gun",node:"b2",tip:!0},{key:"exhaust_L",node:"exhaust_1"},{key:"exhaust_R",node:"exhaust_4"},{key:"bomb_bay",node:"bombs"}],placeholder:{length:21,span:52,heli:!1},shadow:[52,21]}};var PP=import.meta.env?.BASE_URL??"/";var LP=new w,FP=new ve,DP=new ve,UP=new ve,BP=new w,OP=new w(0,0,-1),kP={x:new w(1,0,0),y:new w(0,1,0),z:new w(0,0,1)},VP=new ve;var GP=55*Math.PI/180;var zP=new w,HP=new w,WP=new w,$P=new w,qP=new Re,XP=new Re;var zi={teams:2,bots:0,maxPerTeam:10,scoreLimit:50,timeLimit:600,listed:!0,name:"Open Skies"};var dc=5;var If=60,_e=0.016666666666666666,Nf=20;var mn={aim:null,throttle:0,roll:0,yaw:0,pitch:0,boost:!1,brake:!1},Ye=9.81,se=Math.PI/180,f1=10,Pf=1.3,p1=2.2,m1=25,g1=1.5,_1=1.25,x1=6,y1=0.45,b1=0.7,Na=0.5,fc={fighter:{thrust:20,throttleRate:0.7,cornerSpeed:92,cornerRate:1.1,minRateFrac:0.35,pushFrac:0.6,rollRate:4,yawRate:0.44,rollRef:70,yawTurnRate:0.96,yawBank:30*se,pitchResponse:11,rollResponse:15,yawResponse:8,pitchGain:2.8,rollGain:4,yawGain:1.8,grip:8,induced:0.035,pathGravity:0.5,airbrake:3.5,wheelBrake:10,sideLift:0.6,bankTurn:0.5,maxGroundPitch:13*se,gearHeight:2,bellyHeight:1},warthog:{thrust:11,throttleRate:0.55,cornerSpeed:70,cornerRate:1,minRateFrac:0.4,pushFrac:0.6,rollRate:2.6,yawRate:0.44,rollRef:50,yawTurnRate:0.79,yawBank:28*se,pitchResponse:8,rollResponse:11,yawResponse:7,pitchGain:2.2,rollGain:3,yawGain:1.7,grip:8,induced:0.04,pathGravity:0.85,airbrake:3.5,wheelBrake:9,sideLift:0.65,bankTurn:0.5,maxGroundPitch:12*se,gearHeight:2,bellyHeight:1},blackbird:{thrust:28,throttleRate:0.5,cornerSpeed:140,cornerRate:0.46,minRateFrac:0.35,pushFrac:0.5,rollRate:1.9,yawRate:0.26,rollRef:170,yawTurnRate:0.44,yawBank:22*se,pitchResponse:6,rollResponse:8,yawResponse:5,pitchGain:1.5,rollGain:2,yawGain:0.9,grip:7,induced:0.06,pathGravity:0.4,airbrake:3,wheelBrake:9,sideLift:0.5,bankTurn:0.5,maxGroundPitch:12*se,gearHeight:2,bellyHeight:1},bomber:{thrust:9,throttleRate:0.35,cornerSpeed:110,cornerRate:0.23,minRateFrac:0.4,pushFrac:0.5,rollRate:0.8,yawRate:0.09,rollRef:100,yawTurnRate:0.21,yawBank:15*se,pitchResponse:3.5,rollResponse:4.5,yawResponse:3,pitchGain:0.9,rollGain:1.1,yawGain:0.6,grip:6,induced:0.12,pathGravity:0.7,airbrake:2.5,wheelBrake:8,sideLift:0.5,bankTurn:0.5,maxGroundPitch:10*se,gearHeight:2.5,bellyHeight:1.2}},v1={...fc,"astra-interceptor":{...fc.fighter,cornerSpeed:99.36,cornerRate:1.034,rollRate:3.76,yawTurnRate:0.9024,pitchResponse:10.34,rollResponse:14.1,yawResponse:7.52},"astra-trainer":{...fc.fighter,cornerSpeed:82.8,cornerRate:1.188,rollRate:4.32,yawTurnRate:1.0368,pitchResponse:11.88,rollResponse:16.2,yawResponse:8.64}},S1={apache:{collectiveRate:0.8,collectiveReturn:1.5,altitudeHold:1.5,cushion:3,cushionHeight:10,maxTilt:25*se,boostTilt:36*se,backTilt:18*se,sideTilt:22*se,cyclicRate:0.9,driftKill:0.35,tiltGain:4,maxTiltRate:1.6,tiltResponse:9,flipRate:2.2,yawRate:1.7,yawGain:3,yawResponse:7,cyclicGain:1.8,dragQuad:0.001063,dragLin:0.03,dragVert:0.6,grip:0.9,gearHeight:2}},T1={apache:{collectiveRate:1.2,detentWidth:0.1,detentRate:0.3,pitchRate:1.5,rollRate:1.6,yawRate:1.5,cyclicResponse:12,yawResponse:10,strafeGain:4,coordBank:0.8,maxCoordBank:25*se,rightGain:1.6,rightCap:1,rightInverted:0.35,rightUnderInput:0.5,highCollective:0.6,highReturnRate:0.35,cyclicGain:1.3,dragQuad:0.0016,dragLin:0.08,dragVert:0.55,brakeGain:0.6,brakeTilt:30*se,brakeAttitudeGain:3,brakeRecoverRate:3,brakeVertical:1.5,brakeCollectiveRate:0.8,cushion:2,cushionHeight:8,gearHeight:2}},W=(e,t,n)=>e<t?t:e>n?n:e,Mt=(e)=>e>1?1:e<-1?-1:e===e?e:0,pn=(e,t,n)=>{let i=W((n-e)/(t-e),0,1);return i*i*(3-2*i)},Wi=(e)=>{while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;return e};function Qt(e,t,n,i,s,r=!1){let a=r?-t[0]:t[0],o=r?-t[1]:t[1],l=r?-t[2]:t[2],c=t[3],u=2*(o*s-l*i),h=2*(l*n-a*s),d=2*(a*i-o*n);e[0]=n+c*u+(o*d-l*h),e[1]=i+c*h+(l*u-a*d),e[2]=s+c*d+(a*h-o*u)}function pc(e,t,n,i,s){let r=Math.sqrt(t*t+n*n+i*i);if(r<0.000000001)return;let a=r*s*0.5,o=Math.sin(a)/r,l=t*o,c=n*o,u=i*o,h=Math.cos(a),d=e[0],f=e[1],p=e[2],m=e[3],g=m*l+d*h+f*u-p*c,_=m*c-d*u+f*h+p*l,x=m*u+d*c-f*l+p*h,b=m*h-d*l-f*c-p*u,S=1/Math.sqrt(g*g+_*_+x*x+b*b);e[0]=g*S,e[1]=_*S,e[2]=x*S,e[3]=b*S}function Lf(e,t,n,i){let s=Math.cos(t/2),r=Math.sin(t/2),a=Math.cos(n/2),o=Math.sin(n/2),l=Math.cos(-i/2),c=Math.sin(-i/2),u=s*o,h=r*a,d=-r*o,f=s*a;e[0]=u*l+h*c,e[1]=h*l-u*c,e[2]=f*c+d*l,e[3]=f*l-d*c}var ce=[0,0,0],Ve=[0,0,0],fn=[0,0,0],me=[0,0,0],Pe=[0,0,0];function ri(e){Qt(ce,e,0,0,-1),Qt(Ve,e,0,1,0),Qt(fn,e,1,0,0)}function Ff(e,t){let n=K[e].flight==="heli",i=[0,0,0,1];Lf(i,t.yaw,0,0);let s=n?0:K[e].cruise;return{kind:e,position:[t.position[0],t.position[1],t.position[2]],velocity:t.onGround?[0,0,0]:[-Math.sin(t.yaw)*s,0,-Math.cos(t.yaw)*s],orientation:i,angularVelocity:[0,0,0],throttle:n?t.onGround?0.35:0.5:t.onGround?0:1,onGround:t.onGround,gearDown:t.onGround||n,crashed:null,tick:0}}function Df(e,t,n,i){if(e.crashed)return;e.tick++;let s=K[e.kind],r=!1,a=t.aim;if(a){let o=Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]);if(o>0.000001)Pe[0]=a[0]/o,Pe[1]=a[1]/o,Pe[2]=a[2]/o,r=!0}if(s.flight==="heli")if(r)E1(e,t,n,i,S1[e.kind]);else A1(e,t,n,i,T1[e.kind]);else M1(e,t,r,n,i,s,v1[e.kind])}function mc(e,t){return W((t-e)/400,0,1)}function M1(e,t,n,i,s,r,a){let{orientation:o,velocity:l,angularVelocity:c,position:u}=e;e.throttle=W(e.throttle+Mt(t.throttle)*a.throttleRate*i,0,1);let h=Mt(t.roll),d=Mt(t.pitch),f=Mt(t.yaw);ri(o);let p=Math.sqrt(l[0]*l[0]+l[1]*l[1]+l[2]*l[2]),m=l[0]*ce[0]+l[1]*ce[1]+l[2]*ce[2],g=mc(u[1],s.ceiling),_=r.stall,x=pn(0.7*_,_,m)*g,b=a.cornerSpeed,S=W(m/b,0,1),v=a.cornerRate*Math.max(a.minRateFrac,m<=b?S:b/m)*(t.brake&&!e.onGround?_1:1),A=a.yawRate*Math.max(0.3,S),E=a.rollRate*(0.35+0.65*W(m/a.rollRef,0,1)),I=Math.atan2(-fn[1],Ve[1]),F=Math.asin(W(ce[1],-1,1)),U=0,P=0,C=0,B=0;if(e.onGround){let ze=0.25+0.45*(1-W(p/_,0,1));if(f!==0)P=f*ze;else if(n&&Pe[0]*Pe[0]+Pe[2]*Pe[2]>0.000001){let dt=Math.atan2(-ce[0],-ce[2]),vt=Math.atan2(-Pe[0],-Pe[2]);P=W(-Wi(vt-dt)*2,-ze,ze)}let we=0;if(m>0.88*_){if(d!==0)we=Math.max(0,d)*a.maxGroundPitch;else if(n)we=W(Math.asin(W(Pe[1],-1,1)),0,a.maxGroundPitch);if(m>_&&d>=0&&!t.brake&&(e.throttle>0.6||t.boost)&&!(n&&Pe[1]<-0.035))we=Math.max(we,6*se)}U=W((we-F)*3,-0.4,0.4)}else if(n){Qt(me,o,Pe[0],Pe[1],Pe[2],!0);let ze=me[0],we=me[1],dt=-me[2],vt=Math.acos(W(dt,-1,1)),gi=dt<-0.6?(-0.6-dt)*2.5:0,is=pn(25*se,60*se,vt),_i=Math.abs(we),ss=_i+(we-_i)*is+gi,xi=Math.atan2(ze,ss),eo=pn(4*se,20*se,vt),Am=eo*xi+(1-eo)*-I,Em=Math.atan2(we+gi,dt),wm=Math.atan2(ze,Math.max(dt,0.2));if(U=a.pitchGain*Em,C=a.rollGain*Am,P=a.yawGain*wm*(1-eo),d!==0){if(U=d*v,h===0)C=0;P=0}if(f!==0)P=f*A;if(h!==0)C=h*E;U=W(U,-v*a.pushFrac,v),P=W(P,-A,A),C=W(C,-E,E)}else{U=W(d*v*(d<0?0.75:1),-v,v),C=h*E;let ze=Math.abs(I),we=ze<100*se&&Math.cos(F)>0.35;if(f!==0){if(B=f*a.yawTurnRate*Math.max(0.4,Math.min(1,m/(0.7*b))),h===0&&we)C=W(a.rollGain*(f*a.yawBank-I),-E,E)}else if(h===0&&Math.abs(d)<0.05&&we)C=W(-I*g1,-E,E)}let N=U,R=-P,Z=-C;if(!e.onGround){let ze=-a.bankTurn*Ye*Math.sin(I)*Math.max(0,Math.cos(F))*x/Math.max(p,_);if(Qt(me,o,0,ze,0,!0),N+=me[0],R+=me[1],Z+=me[2],B!==0){let dt=Ve[1],vt=pn(0,0.18,Math.abs(dt)),gi=1-vt,is=Ve[0]*gi,_i=(dt<0?-vt:vt)+Ve[1]*gi,ss=Ve[2]*gi,xi=Math.sqrt(is*is+_i*_i+ss*ss);if(xi>0.000001)Qt(me,o,is/xi*-B,_i/xi*-B,ss/xi*-B,!0),N+=me[0],R+=me[1],Z+=me[2]}let we=1-x;if(we>0){Qt(me,o,0,-1,0,!0);let dt=-me[2];if(N+=W(0.8*Math.atan2(me[1],dt),-0.6,0.6)*we,R+=W(0.8*Math.atan2(-me[0],dt),-0.6,0.6)*we,p>5){Qt(me,o,l[0],l[1],l[2],!0);let vt=-me[2];if(vt>0)N+=W(Math.atan2(me[1],vt),-0.5,0.5)*we,R+=W(Math.atan2(-me[0],vt),-0.5,0.5)*we}}}let z=c[2]*i,re=Math.cos(z),V=Math.sin(z),J=c[0],Ge=c[1];c[0]=J*re+Ge*V,c[1]=-J*V+Ge*re,c[0]+=(N-c[0])*(1-Math.exp(-a.pitchResponse*i)),c[1]+=(R-c[1])*(1-Math.exp(-a.yawResponse*i)),c[2]+=(Z-c[2])*(1-Math.exp(-a.rollResponse*i)),pc(o,c[0],c[1],c[2],i),ri(o);let Ae=0.35+0.65*g,Vt=(t.boost?a.thrust*(r.boost/r.cruise)**2:e.throttle*a.thrust)*Ae;if(e.onGround&&!t.brake&&(e.throttle>0.5||t.boost)&&s.groundHeight(u[0],u[2])>f1&&s.onRunway(u[0],u[2])){let ze=s.deckVelocity?.(u[0],u[2]);if((ze?m-(ze[0]*ce[0]+ze[1]*ce[1]+ze[2]*ce[2]):m)<Pf*_)Vt+=Pf*_/p1}let Ji=a.thrust/(r.cruise*r.cruise)*(t.brake?a.airbrake:1),es=Math.sqrt(c[0]*c[0]+c[1]*c[1]),Ja=a.induced*es*es*(a.cornerSpeed*a.cornerSpeed)/(Ye*Ye),vn=p>0.000001?(Ji*p*p+Ja)/p:0,ts=x*Ye*Ve[1],mi=x*Ye*a.sideLift*fn[1],rt=Ye*ce[1]*(1-a.pathGravity)*x,bt=ce[0]*(Vt+rt)-l[0]*vn+Ve[0]*ts+fn[0]*mi,ns=ce[1]*(Vt+rt)-l[1]*vn+Ve[1]*ts+fn[1]*mi-Ye,bm=ce[2]*(Vt+rt)-l[2]*vn+Ve[2]*ts+fn[2]*mi;if(u[1]>s.ceiling)ns-=(u[1]-s.ceiling)*0.3;l[0]+=bt*i,l[1]+=ns*i,l[2]+=bm*i,p=Math.sqrt(l[0]*l[0]+l[1]*l[1]+l[2]*l[2]);let vm=l[0]*ce[0]+l[1]*ce[1]+l[2]*ce[2];if(p>1&&vm>0){let ze=1-Math.exp(-(a.grip+Math.abs(B)*m1)*(0.2+0.8*x)*i);l[0]+=(ce[0]*p-l[0])*ze,l[1]+=(ce[1]*p-l[1])*ze,l[2]+=(ce[2]*p-l[2])*ze;let we=p/Math.sqrt(l[0]*l[0]+l[1]*l[1]+l[2]*l[2]);l[0]*=we,l[1]*=we,l[2]*=we}if(u[1]>s.ceiling+150&&l[1]>0)l[1]=0;u[0]+=l[0]*i,u[1]+=l[1]*i,u[2]+=l[2]*i;let Sm=t.brake?a.wheelBrake:e.throttle<0.05&&!t.boost?x1:0.4,Tm=gc(e,s,!1,a.gearHeight,a.bellyHeight,r.stall,a.maxGroundPitch,Sm,i);if(e.crashed)return;let Kc=u[1]-a.gearHeight-Tm,Mm=Math.sqrt(l[0]*l[0]+l[1]*l[1]+l[2]*l[2]);if(e.onGround)e.gearDown=!0;else if(e.gearDown&&Kc>40)e.gearDown=!1;else if(!e.gearDown&&Kc<25&&Mm<1.4*_)e.gearDown=!0;_c(e,s)}function A1(e,t,n,i,s){let{orientation:r,velocity:a,angularVelocity:o,position:l}=e,c=Mt(t.throttle),u=Mt(t.roll),h=Mt(t.pitch),d=Mt(t.yaw);if(c!==0)e.throttle=W(e.throttle+c*s.collectiveRate*n,0,1);else if(!e.onGround){let R=Na-e.throttle,z=(t.brake?s.brakeCollectiveRate:Math.abs(R)<s.detentWidth?s.detentRate:e.throttle>s.highCollective?s.highReturnRate:0)*n;e.throttle+=R>z?z:R<-z?-z:R}ri(r);let f=Math.asin(W(ce[1],-1,1)),p=Math.atan2(-fn[1],Ve[1]),m=h*s.pitchRate,g=-d*s.yawRate,_=-u*s.rollRate;Qt(me,r,0,1,0,!0);let x=Math.acos(W(me[1],-1,1)),b=me[2],S=-me[0],v=Math.sqrt(b*b+S*S);if(v<0.0001)b=0,S=1,v=1;if(b/=v,S/=v,t.brake&&!e.onGround&&x>s.brakeTilt*1.5){let R=Math.min(s.brakeAttitudeGain*x,s.brakeRecoverRate);if(h===0)m=b*R;if(u===0)_=S*R}else if(t.brake&&!e.onGround){let R=Math.atan2(-ce[0],-ce[2]),Z=a[0]*-Math.sin(R)+a[2]*-Math.cos(R),z=a[0]*Math.cos(R)+a[2]*-Math.sin(R),re=W(Math.atan(Z*s.brakeGain/Ye),-s.brakeTilt,s.brakeTilt),V=W(Math.atan(-z*s.brakeGain/Ye),-s.brakeTilt,s.brakeTilt);if(h===0)m=W(s.brakeAttitudeGain*Wi(re-f),-s.pitchRate,s.pitchRate);if(u===0)_=-W(s.brakeAttitudeGain*Wi(V-p),-s.rollRate,s.rollRate)}else if(!e.onGround){let R=Math.min(s.rightGain*x,s.rightCap)+(s.rightInverted-s.rightCap)*pn(100*se,170*se,x);if(m+=b*R*(1-s.rightUnderInput*Math.abs(h)),_=-u*s.rollRate+S*R*(1-s.rightUnderInput*Math.abs(u)),u===0&&d!==0){let Z=Math.atan2(-ce[0],-ce[2]),z=a[0]*-Math.sin(Z)+a[2]*-Math.cos(Z),re=W(Math.atan(z*d*s.yawRate/Ye)*s.coordBank,-s.maxCoordBank,s.maxCoordBank),V=Math.abs(d)*pn(5,30,z);_+=(-W(s.strafeGain*Wi(re-p),-s.rollRate,s.rollRate)-_)*V}}if(e.onGround&&e.throttle<0.3)g=0;let A=1-Math.exp(-s.cyclicResponse*n);o[0]+=(m-o[0])*A,o[1]+=(g-o[1])*(1-Math.exp(-s.yawResponse*n)),o[2]+=(_-o[2])*A,pc(r,o[0],o[1],o[2],n),ri(r);let E=mc(l[1],i.ceiling),I=Ye*(e.throttle/Na)*E,F=Math.sqrt(a[0]*a[0]+a[2]*a[2]),U=s.dragQuad*F+s.dragLin,P=Ve[0]*I*s.cyclicGain-a[0]*U,C=Ve[1]*I-Ye-a[1]*s.dragVert,B=Ve[2]*I*s.cyclicGain-a[2]*U;if(t.brake)C-=a[1]*s.brakeVertical;let N=l[1]-s.gearHeight-i.groundHeight(l[0],l[2]);if(a[1]<0&&N<s.cushionHeight)C-=a[1]*s.cushion*(1-Math.max(N,0)/s.cushionHeight);if(l[1]>i.ceiling)C-=(l[1]-i.ceiling)*0.3;if(a[0]+=P*n,a[1]+=C*n,a[2]+=B*n,l[1]>i.ceiling+150&&a[1]>0)a[1]=0;if(l[0]+=a[0]*n,l[1]+=a[1]*n,l[2]+=a[2]*n,e.gearDown=!0,gc(e,i,!0,s.gearHeight,s.gearHeight,0,0,0,n),e.crashed)return;_c(e,i)}function E1(e,t,n,i,s){let{orientation:a,velocity:o,angularVelocity:l,position:c}=e,u=Mt(t.throttle);if(u!==0)e.throttle=W(e.throttle+u*s.collectiveRate*n,0,1);else if(!e.onGround){let rt=Na-e.throttle,bt=s.collectiveReturn*n;e.throttle+=rt>bt?bt:rt<-bt?-bt:rt}let h=Mt(t.roll),d=Mt(t.pitch),f=Mt(t.yaw);ri(a);let p=Math.atan2(-ce[0],-ce[2]),m=Math.asin(W(ce[1],-1,1)),g=Math.atan2(-fn[1],Ve[1]),_=-Math.sin(p),x=-Math.cos(p),b=Math.cos(p),S=-Math.sin(p),v=o[0]*_+o[2]*x,A=o[0]*b+o[2]*S,E=0;if(f!==0)E=-f*s.yawRate;else{let rt=Math.sqrt(Pe[0]*Pe[0]+Pe[2]*Pe[2]);if(rt>0.0001){let bt=Wi(Math.atan2(-Pe[0],-Pe[2])-p);E=W(s.yawGain*bt*Math.min(1,rt*3),-s.yawRate,s.yawRate)}}if(e.onGround&&e.throttle<0.3)E=0;let I=t.boost?s.boostTilt:s.maxTilt,F=0,U=0,P=t.brake?1:0,C=1.2,B=0,N=Math.abs(m)<4*se;if(!t.brake&&d===0&&h===0&&!t.boost)P=1-pn(2*se,6*se,Math.abs(Math.asin(W(Pe[1],-1,1)))),C=0.35;let R=W(Math.atan(v*C/(Ye*s.cyclicGain)),-s.maxTilt,s.backTilt),Z=W(Math.atan(-A*C/(Ye*s.cyclicGain)),-s.sideTilt,s.sideTilt);if(F=Math.asin(W(Pe[1],-1,1)),t.boost)F=Math.min(F,-s.boostTilt);if(d!==0)F=d*(d>0?s.backTilt:s.maxTilt);F=F+(R-F)*P,U=Z*P;let z=Math.abs(h)>b1;if(h!==0&&!z)U=W(h/y1,-1,1)*s.sideTilt;else if(h===0)U+=W(-E*v/Ye*0.7,-20*se,20*se)*pn(10,40,v);F=W(F,-I,s.backTilt);let re=W(s.tiltGain*(F-m),-s.maxTiltRate,s.maxTiltRate),V=z?-h*s.flipRate:-W(s.tiltGain*Wi(U-g),-s.maxTiltRate,s.maxTiltRate);Qt(me,a,0,E,0,!0),re+=me[0];let J=me[1];V+=me[2];let Ge=1-Math.exp(-s.tiltResponse*n);l[0]+=(re-l[0])*Ge,l[1]+=(J-l[1])*(1-Math.exp(-s.yawResponse*n)),l[2]+=(V-l[2])*Ge,pc(a,l[0],l[1],l[2],n),ri(a);let Ae=mc(c[1],i.ceiling),Vt=Ye*(e.throttle/Na)*Ae/Math.max(Ve[1],0.6),Ji=Math.sqrt(o[0]*o[0]+o[2]*o[2]),es=s.dragQuad*Ji+s.dragLin+B,Ja=Ve[0]*Vt*s.cyclicGain-o[0]*es,vn=Ve[1]*Vt-Ye-o[1]*s.dragVert,ts=Ve[2]*Vt*s.cyclicGain-o[2]*es;if(t.brake||u===0&&!e.onGround)vn-=o[1]*s.altitudeHold;let mi=c[1]-s.gearHeight-i.groundHeight(c[0],c[2]);if(o[1]<0&&mi<s.cushionHeight)vn-=o[1]*s.cushion*(1-Math.max(mi,0)/s.cushionHeight);if(c[1]>i.ceiling)vn-=(c[1]-i.ceiling)*0.3;if(o[0]+=Ja*n,o[1]+=vn*n,o[2]+=ts*n,h===0&&v>0&&Ji>1){let rt=1-Math.exp(-s.grip*pn(15,50,Ji)*n);if(rt>0){let bt=Math.sqrt(o[0]*o[0]+o[2]*o[2]);o[0]+=(_*bt-o[0])*rt,o[2]+=(x*bt-o[2])*rt;let ns=bt/Math.max(0.000000001,Math.sqrt(o[0]*o[0]+o[2]*o[2]));o[0]*=ns,o[2]*=ns}}if(c[1]>i.ceiling+150&&o[1]>0)o[1]=0;if(c[0]+=o[0]*n,c[1]+=o[1]*n,c[2]+=o[2]*n,e.gearDown=!0,gc(e,i,!0,s.gearHeight,s.gearHeight,0,0,0,n),e.crashed)return;_c(e,i)}function gc(e,t,n,i,s,r,a,o,l){let{position:c,velocity:u,orientation:h,angularVelocity:d}=e,f=t.groundHeight(c[0],c[2]),p=e.gearDown?i:s;if(c[1]-p>f+0.02)return e.onGround=!1,f;let m=t.onRunway(c[0],c[2]),g=!m&&f<=Tt+0.01,_=t.deckVelocity?.(c[0],c[2]),x=_?_[0]:0,b=_?_[1]:0,S=_?_[2]:0;ri(h);let v=b-u[1],A=Math.asin(W(ce[1],-1,1)),E=Math.atan2(-fn[1],Ve[1]),I=Math.sqrt((u[0]-x)**2+(u[2]-S)**2);if(g)e.crashed="water";else if(n){if(v>7.5||Math.abs(E)>35*se||Math.abs(A)>35*se||I>30)e.crashed="terrain"}else if(m){if(!e.gearDown||v>6||Math.abs(E)>25*se||A<-10*se||A>25*se)e.crashed="terrain"}else if(!e.gearDown||v>4||Math.abs(E)>20*se||A<-8*se||I>1.3*r)e.crashed="terrain";if(e.crashed)return c[1]=Math.max(c[1],f),f;if(e.onGround=!0,c[1]=f+i,u[1]<b)u[1]=b;let F=Math.atan2(-ce[0],-ce[2]),U=n?0:W(A,0,a);if(Lf(h,F,U,0),d[2]=0,n||U<=0&&d[0]<0||U>=a&&d[0]>0)d[0]=0;let P=-Math.sin(F),C=-Math.cos(F),B=u[0]-x,N=u[2]-S,R=B*P+N*C,Z=B-P*R,z=N-C*R,re=Math.exp(-(n?4:12)*l);if(Z*=re,z*=re,n){if(R*=Math.exp(-4*l),Math.hypot(R,Z,z)<1)R=Z=z=0}else{let V=(o+(m?0:2))*l;R=R>V?R-V:R<-V?R+V:0}return u[0]=P*R+Z+x,u[2]=C*R+z+S,f}function _c(e,t){let n=e.position;if(n[0]>t.half||n[0]<-t.half||n[2]>t.half||n[2]<-t.half)e.crashed="boundary"}var w1=0.0004,si=0.016666666666666666,R1=60;function xc(e,t,n){let i=Math.sqrt(t[0]*t[0]+t[1]*t[1]+t[2]*t[2]),s=w1*i;t[0]-=t[0]*s*n,t[1]-=(t[1]*s+Ye)*n,t[2]-=t[2]*s*n,e[0]+=t[0]*n,e[1]+=t[1]*n,e[2]+=t[2]*n}var st=[0,0,0],Hi=[0,0,0];function $i(e,t,n,i){st[0]=e[0],st[1]=e[1],st[2]=e[2],Hi[0]=t[0],Hi[1]=t[1],Hi[2]=t[2];for(let s=0;s<R1;s+=si){let r=st[1];xc(st,Hi,si);let a=i?i.groundHeight(st[0],st[2]):0;if(st[1]<=a){let o=r-st[1]>0.000000001?(r-a)/(r-st[1]):1;return n[0]=st[0]-Hi[0]*si*(1-o),n[1]=a,n[2]=st[2]-Hi[2]*si*(1-o),s+si*o}}return n[0]=st[0],n[1]=st[1],n[2]=st[2],-1}var wc=2000,C1=256,I1=256,rp=1.2,ap={fighter:1,apache:1,warthog:0.8,blackbird:1,bomber:1,"astra-interceptor":1,"astra-trainer":1},N1={cannon20:1.35,chaingun30:1.1,gau8:0.8,rockets:1,aim9:1,tvmissile:1,hellfire:1,maverick:1,aim47:1,radarpulse:0,bomb:1},P1=25,Uf=15,L1=0.25,F1=0.5;function ir(e,t){return!!K[e.kind].stealth&&e.spottedUntil<=t}var D1={chaingun30:{apache:1.6,warthog:1.4}},op={aim9:{maxSpeed:650,burn:2,accel:200,coastDecel:35,fuse:6,gimbal:0.8,flareNear:0.8,flareFar:0.9,farDist:600},tvmissile:{maxSpeed:620,burn:2.5,accel:150,coastDecel:30,fuse:6,gimbal:0.8,flareNear:0.6,flareFar:0.7,farDist:800},hellfire:{maxSpeed:420,burn:3,accel:100,coastDecel:20,fuse:4,gimbal:0.9,flareNear:0.75,flareFar:0.85,farDist:800},maverick:{maxSpeed:440,burn:3,accel:100,coastDecel:20,fuse:4,gimbal:0.9,flareNear:0.7,flareFar:0.8,farDist:800},aim47:{maxSpeed:750,burn:4,accel:110,coastDecel:10,fuse:10,gimbal:0.9,flareNear:0.7,flareFar:0.9,farDist:0}},U1={chaingun30:{yaw:110*Math.PI/180,minEl:-85*Math.PI/180,maxEl:12*Math.PI/180}},lp=0.12,B1=0.3,_n=24,Pa={fuselageHalf:1.1,fuselageRadius:0.55,wingHalf:1.1,wingRadius:0.35},qi=800,Bf=0.4,Of=3,cp=4,up=0.3,Rc=15*Math.PI/180,O1=4,k1=120,V1=1,sr=9.81,G1=1.3,z1=1.5,Cc=1000,H1=2.5,kf=3,W1=3.5,Tc="flare:",$1=new Set(["blackbird"]),Vf=5*Math.PI/180,q1=6000,X1=1.5,Y1=2.5,K1=12,Z1=3,j1=10,Q1=8,J1=4000,eA=0.08;function Ic(){return{projectiles:[],missiles:[],flares:[],nextId:1,turrets:Up(),bursts:[],ships:Ap(),shipDamageBy:[0,0,0,0],craters:[],shells:[]}}function hp(e,t){e.spawnedAt=t}function ui(e,t){let n=e.spawnedAt;return n!==void 0&&t-n<Xr}function dp(e){let t=K[e].seatWeapons,n=(s)=>{let r=s?j[s].ammo:0;return{ammo:Number.isFinite(r)?r:-1,readyAt:0,lockTarget:null,lock:0,firedAt:-1e9,regen:0}},i=[t[0].map(n),t[1].map(n)];for(let s=0;s<2;s++)for(let r=0;r<2;r++){let a=t[0][s];if(a&&t[1][r]===a&&j[a].kind==="bomb")i[1][r]=i[0][s]}return i}function tA(e,t){return e.weapons[0][0]===t||e.weapons[0][1]===t}function nA(e){let t=j[e].ammo;return Number.isFinite(t)?t:-1}function fp(e,t){return((j[e].ammo-t-1)%2+2)%2}function Oa(e,t){return e.team!==t.team}function pp(e){return e.kind==="missile_lock"||e.kind==="missile_scanner"}function kt(e,t,n,i,s){let r=e[0],a=e[1],o=e[2],l=e[3],c=2*(a*i-o*n),u=2*(o*t-r*i),h=2*(r*n-a*t);return s[0]=t+l*c+(a*h-o*u),s[1]=n+l*u+(o*c-r*h),s[2]=i+l*h+(r*u-a*c),s}function Mc(e,t,n,i,s){let r=-e[0],a=-e[1],o=-e[2],l=e[3],c=2*(a*i-o*n),u=2*(o*t-r*i),h=2*(r*n-a*t);return s[0]=t+l*c+(a*h-o*u),s[1]=n+l*u+(o*c-r*h),s[2]=i+l*h+(r*u-a*c),s}function er(e){return Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2])}function On(e,t){let n=er(e);if(!(n>0.000000001))return!1;return t[0]=e[0]/n,t[1]=e[1]/n,t[2]=e[2]/n,!0}function Rt(e,t){let n=e[0]-t[0],i=e[1]-t[1],s=e[2]-t[2];return Math.sqrt(n*n+i*i+s*s)}function mp(e,t,n){let i=e[0]*t[0]+e[1]*t[1]+e[2]*t[2];if(i>1)i=1;else if(i<-1)i=-1;if(Math.acos(i)<=n){e[0]=t[0],e[1]=t[1],e[2]=t[2];return}let r=t[0]-e[0]*i,a=t[1]-e[1]*i,o=t[2]-e[2]*i,l=Math.sqrt(r*r+a*a+o*o);if(l<0.000001){if(Math.abs(e[1])<0.9)r=-e[2],a=0,o=e[0];else r=0,a=e[2],o=-e[1];l=Math.sqrt(r*r+a*a+o*o)}let c=Math.cos(n),u=Math.sin(n)/l;e[0]=e[0]*c+r*u,e[1]=e[1]*c+a*u,e[2]=e[2]*c+o*u;let h=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);e[0]/=h,e[1]/=h,e[2]/=h}function Xi(e,t){let n=Math.imul(e^2654435769,2246822507)^Math.imul(t+1663821227,3266489909);return n=Math.imul(n^n>>>16,2146121005),n=Math.imul(n^n>>>15,2221713035),n^=n>>>16,(n>>>0)/4294967296}function gp(e,t,n){if(t<=0)return;let i=t*Math.sqrt(Xi(n,1)),s=2*Math.PI*Xi(n,2),r=0,a=1,o=0;if(Math.abs(e[1])>0.99)r=1,a=0;let l=e[1]*o-e[2]*a,c=e[2]*r-e[0]*o,u=e[0]*a-e[1]*r,h=Math.sqrt(l*l+c*c+u*u);l/=h,c/=h,u/=h;let d=c*e[2]-u*e[1],f=u*e[0]-l*e[2],p=l*e[1]-c*e[0],m=Math.cos(s)*i,g=Math.sin(s)*i;e[0]+=l*m+d*g,e[1]+=c*m+f*g,e[2]+=u*m+p*g;let _=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);e[0]/=_,e[1]/=_,e[2]/=_}function Nc(e,t,n,i,s,r){let a=e[0]-(n[0]-i[0]*s),o=e[1]-(n[1]-i[1]*s),l=e[2]-(n[2]-i[2]*s),c=t[0]-n[0]-a,u=t[1]-n[1]-o,h=t[2]-n[2]-l,d=a*a+o*o+l*l-r*r;if(d<=0)return 0;let f=c*c+u*u+h*h;if(f<0.000000000001)return-1;let p=2*(a*c+o*u+l*h);if(p>=0)return-1;let m=p*p-4*f*d;if(m<0)return-1;let g=(-p-Math.sqrt(m))/(2*f);return g<=1?g:-1}function Pc(e,t,n){let i=D1[e]?.[t.kind]??1,s=t.spottedUntil>n?rp:1;return j[e].damage*N1[e]*ap[t.kind]*i*s}var Gf=[0,0,0];function Lc(e,t,n,i){let s=e.flight.orientation,r=j[t];if(!r.turret&&n&&(r.kind==="gun"||r.kind==="rockets")){if(kt(s,0,0,-1,i),!On(n,Gf))return i;return mp(i,Gf,Rc),i}if(!r.turret||!n||r.kind!=="gun")return kt(s,0,0,-1,i);if(Mc(s,n[0],n[1],n[2],i),!On(i,i))return kt(s,0,0,-1,i);let a=U1[t];if(a){let o=Math.atan2(i[0],-i[2]),l=Math.asin(Math.max(-1,Math.min(1,i[1])));o=Math.max(-a.yaw,Math.min(a.yaw,o)),l=Math.max(a.minEl,Math.min(a.maxEl,l));let c=Math.cos(l);i[0]=Math.sin(o)*c,i[1]=Math.sin(l),i[2]=-Math.cos(o)*c}return kt(s,i[0],i[1],i[2],i)}function _p(e,t,n,i,s=0){let r=K[e.kind].radius,a=j[n],o=e.flight.position;if(a.kind==="gun")if(a.turret)kt(e.flight.orientation,0,-1.6,-r*0.55,i);else kt(e.flight.orientation,0,0,-r*0.8,i);else{let l=s%2===0?-1:1;kt(e.flight.orientation,l*r*0.35,-1,-r*0.1,i)}return i[0]+=o[0],i[1]+=o[1],i[2]+=o[2],i}function zf(e,t,n,i,s,r){let a=i[0]-e[0],o=i[1]-e[1],l=i[2]-e[2],c=s[0]-t[0],u=s[1]-t[1],h=s[2]-t[2],d=c*c+u*u+h*h-n*n,f=2*(a*c+o*u+l*h),p=a*a+o*o+l*l,m;if(Math.abs(d)<0.000000001){if(f>=0)return-1;m=-p/f}else{let g=f*f-4*d*p;if(g<0)return-1;let _=Math.sqrt(g),x=(-f-_)/(2*d),b=(-f+_)/(2*d);if(m=x>0&&b>0?Math.min(x,b):Math.max(x,b),!(m>0))return-1}return r[0]=e[0]+a+c*m,r[1]=e[1]+o+u*m,r[2]=e[2]+l+h*m,m}var xp=[0,0,0];function hi(e,t,n,i){let s=n[0]-e[0],r=n[1]-e[1],a=n[2]-e[2],o=Math.sqrt(s*s+r*r+a*a);if(i.d=o,o<0.000001)return 0;let l=(s*t[0]+r*t[1]+a*t[2])/o;return Math.acos(Math.max(-1,Math.min(1,l)))}var Ct={d:0};function yp(e,t,n,i,s,r){if(!i.alive||i===e||!Oa(e,i))return-1;let a=t.range??2500,o=(t.lockCone??0.3)*s,l=i.flight.position,c=hi(e.flight.position,n,l,Ct);if(Ct.d>a||c>o)return-1;if(ui(i,r))return-1;return c}function bp(e,t,n,i,s){if(t!==0&&j[n].turret&&i&&On(i,s))return s;return kt(e.flight.orientation,0,0,-1,s)}function iA(e,t,n,i,s,r=0){let a=j[n];if(!pp(a))return null;let o=bp(e,t,n,i,xp),l=null,c=1/0;for(let u=0;u<s.length;u++){let h=yp(e,a,o,s[u],1,r);if(h>=0&&h<c)c=h,l=s[u]}return l}function Yi(e,t){for(let n=0;n<e.length;n++)if(e[n].id===t)return e[n];return null}function Ki(e,t,n,i,s){if(!e.alive)return!1;e.alive=!1,e.hp=0;let r=e.flight.position,a={type:"kill",victim:e.id,victimTeam:e.team,killer:n===void 0?e.lastDamagedBy:n,weapon:t,position:[r[0],r[1],r[2]]};if(s!==void 0)a.killerTeam=s;i.push(a);let o=r[1]-In(r[0],r[2])<15;return _t(i,r,K[e.kind].radius*3,o?rr(r):"air"),!0}function ka(e,t,n,i,s,r,a){if(!e.alive||t<=0)return 0;if(ui(e,r))return 0;if(e.hp-=t,e.lastDamagedBy=i,a.push({type:"hit",target:e.id,by:i,weapon:n,damage:t,position:[s[0],s[1],s[2]]}),e.hp<=0)Ki(e,n,i,a);return t}function li(e,t,n,i,s,r,a,o,l,c=1/0,u=1){let h=Math.min(j[t].splash,c);if(h<=0||u<=0)return;for(let d=0;d<a.length;d++){let f=a[d];if(f===r||!f.alive||f.team===i||f.id===s)continue;let p=Math.max(0,Rt(e,f.flight.position)-K[f.kind].radius);if(p>=h)continue;ka(f,Pc(t,f,o)*u*(1-p/h),t,n,e,o,l)}}function rr(e){return oa(e[0],e[2])?"water":"ground"}function _t(e,t,n,i,s=!1){let r={type:"explosion",position:[t[0],t[1],t[2]],size:n,surface:i};if(s)r.kind="flak";e.push(r)}function Hf(e,t){let n=j[e],i=Math.max(0,t)*n.speed;if(i<=qi)return 1;let s=Math.max(n.speed*n.ttl,qi+1);return Math.max(Bf,1-(1-Bf)*(i-qi)/(s-qi))}var ie=[0,0,0],wt=[0,0,0],Wf=[0,0,0];function vp(e,t,n,i,s,r,a){if(!t.alive)return;let o=i.aim&&On(i.aim,Wf)?Wf:null;if(o){let h=t.aim[n];if(h)h[0]=o[0],h[1]=o[1],h[2]=o[2];else t.aim[n]=[o[0],o[1],o[2]]}let l=K[t.kind].seatWeapons[n],c=t.weapons[n];for(let h=0;h<2;h++){let d=l[h];if(d&&c[h]&&pp(j[d]))aA(e,t,n,j[d],c[h],o,s,r,a)}if(i.steerBomb&&o)xA(e,t,n,o,r);if(n===0&&$1.has(t.kind))sA(t,o,s,r,a);if(i.flares)hA(e,t,s,r,a);if(i.ability)fA(t,n,o,s,r,a);let u=ui(t,r);for(let h=0;h<2;h++){if(!(h===0?i.firePrimary:i.fireSecondary))continue;let d=l[h],f=c[h];if(!d||!f)continue;let p=j[d];if(p.kind==="pulse"){Sp(t,n,s,r,a);continue}if(u)continue;if(p.kind==="gun"||p.kind==="rockets")oA(e,t,n,p,f,o,r,a,rA(i));else if(p.kind==="bomb")lA(e,t,n,p,f,r,a);else uA(e,t,n,p,f,r,a)}}function $f(e,t,n,i,s){if(!n.alive||!Oa(e,n))return-1;if((n.spotCooldownUntil??0)>s)return-1;let r=hi(e.flight.position,t,n.flight.position,Ct);if(r>i||Ct.d>q1)return-1;if(Nn(e.flight.position,n.flight.position)!==null)return-1;return r}function Fc(e,t,n,i){t.spottedUntil=Math.max(t.spottedUntil,n),i.push({type:"spotted",by:e.id,team:e.team,target:t.id,until:t.spottedUntil})}function sA(e,t,n,i,s){let r=e.spotProgress??0,a=e.spotCandidate?Yi(n,e.spotCandidate):null,o=!1;if(t)if(a&&$f(e,t,a,Vf*1.2,i)>=0)o=!0;else{let l=null,c=1/0;for(let u=0;u<n.length;u++){let h=$f(e,t,n[u],Vf,i);if(h>=0&&h<c)c=h,l=n[u]}if(l){if(l!==a)r=0;a=l,o=!0}}if(o&&a){if(r+=_e/X1,r>=0.999999999)Fc(e,a,i+K1,s),a.spotCooldownUntil=i+Z1,r=0,a=null}else if(r=Math.max(0,r-Y1*_e),r===0)a=null;e.spotProgress=r,e.spotCandidate=a?a.id:null}function rA(e){let t=e.viewDelay;if(t===void 0||!Number.isFinite(t))return lp;return Math.min(B1,Math.max(0,t))}function aA(e,t,n,i,s,r,a,o,l){let c=bp(t,n,i.id,r,xp),u=null,h=null;if(s.lockTarget)if(s.lockTarget.startsWith(tr)){if(Np(e,t,i,c,s.lockTarget.slice(tr.length))>=0)h=s.lockTarget}else{let m=Yi(a,s.lockTarget);if(m&&yp(t,i,c,m,1,o)>=0)u=m}if(!u&&!h)u=iA(t,n,i.id,r,a,o);if(!u&&!h&&i.kind==="missile_lock"){let m=VA(e,t,i,c);if(m)h=tr+m}let d=u?u.id:h;if(d!==s.lockTarget){if(s.lockTarget&&s.lock>=1)l.push({type:"lock",vehicle:t.id,target:s.lockTarget,locked:!1});s.lockTarget=d,s.lock=0}if(!d)return;let f=s.lock,p=u!==null&&ir(u,o);if(s.lock=Math.min(1,s.lock+_e/(p?Math.max(rh,i.lockTime??1):i.lockTime??1)),s.lock>0.999999999)s.lock=1;if(p&&s.lock>=1)Fc(t,u,o+ah,l);if(f<1&&s.lock>=1)l.push({type:"lock",vehicle:t.id,target:d,locked:!0});else if(f===0||f<0.5&&s.lock>=0.5)l.push({type:"lock",vehicle:t.id,target:d,locked:!1})}function Dc(e,t){return e.seats[t]??e.id}function oA(e,t,n,i,s,r,a,o,l=lp){let c=1/i.rate,u=s.readyAt<a-c;if(s.readyAt<a-_e)s.readyAt=a;let h=t.flight.velocity,d=0;while(s.readyAt<=a+0.000000001&&(s.ammo<0||s.ammo>=1)&&d<8&&e.projectiles.length<wc){let f=e.nextId++;Lc(t,i.id,r,ie),gp(ie,i.spread??0,f);let p=i.kind==="rockets"?fp(i.id,s.ammo-1):0;_p(t,n,i.id,wt,p);let m=h[0]+ie[0]*i.speed,g=h[1]+ie[1]*i.speed,_=h[2]+ie[2]*i.speed,x=a-s.readyAt-_e,b={id:f,weapon:i.id,owner:Dc(t,n),vehicle:t.id,team:t.team,position:[wt[0]+m*x,wt[1]+g*x,wt[2]+_*x],velocity:[m,g,_],age:x,ttl:i.ttl};if(l>0)b.rewind=l;if(e.projectiles.push(b),Uc(s,a),s.readyAt+=c,d++,i.kind==="rockets")o.push({type:"fire",vehicle:t.id,seat:n,weapon:i.id,hardpoint:p})}if(d>0&&i.kind==="gun"&&(u||Math.floor(a*4)!==Math.floor((a-_e)*4)))o.push({type:"fire",vehicle:t.id,seat:n,weapon:i.id})}function lA(e,t,n,i,s,r,a){if(s.readyAt>r||s.ammo>=0&&s.ammo<1||e.projectiles.length>=wc)return;kt(t.flight.orientation,0,-3,0,wt);let o=t.flight.position,l=t.flight.velocity,c=e.nextId++;e.projectiles.push({id:c,weapon:i.id,owner:Dc(t,n),vehicle:t.id,team:t.team,position:[o[0]+wt[0],o[1]+wt[1],o[2]+wt[2]],velocity:[l[0],l[1],l[2]],age:0,ttl:i.ttl});let u=t;if(!u.lastBomb)u.lastBomb=[-1,-1];u.lastBomb[n]=c,Uc(s,r),s.readyAt=r+1/i.rate,a.push({type:"fire",vehicle:t.id,seat:n,weapon:i.id})}function cA(e,t,n,i,s,r,a){let o=j[t.weapon],l=wp(t.weapon);if(i){if(i.team!==t.team)nr(e,i.id,l,t.owner,t.team,n,r,a)}else{let u=lt();for(let h=0;h<u.length;h++){let d=u[h];if(d.team===t.team)continue;let f=xe[d.kind];Ua(d,n,ci);let p=Math.max(0,Math.abs(ci[0])-f.halfWidth),m=Math.max(0,Math.abs(ci[2])-f.halfLength),g=Math.max(0,ci[1]-f.deckHeight),_=Math.hypot(p,g,m);if(_<o.splash)nr(e,d.id,l*F1*(1-_/o.splash),t.owner,t.team,n,r,a)}}let c=i?"ground":rr(n);if(li(n,t.weapon,t.owner,t.team,t.vehicle,null,s,r,a,c==="water"?o.splash*0.6:1/0),_t(a,n,c==="water"?o.splash*0.5:o.splash,c),!i&&c==="ground")Va(e,n,15,a)}function Uc(e,t){let n=e;if(e.ammo>0)e.ammo--;n.firedAt=t,n.regen=0}function uA(e,t,n,i,s,r,a){if(s.readyAt>r||s.ammo>=0&&s.ammo<1||e.missiles.length>=C1)return;if(s.lockTarget&&s.lock<1)return;let o=s.lockTarget&&s.lock>=1?s.lockTarget:null,l=fp(i.id,s.ammo-1);_p(t,n,i.id,wt,l),kt(t.flight.orientation,0,0,-1,ie);let c=t.flight.velocity,u=c[0]+ie[0]*i.speed,h=c[1]+ie[1]*i.speed,d=c[2]+ie[2]*i.speed,f=i.kind==="missile_scanner",p={id:e.nextId++,weapon:i.id,owner:Dc(t,n),vehicle:t.id,team:t.team,position:[wt[0]-u*_e,wt[1]-h*_e,wt[2]-d*_e],velocity:[u,h,d],target:o,steered:f,seat:n,age:-_e,ttl:i.ttl};if(f)p.scanTarget=o,p.scanOff=0;e.missiles.push(p),Uc(s,r),s.readyAt=r+1/i.rate,a.push({type:"fire",vehicle:t.id,seat:n,weapon:i.id,hardpoint:l})}function hA(e,t,n,i,s){if(t.flaresReadyAt>i||t.flareCount<=0)return;t.flareCount--,t.flaresReadyAt=i+H1;let r=t.flight.position,a=t.flight.velocity,o=t.flight.orientation,l=-1;for(let c=0;c<kf&&e.flares.length<I1;c++){let u=e.nextId++;if(l<0)l=u;let h=(c-(kf-1)/2)*18;kt(o,h,-12,8,ie),e.flares.push({id:u,vehicle:t.id,position:[r[0],r[1]-1,r[2]],velocity:[a[0]*0.6+ie[0],a[1]*0.6+ie[1],a[2]*0.6+ie[2]],age:0,ttl:W1})}if(s.push({type:"flares",vehicle:t.id}),l<0)return;for(let c=0;c<e.missiles.length;c++){let u=e.missiles[c],h=op[u.weapon];if(!h)continue;let d=Rt(u.position,r),f;if(u.steered){if(u.scanTarget!==t.id)continue;let p=u.target!==null&&(u.scanOff??0)===0;f=d<=Cc?h.flareNear:p?0:h.flareFar}else{if(u.target!==t.id)continue;f=d>h.farDist?h.flareFar:h.flareNear}if(Xi(u.id,l)<f){if(u.target=Tc+l,u.steered)u.scanTarget=null}}for(let c=0;c<n.length;c++){let u=n[c];for(let h=0;h<2;h++){let d=u.weapons[h];for(let f=0;f<d.length;f++){let p=d[f];if(p.lockTarget!==t.id)continue;if(p.lock>=1)s.push({type:"lock",vehicle:u.id,target:t.id,locked:!1});p.lock=0}}}}function dA(e,t){let n=K[e.kind].seatWeapons[t];return n[0]==="radarpulse"||n[1]==="radarpulse"}function fA(e,t,n,i,s,r){if(dA(e,t)){Sp(e,t,i,s,r);return}if(t!==1||!n||e.abilityReadyAt>s)return;let a=null,o=eA;for(let l=0;l<i.length;l++){let c=i[l];if(!c.alive||!Oa(e,c))continue;let u=hi(e.flight.position,n,c.flight.position,Ct);if(Ct.d<=J1&&u<o)o=u,a=c}if(!a)return;a.spottedUntil=Math.max(a.spottedUntil,s+Q1),e.abilityReadyAt=s+j1}function Sp(e,t,n,i,s){if(e.abilityReadyAt>i)return;let r=j.radarpulse;e.abilityReadyAt=i+1/r.rate;let a=e.flight.position;for(let o=0;o<n.length;o++){let l=n[o];if(!l.alive||!Oa(e,l))continue;if(Rt(a,l.flight.position)<=r.splash)Fc(e,l,i+r.ttl,s)}s.push({type:"pulse",vehicle:e.id,team:e.team,position:[a[0],a[1],a[2]],radius:r.splash}),s.push({type:"fire",vehicle:e.id,seat:t,weapon:"radarpulse"})}var oe=[0,0,0],X=[0,0,0],ne=[0,0,0],gn=[0,0,0],Ot=[0,0,0],Jt=[0,0,0],qf=[0,0,0],Et={t:2,vehicle:null};function pA(e,t,n,i,s,r,a){Et.t=2,Et.vehicle=null;let o=(e[0]+t[0])*0.5,l=(e[1]+t[1])*0.5,c=(e[2]+t[2])*0.5,u=Rt(e,t)*0.5;for(let h=0;h<r.length;h++){let d=r[h];if(!d.alive||d.team===n||d.id===i)continue;let f=d.flight.position,p=d.flight.velocity,m=K[d.kind].radius+s,g=f[0]-o,_=f[1]-l,x=f[2]-c,b=m+u+Math.sqrt(p[0]*p[0]+p[1]*p[1]+p[2]*p[2])*a;if(g*g+_*_+x*x>b*b)continue;let S=Nc(e,t,f,p,a,m);if(S>=0&&S<Et.t)Et.t=S,Et.vehicle=d}return Et}function nn(e,t,n,i){return i[0]=e[0]+(t[0]-e[0])*n,i[1]=e[1]+(t[1]-e[1])*n,i[2]=e[2]+(t[2]-e[2])*n,i}function Tp(e,t,n,i,s){mA(t,n,i),vA(t),gA(e,t,n,i,s),CA(e,t,n,i,s),NA(e,n),zA(e,t,n,i,s),tE(e,t,n,i,s)}function mA(e,t,n){for(let i=0;i<e.length;i++){let s=e[i];if(!s.alive)continue;let r=K[s.kind].seatWeapons;for(let a=0;a<2;a++)for(let o=0;o<2;o++){let l=r[a][o],c=s.weapons[a][o];if(!l||!c||a===1&&tA(s,c))continue;let u=j[l],h=nA(l);if(h<0||u.refill<=0)continue;if(c.ammo>=h){c.ammo=h,c.regen=0;continue}if(n-(c.firedAt??-1e9)<u.refillDelay-0.000000001)continue;let d=(c.regen??0)+h/u.refill*t,f=Math.floor(d+0.000001);if(f>0)c.ammo=Math.min(h,c.ammo+f),d=Math.max(0,d-f);c.regen=c.ammo>=h?0:d}}}function gA(e,t,n,i,s){let r=e.projectiles,a=0;for(let o=0;o<r.length;o++){let l=r[o];if(l.age+=n,l.age>l.ttl)continue;let c=j[l.weapon];if(c.kind==="bomb"){if(bA(e,l,t,n,i,s),l.age>=0)r[a++]=l;continue}let u=c.kind==="gun";if(!u)l.velocity[1]-=sr*n;let{position:h,velocity:d}=l;oe[0]=h[0],oe[1]=h[1],oe[2]=h[2],X[0]=h[0]+d[0]*n,X[1]=h[1]+d[1]*n,X[2]=h[2]+d[2]*n;let f=MA(oe,X,l.team,l.vehicle,t,n,l.rewind??0,u),p=Nn(oe,X);if(l.ship&&p!==null){let g=Cp(l.ship,oe,X);if(g!==null&&Math.abs(g-p)<0.0001)p=null}let m=p!==null?Ga(e,oe,X,i,l.ship??null):null;if(f.vehicle&&(p===null||f.t<=p)){let g=f.vehicle;nn(oe,X,f.t,ne);let _=Pc(l.weapon,g,i)*(u?Hf(l.weapon,l.age):1);if(ka(g,_,l.weapon,l.owner,ne,i,s),li(ne,l.weapon,l.owner,l.team,l.vehicle,g,t,i,s),!u)_t(s,ne,c.splash,"air");continue}if(p!==null&&m&&m.t<=p+0.0001){nn(oe,X,m.t,ne);let g=j[l.weapon].damage*(u?Hf(l.weapon,l.age):1);if(m.ship.team!==l.team)nr(e,m.ship.id,g*Ep(l.weapon),l.owner,l.team,ne,i,s);if(!u||l.id%Of===0)_t(s,ne,u?1:c.splash,"ground");continue}if(p!==null){nn(oe,X,p,ne);let g=rr(ne);if(!u&&g==="ground")Va(e,ne,Bc(l.weapon),s);if(u){if(g==="ground")li(ne,l.weapon,l.owner,l.team,l.vehicle,null,t,i,s);if(l.id%Of===0)_t(s,ne,1,g)}else if(g==="water")li(ne,l.weapon,l.owner,l.team,l.vehicle,null,t,i,s,cp,up),_t(s,ne,c.splash*0.3,"water");else li(ne,l.weapon,l.owner,l.team,l.vehicle,null,t,i,s),_t(s,ne,c.splash,"ground");continue}h[0]=X[0],h[1]=X[1],h[2]=X[2],r[a++]=l}r.length=a}function _A(e,t,n){let i=t.lastBomb?.[n]??-1;if(i<0)return null;for(let s=e.projectiles.length-1;s>=0;s--)if(e.projectiles[s].id===i)return e.projectiles[s];return null}var js=[0,0,0],yc=[0,0,0];function xA(e,t,n,i,s){let r=_A(e,t,n);if(!r||i[1]>=-0.02)return;let a=r.position;js[0]=a[0]+i[0]*20000,js[1]=a[1]+i[1]*20000,js[2]=a[2]+i[2]*20000;let o=Nn(a,js);if(o===null)return;let l=r.steerTo??(r.steerTo=[0,0,0]);nn(a,js,o,l),r.steerAt=s}function yA(e,t,n){let i=e.steerTo;if(!i||e.steerAt===void 0||n-e.steerAt>L1)return;let s=e.steerDv??0;if(s>=Uf)return;let{position:r,velocity:a}=e,o=$i(r,a,yc,qt);if(!(o>0.2))return;let l=i[0]-yc[0],c=i[2]-yc[2],u=l/o/0.5,h=c/o/0.5,d=Math.hypot(u,h),f=Math.min(P1,(Uf-s)/t);if(d>f)u*=f/d,h*=f/d;a[0]+=u*t,a[2]+=h*t,e.steerDv=s+Math.min(d,f)*t}function bA(e,t,n,i,s,r){let a=t.position;oe[0]=a[0],oe[1]=a[1],oe[2]=a[2];let o=i;while(o>0.000000001){let h=Math.min(si,o);yA(t,h,s),xc(a,t.velocity,h),o-=h}X[0]=a[0],X[1]=a[1],X[2]=a[2];let l=Nn(oe,X);if(l===null&&t.age<=t.ttl)return;if(l===null){t.age=-1;return}let c=Ga(e,oe,X,s,null),u=c&&c.t<=l+0.0001?c.ship:null;nn(oe,X,u?c.t:l,ne),cA(e,t,ne,u,n,s,r),t.age=-1}function vA(e){for(let t=0;t<e.length;t++){let n=e[t];if(!n.alive){n.histCount=0;continue}let i=n.hist??(n.hist=new Float64Array(_n*3)),s=n.histCount?((n.histHead??0)+1)%_n:0,r=n.flight.position;i[s*3]=r[0],i[s*3+1]=r[1],i[s*3+2]=r[2],n.histHead=s,n.histCount=Math.min(_n,(n.histCount??0)+1)}}function Xf(e,t,n){let i=e,s=e.flight.position,r=i.histCount??0;if(!i.hist||r===0||t<=0){let p=e.flight.velocity,m=Math.max(0,t);return n[0]=s[0]-p[0]*m,n[1]=s[1]-p[1]*m,n[2]=s[2]-p[2]*m,n}let a=Math.min(t/_e,r-1),o=Math.floor(a),l=a-o,c=Math.min(o+1,r-1),u=i.hist,h=i.histHead??0,d=((h-o)%_n+_n)%_n*3,f=((h-c)%_n+_n)%_n*3;return n[0]=u[d]+(u[f]-u[d])*l,n[1]=u[d+1]+(u[f+1]-u[d+1])*l,n[2]=u[d+2]+(u[f+2]-u[d+2])*l,n}var Dn=[0,0,0],At=[0,0,0],La=[0,0,0],Yf=[0,0,0],Kf=[0,0,0],Mp=0;function SA(e,t,n,i){let s=t[0]-e[0],r=t[1]-e[1],a=t[2]-e[2],o=i[0]-n[0],l=i[1]-n[1],c=i[2]-n[2],u=e[0]-n[0],h=e[1]-n[1],d=e[2]-n[2],f=s*s+r*r+a*a,p=o*o+l*l+c*c,m=o*u+l*h+c*d,g,_;if(f<=0.000000000001&&p<=0.000000000001)g=0,_=0;else if(f<=0.000000000001)g=0,_=Qs(m/p);else{let v=s*u+r*h+a*d;if(p<=0.000000000001)_=0,g=Qs(-v/f);else{let A=s*o+r*l+a*c,E=f*p-A*A;if(g=E>0.000000000001?Qs((A*m-v*p)/E):0,_=(A*g+m)/p,_<0)_=0,g=Qs(-v/f);else if(_>1)_=1,g=Qs((A-v)/f)}}Mp=g;let x=e[0]+s*g-(n[0]+o*_),b=e[1]+r*g-(n[1]+l*_),S=e[2]+a*g-(n[2]+c*_);return x*x+b*b+S*S}function Qs(e){return e<0?0:e>1?1:e}var ai=[0,0,0],oi=[0,0,0];function TA(e,t,n){let i=Rt(e,t),s=2;for(let r=0;r<2;r++){let a=n*(r===0?Pa.fuselageHalf:Pa.wingHalf),o=n*(r===0?Pa.fuselageRadius:Pa.wingRadius);if(r===0)ai[0]=0,ai[1]=0,ai[2]=-a,oi[0]=0,oi[1]=0,oi[2]=a;else ai[0]=-a,ai[1]=0,ai[2]=0,oi[0]=a,oi[1]=0,oi[2]=0;let l=SA(e,t,ai,oi);if(l>o*o)continue;let c=i>0.000000001?Math.max(0,Mp-Math.sqrt(o*o-l)/i):0;if(c<s)s=c}return s<=1?s:-1}function MA(e,t,n,i,s,r,a,o){Et.t=2,Et.vehicle=null;let l=(e[0]+t[0])*0.5,c=(e[1]+t[1])*0.5,u=(e[2]+t[2])*0.5,h=Rt(e,t)*0.5;for(let d=0;d<s.length;d++){let f=s[d];if(!f.alive||f.team===n||f.id===i)continue;let p=K[f.kind].radius;Xf(f,a,At),Xf(f,a+r,Dn);let m=At[0]-l,g=At[1]-c,_=At[2]-u,x=p*1.7+h+Rt(Dn,At);if(m*m+g*g+_*_>x*x)continue;let b;if(o){let S=f.flight.orientation;Mc(S,e[0]-Dn[0],e[1]-Dn[1],e[2]-Dn[2],Yf),Mc(S,t[0]-At[0],t[1]-At[1],t[2]-At[2],Kf),b=TA(Yf,Kf,p)}else La[0]=(At[0]-Dn[0])/r,La[1]=(At[1]-Dn[1])/r,La[2]=(At[2]-Dn[2])/r,b=Nc(e,t,At,La,r,p);if(b>=0&&b<Et.t)Et.t=b,Et.vehicle=f}return Et}function AA(e,t){for(let n=0;n<e.flares.length;n++)if(e.flares[n].id===t)return e.flares[n];return null}function EA(e,t,n){let i=j[e].kind;if(i==="missile_lock"||i==="missile_scanner")return Math.max(t.hp,t.maxHp)+1;return Pc(e,t,n)}function Js(e,t,n,i,s,r,a="air"){let o=j[e.weapon].splash;if(n)ka(n,EA(e.weapon,n,s),e.weapon,e.owner,t,s,r);if(a==="water"){li(t,e.weapon,e.owner,e.team,e.vehicle,n,i,s,r,cp,up),_t(r,t,o*0.3,"water");return}li(t,e.weapon,e.owner,e.team,e.vehicle,n,i,s,r),_t(r,t,o,a)}function wA(e,t,n){let i=Yi(n,e.vehicle);if(!i||!i.alive||!t.alive)return!1;let s=e.seat??1;if(i.seats[s]!==e.owner)return!1;let r=i.aim[s];if(!r||!On(r,qf))return!1;let a=j[e.weapon];return hi(i.flight.position,qf,t.flight.position,Ct)<=(a.lockCone??0.12)*G1&&Ct.d<=(a.range??8000)*1.1}function RA(e,t,n,i,s){if(!e.scanTarget)return null;let r=Yi(t,e.scanTarget);if(!r||!r.alive)return e.scanTarget=null,e.target=null,null;if(wA(e,r,t)){if(e.scanOff=0,e.target===null){if(ie[0]=e.velocity[0],ie[1]=e.velocity[1],ie[2]=e.velocity[2],On(ie,ie)&&hi(e.position,ie,r.flight.position,Ct)<=n.gimbal)e.target=r.id,s.push({type:"guidance",missile:e.id,vehicle:e.vehicle,target:r.id,guided:!0})}}else if(e.scanOff=(e.scanOff??0)+i,e.scanOff>z1&&e.target!==null)e.target=null,s.push({type:"guidance",missile:e.id,vehicle:e.vehicle,target:r.id,guided:!1});return e.target===r.id?r:null}function CA(e,t,n,i,s){let r=e.missiles,a=0;for(let o=0;o<r.length;o++){let l=r[o],c=j[l.weapon],u=op[l.weapon];if(l.age+=n,l.age>l.ttl){Js(l,l.position,null,t,i,s);continue}let{velocity:h,position:d}=l,f=er(h);if(f<0.000001)f=0.000001;if(l.age<=u.burn){if(f<u.maxSpeed)f=Math.min(u.maxSpeed,f+u.accel*n)}else f=Math.max(k1,f-u.coastDecel*n);let p=(c.turnRate??1)*n,m=null,g=!1;if(l.target&&l.target.startsWith(Tc))if(m=AA(e,Number(l.target.slice(Tc.length))),m)Ot[0]=m.position[0],Ot[1]=m.position[1],Ot[2]=m.position[2],Jt[0]=m.velocity[0],Jt[1]=m.velocity[1],Jt[2]=m.velocity[2],g=!0;else l.target=null;else if(l.target&&l.target.startsWith(tr))if(Ip(e,l.target.slice(tr.length),Ot)){let b=aa(Ot[0],Ot[2]);Jt[0]=b?b[0]:0,Jt[1]=0,Jt[2]=b?b[2]:0,g=!0}else l.target=null;else{let b=l.steered?RA(l,t,u,n,s):l.target?Yi(t,l.target):null;if(b&&b.alive){let S=b.flight.position,v=b.flight.velocity;Ot[0]=S[0],Ot[1]=S[1],Ot[2]=S[2],Jt[0]=v[0],Jt[1]=v[1],Jt[2]=v[2],g=!0}else if(!l.steered)l.target=null}if(ie[0]=h[0]/er(h),ie[1]=h[1]/er(h),ie[2]=h[2]/er(h),g&&l.age>V1&&hi(d,ie,Ot,Ct)>u.gimbal){if(g=!1,l.target=null,l.steered)l.scanTarget=null}if(g)IA(d,ie,f,Ot,Jt,n,p);h[0]=ie[0]*f,h[1]=ie[1]*f,h[2]=ie[2]*f,oe[0]=d[0],oe[1]=d[1],oe[2]=d[2],X[0]=d[0]+h[0]*n,X[1]=d[1]+h[1]*n,X[2]=d[2]+h[2]*n;let _=pA(oe,X,l.team,l.vehicle,u.fuse,t,n),x=Nn(oe,X);if(_.vehicle&&(x===null||_.t<=x)){Js(l,nn(oe,X,_.t,ne),_.vehicle,t,i,s);continue}if(x!==null){let b=Ga(e,oe,X,i,null);if(b&&b.t<=x+0.0001){if(nn(oe,X,b.t,ne),b.ship.team!==l.team)nr(e,b.ship.id,wp(l.weapon),l.owner,l.team,ne,i,s);Js(l,ne,null,t,i,s,"ground");continue}nn(oe,X,x,ne);let S=rr(ne);if(Js(l,ne,null,t,i,s,S),S==="ground")Va(e,ne,Bc(l.weapon),s);continue}if(m&&Rt(X,m.position)<u.fuse+4){Js(l,X,null,t,i,s);continue}d[0]=X[0],d[1]=X[1],d[2]=X[2],r[a++]=l}r.length=a}function IA(e,t,n,i,s,r,a){let o=i[0]-e[0],l=i[1]-e[1],c=i[2]-e[2],u=o*o+l*l+c*c;if(u<0.000001)return;let h=t[0]*n,d=t[1]*n,f=t[2]*n,p=s[0]-h,m=s[1]-d,g=s[2]-f,_=(l*g-c*m)/u,x=(c*p-o*g)/u,b=(o*m-l*p)/u,S=O1,v=S*(x*f-b*d),A=S*(b*h-_*f),E=S*(_*d-x*h);if(gn[0]=h+v*r,gn[1]=d+A*r,gn[2]=f+E*r,o*t[0]+l*t[1]+c*t[2]<0)gn[0]=o,gn[1]=l,gn[2]=c;if(On(gn,gn))mp(t,gn,a)}function NA(e,t){let n=e.flares,i=0,s=Math.exp(-1.2*t);for(let r=0;r<n.length;r++){let a=n[r];if(a.age+=t,a.age>a.ttl)continue;let{velocity:o,position:l}=a;o[0]*=s,o[1]=o[1]*s-9.81*t,o[2]*=s,l[0]+=o[0]*t,l[1]+=o[1]*t,l[2]+=o[2]*t,n[i++]=a}n.length=i}var tr="ship:",PA=1.6,LA=12,Zf=16,FA=20,DA=300,UA=20,BA=1.5,OA=18,kA=3.5;function Ap(){let e={};for(let t of Ce){let n=xe[t.kind],i={};for(let s of n.turrets)i[s.id]={hp:Nu,manned:null,readyAt:0};e[t.id]={id:t.id,team:t.team,kind:t.kind,hp:n.maxHp,maxHp:n.maxHp,sunk:!1,sunkAt:0,turrets:i,damage:[],damageCount:0}}return e}function xt(e,t){if(!e.ships)e.ships=Ap();return e.ships[t]??null}function Ep(e){let t=j[e];return t?nl[t.kind]??0:0}function wp(e){return(j[e]?.damage??0)*Ep(e)}function Bc(e){if(e==="flak")return 6;return Math.min(15,Math.max(6,(j[e]?.splash??8)*0.8))}function Va(e,t,n,i){if(!e.craters)e.craters=[];if(e.craters.length>=DA||oa(t[0],t[2])||Ju(t[0],t[2]))return;let s=[Math.round(t[0]*10)/10,Math.round(t[1]*10)/10,Math.round(t[2]*10)/10],r=Math.round(n*10)/10;e.craters.push({position:s,radius:r}),i.push({type:"crater",position:[s[0],s[1],s[2]],radius:r})}var ci=[0,0,0],bc=[0,0,0];function jf(e,t,n,i,s,r,a,o){let l=0,c=1;for(let u=0;u<3;u++){let h=e[u],d=t[u]-h,f=u===0?n:u===1?i:s,p=u===0?r:u===1?a:o,m=f-p,g=f+p;if(Math.abs(d)<0.000000001){if(h<m||h>g)return null;continue}let _=(m-h)/d,x=(g-h)/d;if(_>x){let b=_;_=x,x=b}if(_>l)l=_;if(x<c)c=x;if(l>c)return null}return l}function Ua(e,t,n){let i=t[0]-e.position[0],s=t[2]-e.position[2],r=Math.cos(e.heading),a=Math.sin(e.heading);return n[0]=i*r-s*a,n[1]=t[1]-e.position[1],n[2]=i*a+s*r,n}function Rp(e,t,n){let i=xe[e.kind],s=Math.hypot(i.halfLength,i.halfWidth)+5,r=e.position;if(Math.max(t[0],n[0])<r[0]-s||Math.min(t[0],n[0])>r[0]+s||Math.max(t[2],n[2])<r[2]-s||Math.min(t[2],n[2])>r[2]+s)return null;Ua(e,t,ci),Ua(e,n,bc);let a=jf(ci,bc,0,(i.deckHeight-15)/2,0,i.halfWidth,(i.deckHeight+15)/2,i.halfLength),o=i.island,l=jf(ci,bc,o.center[0],o.center[1],o.center[2],o.half[0],o.half[1],o.half[2]);return a===null?l:l===null?a:Math.min(a,l)}function Cp(e,t,n){let i=un(e);return i?Rp(i,t,n):null}var vc={t:2,ship:null};function Ga(e,t,n,i,s){let r=lt(),a=null,o=2;for(let l=0;l<r.length;l++){let c=r[l];if(c.id===s)continue;let u=xt(e,c.id);if(u&&u.sunk&&i-u.sunkAt>FA)continue;let h=Rp(c,t,n);if(h!==null&&h<o)o=h,a=c}if(!a)return null;return vc.t=o,vc.ship=a,vc}function Ip(e,t,n){let i=un(t),s=xt(e,t);if(!i||!s||s.sunk||i.team>=ra().teams)return!1;return n[0]=i.position[0],n[1]=xe[i.kind].deckHeight*0.6,n[2]=i.position[2],!0}var Qf=[0,0,0];function Np(e,t,n,i,s){let r=un(s);if(!r||r.team===t.team||!Ip(e,s,Qf))return-1;let a=hi(t.flight.position,i,Qf,Ct),o=n.range??2500;return Ct.d>o||a>(n.lockCone??0.3)*PA?-1:a}function VA(e,t,n,i){let s=lt(),r=null,a=1/0;for(let o=0;o<s.length;o++){let l=Np(e,t,n,i,s[o].id);if(l>=0&&l<a)a=l,r=s[o].id}return r}function nr(e,t,n,i,s,r,a,o){let l=xt(e,t),c=un(t);if(!l||!c||l.sunk||n<=0||l.team===s)return;let u=Math.min(n,l.hp);if(l.hp-=u,!e.shipDamageBy)e.shipDamageBy=[0,0,0,0];if(s>=0&&s<4)e.shipDamageBy[s]+=u;let h=Ua(c,r,[0,0,0]),d=[Math.round(h[0]*10)/10,Math.round(h[1]*10)/10,Math.round(h[2]*10)/10];if(l.damage.length<Zf)l.damage.push(d);else l.damage[l.damageCount%Zf]=d;l.damageCount++;let f=null,p=LA;for(let g of xe[l.kind].turrets){let _=l.turrets[g.id];if(!_||_.hp<=0)continue;let x=Math.hypot(h[0]-g.offset[0],h[1]-g.offset[1],h[2]-g.offset[2]);if(x<=p)p=x,f=g.id}let m={type:"ship-hit",ship:t,by:i,damage:Math.round(u*10)/10,position:[r[0],r[1],r[2]]};if(f)m.turret=f;if(o.push(m),f){let g=l.turrets[f];if(g.hp=Math.max(0,g.hp-n),g.hp<=0)o.push({type:"turret-destroyed",ship:t,turret:f,by:i})}if(l.hp<=0)l.hp=0,l.sunk=!0,l.sunkAt=a,o.push({type:"ship-sunk",ship:t,team:l.team,by:i,position:[c.position[0],0,c.position[2]]})}function za(e,t,n){let i=xt(e,t);if(!i||i.sunk)return!1;let s=i.turrets[n];return!!s&&s.hp>0}var en=[0,0,0],Un=[0,0,0];function GA(e,t){for(let n=0;n<xn.length;n++)if(xn[n].ship.id===e&&xn[n].turret===t)return xn[n];return null}function Jf(e,t,n){return n[0]=e.position[0]+t[0]*3,n[1]=e.position[1]+t[1]*3,n[2]=e.position[2]+t[2]*3,n}function Pp(e,t,n,i,s,r,a){let o=GA(t,n),l=xt(e,t);if(!o||!l||!za(e,t,n)||o.team>=ra().teams)return;let c=l.turrets[n];if(Oc(o),!s.firePrimary||!s.aim||!On(s.aim,en))return;if(c.readyAt<r-_e)c.readyAt=r;if(o.kind==="ciws"){let u=j.cannon20,h=0;while(c.readyAt<=r+0.000000001&&h<4&&e.projectiles.length<wc){let d=e.nextId++;ie[0]=en[0],ie[1]=en[1],ie[2]=en[2],gp(ie,0.004,d),Jf(o,ie,Un);let f=ie[0]*u.speed,p=ie[1]*u.speed,m=ie[2]*u.speed,g={id:d,weapon:"cannon20",owner:i,vehicle:t,team:o.team,position:[Un[0]-f*_e,Un[1]-p*_e,Un[2]-m*_e],velocity:[f,p,m],age:-_e,ttl:u.ttl,ship:t};e.projectiles.push(g),c.readyAt+=1/UA,h++}if(h&&Math.floor(r*4)!==Math.floor((r-_e)*4))Ba(o,null,ep(o.position,en,800),a)}else if(c.readyAt<=r+0.000000001){if(c.readyAt=r+BA,!e.shells)e.shells=[];Jf(o,en,Un),e.shells.push({id:e.nextId++,owner:i,ship:t,team:o.team,position:[Un[0],Un[1],Un[2]],velocity:[en[0]*Da,en[1]*Da,en[2]*Da],age:0}),Ba(o,null,ep(o.position,en,1500),a)}}var Fa=[0,0,0];function ep(e,t,n){return Fa[0]=e[0]+t[0]*n,Fa[1]=e[1]+t[1]*n,Fa[2]=e[2]+t[2]*n,Fa}function zA(e,t,n,i,s){let r=e.shells;if(!r||!r.length)return;let a=0;for(let o=0;o<r.length;o++){let l=r[o];l.age+=n;let{position:c,velocity:u}=l;oe[0]=c[0],oe[1]=c[1],oe[2]=c[2],X[0]=c[0]+u[0]*n,X[1]=c[1]+u[1]*n,X[2]=c[2]+u[2]*n;let h=-1;for(let p=0;p<t.length;p++){let m=t[p];if(!m.alive||m.team===l.team)continue;let g=Nc(oe,X,m.flight.position,m.flight.velocity,n,OA+K[m.kind].radius);if(g>=0&&(h<0||g<h))h=g}let d=Nn(oe,X);if(d!==null){let p=Cp(l.ship,oe,X);if(p!==null&&Math.abs(p-d)<0.0001&&l.age<0.5)d=null}let f=d!==null&&(h<0||d<h);if(h<0&&!f&&l.age<kA){c[0]=X[0],c[1]=X[1],c[2]=X[2],r[a++]=l;continue}if(nn(oe,X,f?d:h>=0?h:1,ne),f){let p=Ga(e,oe,X,i,l.ship);if(p&&Math.abs(p.t-d)<0.001){if(p.ship.team!==l.team)nr(e,p.ship.id,Ac*(nl.rockets??1),l.owner,l.team,ne,i,s);_t(s,ne,Bn*0.5,"ground")}else{let m=rr(ne);if(_t(s,ne,Bn*0.5,m),m==="ground")Va(e,ne,Bc("flak"),s)}}else _t(s,ne,Bn*0.5,"air",!0);for(let p=0;p<t.length;p++){let m=t[p];if(!m.alive||m.team===l.team)continue;let g=Math.max(0,Rt(ne,m.flight.position)-K[m.kind].radius);if(g>=Bn)continue;ka(m,Ec(m,Ac*(1-g/Bn),i),Lp,l.owner,ne,i,s)}}r.length=a}var Lp="aa",HA=1,Fp=0.1,WA=52,Sc=400,tp=900,$A=0.3,qA=35,XA=450,YA=0.1,KA=1100,Da=800,ZA=2,Ac=70,Bn=25,jA=0.035;function QA(e){if(e>=tp)return 0;if(e<=Sc)return 1;return 1-(e-Sc)/(tp-Sc)}function JA(e,t,n,i){let s=t[0]-e[0],r=t[1]-e[1],a=t[2]-e[2],o=Math.max(1,Math.sqrt(s*s+r*r+a*a)),l=(n[0]*s+n[1]*r+n[2]*a)/o,c=n[0]*n[0]+n[1]*n[1]+n[2]*n[2],h=Math.sqrt(Math.max(0,c-l*l))/o/$A,d=i/qA,f=Math.sqrt(c)/XA;return 1/(1+h*h+d*d+f*f)}var xn=Ce.flatMap((e)=>xe[e.kind].turrets.map((t)=>({ship:e,turret:t.id,kind:t.kind,team:e.team,position:Yr(e,t.offset),offset:t.offset})));function Dp(e){return un(e.id)??e}function Oc(e){if(!e.offset)return;let t=Dp(e.ship),n=Math.cos(t.heading),i=Math.sin(t.heading),s=e.offset;e.position[0]=t.position[0]+s[0]*n+s[2]*i,e.position[1]=t.position[1]+s[1],e.position[2]=t.position[2]-s[0]*i+s[2]*n}function Up(){return xn.map((e,t)=>({target:null,track:0,pending:0,nextEventAt:0,readyAt:0,nextScanAt:t%6*(Fp/6)}))}var np=[0,0,0],tn=[0,0,0],ip=[0,0,0];function Bp(e,t){let n=xe[e.ship.kind];Oc(e);let i=Dp(e.ship),s=Ni(i,e.position),r=Ni(i,t),a=Math.max(n.deckHeight,n.island.center[1]+n.island.half[1])+2,o=[-n.halfWidth-2,-5,-n.halfLength-2],l=[n.halfWidth+2,a,n.halfLength+2],c=0,u=0,h=1,d=!0;for(let f=0;f<3;f++){let p=r[f]-s[f];if(Math.abs(p)<0.000000001){if(s[f]<o[f]||s[f]>l[f]){d=!1;break}continue}let m=(o[f]-s[f])/p,g=(l[f]-s[f])/p;if(m>g){let _=m;m=g,g=_}if(m>u)u=m;if(g<h)h=g;if(u>h){d=!1;break}}if(d&&u<=0)c=Math.min(1,h+0.0001);if(c>=1)return!0;return nn(e.position,t,c,np),Nn(np,t)===null}function Op(e,t,n){if(!t.alive||t.team===e.team||ui(t,n))return!1;let i=t.flight.position;if(K[t.kind].stealth&&i[1]>sh)return!1;let s=i[0]-e.position[0],r=i[1]-e.position[1],a=i[2]-e.position[2];return s*s+r*r+a*a<=ln*ln}function eE(e,t,n){let i=-1;for(let s=0;s<3;s++){let r=null,a=1/0;for(let o=0;o<t.length;o++){let l=t[o];if(!Op(e,l,n))continue;let c=Rt(e.position,l.flight.position);if(c>i&&c<a)a=c,r=l}if(!r)return null;if(Bp(e,r.flight.position))return r;i=a}return null}function Ec(e,t,n){let i=e.spottedUntil>n?rp:1;return t*ap[e.kind]*i}function sp(e,t,n,i,s,r){if(!t.alive||n<=0||ui(t,s))return;if(t.hp-=n,r.push({type:"hit",target:t.id,by:e.ship.id,weapon:Lp,damage:n,position:[i[0],i[1],i[2]]}),t.hp<=0)Ki(t,"aa",null,r,e.team)}function Ba(e,t,n,i){i.push({type:"aa",ship:e.ship.id,turret:e.turret,kind:e.kind,target:t?t.id:"",position:[e.position[0],e.position[1],e.position[2]],aim:[n[0],n[1],n[2]]})}function tE(e,t,n,i,s){if(!e.turrets||e.turrets.length!==xn.length)e.turrets=Up();if(!e.bursts)e.bursts=[];let r=e.turrets,a=ra().teams;for(let c=0;c<xn.length;c++){let u=xn[c],h=r[c];if(u.offset&&u.team>=a){h.target=null,h.track=0,h.pending=0;continue}let d=u.offset?xt(e,u.ship.id):null,f=d?d.turrets[u.turret]:null;if(d&&(d.sunk||!f||f.hp<=0||f.manned)){h.target=null,h.track=0,h.pending=0;continue}Oc(u);let p=h.target?Yi(t,h.target):null;if(p&&!Op(u,p,i))p=null;if(i>=h.nextScanAt){if(h.nextScanAt=i+Fp,!p||!Bp(u,p.flight.position))p=eE(u,t,i)}let m=p?p.id:null;if(m!==h.target)h.target=m,h.track=0,h.pending=0,h.accel=0,h.lastVel=void 0;if(!p)continue;let g=p.flight.position,_=p.flight.velocity;if(h.lastVel){let S=(_[0]-h.lastVel[0])/n,v=(_[1]-h.lastVel[1])/n,A=(_[2]-h.lastVel[2])/n,E=Math.max(0.000001,Math.sqrt(_[0]*_[0]+_[1]*_[1]+_[2]*_[2])),I=(S*_[0]+v*_[1]+A*_[2])/E,F=Math.sqrt(Math.max(0,S*S+v*v+A*A-I*I));h.accel=(h.accel??0)+(Math.min(F,200)-(h.accel??0))*Math.min(1,n/0.3),h.lastVel[0]=_[0],h.lastVel[1]=_[1],h.lastVel[2]=_[2]}else h.lastVel=[_[0],_[1],_[2]];if(h.track+=n,h.track<HA*(ir(p,i)?2:1))continue;let x=Rt(u.position,g),b=JA(u.position,g,_,h.accel??0);if(u.kind==="ciws"){if(h.pending+=Ec(p,WA*QA(x)*b,i)*n,i>=h.nextEventAt){if(h.nextEventAt=i+YA,zf(u.position,ip,KA,g,_,tn)<0)tn[0]=g[0],tn[1]=g[1],tn[2]=g[2];Ba(u,p,tn,s);let S=h.pending;h.pending=0,sp(u,p,S,g,i,s)}}else if(i>=h.readyAt){h.readyAt=i+ZA;let S=zf(u.position,ip,Da,g,_,tn);if(S<0)continue;let v=(c+1)*7919+Math.floor(i*60),A=jA*x/Math.sqrt(b),E=(Xi(v,11)*2-1)*A,I=(Xi(v,12)*2-1)*A,F=(Xi(v,13)*2-1)*A;Ba(u,p,tn,s),e.bursts.push({at:i+S,position:[tn[0]+E,tn[1]+I,tn[2]+F],ship:u.ship.id,team:u.team})}}let o=e.bursts,l=0;for(let c=0;c<o.length;c++){let u=o[c];if(u.at>i){o[l++]=u;continue}_t(s,u.position,Bn*0.5,"air",!0);let h=xn.find((d)=>d.ship.id===u.ship);if(!h)continue;for(let d=0;d<t.length;d++){let f=t[d];if(!f.alive||f.team===u.team)continue;let p=Math.max(0,Rt(u.position,f.flight.position)-K[f.kind].radius);if(p>=Bn)continue;sp(h,f,Ec(f,Ac*(1-p/Bn),i),u.position,i,s)}}o.length=l}var nE=4500,Xp=4000,kp=95,iE=1800,sE=4000,Vc=1500,rE=600,aE=2600,oE=3000,lE=1200;function Vp(e){return{aim:e,firePrimary:!1,fireSecondary:!1,flares:!1,ability:!1,viewDelay:0}}function Yp(e,t){let n=[0,0,-1],i=[0,0,-1],s=[0,0,-1],r={aim:n,throttle:0,roll:0,yaw:0,pitch:0,boost:!1,brake:!1},a=Vp(i),o=Vp(s),l={memory:{},state:{rng:e^2654435769|0,skill:0.5,vehicleId:null,phase:"takeoff",runwayDir:[0,-1],spawnPos:[0,0,0],targetId:null,retargetAt:0,waypoint:[0,1000,0],waypointUntil:0,jitterYaw:0,jitterPitch:0,jitterUntil:0,threatId:-1,threatSeenAt:0,breakSign:1,extendUntil:0,lastMissileAt:-1e9,guideTargetId:null,guideUntil:0,engagedSince:-1,threatDelay:1,burstUntil:0,burstPauseUntil:0,lastHp:-1,evadeUntil:0,evadeCooldownUntil:0,gunAimSet:!1,steer:[0,0,-1],steerAt:-1,role:"fighter",defender:!1,strikeShip:null,strikePhase:"approach",strikeUntil:0},out:{flight:r,pilotSeat:a,gunnerSeat:o,flightAim:n,pilotAim:i,gunnerAim:s,pilot:{flight:r,seat:a},gunner:{seat:o}}};return l.state.skill=qe(t??0.35+Me(l)*0.3,0,1),l}function cE(e){return 0.11-0.1*e}function uE(e){return 1-0.8*e}function Kp(e){return 11-6*e}function Gc(e,t){return Math.min(Wc(t),600+500*e)}function hE(e){return 0.5+0.5*e}function dE(e){return 0.8+1.2*e}function fE(e){return 0.6-0.45*e}function Wa(e){return e.botMissileAt??-1e9}var pE=2,mE=1.5;function Me(e){let t=e.state.rng=e.state.rng+1831565813|0;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}var Zp={fighter:3,apache:2,warthog:2,blackbird:1.2,bomber:0.9,"astra-interceptor":0,"astra-trainer":0},kc=Object.keys(Zp);function jp(e,t,n,i){let s={fighter:0,apache:0,warthog:0,blackbird:0,bomber:0,"astra-interceptor":0,"astra-trainer":0};for(let o of n)if(o.alive&&o.team===e.team)s[o.kind]++;let r=0;for(let o of kc)r+=Gp(o,s);let a=qe(i(),0,0.999999)*r;for(let o of kc)if(a-=Gp(o,s),a<0)return o;return kc[0]}function Gp(e,t){return Zp[e]/(1+t[e]*1.5)*((e==="blackbird"||e==="bomber")&&t[e]>=2?0.1:1)}function qe(e,t,n){return e<t?t:e>n?n:e}function Ze(e,t,n,i){return e[0]=t,e[1]=n,e[2]=i,e}function It(e,t){return e[0]=t[0],e[1]=t[1],e[2]=t[2],e}function ht(e){let t=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);if(!(t>0.000000001)||!Number.isFinite(t))return Ze(e,0,0,-1);return e[0]/=t,e[1]/=t,e[2]/=t,e}function fi(e,t){let n=e[0]-t[0],i=e[1]-t[1],s=e[2]-t[2];return Math.sqrt(n*n+i*i+s*s)}function $a(e){return Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2])}function Ha(e,t,n){let i=n[0]-t[0],s=n[1]-t[1],r=n[2]-t[2],a=Math.sqrt(i*i+s*s+r*r);if(a<0.000001)return 0;return Math.acos(qe((e[0]*i+e[1]*s+e[2]*r)/a,-1,1))}function cr(e,t){let n=$a(e),i=$a(t);if(n<0.000000001||i<0.000000001)return Math.PI;return Math.acos(qe((e[0]*t[0]+e[1]*t[1]+e[2]*t[2])/(n*i),-1,1))}function hr(e,t){let[n,i,s,r]=e;return Ze(t,-(2*(n*s+r*i)),-(2*(i*s-r*n)),-(1-2*(n*n+i*i)))}function Ne(e,t,n,i){let s=Math.sqrt(e*e+t*t);if(s<0.000001)e=0,t=-1,s=1;let r=Math.cos(n);return Ze(i,e/s*r,Math.sin(n),t/s*r)}function di(e){return Math.atan2(e[1],Math.sqrt(e[0]*e[0]+e[2]*e[2]))}function $c(e,t){return Ne(e[0],e[2],t,e)}function gE(e,t,n,i,s,r,a){let o=i*i+s*s+r*r-a*a,l=2*(e*i+t*s+n*r),c=e*e+t*t+n*n,u=Math.sqrt(c)/Math.max(a,1),h;if(Math.abs(o)<0.000001)h=l<0?-c/l:u;else{let d=l*l-4*o*c;if(d<0)return u;let f=Math.sqrt(d),p=(-l-f)/(2*o),m=(-l+f)/(2*o);h=p>0&&m>0?Math.min(p,m):p>0?p:m>0?m:u}return Math.min(h,20)}function or(e,t,n,i,s,r,a){let o=n[0]-e[0],l=n[1]-e[1],c=n[2]-e[2],u=i[0]-t[0],h=i[1]-t[1],d=i[2]-t[2],f=gE(o,l,c,u,h,d,s);return Ze(a,o+u*f,l+h*f+0.5*r*f*f,c+d*f),ht(a),f}function _E(e,t,n,i,s,r){let a=t[0],o=t[2],l=Math.sqrt(a*a+o*o);if(l<20&&r)a=r[0],o=r[2];let c=Math.sqrt(a*a+o*o),u=c>0.000001?a/c:0,h=c>0.000001?o/c:-1,d=Math.max(l,40),f=Math.min(t[1],0),p=-1.2,m=e[1]-n.groundHeight(e[0],e[2]);if(m<i)p=qe(0.15+(1-m/i)*0.45,0.15,0.6);for(let g=1;g<=6;g++){let _=s*g/6,x=d*_,b=n.groundHeight(e[0]+u*x,e[2]+h*x),S=e[1]+f*Math.min(_,1.5),v=Math.atan2(b+i-S,x);if(v>p)p=v}return qe(p,-1.2,1.2)}function xE(e,t,n,i,s){let r=Math.sqrt(t[0]*t[0]+t[2]*t[2]),a=r>0.000001?t[0]/r:0,o=r>0.000001?t[2]/r:0,l=Math.max(n*s,300),c=i.groundHeight(e[0],e[2]);for(let u=1;u<=5;u++){let h=l*u/5,d=i.groundHeight(e[0]+a*h,e[2]+o*h);if(d>c)c=d}return c}var zc=ln+300,zp=500;function yE(e,t,n){let i=1/0,s=lt();for(let r=0;r<s.length;r++){let a=s[r];if(a.team===e)continue;let o=t-a.position[0],l=n-a.position[2],c=Math.sqrt(o*o+l*l);if(c<i)i=c}return i}function Qp(e,t,n,i,s){let r=Math.sqrt(t*t+n*n);if(r<0.000001)t=0,n=0;else t/=r,n/=r;let a=-1/0,o=lt();for(let l=0;l<o.length;l++){let c=o[l],u=xe[c.kind],h=u.island.center[1]+u.island.half[1];if(e[1]>h+s+60)continue;let d=c.position[0]-e[0],f=c.position[2]-e[2],p=d*t+f*n,m=Math.abs(d*n-f*t),g=u.halfLength+40;if(p<-0.3*g||p>i+g||m>g)continue;if(h+s>a)a=h+s}return a}function Hp(e,t,n,i,s,r,a,o=!0){ht(e);let l=Math.min(1200,i.half*0.15),c=Math.max(Math.abs(t[0]),Math.abs(t[2]))-(i.half-l);if(c>0){let m=Math.sqrt(t[0]*t[0]+t[2]*t[2])||1,g=qe(c/l+0.3,0,1);Ne(e[0]*(1-g)-t[0]/m*g,e[2]*(1-g)-t[2]/m*g,di(e),e)}if(a!==null){let m=lt();for(let g=0;g<m.length;g++){let _=m[g];if(_.team===a)continue;let x=t[0]-_.position[0],b=t[2]-_.position[2],S=Math.sqrt(x*x+b*b),v=zc+zp;if(S>=v||S<0.001)continue;let A=x/S,E=b/S,I=Math.sqrt(e[0]*e[0]+e[2]*e[2])||1,F=-(e[0]*A+e[2]*E)/I,U=qe((v-S)/zp,0,1);if(S<zc)Ne(A,E,di(e),e);else if(F>-0.3*U){let P=(Math.max(F,0)+0.3*U)*(0.5+U);Ne(e[0]/I+A*P,e[2]/I+E*P,di(e),e)}}}let u=_E(t,n,i,s,r,e),h=Math.max(Math.sqrt(n[0]*n[0]+n[2]*n[2])*r,300),d=Qp(t,e[0],e[2],h,40);if(d>t[1])u=Math.max(u,Math.atan2(d-t[1],250));let f=di(e),p=f<u?u:f;if(t[1]>i.ceiling-350)p=Math.min(p,-0.08);else if(t[1]>i.ceiling-800)p=Math.min(p,0.05);if(p!==f)$c(e,p);if(o)bE(e,t,n,i);return e}function bE(e,t,n,i){if(Math.sqrt(n[0]*n[0]+n[2]*n[2])<20)return;let r=t[1]-Math.max(i.groundHeight(t[0],t[2]),0),a=-n[1];if(a>20&&r<250+a*6){Ne(n[0],n[2],0.35,e);return}if(r>700)return;let o=0.5+r/700*0.6,l=Math.atan2(n[0],n[2]),u=Math.atan2(e[0],e[2])-l;if(u-=Math.round(u/(2*Math.PI))*2*Math.PI,Math.abs(u)<=o)return;let h=l+Math.sign(u)*o;Ne(Math.sin(h),Math.cos(h),Math.max(di(e),0.05),e)}var yn=[0,0,0],lr=[0,0,0],Wp=[0,0,0],Ya=[0,0,0],vE=[0,0,0];function ur(e,t,n){if(!e.alive||e.team===t||e.flight.crashed||ui(e,n))return!1;if(K[e.kind].stealth&&e.spottedUntil<=n)return!1;let i=e.flight.position;return!la(e.team,i)&&yE(t,i[0],i[2])>zc}function Hc(e,t){if(!t)return null;for(let n=0;n<e.length;n++)if(e[n].id===t)return e[n];return null}function Jp(e,t,n,i,s){let r=e.flight.position,a=K[e.kind].flight==="heli",o=null,l=1/0;for(let c=0;c<t.length;c++){let u=t[c];if(u===e||!ur(u,e.team,n))continue;if(u.id!==s&&SE(u,e.id,n)>=pE)continue;let h=fi(r,u.flight.position),d=u.spottedUntil>n;if(h>i||!d&&h>nE)continue;let f=h;if(d)f*=0.75;if(u.id===s)f*=0.6;if(f*=0.6+0.4*(u.hp/Math.max(u.maxHp,1)),h<1800&&Ha(hr(u.flight.orientation,yn),u.flight.position,r)<0.45)f*=0.5;if(a&&$a(u.flight.velocity)>150)f*=1.6;if(f<l)l=f,o=u}return o}function SE(e,t,n){let i=e.botClaims;if(!i)return 0;let s=0;for(let r in i)if(r!==t&&i[r]>n)s++;return s}function em(e,t,n){let i=e,s=i.botClaims??(i.botClaims={});for(let r in s)if(s[r]<=n)delete s[r];s[t]=n+mE}function TE(e,t){if(!t)return null;let n=e.flight.position,i=null,s=1/0;for(let r=0;r<t.length;r++){let a=t[r];if(a.team===e.team)continue;if(a.target!==e.id&&!(a.steered&&a.scanTarget===e.id))continue;let o=fi(n,a.position);if(o<s)s=o,i=a}return i}function ME(e,t){let n=e.state;if(t<n.jitterUntil)return;let i=cE(n.skill);n.jitterYaw=(Me(e)*2-1)*i,n.jitterPitch=(Me(e)*2-1)*i,n.jitterUntil=t+0.3+Me(e)*0.5}function Zi(e,t,n=1){let i=e.state,s=i.jitterYaw*n,r=Math.cos(s),a=Math.sin(s),o=t[0]*r+t[2]*a,l=-t[0]*a+t[2]*r;return t[0]=o,t[2]=l,$c(t,qe(di(t)+i.jitterPitch*n,-1.5,1.5))}var AE=0.6;function ar(e,t,n,i){let s=e.state,r=s.steerAt<0?0:qe(n-s.steerAt,0,0.25);if(s.steerAt<0||n-s.steerAt>0.5)It(s.steer,i);s.steerAt=n;let a=s.steer,o=cr(a,t);if(o<0.000001||r===0){if(r===0)It(t,a);else It(a,t);return}let c=Math.min(o,o*(1-Math.exp(-r/fE(s.skill))),dE(s.skill)*r)/o;Ze(a,a[0]+(t[0]-a[0])*c,a[1]+(t[1]-a[1])*c,a[2]+(t[2]-a[2])*c),ht(a),It(t,a)}function tm(e,t){let n=e.state;if(t<n.burstUntil)return!0;if(t<n.burstPauseUntil)return!1;return n.burstUntil=t+0.35+0.4*n.skill+Me(e)*0.3,n.burstPauseUntil=n.burstUntil+(1.2-0.9*n.skill)+Me(e)*0.5,!0}function ji(e,t){return!!e&&(e.ammo<0||e.ammo>=1)&&e.readyAt<=t}function Wc(e){switch(e.kind){case"gun":return Math.min(e.speed*e.ttl*0.8,qi);case"rockets":return Math.min(e.speed*e.ttl*0.45,1200);case"missile_lock":return(e.range??2500)*0.95;case"missile_scanner":return(e.range??8000)*0.9;case"pulse":return Xp;case"bomb":return 0}}function qa(e,t,n){return e.aim=n?It(t,n):null,e.firePrimary=!1,e.fireSecondary=!1,e.flares=!1,e.ability=!1,e.steerBomb=!1,e}function EE(e,t){let n=e.state;if(n.vehicleId=t.id,n.phase=t.flight.onGround?"takeoff":"transit",hr(t.flight.orientation,yn),t.flight.onGround){let s=Ls(t.team).heading;Ze(yn,-Math.sin(s),0,-Math.cos(s))}let i=Math.sqrt(yn[0]*yn[0]+yn[2]*yn[2]);n.runwayDir[0]=i>0.000001?yn[0]/i:0,n.runwayDir[1]=i>0.000001?yn[2]/i:-1,It(n.spawnPos,t.flight.position),n.targetId=null,n.retargetAt=0,n.waypointUntil=0,n.threatId=-1,n.extendUntil=0,n.guideTargetId=null,n.guideUntil=0,n.engagedSince=-1,n.breakSign=Me(e)<0.5?-1:1,n.role=nm(t.kind,0)&&Me(e)<0.65?"strike":"fighter",n.defender=Me(e)<0.35,n.strikeShip=null,n.strikePhase="approach",n.strikeUntil=0}function nm(e,t){for(let n of K[e].seatWeapons[t]){let i=n?j[n].kind:null;if(i==="rockets"||i==="missile_lock")return!0}return!1}function Xa(e,t,n,i){let s=lt(),r=null,a=1/0;for(let o=0;o<s.length;o++){let l=s[o];if(l.team===e||n?.[l.id]?.sunk)continue;let c=Math.hypot(l.position[0]-t[0],l.position[2]-t[2]);if(l.kind==="carrier"===i)c*=1.6;if(c<a)a=c,r=l}return r}function wE(e,t){let n=lt(),i=t.flight.position;for(let s=0;s<n.length;s++){let r=n[s];if(r.team===e&&Math.hypot(r.position[0]-i[0],r.position[2]-i[2])<oE)return!0}return!1}function RE(e,t,n,i,s,r){let{state:a,out:o}=e,{flight:l,pilotSeat:c}=o,u=t.flight,h=u.position,d=xe[n.kind],f=n.position[0]-h[0],p=n.position[2]-h[2],m=d.deckHeight*0.6-h[1],g=Math.sqrt(f*f+p*p);if(a.strikePhase==="egress")if(g>aE&&i>=a.strikeUntil)a.strikePhase="approach";else{let v=Math.cos(0.5*a.breakSign),A=Math.sin(0.5*a.breakSign);return Ne((-f*v-p*A)/g,(f*A-p*v)/g,r?-0.2:0.12,s),l.boost=!r,1}if(g<rE)return a.strikePhase="egress",a.strikeUntil=i+6,a.breakSign=Me(e)<0.5?-1:1,Ne(-f,-p,0.1,s),1;let _=r?120:380;if(g>Vc+600)return Ne(f,p,qe(Math.atan2(_-h[1],1500),-0.3,0.3),s),l.boost=!r&&g>4000,r?0.9:1;ht(Ze(s,f,m,p));let x=hr(u.orientation,Ya),b=K[t.kind],S=!1;for(let v=0;v<2;v++){let A=b.seatWeapons[0][v];if(!A)continue;let E=j[A],I=t.weapons[0][v];if(!ji(I,i))continue;if(E.kind==="missile_lock"&&I.lock>=1&&I.lockTarget?.startsWith("ship:")&&i-Wa(t)>1.5)S=!0;else if(E.kind==="rockets"&&g<1100&&cr(x,s)<0.06)S=!0;else continue;if(v===0)c.firePrimary=!0;else c.fireSecondary=!0;a.lastMissileAt=i,t.botMissileAt=i}if(S&&g<Vc-200&&Me(e)<0.05)a.strikePhase="egress",a.strikeUntil=i+6;return r?0.8:0.55}var yt=[0,0,0];function CE(e,t,n,i,s,r){let a=e.state,o=t.flight,{position:l,velocity:c}=o,u=qe(Math.atan2(iE-l[1],1500),-0.25,0.3),h=n.position[0]-l[0],d=n.position[2]-l[2],f=Math.hypot(h,d);if(a.strikePhase==="egress")if(f>sE)a.strikePhase="approach";else return Ne(c[0]-d*0.15*a.breakSign,c[2]+h*0.15*a.breakSign,u,s),0.9;let p=$i(l,c,yt,r),m=p>0?yt[0]-l[0]:0,g=p>0?yt[2]-l[2]:0,_=h-m,x=d-g;if(Ne(_,x,u,s),Math.hypot(_,x)<250&&_*c[0]+x*c[2]<0)a.strikePhase="egress",a.breakSign=Me(e)<0.5?-1:1;return 0.9}function im(e,t,n,i,s,r,a=qt,o,l){let c=e.out;if(!n.alive||n.flight.crashed||t.seat!==0&&t.seat!==1){let u=c.flight;return u.aim=null,u.throttle=0,u.roll=0,u.yaw=0,u.pitch=0,u.boost=!1,u.brake=!1,qa(c.pilotSeat,c.pilotAim,null),qa(c.gunnerSeat,c.gunnerAim,null),t.seat===0?c.pilot:c.gunner}if(e.state.vehicleId!==n.id)EE(e,n);if(ME(e,s),t.seat===0){let u=NE(e,t,n,i,s,r,a,o);if(!n.seats[1])qp(t,u.seat,c.pilotAim,l,o);return u}return FE(e,t,n,i,s,r,o),qp(t,c.gunnerSeat,c.gunnerAim,l,o),c.gunner}function IE(e,t,n,i){let s=e.state,r=Me(e)*Math.PI*2,a=Me(e)*i*(n?0.3:0.45);Ze(s.waypoint,Math.cos(r)*a,n?180:900+Me(e)*700,Math.sin(r)*a),s.waypointUntil=t+20+Me(e)*20}function NE(e,t,n,i,s,r,a,o){let{state:l,out:c}=e,u=K[n.kind],h=u.flight==="heli",d=n.flight,{position:f,velocity:p}=d,m=hr(d.orientation,Ya),g=$a(p),_=a.groundHeight(f[0],f[2]),x=f[1]-_,b=c.flight;b.roll=0,b.yaw=0,b.pitch=0,b.boost=!1,b.brake=!1;let S=qa(c.pilotSeat,c.pilotAim,null);l.gunAimSet=!1;let v=It(c.flightAim,m),A=0.85,E=f[1],I=h?45:150,F=h?4:7,U=null;if(d.onGround&&l.phase!=="takeoff")l.phase="takeoff",It(l.spawnPos,f);if(l.phase==="takeoff"&&!d.onGround){let V=Math.hypot(f[0]-l.spawnPos[0],f[2]-l.spawnPos[2]);if(h?f[1]>kp:V>fl*0.5&&x>150||V>fl)l.phase="transit"}if(l.phase==="takeoff"){let V=l.runwayDir;if(h)Ne(V[0],V[1],0,v),E=kp+15,b.brake=!0;else{let J=d.onGround?0:g>u.stall*1.6?0.15:0.07;if(Ne(V[0],V[1],J,v),A=1,b.boost=d.onGround||g<u.stall*1.5,I=25,!d.onGround)Hp(v,f,p,a,I,F,null)}return l.engagedSince=-1,$p(e,n,v,h,A,E,_,a,null)}let P=TE(n,r);if(P){if(l.threatId!==P.id)l.threatId=P.id,l.threatSeenAt=s,l.breakSign=Me(e)<0.5?-1:1,l.threatDelay=uE(l.skill)+Me(e)*0.6}else l.threatId=-1;let C=P!==null&&s>=l.threatSeenAt+l.threatDelay;if(!(l.phase==="strike"&&l.strikePhase==="approach")&&l.lastHp>=0&&n.hp<l.lastHp-0.5&&s>=l.evadeCooldownUntil&&Me(e)<1-0.5*l.skill)l.evadeUntil=s+2+Me(e)*2,l.evadeCooldownUntil=l.evadeUntil+4,l.breakSign=Me(e)<0.5?-1:1;l.lastHp=n.hp;let N=s<l.evadeUntil,R=Hc(i,l.targetId);if(s>=l.retargetAt||R&&!ur(R,n.team,s)){let V=n.kind==="blackbird"?12000:h?5000:9000;R=Jp(n,i,s,V,l.targetId),l.targetId=R?R.id:null,l.retargetAt=s+0.6+(1-l.skill)*1.5+Me(e)*0.4}if(R&&!ur(R,n.team,s))R=null;if(R)em(R,n.id,s);let Z=la(n.team,f),z=null;if(l.role==="strike"&&!C&&!N&&!(R&&(fi(f,R.flight.position)<lE||l.defender&&wE(n.team,R)))){let V=l.strikeShip?lt().find((J)=>J.id===l.strikeShip)??null:null;z=V&&!o?.[V.id]?.sunk?V:Xa(n.team,f,o,Me(e)<0.3),l.strikeShip=z?z.id:null}if(n.kind==="bomber"&&!C){l.phase="strike";let V=Xa(n.team,f,o,!1);if(V)A=CE(e,n,V,s,v,a);else Ne(-f[0],-f[2],0,v);let J=u.seatWeapons[0][0];if(!n.seats[1]&&J&&j[J].kind==="bomb")sm(n,S,null,o,s,0);b.boost=!1,U=null}else if(z){if(l.phase="strike",A=RE(e,n,z,s,v,h),h)E=_+(l.strikePhase==="egress"?150:110);U=null}else if(C&&P){l.phase="defend";let V=f[0]-P.position[0],J=f[2]-P.position[2];Ne(-J*l.breakSign,V*l.breakSign,x>600?-0.2:0.1,v),A=1,b.boost=!0;let Ge=fi(f,P.position),Ae=P.steered?Cc:1000+1500*l.skill;if(Ge<Ae&&n.flareCount>0&&n.flaresReadyAt<=s)S.flares=!0;E=Math.max(_+40,f[1]-30),U=R}else if(N){l.phase="defend";let V=p[0],J=p[2];Ne(V*0.3-J*l.breakSign,J*0.3+V*l.breakSign,x>700?-0.15:0.2,v),A=1,b.boost=!0,E=Math.max(_+50,f[1]-20),U=R}else if(R){if(l.phase!=="engage")l.engagedSince=s;if(l.phase="engage",A=PE(e,n,R,s,v,Z),h)E=qe(R.flight.position[1],_+60,_+600);U=R}else{if(l.phase="transit",s>=l.waypointUntil||Math.hypot(f[0]-l.waypoint[0],f[2]-l.waypoint[2])<(h?400:1000))IE(e,s,h,a.half);let V=l.waypoint,J=V[0]-f[0],Ge=V[2]-f[2],Ae=Math.sqrt(J*J+Ge*Ge);if(h)E=_+V[1],Ne(J,Ge,Ae>300?-0.3:0,v),b.boost=Ae>3000;else{let Vt=Math.max(V[1],_+450);Ne(J,Ge,qe(Math.atan2(Vt-f[1],2000),-0.3,0.35),v),b.boost=Ae>5000&&g<u.cruise*1.2}}if(l.phase!=="engage")l.engagedSince=-1;if((l.phase==="engage"||l.phase==="strike")&&n.kind!=="blackbird")Zi(e,v,l.phase==="strike"?0.4:1);let re=l.phase==="strike"&&(l.strikePhase==="approach"||n.kind==="bomber");if(Hp(v,f,p,a,re?Math.min(I,60):I,F,re?null:t.team,!h),!h&&g<u.stall*1.3)A=1,b.boost=!0;return $p(e,n,v,h,A,E,_,a,U)}function $p(e,t,n,i,s,r,a,o,l){let c=e.out,{flight:u,pilotSeat:h}=c,d=t.flight,f=d.velocity;if(ht(n),i){let p=Math.hypot(f[0],f[2]),m=Math.max(xE(d.position,n,p,o,4)+45,Qp(d.position,n[0],n[2],Math.max(p*5,300),30)),_=qe(Math.max(r,m),a+10,o.ceiling-300)-d.position[1];u.throttle=Math.abs(_)<6&&Math.abs(f[1])<1.5?0:qe(_*0.03-f[1]*0.2,-1,1)}else u.throttle=qe((s-d.throttle)*4,-1,1);if(!Number.isFinite(u.throttle))u.throttle=0;if(u.aim=n,e.state.gunAimSet)h.aim=c.pilotAim;else if(l){let p=l.flight.position,m=d.position;h.aim=ht(Ze(c.pilotAim,p[0]-m[0],p[1]-m[1],p[2]-m[2]))}else h.aim=It(c.pilotAim,n);return c.pilot}function PE(e,t,n,i,s,r){let{state:a,out:o}=e,{flight:l,pilotSeat:c}=o,u=K[t.kind],h=u.flight==="heli",d=t.flight,{position:f,velocity:p}=d,m=n.flight.position,g=n.flight.velocity,_=Ya,x=fi(f,m),b=m[0]-f[0],S=m[1]-f[1],v=m[2]-f[2],A=-((g[0]-p[0])*b+(g[1]-p[1])*S+(g[2]-p[2])*v)/Math.max(x,1),E=0.85,I=u.seatWeapons[0][0],F=u.seatWeapons[0][1],U=I?j[I]:null,P=U&&(U.kind==="gun"||U.kind==="rockets")?U:null,C=vE;if(P&&x<2500){or(f,p,m,g,P.speed,P.kind==="rockets"?sr:0,C);let B=hE(a.skill);ht(Ze(C,b/x*(1-B)+C[0]*B,S/x*(1-B)+C[1]*B,v/x*(1-B)+C[2]*B))}else ht(Ze(C,b,S,v));if(ar(e,C,i,_),t.kind==="blackbird"){let B=Math.sqrt(b*b+v*v);if(i<a.extendUntil||x<2200){if(i>=a.extendUntil)a.extendUntil=i+6+Me(e)*3;Ne(-b,-v,0.05,s),l.boost=!0,E=1}else if(x>6500)It(s,C),E=1,l.boost=x>9000;else{let N=Math.cos(0.7*a.breakSign),R=Math.sin(0.7*a.breakSign);Ne((b*N+v*R)/B,(-b*R+v*N)/B,qe(Math.atan2(S,B),-0.25,0.25),s),E=0.9}return E}if(h){let B=Math.sqrt(b*b+v*v);if(B>1400)Ne(b,v,-0.3,s),l.boost=B>3000;else if(B<550)Ne(-v*a.breakSign-b,b*a.breakSign-v,-0.3,s);else It(s,C),$c(s,qe(di(s),-0.35,0.3));E=0.8}else{if(It(s,C),x<200&&A>0)Ne(-v*a.breakSign,b*a.breakSign,0.4,s);if(x>3000)E=1,l.boost=!0;else if(x>1200)E=1;else if(x<600&&A>40)E=0.35,l.brake=A>80;else E=0.8}if(P&&x<=Gc(a.skill,P))or(f,p,m,g,P.speed,P.kind==="rockets"?sr:0,o.pilotAim),Zi(e,o.pilotAim,AE),a.gunAimSet=!0;if(r)return E;for(let B=0;B<2;B++){let N=B===0?I:F;if(!N)continue;let R=j[N],Z=t.weapons[0][B];if(!ji(Z,i))continue;if(R.kind==="gun"||R.kind==="rockets"){if(x>Gc(a.skill,R)||!a.gunAimSet)continue;or(f,p,m,g,R.speed,R.kind==="rockets"?sr:0,lr);let z=Math.atan2(K[n.kind].radius*(1.4+0.6*a.skill),x);if(cr(_,lr)<Rc*0.95&&cr(o.pilotAim,lr)<z&&tm(e,i))if(B===0)c.firePrimary=!0;else c.fireSecondary=!0}else if(R.kind==="missile_lock"){if(Z.lock<1||!Z.lockTarget||i-Wa(t)<Kp(a.skill))continue;if(B===0)c.firePrimary=!0;else c.fireSecondary=!0;a.lastMissileAt=i,t.botMissileAt=i}}return E}function sm(e,t,n,i,s,r=1){let a=e.flight,o=a.position;if($i(o,a.velocity,yt,qt)<0)return;if(n)ht(Ze(n,yt[0]-o[0],yt[1]-o[1],yt[2]-o[2]));if(!ji(e.weapons[r][0],s))return;let l=lt();for(let c=0;c<l.length;c++){let u=l[c];if(u.team===e.team||i?.[u.id]?.sunk)continue;let h=xe[u.kind],d=yt[0]-u.position[0],f=yt[2]-u.position[2],p=Math.cos(u.heading),m=Math.sin(u.heading),g=d*p-f*m,_=d*m+f*p;if(Math.abs(g)<=h.halfWidth*0.9&&Math.abs(_)<=h.halfLength*0.9){t.firePrimary=!0;return}}}function qp(e,t,n,i,s){if(!i)return;let r=null;for(let l=0;l<i.length;l++){let c=i[l];if(c.weapon==="bomb"&&c.owner===e.id&&(!r||c.id>r.id))r=c}if(!r)return;let a=r.position;if($i(a,r.velocity,yt,qt)<0)return;let o=Xa(e.team,yt,s,!1);if(!o||Math.hypot(o.position[0]-yt[0],o.position[2]-yt[2])>600)return;ht(Ze(n,o.position[0]-a[0],xe[o.kind].deckHeight-a[1],o.position[2]-a[2])),t.aim=n,t.steerBomb=!0}function LE(e,t,n){for(let i=0;i<n.length;i++){let s=n[i];if(s.steered&&s.vehicle===t.id&&s.owner===e.id&&s.scanTarget)return s}return null}function FE(e,t,n,i,s,r,a){let{state:o,out:l}=e,c=K[n.kind],u=n.flight,{position:h,velocity:d}=u,f=hr(u.orientation,Ya),p=qa(l.gunnerSeat,l.gunnerAim,f),m=l.gunnerAim,g=c.seatWeapons[1],_=la(n.team,h);if(g[0]&&j[g[0]].kind==="bomb"){sm(n,p,m,a,s);return}let x=!1,b=0;for(let C=0;C<2;C++){let B=g[C];if(!B)continue;if(j[B].kind==="pulse")x=!0;b=Math.max(b,Wc(j[B]))}if(x&&n.abilityReadyAt<=s)for(let C=0;C<i.length;C++){let B=i[C];if(B.alive&&B.team!==n.team&&B.spottedUntil<=s&&fi(h,B.flight.position)<Xp){p.ability=!0;break}}let S=null;if(r){let C=LE(t,n,r);if(C)o.guideTargetId=C.scanTarget??null,o.guideUntil=s+0.5;else if(s-o.lastMissileAt>0.5)o.guideUntil=Math.min(o.guideUntil,s)}if(s<o.guideUntil){if(S=Hc(i,o.guideTargetId),S&&!S.alive)S=null}if(S){let C=S.flight.position;Zi(e,ht(Ze(m,C[0]-h[0],C[1]-h[1],C[2]-h[2])));return}let v=Hc(i,o.targetId);if(s>=o.retargetAt||v&&!ur(v,n.team,s))v=Jp(n,i,s,b,o.targetId),o.targetId=v?v.id:null,o.retargetAt=s+0.6+(1-o.skill)*1.5+Me(e)*0.4;if(!v||!ur(v,n.team,s)){if(!nm(n.kind,1))return;let C=Xa(n.team,h,a,!1);if(!C)return;let B=C.position[0]-h[0],N=C.position[2]-h[2];if(Math.hypot(B,N)>Vc+300)return;ht(Ze(m,B,xe[C.kind].deckHeight*0.6-h[1],N)),ar(e,m,s,f);for(let R=0;R<2;R++){let Z=g[R],z=n.weapons[1][R];if(!Z||j[Z].kind!=="missile_lock"||_)continue;if(ji(z,s)&&z.lock>=1&&z.lockTarget?.startsWith("ship:")&&Ha(f,h,C.position)<1.1&&s-Wa(n)>1.5){if(R===0)p.firePrimary=!0;else p.fireSecondary=!0;o.lastMissileAt=s,n.botMissileAt=s}}return}em(v,n.id,s);let A=v.flight.position,E=v.flight.velocity,I=fi(h,A),F=!_,U=Ha(f,h,A),P=!1;for(let C=0;C<2;C++){let B=g[C];if(!B)continue;let N=j[B],R=n.weapons[1][C],Z=Wc(N);if(N.kind==="gun"&&I<=Gc(o.skill,N)&&!P){or(h,d,A,E,N.speed,0,m),ar(e,m,s,f),Zi(e,m),P=!0,or(h,d,A,E,N.speed,0,lr),Lc(n,B,m,Wp);let z=Math.atan2(K[v.kind].radius*(0.8+0.4*o.skill),I);if(F&&ji(R,s)&&cr(Wp,lr)<z&&tm(e,s))if(C===0)p.firePrimary=!0;else p.fireSecondary=!0}else if((N.kind==="missile_lock"||N.kind==="missile_scanner")&&I<=Z&&I>300){if(!P)ht(Ze(m,A[0]-h[0],A[1]-h[1],A[2]-h[2])),ar(e,m,s,f),Zi(e,m),P=!0;if(F&&ji(R,s)&&R.lock>=1&&R.lockTarget===v.id&&U<(N.kind==="missile_scanner"?0.9:1.1)&&s-Wa(n)>Kp(o.skill)){if(C===0)p.firePrimary=!0;else p.fireSecondary=!0;if(o.lastMissileAt=s,n.botMissileAt=s,N.kind==="missile_scanner")o.guideTargetId=v.id,o.guideUntil=s+Math.min(N.ttl,I/N.speed*2+2)}}}if(!P)ht(Ze(m,A[0]-h[0],A[1]-h[1],A[2]-h[2])),ar(e,m,s,f),Zi(e,m);if(!x&&n.abilityReadyAt<=s&&v.spottedUntil<=s&&I<4000&&Ha(m,h,A)<0.06)p.ability=!0}var DE=0.25,UE=Math.round(If/Nf),rm=3,BE=20,OE=60,kE=8,am=15,VE=8,GE=2,zE=1,HE=4,WE=2,$E=180,qE=4,XE=10,om=1,qc=1,YE=200,lm=4,KE=1.5,cm=16,um=800,ZE=0.3,hm=16;function jE(){return{target:GE,offset:0,primed:!1,streak:0,starveRun:0,windowTicks:0,windowMinSlack:1/0,windowUnderruns:0,synthesized:0,caughtUp:0,dropped:0,late:0}}var QE=5,JE=0.5,ew=1,dm=["Viper","Maverick","Iceman","Goose","Phoenix","Hangman","Rooster","Payback","Fanboy","Jester","Cougar","Merlin","Slider","Hollywood","Wolfman","Sundown","Chipper","Stinger","Ghost","Raven","Talon","Havoc","Nomad","Reaper","Saber","Banshee","Comet","Falcon","Outlaw","Spectre"],fm=qt.deckVelocity?qt:{...qt,deckVelocity:aa},kn={aim:null,firePrimary:!1,fireSecondary:!1,flares:!1,ability:!1};function Xc(e,t=zi){let n=e&&typeof e==="object"?e:{},i=(r,a,o,l)=>typeof r==="number"&&Number.isFinite(r)?Math.min(o,Math.max(a,Math.round(r))):l,s=typeof n.name==="string"?ja(n.name,32):"";return{teams:i(n.teams,2,4,t.teams),bots:i(n.bots,0,10,t.bots),maxPerTeam:i(n.maxPerTeam,1,16,t.maxPerTeam),scoreLimit:i(n.scoreLimit,1,1000,t.scoreLimit),timeLimit:i(n.timeLimit,60,7200,t.timeLimit),listed:typeof n.listed==="boolean"?n.listed:t.listed,name:s||t.name,...tw(n,t)}}function tw(e,t){let n={},i=typeof e.botSkill==="number"&&Number.isFinite(e.botSkill)?e.botSkill:t.botSkill;if(i!==void 0)n.botSkill=Math.min(1,Math.max(0,i));let s=typeof e.botFill==="number"&&Number.isFinite(e.botFill)?e.botFill:t.botFill;if(s!==void 0)n.botFill=Math.min(16,Math.max(0,Math.round(s)));return n}function nw(e){let t=2166136261;for(let n=0;n<e.length;n++)t=Math.imul(t^e.charCodeAt(n),16777619);return t>>>0}function ja(e,t){return e.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g," ").replace(/\s+/g," ").trim().slice(0,t)}function pm(e,t){return typeof e==="number"&&Number.isInteger(e)&&e>=0&&e<t}function mm(e){return e===0||e===1}var Ka=(e)=>typeof e==="number"&&Number.isFinite(e)?Math.max(-1,Math.min(1,e)):null;function _m(e){if(e===null||e===void 0)return null;if(!Array.isArray(e)||e.length!==3)return;let[t,n,i]=e;if(typeof t!=="number"||typeof n!=="number"||typeof i!=="number")return;if(!Number.isFinite(t)||!Number.isFinite(n)||!Number.isFinite(i))return;let s=Math.hypot(t,n,i);if(s<0.000001)return;return[t/s,n/s,i/s]}function iw(e){if(!e||typeof e!=="object")return;let t=e,n=_m(t.aim),i=Ka(t.throttle??0),s=Ka(t.roll??0),r=Ka(t.yaw??0),a=Ka(t.pitch??0);if(n===void 0||i===null||s===null||r===null||a===null)return;return{aim:n,throttle:i,roll:s,yaw:r,pitch:a,boost:t.boost===!0,brake:t.brake===!0}}function sw(e){if(!e||typeof e!=="object")return;let t=e,n=_m(t.aim);if(n===void 0)return;let i={aim:n,firePrimary:t.firePrimary===!0,fireSecondary:t.fireSecondary===!0,flares:t.flares===!0,ability:t.ability===!0};if(typeof t.viewDelay==="number"&&Number.isFinite(t.viewDelay))i.viewDelay=Math.min(ZE,Math.max(0,t.viewDelay));if(t.steerBomb===!0)i.steerBomb=!0;return i}function rw(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}class Yc{code;config;hooks;time=0;tick=0;vehicles=[];players=new Map;scores;combat=Ic();matchStartedAt=0;matchEndedAt=null;winner=null;accumulator=0;nextId=1;meta=new Map;events=[];lastPlayersJson="";lastPlayersAt=-1/0;decoders=new Map;teamKills;cratersSent=0;lastShipsJson="";lastShipsAt=-1/0;rng;botNames=0;lastBotSync=-1/0;constructor(e,t,n){this.code=e;this.config=t;this.hooks=n;this.config=Xc(t),this.scores=Array(this.config.teams).fill(0),this.teamKills=Array(this.config.teams).fill(0),this.rng=rw(nw(e)),this.syncBots()}addPlayer(e,t){let n=`p${this.nextId++}`,i=this.balancedTeam(null);return this.players.set(n,this.newPlayer(n,ja(String(e??""),cm)||"Pilot",i,!1)),t?.(n),this.hooks.send(n,{type:"welcome",playerId:n,room:this.code,config:{...this.config}}),this.syncBots(),this.hooks.onChange?.(),n}removePlayer(e){let t=this.players.get(e);if(!t)return;if(this.leaveTurret(t.info),this.vacate(t.info),this.players.delete(e),this.decoders.delete(e),!t.info.bot)this.syncBots(),this.hooks.onChange?.()}newPlayer(e,t,n,i){return{info:{id:e,name:t,team:n,vehicleId:null,seat:null,kills:0,deaths:0,bot:i,respawnAt:0,turret:null},flight:mn,seat:kn,queue:[],jitter:jE(),seq:-1,ack:-1,lastInputAt:-1/0,chatTokens:lm,chatAt:this.time,needsPlayers:!i,brain:null,leaving:!1}}humanCount(){let e=0;for(let t of this.players.values())if(!t.info.bot)e++;return e}playerCount(){return this.players.size}botCount(){return this.players.size-this.humanCount()}summary(){return{code:this.code,name:this.config.name,teams:this.config.teams,players:this.playerCount(),humans:this.humanCount(),maxPlayers:this.config.teams*this.config.maxPerTeam}}isFull(){return this.humanCount()>=this.config.teams*this.config.maxPerTeam}teamCounts(e){let t=Array(this.config.teams).fill(0);for(let n of this.players.values())if(!n.info.bot&&n.info.id!==e)t[n.info.team]++;return t}balancedTeam(e){let t=this.teamCounts(e),n=0;for(let i=1;i<t.length;i++)if(t[i]<t[n])n=i;return n}wantedBots(e,t){let n=Math.max(0,this.config.maxPerTeam-t[e]),i=this.config.botFill;if(i!==void 0&&i>0)return t.reduce((r,a)=>r+a,0)>=i?0:Math.min(n,Math.max(0,i-t[e]));return Math.min(n,this.config.bots)}addBot(e){let t=`b${this.nextId++}`,n=this.newPlayer(t,`${dm[this.botNames++%dm.length]} [AI]`,e,!0);return n.brain=Yp(Math.floor(this.rng()*4294967296),this.config.botSkill??JE),n.info.respawnAt=this.time+0.5+this.rng()*2,this.players.set(t,n),t}syncBots(){this.lastBotSync=this.time;let e=this.teamCounts(null);for(let t=0;t<this.config.teams;t++){let n=this.wantedBots(t,e),i=[...this.players.values()].filter((r)=>r.info.bot&&r.info.team===t),s=i.filter((r)=>!r.leaving);if(s.length<n){let r=n-s.length;for(let a of i)if(a.leaving&&r>0)a.leaving=!1,r--;for(let a=0;a<r;a++)this.addBot(t)}else if(s.length>n){let r=(a)=>a.info.vehicleId===null?0:a.info.seat===1?1:2;s.sort((a,o)=>r(a)-r(o));for(let a=0;a<s.length-n;a++)s[a].leaving=!0}}this.retireBots()}retireBots(){for(let e of[...this.players.values()]){if(!e.info.bot||!e.leaving)continue;let t=this.vehicleOf(e.info);if(!t||!t.alive){this.removePlayer(e.info.id);continue}if(!this.canLeave(t))continue;let n=t.seats[e.info.seat===0?1:0];if(this.removePlayer(e.info.id),!n)this.removeVehicleQuietly(t)}}removeVehicleQuietly(e){let t=this.meta.get(e.id);if(e.alive=!1,t)t.diedAt=-1/0}evictBot(e){this.vacate(e.info),e.info.respawnAt=Math.max(e.info.respawnAt,this.time+1)}updateBots(){if(this.time-this.lastBotSync>=ew)this.syncBots();else this.retireBots();if(this.matchEndedAt!==null)return;let e=this.time;for(let t of this.players.values()){let n=t.info;if(!n.bot||t.leaving||n.vehicleId||e<n.respawnAt)continue;let i=this.vehicles.find((a)=>{if(!a.alive||a.team!==n.team||a.seats[1]||!a.seats[0])return!1;let o=this.players.get(a.seats[0]);return!!o&&!o.info.bot&&e-this.meta.get(a.id).gunnerEmptySince>=QE});if(i){this.seatPlayer(n,i,1);continue}let s=[];for(let a of this.players.values())if(a.info.team===n.team&&a.info.id!==n.id)s.push(a.info);let r=jp(n,s,this.vehicles,this.rng);if(!K[r])r=Kn[Math.floor(this.rng()*Kn.length)];this.spawnVehicle(n,r)}}canJoinTeam(e,t){let n=this.teamCounts(e);return n[t]<this.config.maxPerTeam&&n[t]<=Math.min(...n)}handle(e,t){let n=this.players.get(e);if(!n||n.info.bot||!t||typeof t!=="object")return;let i=t;switch(i.type){case"ping":if(typeof i.t==="number"&&Number.isFinite(i.t))this.hooks.send(e,{type:"pong",t:i.t});return;case"input":return this.onInput(n,i);case"hello":{if(typeof i.name==="string")n.info.name=ja(i.name,cm)||n.info.name;if(pm(i.team,this.config.teams)&&i.team!==n.info.team&&this.canJoinTeam(e,i.team))this.setTeam(n,i.team);this.hooks.onChange?.();return}case"team":if(!pm(i.team,this.config.teams)||i.team===n.info.team)return;if(!this.canJoinTeam(e,i.team))return this.error(e,"That team is full.");this.setTeam(n,i.team),this.hooks.onChange?.();return;case"spawn":return this.onSpawn(n,i.kind);case"man-turret":return this.onManTurret(n,i.ship,i.turret);case"board":return this.onBoard(n,i.vehicle,i.seat);case"switch-seat":return this.onSwitchSeat(n,i.seat);case"leave-vehicle":{if(n.info.turret){this.leaveTurret(n.info);return}let s=this.vehicleOf(n.info);if(s&&s.alive&&!this.canLeave(s))return this.error(e,"You can only bail out at base.");this.vacate(n.info);return}case"chat":return this.onChat(n,i.text)}}error(e,t){this.hooks.send(e,{type:"error",message:t})}onInput(e,t){let n=t.seq;if(typeof n!=="number"||!Number.isSafeInteger(n)||n<0||n<=e.seq)return;if(n<=e.ack){e.jitter.streak=n===e.seq+1?e.jitter.streak+1:0,e.seq=n,e.jitter.late++;return}let i={seq:n,at:this.tick};if(t.flight!==void 0){if(i.flight=iw(t.flight),!i.flight)return}if(t.seat!==void 0){if(i.seat=sw(t.seat),!i.seat)return}e.jitter.streak=n===e.seq+1?e.jitter.streak+1:0,e.seq=n,e.lastInputAt=this.time,e.queue.push(i);while(e.queue.length>VE)this.consume(e,e.queue.shift()),e.jitter.dropped++}consumeTick(e){let{jitter:t,queue:n}=e;while(n.length&&n[0].seq<=e.ack)n.shift(),t.late++;if(!t.primed){if(!n.length)return;t.offset=n[0].at-n[0].seq+t.target,t.primed=!0,t.starveRun=0}if(++t.windowTicks>=$E){if(t.windowUnderruns===0&&t.windowMinSlack>=1&&t.windowMinSlack!==1/0){if(t.target>zE)t.target--;t.offset--}t.windowTicks=0,t.windowMinSlack=1/0,t.windowUnderruns=0}if(n.length>t.target+WE)t.offset--,t.caughtUp++;let i=this.tick-t.offset,s=0;while(s<2&&n.length&&n[0].seq<=i){let r=n.shift(),a=n[0];if(s===0&&a&&a.seq<=i&&r.seat&&a.seat)a.seat={...a.seat,flares:a.seat.flares||r.seat.flares,ability:a.seat.ability||r.seat.ability};this.consume(e,r),s++}if(s){if(t.starveRun=0,n.length<t.windowMinSlack)t.windowMinSlack=n.length;return}if(e.ack>=i)return;if(t.starveRun===0)t.windowUnderruns++;if(t.starveRun<qE&&e.ack>=0&&t.streak>=XE&&this.time-e.lastInputAt<=qc){if(t.starveRun++,t.synthesized++,e.ack++,t.windowMinSlack=0,(t.starveRun>=2||t.windowUnderruns>=2)&&t.target<HE)t.target++,t.offset++,t.windowUnderruns=0}else t.starveRun=0,t.primed=!1}consume(e,t){if(t.flight)e.flight=t.flight;if(t.seat)e.seat=t.seat;e.ack=t.seq}onChat(e,t){if(typeof t!=="string")return;let n=ja(t,YE);if(!n)return;if(e.chatTokens=Math.min(lm,e.chatTokens+(this.time-e.chatAt)/KE),e.chatAt=this.time,e.chatTokens<1)return this.error(e.info.id,"You're sending messages too fast.");e.chatTokens-=1,this.events.push({type:"chat",player:e.info.id,text:n})}setTeam(e,t){this.vacate(e.info),this.leaveTurret(e.info),e.info.team=t,this.syncBots()}onSpawn(e,t){if(typeof t!=="string"||!Kn.includes(t))return this.error(e.info.id,"Unknown aircraft kind.");if(this.matchEndedAt!==null)return this.error(e.info.id,"Match over — next round starting soon.");if(this.time<e.info.respawnAt)return this.error(e.info.id,"Respawn not ready.");let n=this.vehicleOf(e.info);if(n&&n.alive&&!this.canLeave(n))return this.error(e.info.id,"Return to base to change aircraft.");if(!this.spawnCarrier(e.info.team))return this.error(e.info.id,"Your carriers have been sunk.");this.vacate(e.info),this.leaveTurret(e.info),this.spawnVehicle(e.info,t)}onManTurret(e,t,n){if(typeof t!=="string"||typeof n!=="string")return;let i=Ce.find((o)=>o.id===t),s=i?xe[i.kind].turrets.find((o)=>o.id===n):void 0;if(!i||!s||i.team!==e.info.team||i.team>=this.config.teams||!s.mannable)return this.error(e.info.id,"Can't man that turret.");if(this.matchEndedAt!==null)return this.error(e.info.id,"Match over — next round starting soon.");if(this.time<e.info.respawnAt)return this.error(e.info.id,"Respawn not ready.");if(!za(this.combat,t,n))return this.error(e.info.id,"That turret is knocked out.");let r=xt(this.combat,t).turrets[n];if(r.manned&&r.manned!==e.info.id)return this.error(e.info.id,"That turret is already manned.");let a=this.vehicleOf(e.info);if(a&&a.alive&&!this.canLeave(a))return this.error(e.info.id,"Return to base first.");this.vacate(e.info),this.leaveTurret(e.info),r.manned=e.info.id,e.info.turret={ship:t,turret:n},e.seat=kn}leaveTurret(e){let t=e.turret;if(!t)return;let n=xt(this.combat,t.ship)?.turrets[t.turret];if(n&&n.manned===e.id)n.manned=null;e.turret=null}spawnCarrier(e){for(let t of Ce){if(t.team!==e||t.kind!=="carrier")continue;let n=xt(this.combat,t.id);if(n&&!n.sunk)return t.id}return null}spawnAt(e,t,n){let i=th(e,t,n),s=this.spawnCarrier(e),r=Ls(e);if(!s||s===r.id)return i;let a=un(s);if(!a)return i;let o=Ni(r,i.position);return{...i,position:Yr(a,o),yaw:i.yaw+a.heading-r.heading}}spawnVehicle(e,t){this.syncFleet();let n=e.team,i=0;for(let o=0;o<hm;o++){let l=this.spawnAt(n,t,o).position;if(!this.vehicles.some((u)=>u.alive&&Math.hypot(u.flight.position[0]-l[0],u.flight.position[1]-l[1],u.flight.position[2]-l[2])<25)){i=o;break}i=o+1}let s=K[t],r={id:`v${this.nextId++}`,kind:t,team:n,flight:Ff(t,this.spawnAt(n,t,i%hm)),hp:s.maxHp,maxHp:s.maxHp,seats:[e.id,null],aim:[null,null],weapons:dp(t),flaresReadyAt:0,flareCount:s.flares,abilityReadyAt:0,spottedUntil:0,lastDamagedBy:null,alive:!0};this.vehicles.push(r),this.meta.set(r.id,{emptySince:null,lastHp:r.hp,lastHitAt:-1/0,diedAt:null,gunnerEmptySince:this.time}),hp(r,this.time),e.vehicleId=r.id,e.seat=0;let a=this.players.get(e.id);if(a)a.flight=mn,a.seat=kn;return r}onBoard(e,t,n){if(typeof t!=="string"||!mm(n))return;let i=this.vehicles.find((a)=>a.id===t);if(!i||!i.alive||i.team!==e.info.team)return this.error(e.info.id,"Can't board that aircraft.");if(this.time<e.info.respawnAt)return this.error(e.info.id,"Respawn not ready.");if(e.info.vehicleId===i.id)return this.onSwitchSeat(e,n);let s=this.vehicleOf(e.info);if(s&&s.alive&&!this.canLeave(s))return;let r=i.seats[n]?this.players.get(i.seats[n]):void 0;if(i.seats[n]&&!r?.info.bot)return this.error(e.info.id,"Seat taken.");if(this.vacate(e.info),r){this.evictBot(r);let a=1-n;if(n===0&&!i.seats[a]&&!r.leaving)this.seatPlayer(r.info,i,a)}this.seatPlayer(e.info,i,n)}onSwitchSeat(e,t){if(!mm(t))return;let n=this.vehicleOf(e.info);if(!n||!n.alive||e.info.seat===t)return;let i=n.seats[t]?this.players.get(n.seats[t]):void 0;if(n.seats[t]&&!i?.info.bot)return this.error(e.info.id,"Seat taken.");let s=e.info.seat;if(n.seats[s]=null,n.aim[s]=null,s===1)this.meta.get(n.id).gunnerEmptySince=this.time;if(i){if(this.evictBot(i),s===1)this.seatPlayer(i.info,n,1)}this.seatPlayer(e.info,n,t)}seatPlayer(e,t,n){if(t.seats[n]=e.id,e.vehicleId=t.id,e.seat=n,n===1){let s=this.meta.get(t.id);if(s)s.gunnerEmptySince=1/0}let i=this.players.get(e.id);if(i)i.flight=mn,i.seat=kn}vacate(e){let t=this.vehicleOf(e);if(t&&e.seat!==null&&t.seats[e.seat]===e.id){if(t.seats[e.seat]=null,t.aim[e.seat]=null,e.seat===1){let i=this.meta.get(t.id);if(i)i.gunnerEmptySince=this.time}}e.vehicleId=null,e.seat=null;let n=this.players.get(e.id);if(n)n.flight=mn,n.seat=kn}vehicleOf(e){return e.vehicleId?this.vehicles.find((t)=>t.id===e.vehicleId):void 0}canLeave(e){return this.onOwnDeck(e)||this.time-(e.spawnedAt??-1/0)<Xr}onOwnDeck(e){if(!e.flight.onGround)return!1;let t=xe.carrier;this.syncFleet();for(let n of Ce){if(n.team!==e.team||n.kind!=="carrier")continue;let i=xt(this.combat,n.id),s=un(n.id);if(!s||i&&i.sunk)continue;let r=Ni(s,e.flight.position);if(Math.abs(r[0])<=t.halfWidth+2&&Math.abs(r[2])<=t.halfLength+2&&r[1]>=t.deckHeight-2&&r[1]<=t.deckHeight+10)return!0}return!1}advance(e){if(!Number.isFinite(e)||e<=0)return;this.accumulator+=Math.min(e,DE);while(this.accumulator>=_e-0.000000001){if(this.accumulator-=_e,this.step(),this.events.length)this.flushEvents();if(this.tick%UE===0)this.broadcastSnapshot()}if(this.accumulator<0)this.accumulator=0}step(){this.tick++,this.time=this.tick*_e,this.syncFleet();let e=this.time,t=this.events,n=this.vehicles;for(let s of this.players.values()){if(s.info.bot)continue;this.consumeTick(s)}for(let s of n){if(!s.alive)continue;for(let r=0;r<2;r++){let a=s.seats[r],o=a?this.players.get(a):void 0;if(!o||!o.brain)continue;let l=im(o.brain,o.info,s,n,e,this.combat.missiles,fm,this.combat.ships,this.combat.projectiles);if(o.seat={...l.seat,aim:l.seat.aim&&[l.seat.aim[0],l.seat.aim[1],l.seat.aim[2]]},r===0)o.flight=l.flight?{...l.flight,aim:l.flight.aim&&[l.flight.aim[0],l.flight.aim[1],l.flight.aim[2]]}:mn;o.lastInputAt=e}}for(let s of n){if(!s.alive)continue;let r=s.seats[0]?this.players.get(s.seats[0]):void 0;Df(s.flight,r?r.flight:mn,_e,fm);for(let a=0;a<2;a++){let o=a,l=s.seats[o],c=l?this.players.get(l):void 0;if(!c)continue;let u=e-c.lastInputAt>qc?{...c.seat,firePrimary:!1,fireSecondary:!1,flares:!1,ability:!1}:c.seat;s.aim[o]=u.aim,vp(this.combat,s,o,u,n,e,t)}}for(let s of this.players.values()){let r=s.info.turret;if(!r)continue;let a=e-s.lastInputAt>qc?{...s.seat,firePrimary:!1}:s.seat;Pp(this.combat,r.ship,r.turret,s.info.id,a,e,t)}let i=t.length;Tp(this.combat,n,_e,e,t);for(let s of this.players.values()){let r=s.info.turret;if(!r||za(this.combat,r.ship,r.turret))continue;this.leaveTurret(s.info),s.info.deaths++,s.info.respawnAt=e+dc,s.seat=kn}for(let s of n){let r=this.meta.get(s.id);if(s.hp<r.lastHp)r.lastHitAt=e;if(r.lastHp=s.hp,s.alive&&s.flight.crashed)Ki(s,"crash",this.crashCredit(s,r),t)}for(let s of n){let r=this.meta.get(s.id);if(s.alive||r.diedAt!==null)continue;r.diedAt=e;let a;for(let l=i;l<t.length;l++){let c=t[l];if(c.type==="kill"&&c.victim===s.id){a=c;break}}let o=a?a.killer:this.crashCredit(s,r);if(!a)s.alive=!0,Ki(s,"crash",o,t);this.onVehicleDestroyed(s,o,a?.killerTeam)}if(this.cleanupVehicles(),this.updateBots(),this.matchEndedAt===null)this.updateScores();this.updateMatch()}crashCredit(e,t){return e.lastDamagedBy&&this.time-t.lastHitAt<=kE?e.lastDamagedBy:null}onVehicleDestroyed(e,t,n){for(let r=0;r<2;r++){let a=e.seats[r],o=a?this.players.get(a):void 0;if(o)o.info.deaths++,o.info.vehicleId=null,o.info.seat=null,o.info.respawnAt=this.time+dc,o.flight=mn,o.seat=kn;e.seats[r]=null}let i=t?this.players.get(t):void 0,s=i?i.info.team:t?this.vehicles.find((r)=>r.id===t)?.team:n;if(s===void 0||s===e.team)return;if(i)i.info.kills++;if(this.matchEndedAt!==null)return;this.teamKills[s]++}enemyFleetHp(e){let t=0;for(let n of Ce)if(n.team!==e&&n.team<this.config.teams)t+=xe[n.kind].maxHp;return t}updateScores(){let e=this.combat.shipDamageBy??[],t=!1;for(let n=0;n<this.config.teams;n++){let i=Math.round(1000*(e[n]??0)/Math.max(1,this.enemyFleetHp(n)))/10;if(i!==this.scores[n])this.scores[n]=i,t=!0}if(t)this.events.push({type:"score",scores:[...this.scores]})}cleanupVehicles(){let e=this.time,t=!1;for(let n of this.vehicles){let i=this.meta.get(n.id);if(!n.alive){if(i.diedAt!==null&&e-i.diedAt>=rm)t=!0;continue}if(!n.seats[0]&&n.seats[1]){let r=this.players.get(n.seats[1]);if(r?.info.bot)this.evictBot(r)}if(n.seats[0]||n.seats[1]){i.emptySince=null;continue}if(i.emptySince===null)i.emptySince=e;let s=e-i.emptySince;if(this.onOwnDeck(n)){if(s>=OE)n.alive=!1,i.diedAt=-1/0,t=!0}else if(s>=BE){let r=this.crashCredit(n,i);Ki(n,"crash",r,this.events),i.diedAt=e,this.onVehicleDestroyed(n,r)}}if(!t)return;for(let n=this.vehicles.length-1;n>=0;n--){let i=this.vehicles[n],s=this.meta.get(i.id);if(!i.alive&&s.diedAt!==null&&e-s.diedAt>=rm){for(let r of i.seats)if(r){let a=this.players.get(r);if(a)this.vacate(a.info)}this.vehicles.splice(n,1),this.meta.delete(i.id)}}}updateMatch(){let e=this.time;if(this.matchEndedAt!==null){if(e-this.matchEndedAt>=am)this.resetMatch();return}let t=[];for(let n=0;n<this.config.teams;n++)if(this.spawnCarrier(n))t.push(n);if(t.length<=1)return this.endMatch(t.length===1?t[0]:null,"carriers-sunk");if(e-this.matchStartedAt>=this.config.timeLimit){let n=this.combat.shipDamageBy??[],i=null,s=!1;for(let r of t){if(i===null){i=r;continue}let a=n[r]??0,o=n[i]??0;if(a>o+0.000001||Math.abs(a-o)<=0.000001&&this.teamKills[r]>this.teamKills[i])i=r,s=!1;else if(Math.abs(a-o)<=0.000001&&this.teamKills[r]===this.teamKills[i])s=!0}this.endMatch(s?null:i,"time")}}endMatch(e,t){this.matchEndedAt=this.time,this.winner=e,this.events.push({type:"match-end",winner:e,reason:t}),this.hooks.onChange?.()}resetMatch(){for(let e of this.players.values())e.info.vehicleId=null,e.info.seat=null,e.info.kills=0,e.info.deaths=0,e.info.respawnAt=e.info.bot?this.time+0.5+this.rng()*2:0,e.info.turret=null,e.flight=mn,e.seat=kn;this.vehicles.length=0,this.meta.clear(),this.combat=Ic(),this.scores=Array(this.config.teams).fill(0),this.teamKills=Array(this.config.teams).fill(0),this.cratersSent=0,this.lastShipsJson="",this.matchStartedAt=this.time,this.matchEndedAt=null,this.winner=null,this.events.push({type:"score",scores:[...this.scores]}),this.hooks.onChange?.()}matchTime(){return this.matchEndedAt!==null?0:Math.max(0,this.time-this.matchStartedAt)}syncFleet(){Wu(this.matchTime(),this.config.teams),qu(this.shipStates(),this.time)}matchEndsAt(){return this.matchEndedAt!==null?this.matchEndedAt+am:this.matchStartedAt+this.config.timeLimit}flushEvents(){let e=this.events;this.events=[];let t={type:"events",events:e};if(this.hooks.sendText){let n=JSON.stringify(t);for(let i of this.players.values())if(!i.info.bot)this.hooks.sendText(i.info.id,n)}else for(let n of this.players.values())if(!n.info.bot)this.hooks.send(n.info.id,t)}snapshotFor(e){let t=Qa(),n=this.players.get(e),i=this.wireShared(!0);if(n)i.vehicles=i.vehicles.filter((s,r)=>this.visibleTo(n.info.team,this.vehicles[r]));return t({...i,...this.wirePersonal(n??null,!1)})}visibleTo(e,t){if(t.team===e||!ir(t,this.time))return!0;let n=t.flight.position,i=um*um;for(let s of this.vehicles){if(!s.alive||s.team!==e)continue;let r=s.flight.position,a=n[0]-r[0],o=n[1]-r[1],l=n[2]-r[2];if(a*a+o*o+l*l<i)return!0}for(let s of lt()){if(s.team!==e||xt(this.combat,s.id)?.sunk)continue;let r=n[0]-s.position[0],a=n[1]-20,o=n[2]-s.position[2];if(r*r+a*a+o*o<i)return!0}return!1}wireShared(e){let t=this.combat,n=this.time,i={type:"snapshot",wire:1,time:je(n),tick:this.tick,vehicles:this.vehicles.map((s)=>aw(s,n)),projectiles:t.projectiles.map(lw),missiles:t.missiles.map(cw),flares:t.flares.map(uw),scores:this.scores,matchEndsAt:je(this.matchEndsAt()),matchStartedAt:je(this.matchStartedAt),intermission:this.matchEndedAt!==null};if(e)i.players=this.playerList(),i.ships=this.shipStates(),i.craters=(t.craters??[]).slice();return i}shipStates(){let e=[];for(let t of Ce){if(t.team>=this.config.teams)continue;let n=xt(this.combat,t.id);if(!n)continue;let i={};for(let s in n.turrets)i[s]={hp:Math.round(n.turrets[s].hp),manned:n.turrets[s].manned};e.push({id:t.id,hp:Math.round(n.hp),maxHp:n.maxHp,sunk:n.sunk,sunkAt:pi(n.sunkAt),turrets:i,damage:n.damage.map((s)=>[s[0],s[1],s[2]])})}return e}playerList(){return[...this.players.values()].map((e)=>({...e.info,respawnAt:pi(e.info.respawnAt)}))}wirePersonal(e,t){let n={ack:e?e.ack:-1},i=e?this.vehicleOf(e.info):void 0;if(i)n.own=ow(i);if(t)n.players=this.playerList(),n.ships=this.shipStates(),n.craters=(this.combat.craters??[]).slice();return n}broadcastSnapshot(){if(this.humanCount()===0)return;let e=this.playerList(),t=JSON.stringify(e),n=t!==this.lastPlayersJson||this.time-this.lastPlayersAt>=om;if(n)this.lastPlayersJson=t,this.lastPlayersAt=this.time;let i=this.wireShared(!1);if(n)i.players=e;let s=this.shipStates(),r=JSON.stringify(s);if(r!==this.lastShipsJson||this.time-this.lastShipsAt>=om)this.lastShipsJson=r,this.lastShipsAt=this.time,i.ships=s;let a=this.combat.craters??[];if(a.length>this.cratersSent)i.craters=a.slice(this.cratersSent),this.cratersSent=a.length;let o=i.vehicles.map((m)=>JSON.stringify(m)),{vehicles:l,...c}=i,u=`${JSON.stringify(c).slice(0,-1)},"vehicles":`,h=`[${o.join(",")}]`,d=this.vehicles.some((m)=>ir(m,this.time)),f=new Map,p=(m)=>{if(!d)return h;let g=f.get(m);if(g===void 0)g=`[${o.filter((_,x)=>this.visibleTo(m,this.vehicles[x])).join(",")}]`,f.set(m,g);return g};for(let m of this.players.values()){if(m.info.bot)continue;let g=this.wirePersonal(m,m.needsPlayers);m.needsPlayers=!1;let _=`${u}${p(m.info.team)},${JSON.stringify(g).slice(1)}`;if(this.hooks.sendText)this.hooks.sendText(m.info.id,_);else{let x=this.decoders.get(m.info.id);if(!x)this.decoders.set(m.info.id,x=Qa());this.hooks.send(m.info.id,x(JSON.parse(_)))}}}}var pi=(e)=>Math.round(e*100)/100,je=(e)=>Math.round(e*1000)/1000,Za=(e)=>Math.round(e*1e4)/1e4,bn=(e)=>[pi(e[0]),pi(e[1]),pi(e[2])],gm=(e)=>[je(e[0]),je(e[1]),je(e[2])];function aw(e,t){let n=e.flight,i=n.orientation,s={id:e.id,k:e.kind,t:e.team,p:bn(n.position),v:bn(n.velocity),q:[Za(i[0]),Za(i[1]),Za(i[2]),Za(i[3])],w:bn(n.angularVelocity),th:pi(n.throttle),hp:Math.round(e.hp*10)/10,s:e.seats,am:[e.weapons[0].map((r)=>r.ammo),e.weapons[1].map((r)=>r.ammo)],fc:e.flareCount};if(n.onGround)s.g=1;if(n.gearDown)s.gd=1;if(n.crashed)s.c=n.crashed;if(e.aim[0]||e.aim[1])s.a=[e.aim[0]&&gm(e.aim[0]),e.aim[1]&&gm(e.aim[1])];if(e.spottedUntil>t)s.su=pi(e.spottedUntil);if(!e.alive)s.d=1;return s}function ow(e){let t=(n)=>({ammo:n.ammo,readyAt:je(n.readyAt),lockTarget:n.lockTarget,lock:je(n.lock)});return{vehicle:e.id,ft:e.flight.tick,weapons:[e.weapons[0].map(t),e.weapons[1].map(t)],fr:je(e.flaresReadyAt),ar:je(e.abilityReadyAt),ld:e.lastDamagedBy,...e.spotProgress!==void 0?{sp:je(e.spotProgress)}:{},...e.spotCandidate!==void 0?{sc:e.spotCandidate}:{}}}function lw(e){return{id:e.id,w:e.weapon,o:e.owner,vh:e.vehicle,t:e.team,p:bn(e.position),v:bn(e.velocity),a:je(e.age),l:je(e.ttl)}}function cw(e){let t={id:e.id,w:e.weapon,o:e.owner,vh:e.vehicle,t:e.team,p:bn(e.position),v:bn(e.velocity),a:je(e.age),l:je(e.ttl),tg:e.target};if(e.steered)t.st=1;if(e.seat!==void 0)t.se=e.seat;return t}function uw(e){return{id:e.id,vh:e.vehicle,p:bn(e.position),v:bn(e.velocity),a:je(e.age),l:je(e.ttl)}}function Qa(){let e=[],t;return(n)=>{if(n.type!=="snapshot"||!("wire"in n))return n;let i=n;if(i.players)e=i.players;if(i.ships)t=i.ships;let s=i.own;return{type:"snapshot",time:i.time,tick:i.tick,vehicles:i.vehicles.map((r)=>{let a=s&&s.vehicle===r.id?s:null,o={id:r.id,kind:r.k,team:r.t,flight:{kind:r.k,position:r.p,velocity:r.v,orientation:r.q,angularVelocity:r.w,throttle:r.th,onGround:r.g===1,gearDown:r.gd===1,crashed:r.c??null,tick:a?a.ft:i.tick},hp:r.hp,maxHp:K[r.k]?.maxHp??r.hp,seats:r.s,aim:r.a??[null,null],weapons:a?a.weapons:[r.am[0].map((l)=>({ammo:l,readyAt:0,lockTarget:null,lock:0})),r.am[1].map((l)=>({ammo:l,readyAt:0,lockTarget:null,lock:0}))],flaresReadyAt:a?a.fr:0,flareCount:r.fc,abilityReadyAt:a?a.ar:0,spottedUntil:r.su??0,lastDamagedBy:a?a.ld:null,alive:r.d!==1};if(a?.sp!==void 0)o.spotProgress=a.sp;if(a?.sc!==void 0)o.spotCandidate=a.sc;return o}),players:e,...t?{ships:t}:{},...i.craters?{craters:i.craters}:{},projectiles:i.projectiles.map((r)=>({id:r.id,weapon:r.w,owner:r.o,vehicle:r.vh,team:r.t,position:r.p,velocity:r.v,age:r.a,ttl:r.l})),missiles:i.missiles.map((r)=>{let a={id:r.id,weapon:r.w,owner:r.o,vehicle:r.vh,team:r.t,position:r.p,velocity:r.v,target:r.tg,steered:r.st===1,age:r.a,ttl:r.l};if(r.se!==void 0)a.seat=r.se;return a}),flares:i.flares.map((r)=>({id:r.id,vehicle:r.vh,position:r.p,velocity:r.v,age:r.a,ttl:r.l})),scores:i.scores,matchEndsAt:i.matchEndsAt,matchStartedAt:i.matchStartedAt,intermission:i.intermission,ack:i.ack}}}function xm(e,t,n,i={}){let s=i.now??(()=>performance.now()),r=!0,a=[],o=!1,l=Qa(),c=()=>{o=!1;let m=a.splice(0);for(let g of m)if(r)n.onMessage(l(JSON.parse(g)))},u=(m)=>{if(!r)return;if(a.push(m),!o)o=!0,queueMicrotask(c)},h=new Yc(i.code??"local",Xc({...zi,listed:!1,...e}),{send:(m,g)=>u(JSON.stringify(g)),sendText:(m,g)=>u(g)});n.onStatus?.("connecting");let d=h.addPlayer(t);queueMicrotask(()=>{if(r)n.onStatus?.("open")});let f=s(),p=i.manual?void 0:setInterval(()=>{let m=s();h.advance((m-f)/1000),f=m},i.intervalMs??16.666666666666668);return{engine:h,playerId:d,send(m){if(!r)return;h.handle(d,JSON.parse(JSON.stringify(m)))},close(){if(!r)return;if(r=!1,p!==void 0)clearInterval(p);h.removePlayer(d),n.onStatus?.("closed")},rtt:()=>0,step(m){h.advance(m)}}}var fw=ym(process.argv[2]??"Games/Wings/models");Fe.deepEqual(Kn,["fighter","apache","warthog","blackbird","bomber","astra-interceptor","astra-trainer"]);Fe.deepEqual(Kn.slice(0,5).map((e)=>[K[e].cruise,K[e].boost]),[[135,185],[75,98],[105,135],[190,260],[150,180]]);var pw=["4b718b8b7fe0c32c85adb373b421dc08e4500bef4ae87f82c62fcba5ca4bf83e","98f01e24c65201e70da94ceaf3638555880ed9ecea1595dcb082e2ed490c7b1d"],Qi=[];for(let[e,t]of["astra-interceptor","astra-trainer"].entries()){let n=[],i={...zi,bots:0,listed:!1},s=xm(i,"Astra check",{onMessage:(d)=>n.push(d)},{manual:!0});await Promise.resolve(),Fe.equal(s.engine.config.listed,!1),Fe.equal(s.engine.config.bots,0),s.send({type:"spawn",kind:"__proto__"}),await Promise.resolve(),Fe.equal(s.engine.vehicles.length,0),Fe(n.some((d)=>d.type==="error"&&d.message==="Unknown aircraft kind.")),s.send({type:"spawn",kind:t});let r=s.engine.vehicles.find((d)=>d.seats[0]===s.playerId);Fe.equal(r.kind,t),Fe.equal(r.flight.kind,t);let a=[...r.flight.position];for(let d=1;d<=900;d++)s.send({type:"input",seq:d,flight:{aim:null,throttle:1,roll:0,yaw:d>780?0.15:0,pitch:d>120?0.35:0,boost:!0,brake:!1}}),s.step(_e);await Promise.resolve(),Fe(r.alive&&!r.flight.onGround),Fe(r.flight.position[1]>a[1]+50),Fe(r.flight.position.every(Number.isFinite)),Fe(n.some((d)=>d.type==="snapshot"&&d.vehicles.some((f)=>f.kind===t)));let o=Cf[t];Fe.equal(K[t].model,`models/${o.file}.glb`);let l=hw(ym(fw,`${o.file}.glb`));Fe.equal(dw("sha256").update(l).digest("hex"),pw[e]);let u=JSON.parse(l.subarray(20,20+l.readUInt32LE(12)).toString()).nodes.map((d)=>d.name);for(let d of[...o.pivots,...o.anchors.map((f)=>f.node)])Fe(u.includes(d),d);Fe(!o.pivots.includes("gear")),Fe.deepEqual(o.spinners,e?[{name:"propeller",axis:"z",speed:40,driver:"engine"}]:[]);let h=new xl(new Es);h.cockpitBody(_e,t,[0,100,0],[0,0,0,1],0,0),Fe(h.pos.toArray().every(Number.isFinite)),Fe(Math.abs(h.pos.y-101.35)<0.000001),Qi.push({kind:t,start:a,end:r.flight.position,speed:Math.hypot(...r.flight.velocity),cockpit:h.pos.toArray(),pitchQuaternionX:h.quat.x,bytes:l.length}),s.close()}Fe.notEqual(Qi[0].speed,Qi[1].speed);Fe.notEqual(Qi[0].pitchQuaternionX,Qi[1].pitchQuaternionX);console.log(JSON.stringify(Qi));console.log("PASS: both selectable Astra kinds, offline config, validated spawn, wire snapshots, ordinary-input takeoff/turn, immutable GLBs, rig descriptors and cockpit math. No rendered flight/material/thumbnail acceptance.");
