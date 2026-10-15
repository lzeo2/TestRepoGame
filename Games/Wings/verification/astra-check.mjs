// astra-check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

// ../../../../home/leozhang/.bun/install/cache/three@0.186.0@@@1/build/three.core.js
var REVISION = "186";
var PCFShadowMap = 1;
var VSMShadowMap = 3;
var FrontSide = 0;
var BackSide = 1;
var DoubleSide = 2;
var NeverDepth = 0;
var AlwaysDepth = 1;
var LessDepth = 2;
var LessEqualDepth = 3;
var EqualDepth = 4;
var GreaterEqualDepth = 5;
var GreaterDepth = 6;
var NotEqualDepth = 7;
var MultiplyOperation = 0;
var MixOperation = 1;
var AddOperation = 2;
var NoToneMapping = 0;
var LinearToneMapping = 1;
var ReinhardToneMapping = 2;
var CineonToneMapping = 3;
var ACESFilmicToneMapping = 4;
var CustomToneMapping = 5;
var AgXToneMapping = 6;
var NeutralToneMapping = 7;
var UVMapping = 300;
var CubeReflectionMapping = 301;
var CubeRefractionMapping = 302;
var CubeUVReflectionMapping = 306;
var RepeatWrapping = 1000;
var ClampToEdgeWrapping = 1001;
var MirroredRepeatWrapping = 1002;
var NearestFilter = 1003;
var LinearFilter = 1006;
var LinearMipmapLinearFilter = 1008;
var UnsignedByteType = 1009;
var IntType = 1013;
var UnsignedIntType = 1014;
var FloatType = 1015;
var AlphaFormat = 1021;
var RGBFormat = 1022;
var RGBAFormat = 1023;
var DepthFormat = 1026;
var DepthStencilFormat = 1027;
var RedFormat = 1028;
var RedIntegerFormat = 1029;
var RGFormat = 1030;
var RGIntegerFormat = 1031;
var RGBIntegerFormat = 1032;
var RG11_EAC_Format = 37490;
var RED_GREEN_RGTC2_Format = 36285;
var InterpolateDiscrete = 2300;
var InterpolateLinear = 2301;
var InterpolateSmooth = 2302;
var InterpolateBezier = 2303;
var ZeroCurvatureEnding = 2400;
var ZeroSlopeEnding = 2401;
var WrapAroundEnding = 2402;
var TangentSpaceNormalMap = 0;
var ObjectSpaceNormalMap = 1;
var NoColorSpace = "";
var SRGBColorSpace = "srgb";
var LinearSRGBColorSpace = "srgb-linear";
var LinearTransfer = "linear";
var SRGBTransfer = "srgb";
var NoNormalPacking = "";
var NormalRGPacking = "rg";
var NormalGAPacking = "ga";
var NeverCompare = 512;
var LessCompare = 513;
var EqualCompare = 514;
var LessEqualCompare = 515;
var GreaterCompare = 516;
var NotEqualCompare = 517;
var GreaterEqualCompare = 518;
var AlwaysCompare = 519;
var StaticDrawUsage = 35044;
var WebGLCoordinateSystem = 2000;
var WebGPUCoordinateSystem = 2001;
var Compatibility = {
  TEXTURE_COMPARE: "depthTextureCompare"
};
function isTypedArray(array) {
  return ArrayBuffer.isView(array) && !(array instanceof DataView);
}
function createElementNS(name) {
  return document.createElementNS("http://www.w3.org/1999/xhtml", name);
}
var _cache = {};
var _setConsoleFunction = null;
function log(...params) {
  const message = "THREE." + params.shift();
  if (_setConsoleFunction) {
    _setConsoleFunction("log", message, ...params);
  } else {
    console.log(message, ...params);
  }
}
function enhanceLogMessage(params) {
  const message = params[0];
  if (typeof message === "string" && message.startsWith("TSL:")) {
    const stackTrace = params[1];
    if (stackTrace && stackTrace.isStackTrace) {
      params[0] += " " + stackTrace.getLocation();
    } else {
      params[1] = 'Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.';
    }
  }
  return params;
}
function warn(...params) {
  params = enhanceLogMessage(params);
  const message = "THREE." + params.shift();
  if (_setConsoleFunction) {
    _setConsoleFunction("warn", message, ...params);
  } else {
    const stackTrace = params[0];
    if (stackTrace && stackTrace.isStackTrace) {
      console.warn(stackTrace.getError(message));
    } else {
      console.warn(message, ...params);
    }
  }
}
function error(...params) {
  params = enhanceLogMessage(params);
  const message = "THREE." + params.shift();
  if (_setConsoleFunction) {
    _setConsoleFunction("error", message, ...params);
  } else {
    const stackTrace = params[0];
    if (stackTrace && stackTrace.isStackTrace) {
      console.error(stackTrace.getError(message));
    } else {
      console.error(message, ...params);
    }
  }
}
function warnOnce(...params) {
  const message = params.join(" ");
  if (message in _cache)
    return;
  _cache[message] = true;
  warn(...params);
}
var ReversedDepthFuncs = {
  [NeverDepth]: AlwaysDepth,
  [LessDepth]: GreaterDepth,
  [EqualDepth]: NotEqualDepth,
  [LessEqualDepth]: GreaterEqualDepth,
  [AlwaysDepth]: NeverDepth,
  [GreaterDepth]: LessDepth,
  [NotEqualDepth]: EqualDepth,
  [GreaterEqualDepth]: LessEqualDepth
};

class EventDispatcher {
  addEventListener(type, listener) {
    if (this._listeners === undefined)
      this._listeners = {};
    const listeners = this._listeners;
    if (listeners[type] === undefined) {
      listeners[type] = [];
    }
    if (listeners[type].indexOf(listener) === -1) {
      listeners[type].push(listener);
    }
  }
  hasEventListener(type, listener) {
    const listeners = this._listeners;
    if (listeners === undefined)
      return false;
    return listeners[type] !== undefined && listeners[type].indexOf(listener) !== -1;
  }
  removeEventListener(type, listener) {
    const listeners = this._listeners;
    if (listeners === undefined)
      return;
    const listenerArray = listeners[type];
    if (listenerArray !== undefined) {
      const index = listenerArray.indexOf(listener);
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }
  dispatchEvent(event) {
    const listeners = this._listeners;
    if (listeners === undefined)
      return;
    const listenerArray = listeners[event.type];
    if (listenerArray !== undefined) {
      event.target = this;
      const array = listenerArray.slice(0);
      for (let i = 0, l = array.length;i < l; i++) {
        array[i].call(this, event);
      }
      event.target = null;
    }
  }
}
var _lut = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "0a", "0b", "0c", "0d", "0e", "0f", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "1a", "1b", "1c", "1d", "1e", "1f", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "2a", "2b", "2c", "2d", "2e", "2f", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "3a", "3b", "3c", "3d", "3e", "3f", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "4a", "4b", "4c", "4d", "4e", "4f", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "5a", "5b", "5c", "5d", "5e", "5f", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "6a", "6b", "6c", "6d", "6e", "6f", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "7a", "7b", "7c", "7d", "7e", "7f", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "8a", "8b", "8c", "8d", "8e", "8f", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "9a", "9b", "9c", "9d", "9e", "9f", "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "aa", "ab", "ac", "ad", "ae", "af", "b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "ba", "bb", "bc", "bd", "be", "bf", "c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "ca", "cb", "cc", "cd", "ce", "cf", "d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "da", "db", "dc", "dd", "de", "df", "e0", "e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "ea", "eb", "ec", "ed", "ee", "ef", "f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "fa", "fb", "fc", "fd", "fe", "ff"];
var _seed = 1234567;
var DEG2RAD = Math.PI / 180;
var RAD2DEG = 180 / Math.PI;
function generateUUID() {
  const d0 = Math.random() * 4294967295 | 0;
  const d1 = Math.random() * 4294967295 | 0;
  const d2 = Math.random() * 4294967295 | 0;
  const d3 = Math.random() * 4294967295 | 0;
  const uuid = _lut[d0 & 255] + _lut[d0 >> 8 & 255] + _lut[d0 >> 16 & 255] + _lut[d0 >> 24 & 255] + "-" + _lut[d1 & 255] + _lut[d1 >> 8 & 255] + "-" + _lut[d1 >> 16 & 15 | 64] + _lut[d1 >> 24 & 255] + "-" + _lut[d2 & 63 | 128] + _lut[d2 >> 8 & 255] + "-" + _lut[d2 >> 16 & 255] + _lut[d2 >> 24 & 255] + _lut[d3 & 255] + _lut[d3 >> 8 & 255] + _lut[d3 >> 16 & 255] + _lut[d3 >> 24 & 255];
  return uuid.toLowerCase();
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function euclideanModulo(n, m) {
  return (n % m + m) % m;
}
function mapLinear(x, a1, a2, b1, b2) {
  return b1 + (x - a1) * (b2 - b1) / (a2 - a1);
}
function inverseLerp(x, y, value) {
  if (x !== y) {
    return (value - x) / (y - x);
  } else {
    return 0;
  }
}
function lerp(x, y, t) {
  return (1 - t) * x + t * y;
}
function damp(x, y, lambda, dt) {
  return lerp(x, y, 1 - Math.exp(-lambda * dt));
}
function pingpong(x, length = 1) {
  return length - Math.abs(euclideanModulo(x, length * 2) - length);
}
function smoothstep(x, min, max) {
  if (x <= min)
    return 0;
  if (x >= max)
    return 1;
  x = (x - min) / (max - min);
  return x * x * (3 - 2 * x);
}
function smootherstep(x, min, max) {
  if (x <= min)
    return 0;
  if (x >= max)
    return 1;
  x = (x - min) / (max - min);
  return x * x * x * (x * (x * 6 - 15) + 10);
}
function randInt(low, high) {
  return low + Math.floor(Math.random() * (high - low + 1));
}
function randFloat(low, high) {
  return low + Math.random() * (high - low);
}
function randFloatSpread(range) {
  return range * (0.5 - Math.random());
}
function seededRandom(s) {
  if (s !== undefined)
    _seed = s;
  let t = _seed += 1831565813;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function degToRad(degrees) {
  return degrees * DEG2RAD;
}
function radToDeg(radians) {
  return radians * RAD2DEG;
}
function isPowerOfTwo(value) {
  return value > 0 && Number.isInteger(value) && 2 ** Math.round(Math.log2(value)) === value;
}
function ceilPowerOfTwo(value) {
  return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}
function floorPowerOfTwo(value) {
  return Math.pow(2, Math.floor(Math.log(value) / Math.LN2));
}
function setQuaternionFromProperEuler(q, a, b, c, order) {
  const cos = Math.cos;
  const sin = Math.sin;
  const c2 = cos(b / 2);
  const s2 = sin(b / 2);
  const c13 = cos((a + c) / 2);
  const s13 = sin((a + c) / 2);
  const c1_3 = cos((a - c) / 2);
  const s1_3 = sin((a - c) / 2);
  const c3_1 = cos((c - a) / 2);
  const s3_1 = sin((c - a) / 2);
  switch (order) {
    case "XYX":
      q.set(c2 * s13, s2 * c1_3, s2 * s1_3, c2 * c13);
      break;
    case "YZY":
      q.set(s2 * s1_3, c2 * s13, s2 * c1_3, c2 * c13);
      break;
    case "ZXZ":
      q.set(s2 * c1_3, s2 * s1_3, c2 * s13, c2 * c13);
      break;
    case "XZX":
      q.set(c2 * s13, s2 * s3_1, s2 * c3_1, c2 * c13);
      break;
    case "YXY":
      q.set(s2 * c3_1, c2 * s13, s2 * s3_1, c2 * c13);
      break;
    case "ZYZ":
      q.set(s2 * s3_1, s2 * c3_1, c2 * s13, c2 * c13);
      break;
    default:
      warn("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: " + order);
  }
}
function denormalize(value, array) {
  switch (array.constructor) {
    case Float32Array:
      return value;
    case Uint32Array:
      return value / 4294967295;
    case Uint16Array:
      return value / 65535;
    case Uint8Array:
    case Uint8ClampedArray:
      return value / 255;
    case Int32Array:
      return Math.max(value / 2147483647, -1);
    case Int16Array:
      return Math.max(value / 32767, -1);
    case Int8Array:
      return Math.max(value / 127, -1);
    default:
      throw new Error("THREE.MathUtils: Invalid component type.");
  }
}
function normalize(value, array) {
  switch (array.constructor) {
    case Float32Array:
      return value;
    case Uint32Array:
      return Math.round(value * 4294967295);
    case Uint16Array:
      return Math.round(value * 65535);
    case Uint8Array:
    case Uint8ClampedArray:
      return Math.round(value * 255);
    case Int32Array:
      return Math.round(value * 2147483647);
    case Int16Array:
      return Math.round(value * 32767);
    case Int8Array:
      return Math.round(value * 127);
    default:
      throw new Error("THREE.MathUtils: Invalid component type.");
  }
}
var MathUtils = {
  DEG2RAD,
  RAD2DEG,
  generateUUID,
  clamp,
  euclideanModulo,
  mapLinear,
  inverseLerp,
  lerp,
  damp,
  pingpong,
  smoothstep,
  smootherstep,
  randInt,
  randFloat,
  randFloatSpread,
  seededRandom,
  degToRad,
  radToDeg,
  isPowerOfTwo,
  ceilPowerOfTwo,
  floorPowerOfTwo,
  setQuaternionFromProperEuler,
  normalize,
  denormalize
};

class Vector2 {
  static {
    Vector2.prototype.isVector2 = true;
  }
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  get width() {
    return this.x;
  }
  set width(value) {
    this.x = value;
  }
  get height() {
    return this.y;
  }
  set height(value) {
    this.y = value;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
  setScalar(scalar) {
    this.x = scalar;
    this.y = scalar;
    return this;
  }
  setX(x) {
    this.x = x;
    return this;
  }
  setY(y) {
    this.y = y;
    return this;
  }
  setComponent(index, value) {
    switch (index) {
      case 0:
        this.x = value;
        break;
      case 1:
        this.y = value;
        break;
      default:
        throw new Error("THREE.Vector2: index is out of range: " + index);
    }
    return this;
  }
  getComponent(index) {
    switch (index) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      default:
        throw new Error("THREE.Vector2: index is out of range: " + index);
    }
  }
  clone() {
    return new this.constructor(this.x, this.y);
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  addScalar(s) {
    this.x += s;
    this.y += s;
    return this;
  }
  addVectors(a, b) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    return this;
  }
  addScaledVector(v, s) {
    this.x += v.x * s;
    this.y += v.y * s;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  subScalar(s) {
    this.x -= s;
    this.y -= s;
    return this;
  }
  subVectors(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    return this;
  }
  multiply(v) {
    this.x *= v.x;
    this.y *= v.y;
    return this;
  }
  multiplyScalar(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }
  divide(v) {
    this.x /= v.x;
    this.y /= v.y;
    return this;
  }
  divideScalar(scalar) {
    return this.multiplyScalar(1 / scalar);
  }
  applyMatrix3(m) {
    const x = this.x, y = this.y;
    const e = m.elements;
    this.x = e[0] * x + e[3] * y + e[6];
    this.y = e[1] * x + e[4] * y + e[7];
    return this;
  }
  min(v) {
    this.x = Math.min(this.x, v.x);
    this.y = Math.min(this.y, v.y);
    return this;
  }
  max(v) {
    this.x = Math.max(this.x, v.x);
    this.y = Math.max(this.y, v.y);
    return this;
  }
  clamp(min, max) {
    this.x = clamp(this.x, min.x, max.x);
    this.y = clamp(this.y, min.y, max.y);
    return this;
  }
  clampScalar(minVal, maxVal) {
    this.x = clamp(this.x, minVal, maxVal);
    this.y = clamp(this.y, minVal, maxVal);
    return this;
  }
  clampLength(min, max) {
    const length = this.length();
    return this.divideScalar(length || 1).multiplyScalar(clamp(length, min, max));
  }
  floor() {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    return this;
  }
  ceil() {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    return this;
  }
  round() {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  }
  roundToZero() {
    this.x = Math.trunc(this.x);
    this.y = Math.trunc(this.y);
    return this;
  }
  negate() {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
  cross(v) {
    return this.x * v.y - this.y * v.x;
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y);
  }
  normalize() {
    return this.divideScalar(this.length() || 1);
  }
  angle() {
    const angle = Math.atan2(-this.y, -this.x) + Math.PI;
    return angle;
  }
  angleTo(v) {
    const denominator = Math.sqrt(this.lengthSq() * v.lengthSq());
    if (denominator === 0)
      return Math.PI / 2;
    const theta = this.dot(v) / denominator;
    return Math.acos(clamp(theta, -1, 1));
  }
  distanceTo(v) {
    return Math.sqrt(this.distanceToSquared(v));
  }
  distanceToSquared(v) {
    const dx = this.x - v.x, dy = this.y - v.y;
    return dx * dx + dy * dy;
  }
  manhattanDistanceTo(v) {
    return Math.abs(this.x - v.x) + Math.abs(this.y - v.y);
  }
  setLength(length) {
    return this.normalize().multiplyScalar(length);
  }
  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    return this;
  }
  lerpVectors(v1, v2, alpha) {
    this.x = v1.x + (v2.x - v1.x) * alpha;
    this.y = v1.y + (v2.y - v1.y) * alpha;
    return this;
  }
  equals(v) {
    return v.x === this.x && v.y === this.y;
  }
  fromArray(array, offset = 0) {
    this.x = array[offset];
    this.y = array[offset + 1];
    return this;
  }
  toArray(array = [], offset = 0) {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    return array;
  }
  fromBufferAttribute(attribute, index) {
    this.x = attribute.getX(index);
    this.y = attribute.getY(index);
    return this;
  }
  rotateAround(center, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const x = this.x - center.x;
    const y = this.y - center.y;
    this.x = x * c - y * s + center.x;
    this.y = x * s + y * c + center.y;
    return this;
  }
  random() {
    this.x = Math.random();
    this.y = Math.random();
    return this;
  }
  *[Symbol.iterator]() {
    yield this.x;
    yield this.y;
  }
}

class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.isQuaternion = true;
    this._x = x;
    this._y = y;
    this._z = z;
    this._w = w;
  }
  static slerpFlat(dst, dstOffset, src0, srcOffset0, src1, srcOffset1, t) {
    let x0 = src0[srcOffset0 + 0], y0 = src0[srcOffset0 + 1], z0 = src0[srcOffset0 + 2], w0 = src0[srcOffset0 + 3];
    let x1 = src1[srcOffset1 + 0], y1 = src1[srcOffset1 + 1], z1 = src1[srcOffset1 + 2], w1 = src1[srcOffset1 + 3];
    if (w0 !== w1 || x0 !== x1 || y0 !== y1 || z0 !== z1) {
      let dot = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1;
      if (dot < 0) {
        x1 = -x1;
        y1 = -y1;
        z1 = -z1;
        w1 = -w1;
        dot = -dot;
      }
      let s = 1 - t;
      if (dot < 0.9995) {
        const theta = Math.acos(dot);
        const sin = Math.sin(theta);
        s = Math.sin(s * theta) / sin;
        t = Math.sin(t * theta) / sin;
        x0 = x0 * s + x1 * t;
        y0 = y0 * s + y1 * t;
        z0 = z0 * s + z1 * t;
        w0 = w0 * s + w1 * t;
      } else {
        x0 = x0 * s + x1 * t;
        y0 = y0 * s + y1 * t;
        z0 = z0 * s + z1 * t;
        w0 = w0 * s + w1 * t;
        const f = 1 / Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0 + w0 * w0);
        x0 *= f;
        y0 *= f;
        z0 *= f;
        w0 *= f;
      }
    }
    dst[dstOffset] = x0;
    dst[dstOffset + 1] = y0;
    dst[dstOffset + 2] = z0;
    dst[dstOffset + 3] = w0;
  }
  static multiplyQuaternionsFlat(dst, dstOffset, src0, srcOffset0, src1, srcOffset1) {
    const x0 = src0[srcOffset0];
    const y0 = src0[srcOffset0 + 1];
    const z0 = src0[srcOffset0 + 2];
    const w0 = src0[srcOffset0 + 3];
    const x1 = src1[srcOffset1];
    const y1 = src1[srcOffset1 + 1];
    const z1 = src1[srcOffset1 + 2];
    const w1 = src1[srcOffset1 + 3];
    dst[dstOffset] = x0 * w1 + w0 * x1 + y0 * z1 - z0 * y1;
    dst[dstOffset + 1] = y0 * w1 + w0 * y1 + z0 * x1 - x0 * z1;
    dst[dstOffset + 2] = z0 * w1 + w0 * z1 + x0 * y1 - y0 * x1;
    dst[dstOffset + 3] = w0 * w1 - x0 * x1 - y0 * y1 - z0 * z1;
    return dst;
  }
  get x() {
    return this._x;
  }
  set x(value) {
    this._x = value;
    this._onChangeCallback();
  }
  get y() {
    return this._y;
  }
  set y(value) {
    this._y = value;
    this._onChangeCallback();
  }
  get z() {
    return this._z;
  }
  set z(value) {
    this._z = value;
    this._onChangeCallback();
  }
  get w() {
    return this._w;
  }
  set w(value) {
    this._w = value;
    this._onChangeCallback();
  }
  set(x, y, z, w) {
    this._x = x;
    this._y = y;
    this._z = z;
    this._w = w;
    this._onChangeCallback();
    return this;
  }
  clone() {
    return new this.constructor(this._x, this._y, this._z, this._w);
  }
  copy(quaternion) {
    this._x = quaternion.x;
    this._y = quaternion.y;
    this._z = quaternion.z;
    this._w = quaternion.w;
    this._onChangeCallback();
    return this;
  }
  setFromEuler(euler, update = true) {
    const { _x: x, _y: y, _z: z, _order: order } = euler;
    const cos = Math.cos;
    const sin = Math.sin;
    const c1 = cos(x / 2);
    const c2 = cos(y / 2);
    const c3 = cos(z / 2);
    const s1 = sin(x / 2);
    const s2 = sin(y / 2);
    const s3 = sin(z / 2);
    switch (order) {
      case "XYZ":
        this._x = s1 * c2 * c3 + c1 * s2 * s3;
        this._y = c1 * s2 * c3 - s1 * c2 * s3;
        this._z = c1 * c2 * s3 + s1 * s2 * c3;
        this._w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case "YXZ":
        this._x = s1 * c2 * c3 + c1 * s2 * s3;
        this._y = c1 * s2 * c3 - s1 * c2 * s3;
        this._z = c1 * c2 * s3 - s1 * s2 * c3;
        this._w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      case "ZXY":
        this._x = s1 * c2 * c3 - c1 * s2 * s3;
        this._y = c1 * s2 * c3 + s1 * c2 * s3;
        this._z = c1 * c2 * s3 + s1 * s2 * c3;
        this._w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case "ZYX":
        this._x = s1 * c2 * c3 - c1 * s2 * s3;
        this._y = c1 * s2 * c3 + s1 * c2 * s3;
        this._z = c1 * c2 * s3 - s1 * s2 * c3;
        this._w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      case "YZX":
        this._x = s1 * c2 * c3 + c1 * s2 * s3;
        this._y = c1 * s2 * c3 + s1 * c2 * s3;
        this._z = c1 * c2 * s3 - s1 * s2 * c3;
        this._w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case "XZY":
        this._x = s1 * c2 * c3 - c1 * s2 * s3;
        this._y = c1 * s2 * c3 - s1 * c2 * s3;
        this._z = c1 * c2 * s3 + s1 * s2 * c3;
        this._w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      default:
        warn("Quaternion: .setFromEuler() encountered an unknown order: " + order);
    }
    if (update === true)
      this._onChangeCallback();
    return this;
  }
  setFromAxisAngle(axis, angle) {
    const halfAngle = angle / 2, s = Math.sin(halfAngle);
    this._x = axis.x * s;
    this._y = axis.y * s;
    this._z = axis.z * s;
    this._w = Math.cos(halfAngle);
    this._onChangeCallback();
    return this;
  }
  setFromRotationMatrix(m) {
    const te = m.elements, m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10], trace = m11 + m22 + m33;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      this._w = 0.25 / s;
      this._x = (m32 - m23) * s;
      this._y = (m13 - m31) * s;
      this._z = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
      this._w = (m32 - m23) / s;
      this._x = 0.25 * s;
      this._y = (m12 + m21) / s;
      this._z = (m13 + m31) / s;
    } else if (m22 > m33) {
      const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
      this._w = (m13 - m31) / s;
      this._x = (m12 + m21) / s;
      this._y = 0.25 * s;
      this._z = (m23 + m32) / s;
    } else {
      const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
      this._w = (m21 - m12) / s;
      this._x = (m13 + m31) / s;
      this._y = (m23 + m32) / s;
      this._z = 0.25 * s;
    }
    this._onChangeCallback();
    return this;
  }
  setFromUnitVectors(vFrom, vTo) {
    let r = vFrom.dot(vTo) + 1;
    if (r < 0.00000001) {
      r = 0;
      if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {
        this._x = -vFrom.y;
        this._y = vFrom.x;
        this._z = 0;
        this._w = r;
      } else {
        this._x = 0;
        this._y = -vFrom.z;
        this._z = vFrom.y;
        this._w = r;
      }
    } else {
      this._x = vFrom.y * vTo.z - vFrom.z * vTo.y;
      this._y = vFrom.z * vTo.x - vFrom.x * vTo.z;
      this._z = vFrom.x * vTo.y - vFrom.y * vTo.x;
      this._w = r;
    }
    return this.normalize();
  }
  angleTo(q) {
    return 2 * Math.acos(Math.abs(clamp(this.dot(q), -1, 1)));
  }
  rotateTowards(q, step) {
    const angle = this.angleTo(q);
    if (angle === 0)
      return this;
    const t = Math.min(1, step / angle);
    this.slerp(q, t);
    return this;
  }
  identity() {
    return this.set(0, 0, 0, 1);
  }
  invert() {
    return this.conjugate();
  }
  conjugate() {
    this._x *= -1;
    this._y *= -1;
    this._z *= -1;
    this._onChangeCallback();
    return this;
  }
  dot(v) {
    return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w;
  }
  lengthSq() {
    return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
  }
  length() {
    return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
  }
  normalize() {
    let l = this.length();
    if (l === 0) {
      this._x = 0;
      this._y = 0;
      this._z = 0;
      this._w = 1;
    } else {
      l = 1 / l;
      this._x = this._x * l;
      this._y = this._y * l;
      this._z = this._z * l;
      this._w = this._w * l;
    }
    this._onChangeCallback();
    return this;
  }
  multiply(q) {
    return this.multiplyQuaternions(this, q);
  }
  premultiply(q) {
    return this.multiplyQuaternions(q, this);
  }
  multiplyQuaternions(a, b) {
    const { _x: qax, _y: qay, _z: qaz, _w: qaw } = a;
    const { _x: qbx, _y: qby, _z: qbz, _w: qbw } = b;
    this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
    this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
    this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
    this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
    this._onChangeCallback();
    return this;
  }
  slerp(qb, t) {
    let { _x: x, _y: y, _z: z, _w: w } = qb;
    let dot = this.dot(qb);
    if (dot < 0) {
      x = -x;
      y = -y;
      z = -z;
      w = -w;
      dot = -dot;
    }
    let s = 1 - t;
    if (dot < 0.9995) {
      const theta = Math.acos(dot);
      const sin = Math.sin(theta);
      s = Math.sin(s * theta) / sin;
      t = Math.sin(t * theta) / sin;
      this._x = this._x * s + x * t;
      this._y = this._y * s + y * t;
      this._z = this._z * s + z * t;
      this._w = this._w * s + w * t;
      this._onChangeCallback();
    } else {
      this._x = this._x * s + x * t;
      this._y = this._y * s + y * t;
      this._z = this._z * s + z * t;
      this._w = this._w * s + w * t;
      this.normalize();
    }
    return this;
  }
  slerpQuaternions(qa, qb, t) {
    return this.copy(qa).slerp(qb, t);
  }
  random() {
    const theta1 = 2 * Math.PI * Math.random();
    const theta2 = 2 * Math.PI * Math.random();
    const x0 = Math.random();
    const r1 = Math.sqrt(1 - x0);
    const r2 = Math.sqrt(x0);
    return this.set(r1 * Math.sin(theta1), r1 * Math.cos(theta1), r2 * Math.sin(theta2), r2 * Math.cos(theta2));
  }
  equals(quaternion) {
    return quaternion._x === this._x && quaternion._y === this._y && quaternion._z === this._z && quaternion._w === this._w;
  }
  fromArray(array, offset = 0) {
    this._x = array[offset];
    this._y = array[offset + 1];
    this._z = array[offset + 2];
    this._w = array[offset + 3];
    this._onChangeCallback();
    return this;
  }
  toArray(array = [], offset = 0) {
    array[offset] = this._x;
    array[offset + 1] = this._y;
    array[offset + 2] = this._z;
    array[offset + 3] = this._w;
    return array;
  }
  fromBufferAttribute(attribute, index) {
    this._x = attribute.getX(index);
    this._y = attribute.getY(index);
    this._z = attribute.getZ(index);
    this._w = attribute.getW(index);
    this._onChangeCallback();
    return this;
  }
  toJSON() {
    return this.toArray();
  }
  _onChange(callback) {
    this._onChangeCallback = callback;
    return this;
  }
  _onChangeCallback() {}
  *[Symbol.iterator]() {
    yield this._x;
    yield this._y;
    yield this._z;
    yield this._w;
  }
}

class Vector3 {
  static {
    Vector3.prototype.isVector3 = true;
  }
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) {
    if (z === undefined)
      z = this.z;
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  setScalar(scalar) {
    this.x = scalar;
    this.y = scalar;
    this.z = scalar;
    return this;
  }
  setX(x) {
    this.x = x;
    return this;
  }
  setY(y) {
    this.y = y;
    return this;
  }
  setZ(z) {
    this.z = z;
    return this;
  }
  setComponent(index, value) {
    switch (index) {
      case 0:
        this.x = value;
        break;
      case 1:
        this.y = value;
        break;
      case 2:
        this.z = value;
        break;
      default:
        throw new Error("THREE.Vector3: index is out of range: " + index);
    }
    return this;
  }
  getComponent(index) {
    switch (index) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      case 2:
        return this.z;
      default:
        throw new Error("THREE.Vector3: index is out of range: " + index);
    }
  }
  clone() {
    return new this.constructor(this.x, this.y, this.z);
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  addScalar(s) {
    this.x += s;
    this.y += s;
    this.z += s;
    return this;
  }
  addVectors(a, b) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    this.z = a.z + b.z;
    return this;
  }
  addScaledVector(v, s) {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  subScalar(s) {
    this.x -= s;
    this.y -= s;
    this.z -= s;
    return this;
  }
  subVectors(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }
  multiply(v) {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }
  multiplyScalar(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }
  multiplyVectors(a, b) {
    this.x = a.x * b.x;
    this.y = a.y * b.y;
    this.z = a.z * b.z;
    return this;
  }
  applyEuler(euler) {
    return this.applyQuaternion(_quaternion$5.setFromEuler(euler));
  }
  applyAxisAngle(axis, angle) {
    return this.applyQuaternion(_quaternion$5.setFromAxisAngle(axis, angle));
  }
  applyMatrix3(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    this.x = e[0] * x + e[3] * y + e[6] * z;
    this.y = e[1] * x + e[4] * y + e[7] * z;
    this.z = e[2] * x + e[5] * y + e[8] * z;
    return this;
  }
  applyNormalMatrix(m) {
    return this.applyMatrix3(m).normalize();
  }
  applyMatrix4(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this;
  }
  applyQuaternion(q) {
    const vx = this.x, vy = this.y, vz = this.z;
    const { x: qx, y: qy, z: qz, w: qw } = q;
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    this.x = vx + qw * tx + qy * tz - qz * ty;
    this.y = vy + qw * ty + qz * tx - qx * tz;
    this.z = vz + qw * tz + qx * ty - qy * tx;
    return this;
  }
  project(camera) {
    return this.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
  }
  unproject(camera) {
    return this.applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld);
  }
  transformDirection(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    this.x = e[0] * x + e[4] * y + e[8] * z;
    this.y = e[1] * x + e[5] * y + e[9] * z;
    this.z = e[2] * x + e[6] * y + e[10] * z;
    return this.normalize();
  }
  divide(v) {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    return this;
  }
  divideScalar(scalar) {
    return this.multiplyScalar(1 / scalar);
  }
  min(v) {
    this.x = Math.min(this.x, v.x);
    this.y = Math.min(this.y, v.y);
    this.z = Math.min(this.z, v.z);
    return this;
  }
  max(v) {
    this.x = Math.max(this.x, v.x);
    this.y = Math.max(this.y, v.y);
    this.z = Math.max(this.z, v.z);
    return this;
  }
  clamp(min, max) {
    this.x = clamp(this.x, min.x, max.x);
    this.y = clamp(this.y, min.y, max.y);
    this.z = clamp(this.z, min.z, max.z);
    return this;
  }
  clampScalar(minVal, maxVal) {
    this.x = clamp(this.x, minVal, maxVal);
    this.y = clamp(this.y, minVal, maxVal);
    this.z = clamp(this.z, minVal, maxVal);
    return this;
  }
  clampLength(min, max) {
    const length = this.length();
    return this.divideScalar(length || 1).multiplyScalar(clamp(length, min, max));
  }
  floor() {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    this.z = Math.floor(this.z);
    return this;
  }
  ceil() {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    this.z = Math.ceil(this.z);
    return this;
  }
  round() {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    this.z = Math.round(this.z);
    return this;
  }
  roundToZero() {
    this.x = Math.trunc(this.x);
    this.y = Math.trunc(this.y);
    this.z = Math.trunc(this.z);
    return this;
  }
  negate() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
  }
  normalize() {
    return this.divideScalar(this.length() || 1);
  }
  setLength(length) {
    return this.normalize().multiplyScalar(length);
  }
  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    return this;
  }
  lerpVectors(v1, v2, alpha) {
    this.x = v1.x + (v2.x - v1.x) * alpha;
    this.y = v1.y + (v2.y - v1.y) * alpha;
    this.z = v1.z + (v2.z - v1.z) * alpha;
    return this;
  }
  cross(v) {
    return this.crossVectors(this, v);
  }
  crossVectors(a, b) {
    const { x: ax, y: ay, z: az } = a;
    const { x: bx, y: by, z: bz } = b;
    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
  }
  projectOnVector(v) {
    const denominator = v.lengthSq();
    if (denominator === 0)
      return this.set(0, 0, 0);
    const scalar = v.dot(this) / denominator;
    return this.copy(v).multiplyScalar(scalar);
  }
  projectOnPlane(planeNormal) {
    _vector$c.copy(this).projectOnVector(planeNormal);
    return this.sub(_vector$c);
  }
  reflect(normal) {
    return this.sub(_vector$c.copy(normal).multiplyScalar(2 * this.dot(normal)));
  }
  angleTo(v) {
    const denominator = Math.sqrt(this.lengthSq() * v.lengthSq());
    if (denominator === 0)
      return Math.PI / 2;
    const theta = this.dot(v) / denominator;
    return Math.acos(clamp(theta, -1, 1));
  }
  distanceTo(v) {
    return Math.sqrt(this.distanceToSquared(v));
  }
  distanceToSquared(v) {
    const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }
  manhattanDistanceTo(v) {
    return Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z);
  }
  setFromSpherical(s) {
    return this.setFromSphericalCoords(s.radius, s.phi, s.theta);
  }
  setFromSphericalCoords(radius, phi, theta) {
    const sinPhiRadius = Math.sin(phi) * radius;
    this.x = sinPhiRadius * Math.sin(theta);
    this.y = Math.cos(phi) * radius;
    this.z = sinPhiRadius * Math.cos(theta);
    return this;
  }
  setFromCylindrical(c) {
    return this.setFromCylindricalCoords(c.radius, c.theta, c.y);
  }
  setFromCylindricalCoords(radius, theta, y) {
    this.x = radius * Math.sin(theta);
    this.y = y;
    this.z = radius * Math.cos(theta);
    return this;
  }
  setFromMatrixPosition(m) {
    const e = m.elements;
    this.x = e[12];
    this.y = e[13];
    this.z = e[14];
    return this;
  }
  setFromMatrixScale(m) {
    const sx = this.setFromMatrixColumn(m, 0).length();
    const sy = this.setFromMatrixColumn(m, 1).length();
    const sz = this.setFromMatrixColumn(m, 2).length();
    this.x = sx;
    this.y = sy;
    this.z = sz;
    return this;
  }
  setFromMatrixColumn(m, index) {
    return this.fromArray(m.elements, index * 4);
  }
  setFromMatrix3Column(m, index) {
    return this.fromArray(m.elements, index * 3);
  }
  setFromEuler(e) {
    this.x = e._x;
    this.y = e._y;
    this.z = e._z;
    return this;
  }
  setFromColor(c) {
    this.x = c.r;
    this.y = c.g;
    this.z = c.b;
    return this;
  }
  equals(v) {
    return v.x === this.x && v.y === this.y && v.z === this.z;
  }
  fromArray(array, offset = 0) {
    this.x = array[offset];
    this.y = array[offset + 1];
    this.z = array[offset + 2];
    return this;
  }
  toArray(array = [], offset = 0) {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    array[offset + 2] = this.z;
    return array;
  }
  fromBufferAttribute(attribute, index) {
    this.x = attribute.getX(index);
    this.y = attribute.getY(index);
    this.z = attribute.getZ(index);
    return this;
  }
  random() {
    this.x = Math.random();
    this.y = Math.random();
    this.z = Math.random();
    return this;
  }
  randomDirection() {
    const theta = Math.random() * Math.PI * 2;
    const u = Math.random() * 2 - 1;
    const c = Math.sqrt(1 - u * u);
    this.x = c * Math.cos(theta);
    this.y = u;
    this.z = c * Math.sin(theta);
    return this;
  }
  *[Symbol.iterator]() {
    yield this.x;
    yield this.y;
    yield this.z;
  }
}
var _vector$c = /* @__PURE__ */ new Vector3;
var _quaternion$5 = /* @__PURE__ */ new Quaternion;

class Matrix3 {
  static {
    Matrix3.prototype.isMatrix3 = true;
  }
  constructor(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
    this.elements = [
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1
    ];
    if (n11 !== undefined) {
      this.set(n11, n12, n13, n21, n22, n23, n31, n32, n33);
    }
  }
  set(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
    const te = this.elements;
    te[0] = n11;
    te[1] = n21;
    te[2] = n31;
    te[3] = n12;
    te[4] = n22;
    te[5] = n32;
    te[6] = n13;
    te[7] = n23;
    te[8] = n33;
    return this;
  }
  identity() {
    this.set(1, 0, 0, 0, 1, 0, 0, 0, 1);
    return this;
  }
  copy(m) {
    const te = this.elements;
    const me = m.elements;
    te[0] = me[0];
    te[1] = me[1];
    te[2] = me[2];
    te[3] = me[3];
    te[4] = me[4];
    te[5] = me[5];
    te[6] = me[6];
    te[7] = me[7];
    te[8] = me[8];
    return this;
  }
  extractBasis(xAxis, yAxis, zAxis) {
    xAxis.setFromMatrix3Column(this, 0);
    yAxis.setFromMatrix3Column(this, 1);
    zAxis.setFromMatrix3Column(this, 2);
    return this;
  }
  setFromMatrix4(m) {
    const me = m.elements;
    this.set(me[0], me[4], me[8], me[1], me[5], me[9], me[2], me[6], me[10]);
    return this;
  }
  multiply(m) {
    return this.multiplyMatrices(this, m);
  }
  premultiply(m) {
    return this.multiplyMatrices(m, this);
  }
  multiplyMatrices(a, b) {
    const ae = a.elements;
    const be = b.elements;
    const te = this.elements;
    const a11 = ae[0], a12 = ae[3], a13 = ae[6];
    const a21 = ae[1], a22 = ae[4], a23 = ae[7];
    const a31 = ae[2], a32 = ae[5], a33 = ae[8];
    const b11 = be[0], b12 = be[3], b13 = be[6];
    const b21 = be[1], b22 = be[4], b23 = be[7];
    const b31 = be[2], b32 = be[5], b33 = be[8];
    te[0] = a11 * b11 + a12 * b21 + a13 * b31;
    te[3] = a11 * b12 + a12 * b22 + a13 * b32;
    te[6] = a11 * b13 + a12 * b23 + a13 * b33;
    te[1] = a21 * b11 + a22 * b21 + a23 * b31;
    te[4] = a21 * b12 + a22 * b22 + a23 * b32;
    te[7] = a21 * b13 + a22 * b23 + a23 * b33;
    te[2] = a31 * b11 + a32 * b21 + a33 * b31;
    te[5] = a31 * b12 + a32 * b22 + a33 * b32;
    te[8] = a31 * b13 + a32 * b23 + a33 * b33;
    return this;
  }
  multiplyScalar(s) {
    const te = this.elements;
    te[0] *= s;
    te[3] *= s;
    te[6] *= s;
    te[1] *= s;
    te[4] *= s;
    te[7] *= s;
    te[2] *= s;
    te[5] *= s;
    te[8] *= s;
    return this;
  }
  determinant() {
    const te = this.elements;
    const a = te[0], b = te[1], c = te[2], d = te[3], e = te[4], f = te[5], g = te[6], h = te[7], i = te[8];
    return a * e * i - a * f * h - b * d * i + b * f * g + c * d * h - c * e * g;
  }
  invert() {
    const te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n12 = te[3], n22 = te[4], n32 = te[5], n13 = te[6], n23 = te[7], n33 = te[8], t11 = n33 * n22 - n32 * n23, t12 = n32 * n13 - n33 * n12, t13 = n23 * n12 - n22 * n13, det = n11 * t11 + n21 * t12 + n31 * t13;
    if (det === 0)
      return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
    const detInv = 1 / det;
    te[0] = t11 * detInv;
    te[1] = (n31 * n23 - n33 * n21) * detInv;
    te[2] = (n32 * n21 - n31 * n22) * detInv;
    te[3] = t12 * detInv;
    te[4] = (n33 * n11 - n31 * n13) * detInv;
    te[5] = (n31 * n12 - n32 * n11) * detInv;
    te[6] = t13 * detInv;
    te[7] = (n21 * n13 - n23 * n11) * detInv;
    te[8] = (n22 * n11 - n21 * n12) * detInv;
    return this;
  }
  transpose() {
    let tmp;
    const m = this.elements;
    tmp = m[1];
    m[1] = m[3];
    m[3] = tmp;
    tmp = m[2];
    m[2] = m[6];
    m[6] = tmp;
    tmp = m[5];
    m[5] = m[7];
    m[7] = tmp;
    return this;
  }
  getNormalMatrix(matrix4) {
    return this.setFromMatrix4(matrix4).invert().transpose();
  }
  transposeIntoArray(r) {
    const m = this.elements;
    r[0] = m[0];
    r[1] = m[3];
    r[2] = m[6];
    r[3] = m[1];
    r[4] = m[4];
    r[5] = m[7];
    r[6] = m[2];
    r[7] = m[5];
    r[8] = m[8];
    return this;
  }
  setUvTransform(tx, ty, sx, sy, rotation, cx, cy) {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    this.set(sx * c, sx * s, -sx * (c * cx + s * cy) + cx + tx, -sy * s, sy * c, -sy * (-s * cx + c * cy) + cy + ty, 0, 0, 1);
    return this;
  }
  scale(sx, sy) {
    warnOnce("Matrix3: .scale() is deprecated. Use .makeScale() instead.");
    this.premultiply(_m3.makeScale(sx, sy));
    return this;
  }
  rotate(theta) {
    warnOnce("Matrix3: .rotate() is deprecated. Use .makeRotation() instead.");
    this.premultiply(_m3.makeRotation(-theta));
    return this;
  }
  translate(tx, ty) {
    warnOnce("Matrix3: .translate() is deprecated. Use .makeTranslation() instead.");
    this.premultiply(_m3.makeTranslation(tx, ty));
    return this;
  }
  makeTranslation(x, y) {
    if (x.isVector2) {
      this.set(1, 0, x.x, 0, 1, x.y, 0, 0, 1);
    } else {
      this.set(1, 0, x, 0, 1, y, 0, 0, 1);
    }
    return this;
  }
  makeRotation(theta) {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    this.set(c, -s, 0, s, c, 0, 0, 0, 1);
    return this;
  }
  makeScale(x, y) {
    this.set(x, 0, 0, 0, y, 0, 0, 0, 1);
    return this;
  }
  equals(matrix) {
    const te = this.elements;
    const me = matrix.elements;
    for (let i = 0;i < 9; i++) {
      if (te[i] !== me[i])
        return false;
    }
    return true;
  }
  fromArray(array, offset = 0) {
    for (let i = 0;i < 9; i++) {
      this.elements[i] = array[i + offset];
    }
    return this;
  }
  toArray(array = [], offset = 0) {
    const te = this.elements;
    array[offset] = te[0];
    array[offset + 1] = te[1];
    array[offset + 2] = te[2];
    array[offset + 3] = te[3];
    array[offset + 4] = te[4];
    array[offset + 5] = te[5];
    array[offset + 6] = te[6];
    array[offset + 7] = te[7];
    array[offset + 8] = te[8];
    return array;
  }
  clone() {
    return new this.constructor().fromArray(this.elements);
  }
}
var _m3 = /* @__PURE__ */ new Matrix3;
var LINEAR_REC709_TO_XYZ = /* @__PURE__ */ new Matrix3().set(0.4123908, 0.3575843, 0.1804808, 0.212639, 0.7151687, 0.0721923, 0.0193308, 0.1191948, 0.9505322);
var XYZ_TO_LINEAR_REC709 = /* @__PURE__ */ new Matrix3().set(3.2409699, -1.5373832, -0.4986108, -0.9692436, 1.8759675, 0.0415551, 0.0556301, -0.203977, 1.0569715);
function createColorManagement() {
  const ColorManagement = {
    enabled: true,
    workingColorSpace: LinearSRGBColorSpace,
    spaces: {},
    convert: function(color, sourceColorSpace, targetColorSpace) {
      if (this.enabled === false || sourceColorSpace === targetColorSpace || !sourceColorSpace || !targetColorSpace) {
        return color;
      }
      if (this.spaces[sourceColorSpace].transfer === SRGBTransfer) {
        color.r = SRGBToLinear(color.r);
        color.g = SRGBToLinear(color.g);
        color.b = SRGBToLinear(color.b);
      }
      if (this.spaces[sourceColorSpace].primaries !== this.spaces[targetColorSpace].primaries) {
        color.applyMatrix3(this.spaces[sourceColorSpace].toXYZ);
        color.applyMatrix3(this.spaces[targetColorSpace].fromXYZ);
      }
      if (this.spaces[targetColorSpace].transfer === SRGBTransfer) {
        color.r = LinearToSRGB(color.r);
        color.g = LinearToSRGB(color.g);
        color.b = LinearToSRGB(color.b);
      }
      return color;
    },
    workingToColorSpace: function(color, targetColorSpace) {
      return this.convert(color, this.workingColorSpace, targetColorSpace);
    },
    colorSpaceToWorking: function(color, sourceColorSpace) {
      return this.convert(color, sourceColorSpace, this.workingColorSpace);
    },
    getPrimaries: function(colorSpace) {
      return this.spaces[colorSpace].primaries;
    },
    getTransfer: function(colorSpace) {
      if (colorSpace === NoColorSpace)
        return LinearTransfer;
      return this.spaces[colorSpace].transfer;
    },
    getToneMappingMode: function(colorSpace) {
      return this.spaces[colorSpace].outputColorSpaceConfig.toneMappingMode || "standard";
    },
    getLuminanceCoefficients: function(target, colorSpace = this.workingColorSpace) {
      return target.fromArray(this.spaces[colorSpace].luminanceCoefficients);
    },
    define: function(colorSpaces) {
      Object.assign(this.spaces, colorSpaces);
    },
    _getMatrix: function(targetMatrix, sourceColorSpace, targetColorSpace) {
      return targetMatrix.copy(this.spaces[sourceColorSpace].toXYZ).multiply(this.spaces[targetColorSpace].fromXYZ);
    },
    _getDrawingBufferColorSpace: function(colorSpace) {
      return this.spaces[colorSpace].outputColorSpaceConfig.drawingBufferColorSpace;
    },
    _getUnpackColorSpace: function(colorSpace = this.workingColorSpace) {
      return this.spaces[colorSpace].workingColorSpaceConfig.unpackColorSpace;
    },
    fromWorkingColorSpace: function(color, targetColorSpace) {
      warnOnce("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().");
      return ColorManagement.workingToColorSpace(color, targetColorSpace);
    },
    toWorkingColorSpace: function(color, sourceColorSpace) {
      warnOnce("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().");
      return ColorManagement.colorSpaceToWorking(color, sourceColorSpace);
    }
  };
  const REC709_PRIMARIES = [0.64, 0.33, 0.3, 0.6, 0.15, 0.06];
  const REC709_LUMINANCE_COEFFICIENTS = [0.2126, 0.7152, 0.0722];
  const D65 = [0.3127, 0.329];
  ColorManagement.define({
    [LinearSRGBColorSpace]: {
      primaries: REC709_PRIMARIES,
      whitePoint: D65,
      transfer: LinearTransfer,
      toXYZ: LINEAR_REC709_TO_XYZ,
      fromXYZ: XYZ_TO_LINEAR_REC709,
      luminanceCoefficients: REC709_LUMINANCE_COEFFICIENTS,
      workingColorSpaceConfig: { unpackColorSpace: SRGBColorSpace },
      outputColorSpaceConfig: { drawingBufferColorSpace: SRGBColorSpace }
    },
    [SRGBColorSpace]: {
      primaries: REC709_PRIMARIES,
      whitePoint: D65,
      transfer: SRGBTransfer,
      toXYZ: LINEAR_REC709_TO_XYZ,
      fromXYZ: XYZ_TO_LINEAR_REC709,
      luminanceCoefficients: REC709_LUMINANCE_COEFFICIENTS,
      outputColorSpaceConfig: { drawingBufferColorSpace: SRGBColorSpace }
    }
  });
  return ColorManagement;
}
var ColorManagement = /* @__PURE__ */ createColorManagement();
function SRGBToLinear(c) {
  return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}
function LinearToSRGB(c) {
  return c < 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 0.41666) - 0.055;
}
var _canvas;

class ImageUtils {
  static getDataURL(image, type = "image/png") {
    if (/^data:/i.test(image.src)) {
      return image.src;
    }
    if (typeof HTMLCanvasElement === "undefined") {
      return image.src;
    }
    let canvas;
    if (image instanceof HTMLCanvasElement) {
      canvas = image;
    } else {
      if (_canvas === undefined)
        _canvas = createElementNS("canvas");
      _canvas.width = image.width;
      _canvas.height = image.height;
      const context = _canvas.getContext("2d");
      if (image instanceof ImageData) {
        context.putImageData(image, 0, 0);
      } else {
        context.drawImage(image, 0, 0, image.width, image.height);
      }
      canvas = _canvas;
    }
    return canvas.toDataURL(type);
  }
  static sRGBToLinear(image) {
    if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement || typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement || typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
      const canvas = createElementNS("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, image.width, image.height);
      const imageData = context.getImageData(0, 0, image.width, image.height);
      const data = imageData.data;
      for (let i = 0;i < data.length; i++) {
        data[i] = SRGBToLinear(data[i] / 255) * 255;
      }
      context.putImageData(imageData, 0, 0);
      return canvas;
    } else if (image.data) {
      const data = image.data.slice(0);
      for (let i = 0;i < data.length; i++) {
        if (data instanceof Uint8Array || data instanceof Uint8ClampedArray) {
          data[i] = Math.floor(SRGBToLinear(data[i] / 255) * 255);
        } else {
          data[i] = SRGBToLinear(data[i]);
        }
      }
      return {
        data,
        width: image.width,
        height: image.height
      };
    } else {
      warn("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.");
      return image;
    }
  }
}
var _sourceId = 0;

class TextureSource {
  constructor(data = null) {
    this.isTextureSource = true;
    Object.defineProperty(this, "id", { value: _sourceId++ });
    this.uuid = generateUUID();
    this.data = data;
    this.dataReady = true;
    this.version = 0;
  }
  getSize(target) {
    const data = this.data;
    if (typeof HTMLVideoElement !== "undefined" && data instanceof HTMLVideoElement) {
      target.set(data.videoWidth, data.videoHeight, 0);
    } else if (typeof VideoFrame !== "undefined" && data instanceof VideoFrame) {
      target.set(data.displayWidth, data.displayHeight, 0);
    } else if (data !== null) {
      target.set(data.width, data.height, data.depth || 0);
    } else {
      target.set(0, 0, 0);
    }
    return target;
  }
  set needsUpdate(value) {
    if (value === true)
      this.version++;
  }
  toJSON(meta) {
    const isRootObject = meta === undefined || typeof meta === "string";
    if (!isRootObject && meta.images[this.uuid] !== undefined) {
      return meta.images[this.uuid];
    }
    const output = {
      uuid: this.uuid,
      url: ""
    };
    const data = this.data;
    if (data !== null) {
      let url;
      if (Array.isArray(data)) {
        url = [];
        for (let i = 0, l = data.length;i < l; i++) {
          if (data[i].isDataTexture) {
            url.push(serializeImage(data[i].image));
          } else {
            url.push(serializeImage(data[i]));
          }
        }
      } else {
        url = serializeImage(data);
      }
      output.url = url;
    }
    if (!isRootObject) {
      meta.images[this.uuid] = output;
    }
    return output;
  }
}
function serializeImage(image) {
  if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement || typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement || typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
    return ImageUtils.getDataURL(image);
  } else {
    if (image.data) {
      return {
        data: Array.from(image.data),
        width: image.width,
        height: image.height,
        type: image.data.constructor.name
      };
    } else {
      warn("Texture: Unable to serialize Texture.");
      return {};
    }
  }
}
var _textureId = 0;
var _tempVec3 = /* @__PURE__ */ new Vector3;

class Texture extends EventDispatcher {
  constructor(image = Texture.DEFAULT_IMAGE, mapping = Texture.DEFAULT_MAPPING, wrapS = ClampToEdgeWrapping, wrapT = ClampToEdgeWrapping, magFilter = LinearFilter, minFilter = LinearMipmapLinearFilter, format = RGBAFormat, type = UnsignedByteType, anisotropy = Texture.DEFAULT_ANISOTROPY, colorSpace = NoColorSpace) {
    super();
    this.isTexture = true;
    Object.defineProperty(this, "id", { value: _textureId++ });
    this.uuid = generateUUID();
    this.name = "";
    this.source = new TextureSource(image);
    this.mipmaps = [];
    this.mapping = mapping;
    this.channel = 0;
    this.wrapS = wrapS;
    this.wrapT = wrapT;
    this.magFilter = magFilter;
    this.minFilter = minFilter;
    this.anisotropy = anisotropy;
    this.format = format;
    this.internalFormat = null;
    this.type = type;
    this.offset = new Vector2(0, 0);
    this.repeat = new Vector2(1, 1);
    this.center = new Vector2(0, 0);
    this.rotation = 0;
    this.matrixAutoUpdate = true;
    this.matrix = new Matrix3;
    this.generateMipmaps = true;
    this.premultiplyAlpha = false;
    this.flipY = true;
    this.unpackAlignment = 4;
    this.colorSpace = colorSpace;
    this.userData = {};
    this.updateRanges = [];
    this.version = 0;
    this.onUpdate = null;
    this.renderTarget = null;
    this.isRenderTargetTexture = false;
    this.isArrayTexture = image && image.depth && image.depth > 1 ? true : false;
    this.pmremVersion = 0;
    this.normalized = false;
  }
  get width() {
    return this.source.getSize(_tempVec3).x;
  }
  get height() {
    return this.source.getSize(_tempVec3).y;
  }
  get depth() {
    return this.source.getSize(_tempVec3).z;
  }
  get image() {
    return this.source.data;
  }
  set image(value) {
    this.source.data = value;
  }
  updateMatrix() {
    this.matrix.setUvTransform(this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y);
  }
  addUpdateRange(start, count) {
    this.updateRanges.push({ start, count });
  }
  clearUpdateRanges() {
    this.updateRanges.length = 0;
  }
  clone() {
    return new this.constructor().copy(this);
  }
  copy(source) {
    this.name = source.name;
    this.source = source.source;
    this.mipmaps = source.mipmaps.slice(0);
    this.mapping = source.mapping;
    this.channel = source.channel;
    this.wrapS = source.wrapS;
    this.wrapT = source.wrapT;
    this.magFilter = source.magFilter;
    this.minFilter = source.minFilter;
    this.anisotropy = source.anisotropy;
    this.format = source.format;
    this.internalFormat = source.internalFormat;
    this.type = source.type;
    this.normalized = source.normalized;
    this.offset.copy(source.offset);
    this.repeat.copy(source.repeat);
    this.center.copy(source.center);
    this.rotation = source.rotation;
    this.matrixAutoUpdate = source.matrixAutoUpdate;
    this.matrix.copy(source.matrix);
    this.generateMipmaps = source.generateMipmaps;
    this.premultiplyAlpha = source.premultiplyAlpha;
    this.flipY = source.flipY;
    this.unpackAlignment = source.unpackAlignment;
    this.colorSpace = source.colorSpace;
    this.renderTarget = source.renderTarget;
    this.isRenderTargetTexture = source.isRenderTargetTexture;
    this.isArrayTexture = source.isArrayTexture;
    this.userData = JSON.parse(JSON.stringify(source.userData));
    this.needsUpdate = true;
    return this;
  }
  setValues(values) {
    for (const key in values) {
      const newValue = values[key];
      if (newValue === undefined) {
        warn(`Texture.setValues(): parameter '${key}' has value of undefined.`);
        continue;
      }
      const currentValue = this[key];
      if (currentValue === undefined) {
        warn(`Texture.setValues(): property '${key}' does not exist.`);
        continue;
      }
      if (currentValue && newValue && (currentValue.isVector2 && newValue.isVector2)) {
        currentValue.copy(newValue);
      } else if (currentValue && newValue && (currentValue.isVector3 && newValue.isVector3)) {
        currentValue.copy(newValue);
      } else if (currentValue && newValue && (currentValue.isMatrix3 && newValue.isMatrix3)) {
        currentValue.copy(newValue);
      } else {
        this[key] = newValue;
      }
    }
  }
  toJSON(meta) {
    const isRootObject = meta === undefined || typeof meta === "string";
    if (!isRootObject && meta.textures[this.uuid] !== undefined) {
      return meta.textures[this.uuid];
    }
    const output = {
      metadata: {
        version: 4.7,
        type: "Texture",
        generator: "Texture.toJSON"
      },
      uuid: this.uuid,
      name: this.name,
      image: this.source.toJSON(meta).uuid,
      mapping: this.mapping,
      channel: this.channel,
      repeat: [this.repeat.x, this.repeat.y],
      offset: [this.offset.x, this.offset.y],
      center: [this.center.x, this.center.y],
      rotation: this.rotation,
      wrap: [this.wrapS, this.wrapT],
      format: this.format,
      internalFormat: this.internalFormat,
      type: this.type,
      normalized: this.normalized,
      colorSpace: this.colorSpace,
      minFilter: this.minFilter,
      magFilter: this.magFilter,
      anisotropy: this.anisotropy,
      flipY: this.flipY,
      generateMipmaps: this.generateMipmaps,
      premultiplyAlpha: this.premultiplyAlpha,
      unpackAlignment: this.unpackAlignment
    };
    if (Object.keys(this.userData).length > 0)
      output.userData = this.userData;
    if (!isRootObject) {
      meta.textures[this.uuid] = output;
    }
    return output;
  }
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
  transformUv(uv) {
    if (this.mapping !== UVMapping)
      return uv;
    uv.applyMatrix3(this.matrix);
    if (uv.x < 0 || uv.x > 1) {
      switch (this.wrapS) {
        case RepeatWrapping:
          uv.x = uv.x - Math.floor(uv.x);
          break;
        case ClampToEdgeWrapping:
          uv.x = uv.x < 0 ? 0 : 1;
          break;
        case MirroredRepeatWrapping:
          if (Math.abs(Math.floor(uv.x) % 2) === 1) {
            uv.x = Math.ceil(uv.x) - uv.x;
          } else {
            uv.x = uv.x - Math.floor(uv.x);
          }
          break;
      }
    }
    if (uv.y < 0 || uv.y > 1) {
      switch (this.wrapT) {
        case RepeatWrapping:
          uv.y = uv.y - Math.floor(uv.y);
          break;
        case ClampToEdgeWrapping:
          uv.y = uv.y < 0 ? 0 : 1;
          break;
        case MirroredRepeatWrapping:
          if (Math.abs(Math.floor(uv.y) % 2) === 1) {
            uv.y = Math.ceil(uv.y) - uv.y;
          } else {
            uv.y = uv.y - Math.floor(uv.y);
          }
          break;
      }
    }
    if (this.flipY) {
      uv.y = 1 - uv.y;
    }
    return uv;
  }
  set needsUpdate(value) {
    if (value === true) {
      this.version++;
      this.source.needsUpdate = true;
    }
  }
  set needsPMREMUpdate(value) {
    if (value === true) {
      this.pmremVersion++;
    }
  }
}
Texture.DEFAULT_IMAGE = null;
Texture.DEFAULT_MAPPING = UVMapping;
Texture.DEFAULT_ANISOTROPY = 1;

class Vector4 {
  static {
    Vector4.prototype.isVector4 = true;
  }
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
  get width() {
    return this.z;
  }
  set width(value) {
    this.z = value;
  }
  get height() {
    return this.w;
  }
  set height(value) {
    this.w = value;
  }
  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
  setScalar(scalar) {
    this.x = scalar;
    this.y = scalar;
    this.z = scalar;
    this.w = scalar;
    return this;
  }
  setX(x) {
    this.x = x;
    return this;
  }
  setY(y) {
    this.y = y;
    return this;
  }
  setZ(z) {
    this.z = z;
    return this;
  }
  setW(w) {
    this.w = w;
    return this;
  }
  setComponent(index, value) {
    switch (index) {
      case 0:
        this.x = value;
        break;
      case 1:
        this.y = value;
        break;
      case 2:
        this.z = value;
        break;
      case 3:
        this.w = value;
        break;
      default:
        throw new Error("THREE.Vector4: index is out of range: " + index);
    }
    return this;
  }
  getComponent(index) {
    switch (index) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      case 2:
        return this.z;
      case 3:
        return this.w;
      default:
        throw new Error("THREE.Vector4: index is out of range: " + index);
    }
  }
  clone() {
    return new this.constructor(this.x, this.y, this.z, this.w);
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    this.w = v.w !== undefined ? v.w : 1;
    return this;
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    this.w += v.w;
    return this;
  }
  addScalar(s) {
    this.x += s;
    this.y += s;
    this.z += s;
    this.w += s;
    return this;
  }
  addVectors(a, b) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    this.z = a.z + b.z;
    this.w = a.w + b.w;
    return this;
  }
  addScaledVector(v, s) {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    this.w += v.w * s;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    this.w -= v.w;
    return this;
  }
  subScalar(s) {
    this.x -= s;
    this.y -= s;
    this.z -= s;
    this.w -= s;
    return this;
  }
  subVectors(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    this.w = a.w - b.w;
    return this;
  }
  multiply(v) {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    this.w *= v.w;
    return this;
  }
  multiplyScalar(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    this.w *= scalar;
    return this;
  }
  applyMatrix4(m) {
    const x = this.x, y = this.y, z = this.z, w = this.w;
    const e = m.elements;
    this.x = e[0] * x + e[4] * y + e[8] * z + e[12] * w;
    this.y = e[1] * x + e[5] * y + e[9] * z + e[13] * w;
    this.z = e[2] * x + e[6] * y + e[10] * z + e[14] * w;
    this.w = e[3] * x + e[7] * y + e[11] * z + e[15] * w;
    return this;
  }
  divide(v) {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    this.w /= v.w;
    return this;
  }
  divideScalar(scalar) {
    return this.multiplyScalar(1 / scalar);
  }
  setAxisAngleFromQuaternion(q) {
    this.w = 2 * Math.acos(q.w);
    const s = Math.sqrt(1 - q.w * q.w);
    if (s < 0.0001) {
      this.x = 1;
      this.y = 0;
      this.z = 0;
    } else {
      this.x = q.x / s;
      this.y = q.y / s;
      this.z = q.z / s;
    }
    return this;
  }
  setAxisAngleFromRotationMatrix(m) {
    let angle, x, y, z;
    const epsilon = 0.01, epsilon2 = 0.1, te = m.elements, m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10];
    if (Math.abs(m12 - m21) < epsilon && Math.abs(m13 - m31) < epsilon && Math.abs(m23 - m32) < epsilon) {
      if (Math.abs(m12 + m21) < epsilon2 && Math.abs(m13 + m31) < epsilon2 && Math.abs(m23 + m32) < epsilon2 && Math.abs(m11 + m22 + m33 - 3) < epsilon2) {
        this.set(1, 0, 0, 0);
        return this;
      }
      angle = Math.PI;
      const xx = (m11 + 1) / 2;
      const yy = (m22 + 1) / 2;
      const zz = (m33 + 1) / 2;
      const xy = (m12 + m21) / 4;
      const xz = (m13 + m31) / 4;
      const yz = (m23 + m32) / 4;
      if (xx > yy && xx > zz) {
        if (xx < epsilon) {
          x = 0;
          y = 0.707106781;
          z = 0.707106781;
        } else {
          x = Math.sqrt(xx);
          y = xy / x;
          z = xz / x;
        }
      } else if (yy > zz) {
        if (yy < epsilon) {
          x = 0.707106781;
          y = 0;
          z = 0.707106781;
        } else {
          y = Math.sqrt(yy);
          x = xy / y;
          z = yz / y;
        }
      } else {
        if (zz < epsilon) {
          x = 0.707106781;
          y = 0.707106781;
          z = 0;
        } else {
          z = Math.sqrt(zz);
          x = xz / z;
          y = yz / z;
        }
      }
      this.set(x, y, z, angle);
      return this;
    }
    let s = Math.sqrt((m32 - m23) * (m32 - m23) + (m13 - m31) * (m13 - m31) + (m21 - m12) * (m21 - m12));
    if (Math.abs(s) < 0.001)
      s = 1;
    this.x = (m32 - m23) / s;
    this.y = (m13 - m31) / s;
    this.z = (m21 - m12) / s;
    this.w = Math.acos((m11 + m22 + m33 - 1) / 2);
    return this;
  }
  setFromMatrixPosition(m) {
    const e = m.elements;
    this.x = e[12];
    this.y = e[13];
    this.z = e[14];
    this.w = e[15];
    return this;
  }
  min(v) {
    this.x = Math.min(this.x, v.x);
    this.y = Math.min(this.y, v.y);
    this.z = Math.min(this.z, v.z);
    this.w = Math.min(this.w, v.w);
    return this;
  }
  max(v) {
    this.x = Math.max(this.x, v.x);
    this.y = Math.max(this.y, v.y);
    this.z = Math.max(this.z, v.z);
    this.w = Math.max(this.w, v.w);
    return this;
  }
  clamp(min, max) {
    this.x = clamp(this.x, min.x, max.x);
    this.y = clamp(this.y, min.y, max.y);
    this.z = clamp(this.z, min.z, max.z);
    this.w = clamp(this.w, min.w, max.w);
    return this;
  }
  clampScalar(minVal, maxVal) {
    this.x = clamp(this.x, minVal, maxVal);
    this.y = clamp(this.y, minVal, maxVal);
    this.z = clamp(this.z, minVal, maxVal);
    this.w = clamp(this.w, minVal, maxVal);
    return this;
  }
  clampLength(min, max) {
    const length = this.length();
    return this.divideScalar(length || 1).multiplyScalar(clamp(length, min, max));
  }
  floor() {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    this.z = Math.floor(this.z);
    this.w = Math.floor(this.w);
    return this;
  }
  ceil() {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    this.z = Math.ceil(this.z);
    this.w = Math.ceil(this.w);
    return this;
  }
  round() {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    this.z = Math.round(this.z);
    this.w = Math.round(this.w);
    return this;
  }
  roundToZero() {
    this.x = Math.trunc(this.x);
    this.y = Math.trunc(this.y);
    this.z = Math.trunc(this.z);
    this.w = Math.trunc(this.w);
    return this;
  }
  negate() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    this.w = -this.w;
    return this;
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z) + Math.abs(this.w);
  }
  normalize() {
    return this.divideScalar(this.length() || 1);
  }
  setLength(length) {
    return this.normalize().multiplyScalar(length);
  }
  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    this.w += (v.w - this.w) * alpha;
    return this;
  }
  lerpVectors(v1, v2, alpha) {
    this.x = v1.x + (v2.x - v1.x) * alpha;
    this.y = v1.y + (v2.y - v1.y) * alpha;
    this.z = v1.z + (v2.z - v1.z) * alpha;
    this.w = v1.w + (v2.w - v1.w) * alpha;
    return this;
  }
  equals(v) {
    return v.x === this.x && v.y === this.y && v.z === this.z && v.w === this.w;
  }
  fromArray(array, offset = 0) {
    this.x = array[offset];
    this.y = array[offset + 1];
    this.z = array[offset + 2];
    this.w = array[offset + 3];
    return this;
  }
  toArray(array = [], offset = 0) {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    array[offset + 2] = this.z;
    array[offset + 3] = this.w;
    return array;
  }
  fromBufferAttribute(attribute, index) {
    this.x = attribute.getX(index);
    this.y = attribute.getY(index);
    this.z = attribute.getZ(index);
    this.w = attribute.getW(index);
    return this;
  }
  random() {
    this.x = Math.random();
    this.y = Math.random();
    this.z = Math.random();
    this.w = Math.random();
    return this;
  }
  *[Symbol.iterator]() {
    yield this.x;
    yield this.y;
    yield this.z;
    yield this.w;
  }
}

class RenderTarget extends EventDispatcher {
  constructor(width = 1, height = 1, options = {}) {
    super();
    options = Object.assign({
      generateMipmaps: false,
      internalFormat: null,
      minFilter: LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      resolveColorBuffer: true,
      resolveDepthBuffer: true,
      resolveStencilBuffer: true,
      storeMultisampledColorBuffer: true,
      storeMultisampledDepthBuffer: true,
      storeMultisampledStencilBuffer: true,
      depthTexture: null,
      samples: 0,
      count: 1,
      depth: 1,
      multiview: false,
      useArrayDepthTexture: false
    }, options);
    this.isRenderTarget = true;
    this.width = width;
    this.height = height;
    this.depth = options.depth;
    this.scissor = new Vector4(0, 0, width, height);
    this.scissorTest = false;
    this.viewport = new Vector4(0, 0, width, height);
    this.textures = [];
    const image = { width, height, depth: options.depth };
    const texture = new Texture(image);
    const count = options.count;
    for (let i = 0;i < count; i++) {
      this.textures[i] = texture.clone();
      this.textures[i].isRenderTargetTexture = true;
      this.textures[i].renderTarget = this;
    }
    this._setTextureOptions(options);
    this.depthBuffer = options.depthBuffer;
    this.stencilBuffer = options.stencilBuffer;
    this.resolveColorBuffer = options.resolveColorBuffer;
    this.resolveDepthBuffer = options.resolveDepthBuffer;
    this.resolveStencilBuffer = options.resolveStencilBuffer;
    this.storeMultisampledColorBuffer = options.storeMultisampledColorBuffer;
    this.storeMultisampledDepthBuffer = options.storeMultisampledDepthBuffer;
    this.storeMultisampledStencilBuffer = options.storeMultisampledStencilBuffer;
    this._depthTexture = null;
    this.depthTexture = options.depthTexture;
    this.samples = options.samples;
    this.multiview = options.multiview;
    this.useArrayDepthTexture = options.useArrayDepthTexture;
  }
  _setTextureOptions(options = {}) {
    const values = {
      minFilter: LinearFilter,
      generateMipmaps: false,
      flipY: false,
      internalFormat: null
    };
    if (options.mapping !== undefined)
      values.mapping = options.mapping;
    if (options.wrapS !== undefined)
      values.wrapS = options.wrapS;
    if (options.wrapT !== undefined)
      values.wrapT = options.wrapT;
    if (options.wrapR !== undefined)
      values.wrapR = options.wrapR;
    if (options.magFilter !== undefined)
      values.magFilter = options.magFilter;
    if (options.minFilter !== undefined)
      values.minFilter = options.minFilter;
    if (options.format !== undefined)
      values.format = options.format;
    if (options.type !== undefined)
      values.type = options.type;
    if (options.anisotropy !== undefined)
      values.anisotropy = options.anisotropy;
    if (options.colorSpace !== undefined)
      values.colorSpace = options.colorSpace;
    if (options.flipY !== undefined)
      values.flipY = options.flipY;
    if (options.generateMipmaps !== undefined)
      values.generateMipmaps = options.generateMipmaps;
    if (options.internalFormat !== undefined)
      values.internalFormat = options.internalFormat;
    for (let i = 0;i < this.textures.length; i++) {
      const texture = this.textures[i];
      texture.setValues(values);
    }
  }
  get texture() {
    return this.textures[0];
  }
  set texture(value) {
    this.textures[0] = value;
  }
  set depthTexture(current) {
    if (this._depthTexture !== null && this._depthTexture.renderTarget === this)
      this._depthTexture.renderTarget = null;
    if (current !== null && current.renderTarget === null)
      current.renderTarget = this;
    this._depthTexture = current;
  }
  get depthTexture() {
    return this._depthTexture;
  }
  setSize(width, height, depth = 1) {
    if (this.width !== width || this.height !== height || this.depth !== depth) {
      this.width = width;
      this.height = height;
      this.depth = depth;
      for (let i = 0, il = this.textures.length;i < il; i++) {
        this.textures[i].image.width = width;
        this.textures[i].image.height = height;
        this.textures[i].image.depth = depth;
        if (this.textures[i].isData3DTexture !== true) {
          this.textures[i].isArrayTexture = this.textures[i].image.depth > 1;
        }
      }
      this.dispose();
    }
    this.viewport.set(0, 0, width, height);
    this.scissor.set(0, 0, width, height);
  }
  clone() {
    return new this.constructor().copy(this);
  }
  copy(source) {
    this.width = source.width;
    this.height = source.height;
    this.depth = source.depth;
    this.scissor.copy(source.scissor);
    this.scissorTest = source.scissorTest;
    this.viewport.copy(source.viewport);
    this.textures.length = 0;
    for (let i = 0, il = source.textures.length;i < il; i++) {
      this.textures[i] = source.textures[i].clone();
      this.textures[i].isRenderTargetTexture = true;
      this.textures[i].renderTarget = this;
      const image = Object.assign({}, source.textures[i].image);
      this.textures[i].source = new TextureSource(image);
    }
    this.depthBuffer = source.depthBuffer;
    this.stencilBuffer = source.stencilBuffer;
    this.resolveColorBuffer = source.resolveColorBuffer;
    this.resolveDepthBuffer = source.resolveDepthBuffer;
    this.resolveStencilBuffer = source.resolveStencilBuffer;
    this.storeMultisampledColorBuffer = source.storeMultisampledColorBuffer;
    this.storeMultisampledDepthBuffer = source.storeMultisampledDepthBuffer;
    this.storeMultisampledStencilBuffer = source.storeMultisampledStencilBuffer;
    if (source.depthTexture !== null) {
      if (source.depthTexture.renderTarget === source) {
        const depthTexture = source.depthTexture.clone();
        depthTexture.renderTarget = null;
        this.depthTexture = depthTexture;
      } else {
        this.depthTexture = source.depthTexture;
      }
    }
    this.samples = source.samples;
    this.multiview = source.multiview;
    this.useArrayDepthTexture = source.useArrayDepthTexture;
    return this;
  }
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
}
class Matrix4 {
  static {
    Matrix4.prototype.isMatrix4 = true;
  }
  constructor(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
    this.elements = [
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ];
    if (n11 !== undefined) {
      this.set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44);
    }
  }
  set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
    const te = this.elements;
    te[0] = n11;
    te[4] = n12;
    te[8] = n13;
    te[12] = n14;
    te[1] = n21;
    te[5] = n22;
    te[9] = n23;
    te[13] = n24;
    te[2] = n31;
    te[6] = n32;
    te[10] = n33;
    te[14] = n34;
    te[3] = n41;
    te[7] = n42;
    te[11] = n43;
    te[15] = n44;
    return this;
  }
  identity() {
    this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    return this;
  }
  clone() {
    return new Matrix4().fromArray(this.elements);
  }
  copy(m) {
    const te = this.elements;
    const me = m.elements;
    te[0] = me[0];
    te[1] = me[1];
    te[2] = me[2];
    te[3] = me[3];
    te[4] = me[4];
    te[5] = me[5];
    te[6] = me[6];
    te[7] = me[7];
    te[8] = me[8];
    te[9] = me[9];
    te[10] = me[10];
    te[11] = me[11];
    te[12] = me[12];
    te[13] = me[13];
    te[14] = me[14];
    te[15] = me[15];
    return this;
  }
  copyPosition(m) {
    const te = this.elements, me = m.elements;
    te[12] = me[12];
    te[13] = me[13];
    te[14] = me[14];
    return this;
  }
  setFromMatrix3(m) {
    const me = m.elements;
    this.set(me[0], me[3], me[6], 0, me[1], me[4], me[7], 0, me[2], me[5], me[8], 0, 0, 0, 0, 1);
    return this;
  }
  extractBasis(xAxis, yAxis, zAxis) {
    if (this.determinantAffine() === 0) {
      xAxis.set(1, 0, 0);
      yAxis.set(0, 1, 0);
      zAxis.set(0, 0, 1);
      return this;
    }
    xAxis.setFromMatrixColumn(this, 0);
    yAxis.setFromMatrixColumn(this, 1);
    zAxis.setFromMatrixColumn(this, 2);
    return this;
  }
  makeBasis(xAxis, yAxis, zAxis) {
    this.set(xAxis.x, yAxis.x, zAxis.x, 0, xAxis.y, yAxis.y, zAxis.y, 0, xAxis.z, yAxis.z, zAxis.z, 0, 0, 0, 0, 1);
    return this;
  }
  extractRotation(m) {
    if (m.determinantAffine() === 0) {
      return this.identity();
    }
    const te = this.elements;
    const me = m.elements;
    const scaleX = 1 / _v1$7.setFromMatrixColumn(m, 0).length();
    const scaleY = 1 / _v1$7.setFromMatrixColumn(m, 1).length();
    const scaleZ = 1 / _v1$7.setFromMatrixColumn(m, 2).length();
    te[0] = me[0] * scaleX;
    te[1] = me[1] * scaleX;
    te[2] = me[2] * scaleX;
    te[3] = 0;
    te[4] = me[4] * scaleY;
    te[5] = me[5] * scaleY;
    te[6] = me[6] * scaleY;
    te[7] = 0;
    te[8] = me[8] * scaleZ;
    te[9] = me[9] * scaleZ;
    te[10] = me[10] * scaleZ;
    te[11] = 0;
    te[12] = 0;
    te[13] = 0;
    te[14] = 0;
    te[15] = 1;
    return this;
  }
  makeRotationFromEuler(euler) {
    const te = this.elements;
    const { x, y, z } = euler;
    const a = Math.cos(x), b = Math.sin(x);
    const c = Math.cos(y), d = Math.sin(y);
    const e = Math.cos(z), f = Math.sin(z);
    if (euler.order === "XYZ") {
      const ae = a * e, af = a * f, be = b * e, bf = b * f;
      te[0] = c * e;
      te[4] = -c * f;
      te[8] = d;
      te[1] = af + be * d;
      te[5] = ae - bf * d;
      te[9] = -b * c;
      te[2] = bf - ae * d;
      te[6] = be + af * d;
      te[10] = a * c;
    } else if (euler.order === "YXZ") {
      const ce = c * e, cf = c * f, de = d * e, df = d * f;
      te[0] = ce + df * b;
      te[4] = de * b - cf;
      te[8] = a * d;
      te[1] = a * f;
      te[5] = a * e;
      te[9] = -b;
      te[2] = cf * b - de;
      te[6] = df + ce * b;
      te[10] = a * c;
    } else if (euler.order === "ZXY") {
      const ce = c * e, cf = c * f, de = d * e, df = d * f;
      te[0] = ce - df * b;
      te[4] = -a * f;
      te[8] = de + cf * b;
      te[1] = cf + de * b;
      te[5] = a * e;
      te[9] = df - ce * b;
      te[2] = -a * d;
      te[6] = b;
      te[10] = a * c;
    } else if (euler.order === "ZYX") {
      const ae = a * e, af = a * f, be = b * e, bf = b * f;
      te[0] = c * e;
      te[4] = be * d - af;
      te[8] = ae * d + bf;
      te[1] = c * f;
      te[5] = bf * d + ae;
      te[9] = af * d - be;
      te[2] = -d;
      te[6] = b * c;
      te[10] = a * c;
    } else if (euler.order === "YZX") {
      const ac = a * c, ad = a * d, bc = b * c, bd = b * d;
      te[0] = c * e;
      te[4] = bd - ac * f;
      te[8] = bc * f + ad;
      te[1] = f;
      te[5] = a * e;
      te[9] = -b * e;
      te[2] = -d * e;
      te[6] = ad * f + bc;
      te[10] = ac - bd * f;
    } else if (euler.order === "XZY") {
      const ac = a * c, ad = a * d, bc = b * c, bd = b * d;
      te[0] = c * e;
      te[4] = -f;
      te[8] = d * e;
      te[1] = ac * f + bd;
      te[5] = a * e;
      te[9] = ad * f - bc;
      te[2] = bc * f - ad;
      te[6] = b * e;
      te[10] = bd * f + ac;
    }
    te[3] = 0;
    te[7] = 0;
    te[11] = 0;
    te[12] = 0;
    te[13] = 0;
    te[14] = 0;
    te[15] = 1;
    return this;
  }
  makeRotationFromQuaternion(q) {
    return this.compose(_zero, q, _one);
  }
  lookAt(eye, target, up) {
    const te = this.elements;
    _z.subVectors(eye, target);
    if (_z.lengthSq() === 0) {
      _z.z = 1;
    }
    _z.normalize();
    _x.crossVectors(up, _z);
    if (_x.lengthSq() === 0) {
      if (Math.abs(up.z) === 1) {
        _z.x += 0.0001;
      } else {
        _z.z += 0.0001;
      }
      _z.normalize();
      _x.crossVectors(up, _z);
    }
    _x.normalize();
    _y.crossVectors(_z, _x);
    te[0] = _x.x;
    te[4] = _y.x;
    te[8] = _z.x;
    te[1] = _x.y;
    te[5] = _y.y;
    te[9] = _z.y;
    te[2] = _x.z;
    te[6] = _y.z;
    te[10] = _z.z;
    return this;
  }
  multiply(m) {
    return this.multiplyMatrices(this, m);
  }
  premultiply(m) {
    return this.multiplyMatrices(m, this);
  }
  multiplyMatrices(a, b) {
    const ae = a.elements;
    const be = b.elements;
    const te = this.elements;
    const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
    const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
    const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
    const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];
    const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
    const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
    const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
    const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
    return this;
  }
  multiplyScalar(s) {
    const te = this.elements;
    te[0] *= s;
    te[4] *= s;
    te[8] *= s;
    te[12] *= s;
    te[1] *= s;
    te[5] *= s;
    te[9] *= s;
    te[13] *= s;
    te[2] *= s;
    te[6] *= s;
    te[10] *= s;
    te[14] *= s;
    te[3] *= s;
    te[7] *= s;
    te[11] *= s;
    te[15] *= s;
    return this;
  }
  determinant() {
    const te = this.elements;
    const n11 = te[0], n12 = te[4], n13 = te[8], n14 = te[12];
    const n21 = te[1], n22 = te[5], n23 = te[9], n24 = te[13];
    const n31 = te[2], n32 = te[6], n33 = te[10], n34 = te[14];
    const n41 = te[3], n42 = te[7], n43 = te[11], n44 = te[15];
    const t11 = n23 * n34 - n24 * n33;
    const t12 = n22 * n34 - n24 * n32;
    const t13 = n22 * n33 - n23 * n32;
    const t21 = n21 * n34 - n24 * n31;
    const t22 = n21 * n33 - n23 * n31;
    const t23 = n21 * n32 - n22 * n31;
    return n11 * (n42 * t11 - n43 * t12 + n44 * t13) - n12 * (n41 * t11 - n43 * t21 + n44 * t22) + n13 * (n41 * t12 - n42 * t21 + n44 * t23) - n14 * (n41 * t13 - n42 * t22 + n43 * t23);
  }
  determinantAffine() {
    const te = this.elements;
    const n11 = te[0], n12 = te[4], n13 = te[8];
    const n21 = te[1], n22 = te[5], n23 = te[9];
    const n31 = te[2], n32 = te[6], n33 = te[10];
    return n11 * (n22 * n33 - n23 * n32) - n12 * (n21 * n33 - n23 * n31) + n13 * (n21 * n32 - n22 * n31);
  }
  transpose() {
    const te = this.elements;
    let tmp;
    tmp = te[1];
    te[1] = te[4];
    te[4] = tmp;
    tmp = te[2];
    te[2] = te[8];
    te[8] = tmp;
    tmp = te[6];
    te[6] = te[9];
    te[9] = tmp;
    tmp = te[3];
    te[3] = te[12];
    te[12] = tmp;
    tmp = te[7];
    te[7] = te[13];
    te[13] = tmp;
    tmp = te[11];
    te[11] = te[14];
    te[14] = tmp;
    return this;
  }
  setPosition(x, y, z) {
    const te = this.elements;
    if (x.isVector3) {
      te[12] = x.x;
      te[13] = x.y;
      te[14] = x.z;
    } else {
      te[12] = x;
      te[13] = y;
      te[14] = z;
    }
    return this;
  }
  invert() {
    const te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3], n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7], n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11], n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15], t1 = n11 * n22 - n21 * n12, t2 = n11 * n32 - n31 * n12, t3 = n11 * n42 - n41 * n12, t4 = n21 * n32 - n31 * n22, t5 = n21 * n42 - n41 * n22, t6 = n31 * n42 - n41 * n32, t7 = n13 * n24 - n23 * n14, t8 = n13 * n34 - n33 * n14, t9 = n13 * n44 - n43 * n14, t10 = n23 * n34 - n33 * n24, t11 = n23 * n44 - n43 * n24, t12 = n33 * n44 - n43 * n34;
    const det = t1 * t12 - t2 * t11 + t3 * t10 + t4 * t9 - t5 * t8 + t6 * t7;
    if (det === 0)
      return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    const detInv = 1 / det;
    te[0] = (n22 * t12 - n32 * t11 + n42 * t10) * detInv;
    te[1] = (n31 * t11 - n21 * t12 - n41 * t10) * detInv;
    te[2] = (n24 * t6 - n34 * t5 + n44 * t4) * detInv;
    te[3] = (n33 * t5 - n23 * t6 - n43 * t4) * detInv;
    te[4] = (n32 * t9 - n12 * t12 - n42 * t8) * detInv;
    te[5] = (n11 * t12 - n31 * t9 + n41 * t8) * detInv;
    te[6] = (n34 * t3 - n14 * t6 - n44 * t2) * detInv;
    te[7] = (n13 * t6 - n33 * t3 + n43 * t2) * detInv;
    te[8] = (n12 * t11 - n22 * t9 + n42 * t7) * detInv;
    te[9] = (n21 * t9 - n11 * t11 - n41 * t7) * detInv;
    te[10] = (n14 * t5 - n24 * t3 + n44 * t1) * detInv;
    te[11] = (n23 * t3 - n13 * t5 - n43 * t1) * detInv;
    te[12] = (n22 * t8 - n12 * t10 - n32 * t7) * detInv;
    te[13] = (n11 * t10 - n21 * t8 + n31 * t7) * detInv;
    te[14] = (n24 * t2 - n14 * t4 - n34 * t1) * detInv;
    te[15] = (n13 * t4 - n23 * t2 + n33 * t1) * detInv;
    return this;
  }
  scale(v) {
    const te = this.elements;
    const { x, y, z } = v;
    te[0] *= x;
    te[4] *= y;
    te[8] *= z;
    te[1] *= x;
    te[5] *= y;
    te[9] *= z;
    te[2] *= x;
    te[6] *= y;
    te[10] *= z;
    te[3] *= x;
    te[7] *= y;
    te[11] *= z;
    return this;
  }
  getMaxScaleOnAxis() {
    const te = this.elements;
    const scaleXSq = te[0] * te[0] + te[1] * te[1] + te[2] * te[2];
    const scaleYSq = te[4] * te[4] + te[5] * te[5] + te[6] * te[6];
    const scaleZSq = te[8] * te[8] + te[9] * te[9] + te[10] * te[10];
    return Math.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq));
  }
  makeTranslation(x, y, z) {
    if (x.isVector3) {
      this.set(1, 0, 0, x.x, 0, 1, 0, x.y, 0, 0, 1, x.z, 0, 0, 0, 1);
    } else {
      this.set(1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1);
    }
    return this;
  }
  makeRotationX(theta) {
    const c = Math.cos(theta), s = Math.sin(theta);
    this.set(1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1);
    return this;
  }
  makeRotationY(theta) {
    const c = Math.cos(theta), s = Math.sin(theta);
    this.set(c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1);
    return this;
  }
  makeRotationZ(theta) {
    const c = Math.cos(theta), s = Math.sin(theta);
    this.set(c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    return this;
  }
  makeRotationAxis(axis, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    const { x, y, z } = axis;
    const tx = t * x, ty = t * y;
    this.set(tx * x + c, tx * y - s * z, tx * z + s * y, 0, tx * y + s * z, ty * y + c, ty * z - s * x, 0, tx * z - s * y, ty * z + s * x, t * z * z + c, 0, 0, 0, 0, 1);
    return this;
  }
  makeScale(x, y, z) {
    this.set(x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1);
    return this;
  }
  makeShear(xy, xz, yx, yz, zx, zy) {
    this.set(1, yx, zx, 0, xy, 1, zy, 0, xz, yz, 1, 0, 0, 0, 0, 1);
    return this;
  }
  compose(position, quaternion, scale) {
    const te = this.elements;
    const { _x: x, _y: y, _z: z, _w: w } = quaternion;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    const { x: sx, y: sy, z: sz } = scale;
    te[0] = (1 - (yy + zz)) * sx;
    te[1] = (xy + wz) * sx;
    te[2] = (xz - wy) * sx;
    te[3] = 0;
    te[4] = (xy - wz) * sy;
    te[5] = (1 - (xx + zz)) * sy;
    te[6] = (yz + wx) * sy;
    te[7] = 0;
    te[8] = (xz + wy) * sz;
    te[9] = (yz - wx) * sz;
    te[10] = (1 - (xx + yy)) * sz;
    te[11] = 0;
    te[12] = position.x;
    te[13] = position.y;
    te[14] = position.z;
    te[15] = 1;
    return this;
  }
  decompose(position, quaternion, scale) {
    const te = this.elements;
    position.x = te[12];
    position.y = te[13];
    position.z = te[14];
    const det = this.determinantAffine();
    if (det === 0) {
      scale.set(1, 1, 1);
      quaternion.identity();
      return this;
    }
    let sx = _v1$7.set(te[0], te[1], te[2]).length();
    const sy = _v1$7.set(te[4], te[5], te[6]).length();
    const sz = _v1$7.set(te[8], te[9], te[10]).length();
    if (det < 0)
      sx = -sx;
    _m1$2.copy(this);
    const invSX = 1 / sx;
    const invSY = 1 / sy;
    const invSZ = 1 / sz;
    _m1$2.elements[0] *= invSX;
    _m1$2.elements[1] *= invSX;
    _m1$2.elements[2] *= invSX;
    _m1$2.elements[4] *= invSY;
    _m1$2.elements[5] *= invSY;
    _m1$2.elements[6] *= invSY;
    _m1$2.elements[8] *= invSZ;
    _m1$2.elements[9] *= invSZ;
    _m1$2.elements[10] *= invSZ;
    quaternion.setFromRotationMatrix(_m1$2);
    scale.x = sx;
    scale.y = sy;
    scale.z = sz;
    return this;
  }
  makePerspective(left, right, top, bottom, near, far, coordinateSystem = WebGLCoordinateSystem, reversedDepth = false) {
    const te = this.elements;
    const x = 2 * near / (right - left);
    const y = 2 * near / (top - bottom);
    const a = (right + left) / (right - left);
    const b = (top + bottom) / (top - bottom);
    let c, d;
    if (reversedDepth) {
      c = near / (far - near);
      d = far * near / (far - near);
    } else {
      if (coordinateSystem === WebGLCoordinateSystem) {
        c = -(far + near) / (far - near);
        d = -2 * far * near / (far - near);
      } else if (coordinateSystem === WebGPUCoordinateSystem) {
        c = -far / (far - near);
        d = -far * near / (far - near);
      } else {
        throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: " + coordinateSystem);
      }
    }
    te[0] = x;
    te[4] = 0;
    te[8] = a;
    te[12] = 0;
    te[1] = 0;
    te[5] = y;
    te[9] = b;
    te[13] = 0;
    te[2] = 0;
    te[6] = 0;
    te[10] = c;
    te[14] = d;
    te[3] = 0;
    te[7] = 0;
    te[11] = -1;
    te[15] = 0;
    return this;
  }
  makeOrthographic(left, right, top, bottom, near, far, coordinateSystem = WebGLCoordinateSystem, reversedDepth = false) {
    const te = this.elements;
    const x = 2 / (right - left);
    const y = 2 / (top - bottom);
    const a = -(right + left) / (right - left);
    const b = -(top + bottom) / (top - bottom);
    let c, d;
    if (reversedDepth) {
      c = 1 / (far - near);
      d = far / (far - near);
    } else {
      if (coordinateSystem === WebGLCoordinateSystem) {
        c = -2 / (far - near);
        d = -(far + near) / (far - near);
      } else if (coordinateSystem === WebGPUCoordinateSystem) {
        c = -1 / (far - near);
        d = -near / (far - near);
      } else {
        throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: " + coordinateSystem);
      }
    }
    te[0] = x;
    te[4] = 0;
    te[8] = 0;
    te[12] = a;
    te[1] = 0;
    te[5] = y;
    te[9] = 0;
    te[13] = b;
    te[2] = 0;
    te[6] = 0;
    te[10] = c;
    te[14] = d;
    te[3] = 0;
    te[7] = 0;
    te[11] = 0;
    te[15] = 1;
    return this;
  }
  equals(matrix) {
    const te = this.elements;
    const me = matrix.elements;
    for (let i = 0;i < 16; i++) {
      if (te[i] !== me[i])
        return false;
    }
    return true;
  }
  fromArray(array, offset = 0) {
    for (let i = 0;i < 16; i++) {
      this.elements[i] = array[i + offset];
    }
    return this;
  }
  toArray(array = [], offset = 0) {
    const te = this.elements;
    array[offset] = te[0];
    array[offset + 1] = te[1];
    array[offset + 2] = te[2];
    array[offset + 3] = te[3];
    array[offset + 4] = te[4];
    array[offset + 5] = te[5];
    array[offset + 6] = te[6];
    array[offset + 7] = te[7];
    array[offset + 8] = te[8];
    array[offset + 9] = te[9];
    array[offset + 10] = te[10];
    array[offset + 11] = te[11];
    array[offset + 12] = te[12];
    array[offset + 13] = te[13];
    array[offset + 14] = te[14];
    array[offset + 15] = te[15];
    return array;
  }
}
var _v1$7 = /* @__PURE__ */ new Vector3;
var _m1$2 = /* @__PURE__ */ new Matrix4;
var _zero = /* @__PURE__ */ new Vector3(0, 0, 0);
var _one = /* @__PURE__ */ new Vector3(1, 1, 1);
var _x = /* @__PURE__ */ new Vector3;
var _y = /* @__PURE__ */ new Vector3;
var _z = /* @__PURE__ */ new Vector3;
var _matrix$2 = /* @__PURE__ */ new Matrix4;
var _quaternion$4 = /* @__PURE__ */ new Quaternion;

class Euler {
  constructor(x = 0, y = 0, z = 0, order = Euler.DEFAULT_ORDER) {
    this.isEuler = true;
    this._x = x;
    this._y = y;
    this._z = z;
    this._order = order;
  }
  get x() {
    return this._x;
  }
  set x(value) {
    this._x = value;
    this._onChangeCallback();
  }
  get y() {
    return this._y;
  }
  set y(value) {
    this._y = value;
    this._onChangeCallback();
  }
  get z() {
    return this._z;
  }
  set z(value) {
    this._z = value;
    this._onChangeCallback();
  }
  get order() {
    return this._order;
  }
  set order(value) {
    this._order = value;
    this._onChangeCallback();
  }
  set(x, y, z, order = this._order) {
    this._x = x;
    this._y = y;
    this._z = z;
    this._order = order;
    this._onChangeCallback();
    return this;
  }
  clone() {
    return new this.constructor(this._x, this._y, this._z, this._order);
  }
  copy(euler) {
    this._x = euler._x;
    this._y = euler._y;
    this._z = euler._z;
    this._order = euler._order;
    this._onChangeCallback();
    return this;
  }
  setFromRotationMatrix(m, order = this._order, update = true) {
    const te = m.elements;
    const m11 = te[0], m12 = te[4], m13 = te[8];
    const m21 = te[1], m22 = te[5], m23 = te[9];
    const m31 = te[2], m32 = te[6], m33 = te[10];
    switch (order) {
      case "XYZ":
        this._y = Math.asin(clamp(m13, -1, 1));
        if (Math.abs(m13) < 0.9999999) {
          this._x = Math.atan2(-m23, m33);
          this._z = Math.atan2(-m12, m11);
        } else {
          this._x = Math.atan2(m32, m22);
          this._z = 0;
        }
        break;
      case "YXZ":
        this._x = Math.asin(-clamp(m23, -1, 1));
        if (Math.abs(m23) < 0.9999999) {
          this._y = Math.atan2(m13, m33);
          this._z = Math.atan2(m21, m22);
        } else {
          this._y = Math.atan2(-m31, m11);
          this._z = 0;
        }
        break;
      case "ZXY":
        this._x = Math.asin(clamp(m32, -1, 1));
        if (Math.abs(m32) < 0.9999999) {
          this._y = Math.atan2(-m31, m33);
          this._z = Math.atan2(-m12, m22);
        } else {
          this._y = 0;
          this._z = Math.atan2(m21, m11);
        }
        break;
      case "ZYX":
        this._y = Math.asin(-clamp(m31, -1, 1));
        if (Math.abs(m31) < 0.9999999) {
          this._x = Math.atan2(m32, m33);
          this._z = Math.atan2(m21, m11);
        } else {
          this._x = 0;
          this._z = Math.atan2(-m12, m22);
        }
        break;
      case "YZX":
        this._z = Math.asin(clamp(m21, -1, 1));
        if (Math.abs(m21) < 0.9999999) {
          this._x = Math.atan2(-m23, m22);
          this._y = Math.atan2(-m31, m11);
        } else {
          this._x = 0;
          this._y = Math.atan2(m13, m33);
        }
        break;
      case "XZY":
        this._z = Math.asin(-clamp(m12, -1, 1));
        if (Math.abs(m12) < 0.9999999) {
          this._x = Math.atan2(m32, m22);
          this._y = Math.atan2(m13, m11);
        } else {
          this._x = Math.atan2(-m23, m33);
          this._y = 0;
        }
        break;
      default:
        warn("Euler: .setFromRotationMatrix() encountered an unknown order: " + order);
    }
    this._order = order;
    if (update === true)
      this._onChangeCallback();
    return this;
  }
  setFromQuaternion(q, order, update) {
    _matrix$2.makeRotationFromQuaternion(q);
    return this.setFromRotationMatrix(_matrix$2, order, update);
  }
  setFromVector3(v, order = this._order) {
    return this.set(v.x, v.y, v.z, order);
  }
  reorder(newOrder) {
    _quaternion$4.setFromEuler(this);
    return this.setFromQuaternion(_quaternion$4, newOrder);
  }
  equals(euler) {
    return euler._x === this._x && euler._y === this._y && euler._z === this._z && euler._order === this._order;
  }
  fromArray(array) {
    this._x = array[0];
    this._y = array[1];
    this._z = array[2];
    if (array[3] !== undefined)
      this._order = array[3];
    this._onChangeCallback();
    return this;
  }
  toArray(array = [], offset = 0) {
    array[offset] = this._x;
    array[offset + 1] = this._y;
    array[offset + 2] = this._z;
    array[offset + 3] = this._order;
    return array;
  }
  _onChange(callback) {
    this._onChangeCallback = callback;
    return this;
  }
  _onChangeCallback() {}
  *[Symbol.iterator]() {
    yield this._x;
    yield this._y;
    yield this._z;
    yield this._order;
  }
}
Euler.DEFAULT_ORDER = "XYZ";

class Layers {
  constructor() {
    this.mask = 1 | 0;
  }
  set(layer) {
    this.mask = (1 << layer | 0) >>> 0;
  }
  enable(layer) {
    this.mask |= 1 << layer | 0;
  }
  enableAll() {
    this.mask = 4294967295 | 0;
  }
  toggle(layer) {
    this.mask ^= 1 << layer | 0;
  }
  disable(layer) {
    this.mask &= ~(1 << layer | 0);
  }
  disableAll() {
    this.mask = 0;
  }
  test(layers) {
    return (this.mask & layers.mask) !== 0;
  }
  isEnabled(layer) {
    return (this.mask & (1 << layer | 0)) !== 0;
  }
}
var _object3DId = 0;
var _v1$6 = /* @__PURE__ */ new Vector3;
var _q1 = /* @__PURE__ */ new Quaternion;
var _m1$1 = /* @__PURE__ */ new Matrix4;
var _target = /* @__PURE__ */ new Vector3;
var _position$4 = /* @__PURE__ */ new Vector3;
var _scale$3 = /* @__PURE__ */ new Vector3;
var _quaternion$3 = /* @__PURE__ */ new Quaternion;
var _xAxis = /* @__PURE__ */ new Vector3(1, 0, 0);
var _yAxis = /* @__PURE__ */ new Vector3(0, 1, 0);
var _zAxis = /* @__PURE__ */ new Vector3(0, 0, 1);
var _addedEvent = { type: "added" };
var _removedEvent = { type: "removed" };
var _childaddedEvent = { type: "childadded", child: null };
var _childremovedEvent = { type: "childremoved", child: null };

class Object3D extends EventDispatcher {
  constructor() {
    super();
    this.isObject3D = true;
    Object.defineProperty(this, "id", { value: _object3DId++ });
    this.uuid = generateUUID();
    this.name = "";
    this.type = "Object3D";
    this.parent = null;
    this.children = [];
    this.up = Object3D.DEFAULT_UP.clone();
    const position = new Vector3;
    const rotation = new Euler;
    const quaternion = new Quaternion;
    const scale = new Vector3(1, 1, 1);
    function onRotationChange() {
      quaternion.setFromEuler(rotation, false);
    }
    function onQuaternionChange() {
      rotation.setFromQuaternion(quaternion, undefined, false);
    }
    rotation._onChange(onRotationChange);
    quaternion._onChange(onQuaternionChange);
    Object.defineProperties(this, {
      position: {
        configurable: true,
        enumerable: true,
        value: position
      },
      rotation: {
        configurable: true,
        enumerable: true,
        value: rotation
      },
      quaternion: {
        configurable: true,
        enumerable: true,
        value: quaternion
      },
      scale: {
        configurable: true,
        enumerable: true,
        value: scale
      },
      modelViewMatrix: {
        value: new Matrix4
      },
      normalMatrix: {
        value: new Matrix3
      }
    });
    this.matrix = new Matrix4;
    this.matrixWorld = new Matrix4;
    this.matrixAutoUpdate = Object3D.DEFAULT_MATRIX_AUTO_UPDATE;
    this.matrixWorldAutoUpdate = Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE;
    this.matrixWorldNeedsUpdate = false;
    this.layers = new Layers;
    this.visible = true;
    this.castShadow = false;
    this.receiveShadow = false;
    this.frustumCulled = true;
    this.renderOrder = 0;
    this.animations = [];
    this.customDepthMaterial = undefined;
    this.customDistanceMaterial = undefined;
    this.static = false;
    this.userData = {};
    this.pivot = null;
  }
  onBeforeShadow() {}
  onAfterShadow() {}
  onBeforeRender() {}
  onAfterRender() {}
  applyMatrix4(matrix) {
    if (this.matrixAutoUpdate)
      this.updateMatrix();
    this.matrix.premultiply(matrix);
    this.matrix.decompose(this.position, this.quaternion, this.scale);
  }
  applyQuaternion(q) {
    this.quaternion.premultiply(q);
    return this;
  }
  setRotationFromAxisAngle(axis, angle) {
    this.quaternion.setFromAxisAngle(axis, angle);
  }
  setRotationFromEuler(euler) {
    this.quaternion.setFromEuler(euler, true);
  }
  setRotationFromMatrix(m) {
    this.quaternion.setFromRotationMatrix(m);
  }
  setRotationFromQuaternion(q) {
    this.quaternion.copy(q);
  }
  rotateOnAxis(axis, angle) {
    _q1.setFromAxisAngle(axis, angle);
    this.quaternion.multiply(_q1);
    return this;
  }
  rotateOnWorldAxis(axis, angle) {
    _q1.setFromAxisAngle(axis, angle);
    this.quaternion.premultiply(_q1);
    return this;
  }
  rotateX(angle) {
    return this.rotateOnAxis(_xAxis, angle);
  }
  rotateY(angle) {
    return this.rotateOnAxis(_yAxis, angle);
  }
  rotateZ(angle) {
    return this.rotateOnAxis(_zAxis, angle);
  }
  translateOnAxis(axis, distance) {
    _v1$6.copy(axis).applyQuaternion(this.quaternion);
    this.position.add(_v1$6.multiplyScalar(distance));
    return this;
  }
  translateX(distance) {
    return this.translateOnAxis(_xAxis, distance);
  }
  translateY(distance) {
    return this.translateOnAxis(_yAxis, distance);
  }
  translateZ(distance) {
    return this.translateOnAxis(_zAxis, distance);
  }
  localToWorld(vector) {
    this.updateWorldMatrix(true, false);
    return vector.applyMatrix4(this.matrixWorld);
  }
  worldToLocal(vector) {
    this.updateWorldMatrix(true, false);
    return vector.applyMatrix4(_m1$1.copy(this.matrixWorld).invert());
  }
  lookAt(x, y, z) {
    if (x.isVector3) {
      _target.copy(x);
    } else {
      _target.set(x, y, z);
    }
    const parent = this.parent;
    this.updateWorldMatrix(true, false);
    _position$4.setFromMatrixPosition(this.matrixWorld);
    if (this.isCamera || this.isLight) {
      _m1$1.lookAt(_position$4, _target, this.up);
    } else {
      _m1$1.lookAt(_target, _position$4, this.up);
    }
    this.quaternion.setFromRotationMatrix(_m1$1);
    if (parent) {
      _m1$1.extractRotation(parent.matrixWorld);
      _q1.setFromRotationMatrix(_m1$1);
      this.quaternion.premultiply(_q1.invert());
    }
  }
  add(object) {
    if (arguments.length > 1) {
      for (let i = 0;i < arguments.length; i++) {
        this.add(arguments[i]);
      }
      return this;
    }
    if (object === this) {
      error("Object3D.add: object can't be added as a child of itself.", object);
      return this;
    }
    if (object && object.isObject3D) {
      object.removeFromParent();
      object.parent = this;
      this.children.push(object);
      object.dispatchEvent(_addedEvent);
      _childaddedEvent.child = object;
      this.dispatchEvent(_childaddedEvent);
      _childaddedEvent.child = null;
    } else {
      error("Object3D.add: object not an instance of THREE.Object3D.", object);
    }
    return this;
  }
  remove(object) {
    if (arguments.length > 1) {
      for (let i = 0;i < arguments.length; i++) {
        this.remove(arguments[i]);
      }
      return this;
    }
    const index = this.children.indexOf(object);
    if (index !== -1) {
      object.parent = null;
      this.children.splice(index, 1);
      object.dispatchEvent(_removedEvent);
      _childremovedEvent.child = object;
      this.dispatchEvent(_childremovedEvent);
      _childremovedEvent.child = null;
    }
    return this;
  }
  removeFromParent() {
    const parent = this.parent;
    if (parent !== null) {
      parent.remove(this);
    }
    return this;
  }
  clear() {
    return this.remove(...this.children);
  }
  attach(object) {
    this.updateWorldMatrix(true, false);
    _m1$1.copy(this.matrixWorld).invert();
    if (object.parent !== null) {
      object.parent.updateWorldMatrix(true, false);
      _m1$1.multiply(object.parent.matrixWorld);
    }
    object.applyMatrix4(_m1$1);
    object.removeFromParent();
    object.parent = this;
    this.children.push(object);
    object.updateWorldMatrix(false, true);
    object.dispatchEvent(_addedEvent);
    _childaddedEvent.child = object;
    this.dispatchEvent(_childaddedEvent);
    _childaddedEvent.child = null;
    return this;
  }
  getObjectById(id) {
    return this.getObjectByProperty("id", id);
  }
  getObjectByName(name) {
    return this.getObjectByProperty("name", name);
  }
  getObjectByProperty(name, value) {
    if (this[name] === value)
      return this;
    for (let i = 0, l = this.children.length;i < l; i++) {
      const child = this.children[i];
      const object = child.getObjectByProperty(name, value);
      if (object !== undefined) {
        return object;
      }
    }
    return;
  }
  getObjectsByProperty(name, value, result = []) {
    if (this[name] === value)
      result.push(this);
    const children = this.children;
    for (let i = 0, l = children.length;i < l; i++) {
      children[i].getObjectsByProperty(name, value, result);
    }
    return result;
  }
  getWorldPosition(target) {
    this.updateWorldMatrix(true, false);
    return target.setFromMatrixPosition(this.matrixWorld);
  }
  getWorldQuaternion(target) {
    this.updateWorldMatrix(true, false);
    this.matrixWorld.decompose(_position$4, target, _scale$3);
    return target;
  }
  getWorldScale(target) {
    this.updateWorldMatrix(true, false);
    this.matrixWorld.decompose(_position$4, _quaternion$3, target);
    return target;
  }
  getWorldDirection(target) {
    this.updateWorldMatrix(true, false);
    const e = this.matrixWorld.elements;
    return target.set(e[8], e[9], e[10]).normalize();
  }
  raycast() {}
  intersectsFrustum() {}
  traverse(callback) {
    callback(this);
    const children = this.children;
    for (let i = 0, l = children.length;i < l; i++) {
      children[i].traverse(callback);
    }
  }
  traverseVisible(callback) {
    if (this.visible === false)
      return;
    callback(this);
    const children = this.children;
    for (let i = 0, l = children.length;i < l; i++) {
      children[i].traverseVisible(callback);
    }
  }
  traverseAncestors(callback) {
    const parent = this.parent;
    if (parent !== null) {
      callback(parent);
      parent.traverseAncestors(callback);
    }
  }
  updateMatrix() {
    this.matrix.compose(this.position, this.quaternion, this.scale);
    const pivot = this.pivot;
    if (pivot !== null) {
      const { x: px, y: py, z: pz } = pivot;
      const te = this.matrix.elements;
      te[12] += px - te[0] * px - te[4] * py - te[8] * pz;
      te[13] += py - te[1] * px - te[5] * py - te[9] * pz;
      te[14] += pz - te[2] * px - te[6] * py - te[10] * pz;
    }
    this.matrixWorldNeedsUpdate = true;
  }
  updateMatrixWorld(force) {
    if (this.matrixAutoUpdate)
      this.updateMatrix();
    if (this.matrixWorldNeedsUpdate || force) {
      if (this.matrixWorldAutoUpdate === true) {
        if (this.parent === null) {
          this.matrixWorld.copy(this.matrix);
        } else {
          this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
        }
      }
      this.matrixWorldNeedsUpdate = false;
      force = true;
    }
    const children = this.children;
    for (let i = 0, l = children.length;i < l; i++) {
      const child = children[i];
      child.updateMatrixWorld(force);
    }
  }
  updateWorldMatrix(updateParents, updateChildren, force = false) {
    const parent = this.parent;
    if (updateParents === true && parent !== null) {
      parent.updateWorldMatrix(true, false);
    }
    if (this.matrixAutoUpdate)
      this.updateMatrix();
    if (this.matrixWorldNeedsUpdate || force) {
      if (this.matrixWorldAutoUpdate === true) {
        if (this.parent === null) {
          this.matrixWorld.copy(this.matrix);
        } else {
          this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
        }
      }
      this.matrixWorldNeedsUpdate = false;
      force = true;
    }
    if (updateChildren === true) {
      const children = this.children;
      for (let i = 0, l = children.length;i < l; i++) {
        const child = children[i];
        child.updateWorldMatrix(false, true, force);
      }
    }
  }
  toJSON(meta) {
    const isRootObject = meta === undefined || typeof meta === "string";
    const output = {};
    if (isRootObject) {
      meta = {
        geometries: {},
        materials: {},
        textures: {},
        images: {},
        shapes: {},
        skeletons: {},
        animations: {},
        nodes: {}
      };
      output.metadata = {
        version: 4.7,
        type: "Object",
        generator: "Object3D.toJSON"
      };
    }
    const object = {};
    object.uuid = this.uuid;
    object.type = this.type;
    object.name = this.name;
    object.castShadow = this.castShadow;
    object.receiveShadow = this.receiveShadow;
    object.visible = this.visible;
    object.frustumCulled = this.frustumCulled;
    object.renderOrder = this.renderOrder;
    object.static = this.static;
    object.matrixAutoUpdate = this.matrixAutoUpdate;
    if (Object.keys(this.userData).length > 0)
      object.userData = this.userData;
    object.layers = this.layers.mask;
    object.matrix = this.matrix.toArray();
    object.up = this.up.toArray();
    if (this.pivot !== null)
      object.pivot = this.pivot.toArray();
    if (this.morphTargetDictionary !== undefined)
      object.morphTargetDictionary = Object.assign({}, this.morphTargetDictionary);
    if (this.morphTargetInfluences !== undefined)
      object.morphTargetInfluences = this.morphTargetInfluences.slice();
    if (this.isInstancedMesh) {
      object.type = "InstancedMesh";
      object.count = this.count;
      object.instanceMatrix = this.instanceMatrix.toJSON();
      if (this.instanceColor !== null)
        object.instanceColor = this.instanceColor.toJSON();
    }
    if (this.isBatchedMesh) {
      object.type = "BatchedMesh";
      object.perObjectFrustumCulled = this.perObjectFrustumCulled;
      object.sortObjects = this.sortObjects;
      object.drawRanges = this._drawRanges;
      object.reservedRanges = this._reservedRanges;
      object.geometryInfo = this._geometryInfo.map((info) => ({
        ...info,
        boundingBox: info.boundingBox ? info.boundingBox.toJSON() : undefined,
        boundingSphere: info.boundingSphere ? info.boundingSphere.toJSON() : undefined
      }));
      object.instanceInfo = this._instanceInfo.map((info) => ({ ...info }));
      object.availableInstanceIds = this._availableInstanceIds.slice();
      object.availableGeometryIds = this._availableGeometryIds.slice();
      object.nextIndexStart = this._nextIndexStart;
      object.nextVertexStart = this._nextVertexStart;
      object.geometryCount = this._geometryCount;
      object.maxInstanceCount = this._maxInstanceCount;
      object.maxVertexCount = this._maxVertexCount;
      object.maxIndexCount = this._maxIndexCount;
      object.geometryInitialized = this._geometryInitialized;
      object.matricesTexture = this._matricesTexture.toJSON(meta);
      object.indirectTexture = this._indirectTexture.toJSON(meta);
      if (this._colorsTexture !== null) {
        object.colorsTexture = this._colorsTexture.toJSON(meta);
      }
      if (this.boundingSphere !== null) {
        object.boundingSphere = this.boundingSphere.toJSON();
      }
      if (this.boundingBox !== null) {
        object.boundingBox = this.boundingBox.toJSON();
      }
    }
    function serialize(library, element) {
      if (library[element.uuid] === undefined) {
        library[element.uuid] = element.toJSON(meta);
      }
      return element.uuid;
    }
    if (this.isScene) {
      if (this.background) {
        if (this.background.isColor) {
          object.background = this.background.toJSON();
        } else if (this.background.isTexture) {
          object.background = this.background.toJSON(meta).uuid;
        }
      }
      if (this.environment && this.environment.isTexture && this.environment.isRenderTargetTexture !== true) {
        object.environment = this.environment.toJSON(meta).uuid;
      }
    } else if (this.isMesh || this.isLine || this.isPoints) {
      object.geometry = serialize(meta.geometries, this.geometry);
      const parameters = this.geometry.parameters;
      if (parameters !== undefined && parameters.shapes !== undefined) {
        const shapes = parameters.shapes;
        if (Array.isArray(shapes)) {
          for (let i = 0, l = shapes.length;i < l; i++) {
            const shape = shapes[i];
            serialize(meta.shapes, shape);
          }
        } else {
          serialize(meta.shapes, shapes);
        }
      }
    }
    if (this.isSkinnedMesh) {
      object.bindMode = this.bindMode;
      object.bindMatrix = this.bindMatrix.toArray();
      if (this.skeleton !== undefined) {
        serialize(meta.skeletons, this.skeleton);
        object.skeleton = this.skeleton.uuid;
      }
    }
    if (this.material !== undefined) {
      if (Array.isArray(this.material)) {
        const uuids = [];
        for (let i = 0, l = this.material.length;i < l; i++) {
          uuids.push(serialize(meta.materials, this.material[i]));
        }
        object.material = uuids;
      } else {
        object.material = serialize(meta.materials, this.material);
      }
    }
    if (this.children.length > 0) {
      object.children = [];
      for (let i = 0;i < this.children.length; i++) {
        object.children.push(this.children[i].toJSON(meta).object);
      }
    }
    if (this.animations.length > 0) {
      object.animations = [];
      for (let i = 0;i < this.animations.length; i++) {
        const animation = this.animations[i];
        object.animations.push(serialize(meta.animations, animation));
      }
    }
    if (isRootObject) {
      const geometries = extractFromCache(meta.geometries);
      const materials = extractFromCache(meta.materials);
      const textures = extractFromCache(meta.textures);
      const images = extractFromCache(meta.images);
      const shapes = extractFromCache(meta.shapes);
      const skeletons = extractFromCache(meta.skeletons);
      const animations = extractFromCache(meta.animations);
      const nodes = extractFromCache(meta.nodes);
      if (geometries.length > 0)
        output.geometries = geometries;
      if (materials.length > 0)
        output.materials = materials;
      if (textures.length > 0)
        output.textures = textures;
      if (images.length > 0)
        output.images = images;
      if (shapes.length > 0)
        output.shapes = shapes;
      if (skeletons.length > 0)
        output.skeletons = skeletons;
      if (animations.length > 0)
        output.animations = animations;
      if (nodes.length > 0)
        output.nodes = nodes;
    }
    output.object = object;
    return output;
    function extractFromCache(cache) {
      const values = [];
      for (const key in cache) {
        const data = cache[key];
        delete data.metadata;
        values.push(data);
      }
      return values;
    }
  }
  clone(recursive) {
    return new this.constructor().copy(this, recursive);
  }
  copy(source, recursive = true) {
    this.name = source.name;
    this.up.copy(source.up);
    this.position.copy(source.position);
    this.rotation.order = source.rotation.order;
    this.quaternion.copy(source.quaternion);
    this.scale.copy(source.scale);
    this.pivot = source.pivot !== null ? source.pivot.clone() : null;
    this.matrix.copy(source.matrix);
    this.matrixWorld.copy(source.matrixWorld);
    this.matrixAutoUpdate = source.matrixAutoUpdate;
    this.matrixWorldAutoUpdate = source.matrixWorldAutoUpdate;
    this.matrixWorldNeedsUpdate = source.matrixWorldNeedsUpdate;
    this.layers.mask = source.layers.mask;
    this.visible = source.visible;
    this.castShadow = source.castShadow;
    this.receiveShadow = source.receiveShadow;
    this.frustumCulled = source.frustumCulled;
    this.renderOrder = source.renderOrder;
    this.static = source.static;
    this.animations = source.animations.slice();
    this.userData = JSON.parse(JSON.stringify(source.userData));
    if (recursive === true) {
      for (let i = 0;i < source.children.length; i++) {
        const child = source.children[i];
        this.add(child.clone());
      }
    }
    return this;
  }
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
}
Object3D.DEFAULT_UP = /* @__PURE__ */ new Vector3(0, 1, 0);
Object3D.DEFAULT_MATRIX_AUTO_UPDATE = true;
Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = true;
var _colorKeywords = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
var _hslA = { h: 0, s: 0, l: 0 };
var _hslB = { h: 0, s: 0, l: 0 };
function hue2rgb(p, q, t) {
  if (t < 0)
    t += 1;
  if (t > 1)
    t -= 1;
  if (t < 1 / 6)
    return p + (q - p) * 6 * t;
  if (t < 1 / 2)
    return q;
  if (t < 2 / 3)
    return p + (q - p) * 6 * (2 / 3 - t);
  return p;
}

class Color {
  constructor(r, g, b) {
    this.isColor = true;
    this.r = 1;
    this.g = 1;
    this.b = 1;
    return this.set(r, g, b);
  }
  set(r, g, b) {
    if (g === undefined && b === undefined) {
      const value = r;
      if (value && value.isColor) {
        this.copy(value);
      } else if (typeof value === "number") {
        this.setHex(value);
      } else if (typeof value === "string") {
        this.setStyle(value);
      }
    } else {
      this.setRGB(r, g, b);
    }
    return this;
  }
  setScalar(scalar) {
    this.r = scalar;
    this.g = scalar;
    this.b = scalar;
    return this;
  }
  setHex(hex, colorSpace = SRGBColorSpace) {
    hex = Math.floor(hex);
    this.r = (hex >> 16 & 255) / 255;
    this.g = (hex >> 8 & 255) / 255;
    this.b = (hex & 255) / 255;
    ColorManagement.colorSpaceToWorking(this, colorSpace);
    return this;
  }
  setRGB(r, g, b, colorSpace = ColorManagement.workingColorSpace) {
    this.r = r;
    this.g = g;
    this.b = b;
    ColorManagement.colorSpaceToWorking(this, colorSpace);
    return this;
  }
  setHSL(h, s, l, colorSpace = ColorManagement.workingColorSpace) {
    h = euclideanModulo(h, 1);
    s = clamp(s, 0, 1);
    l = clamp(l, 0, 1);
    if (s === 0) {
      this.r = this.g = this.b = l;
    } else {
      const p = l <= 0.5 ? l * (1 + s) : l + s - l * s;
      const q = 2 * l - p;
      this.r = hue2rgb(q, p, h + 1 / 3);
      this.g = hue2rgb(q, p, h);
      this.b = hue2rgb(q, p, h - 1 / 3);
    }
    ColorManagement.colorSpaceToWorking(this, colorSpace);
    return this;
  }
  setStyle(style, colorSpace = SRGBColorSpace) {
    function handleAlpha(string) {
      if (string === undefined)
        return;
      if (parseFloat(string) < 1) {
        warn("Color: Alpha component of " + style + " will be ignored.");
      }
    }
    let m;
    if (m = /^(\w+)\(([^\)]*)\)/.exec(style)) {
      let color;
      const name = m[1];
      const components = m[2];
      switch (name) {
        case "rgb":
        case "rgba":
          if (color = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(components)) {
            handleAlpha(color[4]);
            return this.setRGB(Math.min(255, parseInt(color[1], 10)) / 255, Math.min(255, parseInt(color[2], 10)) / 255, Math.min(255, parseInt(color[3], 10)) / 255, colorSpace);
          }
          if (color = /^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(components)) {
            handleAlpha(color[4]);
            return this.setRGB(Math.min(100, parseInt(color[1], 10)) / 100, Math.min(100, parseInt(color[2], 10)) / 100, Math.min(100, parseInt(color[3], 10)) / 100, colorSpace);
          }
          break;
        case "hsl":
        case "hsla":
          if (color = /^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(components)) {
            handleAlpha(color[4]);
            return this.setHSL(parseFloat(color[1]) / 360, parseFloat(color[2]) / 100, parseFloat(color[3]) / 100, colorSpace);
          }
          break;
        default:
          warn("Color: Unknown color model " + style);
      }
    } else if (m = /^\#([A-Fa-f\d]+)$/.exec(style)) {
      const hex = m[1];
      const size = hex.length;
      if (size === 3) {
        return this.setRGB(parseInt(hex.charAt(0), 16) / 15, parseInt(hex.charAt(1), 16) / 15, parseInt(hex.charAt(2), 16) / 15, colorSpace);
      } else if (size === 6) {
        return this.setHex(parseInt(hex, 16), colorSpace);
      } else {
        warn("Color: Invalid hex color " + style);
      }
    } else if (style && style.length > 0) {
      return this.setColorName(style, colorSpace);
    }
    return this;
  }
  setColorName(style, colorSpace = SRGBColorSpace) {
    const hex = _colorKeywords[style.toLowerCase()];
    if (hex !== undefined) {
      this.setHex(hex, colorSpace);
    } else {
      warn("Color: Unknown color " + style);
    }
    return this;
  }
  clone() {
    return new this.constructor(this.r, this.g, this.b);
  }
  copy(color) {
    this.r = color.r;
    this.g = color.g;
    this.b = color.b;
    return this;
  }
  copySRGBToLinear(color) {
    this.r = SRGBToLinear(color.r);
    this.g = SRGBToLinear(color.g);
    this.b = SRGBToLinear(color.b);
    return this;
  }
  copyLinearToSRGB(color) {
    this.r = LinearToSRGB(color.r);
    this.g = LinearToSRGB(color.g);
    this.b = LinearToSRGB(color.b);
    return this;
  }
  convertSRGBToLinear() {
    this.copySRGBToLinear(this);
    return this;
  }
  convertLinearToSRGB() {
    this.copyLinearToSRGB(this);
    return this;
  }
  getHex(colorSpace = SRGBColorSpace) {
    ColorManagement.workingToColorSpace(_color.copy(this), colorSpace);
    return Math.round(clamp(_color.r * 255, 0, 255)) * 65536 + Math.round(clamp(_color.g * 255, 0, 255)) * 256 + Math.round(clamp(_color.b * 255, 0, 255));
  }
  getHexString(colorSpace = SRGBColorSpace) {
    return ("000000" + this.getHex(colorSpace).toString(16)).slice(-6);
  }
  getHSL(target, colorSpace = ColorManagement.workingColorSpace) {
    ColorManagement.workingToColorSpace(_color.copy(this), colorSpace);
    const { r, g, b } = _color;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue, saturation;
    const lightness = (min + max) / 2;
    if (min === max) {
      hue = 0;
      saturation = 0;
    } else {
      const delta = max - min;
      saturation = lightness <= 0.5 ? delta / (max + min) : delta / (2 - max - min);
      switch (max) {
        case r:
          hue = (g - b) / delta + (g < b ? 6 : 0);
          break;
        case g:
          hue = (b - r) / delta + 2;
          break;
        case b:
          hue = (r - g) / delta + 4;
          break;
      }
      hue /= 6;
    }
    target.h = hue;
    target.s = saturation;
    target.l = lightness;
    return target;
  }
  getRGB(target, colorSpace = ColorManagement.workingColorSpace) {
    ColorManagement.workingToColorSpace(_color.copy(this), colorSpace);
    target.r = _color.r;
    target.g = _color.g;
    target.b = _color.b;
    return target;
  }
  getStyle(colorSpace = SRGBColorSpace) {
    ColorManagement.workingToColorSpace(_color.copy(this), colorSpace);
    const { r, g, b } = _color;
    if (colorSpace !== SRGBColorSpace) {
      return `color(${colorSpace} ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)})`;
    }
    return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
  }
  offsetHSL(h, s, l) {
    this.getHSL(_hslA);
    return this.setHSL(_hslA.h + h, _hslA.s + s, _hslA.l + l);
  }
  add(color) {
    this.r += color.r;
    this.g += color.g;
    this.b += color.b;
    return this;
  }
  addColors(color1, color2) {
    this.r = color1.r + color2.r;
    this.g = color1.g + color2.g;
    this.b = color1.b + color2.b;
    return this;
  }
  addScalar(s) {
    this.r += s;
    this.g += s;
    this.b += s;
    return this;
  }
  sub(color) {
    this.r = Math.max(0, this.r - color.r);
    this.g = Math.max(0, this.g - color.g);
    this.b = Math.max(0, this.b - color.b);
    return this;
  }
  multiply(color) {
    this.r *= color.r;
    this.g *= color.g;
    this.b *= color.b;
    return this;
  }
  multiplyScalar(s) {
    this.r *= s;
    this.g *= s;
    this.b *= s;
    return this;
  }
  lerp(color, alpha) {
    this.r += (color.r - this.r) * alpha;
    this.g += (color.g - this.g) * alpha;
    this.b += (color.b - this.b) * alpha;
    return this;
  }
  lerpColors(color1, color2, alpha) {
    this.r = color1.r + (color2.r - color1.r) * alpha;
    this.g = color1.g + (color2.g - color1.g) * alpha;
    this.b = color1.b + (color2.b - color1.b) * alpha;
    return this;
  }
  lerpHSL(color, alpha) {
    this.getHSL(_hslA);
    color.getHSL(_hslB);
    const h = lerp(_hslA.h, _hslB.h, alpha);
    const s = lerp(_hslA.s, _hslB.s, alpha);
    const l = lerp(_hslA.l, _hslB.l, alpha);
    this.setHSL(h, s, l);
    return this;
  }
  setFromVector3(v) {
    this.r = v.x;
    this.g = v.y;
    this.b = v.z;
    return this;
  }
  applyMatrix3(m) {
    const r = this.r, g = this.g, b = this.b;
    const e = m.elements;
    this.r = e[0] * r + e[3] * g + e[6] * b;
    this.g = e[1] * r + e[4] * g + e[7] * b;
    this.b = e[2] * r + e[5] * g + e[8] * b;
    return this;
  }
  equals(c) {
    return c.r === this.r && c.g === this.g && c.b === this.b;
  }
  fromArray(array, offset = 0) {
    this.r = array[offset];
    this.g = array[offset + 1];
    this.b = array[offset + 2];
    return this;
  }
  toArray(array = [], offset = 0) {
    array[offset] = this.r;
    array[offset + 1] = this.g;
    array[offset + 2] = this.b;
    return array;
  }
  fromBufferAttribute(attribute, index) {
    this.r = attribute.getX(index);
    this.g = attribute.getY(index);
    this.b = attribute.getZ(index);
    return this;
  }
  toJSON() {
    return this.getHex();
  }
  *[Symbol.iterator]() {
    yield this.r;
    yield this.g;
    yield this.b;
  }
}
var _color = /* @__PURE__ */ new Color;
Color.NAMES = _colorKeywords;
class Box3 {
  constructor(min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity)) {
    this.isBox3 = true;
    this.min = min;
    this.max = max;
  }
  set(min, max) {
    this.min.copy(min);
    this.max.copy(max);
    return this;
  }
  setFromArray(array) {
    this.makeEmpty();
    for (let i = 0, il = array.length;i < il; i += 3) {
      this.expandByPoint(_vector$b.fromArray(array, i));
    }
    return this;
  }
  setFromBufferAttribute(attribute) {
    this.makeEmpty();
    for (let i = 0, il = attribute.count;i < il; i++) {
      this.expandByPoint(_vector$b.fromBufferAttribute(attribute, i));
    }
    return this;
  }
  setFromPoints(points) {
    this.makeEmpty();
    for (let i = 0, il = points.length;i < il; i++) {
      this.expandByPoint(points[i]);
    }
    return this;
  }
  setFromCenterAndSize(center, size) {
    const halfSize = _vector$b.copy(size).multiplyScalar(0.5);
    this.min.copy(center).sub(halfSize);
    this.max.copy(center).add(halfSize);
    return this;
  }
  setFromObject(object, precise = false) {
    this.makeEmpty();
    return this.expandByObject(object, precise);
  }
  clone() {
    return new this.constructor().copy(this);
  }
  copy(box) {
    this.min.copy(box.min);
    this.max.copy(box.max);
    return this;
  }
  makeEmpty() {
    this.min.x = this.min.y = this.min.z = Infinity;
    this.max.x = this.max.y = this.max.z = -Infinity;
    return this;
  }
  isEmpty() {
    return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
  }
  getCenter(target) {
    return this.isEmpty() ? target.set(0, 0, 0) : target.addVectors(this.min, this.max).multiplyScalar(0.5);
  }
  getSize(target) {
    return this.isEmpty() ? target.set(0, 0, 0) : target.subVectors(this.max, this.min);
  }
  expandByPoint(point) {
    this.min.min(point);
    this.max.max(point);
    return this;
  }
  expandByVector(vector) {
    this.min.sub(vector);
    this.max.add(vector);
    return this;
  }
  expandByScalar(scalar) {
    this.min.addScalar(-scalar);
    this.max.addScalar(scalar);
    return this;
  }
  expandByObject(object, precise = false) {
    object.updateWorldMatrix(false, false);
    const geometry = object.geometry;
    if (geometry !== undefined) {
      const positionAttribute = geometry.getAttribute("position");
      if (precise === true && positionAttribute !== undefined && object.isInstancedMesh !== true) {
        for (let i = 0, l = positionAttribute.count;i < l; i++) {
          if (object.isMesh === true) {
            object.getVertexPosition(i, _vector$b);
          } else {
            _vector$b.fromBufferAttribute(positionAttribute, i);
          }
          _vector$b.applyMatrix4(object.matrixWorld);
          this.expandByPoint(_vector$b);
        }
      } else {
        if (object.boundingBox !== undefined) {
          if (object.boundingBox === null) {
            object.computeBoundingBox();
          }
          _box$4.copy(object.boundingBox);
        } else {
          if (geometry.boundingBox === null) {
            geometry.computeBoundingBox();
          }
          _box$4.copy(geometry.boundingBox);
        }
        _box$4.applyMatrix4(object.matrixWorld);
        this.union(_box$4);
      }
    }
    const children = object.children;
    for (let i = 0, l = children.length;i < l; i++) {
      this.expandByObject(children[i], precise);
    }
    return this;
  }
  containsPoint(point) {
    return point.x >= this.min.x && point.x <= this.max.x && point.y >= this.min.y && point.y <= this.max.y && point.z >= this.min.z && point.z <= this.max.z;
  }
  containsBox(box) {
    return this.min.x <= box.min.x && box.max.x <= this.max.x && this.min.y <= box.min.y && box.max.y <= this.max.y && this.min.z <= box.min.z && box.max.z <= this.max.z;
  }
  getParameter(point, target) {
    return target.set((point.x - this.min.x) / (this.max.x - this.min.x), (point.y - this.min.y) / (this.max.y - this.min.y), (point.z - this.min.z) / (this.max.z - this.min.z));
  }
  intersectsBox(box) {
    return box.max.x >= this.min.x && box.min.x <= this.max.x && box.max.y >= this.min.y && box.min.y <= this.max.y && box.max.z >= this.min.z && box.min.z <= this.max.z;
  }
  intersectsSphere(sphere) {
    this.clampPoint(sphere.center, _vector$b);
    return _vector$b.distanceToSquared(sphere.center) <= sphere.radius * sphere.radius;
  }
  intersectsPlane(plane) {
    let min, max;
    if (plane.normal.x > 0) {
      min = plane.normal.x * this.min.x;
      max = plane.normal.x * this.max.x;
    } else {
      min = plane.normal.x * this.max.x;
      max = plane.normal.x * this.min.x;
    }
    if (plane.normal.y > 0) {
      min += plane.normal.y * this.min.y;
      max += plane.normal.y * this.max.y;
    } else {
      min += plane.normal.y * this.max.y;
      max += plane.normal.y * this.min.y;
    }
    if (plane.normal.z > 0) {
      min += plane.normal.z * this.min.z;
      max += plane.normal.z * this.max.z;
    } else {
      min += plane.normal.z * this.max.z;
      max += plane.normal.z * this.min.z;
    }
    return min <= -plane.constant && max >= -plane.constant;
  }
  intersectsTriangle(triangle) {
    if (this.isEmpty()) {
      return false;
    }
    this.getCenter(_center);
    _extents.subVectors(this.max, _center);
    _v0$1.subVectors(triangle.a, _center);
    _v1$4.subVectors(triangle.b, _center);
    _v2$3.subVectors(triangle.c, _center);
    _f0.subVectors(_v1$4, _v0$1);
    _f1.subVectors(_v2$3, _v1$4);
    _f2.subVectors(_v0$1, _v2$3);
    let axes = [
      0,
      -_f0.z,
      _f0.y,
      0,
      -_f1.z,
      _f1.y,
      0,
      -_f2.z,
      _f2.y,
      _f0.z,
      0,
      -_f0.x,
      _f1.z,
      0,
      -_f1.x,
      _f2.z,
      0,
      -_f2.x,
      -_f0.y,
      _f0.x,
      0,
      -_f1.y,
      _f1.x,
      0,
      -_f2.y,
      _f2.x,
      0
    ];
    if (!satForAxes(axes, _v0$1, _v1$4, _v2$3, _extents)) {
      return false;
    }
    axes = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    if (!satForAxes(axes, _v0$1, _v1$4, _v2$3, _extents)) {
      return false;
    }
    _triangleNormal.crossVectors(_f0, _f1);
    axes = [_triangleNormal.x, _triangleNormal.y, _triangleNormal.z];
    return satForAxes(axes, _v0$1, _v1$4, _v2$3, _extents);
  }
  clampPoint(point, target) {
    return target.copy(point).clamp(this.min, this.max);
  }
  distanceToPoint(point) {
    return this.clampPoint(point, _vector$b).distanceTo(point);
  }
  getBoundingSphere(target) {
    if (this.isEmpty()) {
      target.makeEmpty();
    } else {
      this.getCenter(target.center);
      target.radius = this.getSize(_vector$b).length() * 0.5;
    }
    return target;
  }
  intersect(box) {
    this.min.max(box.min);
    this.max.min(box.max);
    if (this.isEmpty())
      this.makeEmpty();
    return this;
  }
  union(box) {
    this.min.min(box.min);
    this.max.max(box.max);
    return this;
  }
  applyMatrix4(matrix) {
    if (this.isEmpty())
      return this;
    _points[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(matrix);
    _points[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(matrix);
    _points[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(matrix);
    _points[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(matrix);
    _points[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(matrix);
    _points[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(matrix);
    _points[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(matrix);
    _points[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(matrix);
    this.setFromPoints(_points);
    return this;
  }
  translate(offset) {
    this.min.add(offset);
    this.max.add(offset);
    return this;
  }
  equals(box) {
    return box.min.equals(this.min) && box.max.equals(this.max);
  }
  toJSON() {
    return {
      min: this.min.toArray(),
      max: this.max.toArray()
    };
  }
  fromJSON(json) {
    this.min.fromArray(json.min);
    this.max.fromArray(json.max);
    return this;
  }
}
var _points = [
  /* @__PURE__ */ new Vector3,
  /* @__PURE__ */ new Vector3,
  /* @__PURE__ */ new Vector3,
  /* @__PURE__ */ new Vector3,
  /* @__PURE__ */ new Vector3,
  /* @__PURE__ */ new Vector3,
  /* @__PURE__ */ new Vector3,
  /* @__PURE__ */ new Vector3
];
var _vector$b = /* @__PURE__ */ new Vector3;
var _box$4 = /* @__PURE__ */ new Box3;
var _v0$1 = /* @__PURE__ */ new Vector3;
var _v1$4 = /* @__PURE__ */ new Vector3;
var _v2$3 = /* @__PURE__ */ new Vector3;
var _f0 = /* @__PURE__ */ new Vector3;
var _f1 = /* @__PURE__ */ new Vector3;
var _f2 = /* @__PURE__ */ new Vector3;
var _center = /* @__PURE__ */ new Vector3;
var _extents = /* @__PURE__ */ new Vector3;
var _triangleNormal = /* @__PURE__ */ new Vector3;
var _testAxis = /* @__PURE__ */ new Vector3;
function satForAxes(axes, v0, v1, v2, extents) {
  for (let i = 0, j = axes.length - 3;i <= j; i += 3) {
    _testAxis.fromArray(axes, i);
    const r = extents.x * Math.abs(_testAxis.x) + extents.y * Math.abs(_testAxis.y) + extents.z * Math.abs(_testAxis.z);
    const p0 = v0.dot(_testAxis);
    const p1 = v1.dot(_testAxis);
    const p2 = v2.dot(_testAxis);
    if (Math.max(-Math.max(p0, p1, p2), Math.min(p0, p1, p2)) > r) {
      return false;
    }
  }
  return true;
}
var _tables = /* @__PURE__ */ _generateTables();
function _generateTables() {
  const buffer = new ArrayBuffer(4);
  const floatView = new Float32Array(buffer);
  const uint32View = new Uint32Array(buffer);
  const baseTable = new Uint32Array(512);
  const shiftTable = new Uint32Array(512);
  for (let i = 0;i < 256; ++i) {
    const e = i - 127;
    if (e < -27) {
      baseTable[i] = 0;
      baseTable[i | 256] = 32768;
      shiftTable[i] = 24;
      shiftTable[i | 256] = 24;
    } else if (e < -14) {
      baseTable[i] = 1024 >> -e - 14;
      baseTable[i | 256] = 1024 >> -e - 14 | 32768;
      shiftTable[i] = -e - 1;
      shiftTable[i | 256] = -e - 1;
    } else if (e <= 15) {
      baseTable[i] = e + 15 << 10;
      baseTable[i | 256] = e + 15 << 10 | 32768;
      shiftTable[i] = 13;
      shiftTable[i | 256] = 13;
    } else if (e < 128) {
      baseTable[i] = 31744;
      baseTable[i | 256] = 64512;
      shiftTable[i] = 24;
      shiftTable[i | 256] = 24;
    } else {
      baseTable[i] = 31744;
      baseTable[i | 256] = 64512;
      shiftTable[i] = 13;
      shiftTable[i | 256] = 13;
    }
  }
  const mantissaTable = new Uint32Array(2048);
  const exponentTable = new Uint32Array(64);
  const offsetTable = new Uint32Array(64);
  for (let i = 1;i < 1024; ++i) {
    let m = i << 13;
    let e = 0;
    while ((m & 8388608) === 0) {
      m <<= 1;
      e -= 8388608;
    }
    m &= -8388609;
    e += 947912704;
    mantissaTable[i] = m | e;
  }
  for (let i = 1024;i < 2048; ++i) {
    mantissaTable[i] = 939524096 + (i - 1024 << 13);
  }
  for (let i = 1;i < 31; ++i) {
    exponentTable[i] = i << 23;
  }
  exponentTable[31] = 1199570944;
  exponentTable[32] = 2147483648;
  for (let i = 33;i < 63; ++i) {
    exponentTable[i] = 2147483648 + (i - 32 << 23);
  }
  exponentTable[63] = 3347054592;
  for (let i = 1;i < 64; ++i) {
    if (i !== 32) {
      offsetTable[i] = 1024;
    }
  }
  return {
    floatView,
    uint32View,
    baseTable,
    shiftTable,
    mantissaTable,
    exponentTable,
    offsetTable
  };
}
function toHalfFloat(val) {
  if (Math.abs(val) > 65504)
    warn("DataUtils.toHalfFloat(): Value out of range.");
  val = clamp(val, -65504, 65504);
  _tables.floatView[0] = val;
  const f = _tables.uint32View[0];
  const e = f >> 23 & 511;
  return _tables.baseTable[e] + ((f & 8388607) >> _tables.shiftTable[e]);
}
function fromHalfFloat(val) {
  const m = val >> 10;
  _tables.uint32View[0] = _tables.mantissaTable[_tables.offsetTable[m] + (val & 1023)] + _tables.exponentTable[m];
  return _tables.floatView[0];
}
var _vector$a = /* @__PURE__ */ new Vector3;
var _vector2$1 = /* @__PURE__ */ new Vector2;
var _id$2 = 0;

class BufferAttribute extends EventDispatcher {
  constructor(array, itemSize, normalized = false) {
    super();
    if (Array.isArray(array)) {
      throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");
    }
    this.isBufferAttribute = true;
    Object.defineProperty(this, "id", { value: _id$2++ });
    this.name = "";
    this.array = array;
    this.itemSize = itemSize;
    this.count = array !== undefined ? array.length / itemSize : 0;
    this.normalized = normalized;
    this.usage = StaticDrawUsage;
    this.updateRanges = [];
    this.gpuType = FloatType;
    this.version = 0;
  }
  onUploadCallback() {}
  set needsUpdate(value) {
    if (value === true)
      this.version++;
  }
  setUsage(value) {
    this.usage = value;
    return this;
  }
  addUpdateRange(start, count) {
    this.updateRanges.push({ start, count });
  }
  clearUpdateRanges() {
    this.updateRanges.length = 0;
  }
  copy(source) {
    this.name = source.name;
    this.array = new source.array.constructor(source.array);
    this.itemSize = source.itemSize;
    this.count = source.count;
    this.normalized = source.normalized;
    this.usage = source.usage;
    this.gpuType = source.gpuType;
    return this;
  }
  copyAt(index1, attribute, index2) {
    index1 *= this.itemSize;
    index2 *= attribute.itemSize;
    for (let i = 0, l = this.itemSize;i < l; i++) {
      this.array[index1 + i] = attribute.array[index2 + i];
    }
    return this;
  }
  copyArray(array) {
    this.array.set(array);
    return this;
  }
  applyMatrix3(m) {
    if (this.itemSize === 2) {
      for (let i = 0, l = this.count;i < l; i++) {
        _vector2$1.fromBufferAttribute(this, i);
        _vector2$1.applyMatrix3(m);
        this.setXY(i, _vector2$1.x, _vector2$1.y);
      }
    } else if (this.itemSize === 3) {
      for (let i = 0, l = this.count;i < l; i++) {
        _vector$a.fromBufferAttribute(this, i);
        _vector$a.applyMatrix3(m);
        this.setXYZ(i, _vector$a.x, _vector$a.y, _vector$a.z);
      }
    }
    return this;
  }
  applyMatrix4(m) {
    for (let i = 0, l = this.count;i < l; i++) {
      _vector$a.fromBufferAttribute(this, i);
      _vector$a.applyMatrix4(m);
      this.setXYZ(i, _vector$a.x, _vector$a.y, _vector$a.z);
    }
    return this;
  }
  applyNormalMatrix(m) {
    for (let i = 0, l = this.count;i < l; i++) {
      _vector$a.fromBufferAttribute(this, i);
      _vector$a.applyNormalMatrix(m);
      this.setXYZ(i, _vector$a.x, _vector$a.y, _vector$a.z);
    }
    return this;
  }
  transformDirection(m) {
    for (let i = 0, l = this.count;i < l; i++) {
      _vector$a.fromBufferAttribute(this, i);
      _vector$a.transformDirection(m);
      this.setXYZ(i, _vector$a.x, _vector$a.y, _vector$a.z);
    }
    return this;
  }
  set(value, offset = 0) {
    this.array.set(value, offset);
    return this;
  }
  getComponent(index, component) {
    let value = this.array[index * this.itemSize + component];
    if (this.normalized)
      value = denormalize(value, this.array);
    return value;
  }
  setComponent(index, component, value) {
    if (this.normalized)
      value = normalize(value, this.array);
    this.array[index * this.itemSize + component] = value;
    return this;
  }
  getX(index) {
    let x = this.array[index * this.itemSize];
    if (this.normalized)
      x = denormalize(x, this.array);
    return x;
  }
  setX(index, x) {
    if (this.normalized)
      x = normalize(x, this.array);
    this.array[index * this.itemSize] = x;
    return this;
  }
  getY(index) {
    let y = this.array[index * this.itemSize + 1];
    if (this.normalized)
      y = denormalize(y, this.array);
    return y;
  }
  setY(index, y) {
    if (this.normalized)
      y = normalize(y, this.array);
    this.array[index * this.itemSize + 1] = y;
    return this;
  }
  getZ(index) {
    let z = this.array[index * this.itemSize + 2];
    if (this.normalized)
      z = denormalize(z, this.array);
    return z;
  }
  setZ(index, z) {
    if (this.normalized)
      z = normalize(z, this.array);
    this.array[index * this.itemSize + 2] = z;
    return this;
  }
  getW(index) {
    let w = this.array[index * this.itemSize + 3];
    if (this.normalized)
      w = denormalize(w, this.array);
    return w;
  }
  setW(index, w) {
    if (this.normalized)
      w = normalize(w, this.array);
    this.array[index * this.itemSize + 3] = w;
    return this;
  }
  setXY(index, x, y) {
    index *= this.itemSize;
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
    }
    this.array[index + 0] = x;
    this.array[index + 1] = y;
    return this;
  }
  setXYZ(index, x, y, z) {
    index *= this.itemSize;
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
    }
    this.array[index + 0] = x;
    this.array[index + 1] = y;
    this.array[index + 2] = z;
    return this;
  }
  setXYZW(index, x, y, z, w) {
    index *= this.itemSize;
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
      w = normalize(w, this.array);
    }
    this.array[index + 0] = x;
    this.array[index + 1] = y;
    this.array[index + 2] = z;
    this.array[index + 3] = w;
    return this;
  }
  onUpload(callback) {
    this.onUploadCallback = callback;
    return this;
  }
  clone() {
    return new this.constructor(this.array, this.itemSize).copy(this);
  }
  toJSON() {
    const data = {
      itemSize: this.itemSize,
      type: this.array.constructor.name,
      array: Array.from(this.array),
      normalized: this.normalized
    };
    data.name = this.name;
    data.usage = this.usage;
    data.gpuType = this.gpuType;
    return data;
  }
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
}
class Float16BufferAttribute extends BufferAttribute {
  constructor(array, itemSize, normalized) {
    super(new Uint16Array(array), itemSize, normalized);
    this.isFloat16BufferAttribute = true;
  }
  getX(index) {
    let x = fromHalfFloat(this.array[index * this.itemSize]);
    if (this.normalized)
      x = denormalize(x, this.array);
    return x;
  }
  setX(index, x) {
    if (this.normalized)
      x = normalize(x, this.array);
    this.array[index * this.itemSize] = toHalfFloat(x);
    return this;
  }
  getY(index) {
    let y = fromHalfFloat(this.array[index * this.itemSize + 1]);
    if (this.normalized)
      y = denormalize(y, this.array);
    return y;
  }
  setY(index, y) {
    if (this.normalized)
      y = normalize(y, this.array);
    this.array[index * this.itemSize + 1] = toHalfFloat(y);
    return this;
  }
  getZ(index) {
    let z = fromHalfFloat(this.array[index * this.itemSize + 2]);
    if (this.normalized)
      z = denormalize(z, this.array);
    return z;
  }
  setZ(index, z) {
    if (this.normalized)
      z = normalize(z, this.array);
    this.array[index * this.itemSize + 2] = toHalfFloat(z);
    return this;
  }
  getW(index) {
    let w = fromHalfFloat(this.array[index * this.itemSize + 3]);
    if (this.normalized)
      w = denormalize(w, this.array);
    return w;
  }
  setW(index, w) {
    if (this.normalized)
      w = normalize(w, this.array);
    this.array[index * this.itemSize + 3] = toHalfFloat(w);
    return this;
  }
  setXY(index, x, y) {
    index *= this.itemSize;
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
    }
    this.array[index + 0] = toHalfFloat(x);
    this.array[index + 1] = toHalfFloat(y);
    return this;
  }
  setXYZ(index, x, y, z) {
    index *= this.itemSize;
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
    }
    this.array[index + 0] = toHalfFloat(x);
    this.array[index + 1] = toHalfFloat(y);
    this.array[index + 2] = toHalfFloat(z);
    return this;
  }
  setXYZW(index, x, y, z, w) {
    index *= this.itemSize;
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
      w = normalize(w, this.array);
    }
    this.array[index + 0] = toHalfFloat(x);
    this.array[index + 1] = toHalfFloat(y);
    this.array[index + 2] = toHalfFloat(z);
    this.array[index + 3] = toHalfFloat(w);
    return this;
  }
}
var _box$3 = /* @__PURE__ */ new Box3;
var _v1$3 = /* @__PURE__ */ new Vector3;
var _v2$2 = /* @__PURE__ */ new Vector3;

class Sphere {
  constructor(center = new Vector3, radius = -1) {
    this.isSphere = true;
    this.center = center;
    this.radius = radius;
  }
  set(center, radius) {
    this.center.copy(center);
    this.radius = radius;
    return this;
  }
  setFromPoints(points, optionalCenter) {
    const center = this.center;
    if (optionalCenter !== undefined) {
      center.copy(optionalCenter);
    } else {
      _box$3.setFromPoints(points).getCenter(center);
    }
    let maxRadiusSq = 0;
    for (let i = 0, il = points.length;i < il; i++) {
      maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(points[i]));
    }
    this.radius = Math.sqrt(maxRadiusSq);
    return this;
  }
  copy(sphere) {
    this.center.copy(sphere.center);
    this.radius = sphere.radius;
    return this;
  }
  isEmpty() {
    return this.radius < 0;
  }
  makeEmpty() {
    this.center.set(0, 0, 0);
    this.radius = -1;
    return this;
  }
  containsPoint(point) {
    return point.distanceToSquared(this.center) <= this.radius * this.radius;
  }
  distanceToPoint(point) {
    return point.distanceTo(this.center) - this.radius;
  }
  intersectsSphere(sphere) {
    const radiusSum = this.radius + sphere.radius;
    return sphere.center.distanceToSquared(this.center) <= radiusSum * radiusSum;
  }
  intersectsBox(box) {
    return box.intersectsSphere(this);
  }
  intersectsPlane(plane) {
    return Math.abs(plane.distanceToPoint(this.center)) <= this.radius;
  }
  clampPoint(point, target) {
    const deltaLengthSq = this.center.distanceToSquared(point);
    target.copy(point);
    if (deltaLengthSq > this.radius * this.radius) {
      target.sub(this.center).normalize();
      target.multiplyScalar(this.radius).add(this.center);
    }
    return target;
  }
  getBoundingBox(target) {
    if (this.isEmpty()) {
      target.makeEmpty();
      return target;
    }
    target.set(this.center, this.center);
    target.expandByScalar(this.radius);
    return target;
  }
  applyMatrix4(matrix) {
    this.center.applyMatrix4(matrix);
    this.radius = this.radius * matrix.getMaxScaleOnAxis();
    return this;
  }
  translate(offset) {
    this.center.add(offset);
    return this;
  }
  expandByPoint(point) {
    if (this.isEmpty()) {
      this.center.copy(point);
      this.radius = 0;
      return this;
    }
    _v1$3.subVectors(point, this.center);
    const lengthSq = _v1$3.lengthSq();
    if (lengthSq > this.radius * this.radius) {
      const length = Math.sqrt(lengthSq);
      const delta = (length - this.radius) * 0.5;
      this.center.addScaledVector(_v1$3, delta / length);
      this.radius += delta;
    }
    return this;
  }
  union(sphere) {
    if (sphere.isEmpty()) {
      return this;
    }
    if (this.isEmpty()) {
      this.copy(sphere);
      return this;
    }
    if (this.center.equals(sphere.center) === true) {
      this.radius = Math.max(this.radius, sphere.radius);
    } else {
      _v2$2.subVectors(sphere.center, this.center).setLength(sphere.radius);
      this.expandByPoint(_v1$3.copy(sphere.center).add(_v2$2));
      this.expandByPoint(_v1$3.copy(sphere.center).sub(_v2$2));
    }
    return this;
  }
  equals(sphere) {
    return sphere.center.equals(this.center) && sphere.radius === this.radius;
  }
  clone() {
    return new this.constructor().copy(this);
  }
  toJSON() {
    return {
      radius: this.radius,
      center: this.center.toArray()
    };
  }
  fromJSON(json) {
    this.radius = json.radius;
    this.center.fromArray(json.center);
    return this;
  }
}
class InterleavedBuffer {
  constructor(array, stride) {
    this.isInterleavedBuffer = true;
    this.array = array;
    this.stride = stride;
    this.count = array !== undefined ? array.length / stride : 0;
    this.usage = StaticDrawUsage;
    this.updateRanges = [];
    this.version = 0;
    this.uuid = generateUUID();
  }
  onUploadCallback() {}
  set needsUpdate(value) {
    if (value === true)
      this.version++;
  }
  setUsage(value) {
    this.usage = value;
    return this;
  }
  addUpdateRange(start, count) {
    this.updateRanges.push({ start, count });
  }
  clearUpdateRanges() {
    this.updateRanges.length = 0;
  }
  copy(source) {
    this.array = new source.array.constructor(source.array);
    this.count = source.count;
    this.stride = source.stride;
    this.usage = source.usage;
    return this;
  }
  copyAt(index1, interleavedBuffer, index2) {
    index1 *= this.stride;
    index2 *= interleavedBuffer.stride;
    for (let i = 0, l = this.stride;i < l; i++) {
      this.array[index1 + i] = interleavedBuffer.array[index2 + i];
    }
    return this;
  }
  set(value, offset = 0) {
    this.array.set(value, offset);
    return this;
  }
  clone(data) {
    if (data.arrayBuffers === undefined) {
      data.arrayBuffers = {};
    }
    if (this.array.buffer._uuid === undefined) {
      this.array.buffer._uuid = generateUUID();
    }
    if (data.arrayBuffers[this.array.buffer._uuid] === undefined) {
      data.arrayBuffers[this.array.buffer._uuid] = this.array.slice(0).buffer;
    }
    const array = new this.array.constructor(data.arrayBuffers[this.array.buffer._uuid]);
    const ib = new this.constructor(array, this.stride);
    ib.setUsage(this.usage);
    return ib;
  }
  onUpload(callback) {
    this.onUploadCallback = callback;
    return this;
  }
  toJSON(data) {
    if (data.arrayBuffers === undefined) {
      data.arrayBuffers = {};
    }
    if (this.array.buffer._uuid === undefined) {
      this.array.buffer._uuid = generateUUID();
    }
    if (data.arrayBuffers[this.array.buffer._uuid] === undefined) {
      data.arrayBuffers[this.array.buffer._uuid] = Array.from(new Uint32Array(this.array.buffer));
    }
    const json = {
      uuid: this.uuid,
      buffer: this.array.buffer._uuid,
      type: this.array.constructor.name,
      stride: this.stride
    };
    json.usage = this.usage;
    return json;
  }
}
var _vector$8 = /* @__PURE__ */ new Vector3;

class InterleavedBufferAttribute {
  constructor(interleavedBuffer, itemSize, offset, normalized = false) {
    this.isInterleavedBufferAttribute = true;
    this.name = "";
    this.data = interleavedBuffer;
    this.itemSize = itemSize;
    this.offset = offset;
    this.normalized = normalized;
  }
  get count() {
    return this.data.count;
  }
  get array() {
    return this.data.array;
  }
  set needsUpdate(value) {
    this.data.needsUpdate = value;
  }
  applyMatrix4(m) {
    for (let i = 0, l = this.data.count;i < l; i++) {
      _vector$8.fromBufferAttribute(this, i);
      _vector$8.applyMatrix4(m);
      this.setXYZ(i, _vector$8.x, _vector$8.y, _vector$8.z);
    }
    return this;
  }
  applyNormalMatrix(m) {
    for (let i = 0, l = this.count;i < l; i++) {
      _vector$8.fromBufferAttribute(this, i);
      _vector$8.applyNormalMatrix(m);
      this.setXYZ(i, _vector$8.x, _vector$8.y, _vector$8.z);
    }
    return this;
  }
  transformDirection(m) {
    for (let i = 0, l = this.count;i < l; i++) {
      _vector$8.fromBufferAttribute(this, i);
      _vector$8.transformDirection(m);
      this.setXYZ(i, _vector$8.x, _vector$8.y, _vector$8.z);
    }
    return this;
  }
  getComponent(index, component) {
    let value = this.array[index * this.data.stride + this.offset + component];
    if (this.normalized)
      value = denormalize(value, this.array);
    return value;
  }
  setComponent(index, component, value) {
    if (this.normalized)
      value = normalize(value, this.array);
    this.data.array[index * this.data.stride + this.offset + component] = value;
    return this;
  }
  setX(index, x) {
    if (this.normalized)
      x = normalize(x, this.array);
    this.data.array[index * this.data.stride + this.offset] = x;
    return this;
  }
  setY(index, y) {
    if (this.normalized)
      y = normalize(y, this.array);
    this.data.array[index * this.data.stride + this.offset + 1] = y;
    return this;
  }
  setZ(index, z) {
    if (this.normalized)
      z = normalize(z, this.array);
    this.data.array[index * this.data.stride + this.offset + 2] = z;
    return this;
  }
  setW(index, w) {
    if (this.normalized)
      w = normalize(w, this.array);
    this.data.array[index * this.data.stride + this.offset + 3] = w;
    return this;
  }
  getX(index) {
    let x = this.data.array[index * this.data.stride + this.offset];
    if (this.normalized)
      x = denormalize(x, this.array);
    return x;
  }
  getY(index) {
    let y = this.data.array[index * this.data.stride + this.offset + 1];
    if (this.normalized)
      y = denormalize(y, this.array);
    return y;
  }
  getZ(index) {
    let z = this.data.array[index * this.data.stride + this.offset + 2];
    if (this.normalized)
      z = denormalize(z, this.array);
    return z;
  }
  getW(index) {
    let w = this.data.array[index * this.data.stride + this.offset + 3];
    if (this.normalized)
      w = denormalize(w, this.array);
    return w;
  }
  setXY(index, x, y) {
    index = index * this.data.stride + this.offset;
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
    }
    this.data.array[index + 0] = x;
    this.data.array[index + 1] = y;
    return this;
  }
  setXYZ(index, x, y, z) {
    index = index * this.data.stride + this.offset;
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
    }
    this.data.array[index + 0] = x;
    this.data.array[index + 1] = y;
    this.data.array[index + 2] = z;
    return this;
  }
  setXYZW(index, x, y, z, w) {
    index = index * this.data.stride + this.offset;
    if (this.normalized) {
      x = normalize(x, this.array);
      y = normalize(y, this.array);
      z = normalize(z, this.array);
      w = normalize(w, this.array);
    }
    this.data.array[index + 0] = x;
    this.data.array[index + 1] = y;
    this.data.array[index + 2] = z;
    this.data.array[index + 3] = w;
    return this;
  }
  clone(data) {
    if (data === undefined) {
      log("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");
      const array = [];
      for (let i = 0;i < this.count; i++) {
        const index = i * this.data.stride + this.offset;
        for (let j = 0;j < this.itemSize; j++) {
          array.push(this.data.array[index + j]);
        }
      }
      return new BufferAttribute(new this.array.constructor(array), this.itemSize, this.normalized);
    } else {
      if (data.interleavedBuffers === undefined) {
        data.interleavedBuffers = {};
      }
      if (data.interleavedBuffers[this.data.uuid] === undefined) {
        data.interleavedBuffers[this.data.uuid] = this.data.clone(data);
      }
      return new InterleavedBufferAttribute(data.interleavedBuffers[this.data.uuid], this.itemSize, this.offset, this.normalized);
    }
  }
  toJSON(data) {
    if (data === undefined) {
      log("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");
      const array = [];
      for (let i = 0;i < this.count; i++) {
        const index = i * this.data.stride + this.offset;
        for (let j = 0;j < this.itemSize; j++) {
          array.push(this.data.array[index + j]);
        }
      }
      return {
        itemSize: this.itemSize,
        type: this.array.constructor.name,
        array,
        normalized: this.normalized
      };
    } else {
      if (data.interleavedBuffers === undefined) {
        data.interleavedBuffers = {};
      }
      if (data.interleavedBuffers[this.data.uuid] === undefined) {
        data.interleavedBuffers[this.data.uuid] = this.data.toJSON(data);
      }
      return {
        isInterleavedBufferAttribute: true,
        itemSize: this.itemSize,
        data: this.data.uuid,
        offset: this.offset,
        normalized: this.normalized
      };
    }
  }
}
var _vector1 = /* @__PURE__ */ new Vector3;
var _vector2 = /* @__PURE__ */ new Vector3;
var _normalMatrix = /* @__PURE__ */ new Matrix3;

class Plane {
  constructor(normal = new Vector3(1, 0, 0), constant = 0) {
    this.isPlane = true;
    this.normal = normal;
    this.constant = constant;
  }
  set(normal, constant) {
    this.normal.copy(normal);
    this.constant = constant;
    return this;
  }
  setComponents(x, y, z, w) {
    this.normal.set(x, y, z);
    this.constant = w;
    return this;
  }
  setFromNormalAndCoplanarPoint(normal, point) {
    this.normal.copy(normal);
    this.constant = -point.dot(this.normal);
    return this;
  }
  setFromCoplanarPoints(a, b, c) {
    const normal = _vector1.subVectors(c, b).cross(_vector2.subVectors(a, b)).normalize();
    this.setFromNormalAndCoplanarPoint(normal, a);
    return this;
  }
  copy(plane) {
    this.normal.copy(plane.normal);
    this.constant = plane.constant;
    return this;
  }
  normalize() {
    const inverseNormalLength = 1 / this.normal.length();
    this.normal.multiplyScalar(inverseNormalLength);
    this.constant *= inverseNormalLength;
    return this;
  }
  negate() {
    this.constant *= -1;
    this.normal.negate();
    return this;
  }
  distanceToPoint(point) {
    return this.normal.dot(point) + this.constant;
  }
  distanceToSphere(sphere) {
    return this.distanceToPoint(sphere.center) - sphere.radius;
  }
  projectPoint(point, target) {
    return target.copy(point).addScaledVector(this.normal, -this.distanceToPoint(point));
  }
  intersectLine(line, target, clampToLine = true) {
    const direction = line.delta(_vector1);
    const denominator = this.normal.dot(direction);
    if (denominator === 0) {
      if (this.distanceToPoint(line.start) === 0) {
        return target.copy(line.start);
      }
      return null;
    }
    const t = -(line.start.dot(this.normal) + this.constant) / denominator;
    if (clampToLine === true && (t < 0 || t > 1)) {
      return null;
    }
    return target.copy(line.start).addScaledVector(direction, t);
  }
  intersectsLine(line) {
    const startSign = this.distanceToPoint(line.start);
    const endSign = this.distanceToPoint(line.end);
    return startSign < 0 && endSign > 0 || endSign < 0 && startSign > 0;
  }
  intersectsBox(box) {
    return box.intersectsPlane(this);
  }
  intersectsSphere(sphere) {
    return sphere.intersectsPlane(this);
  }
  coplanarPoint(target) {
    return target.copy(this.normal).multiplyScalar(-this.constant);
  }
  applyMatrix4(matrix, optionalNormalMatrix) {
    const normalMatrix = optionalNormalMatrix || _normalMatrix.getNormalMatrix(matrix);
    const referencePoint = this.coplanarPoint(_vector1).applyMatrix4(matrix);
    const normal = this.normal.applyMatrix3(normalMatrix).normalize();
    this.constant = -referencePoint.dot(normal);
    return this;
  }
  translate(offset) {
    this.constant -= offset.dot(this.normal);
    return this;
  }
  equals(plane) {
    return plane.normal.equals(this.normal) && plane.constant === this.constant;
  }
  clone() {
    return new this.constructor().copy(this);
  }
  toJSON() {
    return {
      normal: this.normal.toArray(),
      constant: this.constant
    };
  }
  fromJSON(json) {
    this.normal.fromArray(json.normal);
    this.constant = json.constant;
    return this;
  }
}
class FramebufferTexture extends Texture {
  constructor(width, height) {
    super({ width, height });
    this.isFramebufferTexture = true;
    this.magFilter = NearestFilter;
    this.minFilter = NearestFilter;
    this.generateMipmaps = false;
    this.needsUpdate = true;
  }
}
class CubeTexture extends Texture {
  constructor(images = [], mapping = CubeReflectionMapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace) {
    super(images, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace);
    this.isCubeTexture = true;
    this.flipY = false;
  }
  get images() {
    return this.image;
  }
  set images(value) {
    this.image = value;
  }
}
class DepthTexture extends Texture {
  constructor(width, height, type = UnsignedIntType, mapping, wrapS, wrapT, magFilter = NearestFilter, minFilter = NearestFilter, anisotropy, format = DepthFormat, depth = 1) {
    if (format !== DepthFormat && format !== DepthStencilFormat) {
      throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");
    }
    const image = { width, height, depth };
    super(image, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy);
    this.isDepthTexture = true;
    this.flipY = false;
    this.generateMipmaps = false;
    this.compareFunction = null;
  }
  copy(source) {
    super.copy(source);
    this.source = new TextureSource(Object.assign({}, source.image));
    this.compareFunction = source.compareFunction;
    return this;
  }
  toJSON(meta) {
    const data = super.toJSON(meta);
    data.compareFunction = this.compareFunction;
    return data;
  }
}
function cloneUniforms(src) {
  const dst = {};
  for (const u in src) {
    dst[u] = {};
    for (const p in src[u]) {
      const property = src[u][p];
      if (isThreeObject(property)) {
        if (property.isRenderTargetTexture) {
          warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().");
          dst[u][p] = null;
        } else {
          dst[u][p] = property.clone();
        }
      } else if (Array.isArray(property)) {
        if (isThreeObject(property[0])) {
          const clonedProperty = [];
          for (let i = 0, l = property.length;i < l; i++) {
            clonedProperty[i] = property[i].clone();
          }
          dst[u][p] = clonedProperty;
        } else {
          dst[u][p] = property.slice();
        }
      } else {
        dst[u][p] = property;
      }
    }
  }
  return dst;
}
function mergeUniforms(uniforms) {
  const merged = {};
  for (let u = 0;u < uniforms.length; u++) {
    const tmp = cloneUniforms(uniforms[u]);
    for (const p in tmp) {
      merged[p] = tmp[p];
    }
  }
  return merged;
}
function isThreeObject(property) {
  return property && (property.isColor || property.isMatrix3 || property.isMatrix4 || property.isVector2 || property.isVector3 || property.isVector4 || property.isTexture || property.isQuaternion);
}
function convertArray(array, type) {
  if (!array || array.constructor === type)
    return array;
  if (typeof type.BYTES_PER_ELEMENT === "number") {
    return new type(array);
  }
  return Array.prototype.slice.call(array);
}
function hasTangents(settings) {
  return settings !== undefined && settings.inTangents !== undefined && settings.outTangents !== undefined;
}
class Interpolant {
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    this.parameterPositions = parameterPositions;
    this._cachedIndex = 0;
    this.resultBuffer = resultBuffer !== undefined ? resultBuffer : new sampleValues.constructor(sampleSize);
    this.sampleValues = sampleValues;
    this.valueSize = sampleSize;
    this.settings = null;
    this.DefaultSettings_ = {};
  }
  evaluate(t) {
    const pp = this.parameterPositions;
    let i1 = this._cachedIndex, t1 = pp[i1], t0 = pp[i1 - 1];
    validate_interval: {
      seek: {
        let right;
        linear_scan: {
          forward_scan:
            if (!(t < t1)) {
              for (let giveUpAt = i1 + 2;; ) {
                if (t1 === undefined) {
                  if (t < t0)
                    break forward_scan;
                  i1 = pp.length;
                  this._cachedIndex = i1;
                  return this.copySampleValue_(i1 - 1);
                }
                if (i1 === giveUpAt)
                  break;
                t0 = t1;
                t1 = pp[++i1];
                if (t < t1) {
                  break seek;
                }
              }
              right = pp.length;
              break linear_scan;
            }
          if (!(t >= t0)) {
            const t1global = pp[1];
            if (t < t1global) {
              i1 = 2;
              t0 = t1global;
            }
            for (let giveUpAt = i1 - 2;; ) {
              if (t0 === undefined) {
                this._cachedIndex = 0;
                return this.copySampleValue_(0);
              }
              if (i1 === giveUpAt)
                break;
              t1 = t0;
              t0 = pp[--i1 - 1];
              if (t >= t0) {
                break seek;
              }
            }
            right = i1;
            i1 = 0;
            break linear_scan;
          }
          break validate_interval;
        }
        while (i1 < right) {
          const mid = i1 + right >>> 1;
          if (t < pp[mid]) {
            right = mid;
          } else {
            i1 = mid + 1;
          }
        }
        t1 = pp[i1];
        t0 = pp[i1 - 1];
        if (t0 === undefined) {
          this._cachedIndex = 0;
          return this.copySampleValue_(0);
        }
        if (t1 === undefined) {
          i1 = pp.length;
          this._cachedIndex = i1;
          return this.copySampleValue_(i1 - 1);
        }
      }
      this._cachedIndex = i1;
      this.intervalChanged_(i1, t0, t1);
    }
    return this.interpolate_(i1, t0, t, t1);
  }
  getSettings_() {
    return this.settings || this.DefaultSettings_;
  }
  copySampleValue_(index) {
    const result = this.resultBuffer, values = this.sampleValues, stride = this.valueSize, offset = index * stride;
    for (let i = 0;i !== stride; ++i) {
      result[i] = values[offset + i];
    }
    return result;
  }
  interpolate_() {
    throw new Error("THREE.Interpolant: Call to abstract method.");
  }
  intervalChanged_() {}
}

class CubicInterpolant extends Interpolant {
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    super(parameterPositions, sampleValues, sampleSize, resultBuffer);
    this._weightPrev = -0;
    this._offsetPrev = -0;
    this._weightNext = -0;
    this._offsetNext = -0;
    this.DefaultSettings_ = {
      endingStart: ZeroCurvatureEnding,
      endingEnd: ZeroCurvatureEnding
    };
  }
  intervalChanged_(i1, t0, t1) {
    const pp = this.parameterPositions;
    let iPrev = i1 - 2, iNext = i1 + 1, tPrev = pp[iPrev], tNext = pp[iNext];
    if (tPrev === undefined) {
      switch (this.getSettings_().endingStart) {
        case ZeroSlopeEnding:
          iPrev = i1;
          tPrev = 2 * t0 - t1;
          break;
        case WrapAroundEnding:
          iPrev = pp.length - 2;
          tPrev = t0 + pp[iPrev] - pp[iPrev + 1];
          break;
        default:
          iPrev = i1;
          tPrev = t1;
      }
    }
    if (tNext === undefined) {
      switch (this.getSettings_().endingEnd) {
        case ZeroSlopeEnding:
          iNext = i1;
          tNext = 2 * t1 - t0;
          break;
        case WrapAroundEnding:
          iNext = 1;
          tNext = t1 + pp[1] - pp[0];
          break;
        default:
          iNext = i1 - 1;
          tNext = t0;
      }
    }
    const halfDt = (t1 - t0) * 0.5, stride = this.valueSize;
    this._weightPrev = halfDt / (t0 - tPrev);
    this._weightNext = halfDt / (tNext - t1);
    this._offsetPrev = iPrev * stride;
    this._offsetNext = iNext * stride;
  }
  interpolate_(i1, t0, t, t1) {
    const result = this.resultBuffer, values = this.sampleValues, stride = this.valueSize, o1 = i1 * stride, o0 = o1 - stride, oP = this._offsetPrev, oN = this._offsetNext, wP = this._weightPrev, wN = this._weightNext, p = (t - t0) / (t1 - t0), pp = p * p, ppp = pp * p;
    const sP = -wP * ppp + 2 * wP * pp - wP * p;
    const s0 = (1 + wP) * ppp + (-1.5 - 2 * wP) * pp + (-0.5 + wP) * p + 1;
    const s1 = (-1 - wN) * ppp + (1.5 + wN) * pp + 0.5 * p;
    const sN = wN * ppp - wN * pp;
    for (let i = 0;i !== stride; ++i) {
      result[i] = sP * values[oP + i] + s0 * values[o0 + i] + s1 * values[o1 + i] + sN * values[oN + i];
    }
    return result;
  }
}

class LinearInterpolant extends Interpolant {
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    super(parameterPositions, sampleValues, sampleSize, resultBuffer);
  }
  interpolate_(i1, t0, t, t1) {
    const result = this.resultBuffer, values = this.sampleValues, stride = this.valueSize, offset1 = i1 * stride, offset0 = offset1 - stride, weight1 = (t - t0) / (t1 - t0), weight0 = 1 - weight1;
    for (let i = 0;i !== stride; ++i) {
      result[i] = values[offset0 + i] * weight0 + values[offset1 + i] * weight1;
    }
    return result;
  }
}

class DiscreteInterpolant extends Interpolant {
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    super(parameterPositions, sampleValues, sampleSize, resultBuffer);
  }
  interpolate_(i1) {
    return this.copySampleValue_(i1 - 1);
  }
}

class BezierInterpolant extends Interpolant {
  interpolate_(i1, t0, t, t1) {
    const result = this.resultBuffer;
    const values = this.sampleValues;
    const stride = this.valueSize;
    const offset1 = i1 * stride;
    const offset0 = offset1 - stride;
    const inTangents = this.inTangents;
    const outTangents = this.outTangents;
    if (!inTangents || !outTangents) {
      const weight1 = (t - t0) / (t1 - t0);
      const weight0 = 1 - weight1;
      for (let i = 0;i !== stride; ++i) {
        result[i] = values[offset0 + i] * weight0 + values[offset1 + i] * weight1;
      }
      return result;
    }
    const tangentStride = stride * 2;
    const i0 = i1 - 1;
    for (let i = 0;i !== stride; ++i) {
      const v0 = values[offset0 + i];
      const v1 = values[offset1 + i];
      const outTangentOffset = i0 * tangentStride + i * 2;
      const c0x = outTangents[outTangentOffset];
      const c0y = outTangents[outTangentOffset + 1];
      const inTangentOffset = i1 * tangentStride + i * 2;
      const c1x = inTangents[inTangentOffset];
      const c1y = inTangents[inTangentOffset + 1];
      const s = solveBezierParameter(t, t0, c0x, c1x, t1);
      result[i] = cubicBezier(s, v0, c0y, c1y, v1);
    }
    return result;
  }
}
function cubicBezier(s, p0, p1, p2, p3) {
  const k = 1 - s;
  return k * k * k * p0 + 3 * k * k * s * p1 + 3 * k * s * s * p2 + s * s * s * p3;
}
function cubicBezierSlope(s, p0, p1, p2, p3) {
  const k = 1 - s;
  return 3 * k * k * (p1 - p0) + 6 * k * s * (p2 - p1) + 3 * s * s * (p3 - p2);
}
function solveBezierParameter(x, x0, x1, x2, x3) {
  let s = (x - x0) / (x3 - x0);
  for (let i = 0;i < 8; i++) {
    const error = cubicBezier(s, x0, x1, x2, x3) - x;
    if (Math.abs(error) < 0.0000000001)
      break;
    const slope = cubicBezierSlope(s, x0, x1, x2, x3);
    if (Math.abs(slope) < 0.0000000001)
      break;
    s = Math.max(0, Math.min(1, s - error / slope));
  }
  return s;
}

class KeyframeTrack {
  constructor(name, times, values, interpolation) {
    if (name === undefined)
      throw new Error("THREE.KeyframeTrack: track name is undefined");
    if (times === undefined || times.length === 0)
      throw new Error("THREE.KeyframeTrack: no keyframes in track named " + name);
    this.name = name;
    this.times = convertArray(times, this.TimeBufferType);
    this.values = convertArray(values, this.ValueBufferType);
    this.setInterpolation(interpolation || this.DefaultInterpolation);
  }
  static toJSON(track) {
    const trackType = track.constructor;
    let json;
    if (trackType.toJSON !== this.toJSON) {
      json = trackType.toJSON(track);
    } else {
      json = {
        name: track.name,
        times: convertArray(track.times, Array),
        values: convertArray(track.values, Array)
      };
      const interpolation = track.getInterpolation();
      if (interpolation !== track.DefaultInterpolation) {
        json.interpolation = interpolation;
      }
      if (hasTangents(track.settings)) {
        json.settings = {
          inTangents: convertArray(track.settings.inTangents, Array),
          outTangents: convertArray(track.settings.outTangents, Array)
        };
      }
    }
    json.type = track.ValueTypeName;
    return json;
  }
  InterpolantFactoryMethodDiscrete(result) {
    return new DiscreteInterpolant(this.times, this.values, this.getValueSize(), result);
  }
  InterpolantFactoryMethodLinear(result) {
    return new LinearInterpolant(this.times, this.values, this.getValueSize(), result);
  }
  InterpolantFactoryMethodSmooth(result) {
    return new CubicInterpolant(this.times, this.values, this.getValueSize(), result);
  }
  InterpolantFactoryMethodBezier(result) {
    const interpolant = new BezierInterpolant(this.times, this.values, this.getValueSize(), result);
    if (this.settings) {
      interpolant.inTangents = this.settings.inTangents;
      interpolant.outTangents = this.settings.outTangents;
    }
    return interpolant;
  }
  setInterpolation(interpolation) {
    let factoryMethod;
    switch (interpolation) {
      case InterpolateDiscrete:
        factoryMethod = this.InterpolantFactoryMethodDiscrete;
        break;
      case InterpolateLinear:
        factoryMethod = this.InterpolantFactoryMethodLinear;
        break;
      case InterpolateSmooth:
        factoryMethod = this.InterpolantFactoryMethodSmooth;
        break;
      case InterpolateBezier:
        factoryMethod = this.InterpolantFactoryMethodBezier;
        break;
    }
    if (factoryMethod === undefined) {
      const message = "unsupported interpolation for " + this.ValueTypeName + " keyframe track named " + this.name;
      if (this.createInterpolant === undefined) {
        if (interpolation !== this.DefaultInterpolation) {
          this.setInterpolation(this.DefaultInterpolation);
        } else {
          throw new Error(message);
        }
      }
      warn("KeyframeTrack:", message);
      return this;
    }
    this.createInterpolant = factoryMethod;
    return this;
  }
  getInterpolation() {
    switch (this.createInterpolant) {
      case this.InterpolantFactoryMethodDiscrete:
        return InterpolateDiscrete;
      case this.InterpolantFactoryMethodLinear:
        return InterpolateLinear;
      case this.InterpolantFactoryMethodSmooth:
        return InterpolateSmooth;
      case this.InterpolantFactoryMethodBezier:
        return InterpolateBezier;
    }
  }
  getValueSize() {
    return this.values.length / this.times.length;
  }
  shift(timeOffset) {
    if (timeOffset !== 0) {
      const times = this.times;
      for (let i = 0, n = times.length;i !== n; ++i) {
        times[i] += timeOffset;
      }
    }
    return this;
  }
  scale(timeScale) {
    if (timeScale !== 1) {
      const times = this.times;
      for (let i = 0, n = times.length;i !== n; ++i) {
        times[i] *= timeScale;
      }
      if (hasTangents(this.settings)) {
        scaleTangentTimes(this.settings.inTangents, timeScale);
        scaleTangentTimes(this.settings.outTangents, timeScale);
      }
    }
    return this;
  }
  trim(startTime, endTime) {
    const times = this.times, nKeys = times.length;
    let from = 0, to = nKeys - 1;
    while (from !== nKeys && times[from] < startTime) {
      ++from;
    }
    while (to !== -1 && times[to] > endTime) {
      --to;
    }
    ++to;
    if (from !== 0 || to !== nKeys) {
      if (from >= to) {
        to = Math.max(to, 1);
        from = to - 1;
      }
      const stride = this.getValueSize();
      this.times = times.slice(from, to);
      this.values = this.values.slice(from * stride, to * stride);
    }
    return this;
  }
  validate() {
    let valid = true;
    const valueSize = this.getValueSize();
    if (valueSize - Math.floor(valueSize) !== 0) {
      error("KeyframeTrack: Invalid value size in track.", this);
      valid = false;
    }
    const times = this.times, values = this.values, nKeys = times.length;
    if (nKeys === 0) {
      error("KeyframeTrack: Track is empty.", this);
      valid = false;
    }
    let prevTime = null;
    for (let i = 0;i !== nKeys; i++) {
      const currTime = times[i];
      if (typeof currTime === "number" && isNaN(currTime)) {
        error("KeyframeTrack: Time is not a valid number.", this, i, currTime);
        valid = false;
        break;
      }
      if (prevTime !== null && prevTime > currTime) {
        error("KeyframeTrack: Out of order keys.", this, i, currTime, prevTime);
        valid = false;
        break;
      }
      prevTime = currTime;
    }
    if (values !== undefined) {
      if (isTypedArray(values)) {
        for (let i = 0, n = values.length;i !== n; ++i) {
          const value = values[i];
          if (isNaN(value)) {
            error("KeyframeTrack: Value is not a valid number.", this, i, value);
            valid = false;
            break;
          }
        }
      }
    }
    return valid;
  }
  optimize() {
    const times = this.times.slice(), values = this.values.slice(), stride = this.getValueSize(), smoothInterpolation = this.getInterpolation() === InterpolateSmooth, lastIndex = times.length - 1;
    let writeIndex = 1;
    for (let i = 1;i < lastIndex; ++i) {
      let keep = false;
      const time = times[i];
      const timeNext = times[i + 1];
      if (time !== timeNext && (i !== 1 || time !== times[0])) {
        if (!smoothInterpolation) {
          const offset = i * stride, offsetP = offset - stride, offsetN = offset + stride;
          for (let j = 0;j !== stride; ++j) {
            const value = values[offset + j];
            if (value !== values[offsetP + j] || value !== values[offsetN + j]) {
              keep = true;
              break;
            }
          }
        } else {
          keep = true;
        }
      }
      if (keep) {
        if (i !== writeIndex) {
          times[writeIndex] = times[i];
          const readOffset = i * stride, writeOffset = writeIndex * stride;
          for (let j = 0;j !== stride; ++j) {
            values[writeOffset + j] = values[readOffset + j];
          }
        }
        ++writeIndex;
      }
    }
    if (lastIndex > 0) {
      times[writeIndex] = times[lastIndex];
      for (let readOffset = lastIndex * stride, writeOffset = writeIndex * stride, j = 0;j !== stride; ++j) {
        values[writeOffset + j] = values[readOffset + j];
      }
      ++writeIndex;
    }
    if (writeIndex !== times.length) {
      this.times = times.slice(0, writeIndex);
      this.values = values.slice(0, writeIndex * stride);
    } else {
      this.times = times;
      this.values = values;
    }
    return this;
  }
  clone() {
    const times = this.times.slice();
    const values = this.values.slice();
    const TypedKeyframeTrack = this.constructor;
    const track = new TypedKeyframeTrack(this.name, times, values);
    track.createInterpolant = this.createInterpolant;
    if (hasTangents(this.settings)) {
      track.settings = {
        inTangents: this.settings.inTangents.slice(),
        outTangents: this.settings.outTangents.slice()
      };
    }
    return track;
  }
}
function scaleTangentTimes(tangents, timeScale) {
  for (let i = 0, n = tangents.length;i !== n; i += 2) {
    tangents[i] *= timeScale;
  }
}
KeyframeTrack.prototype.ValueTypeName = "";
KeyframeTrack.prototype.TimeBufferType = Float32Array;
KeyframeTrack.prototype.ValueBufferType = Float32Array;
KeyframeTrack.prototype.DefaultInterpolation = InterpolateLinear;

class BooleanKeyframeTrack extends KeyframeTrack {
  constructor(name, times, values) {
    super(name, times, values);
  }
}
BooleanKeyframeTrack.prototype.ValueTypeName = "bool";
BooleanKeyframeTrack.prototype.ValueBufferType = Array;
BooleanKeyframeTrack.prototype.DefaultInterpolation = InterpolateDiscrete;
BooleanKeyframeTrack.prototype.InterpolantFactoryMethodLinear = undefined;
BooleanKeyframeTrack.prototype.InterpolantFactoryMethodSmooth = undefined;

class ColorKeyframeTrack extends KeyframeTrack {
  constructor(name, times, values, interpolation) {
    super(name, times, values, interpolation);
  }
}
ColorKeyframeTrack.prototype.ValueTypeName = "color";

class NumberKeyframeTrack extends KeyframeTrack {
  constructor(name, times, values, interpolation) {
    super(name, times, values, interpolation);
  }
}
NumberKeyframeTrack.prototype.ValueTypeName = "number";

class QuaternionLinearInterpolant extends Interpolant {
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    super(parameterPositions, sampleValues, sampleSize, resultBuffer);
  }
  interpolate_(i1, t0, t, t1) {
    const result = this.resultBuffer, values = this.sampleValues, stride = this.valueSize, alpha = (t - t0) / (t1 - t0);
    let offset = i1 * stride;
    for (let end = offset + stride;offset !== end; offset += 4) {
      Quaternion.slerpFlat(result, 0, values, offset - stride, values, offset, alpha);
    }
    return result;
  }
}

class QuaternionKeyframeTrack extends KeyframeTrack {
  constructor(name, times, values, interpolation) {
    super(name, times, values, interpolation);
  }
  InterpolantFactoryMethodLinear(result) {
    return new QuaternionLinearInterpolant(this.times, this.values, this.getValueSize(), result);
  }
}
QuaternionKeyframeTrack.prototype.ValueTypeName = "quaternion";
QuaternionKeyframeTrack.prototype.InterpolantFactoryMethodSmooth = undefined;

class StringKeyframeTrack extends KeyframeTrack {
  constructor(name, times, values) {
    super(name, times, values);
  }
}
StringKeyframeTrack.prototype.ValueTypeName = "string";
StringKeyframeTrack.prototype.ValueBufferType = Array;
StringKeyframeTrack.prototype.DefaultInterpolation = InterpolateDiscrete;
StringKeyframeTrack.prototype.InterpolantFactoryMethodLinear = undefined;
StringKeyframeTrack.prototype.InterpolantFactoryMethodSmooth = undefined;

class VectorKeyframeTrack extends KeyframeTrack {
  constructor(name, times, values, interpolation) {
    super(name, times, values, interpolation);
  }
}
VectorKeyframeTrack.prototype.ValueTypeName = "vector";
class LoadingManager {
  constructor(onLoad, onProgress, onError) {
    const scope = this;
    let isLoading = false;
    let itemsLoaded = 0;
    let itemsTotal = 0;
    let urlModifier = undefined;
    const handlers = [];
    this.onStart = undefined;
    this.onLoad = onLoad;
    this.onProgress = onProgress;
    this.onError = onError;
    this._abortController = null;
    this.itemStart = function(url) {
      itemsTotal++;
      if (isLoading === false) {
        if (scope.onStart !== undefined) {
          scope.onStart(url, itemsLoaded, itemsTotal);
        }
      }
      isLoading = true;
    };
    this.itemEnd = function(url) {
      itemsLoaded++;
      if (scope.onProgress !== undefined) {
        scope.onProgress(url, itemsLoaded, itemsTotal);
      }
      if (itemsLoaded === itemsTotal) {
        isLoading = false;
        if (scope.onLoad !== undefined) {
          scope.onLoad();
        }
      }
    };
    this.itemError = function(url) {
      if (scope.onError !== undefined) {
        scope.onError(url);
      }
    };
    this.resolveURL = function(url) {
      url = url.normalize("NFC");
      if (urlModifier) {
        return urlModifier(url);
      }
      return url;
    };
    this.setURLModifier = function(transform) {
      urlModifier = transform;
      return this;
    };
    this.addHandler = function(regex, loader) {
      handlers.push(regex, loader);
      return this;
    };
    this.removeHandler = function(regex) {
      const index = handlers.indexOf(regex);
      if (index !== -1) {
        handlers.splice(index, 2);
      }
      return this;
    };
    this.getHandler = function(file) {
      for (let i = 0, l = handlers.length;i < l; i += 2) {
        const regex = handlers[i];
        const loader = handlers[i + 1];
        if (regex.global)
          regex.lastIndex = 0;
        if (regex.test(file)) {
          return loader;
        }
      }
      return null;
    };
    this.abort = function() {
      this.abortController.abort();
      this._abortController = null;
      return this;
    };
  }
  get abortController() {
    if (!this._abortController) {
      this._abortController = new AbortController;
    }
    return this._abortController;
  }
}
var DefaultLoadingManager = /* @__PURE__ */ new LoadingManager;

class Loader {
  constructor(manager) {
    this.manager = manager !== undefined ? manager : DefaultLoadingManager;
    this.crossOrigin = "anonymous";
    this.withCredentials = false;
    this.path = "";
    this.resourcePath = "";
    this.requestHeader = {};
    if (typeof __THREE_DEVTOOLS__ !== "undefined") {
      __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
    }
  }
  load() {}
  loadAsync(url, onProgress) {
    const scope = this;
    return new Promise(function(resolve, reject) {
      scope.load(url, resolve, onProgress, reject);
    });
  }
  parse() {}
  setCrossOrigin(crossOrigin) {
    this.crossOrigin = crossOrigin;
    return this;
  }
  setWithCredentials(value) {
    this.withCredentials = value;
    return this;
  }
  setPath(path) {
    this.path = path;
    return this;
  }
  setResourcePath(resourcePath) {
    this.resourcePath = resourcePath;
    return this;
  }
  setRequestHeader(requestHeader) {
    this.requestHeader = requestHeader;
    return this;
  }
  abort() {
    return this;
  }
}
Loader.DEFAULT_MATERIAL_NAME = "__DEFAULT";
var _loading = new WeakMap;
var _position$2 = /* @__PURE__ */ new Vector3;
var _quaternion$2 = /* @__PURE__ */ new Quaternion;
var _scale$2 = /* @__PURE__ */ new Vector3;

class Camera extends Object3D {
  constructor() {
    super();
    this.isCamera = true;
    this.type = "Camera";
    this.matrixWorldInverse = new Matrix4;
    this.projectionMatrix = new Matrix4;
    this.projectionMatrixInverse = new Matrix4;
    this.coordinateSystem = WebGLCoordinateSystem;
    this._reversedDepth = false;
  }
  get reversedDepth() {
    return this._reversedDepth;
  }
  copy(source, recursive) {
    super.copy(source, recursive);
    this.matrixWorldInverse.copy(source.matrixWorldInverse);
    this.projectionMatrix.copy(source.projectionMatrix);
    this.projectionMatrixInverse.copy(source.projectionMatrixInverse);
    this.coordinateSystem = source.coordinateSystem;
    return this;
  }
  getWorldDirection(target) {
    return super.getWorldDirection(target).negate();
  }
  updateMatrixWorld(force) {
    super.updateMatrixWorld(force);
    this.matrixWorld.decompose(_position$2, _quaternion$2, _scale$2);
    if (_scale$2.x === 1 && _scale$2.y === 1 && _scale$2.z === 1) {
      this.matrixWorldInverse.copy(this.matrixWorld).invert();
    } else {
      this.matrixWorldInverse.compose(_position$2, _quaternion$2, _scale$2.set(1, 1, 1)).invert();
    }
  }
  updateWorldMatrix(updateParents, updateChildren, force = false) {
    super.updateWorldMatrix(updateParents, updateChildren, force);
    this.matrixWorld.decompose(_position$2, _quaternion$2, _scale$2);
    if (_scale$2.x === 1 && _scale$2.y === 1 && _scale$2.z === 1) {
      this.matrixWorldInverse.copy(this.matrixWorld).invert();
    } else {
      this.matrixWorldInverse.compose(_position$2, _quaternion$2, _scale$2.set(1, 1, 1)).invert();
    }
  }
  clone() {
    return new this.constructor().copy(this);
  }
}
var _v3$1 = /* @__PURE__ */ new Vector3;
var _minTarget = /* @__PURE__ */ new Vector2;
var _maxTarget = /* @__PURE__ */ new Vector2;

class PerspectiveCamera extends Camera {
  constructor(fov = 50, aspect = 1, near = 0.1, far = 2000) {
    super();
    this.isPerspectiveCamera = true;
    this.type = "PerspectiveCamera";
    this.fov = fov;
    this.zoom = 1;
    this.near = near;
    this.far = far;
    this.focus = 10;
    this.aspect = aspect;
    this.view = null;
    this.filmGauge = 35;
    this.filmOffset = 0;
    this.updateProjectionMatrix();
  }
  copy(source, recursive) {
    super.copy(source, recursive);
    this.fov = source.fov;
    this.zoom = source.zoom;
    this.near = source.near;
    this.far = source.far;
    this.focus = source.focus;
    this.aspect = source.aspect;
    this.view = source.view === null ? null : Object.assign({}, source.view);
    this.filmGauge = source.filmGauge;
    this.filmOffset = source.filmOffset;
    return this;
  }
  setFocalLength(focalLength) {
    const vExtentSlope = 0.5 * this.getFilmHeight() / focalLength;
    this.fov = RAD2DEG * 2 * Math.atan(vExtentSlope);
    this.updateProjectionMatrix();
  }
  getFocalLength() {
    const vExtentSlope = Math.tan(DEG2RAD * 0.5 * this.fov);
    return 0.5 * this.getFilmHeight() / vExtentSlope;
  }
  getEffectiveFOV() {
    return RAD2DEG * 2 * Math.atan(Math.tan(DEG2RAD * 0.5 * this.fov) / this.zoom);
  }
  getFilmWidth() {
    return this.filmGauge * Math.min(this.aspect, 1);
  }
  getFilmHeight() {
    return this.filmGauge / Math.max(this.aspect, 1);
  }
  getViewBounds(distance, minTarget, maxTarget) {
    _v3$1.set(-1, -1, 0.5).applyMatrix4(this.projectionMatrixInverse);
    minTarget.set(_v3$1.x, _v3$1.y).multiplyScalar(-distance / _v3$1.z);
    _v3$1.set(1, 1, 0.5).applyMatrix4(this.projectionMatrixInverse);
    maxTarget.set(_v3$1.x, _v3$1.y).multiplyScalar(-distance / _v3$1.z);
  }
  getViewSize(distance, target) {
    this.getViewBounds(distance, _minTarget, _maxTarget);
    return target.subVectors(_maxTarget, _minTarget);
  }
  setViewOffset(fullWidth, fullHeight, x, y, width, height) {
    this.aspect = fullWidth / fullHeight;
    if (this.view === null) {
      this.view = {
        enabled: true,
        fullWidth: 1,
        fullHeight: 1,
        offsetX: 0,
        offsetY: 0,
        width: 1,
        height: 1
      };
    }
    this.view.enabled = true;
    this.view.fullWidth = fullWidth;
    this.view.fullHeight = fullHeight;
    this.view.offsetX = x;
    this.view.offsetY = y;
    this.view.width = width;
    this.view.height = height;
    this.updateProjectionMatrix();
  }
  clearViewOffset() {
    if (this.view !== null) {
      this.view.enabled = false;
    }
    this.updateProjectionMatrix();
  }
  updateProjectionMatrix() {
    const near = this.near;
    let top = near * Math.tan(DEG2RAD * 0.5 * this.fov) / this.zoom;
    let height = 2 * top;
    let width = this.aspect * height;
    let left = -0.5 * width;
    const view = this.view;
    if (this.view !== null && this.view.enabled) {
      const { fullWidth, fullHeight } = view;
      left += view.offsetX * width / fullWidth;
      top -= view.offsetY * height / fullHeight;
      width *= view.width / fullWidth;
      height *= view.height / fullHeight;
    }
    const skew = this.filmOffset;
    if (skew !== 0)
      left += near * skew / this.getFilmWidth();
    this.projectionMatrix.makePerspective(left, left + width, top, top - height, near, this.far, this.coordinateSystem, this.reversedDepth);
    this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  }
  toJSON(meta) {
    const data = super.toJSON(meta);
    data.object.fov = this.fov;
    data.object.zoom = this.zoom;
    data.object.near = this.near;
    data.object.far = this.far;
    data.object.focus = this.focus;
    data.object.aspect = this.aspect;
    if (this.view !== null)
      data.object.view = Object.assign({}, this.view);
    data.object.filmGauge = this.filmGauge;
    data.object.filmOffset = this.filmOffset;
    return data;
  }
}
var _errorMap = new WeakMap;
var _RESERVED_CHARS_RE = "\\[\\]\\.:\\/";
var _reservedRe = new RegExp("[" + _RESERVED_CHARS_RE + "]", "g");
var _wordChar = "[^" + _RESERVED_CHARS_RE + "]";
var _wordCharOrDot = "[^" + _RESERVED_CHARS_RE.replace("\\.", "") + "]";
var _directoryRe = /* @__PURE__ */ /((?:WC+[\/:])*)/.source.replace("WC", _wordChar);
var _nodeRe = /* @__PURE__ */ /(WCOD+)?/.source.replace("WCOD", _wordCharOrDot);
var _objectRe = /* @__PURE__ */ /(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC", _wordChar);
var _propertyRe = /* @__PURE__ */ /\.(WC+)(?:\[(.+)\])?/.source.replace("WC", _wordChar);
var _trackRe = new RegExp("" + "^" + _directoryRe + _nodeRe + _objectRe + _propertyRe + "$");
var _supportedObjectNames = ["material", "materials", "bones", "map"];

class Composite {
  constructor(targetGroup, path, optionalParsedPath) {
    const parsedPath = optionalParsedPath || PropertyBinding.parseTrackName(path);
    this._targetGroup = targetGroup;
    this._bindings = targetGroup.subscribe_(path, parsedPath);
  }
  getValue(array, offset) {
    this.bind();
    const firstValidIndex = this._targetGroup.nCachedObjects_, binding = this._bindings[firstValidIndex];
    if (binding !== undefined)
      binding.getValue(array, offset);
  }
  setValue(array, offset) {
    const bindings = this._bindings;
    for (let i = this._targetGroup.nCachedObjects_, n = bindings.length;i !== n; ++i) {
      bindings[i].setValue(array, offset);
    }
  }
  bind() {
    const bindings = this._bindings;
    for (let i = this._targetGroup.nCachedObjects_, n = bindings.length;i !== n; ++i) {
      bindings[i].bind();
    }
  }
  unbind() {
    const bindings = this._bindings;
    for (let i = this._targetGroup.nCachedObjects_, n = bindings.length;i !== n; ++i) {
      bindings[i].unbind();
    }
  }
}

class PropertyBinding {
  constructor(rootNode, path, parsedPath) {
    this.path = path;
    this.parsedPath = parsedPath || PropertyBinding.parseTrackName(path);
    this.node = PropertyBinding.findNode(rootNode, this.parsedPath.nodeName);
    this.rootNode = rootNode;
    this.getValue = this._getValue_unbound;
    this.setValue = this._setValue_unbound;
  }
  static create(root, path, parsedPath) {
    if (!(root && root.isAnimationObjectGroup)) {
      return new PropertyBinding(root, path, parsedPath);
    } else {
      return new PropertyBinding.Composite(root, path, parsedPath);
    }
  }
  static sanitizeNodeName(name) {
    return name.replace(/\s/g, "_").replace(_reservedRe, "");
  }
  static parseTrackName(trackName) {
    const matches = _trackRe.exec(trackName);
    if (matches === null) {
      throw new Error("THREE.PropertyBinding: Cannot parse trackName: " + trackName);
    }
    const results = {
      nodeName: matches[2],
      objectName: matches[3],
      objectIndex: matches[4],
      propertyName: matches[5],
      propertyIndex: matches[6]
    };
    const lastDot = results.nodeName && results.nodeName.lastIndexOf(".");
    if (lastDot !== undefined && lastDot !== -1) {
      const objectName = results.nodeName.substring(lastDot + 1);
      if (_supportedObjectNames.indexOf(objectName) !== -1) {
        results.nodeName = results.nodeName.substring(0, lastDot);
        results.objectName = objectName;
      }
    }
    if (results.propertyName === null || results.propertyName.length === 0) {
      throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: " + trackName);
    }
    return results;
  }
  static findNode(root, nodeName) {
    if (nodeName === undefined || nodeName === "" || nodeName === "." || nodeName === -1 || nodeName === root.name || nodeName === root.uuid) {
      return root;
    }
    if (root.skeleton) {
      const bone = root.skeleton.getBoneByName(nodeName);
      if (bone !== undefined) {
        return bone;
      }
    }
    if (root.children) {
      const searchNodeSubtree = function(children) {
        for (let i = 0;i < children.length; i++) {
          const childNode = children[i];
          if (childNode.name === nodeName || childNode.uuid === nodeName) {
            return childNode;
          }
          const result = searchNodeSubtree(childNode.children);
          if (result)
            return result;
        }
        return null;
      };
      const subTreeNode = searchNodeSubtree(root.children);
      if (subTreeNode) {
        return subTreeNode;
      }
    }
    return null;
  }
  _getValue_unavailable() {}
  _setValue_unavailable() {}
  _getValue_direct(buffer, offset) {
    buffer[offset] = this.targetObject[this.propertyName];
  }
  _getValue_array(buffer, offset) {
    const source = this.resolvedProperty;
    for (let i = 0, n = source.length;i !== n; ++i) {
      buffer[offset++] = source[i];
    }
  }
  _getValue_arrayElement(buffer, offset) {
    buffer[offset] = this.resolvedProperty[this.propertyIndex];
  }
  _getValue_toArray(buffer, offset) {
    this.resolvedProperty.toArray(buffer, offset);
  }
  _setValue_direct(buffer, offset) {
    this.targetObject[this.propertyName] = buffer[offset];
  }
  _setValue_direct_setNeedsUpdate(buffer, offset) {
    this.targetObject[this.propertyName] = buffer[offset];
    this.targetObject.needsUpdate = true;
  }
  _setValue_direct_setMatrixWorldNeedsUpdate(buffer, offset) {
    this.targetObject[this.propertyName] = buffer[offset];
    this.targetObject.matrixWorldNeedsUpdate = true;
  }
  _setValue_array(buffer, offset) {
    const dest = this.resolvedProperty;
    for (let i = 0, n = dest.length;i !== n; ++i) {
      dest[i] = buffer[offset++];
    }
  }
  _setValue_array_setNeedsUpdate(buffer, offset) {
    const dest = this.resolvedProperty;
    for (let i = 0, n = dest.length;i !== n; ++i) {
      dest[i] = buffer[offset++];
    }
    this.targetObject.needsUpdate = true;
  }
  _setValue_array_setMatrixWorldNeedsUpdate(buffer, offset) {
    const dest = this.resolvedProperty;
    for (let i = 0, n = dest.length;i !== n; ++i) {
      dest[i] = buffer[offset++];
    }
    this.targetObject.matrixWorldNeedsUpdate = true;
  }
  _setValue_arrayElement(buffer, offset) {
    this.resolvedProperty[this.propertyIndex] = buffer[offset];
  }
  _setValue_arrayElement_setNeedsUpdate(buffer, offset) {
    this.resolvedProperty[this.propertyIndex] = buffer[offset];
    this.targetObject.needsUpdate = true;
  }
  _setValue_arrayElement_setMatrixWorldNeedsUpdate(buffer, offset) {
    this.resolvedProperty[this.propertyIndex] = buffer[offset];
    this.targetObject.matrixWorldNeedsUpdate = true;
  }
  _setValue_fromArray(buffer, offset) {
    this.resolvedProperty.fromArray(buffer, offset);
  }
  _setValue_fromArray_setNeedsUpdate(buffer, offset) {
    this.resolvedProperty.fromArray(buffer, offset);
    this.targetObject.needsUpdate = true;
  }
  _setValue_fromArray_setMatrixWorldNeedsUpdate(buffer, offset) {
    this.resolvedProperty.fromArray(buffer, offset);
    this.targetObject.matrixWorldNeedsUpdate = true;
  }
  _getValue_unbound(targetArray, offset) {
    this.bind();
    this.getValue(targetArray, offset);
  }
  _setValue_unbound(sourceArray, offset) {
    this.bind();
    this.setValue(sourceArray, offset);
  }
  bind() {
    let targetObject = this.node;
    const parsedPath = this.parsedPath;
    const objectName = parsedPath.objectName;
    const propertyName = parsedPath.propertyName;
    let propertyIndex = parsedPath.propertyIndex;
    if (!targetObject) {
      targetObject = PropertyBinding.findNode(this.rootNode, parsedPath.nodeName);
      this.node = targetObject;
    }
    this.getValue = this._getValue_unavailable;
    this.setValue = this._setValue_unavailable;
    if (!targetObject) {
      warn("PropertyBinding: No target node found for track: " + this.path + ".");
      return;
    }
    if (objectName) {
      let objectIndex = parsedPath.objectIndex;
      switch (objectName) {
        case "materials":
          if (!targetObject.material) {
            error("PropertyBinding: Can not bind to material as node does not have a material.", this);
            return;
          }
          if (!targetObject.material.materials) {
            error("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.", this);
            return;
          }
          targetObject = targetObject.material.materials;
          break;
        case "bones":
          if (!targetObject.skeleton) {
            error("PropertyBinding: Can not bind to bones as node does not have a skeleton.", this);
            return;
          }
          targetObject = targetObject.skeleton.bones;
          for (let i = 0;i < targetObject.length; i++) {
            if (targetObject[i].name === objectIndex) {
              objectIndex = i;
              break;
            }
          }
          break;
        case "map":
          if ("map" in targetObject) {
            targetObject = targetObject.map;
            break;
          }
          if (!targetObject.material) {
            error("PropertyBinding: Can not bind to material as node does not have a material.", this);
            return;
          }
          if (!targetObject.material.map) {
            error("PropertyBinding: Can not bind to material.map as node.material does not have a map.", this);
            return;
          }
          targetObject = targetObject.material.map;
          break;
        default:
          if (targetObject[objectName] === undefined) {
            error("PropertyBinding: Can not bind to objectName of node undefined.", this);
            return;
          }
          targetObject = targetObject[objectName];
      }
      if (objectIndex !== undefined) {
        if (targetObject[objectIndex] === undefined) {
          error("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.", this, targetObject);
          return;
        }
        targetObject = targetObject[objectIndex];
      }
    }
    const nodeProperty = targetObject[propertyName];
    if (nodeProperty === undefined) {
      const nodeName = parsedPath.nodeName;
      error("PropertyBinding: Trying to update property for track: " + nodeName + "." + propertyName + " but it wasn't found.", targetObject);
      return;
    }
    let versioning = this.Versioning.None;
    this.targetObject = targetObject;
    if (targetObject.isMaterial === true) {
      versioning = this.Versioning.NeedsUpdate;
    } else if (targetObject.isObject3D === true) {
      versioning = this.Versioning.MatrixWorldNeedsUpdate;
    }
    let bindingType = this.BindingType.Direct;
    if (propertyIndex !== undefined) {
      if (propertyName === "morphTargetInfluences") {
        if (!targetObject.geometry) {
          error("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.", this);
          return;
        }
        if (!targetObject.geometry.morphAttributes) {
          error("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.", this);
          return;
        }
        if (targetObject.morphTargetDictionary[propertyIndex] !== undefined) {
          propertyIndex = targetObject.morphTargetDictionary[propertyIndex];
        }
      }
      bindingType = this.BindingType.ArrayElement;
      this.resolvedProperty = nodeProperty;
      this.propertyIndex = propertyIndex;
    } else if (nodeProperty.fromArray !== undefined && nodeProperty.toArray !== undefined) {
      bindingType = this.BindingType.HasFromToArray;
      this.resolvedProperty = nodeProperty;
    } else if (Array.isArray(nodeProperty)) {
      bindingType = this.BindingType.EntireArray;
      this.resolvedProperty = nodeProperty;
    } else {
      this.propertyName = propertyName;
    }
    this.getValue = this.GetterByBindingType[bindingType];
    this.setValue = this.SetterByBindingTypeAndVersioning[bindingType][versioning];
  }
  unbind() {
    this.node = null;
    this.getValue = this._getValue_unbound;
    this.setValue = this._setValue_unbound;
  }
}
PropertyBinding.Composite = Composite;
PropertyBinding.prototype.BindingType = {
  Direct: 0,
  EntireArray: 1,
  ArrayElement: 2,
  HasFromToArray: 3
};
PropertyBinding.prototype.Versioning = {
  None: 0,
  NeedsUpdate: 1,
  MatrixWorldNeedsUpdate: 2
};
PropertyBinding.prototype.GetterByBindingType = [
  PropertyBinding.prototype._getValue_direct,
  PropertyBinding.prototype._getValue_array,
  PropertyBinding.prototype._getValue_arrayElement,
  PropertyBinding.prototype._getValue_toArray
];
PropertyBinding.prototype.SetterByBindingTypeAndVersioning = [
  [
    PropertyBinding.prototype._setValue_direct,
    PropertyBinding.prototype._setValue_direct_setNeedsUpdate,
    PropertyBinding.prototype._setValue_direct_setMatrixWorldNeedsUpdate
  ],
  [
    PropertyBinding.prototype._setValue_array,
    PropertyBinding.prototype._setValue_array_setNeedsUpdate,
    PropertyBinding.prototype._setValue_array_setMatrixWorldNeedsUpdate
  ],
  [
    PropertyBinding.prototype._setValue_arrayElement,
    PropertyBinding.prototype._setValue_arrayElement_setNeedsUpdate,
    PropertyBinding.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate
  ],
  [
    PropertyBinding.prototype._setValue_fromArray,
    PropertyBinding.prototype._setValue_fromArray_setNeedsUpdate,
    PropertyBinding.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate
  ]
];
var _controlInterpolantsResultBuffer = new Float32Array(1);
class Matrix2 {
  static {
    Matrix2.prototype.isMatrix2 = true;
  }
  constructor(n11, n12, n21, n22) {
    this.elements = [
      1,
      0,
      0,
      1
    ];
    if (n11 !== undefined) {
      this.set(n11, n12, n21, n22);
    }
  }
  identity() {
    this.set(1, 0, 0, 1);
    return this;
  }
  fromArray(array, offset = 0) {
    for (let i = 0;i < 4; i++) {
      this.elements[i] = array[i + offset];
    }
    return this;
  }
  set(n11, n12, n21, n22) {
    const te = this.elements;
    te[0] = n11;
    te[2] = n12;
    te[1] = n21;
    te[3] = n22;
    return this;
  }
}
if (typeof __THREE_DEVTOOLS__ !== "undefined") {
  __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register", { detail: {
    revision: REVISION
  } }));
}
if (typeof window !== "undefined") {
  if (window.__THREE__) {
    warn("WARNING: Multiple instances of Three.js being imported.");
  } else {
    window.__THREE__ = REVISION;
  }
}
// ../../../../home/leozhang/.bun/install/cache/three@0.186.0@@@1/build/three.module.js
var alphahash_fragment = `#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`;
var alphahash_pars_fragment = `#ifdef USE_ALPHAHASH
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
#endif`;
var alphamap_fragment = `#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`;
var alphamap_pars_fragment = `#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`;
var alphatest_fragment = `#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`;
var alphatest_pars_fragment = `#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`;
var aomap_fragment = `#ifdef USE_AOMAP
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
#endif`;
var aomap_pars_fragment = `#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`;
var batching_pars_vertex = `#ifdef USE_BATCHING
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
#endif`;
var batching_vertex = `#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`;
var begin_vertex = `vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`;
var beginnormal_vertex = `vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`;
var bsdfs = `float G_BlinnPhong_Implicit( ) {
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
} // validated`;
var iridescence_fragment = `#ifdef USE_IRIDESCENCE
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
#endif`;
var bumpmap_pars_fragment = `#ifdef USE_BUMPMAP
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
#endif`;
var clipping_planes_fragment = `#if NUM_CLIPPING_PLANES > 0
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
#endif`;
var clipping_planes_pars_fragment = `#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`;
var clipping_planes_pars_vertex = `#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`;
var clipping_planes_vertex = `#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`;
var color_fragment = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`;
var color_pars_fragment = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`;
var color_pars_vertex = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`;
var color_vertex = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`;
var common = `#define PI 3.141592653589793
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
} // validated`;
var cube_uv_reflection_fragment = `#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`;
var defaultnormal_vertex = `vec3 transformedNormal = objectNormal;
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
#endif`;
var displacementmap_pars_vertex = `#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`;
var displacementmap_vertex = `#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`;
var emissivemap_fragment = `#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`;
var emissivemap_pars_fragment = `#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`;
var colorspace_fragment = "gl_FragColor = linearToOutputTexel( gl_FragColor );";
var colorspace_pars_fragment = `vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`;
var envmap_fragment = `#ifdef USE_ENVMAP
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
#endif`;
var envmap_common_pars_fragment = `#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`;
var envmap_pars_fragment = `#ifdef USE_ENVMAP
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
#endif`;
var envmap_pars_vertex = `#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`;
var envmap_vertex = `#ifdef USE_ENVMAP
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
#endif`;
var fog_vertex = `#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`;
var fog_pars_vertex = `#ifdef USE_FOG
	varying float vFogDepth;
#endif`;
var fog_fragment = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
var fog_pars_fragment = `#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`;
var gradientmap_pars_fragment = `#ifdef USE_GRADIENTMAP
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
}`;
var lightmap_pars_fragment = `#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`;
var lights_lambert_fragment = `LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`;
var lights_lambert_pars_fragment = `varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`;
var lights_pars_begin = `uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`;
var envmap_physical_pars_fragment = `#ifdef USE_ENVMAP
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
#endif`;
var lights_toon_fragment = `ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`;
var lights_toon_pars_fragment = `varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`;
var lights_phong_fragment = `BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`;
var lights_phong_pars_fragment = `varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`;
var lights_physical_fragment = `PhysicalMaterial material;
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
#endif`;
var lights_physical_pars_fragment = `uniform sampler2D dfgLUT;
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
}`;
var lights_fragment_begin = `
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
#endif`;
var lights_fragment_maps = `#if defined( RE_IndirectDiffuse )
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
#endif`;
var lights_fragment_end = `#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`;
var lightprobes_pars_fragment = `#ifdef USE_LIGHT_PROBES_GRID
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
#endif`;
var logdepthbuf_fragment = `#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`;
var logdepthbuf_pars_fragment = `#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`;
var logdepthbuf_pars_vertex = `#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`;
var logdepthbuf_vertex = `#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`;
var map_fragment = `#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`;
var map_pars_fragment = `#ifdef USE_MAP
	uniform sampler2D map;
#endif`;
var map_particle_fragment = `#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`;
var map_particle_pars_fragment = `#if defined( USE_POINTS_UV )
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
#endif`;
var metalnessmap_fragment = `float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`;
var metalnessmap_pars_fragment = `#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`;
var morphinstance_vertex = `#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`;
var morphcolor_vertex = `#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`;
var morphnormal_vertex = `#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`;
var morphtarget_pars_vertex = `#ifdef USE_MORPHTARGETS
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
#endif`;
var morphtarget_vertex = `#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`;
var normal_fragment_begin = `float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`;
var normal_fragment_maps = `#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`;
var normal_pars_fragment = `#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`;
var normal_pars_vertex = `#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`;
var normal_vertex = `#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`;
var normalmap_pars_fragment = `#ifdef USE_NORMALMAP
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
#endif`;
var clearcoat_normal_fragment_begin = `#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`;
var clearcoat_normal_fragment_maps = `#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`;
var clearcoat_pars_fragment = `#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`;
var iridescence_pars_fragment = `#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`;
var opaque_fragment = `#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`;
var packing = `vec3 packNormalToRGB( const in vec3 normal ) {
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
}`;
var premultiplied_alpha_fragment = `#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`;
var project_vertex = `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`;
var dithering_fragment = `#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`;
var dithering_pars_fragment = `#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`;
var roughnessmap_fragment = `float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`;
var roughnessmap_pars_fragment = `#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`;
var shadowmap_pars_fragment = `#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`;
var shadowmap_pars_vertex = `#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`;
var shadowmap_vertex = `#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`;
var shadowmask_pars_fragment = `float getShadowMask() {
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
}`;
var skinbase_vertex = `#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`;
var skinning_pars_vertex = `#ifdef USE_SKINNING
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
#endif`;
var skinning_vertex = `#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`;
var skinnormal_vertex = `#ifdef USE_SKINNING
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
#endif`;
var specularmap_fragment = `float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`;
var specularmap_pars_fragment = `#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`;
var tonemapping_fragment = `#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`;
var tonemapping_pars_fragment = `#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`;
var transmission_fragment = `#ifdef USE_TRANSMISSION
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
#endif`;
var transmission_pars_fragment = `#ifdef USE_TRANSMISSION
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
#endif`;
var uv_pars_fragment = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`;
var uv_pars_vertex = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`;
var uv_vertex = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`;
var worldpos_vertex = `#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;
var vertex$h = `varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`;
var fragment$h = `uniform sampler2D t2D;
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
}`;
var vertex$g = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`;
var fragment$g = `#ifdef ENVMAP_TYPE_CUBE
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
}`;
var vertex$f = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`;
var fragment$f = `uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`;
var vertex$e = `#include <common>
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
}`;
var fragment$e = `#if DEPTH_PACKING == 3200
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
}`;
var vertex$d = `#define DISTANCE
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
}`;
var fragment$d = `#define DISTANCE
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
}`;
var vertex$c = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`;
var fragment$c = `uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`;
var vertex$b = `uniform float scale;
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
}`;
var fragment$b = `uniform vec3 diffuse;
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
}`;
var vertex$a = `#include <common>
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
}`;
var fragment$a = `uniform vec3 diffuse;
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
}`;
var vertex$9 = `#define LAMBERT
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
}`;
var fragment$9 = `#define LAMBERT
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
}`;
var vertex$8 = `#define MATCAP
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
}`;
var fragment$8 = `#define MATCAP
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
}`;
var vertex$7 = `#define NORMAL
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
}`;
var fragment$7 = `#define NORMAL
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
}`;
var vertex$6 = `#define PHONG
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
}`;
var fragment$6 = `#define PHONG
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
}`;
var vertex$5 = `#define STANDARD
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
}`;
var fragment$5 = `#define STANDARD
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
}`;
var vertex$4 = `#define TOON
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
}`;
var fragment$4 = `#define TOON
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
}`;
var vertex$3 = `uniform float size;
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
}`;
var fragment$3 = `uniform vec3 diffuse;
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
}`;
var vertex$2 = `#include <common>
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
}`;
var fragment$2 = `uniform vec3 color;
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
}`;
var vertex$1 = `uniform float rotation;
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
}`;
var fragment$1 = `uniform vec3 diffuse;
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
}`;
var ShaderChunk = {
  alphahash_fragment,
  alphahash_pars_fragment,
  alphamap_fragment,
  alphamap_pars_fragment,
  alphatest_fragment,
  alphatest_pars_fragment,
  aomap_fragment,
  aomap_pars_fragment,
  batching_pars_vertex,
  batching_vertex,
  begin_vertex,
  beginnormal_vertex,
  bsdfs,
  iridescence_fragment,
  bumpmap_pars_fragment,
  clipping_planes_fragment,
  clipping_planes_pars_fragment,
  clipping_planes_pars_vertex,
  clipping_planes_vertex,
  color_fragment,
  color_pars_fragment,
  color_pars_vertex,
  color_vertex,
  common,
  cube_uv_reflection_fragment,
  defaultnormal_vertex,
  displacementmap_pars_vertex,
  displacementmap_vertex,
  emissivemap_fragment,
  emissivemap_pars_fragment,
  colorspace_fragment,
  colorspace_pars_fragment,
  envmap_fragment,
  envmap_common_pars_fragment,
  envmap_pars_fragment,
  envmap_pars_vertex,
  envmap_physical_pars_fragment,
  envmap_vertex,
  fog_vertex,
  fog_pars_vertex,
  fog_fragment,
  fog_pars_fragment,
  gradientmap_pars_fragment,
  lightmap_pars_fragment,
  lights_lambert_fragment,
  lights_lambert_pars_fragment,
  lights_pars_begin,
  lights_toon_fragment,
  lights_toon_pars_fragment,
  lights_phong_fragment,
  lights_phong_pars_fragment,
  lights_physical_fragment,
  lights_physical_pars_fragment,
  lights_fragment_begin,
  lights_fragment_maps,
  lights_fragment_end,
  lightprobes_pars_fragment,
  logdepthbuf_fragment,
  logdepthbuf_pars_fragment,
  logdepthbuf_pars_vertex,
  logdepthbuf_vertex,
  map_fragment,
  map_pars_fragment,
  map_particle_fragment,
  map_particle_pars_fragment,
  metalnessmap_fragment,
  metalnessmap_pars_fragment,
  morphinstance_vertex,
  morphcolor_vertex,
  morphnormal_vertex,
  morphtarget_pars_vertex,
  morphtarget_vertex,
  normal_fragment_begin,
  normal_fragment_maps,
  normal_pars_fragment,
  normal_pars_vertex,
  normal_vertex,
  normalmap_pars_fragment,
  clearcoat_normal_fragment_begin,
  clearcoat_normal_fragment_maps,
  clearcoat_pars_fragment,
  iridescence_pars_fragment,
  opaque_fragment,
  packing,
  premultiplied_alpha_fragment,
  project_vertex,
  dithering_fragment,
  dithering_pars_fragment,
  roughnessmap_fragment,
  roughnessmap_pars_fragment,
  shadowmap_pars_fragment,
  shadowmap_pars_vertex,
  shadowmap_vertex,
  shadowmask_pars_fragment,
  skinbase_vertex,
  skinning_pars_vertex,
  skinning_vertex,
  skinnormal_vertex,
  specularmap_fragment,
  specularmap_pars_fragment,
  tonemapping_fragment,
  tonemapping_pars_fragment,
  transmission_fragment,
  transmission_pars_fragment,
  uv_pars_fragment,
  uv_pars_vertex,
  uv_vertex,
  worldpos_vertex,
  background_vert: vertex$h,
  background_frag: fragment$h,
  backgroundCube_vert: vertex$g,
  backgroundCube_frag: fragment$g,
  cube_vert: vertex$f,
  cube_frag: fragment$f,
  depth_vert: vertex$e,
  depth_frag: fragment$e,
  distance_vert: vertex$d,
  distance_frag: fragment$d,
  equirect_vert: vertex$c,
  equirect_frag: fragment$c,
  linedashed_vert: vertex$b,
  linedashed_frag: fragment$b,
  meshbasic_vert: vertex$a,
  meshbasic_frag: fragment$a,
  meshlambert_vert: vertex$9,
  meshlambert_frag: fragment$9,
  meshmatcap_vert: vertex$8,
  meshmatcap_frag: fragment$8,
  meshnormal_vert: vertex$7,
  meshnormal_frag: fragment$7,
  meshphong_vert: vertex$6,
  meshphong_frag: fragment$6,
  meshphysical_vert: vertex$5,
  meshphysical_frag: fragment$5,
  meshtoon_vert: vertex$4,
  meshtoon_frag: fragment$4,
  points_vert: vertex$3,
  points_frag: fragment$3,
  shadow_vert: vertex$2,
  shadow_frag: fragment$2,
  sprite_vert: vertex$1,
  sprite_frag: fragment$1
};
var UniformsLib = {
  common: {
    diffuse: { value: /* @__PURE__ */ new Color(16777215) },
    opacity: { value: 1 },
    map: { value: null },
    mapTransform: { value: /* @__PURE__ */ new Matrix3 },
    alphaMap: { value: null },
    alphaMapTransform: { value: /* @__PURE__ */ new Matrix3 },
    alphaTest: { value: 0 }
  },
  specularmap: {
    specularMap: { value: null },
    specularMapTransform: { value: /* @__PURE__ */ new Matrix3 }
  },
  envmap: {
    envMap: { value: null },
    envMapRotation: { value: /* @__PURE__ */ new Matrix3 },
    reflectivity: { value: 1 },
    ior: { value: 1.5 },
    refractionRatio: { value: 0.98 },
    dfgLUT: { value: null }
  },
  aomap: {
    aoMap: { value: null },
    aoMapIntensity: { value: 1 },
    aoMapTransform: { value: /* @__PURE__ */ new Matrix3 }
  },
  lightmap: {
    lightMap: { value: null },
    lightMapIntensity: { value: 1 },
    lightMapTransform: { value: /* @__PURE__ */ new Matrix3 }
  },
  bumpmap: {
    bumpMap: { value: null },
    bumpMapTransform: { value: /* @__PURE__ */ new Matrix3 },
    bumpScale: { value: 1 }
  },
  normalmap: {
    normalMap: { value: null },
    normalMapTransform: { value: /* @__PURE__ */ new Matrix3 },
    normalScale: { value: /* @__PURE__ */ new Vector2(1, 1) }
  },
  displacementmap: {
    displacementMap: { value: null },
    displacementMapTransform: { value: /* @__PURE__ */ new Matrix3 },
    displacementScale: { value: 1 },
    displacementBias: { value: 0 }
  },
  emissivemap: {
    emissiveMap: { value: null },
    emissiveMapTransform: { value: /* @__PURE__ */ new Matrix3 }
  },
  metalnessmap: {
    metalnessMap: { value: null },
    metalnessMapTransform: { value: /* @__PURE__ */ new Matrix3 }
  },
  roughnessmap: {
    roughnessMap: { value: null },
    roughnessMapTransform: { value: /* @__PURE__ */ new Matrix3 }
  },
  gradientmap: {
    gradientMap: { value: null }
  },
  fog: {
    fogDensity: { value: 0.00025 },
    fogNear: { value: 1 },
    fogFar: { value: 2000 },
    fogColor: { value: /* @__PURE__ */ new Color(16777215) }
  },
  lights: {
    ambientLightColor: { value: [] },
    lightProbe: { value: [] },
    sunLights: { value: [], properties: {
      direction: {},
      color: {}
    } },
    sunLightShadows: { value: [], properties: {
      shadowIntensity: 1,
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {}
    } },
    sunShadowMatrix: { value: [] },
    sunShadowCascade: { value: [] },
    directionalLights: { value: [], properties: {
      direction: {},
      color: {}
    } },
    directionalLightShadows: { value: [], properties: {
      shadowIntensity: 1,
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {}
    } },
    directionalShadowMatrix: { value: [] },
    spotLights: { value: [], properties: {
      color: {},
      position: {},
      direction: {},
      distance: {},
      coneCos: {},
      penumbraCos: {},
      decay: {}
    } },
    spotLightShadows: { value: [], properties: {
      shadowIntensity: 1,
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {}
    } },
    spotLightMap: { value: [] },
    spotLightMatrix: { value: [] },
    pointLights: { value: [], properties: {
      color: {},
      position: {},
      decay: {},
      distance: {}
    } },
    pointLightShadows: { value: [], properties: {
      shadowIntensity: 1,
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {},
      shadowCameraNear: {},
      shadowCameraFar: {}
    } },
    pointShadowMatrix: { value: [] },
    hemisphereLights: { value: [], properties: {
      direction: {},
      skyColor: {},
      groundColor: {}
    } },
    rectAreaLights: { value: [], properties: {
      color: {},
      position: {},
      width: {},
      height: {}
    } },
    ltc_1: { value: null },
    ltc_2: { value: null },
    probesSH: { value: null },
    probesMin: { value: /* @__PURE__ */ new Vector3 },
    probesMax: { value: /* @__PURE__ */ new Vector3 },
    probesResolution: { value: /* @__PURE__ */ new Vector3 }
  },
  points: {
    diffuse: { value: /* @__PURE__ */ new Color(16777215) },
    opacity: { value: 1 },
    size: { value: 1 },
    scale: { value: 1 },
    map: { value: null },
    alphaMap: { value: null },
    alphaMapTransform: { value: /* @__PURE__ */ new Matrix3 },
    alphaTest: { value: 0 },
    uvTransform: { value: /* @__PURE__ */ new Matrix3 }
  },
  sprite: {
    diffuse: { value: /* @__PURE__ */ new Color(16777215) },
    opacity: { value: 1 },
    center: { value: /* @__PURE__ */ new Vector2(0.5, 0.5) },
    rotation: { value: 0 },
    map: { value: null },
    mapTransform: { value: /* @__PURE__ */ new Matrix3 },
    alphaMap: { value: null },
    alphaMapTransform: { value: /* @__PURE__ */ new Matrix3 },
    alphaTest: { value: 0 }
  }
};
var ShaderLib = {
  basic: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.specularmap,
      UniformsLib.envmap,
      UniformsLib.aomap,
      UniformsLib.lightmap,
      UniformsLib.fog
    ]),
    vertexShader: ShaderChunk.meshbasic_vert,
    fragmentShader: ShaderChunk.meshbasic_frag
  },
  lambert: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.specularmap,
      UniformsLib.envmap,
      UniformsLib.aomap,
      UniformsLib.lightmap,
      UniformsLib.emissivemap,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      UniformsLib.fog,
      UniformsLib.lights,
      {
        emissive: { value: /* @__PURE__ */ new Color(0) },
        envMapIntensity: { value: 1 }
      }
    ]),
    vertexShader: ShaderChunk.meshlambert_vert,
    fragmentShader: ShaderChunk.meshlambert_frag
  },
  phong: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.specularmap,
      UniformsLib.envmap,
      UniformsLib.aomap,
      UniformsLib.lightmap,
      UniformsLib.emissivemap,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      UniformsLib.fog,
      UniformsLib.lights,
      {
        emissive: { value: /* @__PURE__ */ new Color(0) },
        specular: { value: /* @__PURE__ */ new Color(1118481) },
        shininess: { value: 30 },
        envMapIntensity: { value: 1 }
      }
    ]),
    vertexShader: ShaderChunk.meshphong_vert,
    fragmentShader: ShaderChunk.meshphong_frag
  },
  standard: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.envmap,
      UniformsLib.aomap,
      UniformsLib.lightmap,
      UniformsLib.emissivemap,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      UniformsLib.roughnessmap,
      UniformsLib.metalnessmap,
      UniformsLib.fog,
      UniformsLib.lights,
      {
        emissive: { value: /* @__PURE__ */ new Color(0) },
        roughness: { value: 1 },
        metalness: { value: 0 },
        envMapIntensity: { value: 1 }
      }
    ]),
    vertexShader: ShaderChunk.meshphysical_vert,
    fragmentShader: ShaderChunk.meshphysical_frag
  },
  toon: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.aomap,
      UniformsLib.lightmap,
      UniformsLib.emissivemap,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      UniformsLib.gradientmap,
      UniformsLib.fog,
      UniformsLib.lights,
      {
        emissive: { value: /* @__PURE__ */ new Color(0) }
      }
    ]),
    vertexShader: ShaderChunk.meshtoon_vert,
    fragmentShader: ShaderChunk.meshtoon_frag
  },
  matcap: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      UniformsLib.fog,
      {
        matcap: { value: null }
      }
    ]),
    vertexShader: ShaderChunk.meshmatcap_vert,
    fragmentShader: ShaderChunk.meshmatcap_frag
  },
  points: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.points,
      UniformsLib.fog
    ]),
    vertexShader: ShaderChunk.points_vert,
    fragmentShader: ShaderChunk.points_frag
  },
  dashed: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.fog,
      {
        scale: { value: 1 },
        dashSize: { value: 1 },
        totalSize: { value: 2 }
      }
    ]),
    vertexShader: ShaderChunk.linedashed_vert,
    fragmentShader: ShaderChunk.linedashed_frag
  },
  depth: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.displacementmap
    ]),
    vertexShader: ShaderChunk.depth_vert,
    fragmentShader: ShaderChunk.depth_frag
  },
  normal: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      {
        opacity: { value: 1 }
      }
    ]),
    vertexShader: ShaderChunk.meshnormal_vert,
    fragmentShader: ShaderChunk.meshnormal_frag
  },
  sprite: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.sprite,
      UniformsLib.fog
    ]),
    vertexShader: ShaderChunk.sprite_vert,
    fragmentShader: ShaderChunk.sprite_frag
  },
  background: {
    uniforms: {
      uvTransform: { value: /* @__PURE__ */ new Matrix3 },
      t2D: { value: null },
      backgroundIntensity: { value: 1 }
    },
    vertexShader: ShaderChunk.background_vert,
    fragmentShader: ShaderChunk.background_frag
  },
  backgroundCube: {
    uniforms: {
      envMap: { value: null },
      backgroundBlurriness: { value: 0 },
      backgroundIntensity: { value: 1 },
      backgroundRotation: { value: /* @__PURE__ */ new Matrix3 }
    },
    vertexShader: ShaderChunk.backgroundCube_vert,
    fragmentShader: ShaderChunk.backgroundCube_frag
  },
  cube: {
    uniforms: {
      tCube: { value: null },
      tFlip: { value: -1 },
      opacity: { value: 1 }
    },
    vertexShader: ShaderChunk.cube_vert,
    fragmentShader: ShaderChunk.cube_frag
  },
  equirect: {
    uniforms: {
      tEquirect: { value: null }
    },
    vertexShader: ShaderChunk.equirect_vert,
    fragmentShader: ShaderChunk.equirect_frag
  },
  distance: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.displacementmap,
      {
        referencePosition: { value: /* @__PURE__ */ new Vector3 },
        nearDistance: { value: 1 },
        farDistance: { value: 1000 }
      }
    ]),
    vertexShader: ShaderChunk.distance_vert,
    fragmentShader: ShaderChunk.distance_frag
  },
  shadow: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.lights,
      UniformsLib.fog,
      {
        color: { value: /* @__PURE__ */ new Color(0) },
        opacity: { value: 1 }
      }
    ]),
    vertexShader: ShaderChunk.shadow_vert,
    fragmentShader: ShaderChunk.shadow_frag
  }
};
ShaderLib.physical = {
  uniforms: /* @__PURE__ */ mergeUniforms([
    ShaderLib.standard.uniforms,
    {
      clearcoat: { value: 0 },
      clearcoatMap: { value: null },
      clearcoatMapTransform: { value: /* @__PURE__ */ new Matrix3 },
      clearcoatNormalMap: { value: null },
      clearcoatNormalMapTransform: { value: /* @__PURE__ */ new Matrix3 },
      clearcoatNormalScale: { value: /* @__PURE__ */ new Vector2(1, 1) },
      clearcoatRoughness: { value: 0 },
      clearcoatRoughnessMap: { value: null },
      clearcoatRoughnessMapTransform: { value: /* @__PURE__ */ new Matrix3 },
      dispersion: { value: 0 },
      retroreflectivity: { value: 0 },
      iridescence: { value: 0 },
      iridescenceMap: { value: null },
      iridescenceMapTransform: { value: /* @__PURE__ */ new Matrix3 },
      iridescenceIOR: { value: 1.3 },
      iridescenceThicknessMinimum: { value: 100 },
      iridescenceThicknessMaximum: { value: 400 },
      iridescenceThicknessMap: { value: null },
      iridescenceThicknessMapTransform: { value: /* @__PURE__ */ new Matrix3 },
      sheen: { value: 0 },
      sheenColor: { value: /* @__PURE__ */ new Color(0) },
      sheenColorMap: { value: null },
      sheenColorMapTransform: { value: /* @__PURE__ */ new Matrix3 },
      sheenRoughness: { value: 1 },
      sheenRoughnessMap: { value: null },
      sheenRoughnessMapTransform: { value: /* @__PURE__ */ new Matrix3 },
      transmission: { value: 0 },
      transmissionMap: { value: null },
      transmissionMapTransform: { value: /* @__PURE__ */ new Matrix3 },
      transmissionSamplerSize: { value: /* @__PURE__ */ new Vector2 },
      transmissionSamplerMap: { value: null },
      thickness: { value: 0 },
      thicknessMap: { value: null },
      thicknessMapTransform: { value: /* @__PURE__ */ new Matrix3 },
      attenuationDistance: { value: 0 },
      attenuationColor: { value: /* @__PURE__ */ new Color(0) },
      specularColor: { value: /* @__PURE__ */ new Color(1, 1, 1) },
      specularColorMap: { value: null },
      specularColorMapTransform: { value: /* @__PURE__ */ new Matrix3 },
      specularIntensity: { value: 1 },
      specularIntensityMap: { value: null },
      specularIntensityMapTransform: { value: /* @__PURE__ */ new Matrix3 },
      anisotropyVector: { value: /* @__PURE__ */ new Vector2 },
      anisotropyMap: { value: null },
      anisotropyMapTransform: { value: /* @__PURE__ */ new Matrix3 }
    }
  ]),
  vertexShader: ShaderChunk.meshphysical_vert,
  fragmentShader: ShaderChunk.meshphysical_frag
};
var _m$1 = /* @__PURE__ */ new Matrix3;
_m$1.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
var toneMappingMap = {
  [LinearToneMapping]: "LINEAR_TONE_MAPPING",
  [ReinhardToneMapping]: "REINHARD_TONE_MAPPING",
  [CineonToneMapping]: "CINEON_TONE_MAPPING",
  [ACESFilmicToneMapping]: "ACES_FILMIC_TONE_MAPPING",
  [AgXToneMapping]: "AGX_TONE_MAPPING",
  [NeutralToneMapping]: "NEUTRAL_TONE_MAPPING",
  [CustomToneMapping]: "CUSTOM_TONE_MAPPING"
};
var mat4array = new Float32Array(16);
var mat3array = new Float32Array(9);
var mat2array = new Float32Array(4);
var toneMappingFunctions = {
  [LinearToneMapping]: "Linear",
  [ReinhardToneMapping]: "Reinhard",
  [CineonToneMapping]: "Cineon",
  [ACESFilmicToneMapping]: "ACESFilmic",
  [AgXToneMapping]: "AgX",
  [NeutralToneMapping]: "Neutral",
  [CustomToneMapping]: "Custom"
};
var shaderChunkMap = new Map;
var shadowMapTypeDefines = {
  [PCFShadowMap]: "SHADOWMAP_TYPE_PCF",
  [VSMShadowMap]: "SHADOWMAP_TYPE_VSM"
};
var envMapTypeDefines = {
  [CubeReflectionMapping]: "ENVMAP_TYPE_CUBE",
  [CubeRefractionMapping]: "ENVMAP_TYPE_CUBE",
  [CubeUVReflectionMapping]: "ENVMAP_TYPE_CUBE_UV"
};
var envMapModeDefines = {
  [CubeRefractionMapping]: "ENVMAP_MODE_REFRACTION"
};
var envMapBlendingDefines = {
  [MultiplyOperation]: "ENVMAP_BLENDING_MULTIPLY",
  [MixOperation]: "ENVMAP_BLENDING_MIX",
  [AddOperation]: "ENVMAP_BLENDING_ADD"
};
var _m = /* @__PURE__ */ new Matrix3;
_m.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
var DATA = new Uint16Array([
  12469,
  15057,
  12620,
  14925,
  13266,
  14620,
  13807,
  14376,
  14323,
  13990,
  14545,
  13625,
  14713,
  13328,
  14840,
  12882,
  14931,
  12528,
  14996,
  12233,
  15039,
  11829,
  15066,
  11525,
  15080,
  11295,
  15085,
  10976,
  15082,
  10705,
  15073,
  10495,
  13880,
  14564,
  13898,
  14542,
  13977,
  14430,
  14158,
  14124,
  14393,
  13732,
  14556,
  13410,
  14702,
  12996,
  14814,
  12596,
  14891,
  12291,
  14937,
  11834,
  14957,
  11489,
  14958,
  11194,
  14943,
  10803,
  14921,
  10506,
  14893,
  10278,
  14858,
  9960,
  14484,
  14039,
  14487,
  14025,
  14499,
  13941,
  14524,
  13740,
  14574,
  13468,
  14654,
  13106,
  14743,
  12678,
  14818,
  12344,
  14867,
  11893,
  14889,
  11509,
  14893,
  11180,
  14881,
  10751,
  14852,
  10428,
  14812,
  10128,
  14765,
  9754,
  14712,
  9466,
  14764,
  13480,
  14764,
  13475,
  14766,
  13440,
  14766,
  13347,
  14769,
  13070,
  14786,
  12713,
  14816,
  12387,
  14844,
  11957,
  14860,
  11549,
  14868,
  11215,
  14855,
  10751,
  14825,
  10403,
  14782,
  10044,
  14729,
  9651,
  14666,
  9352,
  14599,
  9029,
  14967,
  12835,
  14966,
  12831,
  14963,
  12804,
  14954,
  12723,
  14936,
  12564,
  14917,
  12347,
  14900,
  11958,
  14886,
  11569,
  14878,
  11247,
  14859,
  10765,
  14828,
  10401,
  14784,
  10011,
  14727,
  9600,
  14660,
  9289,
  14586,
  8893,
  14508,
  8533,
  15111,
  12234,
  15110,
  12234,
  15104,
  12216,
  15092,
  12156,
  15067,
  12010,
  15028,
  11776,
  14981,
  11500,
  14942,
  11205,
  14902,
  10752,
  14861,
  10393,
  14812,
  9991,
  14752,
  9570,
  14682,
  9252,
  14603,
  8808,
  14519,
  8445,
  14431,
  8145,
  15209,
  11449,
  15208,
  11451,
  15202,
  11451,
  15190,
  11438,
  15163,
  11384,
  15117,
  11274,
  15055,
  10979,
  14994,
  10648,
  14932,
  10343,
  14871,
  9936,
  14803,
  9532,
  14729,
  9218,
  14645,
  8742,
  14556,
  8381,
  14461,
  8020,
  14365,
  7603,
  15273,
  10603,
  15272,
  10607,
  15267,
  10619,
  15256,
  10631,
  15231,
  10614,
  15182,
  10535,
  15118,
  10389,
  15042,
  10167,
  14963,
  9787,
  14883,
  9447,
  14800,
  9115,
  14710,
  8665,
  14615,
  8318,
  14514,
  7911,
  14411,
  7507,
  14279,
  7198,
  15314,
  9675,
  15313,
  9683,
  15309,
  9712,
  15298,
  9759,
  15277,
  9797,
  15229,
  9773,
  15166,
  9668,
  15084,
  9487,
  14995,
  9274,
  14898,
  8910,
  14800,
  8539,
  14697,
  8234,
  14590,
  7790,
  14479,
  7409,
  14367,
  7067,
  14178,
  6621,
  15337,
  8619,
  15337,
  8631,
  15333,
  8677,
  15325,
  8769,
  15305,
  8871,
  15264,
  8940,
  15202,
  8909,
  15119,
  8775,
  15022,
  8565,
  14916,
  8328,
  14804,
  8009,
  14688,
  7614,
  14569,
  7287,
  14448,
  6888,
  14321,
  6483,
  14088,
  6171,
  15350,
  7402,
  15350,
  7419,
  15347,
  7480,
  15340,
  7613,
  15322,
  7804,
  15287,
  7973,
  15229,
  8057,
  15148,
  8012,
  15046,
  7846,
  14933,
  7611,
  14810,
  7357,
  14682,
  7069,
  14552,
  6656,
  14421,
  6316,
  14251,
  5948,
  14007,
  5528,
  15356,
  5942,
  15356,
  5977,
  15353,
  6119,
  15348,
  6294,
  15332,
  6551,
  15302,
  6824,
  15249,
  7044,
  15171,
  7122,
  15070,
  7050,
  14949,
  6861,
  14818,
  6611,
  14679,
  6349,
  14538,
  6067,
  14398,
  5651,
  14189,
  5311,
  13935,
  4958,
  15359,
  4123,
  15359,
  4153,
  15356,
  4296,
  15353,
  4646,
  15338,
  5160,
  15311,
  5508,
  15263,
  5829,
  15188,
  6042,
  15088,
  6094,
  14966,
  6001,
  14826,
  5796,
  14678,
  5543,
  14527,
  5287,
  14377,
  4985,
  14133,
  4586,
  13869,
  4257,
  15360,
  1563,
  15360,
  1642,
  15358,
  2076,
  15354,
  2636,
  15341,
  3350,
  15317,
  4019,
  15273,
  4429,
  15203,
  4732,
  15105,
  4911,
  14981,
  4932,
  14836,
  4818,
  14679,
  4621,
  14517,
  4386,
  14359,
  4156,
  14083,
  3795,
  13808,
  3437,
  15360,
  122,
  15360,
  137,
  15358,
  285,
  15355,
  636,
  15344,
  1274,
  15322,
  2177,
  15281,
  2765,
  15215,
  3223,
  15120,
  3451,
  14995,
  3569,
  14846,
  3567,
  14681,
  3466,
  14511,
  3305,
  14344,
  3121,
  14037,
  2800,
  13753,
  2467,
  15360,
  0,
  15360,
  1,
  15359,
  21,
  15355,
  89,
  15346,
  253,
  15325,
  479,
  15287,
  796,
  15225,
  1148,
  15133,
  1492,
  15008,
  1749,
  14856,
  1882,
  14685,
  1886,
  14506,
  1783,
  14324,
  1608,
  13996,
  1398,
  13702,
  1183
]);

// src/sim/fleet.ts
var SHIP_SPECS = {
  carrier: {
    kind: "carrier",
    maxHp: 8000,
    halfLength: 166,
    halfWidth: 38,
    deckHeight: 20,
    model: "models/carrier.glb",
    island: { center: [30, 38, 20], half: [8, 18, 22] },
    turrets: [
      { id: "ciws_bow_port", kind: "ciws", mannable: true, offset: [-36, 18, -150] },
      { id: "ciws_bow_stbd", kind: "ciws", mannable: true, offset: [36, 18, -140] },
      { id: "ciws_aft_port", kind: "ciws", mannable: true, offset: [-36, 18, 150] },
      { id: "ciws_island", kind: "ciws", mannable: true, offset: [38, 58, 10] }
    ]
  },
  destroyer: {
    kind: "destroyer",
    maxHp: 3000,
    halfLength: 78,
    halfWidth: 10,
    deckHeight: 9,
    model: "models/destroyer.glb",
    island: { center: [0, 22, -10], half: [8, 13, 16] },
    turrets: [
      { id: "gun_fwd", kind: "gun", mannable: true, offset: [0, 11, -52] },
      { id: "ciws_fwd", kind: "ciws", mannable: true, offset: [0, 30, -24] },
      { id: "ciws_aft", kind: "ciws", mannable: true, offset: [0, 18, 34] }
    ]
  }
};
var AA_RANGE = 1200;
var TURRET_HP = 600;
var SHIP_DAMAGE_SCALE = { gun: 0.15, rockets: 1.6, missile_lock: 3, missile_scanner: 3.5, bomb: 3, aa: 0 };
var SPAWN_PROTECTION = 6;
var FLEET_ORBIT_RADIUS = 3200;
var FLEET_LAP_TIME = 1500;
var FLEET_ANGULAR_SPEED = 2 * Math.PI / FLEET_LAP_TIME;
var CARRIERS = [{ dx: -260, dz: 0 }, { dx: 260, dz: 120 }];
var ESCORTS = [
  { dx: -600, dz: -500 },
  { dx: 600, dz: -500 },
  { dx: 0, dz: 750 }
];
var FLEET = [0, 1, 2, 3].flatMap((team) => {
  const theta = [0, Math.PI, -Math.PI / 2, Math.PI / 2][team];
  const cx = FLEET_ORBIT_RADIUS * Math.sin(theta), cz = FLEET_ORBIT_RADIUS * Math.cos(theta);
  const heading = theta - Math.PI / 2;
  const c = Math.cos(heading), s = Math.sin(heading);
  const local = (dx, dz) => [cx + dx * c + dz * s, 0, cz - dx * s + dz * c];
  return [
    ...CARRIERS.map((o, i) => ({ id: i === 0 ? `t${team}-carrier` : `t${team}-carrier${i + 1}`, team, kind: "carrier", position: local(o.dx, o.dz), heading })),
    ...ESCORTS.map((e, i) => ({ id: `t${team}-dd${i + 1}`, team, kind: "destroyer", position: local(e.dx, e.dz), heading }))
  ];
});
function shipPose(ship, t, out) {
  const phi = FLEET_ANGULAR_SPEED * Math.max(0, t);
  const c = Math.cos(phi), s = Math.sin(phi);
  const x0 = ship.position[0], z0 = ship.position[2];
  const o = out ?? { position: [0, 0, 0], heading: 0, velocity: [0, 0, 0], yawRate: 0 };
  const x = x0 * c + z0 * s, z = -x0 * s + z0 * c;
  o.position[0] = x;
  o.position[1] = 0;
  o.position[2] = z;
  o.heading = ship.heading + phi;
  o.velocity[0] = FLEET_ANGULAR_SPEED * z;
  o.velocity[1] = 0;
  o.velocity[2] = -FLEET_ANGULAR_SPEED * x;
  o.yawRate = FLEET_ANGULAR_SPEED;
  return o;
}
function shipToWorld(ship, local) {
  const c = Math.cos(ship.heading), s = Math.sin(ship.heading);
  return [ship.position[0] + local[0] * c + local[2] * s, ship.position[1] + local[1], ship.position[2] - local[0] * s + local[2] * c];
}
function worldToShip(ship, p) {
  const dx = p[0] - ship.position[0], dz = p[2] - ship.position[2];
  const c = Math.cos(ship.heading), s = Math.sin(ship.heading);
  return [dx * c - dz * s, p[1] - ship.position[1], dx * s + dz * c];
}

// src/sim/geography.ts
var WORLD_SIZE = 1e4;
var WORLD_HALF = WORLD_SIZE / 2;
var WATER_LEVEL = 0;
var CEILING = 3500;
var WORLD_SEED = 1464421959;
var SEA_FLOOR = -40;
var MESH_CELL = 25;
var MESH_SEGMENTS = WORLD_SIZE / MESH_CELL;
var JITTER = 0.26;
var SPAWN_CLEARANCE = { jet: 2.2, heli: 1.9 };
var CARRIER = SHIP_SPECS.carrier;
var DECK_LAYOUT = {
  catapults: [[-14, 40], [6, 52], [-14, 78], [6, 90], [-14, 116], [6, 128]],
  heloSpots: [[-27, 92], [-27, 124], [-27, 154], [24, 120], [24, 150]]
};
var NS = FLEET.length;
var POSED = FLEET.map((sh) => ({ ...sh, position: [sh.position[0], 0, sh.position[2]] }));
var SIN = new Float64Array(NS);
var COS = new Float64Array(NS);
var VEL = FLEET.map(() => [0, 0, 0]);
var ACTIVE = new Uint8Array(NS).fill(1);
var TEAM_ON = new Uint8Array(NS).fill(1);
var ALIVE = new Uint8Array(NS).fill(1);
var SOLID = new Uint8Array(NS).fill(1);
var SINK_SOLID_TIME = 20;
var CARRIERS_OF = [[], [], [], []];
FLEET.forEach((sh, i) => {
  if (sh.kind === "carrier")
    CARRIERS_OF[sh.team].push(i);
});
var REACH = new Float64Array(NS);
var TOP = new Float64Array(NS);
FLEET.forEach((sh, i) => {
  const sp = SHIP_SPECS[sh.kind];
  SIN[i] = Math.sin(sh.heading);
  COS[i] = Math.cos(sh.heading);
  REACH[i] = Math.hypot(sp.halfLength, sp.halfWidth) + 1;
  TOP[i] = Math.max(sp.deckHeight, sp.island.center[1] + sp.island.half[1]);
});
var fleetTime = 0;
var fleetTeams = 4;
var activeShips = POSED.slice();
var poseScratch = { position: [0, 0, 0], heading: 0, velocity: [0, 0, 0] };
var SHIP_INDEX = new Map(FLEET.map((sh, i) => [sh.id, i]));
function setFleetState(matchTime, teams) {
  fleetTime = Math.max(0, matchTime);
  const n = Math.max(0, Math.min(4, Math.floor(teams)));
  let changed = n !== fleetTeams;
  fleetTeams = n;
  for (let i = 0;i < NS; i++) {
    shipPose(FLEET[i], fleetTime, poseScratch);
    const P = POSED[i];
    P.position[0] = poseScratch.position[0];
    P.position[2] = poseScratch.position[2];
    P.heading = poseScratch.heading;
    SIN[i] = Math.sin(P.heading);
    COS[i] = Math.cos(P.heading);
    VEL[i][0] = poseScratch.velocity[0];
    VEL[i][2] = poseScratch.velocity[2];
    TEAM_ON[i] = FLEET[i].team < n ? 1 : 0;
  }
  if (refreshActive() || changed)
    activeShips = POSED.filter((_, i) => ACTIVE[i] === 1);
  for (const base of AIRBASES)
    refreshBase(base);
}
function refreshActive() {
  let changed = false;
  for (let i = 0;i < NS; i++) {
    const a = TEAM_ON[i] && SOLID[i] ? 1 : 0;
    if (ACTIVE[i] !== a) {
      ACTIVE[i] = a;
      changed = true;
    }
  }
  return changed;
}
function setShipStates(ships, now = Infinity) {
  if (!ships)
    return;
  for (const st of ships) {
    const i = SHIP_INDEX.get(st.id);
    if (i === undefined)
      continue;
    ALIVE[i] = st.sunk ? 0 : 1;
    SOLID[i] = !st.sunk || now - st.sunkAt < SINK_SOLID_TIME ? 1 : 0;
  }
  if (refreshActive())
    activeShips = POSED.filter((_, i) => ACTIVE[i] === 1);
  for (const base of AIRBASES)
    refreshBase(base);
}
function fleetState() {
  return { matchTime: fleetTime, teams: fleetTeams };
}
function posedFleet() {
  return activeShips;
}
function posedShip(id) {
  const i = SHIP_INDEX.get(id);
  return i === undefined ? null : POSED[i];
}
function carrierIndex(team) {
  const list = CARRIERS_OF[team];
  for (const i of list)
    if (ALIVE[i])
      return i;
  return list[0];
}
function carrierOf(team) {
  return POSED[carrierIndex(team)];
}
var L = { x: 0, z: 0 };
function toLocal(i, x, z) {
  const P = POSED[i].position;
  const dx = x - P[0], dz = z - P[2], c = COS[i], s = SIN[i];
  L.x = dx * c - dz * s;
  L.z = dx * s + dz * c;
}
function toWorldInto(i, lx, ly, lz, out) {
  const P = POSED[i].position, c = COS[i], s = SIN[i];
  out[0] = P[0] + lx * c + lz * s;
  out[1] = ly;
  out[2] = P[2] - lx * s + lz * c;
  return out;
}
function refreshBase(base) {
  const i = carrierIndex(base.team);
  base.center[0] = POSED[i].position[0];
  base.center[2] = POSED[i].position[2];
  base.heading = POSED[i].heading;
  base.helipads.forEach((h, k) => toWorldInto(i, DECK_LAYOUT.heloSpots[k][0], CARRIER.deckHeight, DECK_LAYOUT.heloSpots[k][1], h));
}
var AIRBASES = [0, 1, 2, 3].map((team) => {
  const c = carrierOf(team);
  const base = {
    team,
    heading: c.heading,
    center: [c.position[0], CARRIER.deckHeight, c.position[2]],
    runwayLength: CARRIER.halfLength * 2,
    runwayWidth: CARRIER.halfWidth * 2,
    safeRadius: AA_RANGE,
    helipads: DECK_LAYOUT.heloSpots.slice(0, 4).map(() => [0, 0, 0])
  };
  refreshBase(base);
  return base;
});
function hash2(x, z, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function noise2(x, z, seed = WORLD_SEED) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, z, seed, octaves) {
  let sum = 0, amp = 0.5, f = 1;
  for (let o = 0;o < octaves; o++) {
    sum += noise2(x * f, z * f, seed + o * 101) * amp;
    f *= 2.03;
    amp *= 0.5;
  }
  return sum;
}
function ridged(x, z, seed, octaves) {
  let sum = 0, amp = 0.5, f = 1, w = 1;
  for (let o = 0;o < octaves; o++) {
    let n = 1 - Math.abs(noise2(x * f, z * f, seed + o * 131));
    n *= n * w;
    w = Math.min(1, n * 2);
    sum += n * amp;
    f *= 2.1;
    amp *= 0.5;
  }
  return sum;
}
function smooth(a, b, x) {
  const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a);
  return t * t * (3 - 2 * t);
}
function seededRandom2(seed) {
  let s = seed >>> 0;
  return () => {
    s = s + 1831565813 >>> 0;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var LAUNCH_LANE_LENGTH = 1500;
var FLEET_RING_HALF = 1000;
function fleetClearance(x, z) {
  return Math.abs(Math.hypot(x, z) - FLEET_ORBIT_RADIUS) - FLEET_RING_HALF;
}
function nearBase(x, z, margin) {
  return fleetClearance(x, z) < margin;
}
var ARCHIPELAGO_RADIUS = 1700;
function layout(seed) {
  const rand = seededRandom2(seed ^ 88701);
  const blobs = [];
  const names = [];
  const peaks = [];
  blobs.push({ x: 0, z: 0, r: 820, amp: 1 });
  names.push({ name: "Mainland", x: 0, z: 0, radius: 900, height: 0 });
  for (let i = 0;i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + rand() * 0.8, d = 450 + rand() * 350;
    blobs.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 420 + rand() * 220, amp: 0.9 });
  }
  for (let i = 0, tries = 0;i < 4 && tries < 200; tries++) {
    const a = rand() * Math.PI * 2, d = 1050 + rand() * 350, r = 200 + rand() * 180;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (blobs.some((B) => Math.hypot(B.x - x, B.z - z) < B.r * 0.6 + r))
      continue;
    blobs.push({ x, z, r, amp: 0.8 });
    names.push({ name: `Isle ${names.length + 1}`, x, z, radius: r, height: 0 });
    i++;
  }
  const pa = rand() * Math.PI * 2;
  peaks.push({ x: Math.cos(pa) * 260, z: Math.sin(pa) * 260, r: 600, h: 430 + rand() * 80 });
  peaks.push({ x: Math.cos(pa + 2.6) * 520, z: Math.sin(pa + 2.6) * 520, r: 420, h: 280 + rand() * 60 });
  for (let i = 0, tries = 0;i < 9 && tries < 2000; tries++) {
    const a = rand() * Math.PI * 2, d = 4500 + rand() * 450, r = 90 + rand() * 140;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.abs(x) > WORLD_HALF - 250 || Math.abs(z) > WORLD_HALF - 250)
      continue;
    if (nearBase(x, z, r * 1.6 + 150))
      continue;
    blobs.push({ x, z, r, amp: 0.6 + rand() * 0.35 });
    i++;
  }
  return { blobs, peaks, names };
}
var layoutSeed = WORLD_SEED;
var LAYOUT = layout(layoutSeed);
var ISLANDS = LAYOUT.names;
var N = MESH_SEGMENTS;
var STRIDE = N + 1;
var BOUND_BLOCK = 500;
var BN = WORLD_SIZE / BOUND_BLOCK;
var baked = null;
function bake(seed) {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { blobs, peaks } = LAYOUT;
  const h = new Float32Array(STRIDE * STRIDE);
  const vx = new Float32Array(STRIDE * STRIDE);
  const vz = new Float32Array(STRIDE * STRIDE);
  const diag = new Uint8Array(N * N);
  const land = new Float32Array(STRIDE * STRIDE);
  const IB = 500, IN = WORLD_SIZE / IB;
  const blobIndex = [];
  for (let bz = 0;bz < IN; bz++)
    for (let bx = 0;bx < IN; bx++) {
      const cx = -WORLD_HALF + (bx + 0.5) * IB, cz = -WORLD_HALF + (bz + 0.5) * IB;
      blobIndex.push(blobs.filter((B) => Math.hypot(cx - B.x, cz - B.z) < B.r * 1.2 + 310 + 360));
    }
  for (let j = 0;j <= N; j++) {
    for (let i = 0;i <= N; i++) {
      const k = j * STRIDE + i;
      const edge = i === 0 || j === 0 || i === N || j === N;
      const jx = edge ? 0 : (hash2(i, j, seed ^ 4369) - 0.5) * 2 * JITTER * MESH_CELL;
      const jz = edge ? 0 : (hash2(i, j, seed ^ 8738) - 0.5) * 2 * JITTER * MESH_CELL;
      const x = -WORLD_HALF + i * MESH_CELL + jx, z = -WORLD_HALF + j * MESH_CELL + jz;
      vx[k] = x;
      vz[k] = z;
      const near = blobIndex[Math.min(IN - 1, Math.floor((z + WORLD_HALF) / IB)) * IN + Math.min(IN - 1, Math.floor((x + WORLD_HALF) / IB))];
      if (near.length === 0) {
        h[k] = SEA_FLOOR;
        continue;
      }
      const wx = x + fbm(x * 0.0009, z * 0.0009, seed + 7, 4) * 320;
      const wz = z + fbm(x * 0.0009 + 31.7, z * 0.0009 - 12.3, seed + 9, 4) * 320;
      let m = 0;
      for (let b = 0;b < near.length; b++) {
        const B = near[b];
        const dx = wx - B.x, dz = wz - B.z;
        const d2 = (dx * dx + dz * dz) / (B.r * B.r);
        if (d2 >= 1.44)
          continue;
        const v = (1 - smooth(0.25, 1.2, Math.sqrt(d2))) * B.amp;
        if (v > m)
          m = v;
      }
      if (m > 0)
        m -= (fbm(x * 0.0016, z * 0.0016, seed + 13, 3) * 0.5 + 0.25) * 0.42 * smooth(0, 0.6, m) * (1 - smooth(0.6, 1, m) * 0.5);
      if (m <= 0.001) {
        h[k] = SEA_FLOOR;
        continue;
      }
      land[k] = m;
      const hills = (fbm(x * 0.0011, z * 0.0011, seed + 21, 4) * 0.5 + 0.5) * 120;
      const mtn = ridged(wx * 0.0011, wz * 0.0011, seed + 33, 4) * 200 * smooth(0.45, 1, m);
      let e = -30 + m * 95 + (hills + mtn) * smooth(0.2, 0.75, m);
      for (const P of peaks) {
        const d = Math.hypot(x - P.x, z - P.z) / P.r;
        if (d < 1) {
          const f = 1 - d;
          e += P.h * f * f * (3 - 2 * f) * (0.8 + 0.4 * ridged(x * 0.002, z * 0.002, seed + 41, 2));
        }
      }
      const cn = Math.abs(noise2(wx * 0.0011 + 5.1, wz * 0.0011 - 2.7, seed + 55));
      const ch = 1 - smooth(0.035, 0.09, cn);
      if (ch > 0 && e > -2)
        e = e + (Math.min(e, -4 + cn * 120) - e) * ch * smooth(0.25, 0.5, m);
      h[k] = Math.max(SEA_FLOOR, e);
    }
  }
  erode(h, land, seed);
  const talus = 38;
  for (let j = 1;j < N; j++)
    for (let i = 1;i < N; i++) {
      const k = j * STRIDE + i;
      const avg = (h[k - 1] + h[k + 1] + h[k - STRIDE] + h[k + STRIDE]) * 0.25;
      if (h[k] - avg > talus)
        h[k] = avg + talus;
    }
  const tmp = new Float32Array(h.length);
  for (let pass = 0;pass < 3; pass++) {
    tmp.set(h);
    for (let j = 1;j < N; j++)
      for (let i = 1;i < N; i++) {
        const k = j * STRIDE + i;
        if (tmp[k] <= 0)
          continue;
        h[k] = tmp[k] * 0.4 + (tmp[k - 1] + tmp[k + 1] + tmp[k - STRIDE] + tmp[k + STRIDE]) * 0.15;
      }
  }
  for (let k = 0;k < h.length; k++) {
    if (h[k] <= -12)
      continue;
    const rc = Math.hypot(vx[k], vz[k]);
    if (rc < FLEET_ORBIT_RADIUS && rc > ARCHIPELAGO_RADIUS - 250)
      h[k] = Math.min(h[k], -1 - (rc - (ARCHIPELAGO_RADIUS - 250)) * 0.08);
    const d = fleetClearance(vx[k], vz[k]);
    if (d < 700) {
      const t = smooth(0, 700, d);
      h[k] = Math.min(h[k], -12 + (h[k] + 12) * t);
    }
  }
  for (let j = 0;j < N; j++)
    for (let i = 0;i < N; i++)
      diag[j * N + i] = hash2(i, j, seed ^ 13107) < 0.5 ? 0 : 1;
  const bound = new Float32Array(BN * BN).fill(WATER_LEVEL);
  for (let j = 0;j <= N; j++)
    for (let i = 0;i <= N; i++) {
      const k = j * STRIDE + i;
      const bx = Math.min(BN - 1, Math.floor((vx[k] + WORLD_HALF) / BOUND_BLOCK));
      const bz = Math.min(BN - 1, Math.floor((vz[k] + WORLD_HALF) / BOUND_BLOCK));
      for (let dz = -1;dz <= 1; dz++)
        for (let dx = -1;dx <= 1; dx++) {
          const X = bx + dx, Z = bz + dz;
          if (X < 0 || Z < 0 || X >= BN || Z >= BN)
            continue;
          const o = Z * BN + X;
          if (h[k] > bound[o])
            bound[o] = h[k];
        }
    }
  const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  return { seed, h, vx, vz, diag, bound, ms };
}
function erode(h, land, seed) {
  const rand = seededRandom2(seed ^ 58381);
  const drops = 14000;
  const inertia = 0.3, capacityK = 3, depositK = 0.3, erodeK = 0.25, evap = 0.03, gravity = 4, maxSteps = 40;
  const hAt = (x, y) => {
    const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * STRIDE + i;
    return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + STRIDE] * (1 - u) * v + h[k + STRIDE + 1] * u * v;
  };
  for (let d = 0;d < drops; d++) {
    let x = 1 + rand() * (N - 2), y = 1 + rand() * (N - 2);
    if (land[(y | 0) * STRIDE + (x | 0)] < 0.3)
      continue;
    let dx = 0, dy = 0, speed = 1, water = 1, sediment = 0;
    for (let s = 0;s < maxSteps; s++) {
      const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * STRIDE + i;
      const h00 = h[k], h10 = h[k + 1], h01 = h[k + STRIDE], h11 = h[k + STRIDE + 1];
      const gx = (h10 - h00) * (1 - v) + (h11 - h01) * v;
      const gy = (h01 - h00) * (1 - u) + (h11 - h10) * u;
      const hOld = h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v;
      dx = dx * inertia - gx * (1 - inertia);
      dy = dy * inertia - gy * (1 - inertia);
      const len = Math.hypot(dx, dy);
      if (len < 0.000001)
        break;
      dx /= len;
      dy /= len;
      x += dx;
      y += dy;
      if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1)
        break;
      const hNew = hAt(x, y);
      const dh = hNew - hOld;
      if (hOld < -2)
        break;
      const cap = Math.max(-dh * speed * water * capacityK, 0.01);
      if (sediment > cap || dh > 0) {
        const amt = dh > 0 ? Math.min(dh, sediment) : (sediment - cap) * depositK;
        sediment -= amt;
        h[k] += amt * (1 - u) * (1 - v);
        h[k + 1] += amt * u * (1 - v);
        h[k + STRIDE] += amt * (1 - u) * v;
        h[k + STRIDE + 1] += amt * u * v;
      } else {
        const amt = Math.min((cap - sediment) * erodeK, -dh);
        h[k] -= amt * (1 - u) * (1 - v);
        h[k + 1] -= amt * u * (1 - v);
        h[k + STRIDE] -= amt * (1 - u) * v;
        h[k + STRIDE + 1] -= amt * u * v;
        sediment += amt;
      }
      speed = Math.sqrt(Math.max(0, speed * speed - dh * gravity));
      water *= 1 - evap;
    }
  }
}
function world() {
  if (!baked || baked.seed !== layoutSeed)
    baked = bake(layoutSeed);
  return baked;
}
var triScratch = { h: 0 };
function inTri(w, k0, k1, k2, x, z) {
  const x0 = w.vx[k0], z0 = w.vz[k0], x1 = w.vx[k1], z1 = w.vz[k1], x2 = w.vx[k2], z2 = w.vz[k2];
  const det = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
  const l0 = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / det;
  const l1 = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / det;
  const l2 = 1 - l0 - l1;
  const e = -0.000001;
  if (l0 < e || l1 < e || l2 < e)
    return false;
  const h2 = w.h[k2];
  triScratch.h = h2 + l0 * (w.h[k0] - h2) + l1 * (w.h[k1] - h2);
  return true;
}
function cellHeight(w, i, j, x, z) {
  if (i < 0 || j < 0 || i >= N || j >= N)
    return false;
  const a = j * STRIDE + i, b = a + 1, c = a + STRIDE, d = c + 1;
  if (w.diag[j * N + i] === 0)
    return inTri(w, a, c, b, x, z) || inTri(w, b, c, d, x, z);
  return inTri(w, a, c, d, x, z) || inTri(w, a, d, b, x, z);
}
var SEARCH = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
function terrainMeshHeight(x, z) {
  if (!(x > -WORLD_HALF && x < WORLD_HALF && z > -WORLD_HALF && z < WORLD_HALF))
    return SEA_FLOOR;
  const w = world();
  const gx = (x + WORLD_HALF) / MESH_CELL, gz = (z + WORLD_HALF) / MESH_CELL;
  const i = Math.floor(gx), j = Math.floor(gz);
  const sx = gx - i < 0.5 ? -1 : 1, sz = gz - j < 0.5 ? -1 : 1;
  if (cellHeight(w, i, j, x, z))
    return triScratch.h;
  if (cellHeight(w, i + sx, j, x, z))
    return triScratch.h;
  if (cellHeight(w, i, j + sz, x, z))
    return triScratch.h;
  if (cellHeight(w, i + sx, j + sz, x, z))
    return triScratch.h;
  for (const [di, dj] of SEARCH)
    if (cellHeight(w, i + di, j + dj, x, z))
      return triScratch.h;
  const k = Math.min(N, Math.max(0, Math.round(gz))) * STRIDE + Math.min(N, Math.max(0, Math.round(gx)));
  return w.h[k];
}
function shipIndexAt(x, z) {
  for (let i = 0;i < NS; i++) {
    if (!ACTIVE[i])
      continue;
    const P = POSED[i].position, r = REACH[i];
    const dx = x - P[0], dz = z - P[2];
    if (dx > r || dx < -r || dz > r || dz < -r)
      continue;
    toLocal(i, x, z);
    const sp = SHIP_SPECS[FLEET[i].kind];
    if (Math.abs(L.x) <= sp.halfWidth && Math.abs(L.z) <= sp.halfLength)
      return i;
  }
  return -1;
}
function shipAt(x, z) {
  const i = shipIndexAt(x, z);
  return i < 0 ? null : POSED[i];
}
function shipHeightIdx(i) {
  const sp = SHIP_SPECS[FLEET[i].kind];
  const I = sp.island;
  if (Math.abs(L.x - I.center[0]) <= I.half[0] && Math.abs(L.z - I.center[2]) <= I.half[2])
    return I.center[1] + I.half[1];
  return sp.deckHeight;
}
var DECK_V = [0, 0, 0];
function deckVelocity(x, z) {
  const i = shipIndexAt(x, z);
  if (i < 0)
    return null;
  const w = FLEET_ANGULAR_SPEED;
  DECK_V[0] = w * z;
  DECK_V[1] = 0;
  DECK_V[2] = -w * x;
  return DECK_V;
}
function shipBound(x, z, margin) {
  let b = WATER_LEVEL;
  for (let i = 0;i < NS; i++) {
    if (!ACTIVE[i])
      continue;
    const P = POSED[i].position, r = REACH[i] + margin;
    if (Math.abs(x - P[0]) <= r && Math.abs(z - P[2]) <= r && TOP[i] > b)
      b = TOP[i];
  }
  return b;
}
function groundHeight(x, z) {
  if (!(x > -WORLD_HALF && x < WORLD_HALF && z > -WORLD_HALF && z < WORLD_HALF))
    return WATER_LEVEL;
  const i = shipIndexAt(x, z);
  if (i >= 0)
    return Math.max(shipHeightIdx(i), terrainGround(x, z));
  const w = world();
  const bi = Math.floor((x + WORLD_HALF) / BOUND_BLOCK), bj = Math.floor((z + WORLD_HALF) / BOUND_BLOCK);
  if (w.bound[bj * BN + bi] <= WATER_LEVEL)
    return WATER_LEVEL;
  return terrainGround(x, z);
}
function terrainGround(x, z) {
  const h = terrainMeshHeight(x, z);
  return h > WATER_LEVEL ? h : WATER_LEVEL;
}
function heightBound(x, z) {
  if (!(x > -WORLD_HALF && x < WORLD_HALF && z > -WORLD_HALF && z < WORLD_HALF))
    return WATER_LEVEL;
  const w = world();
  const t = w.bound[Math.floor((z + WORLD_HALF) / BOUND_BLOCK) * BN + Math.floor((x + WORLD_HALF) / BOUND_BLOCK)];
  const s = shipBound(x, z, BOUND_BLOCK);
  return s > t ? s : t;
}
function isWater(x, z) {
  if (shipIndexAt(x, z) >= 0)
    return false;
  return terrainMeshHeight(x, z) <= WATER_LEVEL;
}
function onRunway(x, z) {
  const i = shipIndexAt(x, z);
  if (i < 0 || FLEET[i].kind !== "carrier")
    return false;
  return shipHeightIdx(i) === CARRIER.deckHeight;
}
function inSafeZone(team, p) {
  if (p[1] > CEILING)
    return false;
  for (let i = 0;i < NS; i++) {
    if (!ACTIVE[i] || !ALIVE[i] || FLEET[i].team !== team)
      continue;
    const P = POSED[i].position;
    const dx = p[0] - P[0], dz = p[2] - P[2];
    if (dx * dx + dz * dz < AA_RANGE * AA_RANGE)
      return true;
  }
  return false;
}
function spawnPoint(team, kind, index) {
  const k = Math.max(0, Math.floor(index));
  let live = 0;
  for (const c of CARRIERS_OF[team])
    if (ALIVE[c])
      live++;
  let ci = CARRIERS_OF[team][0];
  if (live > 0) {
    let n = k % live;
    for (const c of CARRIERS_OF[team])
      if (ALIVE[c] && n-- === 0) {
        ci = c;
        break;
      }
  }
  const i = live > 0 ? Math.floor(k / live) : k;
  const deck = CARRIER.deckHeight;
  const position = [0, 0, 0];
  if (kind === "apache") {
    const spots = DECK_LAYOUT.heloSpots;
    const [x, z] = spots[i % spots.length];
    return { position: toWorldInto(ci, x, deck + SPAWN_CLEARANCE.heli, z, position), yaw: POSED[ci].heading, onGround: true };
  }
  const cats = DECK_LAYOUT.catapults;
  const [x, z] = cats[i % cats.length];
  return { position: toWorldInto(ci, x, deck + SPAWN_CLEARANCE.jet, z, position), yaw: POSED[ci].heading, onGround: true };
}
function segmentBox(i, a, b, center, half) {
  toLocal(i, a[0], a[2]);
  const { x: ax, z: az } = L;
  toLocal(i, b[0], b[2]);
  const { x: bx, z: bz } = L;
  let t0 = 0, t1 = 1;
  for (let k = 0;k < 3; k++) {
    const pa = k === 0 ? ax : k === 1 ? a[1] : az, pb = k === 0 ? bx : k === 1 ? b[1] : bz;
    const d = pb - pa, lo = center[k] - half[k], hi = center[k] + half[k];
    if (Math.abs(d) < 0.000000001) {
      if (pa < lo || pa > hi)
        return null;
      continue;
    }
    let u0 = (lo - pa) / d, u1 = (hi - pa) / d;
    if (u0 > u1) {
      const t = u0;
      u0 = u1;
      u1 = t;
    }
    if (u0 > t0)
      t0 = u0;
    if (u1 < t1)
      t1 = u1;
    if (t0 > t1)
      return null;
  }
  return t0;
}
var hullCenter = {};
var hullHalf = {};
for (const k of Object.keys(SHIP_SPECS)) {
  const sp = SHIP_SPECS[k];
  hullCenter[k] = [0, (sp.deckHeight - 15) / 2, 0];
  hullHalf[k] = [sp.halfWidth, (sp.deckHeight + 15) / 2, sp.halfLength];
}
function segmentHitsShip(a, b) {
  let best = null;
  for (let i = 0;i < NS; i++) {
    if (!ACTIVE[i])
      continue;
    const sp = SHIP_SPECS[FLEET[i].kind];
    const r = REACH[i] + 5;
    const P = POSED[i].position;
    if (Math.max(a[0], b[0]) < P[0] - r || Math.min(a[0], b[0]) > P[0] + r || Math.max(a[2], b[2]) < P[2] - r || Math.min(a[2], b[2]) > P[2] + r)
      continue;
    if (Math.min(a[1], b[1]) > TOP[i])
      continue;
    const hull = segmentBox(i, a, b, hullCenter[sp.kind], hullHalf[sp.kind]);
    if (hull !== null && (best === null || hull < best))
      best = hull;
    const isl = segmentBox(i, a, b, sp.island.center, sp.island.half);
    if (isl !== null && (best === null || isl < best))
      best = isl;
  }
  return best;
}
var MAX_SLOPE = 9;
function segmentHitsGround(a, b) {
  const t = segmentHitsTerrain(a, b), s = segmentHitsShip(a, b);
  return t === null ? s : s === null ? t : Math.min(t, s);
}
function segmentHitsTerrain(a, b) {
  const ax = a[0], ay = a[1], az = a[2];
  const dx = b[0] - ax, dy = b[1] - ay, dz = b[2] - az;
  const minY = ay < b[1] ? ay : b[1];
  const horiz = Math.sqrt(dx * dx + dz * dz);
  if (minY > WATER_LEVEL) {
    let bound = Math.max(heightBound(ax, az), heightBound(b[0], b[2]));
    if (horiz > BOUND_BLOCK * 0.5) {
      const n = Math.ceil(horiz / (BOUND_BLOCK * 0.5));
      for (let i = 1;i < n; i++)
        bound = Math.max(bound, heightBound(ax + dx * i / n, az + dz * i / n));
    }
    if (minY > bound)
      return null;
  }
  const g0 = ay - terrainGround(ax, az);
  if (g0 <= 0)
    return 0;
  const len = Math.sqrt(horiz * horiz + dy * dy);
  if (len < 0.000000001)
    return null;
  const vert = Math.abs(dy) / Math.max(horiz, 0.000000001);
  const minStep = Math.min(1, 1.5 / len);
  let t = 0, gap = g0;
  while (t < 1) {
    let step = horiz > 0.000000001 ? gap / (MAX_SLOPE + vert) / horiz : gap / Math.max(Math.abs(dy), 0.000000001);
    if (step < minStep)
      step = minStep;
    let t1 = t + step;
    if (t1 > 1)
      t1 = 1;
    const g1 = ay + dy * t1 - terrainGround(ax + dx * t1, az + dz * t1);
    if (g1 <= 0) {
      let lo = t, hi = t1;
      for (let k = 0;k < 18; k++) {
        const mid = (lo + hi) * 0.5;
        if (ay + dy * mid - terrainGround(ax + dx * mid, az + dz * mid) <= 0)
          hi = mid;
        else
          lo = mid;
      }
      return hi;
    }
    t = t1;
    gap = g1;
  }
  return null;
}
var worldQuery = { groundHeight, onRunway, isWater, half: WORLD_HALF, ceiling: CEILING };

// src/sim/vehicles.ts
var WEAPONS = {
  cannon20: { id: "cannon20", name: "20mm Vulcan", kind: "gun", damage: 9, splash: 0, rate: 16, speed: 1150, ttl: 1.15, ammo: 600, refill: 15, refillDelay: 2, spread: 0.0025 },
  chaingun30: { id: "chaingun30", name: "30mm Chain Gun", kind: "gun", damage: 16, splash: 4, rate: 10, speed: 900, ttl: 1.5, ammo: 300, refill: 15, refillDelay: 2, spread: 0.004, turret: true },
  gau8: { id: "gau8", name: "GAU-8 Avenger", kind: "gun", damage: 14, splash: 2, rate: 30, speed: 1100, ttl: 1.2, ammo: 1100, refill: 15, refillDelay: 2, spread: 0.005 },
  rockets: { id: "rockets", name: "Hydra 70 Rockets", kind: "rockets", damage: 60, splash: 12, rate: 8, speed: 700, ttl: 4, ammo: 38, refill: 20, refillDelay: 2, spread: 0.015 },
  aim9: { id: "aim9", name: "Heat-Seeker", kind: "missile_lock", damage: 120, splash: 12, rate: 0.25, speed: 280, ttl: 6, ammo: 2, refill: 40, refillDelay: 4, range: 1100, lockCone: 0.08, lockTime: 2.2, turnRate: 1.6 },
  tvmissile: { id: "tvmissile", name: "Radar Missile", kind: "missile_lock", damage: 130, splash: 12, rate: 0.2, speed: 300, ttl: 7, ammo: 2, refill: 40, refillDelay: 4, range: 1500, lockCone: 0.07, lockTime: 2.5, turnRate: 1.5, turret: true },
  hellfire: { id: "hellfire", name: "Hellfire", kind: "missile_lock", damage: 130, splash: 12, rate: 0.25, speed: 260, ttl: 8, ammo: 4, refill: 40, refillDelay: 4, range: 1500, lockCone: 0.07, lockTime: 2.5, turnRate: 1.5, turret: true },
  maverick: { id: "maverick", name: "Maverick", kind: "missile_lock", damage: 150, splash: 14, rate: 0.2, speed: 280, ttl: 8, ammo: 2, refill: 40, refillDelay: 4, range: 1500, lockCone: 0.07, lockTime: 2.5, turnRate: 1.4, turret: true },
  aim47: { id: "aim47", name: "Long-Range Interceptor", kind: "missile_scanner", damage: 160, splash: 16, rate: 0.2, speed: 450, ttl: 22, ammo: 3, refill: 50, refillDelay: 5, range: 8000, lockCone: 0.08, lockTime: 3, turnRate: 1.3, turret: true },
  bomb: { id: "bomb", name: "Bomb", kind: "bomb", damage: 900, splash: 45, rate: 0.6, speed: 0, ttl: 40, ammo: 8, refill: 60, refillDelay: 6, turret: true },
  radarpulse: { id: "radarpulse", name: "Radar Pulse", kind: "pulse", damage: 0, splash: 4000, rate: 1 / 20, speed: 0, ttl: 8, ammo: -1, refill: 0, refillDelay: 0, turret: true }
};
var STEALTH_AA_CEILING = 600;
var STEALTH_LOCK_TIME = 4;
var STEALTH_LOCK_SPOT = 8;
var ORIGINAL_VEHICLES = {
  fighter: {
    kind: "fighter",
    name: "F/A-18F Super Hornet",
    model: "models/fa18.glb",
    flight: "jet",
    maxHp: 450,
    radius: 8,
    cruise: 135,
    boost: 185,
    stall: 55,
    seatWeapons: [["cannon20", "aim9"], ["tvmissile", null]],
    flares: 12,
    seatNames: ["Pilot", "Weapons Officer"]
  },
  apache: {
    kind: "apache",
    name: "AH-64 Apache",
    model: "models/apache.glb",
    flight: "heli",
    maxHp: 550,
    radius: 7.5,
    cruise: 75,
    boost: 98,
    stall: 0,
    seatWeapons: [["rockets", null], ["chaingun30", "hellfire"]],
    flares: 10,
    seatNames: ["Pilot", "Gunner"]
  },
  warthog: {
    kind: "warthog",
    name: "A-10 Warthog",
    model: "models/a10.glb",
    flight: "jet",
    maxHp: 850,
    radius: 8.5,
    cruise: 105,
    boost: 135,
    stall: 45,
    seatWeapons: [["gau8", "rockets"], ["maverick", null]],
    flares: 16,
    seatNames: ["Pilot", "Weapons Officer"]
  },
  blackbird: {
    kind: "blackbird",
    name: "YF-12 Blackbird",
    model: "models/yf12.glb",
    flight: "jet",
    maxHp: 380,
    radius: 12,
    cruise: 190,
    boost: 260,
    stall: 75,
    seatWeapons: [[null, null], ["aim47", "radarpulse"]],
    flares: 8,
    seatNames: ["Pilot", "Radar Officer"]
  },
  bomber: {
    kind: "bomber",
    name: "B-2 Spirit",
    model: "models/b2.glb",
    flight: "jet",
    maxHp: 900,
    radius: 18,
    cruise: 150,
    boost: 180,
    stall: 70,
    seatWeapons: [["bomb", null], ["bomb", null]],
    flares: 10,
    seatNames: ["Pilot", "Bombardier"],
    stealth: true
  }
};
var VEHICLES = {
  ...ORIGINAL_VEHICLES,
  "astra-interceptor": {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "astra-interceptor",
    name: "Astra Interceptor",
    model: "models/astra-interceptor.glb",
    cruise: 145.8,
    boost: 199.8
  },
  "astra-trainer": {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "astra-trainer",
    name: "Astra Trainer",
    model: "models/astra-trainer.glb",
    cruise: 121.5,
    boost: 166.5
  }
};
var VEHICLE_KINDS = Object.keys(VEHICLES);

// src/render/camera.ts
var COCKPIT = {
  fighter: [0, 1.6, -5.2],
  apache: [0, 2.5, -1.2],
  warthog: [0, 1.7, -4.4],
  blackbird: [0, 1.6, -9],
  bomber: [0, 2.2, -9],
  "astra-interceptor": [0, 1.35, -3],
  "astra-trainer": [0, 1.35, -0.65]
};
var GUNNER = {
  fighter: [0, -1.4, -3],
  apache: [0, -1.3, -4.2],
  warthog: [0, -1.5, -2],
  blackbird: [0, -2.4, -15],
  bomber: [0, -3, -4],
  "astra-interceptor": [0, -1.4, -3],
  "astra-trainer": [0, -1.4, -0.65]
};
var GUNNER_LEAD = { fighter: 9, apache: 2.5, warthog: 8, blackbird: 4, bomber: 3, "astra-interceptor": 9, "astra-trainer": 6 };
var GUNNER_DROP = { fighter: 1.5, apache: 0.6, warthog: 1.5, blackbird: 1.5, bomber: 2, "astra-interceptor": 1.5, "astra-trainer": 1.5 };
var BOMBSIGHT_MIN_ZOOM = 2;
var BOMBSIGHT_MAX_ZOOM = 8;
var GROUND_CLEARANCE = 1.5;
var CHASE = {
  fighter: { dist: 26, height: 6 },
  apache: { dist: 24, height: 7 },
  warthog: { dist: 28, height: 7 },
  blackbird: { dist: 40, height: 9 },
  bomber: { dist: 60, height: 13 },
  "astra-interceptor": { dist: 26, height: 6 },
  "astra-trainer": { dist: 22, height: 6 }
};
var COCKPIT_PITCH = {
  "astra-interceptor": 0.02,
  "astra-trainer": 0.035
};
var UP = new Vector3(0, 1, 0);
var _m2 = new Matrix4;
var _v = new Vector3;
var _v2 = new Vector3;
var _q = new Quaternion;
var _q2 = new Quaternion;
var _qy = new Quaternion;
var _qp = new Quaternion;
var _x2 = new Vector3;
var _up = new Vector3;
var BOOST_FOV = 6;
function boostFov(kind, speed) {
  const v = VEHICLES[kind];
  if (v.flight !== "jet")
    return 0;
  return BOOST_FOV * MathUtils.smoothstep(speed, v.cruise * 1.02, v.cruise + (v.boost - v.cruise) * 0.4);
}
var BOMBCAM_DIST = 35;
var BOMBCAM_HEIGHT = 10;
var BOMBCAM_DOWN = 0.8;
var BOMBCAM_LAG = 0.12;
var BOMBCAM_MAX_ZOOM = 4;
function cursorGroundAim(eye, fwd, up, cx, cy, bombPos, groundAt, out) {
  const rx = fwd[1] * up[2] - fwd[2] * up[1], ry = fwd[2] * up[0] - fwd[0] * up[2], rz = fwd[0] * up[1] - fwd[1] * up[0];
  const tx = Math.tan(cx), ty = Math.tan(cy);
  let dx = fwd[0] + rx * tx + up[0] * ty, dy = fwd[1] + ry * tx + up[1] * ty, dz = fwd[2] + rz * tx + up[2] * ty;
  const n = Math.hypot(dx, dy, dz);
  dx /= n;
  dy /= n;
  dz /= n;
  if (dy > -0.001) {
    out[0] = dx;
    out[1] = dy;
    out[2] = dz;
    return false;
  }
  let g = groundAt(bombPos[0], bombPos[2]), px = 0, py = 0, pz = 0;
  for (let i = 0;i < 2; i++) {
    const t = (eye[1] - g) / -dy;
    px = eye[0] + dx * t;
    py = g;
    pz = eye[2] + dz * t;
    g = groundAt(px, pz);
  }
  const ax = px - bombPos[0], ay = py - bombPos[1], az = pz - bombPos[2], an = Math.hypot(ax, ay, az) || 1;
  out[0] = ax / an;
  out[1] = ay / an;
  out[2] = az / an;
  return true;
}
var CHASE_LOOK_LAG = 0.06;
var HELI_PITCH_FOLLOW = 0.7;
var HELI_ROLL_FOLLOW = 0.3;
function horizonFollow(q, out) {
  const f = _hf.set(0, 0, -1).applyQuaternion(q);
  const r = _hr.set(1, 0, 0).applyQuaternion(q);
  const u = _hu.set(0, 1, 0).applyQuaternion(q);
  const yaw = Math.atan2(-f.x, -f.z);
  const pitch = Math.asin(MathUtils.clamp(f.y, -1, 1));
  const bank = Math.atan2(-r.y, u.y);
  const t = MathUtils.smoothstep(Math.abs(bank), Math.PI / 3, Math.PI * 0.85);
  const rollK = HELI_ROLL_FOLLOW + (1 - HELI_ROLL_FOLLOW) * t;
  const pitchK = HELI_PITCH_FOLLOW + (1 - HELI_PITCH_FOLLOW) * t;
  _hq.setFromAxisAngle(UP, yaw);
  out.copy(_hq).multiply(_hq2.setFromAxisAngle(_hr.set(1, 0, 0), pitch * pitchK)).multiply(_hq2.setFromAxisAngle(_hu.set(0, 0, 1), -bank * rollK));
  return out;
}
var _hf = new Vector3;
var _hr = new Vector3;
var _hu = new Vector3;
var _hq = new Quaternion;
var _hq2 = new Quaternion;

class CameraRig {
  camera;
  mode = "menu";
  zoom = 1;
  gunZoom = 1;
  baseFov = 62;
  blend = 1;
  fromPos = new Vector3;
  fromQuat = new Quaternion;
  pos = new Vector3;
  quat = new Quaternion;
  fov = 62;
  time = 0;
  shakeAmt = 0;
  orbitAngle = 0;
  followQ = new Quaternion;
  followInit = false;
  chaseLook = new Vector3(0, 0, -1);
  chaseLookInit = false;
  bombLook = new Vector3(0, -1, 0);
  bombHeading = new Vector3(0, 0, -1);
  bombInit = false;
  bombEye = new Vector3;
  bombFwd = new Vector3(0, -1, 0);
  bombUp = new Vector3(0, 0, -1);
  constructor(camera) {
    this.camera = camera;
    this.pos.copy(camera.position);
    this.quat.copy(camera.quaternion);
  }
  setMode(mode) {
    if (mode === this.mode)
      return;
    this.mode = mode;
    this.fromPos.copy(this.camera.position);
    this.fromQuat.copy(this.camera.quaternion);
    this.blend = 0;
  }
  shake(amount) {
    this.shakeAmt = Math.min(2, this.shakeAmt + amount);
  }
  orbit(dt, center, radius, height, speed) {
    this.orbitAngle += dt * speed;
    const a = this.orbitAngle;
    this.pos.set(center[0] + Math.cos(a) * radius, center[1] + height, center[2] + Math.sin(a) * radius);
    _v.set(center[0], center[1] + height * 0.15, center[2]);
    this.lookAt(this.pos, _v, UP);
    this.fov = this.baseFov;
  }
  chase(dt, kind, position, velocity, look, groundAt) {
    const c = CHASE[kind];
    const speed = Math.hypot(velocity[0], velocity[1], velocity[2]);
    const dist = c.dist * this.zoom * (1 + Math.min(speed, 260) / 900);
    const height = c.height * this.zoom;
    if (!this.chaseLookInit || this.chaseLook.dot(look) < 0.2) {
      this.chaseLook.copy(look);
      this.chaseLookInit = true;
    } else
      this.chaseLook.lerp(look, 1 - Math.exp(-dt / CHASE_LOOK_LAG)).normalize();
    const lk = this.chaseLook;
    this.pos.set(position[0], position[1], position[2]).addScaledVector(lk, -dist).addScaledVector(UP, height);
    const floor = groundAt(this.pos.x, this.pos.z) + 3;
    if (this.pos.y < floor)
      this.pos.y = floor;
    _v.set(position[0], position[1], position[2]).addScaledVector(lk, 400).addScaledVector(UP, height * 0.6);
    this.lookAt(this.pos, _v, UP);
    this.fov = this.baseFov + Math.min(14, Math.max(0, speed - 80) * 0.06) + boostFov(kind, speed);
  }
  chaseBody(dt, kind, position, velocity, orientation, lookYaw, lookPitch, groundAt) {
    const c = CHASE[kind];
    _q.set(orientation[0], orientation[1], orientation[2], orientation[3]);
    const heli = kind === "apache";
    if (heli)
      horizonFollow(_q, _q);
    if (!this.followInit) {
      this.followQ.copy(_q);
      this.followInit = true;
    }
    this.followQ.slerp(_q, 1 - Math.exp(-dt * (heli ? 5 : 7)));
    _q2.copy(this.followQ);
    if (lookYaw || lookPitch) {
      _q2.multiply(_qy.setFromAxisAngle(UP, lookYaw)).multiply(_qp.setFromAxisAngle(_x2.set(1, 0, 0), lookPitch));
    }
    const speed = Math.hypot(velocity[0], velocity[1], velocity[2]);
    const dist = c.dist * this.zoom * (1 + Math.min(speed, 260) / 900);
    const height = c.height * this.zoom;
    _v.set(position[0], position[1], position[2]);
    this.pos.set(0, height, dist).applyQuaternion(_q2).add(_v);
    const floor = groundAt(this.pos.x, this.pos.z) + 3;
    if (this.pos.y < floor)
      this.pos.y = floor;
    _v2.set(0, height * 0.55, -80).applyQuaternion(_q2).add(_v);
    _up.set(0, 1, 0).applyQuaternion(_q2);
    this.lookAt(this.pos, _v2, _up);
    this.fov = this.baseFov + Math.min(14, Math.max(0, speed - 80) * 0.06) + boostFov(kind, speed);
  }
  cockpitBody(dt, kind, position, orientation, lookYaw, lookPitch) {
    _q.set(orientation[0], orientation[1], orientation[2], orientation[3]);
    const o = COCKPIT[kind];
    this.pos.set(o[0], o[1], o[2]).applyQuaternion(_q).add(_v.set(position[0], position[1], position[2]));
    _q2.copy(_q).multiply(_qy.setFromAxisAngle(UP, lookYaw)).multiply(_qp.setFromAxisAngle(_x2.set(1, 0, 0), lookPitch + (COCKPIT_PITCH[kind] ?? 0)));
    this.quat.copy(_q2);
    this.fov = this.baseFov + 6;
  }
  resetFollow() {
    this.followInit = false;
    this.chaseLookInit = false;
  }
  cockpit(dt, kind, position, orientation, look) {
    _q.set(orientation[0], orientation[1], orientation[2], orientation[3]);
    const o = COCKPIT[kind];
    this.pos.set(o[0], o[1], o[2]).applyQuaternion(_q).add(_v.set(position[0], position[1], position[2]));
    _v2.set(0, 1, 0).applyQuaternion(_q).lerp(UP, 0.35).normalize();
    _v.copy(this.pos).add(look);
    this.lookAt(this.pos, _v, _v2);
    this.quat.multiply(_qp.setFromAxisAngle(_x2.set(1, 0, 0), COCKPIT_PITCH[kind] ?? 0));
    this.fov = this.baseFov + 6;
  }
  bombsight(dt, kind, position, orientation, look, zoom) {
    _q.set(orientation[0], orientation[1], orientation[2], orientation[3]);
    const o = GUNNER[kind];
    this.pos.set(o[0], o[1], o[2]).applyQuaternion(_q).add(_v.set(position[0], position[1], position[2]));
    this.pos.y -= GUNNER_DROP[kind];
    _v2.set(0, 0, -1).applyQuaternion(_q);
    _v2.y = 0;
    if (_v2.lengthSq() < 0.000001)
      _v2.set(0, 0, -1);
    _v2.normalize();
    _v.copy(this.pos).add(look);
    this.lookAt(this.pos, _v, _v2);
    this.fov = 60 / Math.max(BOMBSIGHT_MIN_ZOOM, Math.min(BOMBSIGHT_MAX_ZOOM, zoom));
  }
  bombcam(dt, bombPos, bombVel, zoom = 1) {
    _v.set(bombVel[0], bombVel[1], bombVel[2]);
    if (_v.lengthSq() < 0.000001)
      _v.set(0, -1, 0);
    _v.normalize();
    _v.y -= BOMBCAM_DOWN;
    _v.normalize();
    if (!this.bombInit) {
      this.bombLook.copy(_v);
      this.bombInit = true;
    } else
      this.bombLook.lerp(_v, 1 - Math.exp(-dt / BOMBCAM_LAG)).normalize();
    _v2.set(bombVel[0], 0, bombVel[2]);
    if (_v2.lengthSq() > 0.0001)
      this.bombHeading.copy(_v2.normalize());
    this.pos.set(bombPos[0], bombPos[1], bombPos[2]).addScaledVector(this.bombLook, -BOMBCAM_DIST);
    this.pos.y += BOMBCAM_HEIGHT;
    const floor = groundHeight(this.pos.x, this.pos.z) + GROUND_CLEARANCE;
    if (this.pos.y < floor)
      this.pos.y = floor;
    _v.set(bombPos[0], bombPos[1], bombPos[2]).addScaledVector(this.bombLook, 200);
    this.lookAt(this.pos, _v, this.bombHeading);
    this.bombEye.copy(this.pos);
    this.bombFwd.set(0, 0, -1).applyQuaternion(this.quat);
    this.bombUp.set(0, 1, 0).applyQuaternion(this.quat);
    this.fov = 55 / Math.max(1, Math.min(BOMBCAM_MAX_ZOOM, zoom));
  }
  bombcamAim(cursorX, cursorY, bombPos, out) {
    const e = this.bombEye, f = this.bombFwd, u = this.bombUp;
    return cursorGroundAim([e.x, e.y, e.z], [f.x, f.y, f.z], [u.x, u.y, u.z], cursorX, cursorY, bombPos, groundHeight, out);
  }
  resetBombcam() {
    this.bombInit = false;
  }
  gunner(dt, kind, position, orientation, look, anchor = null) {
    _q.set(orientation[0], orientation[1], orientation[2], orientation[3]);
    if (anchor)
      this.pos.copy(anchor);
    else {
      const o = GUNNER[kind];
      this.pos.set(o[0], o[1], o[2]).applyQuaternion(_q).add(_v.set(position[0], position[1], position[2]));
    }
    this.pos.addScaledVector(look, GUNNER_LEAD[kind]);
    this.pos.y -= GUNNER_DROP[kind];
    const floor = groundHeight(this.pos.x, this.pos.z) + GROUND_CLEARANCE;
    if (this.pos.y < floor)
      this.pos.y = floor;
    _v.copy(this.pos).add(look);
    this.lookAt(this.pos, _v, UP);
    this.fov = 60 / this.gunZoom;
  }
  death(dt, center, t, groundAt) {
    const r = 110 + t * 25;
    const a = t * 0.35 + 0.6;
    this.pos.set(center[0] + Math.cos(a) * r, center[1] + 45 + t * 14, center[2] + Math.sin(a) * r);
    if (groundAt)
      this.pos.y = Math.max(this.pos.y, groundAt(this.pos.x, this.pos.z) + 25, groundAt(center[0], center[2]) + 30);
    _v.set(center[0], center[1], center[2]);
    this.lookAt(this.pos, _v, UP);
    this.fov = this.baseFov;
  }
  apply(dt) {
    this.time += dt;
    const cam = this.camera;
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / 0.7);
      const e = this.blend * this.blend * (3 - 2 * this.blend);
      cam.position.lerpVectors(this.fromPos, this.pos, e);
      cam.quaternion.slerpQuaternions(this.fromQuat, this.quat, e);
    } else {
      cam.position.copy(this.pos);
      cam.quaternion.copy(this.quat);
    }
    if (this.shakeAmt > 0.001) {
      const s = this.shakeAmt;
      const t = this.time * 40;
      _q2.setFromAxisAngle(_v.set(Math.sin(t * 1.3), Math.cos(t * 1.7), Math.sin(t * 0.7)).normalize(), s * 0.012);
      cam.quaternion.multiply(_q2);
      this.shakeAmt *= Math.exp(-dt * 5);
    }
    const fov = MathUtils.lerp(cam.fov, this.fov, 1 - Math.exp(-dt * 8));
    if (Math.abs(fov - cam.fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }
  lookAt(eye, target, up) {
    _m2.lookAt(eye, target, up);
    this.quat.setFromRotationMatrix(_m2);
  }
}

// ../../../../home/leozhang/.bun/install/cache/three@0.186.0@@@1/build/three.webgpu.js
var _lightsCache = new WeakMap;
var _materialCache = new WeakMap;
var _geometryCache = new WeakMap;
var _textureCache = new WeakMap;
var IGNORED_FILES = [
  /^StackTrace\.js$/,
  /^TSLCore\.js$/,
  /^.*Node\.js$/,
  /^three\.webgpu.*\.js$/
];
function getFilteredStack(stack) {
  const regex = /(?:at\s+(.+?)\s+\()?(?:(.+?)@)?([^@\s()]+):(\d+):(\d+)/;
  return stack.split(`
`).map((line) => {
    const match = line.match(regex);
    if (!match)
      return null;
    const fn = match[1] || match[2] || "";
    const file = match[3].split("?")[0];
    const lineNum = parseInt(match[4], 10);
    const column = parseInt(match[5], 10);
    const fileName = file.split("/").pop();
    return {
      fn,
      file: fileName,
      line: lineNum,
      column
    };
  }).filter((frame) => {
    return frame && !IGNORED_FILES.some((regex) => regex.test(frame.file));
  });
}

class StackTrace {
  constructor(stackMessage = null) {
    this.isStackTrace = true;
    this.stack = getFilteredStack(stackMessage ? stackMessage : new Error().stack);
  }
  getLocation() {
    if (this.stack.length === 0) {
      return "[Unknown location]";
    }
    const mainStack = this.stack[0];
    const fn = mainStack.fn;
    const fnName = fn ? `"${fn}()" at ` : "";
    return `${fnName}"${mainStack.file}:${mainStack.line}"`;
  }
  getError(message) {
    if (this.stack.length === 0) {
      return message;
    }
    const stackString = this.stack.map((frame) => {
      const location = `${frame.file}:${frame.line}:${frame.column}`;
      if (frame.fn) {
        return `    at ${frame.fn} (${location})`;
      }
      return `    at ${location}`;
    }).join(`
`);
    return `${message}
${stackString}`;
  }
}
function cyrb53(value, seed = 0) {
  let h1 = 3735928559 ^ seed, h2 = 1103547991 ^ seed;
  if (Array.isArray(value)) {
    for (let i = 0, val;i < value.length; i++) {
      val = value[i];
      h1 = Math.imul(h1 ^ val, 2654435761);
      h2 = Math.imul(h2 ^ val, 1597334677);
    }
  } else {
    for (let i = 0, ch;i < value.length; i++) {
      ch = value.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
  }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507);
  h1 ^= Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507);
  h2 ^= Math.imul(h1 ^ h1 >>> 13, 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
var hashString = (str) => cyrb53(str);
var hashArray = (array) => cyrb53(array);
var hash$1 = (...params) => cyrb53(params);
var typeFromLength = /* @__PURE__ */ new Map([
  [1, "float"],
  [2, "vec2"],
  [3, "vec3"],
  [4, "vec4"],
  [9, "mat3"],
  [16, "mat4"]
]);
function getTypeFromLength(length) {
  return typeFromLength.get(length);
}
function getValueType(value) {
  if (value === undefined || value === null)
    return null;
  const typeOf = typeof value;
  if (value.isNode === true) {
    return "node";
  } else if (typeOf === "number") {
    return "float";
  } else if (typeOf === "boolean") {
    return "bool";
  } else if (typeOf === "string") {
    return "string";
  } else if (typeOf === "function") {
    return "shader";
  } else if (value.isVector2 === true) {
    return "vec2";
  } else if (value.isVector3 === true) {
    return "vec3";
  } else if (value.isVector4 === true) {
    return "vec4";
  } else if (value.isMatrix2 === true) {
    return "mat2";
  } else if (value.isMatrix3 === true) {
    return "mat3";
  } else if (value.isMatrix4 === true) {
    return "mat4";
  } else if (value.isColor === true) {
    return "color";
  } else if (value instanceof ArrayBuffer) {
    return "ArrayBuffer";
  }
  return null;
}
function getTextureType(texture) {
  if (texture.isDepthTexture === true) {
    return "float";
  }
  const format = texture.format;
  let length;
  if (format === RedFormat || format === RedIntegerFormat || format === DepthFormat || format === DepthStencilFormat || format === AlphaFormat) {
    length = 1;
  } else if (format === RGFormat || format === RGIntegerFormat) {
    length = 2;
  } else if (format === RGBFormat || format === RGBIntegerFormat) {
    length = 3;
  } else {
    length = 4;
  }
  let componentType;
  if (texture.type === UnsignedIntType) {
    componentType = "uint";
  } else if (texture.type === IntType) {
    componentType = "int";
  } else {
    componentType = "float";
  }
  if (length === 1)
    return componentType;
  let baseType = getTypeFromLength(length);
  if (componentType !== "float") {
    baseType = componentType[0] + baseType;
  }
  return baseType;
}
function getValueFromType(type, ...params) {
  const last4 = type ? type.slice(-4) : undefined;
  if (params.length === 1) {
    if (last4 === "vec2")
      params = [params[0], params[0]];
    else if (last4 === "vec3")
      params = [params[0], params[0], params[0]];
    else if (last4 === "vec4")
      params = [params[0], params[0], params[0], params[0]];
  }
  if (type === "color") {
    return new Color(...params);
  } else if (last4 === "vec2") {
    return new Vector2(...params);
  } else if (last4 === "vec3") {
    return new Vector3(...params);
  } else if (last4 === "vec4") {
    return new Vector4(...params);
  } else if (last4 === "mat2") {
    return new Matrix2(...params);
  } else if (last4 === "mat3") {
    return new Matrix3(...params);
  } else if (last4 === "mat4") {
    return new Matrix4(...params);
  } else if (type === "bool") {
    return params[0] || false;
  } else if (type === "float" || type === "int" || type === "uint") {
    return params[0] || 0;
  } else if (type === "string") {
    return params[0] || "";
  } else if (type === "ArrayBuffer") {
    return base64ToArrayBuffer(params[0]);
  }
  return null;
}
function arrayBufferToBase64(arrayBuffer) {
  let chars = "";
  const array = new Uint8Array(arrayBuffer);
  for (let i = 0;i < array.length; i++) {
    chars += String.fromCharCode(array[i]);
  }
  return btoa(chars);
}
function base64ToArrayBuffer(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
}
function isArrayAsParameter(params) {
  return params[0] !== undefined && params[0] !== null && (params[0].isNode || Object.getPrototypeOf(params[0]) !== Object.prototype);
}
var NodeShaderStage = {
  VERTEX: "vertex",
  FRAGMENT: "fragment"
};
var NodeUpdateType = {
  NONE: "none",
  FRAME: "frame",
  RENDER: "render",
  OBJECT: "object"
};
var NodeAccess = {
  READ_ONLY: "readOnly",
  WRITE_ONLY: "writeOnly",
  READ_WRITE: "readWrite"
};
var defaultShaderStages = ["fragment", "vertex"];
var shaderStages = [...defaultShaderStages, "compute"];
var vectorComponents = ["x", "y", "z", "w"];
var _parentBuildStage = {
  analyze: "setup",
  generate: "analyze"
};
var _nodeId = 0;

class Node extends EventDispatcher {
  static get type() {
    return "Node";
  }
  constructor(nodeType = null) {
    super();
    this.nodeType = nodeType;
    this.updateType = NodeUpdateType.NONE;
    this.updateBeforeType = NodeUpdateType.NONE;
    this.updateAfterType = NodeUpdateType.NONE;
    this.version = 0;
    this.name = "";
    this.global = false;
    this.parents = false;
    this.isNode = true;
    this._beforeNodes = null;
    this._cacheKey = null;
    this._uuid = null;
    this._cacheKeyVersion = 0;
    this.id = _nodeId++;
    this.stackTrace = null;
    if (Node.captureStackTrace === true) {
      this.stackTrace = new StackTrace;
    }
  }
  set needsUpdate(value) {
    if (value === true) {
      this.version++;
    }
  }
  get uuid() {
    if (this._uuid === null) {
      this._uuid = MathUtils.generateUUID();
    }
    return this._uuid;
  }
  get type() {
    return this.constructor.type;
  }
  onUpdate(callback, updateType) {
    this.updateType = updateType;
    this.update = callback.bind(this);
    return this;
  }
  onFrameUpdate(callback) {
    return this.onUpdate(callback, NodeUpdateType.FRAME);
  }
  onRenderUpdate(callback) {
    return this.onUpdate(callback, NodeUpdateType.RENDER);
  }
  onObjectUpdate(callback) {
    return this.onUpdate(callback, NodeUpdateType.OBJECT);
  }
  onReference(callback) {
    this.updateReference = callback.bind(this);
    return this;
  }
  updateReference() {
    return this;
  }
  isGlobal() {
    return this.global;
  }
  *getChildren() {
    for (const { childNode } of this._getChildren()) {
      yield childNode;
    }
  }
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
  traverse(callback) {
    callback(this);
    for (const childNode of this.getChildren()) {
      childNode.traverse(callback);
    }
  }
  _getChildren(ignores = new Set) {
    const children = [];
    ignores.add(this);
    for (const property of Object.getOwnPropertyNames(this)) {
      const object = this[property];
      if (property.startsWith("_") === true || ignores.has(object))
        continue;
      if (Array.isArray(object) === true) {
        for (let i = 0;i < object.length; i++) {
          const child = object[i];
          if (child && child.isNode === true) {
            children.push({ property, index: i, childNode: child });
          }
        }
      } else if (object && object.isNode === true) {
        children.push({ property, childNode: object });
      } else if (object && Object.getPrototypeOf(object) === Object.prototype) {
        for (const subProperty in object) {
          if (subProperty.startsWith("_") === true)
            continue;
          const child = object[subProperty];
          if (child && child.isNode === true) {
            children.push({ property, index: subProperty, childNode: child });
          }
        }
      }
    }
    return children;
  }
  getCacheKey(force = false, ignores = null) {
    force = force || this.version !== this._cacheKeyVersion;
    if (force === true || this._cacheKey === null) {
      if (ignores === null)
        ignores = new Set;
      const values = [];
      for (const { property, childNode } of this._getChildren(ignores)) {
        values.push(hashString(property.slice(0, -4)), childNode.getCacheKey(force, ignores));
      }
      this._cacheKey = hash$1(hashArray(values), this.customCacheKey());
      this._cacheKeyVersion = this.version;
    }
    return this._cacheKey;
  }
  customCacheKey() {
    return this.id;
  }
  getScope() {
    return this;
  }
  getHash() {
    return String(this.id);
  }
  getUpdateType() {
    return this.updateType;
  }
  getUpdateBeforeType() {
    return this.updateBeforeType;
  }
  getUpdateAfterType() {
    return this.updateAfterType;
  }
  getElementType(builder) {
    const type = this.getNodeType(builder);
    const elementType = builder.getElementType(type);
    return elementType;
  }
  getMemberType() {
    return "void";
  }
  getNodeType(builder, output = null) {
    const nodeData = builder.getDataFromNode(this);
    let type;
    if (output !== null) {
      nodeData.typeFromOutput = nodeData.typeFromOutput || {};
      type = nodeData.typeFromOutput[output];
      if (type === undefined) {
        type = this.generateNodeType(builder, output);
        nodeData.typeFromOutput[output] = type;
      }
    } else {
      type = nodeData.type;
      if (type === undefined) {
        type = this.generateNodeType(builder);
        nodeData.type = type;
      }
    }
    return type;
  }
  generateNodeType(builder, output = null) {
    const nodeProperties = builder.getNodeProperties(this);
    if (nodeProperties.outputNode) {
      return nodeProperties.outputNode.getNodeType(builder, output);
    }
    return this.nodeType;
  }
  getShared(builder) {
    const hash = this.getHash(builder);
    const nodeFromHash = builder.getNodeFromHash(hash);
    let sharedNode = null;
    if (nodeFromHash && nodeFromHash !== this) {
      sharedNode = nodeFromHash;
    } else if (builder.context.overrideNodes) {
      const callback = builder.context.overrideNodes.get(this);
      if (callback) {
        const nodeData = builder.getDataFromNode(this);
        if (nodeData.isOverwritten !== true) {
          nodeData.isOverwritten = true;
          sharedNode = callback(builder).overrideNode(this, null);
          nodeData.sharedNode = sharedNode;
        } else {
          sharedNode = nodeData.sharedNode;
        }
      }
    }
    return sharedNode || this;
  }
  getArrayCount() {
    return null;
  }
  setup(builder) {
    const nodeProperties = builder.getNodeProperties(this);
    let index = 0;
    for (const childNode of this.getChildren()) {
      nodeProperties["node" + index++] = childNode;
    }
    return nodeProperties.outputNode || null;
  }
  analyze(builder, output = null) {
    const usageCount = builder.increaseUsage(this);
    if (this.parents === true) {
      const nodeData = builder.getDataFromNode(this, "any");
      nodeData.stages = nodeData.stages || {};
      nodeData.stages[builder.shaderStage] = nodeData.stages[builder.shaderStage] || [];
      nodeData.stages[builder.shaderStage].push(output);
    }
    if (usageCount === 1) {
      const nodeProperties = builder.getNodeProperties(this);
      for (const childNode of Object.values(nodeProperties)) {
        if (childNode && childNode.isNode === true) {
          childNode.build(builder, this);
        }
      }
    }
  }
  generate(builder, output) {
    const { outputNode } = builder.getNodeProperties(this);
    if (outputNode && outputNode.isNode === true) {
      return outputNode.build(builder, output);
    }
  }
  updateBefore() {
    warn("Abstract function.");
  }
  updateAfter() {
    warn("Abstract function.");
  }
  update() {
    warn("Abstract function.");
  }
  before(node) {
    if (this._beforeNodes === null)
      this._beforeNodes = [];
    this._beforeNodes.push(node);
    return this;
  }
  build(builder, output = null) {
    const refNode = this.getShared(builder);
    if (this !== refNode) {
      return refNode.build(builder, output);
    }
    if (this._beforeNodes !== null) {
      const currentBeforeNodes = this._beforeNodes;
      this._beforeNodes = null;
      for (const beforeNode of currentBeforeNodes) {
        beforeNode.build(builder, output);
      }
      this._beforeNodes = currentBeforeNodes;
    }
    const nodeData = builder.getDataFromNode(this);
    nodeData.buildStages = nodeData.buildStages || {};
    nodeData.buildStages[builder.buildStage] = true;
    const parentBuildStage = _parentBuildStage[builder.buildStage];
    if (parentBuildStage && nodeData.buildStages[parentBuildStage] !== true) {
      const previousBuildStage = builder.getBuildStage();
      builder.setBuildStage(parentBuildStage);
      this.build(builder);
      builder.setBuildStage(previousBuildStage);
    }
    builder.addChain(this);
    let result = null;
    const buildStage = builder.getBuildStage();
    if (buildStage === "setup") {
      builder.addNode(this);
      this.updateReference(builder);
      const properties = builder.getNodeProperties(this);
      if (properties.initialized !== true) {
        properties.initialized = true;
        properties.outputNode = this.setup(builder) || properties.outputNode || null;
        for (const childNode of Object.values(properties)) {
          if (childNode && childNode.isNode === true) {
            if (childNode.parents === true) {
              const childProperties = builder.getNodeProperties(childNode);
              childProperties.parents = childProperties.parents || [];
              childProperties.parents.push(this);
            }
            childNode.build(builder);
          }
        }
        builder.addSequentialNode(this);
      }
      result = properties.outputNode;
    } else if (buildStage === "analyze") {
      this.analyze(builder, output);
    } else if (buildStage === "generate") {
      const isGenerateOnce = this.generate.length < 2;
      if (isGenerateOnce) {
        const type = this.getNodeType(builder);
        const nodeData = builder.getDataFromNode(this);
        result = nodeData.snippet;
        if (result === undefined) {
          if (nodeData.generated === undefined) {
            nodeData.generated = true;
            result = this.generate(builder) || "";
            nodeData.snippet = result;
          } else {
            warn("Node: Recursion detected.", this);
            result = "/* Recursion detected. */";
          }
        } else if (nodeData.flowCodes !== undefined && builder.context.nodeBlock !== undefined) {
          builder.addFlowCodeHierarchy(this, builder.context.nodeBlock);
        }
        result = builder.format(result, type, output);
      } else {
        result = this.generate(builder, output) || "";
      }
      if (result === "" && output !== null && output !== "void" && output !== "OutputType") {
        error(`TSL: Invalid generated code, expected a "${output}".`);
        result = builder.generateConst(output);
      }
    }
    builder.removeChain(this);
    return result;
  }
  getSerializeChildren() {
    return this._getChildren();
  }
  serialize(json) {
    const nodeChildren = this.getSerializeChildren();
    const inputNodes = {};
    for (const { property, index, childNode } of nodeChildren) {
      if (index !== undefined) {
        if (inputNodes[property] === undefined) {
          inputNodes[property] = Number.isInteger(index) ? [] : {};
        }
        inputNodes[property][index] = childNode.toJSON(json.meta).uuid;
      } else {
        inputNodes[property] = childNode.toJSON(json.meta).uuid;
      }
    }
    if (Object.keys(inputNodes).length > 0) {
      json.inputNodes = inputNodes;
    }
  }
  deserialize(json) {
    if (json.inputNodes !== undefined) {
      const nodes = json.meta.nodes;
      for (const property in json.inputNodes) {
        if (Array.isArray(json.inputNodes[property])) {
          const inputArray = [];
          for (const uuid of json.inputNodes[property]) {
            inputArray.push(nodes[uuid]);
          }
          this[property] = inputArray;
        } else if (typeof json.inputNodes[property] === "object") {
          const inputObject = {};
          for (const subProperty in json.inputNodes[property]) {
            const uuid = json.inputNodes[property][subProperty];
            inputObject[subProperty] = nodes[uuid];
          }
          this[property] = inputObject;
        } else {
          const uuid = json.inputNodes[property];
          this[property] = nodes[uuid];
        }
      }
    }
  }
  toJSON(meta) {
    const { uuid, type } = this;
    const isRoot = meta === undefined || typeof meta === "string";
    if (isRoot) {
      meta = {
        textures: {},
        images: {},
        nodes: {}
      };
    }
    let data = meta.nodes[uuid];
    if (data === undefined) {
      data = {
        uuid,
        type,
        meta,
        metadata: {
          version: 4.7,
          type: "Node",
          generator: "Node.toJSON"
        }
      };
      if (isRoot !== true)
        meta.nodes[data.uuid] = data;
      this.serialize(data);
      delete data.meta;
    }
    function extractFromCache(cache) {
      const values = [];
      for (const key in cache) {
        const data = cache[key];
        delete data.metadata;
        values.push(data);
      }
      return values;
    }
    if (isRoot) {
      const textures = extractFromCache(meta.textures);
      const images = extractFromCache(meta.images);
      const nodes = extractFromCache(meta.nodes);
      if (textures.length > 0)
        data.textures = textures;
      if (images.length > 0)
        data.images = images;
      if (nodes.length > 0)
        data.nodes = nodes;
    }
    return data;
  }
}
Node.captureStackTrace = false;

class ArrayElementNode extends Node {
  static get type() {
    return "ArrayElementNode";
  }
  constructor(node, indexNode) {
    super();
    this.node = node;
    this.indexNode = indexNode;
    this.isArrayElementNode = true;
  }
  generateNodeType(builder) {
    return this.node.getElementType(builder);
  }
  getMemberType(builder, name) {
    return this.node.getMemberType(builder, name);
  }
  generate(builder) {
    const indexType = this.indexNode.getNodeType(builder);
    const nodeSnippet = this.node.build(builder);
    const indexSnippet = this.indexNode.build(builder, !builder.isVector(indexType) && builder.isInteger(indexType) ? indexType : "uint");
    return `${nodeSnippet}[ ${indexSnippet} ]`;
  }
}

class ConvertNode extends Node {
  static get type() {
    return "ConvertNode";
  }
  constructor(node, convertTo) {
    super();
    this.node = node;
    this.convertTo = convertTo;
  }
  generateNodeType(builder) {
    const requestType = this.node.getNodeType(builder);
    let convertTo = null;
    for (const overloadingType of this.convertTo.split("|")) {
      if (convertTo === null || builder.getTypeLength(requestType) === builder.getTypeLength(overloadingType)) {
        convertTo = overloadingType;
      }
    }
    return convertTo;
  }
  serialize(data) {
    super.serialize(data);
    data.convertTo = this.convertTo;
  }
  deserialize(data) {
    super.deserialize(data);
    this.convertTo = data.convertTo;
  }
  generate(builder, output) {
    const node = this.node;
    const type = this.getNodeType(builder);
    const snippet = node.build(builder, type);
    return builder.format(snippet, type, output);
  }
}

class TempNode extends Node {
  static get type() {
    return "TempNode";
  }
  constructor(nodeType = null) {
    super(nodeType);
    this.isTempNode = true;
  }
  hasDependencies(builder) {
    return builder.getDataFromNode(this).usageCount > 1;
  }
  build(builder, output) {
    const buildStage = builder.getBuildStage();
    if (buildStage === "generate") {
      const type = builder.getVectorType(this.getNodeType(builder, output));
      const nodeData = builder.getDataFromNode(this);
      if (nodeData.propertyName !== undefined) {
        return builder.format(nodeData.propertyName, type, output);
      } else if (type !== "void" && output !== "void" && this.hasDependencies(builder)) {
        const snippet = super.build(builder, type);
        const nodeVar = builder.getVarFromNode(this, null, type);
        const propertyName = builder.getPropertyName(nodeVar);
        builder.addLineFlowCode(`${propertyName} = ${snippet}`, this);
        nodeData.snippet = snippet;
        nodeData.propertyName = propertyName;
        return builder.format(nodeData.propertyName, type, output);
      }
    }
    return super.build(builder, output);
  }
}

class JoinNode extends TempNode {
  static get type() {
    return "JoinNode";
  }
  constructor(nodes = [], nodeType = null) {
    super(nodeType);
    this.nodes = nodes;
  }
  generateNodeType(builder) {
    if (this.nodeType !== null) {
      return builder.getVectorType(this.nodeType);
    }
    return builder.getTypeFromLength(this.nodes.reduce((count, cur) => count + builder.getTypeLength(cur.getNodeType(builder)), 0));
  }
  generate(builder, output) {
    const type = this.getNodeType(builder);
    const maxLength = builder.getTypeLength(type);
    const nodes = this.nodes;
    const primitiveType = builder.getComponentType(type);
    const snippetValues = [];
    let length = 0;
    for (const input of nodes) {
      if (length >= maxLength) {
        error(`TSL: Length of parameters exceeds maximum length of function '${type}()' type.`, this.stackTrace);
        break;
      }
      let inputType = input.getNodeType(builder);
      let inputTypeLength = builder.getTypeLength(inputType);
      let inputSnippet;
      if (length + inputTypeLength > maxLength) {
        error(`TSL: Length of '${type}()' data exceeds maximum length of output type.`, this.stackTrace);
        inputTypeLength = maxLength - length;
        inputType = builder.getTypeFromLength(inputTypeLength);
      }
      length += inputTypeLength;
      inputSnippet = input.build(builder, inputType);
      const inputPrimitiveType = builder.getComponentType(inputType);
      if (inputPrimitiveType !== primitiveType) {
        const targetType = builder.getTypeFromLength(inputTypeLength, primitiveType);
        inputSnippet = builder.format(inputSnippet, inputType, targetType);
      }
      snippetValues.push(inputSnippet);
    }
    const snippet = `${builder.getType(type)}( ${snippetValues.join(", ")} )`;
    return builder.format(snippet, type, output);
  }
}
var _stringVectorComponents = vectorComponents.join("");

class SplitNode extends Node {
  static get type() {
    return "SplitNode";
  }
  constructor(node, components = "x") {
    super();
    this.node = node;
    this.components = components;
    this.isSplitNode = true;
  }
  getVectorLength() {
    let vectorLength = this.components.length;
    for (const c of this.components) {
      vectorLength = Math.max(vectorComponents.indexOf(c) + 1, vectorLength);
    }
    return vectorLength;
  }
  getComponentType(builder) {
    return builder.getComponentType(this.node.getNodeType(builder));
  }
  generateNodeType(builder) {
    return builder.getTypeFromLength(this.components.length, this.getComponentType(builder));
  }
  getScope() {
    return this.node.getScope();
  }
  generate(builder, output) {
    const node = this.node;
    const nodeTypeLength = builder.getTypeLength(node.getNodeType(builder));
    let snippet = null;
    if (nodeTypeLength > 1) {
      let type = null;
      const componentsLength = this.getVectorLength();
      if (componentsLength >= nodeTypeLength) {
        type = builder.getTypeFromLength(this.getVectorLength(), this.getComponentType(builder));
      }
      const nodeSnippet = node.build(builder, type);
      if (this.components.length === nodeTypeLength && this.components === _stringVectorComponents.slice(0, this.components.length)) {
        snippet = builder.format(nodeSnippet, type, output);
      } else {
        snippet = builder.format(`${nodeSnippet}.${this.components}`, this.getNodeType(builder), output);
      }
    } else {
      snippet = node.build(builder, output);
    }
    return snippet;
  }
  serialize(data) {
    super.serialize(data);
    data.components = this.components;
  }
  deserialize(data) {
    super.deserialize(data);
    this.components = data.components;
  }
}

class SetNode extends TempNode {
  static get type() {
    return "SetNode";
  }
  constructor(sourceNode, components, targetNode) {
    super();
    this.sourceNode = sourceNode;
    this.components = components;
    this.targetNode = targetNode;
  }
  generateNodeType(builder) {
    return this.sourceNode.getNodeType(builder);
  }
  generate(builder) {
    const { sourceNode, components, targetNode } = this;
    const sourceType = this.getNodeType(builder);
    const componentType = builder.getComponentType(targetNode.getNodeType(builder));
    const targetType = builder.getTypeFromLength(components.length, componentType);
    const targetSnippet = targetNode.build(builder, targetType);
    const sourceSnippet = sourceNode.build(builder, sourceType);
    const length = builder.getTypeLength(sourceType);
    const snippetValues = [];
    for (let i = 0;i < length; i++) {
      const component = vectorComponents[i];
      if (component === components[0]) {
        snippetValues.push(targetSnippet);
        i += components.length - 1;
      } else {
        snippetValues.push(sourceSnippet + "." + component);
      }
    }
    return `${builder.getType(sourceType)}( ${snippetValues.join(", ")} )`;
  }
}

class FlipNode extends TempNode {
  static get type() {
    return "FlipNode";
  }
  constructor(sourceNode, components) {
    super();
    this.sourceNode = sourceNode;
    this.components = components;
  }
  generateNodeType(builder) {
    return this.sourceNode.getNodeType(builder);
  }
  generate(builder) {
    const { components, sourceNode } = this;
    const sourceType = this.getNodeType(builder);
    const sourceSnippet = sourceNode.build(builder);
    const sourceCache = builder.getVarFromNode(this);
    const sourceProperty = builder.getPropertyName(sourceCache);
    builder.addLineFlowCode(sourceProperty + " = " + sourceSnippet, this);
    const length = builder.getTypeLength(sourceType);
    const snippetValues = [];
    let componentIndex = 0;
    for (let i = 0;i < length; i++) {
      const component = vectorComponents[i];
      if (component === components[componentIndex]) {
        snippetValues.push("1.0 - " + (sourceProperty + "." + component));
        componentIndex++;
      } else {
        snippetValues.push(sourceProperty + "." + component);
      }
    }
    return `${builder.getType(sourceType)}( ${snippetValues.join(", ")} )`;
  }
}

class InputNode extends Node {
  static get type() {
    return "InputNode";
  }
  constructor(value, nodeType = null) {
    super(nodeType);
    this.isInputNode = true;
    this.value = value;
    this.precision = null;
  }
  generateNodeType() {
    if (this.nodeType === null) {
      return getValueType(this.value);
    }
    return this.nodeType;
  }
  getInputType(builder) {
    return this.getNodeType(builder);
  }
  setPrecision(precision) {
    this.precision = precision;
    return this;
  }
  serialize(data) {
    super.serialize(data);
    data.value = this.value;
    if (this.value && this.value.toArray)
      data.value = this.value.toArray();
    data.valueType = getValueType(this.value);
    data.nodeType = this.nodeType;
    if (data.valueType === "ArrayBuffer")
      data.value = arrayBufferToBase64(data.value);
    data.precision = this.precision;
  }
  deserialize(data) {
    super.deserialize(data);
    this.nodeType = data.nodeType;
    this.value = Array.isArray(data.value) ? getValueFromType(data.valueType, ...data.value) : data.value;
    this.precision = data.precision || null;
    if (this.value && this.value.fromArray)
      this.value = this.value.fromArray(data.value);
  }
  generate() {
    warn("Abstract function.");
  }
}
var _regNum = /float|u?int/;

class ConstNode extends InputNode {
  static get type() {
    return "ConstNode";
  }
  constructor(value, nodeType = null) {
    super(value, nodeType);
    this.isConstNode = true;
  }
  generateConst(builder) {
    return builder.generateConst(this.getNodeType(builder), this.value);
  }
  generate(builder, output) {
    const type = this.getNodeType(builder);
    if (_regNum.test(type) && _regNum.test(output)) {
      return builder.generateConst(output, this.value);
    }
    return builder.format(this.generateConst(builder), type, output);
  }
}

class MemberNode extends Node {
  static get type() {
    return "MemberNode";
  }
  constructor(structNode, property) {
    super();
    this.structNode = structNode;
    this.property = property;
    this.isMemberNode = true;
  }
  hasMember(builder) {
    if (this.structNode.isMemberNode) {
      if (this.structNode.hasMember(builder) === false) {
        return false;
      }
    }
    return this.structNode.getMemberType(builder, this.property) !== "void";
  }
  generateNodeType(builder) {
    if (this.hasMember(builder) === false) {
      return "float";
    }
    return this.structNode.getMemberType(builder, this.property);
  }
  getMemberType(builder, name) {
    if (this.hasMember(builder) === false) {
      return "float";
    }
    const type = this.getNodeType(builder);
    const struct = builder.getStructTypeNode(type);
    return struct.getMemberType(builder, name);
  }
  generate(builder) {
    if (this.hasMember(builder) === false) {
      warn(`TSL: Member "${this.property}" does not exist in struct.`, this.stackTrace);
      const type = this.getNodeType(builder);
      return builder.generateConst(type);
    }
    const propertyName = this.structNode.build(builder);
    return propertyName + "." + this.property;
  }
}
var currentStack = null;
var NodeElements = new Map;
function addMethodChaining(name, nodeElement) {
  if (NodeElements.has(name)) {
    warn(`TSL: Redefinition of method chaining '${name}'.`);
    return;
  }
  if (typeof nodeElement !== "function")
    throw new Error(`THREE.TSL: Node element ${name} is not a function`);
  NodeElements.set(name, nodeElement);
  if (name !== "assign") {
    Node.prototype[name] = function(...params) {
      return this.isStackNode ? this.addToStack(nodeElement(...params)) : nodeElement(this, ...params);
    };
    Node.prototype[name + "Assign"] = function(...params) {
      return this.isStackNode ? this.assign(params[0], nodeElement(...params)) : this.assign(nodeElement(this, ...params));
    };
  }
}
var parseSwizzle = (props) => props.replace(/r|s/g, "x").replace(/g|t/g, "y").replace(/b|p/g, "z").replace(/a|q/g, "w");
var parseSwizzleAndSort = (props) => parseSwizzle(props).split("").sort().join("");
Node.prototype.assign = function(...params) {
  if (this.isStackNode !== true) {
    if (currentStack !== null) {
      currentStack.assign(this, ...params);
    } else {
      error("TSL: No stack defined for assign operation. Make sure the assign is inside a Fn().", new StackTrace);
    }
    return this;
  } else {
    const nodeElement = NodeElements.get("assign");
    return this.addToStack(nodeElement(...params));
  }
};
Node.prototype.toVarIntent = function() {
  return this;
};
Node.prototype.get = function(value) {
  return new MemberNode(this, value);
};
var proto = {};
function setProtoSwizzle(property, altA, altB) {
  proto[property] = proto[altA] = proto[altB] = {
    get() {
      this._cache = this._cache || {};
      let split = this._cache[property];
      if (split === undefined) {
        split = new SplitNode(this, property);
        this._cache[property] = split;
      }
      return split;
    },
    set(value) {
      this[property].assign(nodeObject(value));
    }
  };
  const propUpper = property.toUpperCase();
  const altAUpper = altA.toUpperCase();
  const altBUpper = altB.toUpperCase();
  Node.prototype["set" + propUpper] = Node.prototype["set" + altAUpper] = Node.prototype["set" + altBUpper] = function(value) {
    const swizzle = parseSwizzleAndSort(property);
    return new SetNode(this, swizzle, nodeObject(value));
  };
  Node.prototype["flip" + propUpper] = Node.prototype["flip" + altAUpper] = Node.prototype["flip" + altBUpper] = function() {
    const swizzle = parseSwizzleAndSort(property);
    return new FlipNode(this, swizzle);
  };
}
var swizzleA = ["x", "y", "z", "w"];
var swizzleB = ["r", "g", "b", "a"];
var swizzleC = ["s", "t", "p", "q"];
for (let a = 0;a < 4; a++) {
  let prop = swizzleA[a];
  let altA = swizzleB[a];
  let altB = swizzleC[a];
  setProtoSwizzle(prop, altA, altB);
  for (let b = 0;b < 4; b++) {
    prop = swizzleA[a] + swizzleA[b];
    altA = swizzleB[a] + swizzleB[b];
    altB = swizzleC[a] + swizzleC[b];
    setProtoSwizzle(prop, altA, altB);
    for (let c = 0;c < 4; c++) {
      prop = swizzleA[a] + swizzleA[b] + swizzleA[c];
      altA = swizzleB[a] + swizzleB[b] + swizzleB[c];
      altB = swizzleC[a] + swizzleC[b] + swizzleC[c];
      setProtoSwizzle(prop, altA, altB);
      for (let d = 0;d < 4; d++) {
        prop = swizzleA[a] + swizzleA[b] + swizzleA[c] + swizzleA[d];
        altA = swizzleB[a] + swizzleB[b] + swizzleB[c] + swizzleB[d];
        altB = swizzleC[a] + swizzleC[b] + swizzleC[c] + swizzleC[d];
        setProtoSwizzle(prop, altA, altB);
      }
    }
  }
}
for (let i = 0;i < 32; i++) {
  proto[i] = {
    get() {
      this._cache = this._cache || {};
      let element = this._cache[i];
      if (element === undefined) {
        element = new ArrayElementNode(this, new ConstNode(i, "uint"));
        this._cache[i] = element;
      }
      return element;
    },
    set(value) {
      this[i].assign(nodeObject(value));
    }
  };
}
Object.defineProperties(Node.prototype, proto);
var ShaderNodeObject = function(obj, altType = null) {
  const type = getValueType(obj);
  if (type === "node") {
    return obj;
  } else if (altType === null && (type === "float" || type === "boolean") || type && type !== "shader" && type !== "string") {
    return nodeObject(getConstNode(obj, altType));
  } else if (type === "shader") {
    return obj.isFn ? obj : Fn(obj);
  }
  return obj;
};
var ShaderNodeObjects = function(objects, altType = null) {
  for (const name in objects) {
    objects[name] = nodeObject(objects[name], altType);
  }
  return objects;
};
var ShaderNodeArray = function(array, altType = null) {
  const len = array.length;
  for (let i = 0;i < len; i++) {
    array[i] = nodeObject(array[i], altType);
  }
  return array;
};
var ShaderNodeProxy = function(NodeClass, scope = null, factor = null, settings = null) {
  function assignNode(node) {
    if (settings !== null) {
      node = nodeObject(Object.assign(node, settings));
      if (settings.intent === true) {
        node = node.toVarIntent();
      }
    } else {
      node = nodeObject(node);
    }
    return node;
  }
  let fn, name = scope, minParams, maxParams;
  function verifyParamsLimit(params) {
    let tslName;
    if (name)
      tslName = /[a-z]/i.test(name) ? name + "()" : name;
    else
      tslName = NodeClass.type;
    if (minParams !== undefined && params.length < minParams) {
      error(`TSL: "${tslName}" parameter length is less than minimum required.`, new StackTrace);
      return params.concat(new Array(minParams - params.length).fill(0));
    } else if (maxParams !== undefined && params.length > maxParams) {
      error(`TSL: "${tslName}" parameter length exceeds limit.`, new StackTrace);
      return params.slice(0, maxParams);
    }
    return params;
  }
  if (scope === null) {
    fn = (...params) => {
      return assignNode(new NodeClass(...nodeArray(verifyParamsLimit(params))));
    };
  } else if (factor !== null) {
    factor = nodeObject(factor);
    fn = (...params) => {
      return assignNode(new NodeClass(scope, ...nodeArray(verifyParamsLimit(params)), factor));
    };
  } else {
    fn = (...params) => {
      return assignNode(new NodeClass(scope, ...nodeArray(verifyParamsLimit(params))));
    };
  }
  fn.setParameterLength = (...params) => {
    if (params.length === 1)
      minParams = maxParams = params[0];
    else if (params.length === 2)
      [minParams, maxParams] = params;
    return fn;
  };
  fn.setName = (value) => {
    name = value;
    return fn;
  };
  return fn;
};
var ShaderNodeImmutable = function(NodeClass, ...params) {
  return new NodeClass(...nodeArray(params));
};

class ShaderCallNodeInternal extends Node {
  constructor(shaderNode, rawInputs) {
    super();
    this.shaderNode = shaderNode;
    this.rawInputs = rawInputs;
    this.isShaderCallNodeInternal = true;
  }
  generateNodeType(builder) {
    return this.shaderNode.nodeType || this.getOutputNode(builder).getNodeType(builder);
  }
  getElementType(builder) {
    return this.getOutputNode(builder).getElementType(builder);
  }
  getMemberType(builder, name) {
    return this.getOutputNode(builder).getMemberType(builder, name);
  }
  call(builder) {
    const { shaderNode, rawInputs } = this;
    const properties = builder.getNodeProperties(shaderNode);
    const subBuild = builder.getClosestSubBuild(shaderNode.subBuilds) || "";
    const subBuildProperty = subBuild || "default";
    if (properties[subBuildProperty]) {
      return properties[subBuildProperty];
    }
    const previousSubBuildFn = builder.subBuildFn;
    const previousFnCall = builder.fnCall;
    builder.subBuildFn = subBuild;
    builder.fnCall = this;
    let result = null;
    if (shaderNode.layout) {
      if (rawInputs) {
        const inputs = shaderNode.layout.inputs;
        if (isArrayAsParameter(rawInputs)) {
          const rawArrayParameters = rawInputs;
          for (let i = 0;i < inputs.length; i++) {
            const rawParameter = rawArrayParameters[i];
            if (rawParameter && rawParameter.isNode) {
              rawParameter.build(builder);
            }
          }
        } else {
          const rawObjectParameters = rawInputs[0];
          for (const param of inputs) {
            const rawParameter = rawObjectParameters[param.name];
            if (rawParameter && rawParameter.isNode) {
              rawParameter.build(builder);
            }
          }
        }
      }
      const functionNode = builder.buildFunctionNode(shaderNode);
      builder.addInclude(functionNode);
      const inputs = rawInputs ? getLayoutParameters(rawInputs) : null;
      result = functionNode.call(inputs);
    } else {
      const secureNodeBuilder = new Proxy(builder, {
        get: (target, property, receiver) => {
          let value;
          if (Symbol.iterator === property) {
            value = function* () {
              yield undefined;
            };
          } else {
            value = Reflect.get(target, property, receiver);
          }
          return value;
        }
      });
      const inputs = rawInputs ? getProxyParameters(rawInputs) : null;
      const hasParameters = Array.isArray(rawInputs) ? rawInputs.length > 0 : rawInputs !== null;
      const jsFunc = shaderNode.jsFunc;
      const outputNode = hasParameters || jsFunc.length > 1 ? jsFunc(inputs, secureNodeBuilder) : jsFunc(secureNodeBuilder);
      result = nodeObject(outputNode);
    }
    builder.subBuildFn = previousSubBuildFn;
    builder.fnCall = previousFnCall;
    if (shaderNode.once) {
      properties[subBuildProperty] = result;
    }
    return result;
  }
  setupOutput(builder) {
    builder.addStack();
    builder.stack.outputNode = this.call(builder);
    return builder.removeStack();
  }
  getOutputNode(builder) {
    const properties = builder.getNodeProperties(this);
    const subBuildOutput = builder.getSubBuildOutput(this);
    properties[subBuildOutput] = properties[subBuildOutput] || this.setupOutput(builder);
    properties[subBuildOutput].subBuild = builder.getClosestSubBuild(this);
    return properties[subBuildOutput];
  }
  build(builder, output = null) {
    let result = null;
    const buildStage = builder.getBuildStage();
    const properties = builder.getNodeProperties(this);
    const subBuildOutput = builder.getSubBuildOutput(this);
    const outputNode = this.getOutputNode(builder);
    const previousFnCall = builder.fnCall;
    builder.fnCall = this;
    if (buildStage === "setup") {
      const subBuildInitialized = builder.getSubBuildProperty("initialized", this);
      if (properties[subBuildInitialized] !== true) {
        properties[subBuildInitialized] = true;
        properties[subBuildOutput] = this.getOutputNode(builder);
        properties[subBuildOutput].build(builder);
        if (this.shaderNode.subBuilds) {
          for (const node of builder.chaining) {
            const nodeData = builder.getDataFromNode(node, "any");
            nodeData.subBuilds = nodeData.subBuilds || new Set;
            for (const subBuild of this.shaderNode.subBuilds) {
              nodeData.subBuilds.add(subBuild);
            }
          }
        }
      }
      result = properties[subBuildOutput];
    } else if (buildStage === "analyze") {
      outputNode.build(builder, output);
    } else if (buildStage === "generate") {
      result = outputNode.build(builder, output) || "";
    }
    builder.fnCall = previousFnCall;
    return result;
  }
}
function getLayoutParameters(params) {
  let output;
  nodeObjects(params);
  if (isArrayAsParameter(params)) {
    output = [...params];
  } else {
    output = params[0];
  }
  return output;
}
function getProxyParameters(params) {
  let index = 0;
  nodeObjects(params);
  return new Proxy(params, {
    get: (target, property, receiver) => {
      let value;
      if (property === "length") {
        value = params.length;
        return value;
      }
      if (Symbol.iterator === property) {
        value = function* () {
          for (const inputNode of params) {
            yield nodeObject(inputNode);
          }
        };
      } else {
        if (params.length > 0) {
          if (Object.getPrototypeOf(params[0]) === Object.prototype) {
            const objectTarget = params[0];
            if (objectTarget[property] === undefined) {
              value = objectTarget[index++];
            } else {
              value = Reflect.get(objectTarget, property, receiver);
            }
          } else if (params[0] instanceof Node) {
            if (params[property] === undefined) {
              value = params[index++];
            } else {
              value = Reflect.get(params, property, receiver);
            }
          }
        } else {
          value = Reflect.get(target, property, receiver);
        }
        value = nodeObject(value);
      }
      return value;
    }
  });
}

class ShaderNodeInternal extends Node {
  constructor(jsFunc, nodeType) {
    super(nodeType);
    this.jsFunc = jsFunc;
    this.layout = null;
    this.global = true;
    this.once = false;
  }
  setLayout(layout) {
    this.layout = layout;
    return this;
  }
  getLayout() {
    return this.layout;
  }
  call(rawInputs = null) {
    return new ShaderCallNodeInternal(this, rawInputs);
  }
  setup() {
    return this.call();
  }
}
var bools = [false, true];
var uints = [0, 1, 2, 3];
var ints = [-1, -2];
var floats = [0.5, 1.5, 1 / 3, 0.000001, 1e6, Math.PI, Math.PI * 2, 1 / Math.PI, 2 / Math.PI, 1 / (Math.PI * 2), Math.PI / 2];
var boolsCacheMap = new Map;
for (const bool of bools)
  boolsCacheMap.set(bool, new ConstNode(bool));
var uintsCacheMap = new Map;
for (const uint of uints)
  uintsCacheMap.set(uint, new ConstNode(uint, "uint"));
var intsCacheMap = new Map([...uintsCacheMap].map((el) => new ConstNode(el.value, "int")));
for (const int of ints)
  intsCacheMap.set(int, new ConstNode(int, "int"));
var floatsCacheMap = new Map([...intsCacheMap].map((el) => new ConstNode(el.value)));
for (const float of floats)
  floatsCacheMap.set(float, new ConstNode(float));
for (const float of floats)
  floatsCacheMap.set(-float, new ConstNode(-float));
var cacheMaps = { bool: boolsCacheMap, uint: uintsCacheMap, ints: intsCacheMap, float: floatsCacheMap };
var constNodesCacheMap = new Map([...boolsCacheMap, ...floatsCacheMap]);
var getConstNode = (value, type) => {
  if (constNodesCacheMap.has(value)) {
    return constNodesCacheMap.get(value);
  } else if (value.isNode === true) {
    return value;
  } else {
    return new ConstNode(value, type);
  }
};
var ConvertType = function(type, cacheMap = null) {
  return (...params) => {
    for (const param of params) {
      if (param === undefined) {
        error(`TSL: Invalid parameter for the type "${type}".`, new StackTrace);
        return new ConstNode(0, type);
      }
    }
    if (params.length === 0 || !["bool", "float", "int", "uint"].includes(type) && params.every((param) => {
      const paramType = typeof param;
      return paramType !== "object" && paramType !== "function";
    })) {
      params = [getValueFromType(type, ...params)];
    }
    if (params.length === 1 && cacheMap !== null && cacheMap.has(params[0])) {
      return nodeObjectIntent(cacheMap.get(params[0]));
    }
    if (params.length === 1) {
      const node = getConstNode(params[0], type);
      if (node.nodeType === type)
        return nodeObjectIntent(node);
      return nodeObjectIntent(new ConvertNode(node, type));
    }
    const nodes = params.map((param) => getConstNode(param));
    return nodeObjectIntent(new JoinNode(nodes, type));
  };
};
function defined(value) {
  if (value && value.isNode) {
    value.traverse((node) => {
      if (node.isConstNode) {
        value = node.value;
      }
    });
  }
  return Boolean(value);
}
var getConstNodeType = (value) => value !== undefined && value !== null ? value.nodeType || value.convertTo || (typeof value === "string" ? value : null) : null;
function ShaderNode(jsFunc, nodeType) {
  return new ShaderNodeInternal(jsFunc, nodeType);
}
var nodeObject = (val, altType = null) => ShaderNodeObject(val, altType);
var nodeObjectIntent = (val, altType = null) => nodeObject(val, altType).toVarIntent();
var nodeObjects = (val, altType = null) => new ShaderNodeObjects(val, altType);
var nodeArray = (val, altType = null) => new ShaderNodeArray(val, altType);
var nodeProxy = (NodeClass, scope = null, factor = null, settings = null) => new ShaderNodeProxy(NodeClass, scope, factor, settings);
var nodeImmutable = (NodeClass, ...params) => new ShaderNodeImmutable(NodeClass, ...params);
var nodeProxyIntent = (NodeClass, scope = null, factor = null, settings = {}) => new ShaderNodeProxy(NodeClass, scope, factor, { ...settings, intent: true });
var fnId = 0;

class FnNode extends Node {
  constructor(jsFunc, layout = null) {
    super();
    let nodeType = null;
    if (layout !== null) {
      if (typeof layout === "object") {
        nodeType = layout.return;
      } else {
        if (typeof layout === "string") {
          nodeType = layout;
        } else {
          error("TSL: Invalid layout type.", new StackTrace);
        }
        layout = null;
      }
    }
    this.shaderNode = new ShaderNode(jsFunc, nodeType);
    if (layout !== null) {
      this.setLayout(layout);
    }
    this.isFn = true;
  }
  setLayout(layout) {
    const nodeType = this.shaderNode.nodeType;
    if (typeof layout.inputs !== "object") {
      const fullLayout = {
        name: "fn" + fnId++,
        type: nodeType,
        inputs: []
      };
      for (const name in layout) {
        if (name === "return")
          continue;
        fullLayout.inputs.push({
          name,
          type: layout[name]
        });
      }
      layout = fullLayout;
    }
    this.shaderNode.setLayout(layout);
    return this;
  }
  generateNodeType(builder) {
    return this.shaderNode.getNodeType(builder) || "float";
  }
  call(...params) {
    const fnCall = this.shaderNode.call(params);
    if (this.shaderNode.nodeType === "void")
      fnCall.toStack();
    return fnCall.toVarIntent();
  }
  once(subBuilds = null) {
    this.shaderNode.once = true;
    this.shaderNode.subBuilds = subBuilds;
    return this;
  }
  generate(builder) {
    const type = this.getNodeType(builder);
    error('TSL: "Fn()" was declared but not invoked. Try calling it like "Fn()( ...params )".', this.stackTrace);
    return builder.generateConst(type);
  }
}
function Fn(jsFunc, layout = null) {
  const instance = new FnNode(jsFunc, layout);
  return new Proxy(() => {}, {
    apply(target, thisArg, params) {
      return instance.call(...params);
    },
    get(target, prop, receiver) {
      return Reflect.get(instance, prop, receiver);
    },
    set(target, prop, value, receiver) {
      return Reflect.set(instance, prop, value, receiver);
    }
  });
}
var If = (...params) => currentStack.If(...params);
function Stack(node) {
  if (currentStack)
    currentStack.addToStack(node);
  return node;
}
addMethodChaining("toStack", Stack);
var color = new ConvertType("color");
var float = new ConvertType("float", cacheMaps.float);
var int = new ConvertType("int", cacheMaps.ints);
var uint = new ConvertType("uint", cacheMaps.uint);
var bool = new ConvertType("bool", cacheMaps.bool);
var vec2 = new ConvertType("vec2");
var ivec2 = new ConvertType("ivec2");
var uvec2 = new ConvertType("uvec2");
var bvec2 = new ConvertType("bvec2");
var vec3 = new ConvertType("vec3");
var ivec3 = new ConvertType("ivec3");
var uvec3 = new ConvertType("uvec3");
var bvec3 = new ConvertType("bvec3");
var vec4 = new ConvertType("vec4");
var ivec4 = new ConvertType("ivec4");
var uvec4 = new ConvertType("uvec4");
var bvec4 = new ConvertType("bvec4");
var mat2 = new ConvertType("mat2");
var mat3 = new ConvertType("mat3");
var mat4 = new ConvertType("mat4");
addMethodChaining("toColor", color);
addMethodChaining("toFloat", float);
addMethodChaining("toInt", int);
addMethodChaining("toUint", uint);
addMethodChaining("toBool", bool);
addMethodChaining("toVec2", vec2);
addMethodChaining("toIVec2", ivec2);
addMethodChaining("toUVec2", uvec2);
addMethodChaining("toBVec2", bvec2);
addMethodChaining("toVec3", vec3);
addMethodChaining("toIVec3", ivec3);
addMethodChaining("toUVec3", uvec3);
addMethodChaining("toBVec3", bvec3);
addMethodChaining("toVec4", vec4);
addMethodChaining("toIVec4", ivec4);
addMethodChaining("toUVec4", uvec4);
addMethodChaining("toBVec4", bvec4);
addMethodChaining("toMat2", mat2);
addMethodChaining("toMat3", mat3);
addMethodChaining("toMat4", mat4);
var element = /* @__PURE__ */ nodeProxy(ArrayElementNode).setParameterLength(2);
var convert = (node, types) => new ConvertNode(nodeObject(node), types);
addMethodChaining("element", element);
addMethodChaining("convert", convert);

class PropertyNode extends Node {
  static get type() {
    return "PropertyNode";
  }
  constructor(nodeType, name = null, varying = false, placeholderNode = null) {
    super(nodeType);
    this.name = name;
    this.varying = varying;
    this.placeholderNode = nodeObject(placeholderNode);
    this.isPropertyNode = true;
    this.global = true;
  }
  getNodeType(builder) {
    const nodeType = super.getNodeType(builder);
    if (nodeType === "output") {
      return builder.getOutputType();
    }
    return nodeType;
  }
  customCacheKey() {
    return hashString(this.type + ":" + (this.name || "") + ":" + (this.varying ? "1" : "0"));
  }
  getHash(builder) {
    return this.name || super.getHash(builder);
  }
  generate(builder) {
    let nodeVar;
    if (this.varying === true) {
      nodeVar = builder.getVaryingFromNode(this, this.name);
      nodeVar.needsInterpolation = true;
    } else {
      nodeVar = builder.getVarFromNode(this, this.name);
      if (this.placeholderNode !== null) {
        if (builder.hasWriteUsage(this) === false) {
          const snippet = this.placeholderNode.build(builder, this.getNodeType(builder));
          builder.addLineFlowCode(`${builder.getPropertyName(nodeVar)} = ${snippet}`, this);
        }
      }
    }
    return builder.getPropertyName(nodeVar);
  }
}
var property = (type, name, placeholderNode = null) => new PropertyNode(type, name, false, placeholderNode);
var varyingProperty = (type, name, placeholderNode = null) => new PropertyNode(type, name, true, placeholderNode);
var diffuseColor = /* @__PURE__ */ nodeImmutable(PropertyNode, "vec4", "DiffuseColor");
var dashSize = /* @__PURE__ */ nodeImmutable(PropertyNode, "float", "dashSize");
var gapSize = /* @__PURE__ */ nodeImmutable(PropertyNode, "float", "gapSize");
class UniformGroupNode extends Node {
  static get type() {
    return "UniformGroupNode";
  }
  constructor(name, shared = false, order = 1, updateType = null) {
    super("string");
    this.name = name;
    this.shared = shared;
    this.order = order;
    this.updateType = updateType;
    this.isUniformGroup = true;
  }
  update() {
    this.needsUpdate = true;
  }
  serialize(data) {
    super.serialize(data);
    data.name = this.name;
    data.version = this.version;
    data.shared = this.shared;
  }
  deserialize(data) {
    super.deserialize(data);
    this.name = data.name;
    this.version = data.version;
    this.shared = data.shared;
  }
}
var uniformGroup = (name, order = 1, updateType = null) => new UniformGroupNode(name, false, order, updateType);
var sharedUniformGroup = (name, order = 0, updateType = null) => new UniformGroupNode(name, true, order, updateType);
var frameGroup = /* @__PURE__ */ sharedUniformGroup("frame", 0, NodeUpdateType.FRAME);
var renderGroup = /* @__PURE__ */ sharedUniformGroup("render", 0, NodeUpdateType.RENDER);
var objectGroup = /* @__PURE__ */ uniformGroup("object", 1, NodeUpdateType.OBJECT);

class UniformNode extends InputNode {
  static get type() {
    return "UniformNode";
  }
  constructor(value, nodeType = null) {
    super(value, nodeType);
    this.isUniformNode = true;
    this.name = "";
    this.groupNode = objectGroup;
  }
  setName(name) {
    this.name = name;
    return this;
  }
  label(name) {
    warn('TSL: "label()" has been deprecated. Use "setName()" instead.', new StackTrace);
    return this.setName(name);
  }
  setGroup(group) {
    this.groupNode = group;
    return this;
  }
  getGroup() {
    return this.groupNode;
  }
  getUniformHash(builder) {
    return this.getHash(builder);
  }
  getSharedNode(builder) {
    const hash = this.getUniformHash(builder);
    let sharedNode = builder.getNodeFromHash(hash);
    if (sharedNode === undefined) {
      builder.setHashNode(this, hash);
      sharedNode = this;
    }
    return sharedNode;
  }
  onUpdate(callback, updateType) {
    callback = callback.bind(this);
    return super.onUpdate((frame) => {
      const value = callback(frame, this);
      if (value !== undefined) {
        this.value = value;
      }
    }, updateType);
  }
  getInputType(builder) {
    let type = super.getInputType(builder);
    if (type === "bool") {
      type = "uint";
    }
    return type;
  }
  generate(builder, output) {
    const type = this.getNodeType(builder);
    const sharedNode = this.getSharedNode(builder);
    const sharedNodeType = sharedNode.getInputType(builder);
    const nodeUniform = builder.getUniformFromNode(sharedNode, sharedNodeType, builder.shaderStage, this.name || builder.context.nodeName);
    const uniformName = builder.getPropertyName(nodeUniform);
    if (builder.context.nodeName !== undefined)
      delete builder.context.nodeName;
    let snippet = uniformName;
    if (type === "bool") {
      const nodeData = builder.getDataFromNode(this);
      let propertyName = nodeData.propertyName;
      if (propertyName === undefined) {
        const nodeVar = builder.getVarFromNode(this, null, "bool");
        propertyName = builder.getPropertyName(nodeVar);
        nodeData.propertyName = propertyName;
        snippet = builder.format(uniformName, sharedNodeType, type);
        builder.addLineFlowCode(`${propertyName} = ${snippet}`, this);
      }
      snippet = propertyName;
    }
    return builder.format(snippet, type, output);
  }
}
var uniform = (value, type) => {
  const nodeType = getConstNodeType(type || value);
  if (nodeType === value) {
    value = getValueFromType(nodeType);
  }
  if (value && value.isNode === true) {
    let v = value.value;
    value.traverse((n) => {
      if (n.isConstNode === true) {
        v = n.value;
      }
    });
    value = v;
  }
  return new UniformNode(value, nodeType);
};

class ArrayNode extends TempNode {
  static get type() {
    return "ArrayNode";
  }
  constructor(nodeType, count, values = null) {
    super(nodeType);
    this.count = count;
    this.values = values;
    this.isArrayNode = true;
  }
  getArrayCount() {
    return this.count;
  }
  generateNodeType(builder) {
    if (this.nodeType === null) {
      return this.values[0].getNodeType(builder);
    }
    return this.nodeType;
  }
  getElementType(builder) {
    return this.getNodeType(builder);
  }
  getMemberType(builder, name) {
    if (this.nodeType === null) {
      return this.values[0].getMemberType(builder, name);
    }
    return super.getMemberType(builder, name);
  }
  generate(builder) {
    const type = this.getNodeType(builder);
    return builder.generateArray(type, this.count, this.values);
  }
}
var array = (...params) => {
  let node;
  if (params.length === 1) {
    const values = params[0].map((value) => nodeObject(value));
    node = new ArrayNode(null, values.length, values);
  } else {
    const nodeType = params[0];
    const count = params[1];
    node = new ArrayNode(nodeType, count);
  }
  return node;
};
addMethodChaining("toArray", (node, count) => array(Array(count).fill(node)));

class AssignNode extends TempNode {
  static get type() {
    return "AssignNode";
  }
  constructor(targetNode, sourceNode) {
    super();
    this.targetNode = targetNode;
    this.sourceNode = sourceNode;
    this.isAssignNode = true;
  }
  hasDependencies() {
    return false;
  }
  generateNodeType(builder, output) {
    return output !== "void" ? this.targetNode.getNodeType(builder) : "void";
  }
  needsSplitAssign(builder) {
    const { targetNode } = this;
    if (builder.isAvailable("swizzleAssign") === false && targetNode.isSplitNode && targetNode.components.length > 1) {
      const targetLength = builder.getTypeLength(targetNode.node.getNodeType(builder));
      const assignDifferentVector = vectorComponents.join("").slice(0, targetLength) !== targetNode.components;
      return assignDifferentVector;
    }
    return false;
  }
  setup(builder) {
    const { targetNode, sourceNode } = this;
    const scope = targetNode.getScope();
    const scopeData = builder.getDataFromNode(scope);
    scopeData.assign = true;
    const properties = builder.getNodeProperties(this);
    properties.sourceNode = sourceNode;
    properties.targetNode = targetNode.context({ assign: true });
  }
  generate(builder, output) {
    const { targetNode, sourceNode } = builder.getNodeProperties(this);
    const needsSplitAssign = this.needsSplitAssign(builder);
    const target = targetNode.build(builder);
    const targetType = targetNode.getNodeType(builder);
    const source = sourceNode.build(builder, targetType);
    const sourceType = sourceNode.getNodeType(builder);
    const nodeData = builder.getDataFromNode(this);
    let snippet;
    if (nodeData.initialized === true) {
      if (output !== "void") {
        snippet = target;
      }
    } else if (needsSplitAssign) {
      const sourceVar = builder.getVarFromNode(this, null, targetType);
      const sourceProperty = builder.getPropertyName(sourceVar);
      builder.addLineFlowCode(`${sourceProperty} = ${source}`, this);
      const splitNode = targetNode.node;
      const splitTargetNode = splitNode.node.context({ assign: true });
      const targetRoot = splitTargetNode.build(builder);
      for (let i = 0;i < splitNode.components.length; i++) {
        const component = splitNode.components[i];
        builder.addLineFlowCode(`${targetRoot}.${component} = ${sourceProperty}[ ${i} ]`, this);
      }
      if (output !== "void") {
        snippet = target;
      }
    } else {
      snippet = `${target} = ${source}`;
      if (output === "void" || sourceType === "void") {
        builder.addLineFlowCode(snippet, this);
        if (output !== "void") {
          snippet = target;
        }
      }
    }
    nodeData.initialized = true;
    return builder.format(snippet, targetType, output);
  }
}
var assign = /* @__PURE__ */ nodeProxy(AssignNode).setParameterLength(2);
addMethodChaining("assign", assign);

class FunctionCallNode extends TempNode {
  static get type() {
    return "FunctionCallNode";
  }
  constructor(functionNode = null, parameters = {}) {
    super();
    this.functionNode = functionNode;
    this.parameters = parameters;
  }
  setParameters(parameters) {
    this.parameters = parameters;
    return this;
  }
  getParameters() {
    return this.parameters;
  }
  generateNodeType(builder) {
    return this.functionNode.getNodeType(builder);
  }
  getMemberType(builder, name) {
    return this.functionNode.getMemberType(builder, name);
  }
  generate(builder) {
    const params = [];
    const functionNode = this.functionNode;
    const inputs = functionNode.getInputs(builder);
    const parameters = this.parameters;
    const generateInput = (node, inputNode) => {
      const type = inputNode.type;
      const pointer = type === "pointer";
      let output;
      if (pointer)
        output = "&" + node.build(builder);
      else
        output = node.build(builder, type);
      return output;
    };
    if (Array.isArray(parameters)) {
      if (parameters.length > inputs.length) {
        error("TSL: The number of provided parameters exceeds the expected number of inputs in 'Fn()'.");
        parameters.length = inputs.length;
      } else if (parameters.length < inputs.length) {
        error("TSL: The number of provided parameters is less than the expected number of inputs in 'Fn()'.");
        while (parameters.length < inputs.length) {
          parameters.push(float(0));
        }
      }
      for (let i = 0;i < parameters.length; i++) {
        params.push(generateInput(parameters[i], inputs[i]));
      }
    } else {
      for (const inputNode of inputs) {
        const node = parameters[inputNode.name];
        if (node !== undefined) {
          params.push(generateInput(node, inputNode));
        } else {
          error(`TSL: Input '${inputNode.name}' not found in 'Fn()'.`);
          params.push(generateInput(float(0), inputNode));
        }
      }
    }
    const functionName = functionNode.build(builder, "property");
    return `${functionName}( ${params.join(", ")} )`;
  }
}
var call = (func, ...params) => {
  params = params.length > 1 || params[0] && params[0].isNode === true ? nodeArray(params) : nodeObjects(params[0]);
  return new FunctionCallNode(nodeObject(func), params);
};
addMethodChaining("call", call);
var _vectorOperators = {
  "==": "equal",
  "!=": "notEqual",
  "<": "lessThan",
  ">": "greaterThan",
  "<=": "lessThanEqual",
  ">=": "greaterThanEqual",
  "%": "mod"
};

class OperatorNode extends TempNode {
  static get type() {
    return "OperatorNode";
  }
  constructor(op, aNode, bNode, ...params) {
    super();
    if (params.length > 0) {
      let finalOp = new OperatorNode(op, aNode, bNode);
      for (let i = 0;i < params.length - 1; i++) {
        finalOp = new OperatorNode(op, finalOp, params[i]);
      }
      aNode = finalOp;
      bNode = params[params.length - 1];
    }
    this.op = op;
    this.aNode = aNode;
    this.bNode = bNode;
    this.isOperatorNode = true;
  }
  getOperatorMethod(builder, output) {
    return builder.getMethod(_vectorOperators[this.op], output);
  }
  generateNodeType(builder, output = null) {
    const op = this.op;
    const aNode = this.aNode;
    const bNode = this.bNode;
    const typeA = aNode.getNodeType(builder);
    const typeB = bNode ? bNode.getNodeType(builder) : null;
    if (typeA === "void" || typeB === "void") {
      return output || "void";
    } else if (op === "%") {
      return typeA;
    } else if (op === "~" || op === "&" || op === "|" || op === "^" || op === ">>" || op === "<<") {
      return builder.getIntegerType(typeA);
    } else if (op === "&&" || op === "||" || op === "^^") {
      return "bool";
    } else if (op === "!") {
      const typeLength = builder.getTypeLength(typeA);
      return typeLength > 1 ? `bvec${typeLength}` : "bool";
    } else if (op === "==" || op === "!=" || op === "<" || op === ">" || op === "<=" || op === ">=") {
      const typeLength = Math.max(builder.getTypeLength(typeA), builder.getTypeLength(typeB));
      return typeLength > 1 ? `bvec${typeLength}` : "bool";
    } else {
      if (builder.isMatrix(typeA)) {
        if (typeB === "float") {
          return typeA;
        } else if (builder.isVector(typeB)) {
          return builder.getVectorFromMatrix(typeA);
        } else if (builder.isMatrix(typeB)) {
          return typeA;
        }
      } else if (builder.isMatrix(typeB)) {
        if (typeA === "float") {
          return typeB;
        } else if (builder.isVector(typeA)) {
          return builder.getVectorFromMatrix(typeB);
        }
      }
      if (builder.getTypeLength(typeB) > builder.getTypeLength(typeA)) {
        return typeB;
      }
      return typeA;
    }
  }
  generate(builder, output) {
    const op = this.op;
    const { aNode, bNode } = this;
    const type = this.getNodeType(builder, output);
    let typeA = null;
    let typeB = null;
    if (type !== "void") {
      typeA = aNode.getNodeType(builder);
      typeB = bNode ? bNode.getNodeType(builder) : null;
      if (op === "<" || op === ">" || op === "<=" || op === ">=" || op === "==" || op === "!=") {
        if (builder.isVector(typeA)) {
          typeB = typeA;
        } else if (builder.isVector(typeB)) {
          typeA = typeB;
        } else if (typeA !== typeB) {
          typeA = typeB = "float";
        }
      } else if (op === ">>" || op === "<<") {
        typeA = type;
        typeB = builder.changeComponentType(typeB, "uint");
      } else if (op === "%") {
        typeA = type;
        typeB = builder.isInteger(typeA) && builder.isInteger(typeB) ? typeB : typeA;
      } else if (builder.isMatrix(typeA)) {
        if (typeB === "float") {
          typeB = "float";
        } else if (builder.isVector(typeB)) {
          typeB = builder.getVectorFromMatrix(typeA);
        } else if (builder.isMatrix(typeB))
          ;
        else {
          typeA = typeB = type;
        }
      } else if (builder.isMatrix(typeB)) {
        if (typeA === "float") {
          typeA = "float";
        } else if (builder.isVector(typeA)) {
          typeA = builder.getVectorFromMatrix(typeB);
        } else {
          typeA = typeB = type;
        }
      } else {
        typeA = typeB = type;
      }
    } else {
      typeA = typeB = type;
    }
    const a = aNode.build(builder, typeA);
    const b = bNode ? bNode.build(builder, typeB) : null;
    const fnOpSnippet = builder.getFunctionOperator(op);
    if (output !== "void") {
      const isGLSL = builder.renderer.coordinateSystem === WebGLCoordinateSystem;
      if (op === "==" || op === "!=" || op === "<" || op === ">" || op === "<=" || op === ">=") {
        if (isGLSL) {
          if (builder.isVector(typeA)) {
            return builder.format(`${this.getOperatorMethod(builder, output)}( ${a}, ${b} )`, type, output);
          } else {
            return builder.format(`( ${a} ${op} ${b} )`, type, output);
          }
        } else {
          return builder.format(`( ${a} ${op} ${b} )`, type, output);
        }
      } else if (op === "%") {
        if (builder.isInteger(typeB)) {
          return builder.format(`( ${a} % ${b} )`, type, output);
        } else {
          return builder.format(`${this.getOperatorMethod(builder, type)}( ${a}, ${b} )`, type, output);
        }
      } else if (op === "!") {
        if (isGLSL && builder.isVector(typeA)) {
          return builder.format(`not( ${a} )`, output);
        } else {
          return builder.format(`( ${op} ${a} )`, typeA, output);
        }
      } else if (op === "~") {
        return builder.format(`( ${op} ${a} )`, typeA, output);
      } else if (fnOpSnippet) {
        return builder.format(`${fnOpSnippet}( ${a}, ${b} )`, type, output);
      } else {
        if (builder.isMatrix(typeA) && typeB === "float") {
          return builder.format(`( ${b} ${op} ${a} )`, type, output);
        } else if (typeA === "float" && builder.isMatrix(typeB)) {
          return builder.format(`${a} ${op} ${b}`, type, output);
        } else {
          let snippet = `( ${a} ${op} ${b} )`;
          if (!isGLSL && type === "bool" && builder.isVector(typeA) && builder.isVector(typeB)) {
            snippet = `all${snippet}`;
          }
          return builder.format(snippet, type, output);
        }
      }
    } else if (typeA !== "void") {
      if (fnOpSnippet) {
        return builder.format(`${fnOpSnippet}( ${a}, ${b} )`, type, output);
      } else {
        if (builder.isMatrix(typeA) && typeB === "float") {
          return builder.format(`${b} ${op} ${a}`, type, output);
        } else {
          return builder.format(`${a} ${op} ${b}`, type, output);
        }
      }
    }
  }
  serialize(data) {
    super.serialize(data);
    data.op = this.op;
  }
  deserialize(data) {
    super.deserialize(data);
    this.op = data.op;
  }
}
var add = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "+").setParameterLength(2, Infinity).setName("add");
var sub = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "-").setParameterLength(2, Infinity).setName("sub");
var mul = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "*").setParameterLength(2, Infinity).setName("mul");
var div = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "/").setParameterLength(2, Infinity).setName("div");
var mod = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "%").setParameterLength(2).setName("mod");
var equal = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "==").setParameterLength(2).setName("equal");
var notEqual = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "!=").setParameterLength(2).setName("notEqual");
var lessThan = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "<").setParameterLength(2).setName("lessThan");
var greaterThan = /* @__PURE__ */ nodeProxyIntent(OperatorNode, ">").setParameterLength(2).setName("greaterThan");
var lessThanEqual = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "<=").setParameterLength(2).setName("lessThanEqual");
var greaterThanEqual = /* @__PURE__ */ nodeProxyIntent(OperatorNode, ">=").setParameterLength(2).setName("greaterThanEqual");
var and = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "&&").setParameterLength(2, Infinity).setName("and");
var or = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "||").setParameterLength(2, Infinity).setName("or");
var not = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "!").setParameterLength(1).setName("not");
var xor = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "^^").setParameterLength(2).setName("xor");
var bitAnd = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "&").setParameterLength(2).setName("bitAnd");
var bitNot = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "~").setParameterLength(1).setName("bitNot");
var bitOr = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "|").setParameterLength(2).setName("bitOr");
var bitXor = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "^").setParameterLength(2).setName("bitXor");
var shiftLeft = /* @__PURE__ */ nodeProxyIntent(OperatorNode, "<<").setParameterLength(2).setName("shiftLeft");
var shiftRight = /* @__PURE__ */ nodeProxyIntent(OperatorNode, ">>").setParameterLength(2).setName("shiftRight");
var incrementBefore = /* @__PURE__ */ Fn(([a]) => {
  a.addAssign(1);
  return a;
});
var decrementBefore = /* @__PURE__ */ Fn(([a]) => {
  a.subAssign(1);
  return a;
});
var increment = /* @__PURE__ */ Fn(([a]) => {
  const temp = int(a).toConst();
  a.addAssign(1);
  return temp;
});
var decrement = /* @__PURE__ */ Fn(([a]) => {
  const temp = int(a).toConst();
  a.subAssign(1);
  return temp;
});
addMethodChaining("add", add);
addMethodChaining("sub", sub);
addMethodChaining("mul", mul);
addMethodChaining("div", div);
addMethodChaining("mod", mod);
addMethodChaining("equal", equal);
addMethodChaining("notEqual", notEqual);
addMethodChaining("lessThan", lessThan);
addMethodChaining("greaterThan", greaterThan);
addMethodChaining("lessThanEqual", lessThanEqual);
addMethodChaining("greaterThanEqual", greaterThanEqual);
addMethodChaining("and", and);
addMethodChaining("or", or);
addMethodChaining("not", not);
addMethodChaining("xor", xor);
addMethodChaining("bitAnd", bitAnd);
addMethodChaining("bitNot", bitNot);
addMethodChaining("bitOr", bitOr);
addMethodChaining("bitXor", bitXor);
addMethodChaining("shiftLeft", shiftLeft);
addMethodChaining("shiftRight", shiftRight);
addMethodChaining("incrementBefore", incrementBefore);
addMethodChaining("decrementBefore", decrementBefore);
addMethodChaining("increment", increment);
addMethodChaining("decrement", decrement);

class MathNode extends TempNode {
  static get type() {
    return "MathNode";
  }
  constructor(method, aNode, bNode = null, cNode = null) {
    super();
    if ((method === MathNode.MAX || method === MathNode.MIN) && arguments.length > 3) {
      let finalOp = new MathNode(method, aNode, bNode);
      for (let i = 3;i < arguments.length - 1; i++) {
        finalOp = new MathNode(method, finalOp, arguments[i]);
      }
      aNode = finalOp;
      bNode = arguments[arguments.length - 1];
      cNode = null;
    }
    this.method = method;
    this.aNode = aNode;
    this.bNode = bNode;
    this.cNode = cNode;
    this.isMathNode = true;
  }
  getInputType(builder) {
    const aType = this.aNode.getNodeType(builder);
    const bType = this.bNode ? this.bNode.getNodeType(builder) : null;
    const cType = this.cNode ? this.cNode.getNodeType(builder) : null;
    const aLen = builder.isMatrix(aType) ? 0 : builder.getTypeLength(aType);
    const bLen = builder.isMatrix(bType) ? 0 : builder.getTypeLength(bType);
    const cLen = builder.isMatrix(cType) ? 0 : builder.getTypeLength(cType);
    if (aLen > bLen && aLen > cLen) {
      return aType;
    } else if (bLen > cLen) {
      return bType;
    } else if (cLen > aLen) {
      return cType;
    }
    return aType;
  }
  generateNodeType(builder) {
    const method = this.method;
    if (method === MathNode.LENGTH || method === MathNode.DISTANCE || method === MathNode.DOT || method === MathNode.DETERMINANT) {
      return "float";
    } else if (method === MathNode.CROSS) {
      return "vec3";
    } else if (method === MathNode.ALL || method === MathNode.ANY) {
      return "bool";
    } else if (method === MathNode.EQUALS) {
      return builder.changeComponentType(this.aNode.getNodeType(builder), "bool");
    } else {
      return this.getInputType(builder);
    }
  }
  setup(builder) {
    const { aNode, bNode, method } = this;
    let outputNode = null;
    if (method === MathNode.ONE_MINUS) {
      outputNode = sub(1, aNode);
    } else if (method === MathNode.RECIPROCAL) {
      outputNode = div(1, aNode);
    } else if (method === MathNode.DIFFERENCE) {
      outputNode = abs(sub(aNode, bNode));
    } else if (method === MathNode.TRANSFORM_DIRECTION) {
      let matrixNode, directionNode;
      if (builder.isMatrix(aNode.getNodeType(builder))) {
        matrixNode = aNode;
        directionNode = bNode;
      } else {
        matrixNode = bNode;
        directionNode = aNode;
      }
      outputNode = normalize2(mul(matrixNode, vec4(vec3(directionNode), 0)).xyz);
    }
    if (outputNode !== null) {
      return outputNode;
    } else {
      return super.setup(builder);
    }
  }
  generate(builder, output) {
    const properties = builder.getNodeProperties(this);
    if (properties.outputNode) {
      return super.generate(builder, output);
    }
    let method = this.method;
    const type = this.getNodeType(builder);
    const inputType = this.getInputType(builder);
    const a = this.aNode;
    const b = this.bNode;
    const c = this.cNode;
    const coordinateSystem = builder.renderer.coordinateSystem;
    if (method === MathNode.NEGATE) {
      return builder.format("( - " + a.build(builder, inputType) + " )", type, output);
    } else {
      const params = [];
      if (method === MathNode.CROSS) {
        params.push(a.build(builder, type), b.build(builder, type));
      } else if (coordinateSystem === WebGLCoordinateSystem && method === MathNode.STEP) {
        params.push(a.build(builder, builder.getTypeLength(a.getNodeType(builder)) === 1 ? "float" : inputType), b.build(builder, inputType));
      } else if (coordinateSystem === WebGLCoordinateSystem && (method === MathNode.MIN || method === MathNode.MAX)) {
        params.push(a.build(builder, inputType), b.build(builder, builder.getTypeLength(b.getNodeType(builder)) === 1 ? builder.getComponentType(inputType) : inputType));
      } else if (method === MathNode.REFRACT) {
        params.push(a.build(builder, inputType), b.build(builder, inputType), c.build(builder, "float"));
      } else if (method === MathNode.MIX) {
        params.push(a.build(builder, inputType), b.build(builder, inputType), c.build(builder, builder.getTypeLength(c.getNodeType(builder)) === 1 ? "float" : inputType));
      } else {
        if (coordinateSystem === WebGPUCoordinateSystem && method === MathNode.ATAN && b !== null) {
          method = "atan2";
        }
        if (builder.shaderStage !== "fragment" && (method === MathNode.DFDX || method === MathNode.DFDY)) {
          error(`TSL: '${method}' is not supported in the ${builder.shaderStage} stage.`, this.stackTrace);
          method = "/*" + method + "*/";
        }
        params.push(a.build(builder, inputType));
        if (b !== null)
          params.push(b.build(builder, inputType));
        if (c !== null)
          params.push(c.build(builder, inputType));
      }
      return builder.format(`${builder.getMethod(method, type)}( ${params.join(", ")} )`, type, output);
    }
  }
  serialize(data) {
    super.serialize(data);
    data.method = this.method;
  }
  deserialize(data) {
    super.deserialize(data);
    this.method = data.method;
  }
}
MathNode.ALL = "all";
MathNode.ANY = "any";
MathNode.RADIANS = "radians";
MathNode.DEGREES = "degrees";
MathNode.EXP = "exp";
MathNode.EXP2 = "exp2";
MathNode.LOG = "log";
MathNode.LOG2 = "log2";
MathNode.SQRT = "sqrt";
MathNode.INVERSE_SQRT = "inversesqrt";
MathNode.FLOOR = "floor";
MathNode.CEIL = "ceil";
MathNode.NORMALIZE = "normalize";
MathNode.FRACT = "fract";
MathNode.SIN = "sin";
MathNode.SINH = "sinh";
MathNode.COS = "cos";
MathNode.COSH = "cosh";
MathNode.TAN = "tan";
MathNode.TANH = "tanh";
MathNode.ASIN = "asin";
MathNode.ASINH = "asinh";
MathNode.ACOS = "acos";
MathNode.ACOSH = "acosh";
MathNode.ATAN = "atan";
MathNode.ATANH = "atanh";
MathNode.ABS = "abs";
MathNode.SIGN = "sign";
MathNode.LENGTH = "length";
MathNode.NEGATE = "negate";
MathNode.ONE_MINUS = "oneMinus";
MathNode.DFDX = "dFdx";
MathNode.DFDY = "dFdy";
MathNode.ROUND = "round";
MathNode.RECIPROCAL = "reciprocal";
MathNode.TRUNC = "trunc";
MathNode.FWIDTH = "fwidth";
MathNode.TRANSPOSE = "transpose";
MathNode.DETERMINANT = "determinant";
MathNode.INVERSE = "inverse";
MathNode.EQUALS = "equals";
MathNode.MIN = "min";
MathNode.MAX = "max";
MathNode.STEP = "step";
MathNode.REFLECT = "reflect";
MathNode.DISTANCE = "distance";
MathNode.DIFFERENCE = "difference";
MathNode.DOT = "dot";
MathNode.CROSS = "cross";
MathNode.POW = "pow";
MathNode.TRANSFORM_DIRECTION = "transformDirection";
MathNode.MIX = "mix";
MathNode.CLAMP = "clamp";
MathNode.REFRACT = "refract";
MathNode.SMOOTHSTEP = "smoothstep";
MathNode.FACEFORWARD = "faceforward";
var PI = /* @__PURE__ */ float(Math.PI);
var PI2 = /* @__PURE__ */ float(Math.PI * 2);
var TWO_PI = /* @__PURE__ */ float(Math.PI * 2);
var HALF_PI = /* @__PURE__ */ float(Math.PI * 0.5);
var all = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.ALL).setParameterLength(1);
var any = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.ANY).setParameterLength(1);
var radians = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.RADIANS).setParameterLength(1);
var degrees = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.DEGREES).setParameterLength(1);
var exp = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.EXP).setParameterLength(1);
var exp2 = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.EXP2).setParameterLength(1);
var log2 = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.LOG).setParameterLength(1);
var log22 = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.LOG2).setParameterLength(1);
var sqrt = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.SQRT).setParameterLength(1);
var inverseSqrt = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.INVERSE_SQRT).setParameterLength(1);
var floor = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.FLOOR).setParameterLength(1);
var ceil = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.CEIL).setParameterLength(1);
var normalize2 = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.NORMALIZE).setParameterLength(1);
var fract = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.FRACT).setParameterLength(1);
var sin = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.SIN).setParameterLength(1);
var sinh = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.SINH).setParameterLength(1);
var cos = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.COS).setParameterLength(1);
var cosh = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.COSH).setParameterLength(1);
var tan = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.TAN).setParameterLength(1);
var tanh = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.TANH).setParameterLength(1);
var asin = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.ASIN).setParameterLength(1);
var asinh = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.ASINH).setParameterLength(1);
var acos = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.ACOS).setParameterLength(1);
var acosh = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.ACOSH).setParameterLength(1);
var atan = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.ATAN).setParameterLength(1, 2);
var atanh = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.ATANH).setParameterLength(1);
var abs = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.ABS).setParameterLength(1);
var sign = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.SIGN).setParameterLength(1);
var length = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.LENGTH).setParameterLength(1);
var negate = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.NEGATE).setParameterLength(1);
var oneMinus = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.ONE_MINUS).setParameterLength(1);
var dFdx = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.DFDX).setParameterLength(1);
var dFdy = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.DFDY).setParameterLength(1);
var round = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.ROUND).setParameterLength(1);
var reciprocal = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.RECIPROCAL).setParameterLength(1);
var trunc = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.TRUNC).setParameterLength(1);
var fwidth = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.FWIDTH).setParameterLength(1);
var transpose = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.TRANSPOSE).setParameterLength(1);
var determinant = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.DETERMINANT).setParameterLength(1);
var inverse = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.INVERSE).setParameterLength(1);
var min$1 = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.MIN).setParameterLength(2, Infinity);
var max$1 = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.MAX).setParameterLength(2, Infinity);
var step = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.STEP).setParameterLength(2);
var reflect = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.REFLECT).setParameterLength(2);
var distance = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.DISTANCE).setParameterLength(2);
var difference = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.DIFFERENCE).setParameterLength(2);
var dot = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.DOT).setParameterLength(2);
var cross = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.CROSS).setParameterLength(2);
var pow = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.POW).setParameterLength(2);
var pow2 = (x) => mul(x, x);
var pow3 = (x) => mul(x, x, x);
var pow4 = (x) => mul(x, x, x, x);
var transformDirection = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.TRANSFORM_DIRECTION).setParameterLength(2);
var transformNormalByViewMatrix = (normal, viewMatrix) => normalize2(mul(viewMatrix, vec4(vec3(normal), 0)).xyz);
var transformNormalByInverseViewMatrix = (normal, viewMatrix) => normalize2(vec4(vec3(normal), 0).mul(viewMatrix).xyz);
var cbrt = (a) => mul(sign(a), pow(abs(a), 1 / 3));
var lengthSq = (a) => dot(a, a);
var mix = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.MIX).setParameterLength(3);
var clamp2 = (value, low = 0, high = 1) => new MathNode(MathNode.CLAMP, nodeObject(value), nodeObject(low), nodeObject(high));
var saturate = (value) => clamp2(value);
var refract = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.REFRACT).setParameterLength(3);
var smoothstep2 = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.SMOOTHSTEP).setParameterLength(3);
var faceForward = /* @__PURE__ */ nodeProxyIntent(MathNode, MathNode.FACEFORWARD).setParameterLength(3);
var rand = /* @__PURE__ */ Fn(([uv]) => {
  const a = 12.9898, b = 78.233, c = 43758.5453;
  const dt = dot(uv.xy, vec2(a, b)), sn = mod(dt, PI);
  return fract(sin(sn).mul(c));
});
var mixElement = (t, e1, e2) => mix(e1, e2, t);
var smoothstepElement = (x, low, high) => smoothstep2(low, high, x);
var stepElement = (x, edge) => step(edge, x);
addMethodChaining("all", all);
addMethodChaining("any", any);
addMethodChaining("radians", radians);
addMethodChaining("degrees", degrees);
addMethodChaining("exp", exp);
addMethodChaining("exp2", exp2);
addMethodChaining("log", log2);
addMethodChaining("log2", log22);
addMethodChaining("sqrt", sqrt);
addMethodChaining("inverseSqrt", inverseSqrt);
addMethodChaining("floor", floor);
addMethodChaining("ceil", ceil);
addMethodChaining("normalize", normalize2);
addMethodChaining("fract", fract);
addMethodChaining("sin", sin);
addMethodChaining("sinh", sinh);
addMethodChaining("cos", cos);
addMethodChaining("cosh", cosh);
addMethodChaining("tan", tan);
addMethodChaining("tanh", tanh);
addMethodChaining("asin", asin);
addMethodChaining("asinh", asinh);
addMethodChaining("acos", acos);
addMethodChaining("acosh", acosh);
addMethodChaining("atan", atan);
addMethodChaining("atanh", atanh);
addMethodChaining("abs", abs);
addMethodChaining("sign", sign);
addMethodChaining("length", length);
addMethodChaining("lengthSq", lengthSq);
addMethodChaining("negate", negate);
addMethodChaining("oneMinus", oneMinus);
addMethodChaining("dFdx", dFdx);
addMethodChaining("dFdy", dFdy);
addMethodChaining("round", round);
addMethodChaining("reciprocal", reciprocal);
addMethodChaining("trunc", trunc);
addMethodChaining("fwidth", fwidth);
addMethodChaining("min", min$1);
addMethodChaining("max", max$1);
addMethodChaining("step", stepElement);
addMethodChaining("reflect", reflect);
addMethodChaining("distance", distance);
addMethodChaining("dot", dot);
addMethodChaining("cross", cross);
addMethodChaining("pow", pow);
addMethodChaining("pow2", pow2);
addMethodChaining("pow3", pow3);
addMethodChaining("pow4", pow4);
addMethodChaining("transformDirection", transformDirection);
addMethodChaining("transformNormalByViewMatrix", transformNormalByViewMatrix);
addMethodChaining("transformNormalByInverseViewMatrix", transformNormalByInverseViewMatrix);
addMethodChaining("mix", mixElement);
addMethodChaining("clamp", clamp2);
addMethodChaining("refract", refract);
addMethodChaining("smoothstep", smoothstepElement);
addMethodChaining("faceForward", faceForward);
addMethodChaining("difference", difference);
addMethodChaining("saturate", saturate);
addMethodChaining("cbrt", cbrt);
addMethodChaining("transpose", transpose);
addMethodChaining("determinant", determinant);
addMethodChaining("inverse", inverse);
addMethodChaining("rand", rand);

class ConditionalNode extends Node {
  static get type() {
    return "ConditionalNode";
  }
  constructor(condNode, ifNode, elseNode = null) {
    super();
    this.condNode = condNode;
    this.ifNode = ifNode;
    this.elseNode = elseNode;
  }
  generateNodeType(builder) {
    const { ifNode, elseNode } = builder.getNodeProperties(this);
    if (ifNode === undefined) {
      builder.flowBuildStage(this, "setup");
      return this.getNodeType(builder);
    }
    const ifType = ifNode.getNodeType(builder);
    if (elseNode !== null) {
      const elseType = elseNode.getNodeType(builder);
      if (builder.getTypeLength(elseType) > builder.getTypeLength(ifType)) {
        return elseType;
      }
    }
    return ifType;
  }
  setup(builder) {
    const condNode = this.condNode;
    const ifNode = this.ifNode.isolate();
    const elseNode = this.elseNode ? this.elseNode.isolate() : null;
    const currentNodeBlock = builder.context.nodeBlock;
    builder.getDataFromNode(ifNode).parentNodeBlock = currentNodeBlock;
    if (elseNode !== null)
      builder.getDataFromNode(elseNode).parentNodeBlock = currentNodeBlock;
    const isUniformFlow = builder.context.uniformFlow;
    const properties = builder.getNodeProperties(this);
    properties.condNode = condNode;
    properties.ifNode = isUniformFlow ? ifNode : ifNode.context({ nodeBlock: ifNode });
    properties.elseNode = elseNode ? isUniformFlow ? elseNode : elseNode.context({ nodeBlock: elseNode }) : null;
  }
  generate(builder, output) {
    const type = this.getNodeType(builder);
    const nodeData = builder.getDataFromNode(this);
    if (nodeData.nodeProperty !== undefined) {
      return nodeData.nodeProperty;
    }
    const { condNode, ifNode, elseNode } = builder.getNodeProperties(this);
    const functionNode = builder.currentFunctionNode;
    const needsOutput = output !== "void";
    const nodeProperty = needsOutput ? property(type).build(builder) : "";
    nodeData.nodeProperty = nodeProperty;
    const nodeSnippet = condNode.build(builder, "bool");
    const isUniformFlow = builder.context.uniformFlow;
    if (isUniformFlow && elseNode !== null) {
      const ifSnippet = ifNode.build(builder, type);
      const elseSnippet = elseNode.build(builder, type);
      const mathSnippet = builder.getTernary(nodeSnippet, ifSnippet, elseSnippet);
      return builder.format(mathSnippet, type, output);
    }
    builder.addFlowCode(`
${builder.tab}if ( ${nodeSnippet} ) {

`).addFlowTab();
    let ifSnippet = ifNode.build(builder, type);
    if (ifSnippet) {
      if (needsOutput) {
        ifSnippet = nodeProperty + " = " + ifSnippet + ";";
      } else {
        ifSnippet = "return " + ifSnippet + ";";
        if (functionNode === null) {
          warn("TSL: Return statement used in an inline 'Fn()'. Define a layout struct to allow return values.", this.stackTrace);
          ifSnippet = "// " + ifSnippet;
        }
      }
    }
    builder.removeFlowTab().addFlowCode(builder.tab + "\t" + ifSnippet + `

` + builder.tab + "}");
    if (elseNode !== null) {
      builder.addFlowCode(` else {

`).addFlowTab();
      let elseSnippet = elseNode.build(builder, type);
      if (elseSnippet) {
        if (needsOutput) {
          elseSnippet = nodeProperty + " = " + elseSnippet + ";";
        } else {
          elseSnippet = "return " + elseSnippet + ";";
          if (functionNode === null) {
            warn("TSL: Return statement used in an inline 'Fn()'. Define a layout struct to allow return values.", this.stackTrace);
            elseSnippet = "// " + elseSnippet;
          }
        }
      }
      builder.removeFlowTab().addFlowCode(builder.tab + "\t" + elseSnippet + `

` + builder.tab + `}

`);
    } else {
      builder.addFlowCode(`

`);
    }
    return builder.format(nodeProperty, type, output);
  }
}
var select = /* @__PURE__ */ nodeProxy(ConditionalNode).setParameterLength(2, 3);
addMethodChaining("select", select);

class ContextNode extends Node {
  static get type() {
    return "ContextNode";
  }
  constructor(node = null, value = {}) {
    super();
    this.isContextNode = true;
    this.node = node;
    this.value = value;
  }
  getScope() {
    return this.node.getScope();
  }
  generateNodeType(builder) {
    return this.node.getNodeType(builder);
  }
  getFlowContextData() {
    const children = [];
    this.traverse((node) => {
      if (node.isContextNode === true) {
        children.push(node.value);
      }
    });
    return Object.assign({}, ...children);
  }
  getMemberType(builder, name) {
    return this.node.getMemberType(builder, name);
  }
  analyze(builder) {
    const usageCount = builder.increaseUsage(this);
    if (usageCount === 1) {
      const previousContext = builder.addContext(this.value);
      this.node.build(builder, this);
      builder.setContext(previousContext);
    }
  }
  setup(builder) {
    const previousContext = builder.addContext(this.value);
    const node = this.node.build(builder);
    builder.setContext(previousContext);
    return node;
  }
  generate(builder, output) {
    const previousContext = builder.addContext(this.value);
    const snippet = this.node.build(builder, output);
    builder.setContext(previousContext);
    return snippet;
  }
}
var context = (nodeOrValue = null, value = {}) => {
  let node = nodeOrValue;
  if (node === null || node.isNode !== true) {
    value = node || value;
    node = null;
  }
  return new ContextNode(node, value);
};
var uniformFlow = (node) => context(node, { uniformFlow: true });
var setName = (node, name) => context(node, { nodeName: name });
function builtinShadowContext(shadowNode, light, node = null) {
  return context(node, {
    getShadow: ({ light: shadowLight, shadowColorNode }) => {
      if (light === shadowLight) {
        return shadowColorNode.mul(shadowNode);
      }
      return shadowColorNode;
    }
  });
}
function builtinAOContext(aoNode, node = null) {
  return context(node, {
    getAO: (inputNode, { material }) => {
      if (material.transparent === true)
        return inputNode;
      return inputNode !== null ? inputNode.mul(aoNode) : aoNode;
    }
  });
}
function builtinGIContext(aoNode, giNode, node = null) {
  const ao = aoNode.max(0.001);
  return context(node, {
    getAO: (inputNode, { material }) => {
      if (material.transparent === true)
        return inputNode;
      return inputNode !== null ? inputNode.mul(ao) : ao;
    },
    getGI: (inputNode, { material }) => {
      if (material.transparent === true)
        return inputNode;
      const gi = giNode.div(ao);
      return inputNode !== null ? inputNode.add(gi) : gi;
    }
  });
}
function label(node, name) {
  warn('TSL: "label()" has been deprecated. Use "setName()" instead.');
  return setName(node, name);
}
addMethodChaining("context", context);
addMethodChaining("label", label);
addMethodChaining("uniformFlow", uniformFlow);
addMethodChaining("setName", setName);
addMethodChaining("builtinShadowContext", (node, shadowNode, light) => builtinShadowContext(shadowNode, light, node));
addMethodChaining("builtinAOContext", (node, aoValue) => builtinAOContext(aoValue, node));
addMethodChaining("builtinGIContext", (node, aoValue, giValue) => builtinGIContext(aoValue, giValue, node));

class VarNode extends Node {
  static get type() {
    return "VarNode";
  }
  constructor(node, name = null, readOnly = false) {
    super();
    this.node = node;
    this.name = name;
    this.global = true;
    this.isVarNode = true;
    this.readOnly = readOnly;
    this.parents = true;
    this.intent = false;
  }
  setIntent(value) {
    this.intent = value;
    return this;
  }
  isIntent(builder) {
    const data = builder.getDataFromNode(this);
    if (data.forceDeclaration === true)
      return false;
    return this.intent;
  }
  getIntent() {
    return this.intent;
  }
  getMemberType(builder, name) {
    return this.node.getMemberType(builder, name);
  }
  getElementType(builder) {
    return this.node.getElementType(builder);
  }
  generateNodeType(builder) {
    return this.node.getNodeType(builder);
  }
  getArrayCount(builder) {
    return this.node.getArrayCount(builder);
  }
  isAssign(builder) {
    const data = builder.getDataFromNode(this);
    return data.assign;
  }
  build(...params) {
    const builder = params[0];
    const refNode = this.getShared(builder);
    if (this !== refNode) {
      return refNode.build(...params);
    }
    if (this._hasStack(builder) === false && builder.buildStage === "setup") {
      if (builder.context.nodeLoop || builder.context.nodeBlock) {
        let addBefore = false;
        if (this.node.isShaderCallNodeInternal && this.node.shaderNode.getLayout() === null) {
          if (builder.fnCall && builder.fnCall.shaderNode) {
            const shaderNodeData = builder.getDataFromNode(this.node.shaderNode);
            if (shaderNodeData.hasLoop) {
              const data = builder.getDataFromNode(this);
              data.forceDeclaration = true;
              addBefore = true;
            }
          }
        }
        const baseStack = builder.getBaseStack();
        if (addBefore) {
          baseStack.addToStackBefore(this);
        } else {
          baseStack.addToStack(this);
        }
      }
    }
    if (this.isIntent(builder)) {
      if (this.isAssign(builder) !== true) {
        return this.node.build(...params);
      }
    }
    return super.build(...params);
  }
  generate(builder) {
    const { node, name, readOnly } = this;
    const { renderer } = builder;
    const isWebGPUBackend = renderer.backend.isWebGPUBackend === true;
    let isDeterministic = false;
    let shouldTreatAsReadOnly = false;
    if (readOnly) {
      isDeterministic = builder.isDeterministic(node);
      shouldTreatAsReadOnly = isWebGPUBackend ? readOnly : isDeterministic;
    }
    const nodeType = this.getNodeType(builder);
    if (nodeType == "void") {
      if (this.isIntent(builder) !== true) {
        error('TSL: ".toVar()" can not be used with void type.', this.stackTrace);
      }
      const snippet = node.build(builder);
      return snippet;
    }
    const vectorType = builder.getVectorType(nodeType);
    const snippet = node.build(builder, vectorType);
    const nodeVar = builder.getVarFromNode(this, name, vectorType, undefined, shouldTreatAsReadOnly);
    const propertyName = builder.getPropertyName(nodeVar);
    let declarationPrefix = propertyName;
    if (shouldTreatAsReadOnly) {
      if (isWebGPUBackend) {
        declarationPrefix = isDeterministic ? `const ${propertyName}` : `let ${propertyName}`;
      } else {
        const count = node.getArrayCount(builder);
        declarationPrefix = `const ${builder.getVar(nodeVar.type, propertyName, count)}`;
      }
    }
    builder.addLineFlowCode(`${declarationPrefix} = ${snippet}`, this);
    return propertyName;
  }
  _hasStack(builder) {
    const nodeData = builder.getDataFromNode(this);
    return nodeData.stack !== undefined;
  }
}
var createVar = /* @__PURE__ */ nodeProxy(VarNode);
var Var = (node, name = null) => createVar(node, name).toStack();
var Const = (node, name = null) => createVar(node, name, true).toStack();
var VarIntent = (node) => {
  return createVar(node).setIntent(true).toStack();
};
addMethodChaining("toVar", Var);
addMethodChaining("toConst", Const);
addMethodChaining("toVarIntent", VarIntent);

class SubBuildNode extends Node {
  static get type() {
    return "SubBuild";
  }
  constructor(node, name, nodeType = null) {
    super(nodeType);
    this.node = node;
    this.name = name;
    this.isSubBuildNode = true;
  }
  generateNodeType(builder) {
    if (this.nodeType !== null)
      return this.nodeType;
    builder.addSubBuild(this.name);
    const nodeType = this.node.getNodeType(builder);
    builder.removeSubBuild();
    return nodeType;
  }
  build(builder, ...params) {
    builder.addSubBuild(this.name);
    const data = this.node.build(builder, ...params);
    builder.removeSubBuild();
    return data;
  }
}
var subBuild = (node, name, type = null) => new SubBuildNode(nodeObject(node), name, type);

class VaryingNode extends Node {
  static get type() {
    return "VaryingNode";
  }
  constructor(node, name = null) {
    super();
    this.node = subBuild(node, "VERTEX");
    this.name = name;
    this.isVaryingNode = true;
    this.interpolationType = null;
    this.interpolationSampling = null;
    this.global = true;
  }
  setInterpolation(type, sampling = null) {
    this.interpolationType = type;
    this.interpolationSampling = sampling;
    return this;
  }
  getHash(builder) {
    return this.name || super.getHash(builder);
  }
  generateNodeType(builder) {
    return this.node.getNodeType(builder);
  }
  setupVarying(builder) {
    const properties = builder.getNodeProperties(this);
    let varying = properties.varying;
    if (varying === undefined) {
      const name = this.name;
      const type = this.getNodeType(builder);
      const interpolationType = this.interpolationType;
      const interpolationSampling = this.interpolationSampling;
      properties.varying = varying = builder.getVaryingFromNode(this, name, type, interpolationType, interpolationSampling);
      properties.node = subBuild(this.node, "VERTEX");
    }
    varying.needsInterpolation || (varying.needsInterpolation = builder.shaderStage === "fragment");
    return varying;
  }
  setup(builder) {
    this.setupVarying(builder);
    builder.flowNodeFromShaderStage(NodeShaderStage.VERTEX, this.node);
  }
  analyze(builder) {
    this.setupVarying(builder);
    builder.flowNodeFromShaderStage(NodeShaderStage.VERTEX, this.node);
  }
  generate(builder) {
    const propertyKey = builder.getSubBuildProperty("property", builder.currentStack);
    const properties = builder.getNodeProperties(this);
    const varying = this.setupVarying(builder);
    if (properties[propertyKey] === undefined) {
      const type = this.getNodeType(builder);
      const propertyName = builder.getPropertyName(varying, NodeShaderStage.VERTEX);
      if (builder.shaderStage === NodeShaderStage.VERTEX) {
        const snippet = properties.node.build(builder, type);
        builder.addLineFlowCode(`${propertyName} = ${snippet}`, this);
      } else {
        builder.flowNodeFromShaderStage(NodeShaderStage.VERTEX, properties.node, type, propertyName);
      }
      properties[propertyKey] = propertyName;
    }
    return builder.getPropertyName(varying);
  }
}
var varying = /* @__PURE__ */ nodeProxy(VaryingNode).setParameterLength(1, 2);
var vertexStage = (node) => varying(node);
addMethodChaining("toVarying", varying);
addMethodChaining("toVertexStage", vertexStage);
var sRGBTransferEOTF = /* @__PURE__ */ Fn(([color]) => {
  const a = color.mul(0.9478672986).add(0.0521327014).pow(2.4);
  const b = color.mul(0.0773993808);
  const factor = color.lessThanEqual(0.04045);
  const rgbResult = mix(a, b, factor);
  return rgbResult;
}).setLayout({
  name: "sRGBTransferEOTF",
  type: "vec3",
  inputs: [
    { name: "color", type: "vec3" }
  ]
});
var sRGBTransferOETF = /* @__PURE__ */ Fn(([color]) => {
  const a = color.pow(0.41666).mul(1.055).sub(0.055);
  const b = color.mul(12.92);
  const factor = color.lessThanEqual(0.0031308);
  const rgbResult = mix(a, b, factor);
  return rgbResult;
}).setLayout({
  name: "sRGBTransferOETF",
  type: "vec3",
  inputs: [
    { name: "color", type: "vec3" }
  ]
});
var WORKING_COLOR_SPACE = "WorkingColorSpace";
var OUTPUT_COLOR_SPACE = "OutputColorSpace";

class ColorSpaceNode extends TempNode {
  static get type() {
    return "ColorSpaceNode";
  }
  constructor(colorNode, source, target) {
    super("vec4");
    this.colorNode = colorNode;
    this.source = source;
    this.target = target;
  }
  resolveColorSpace(builder, colorSpace) {
    if (colorSpace === WORKING_COLOR_SPACE) {
      return ColorManagement.workingColorSpace;
    } else if (colorSpace === OUTPUT_COLOR_SPACE) {
      return builder.context.outputColorSpace || builder.renderer.outputColorSpace;
    }
    return colorSpace;
  }
  setup(builder) {
    const { colorNode } = this;
    const source = this.resolveColorSpace(builder, this.source);
    const target = this.resolveColorSpace(builder, this.target);
    let outputNode = colorNode;
    if (ColorManagement.enabled === false || source === target || !source || !target) {
      return outputNode;
    }
    if (ColorManagement.getTransfer(source) === SRGBTransfer) {
      outputNode = vec4(sRGBTransferEOTF(outputNode.rgb), outputNode.a);
    }
    if (ColorManagement.getPrimaries(source) !== ColorManagement.getPrimaries(target)) {
      outputNode = vec4(mat3(ColorManagement._getMatrix(new Matrix3, source, target)).mul(outputNode.rgb), outputNode.a);
    }
    if (ColorManagement.getTransfer(target) === SRGBTransfer) {
      outputNode = vec4(sRGBTransferOETF(outputNode.rgb), outputNode.a);
    }
    return outputNode;
  }
}
var workingToColorSpace = (node, targetColorSpace) => new ColorSpaceNode(nodeObject(node), WORKING_COLOR_SPACE, targetColorSpace);
var colorSpaceToWorking = (node, sourceColorSpace) => new ColorSpaceNode(nodeObject(node), sourceColorSpace, WORKING_COLOR_SPACE);
addMethodChaining("workingToColorSpace", workingToColorSpace);
addMethodChaining("colorSpaceToWorking", colorSpaceToWorking);

class ReferenceElementNode extends ArrayElementNode {
  static get type() {
    return "ReferenceElementNode";
  }
  constructor(referenceNode, indexNode) {
    super(referenceNode, indexNode);
    this.referenceNode = referenceNode;
    this.isReferenceElementNode = true;
  }
  generateNodeType() {
    return this.referenceNode.uniformType;
  }
  generate(builder) {
    const snippet = super.generate(builder);
    const arrayType = this.referenceNode.getNodeType(builder);
    const elementType = this.getNodeType(builder);
    return builder.format(snippet, arrayType, elementType);
  }
}

class ReferenceBaseNode extends Node {
  static get type() {
    return "ReferenceBaseNode";
  }
  constructor(property, uniformType, object = null, count = null) {
    super();
    this.property = property;
    this.uniformType = uniformType;
    this.object = object;
    this.count = count;
    this.properties = property.split(".");
    this.reference = object;
    this.node = null;
    this.group = null;
    this.updateType = NodeUpdateType.OBJECT;
  }
  setGroup(group) {
    this.group = group;
    return this;
  }
  element(indexNode) {
    return new ReferenceElementNode(this, nodeObject(indexNode));
  }
  setNodeType(uniformType) {
    const node = uniform(null, uniformType);
    if (this.group !== null) {
      node.setGroup(this.group);
    }
    this.node = node;
  }
  generateNodeType(builder) {
    if (this.node === null) {
      this.updateReference(builder);
      this.updateValue();
    }
    return this.node.getNodeType(builder);
  }
  getValueFromReference(object = this.reference) {
    const { properties } = this;
    let value = object[properties[0]];
    for (let i = 1;i < properties.length; i++) {
      value = value[properties[i]];
    }
    return value;
  }
  updateReference(state) {
    this.reference = this.object !== null ? this.object : state.object;
    return this.reference;
  }
  setup() {
    this.updateValue();
    return this.node;
  }
  update() {
    this.updateValue();
  }
  updateValue() {
    if (this.node === null)
      this.setNodeType(this.uniformType);
    const value = this.getValueFromReference();
    if (Array.isArray(value)) {
      this.node.array = value;
    } else {
      this.node.value = value;
    }
  }
}
class RendererReferenceNode extends ReferenceBaseNode {
  static get type() {
    return "RendererReferenceNode";
  }
  constructor(property, inputType, renderer = null) {
    super(property, inputType, renderer);
    this.renderer = renderer;
    this.setGroup(renderGroup);
  }
  updateReference(state) {
    this.reference = this.renderer !== null ? this.renderer : state.renderer;
    return this.reference;
  }
}
var rendererReference = (name, type, renderer = null) => new RendererReferenceNode(name, type, renderer);

class ToneMappingNode extends TempNode {
  static get type() {
    return "ToneMappingNode";
  }
  constructor(toneMapping, exposureNode = toneMappingExposure, colorNode = null) {
    super("vec3");
    this._toneMapping = toneMapping;
    this.exposureNode = exposureNode;
    this.colorNode = colorNode;
  }
  customCacheKey() {
    return hash$1(this._toneMapping);
  }
  setToneMapping(value) {
    this._toneMapping = value;
    return this;
  }
  getToneMapping() {
    return this._toneMapping;
  }
  setup(builder) {
    const colorNode = this.colorNode || builder.context.color;
    const toneMapping = this._toneMapping;
    if (toneMapping === NoToneMapping)
      return colorNode;
    let outputNode = null;
    const toneMappingFn = builder.renderer.library.getToneMappingFunction(toneMapping);
    if (toneMappingFn !== null) {
      outputNode = vec4(toneMappingFn(colorNode.rgb, this.exposureNode), colorNode.a);
    } else {
      error("ToneMappingNode: Unsupported Tone Mapping configuration.", toneMapping);
      outputNode = colorNode;
    }
    return outputNode;
  }
}
var toneMapping = (mapping, exposure, color) => new ToneMappingNode(mapping, nodeObject(exposure), nodeObject(color));
var toneMappingExposure = /* @__PURE__ */ rendererReference("toneMappingExposure", "float");
addMethodChaining("toneMapping", (color, mapping, exposure) => toneMapping(mapping, exposure, color));
var _bufferLib = new WeakMap;
function _getBufferAttribute(value, itemSize) {
  let buffer = _bufferLib.get(value);
  if (buffer === undefined) {
    buffer = new InterleavedBuffer(value, itemSize);
    _bufferLib.set(value, buffer);
  }
  return buffer;
}

class BufferAttributeNode extends InputNode {
  static get type() {
    return "BufferAttributeNode";
  }
  constructor(value, bufferType = null, bufferStride = 0, bufferOffset = 0) {
    super(value, bufferType);
    this.isBufferNode = true;
    this.bufferType = bufferType;
    this.bufferStride = bufferStride;
    this.bufferOffset = bufferOffset;
    this.usage = StaticDrawUsage;
    this.instanced = false;
    this.attribute = null;
    this.global = true;
    if (value && value.isBufferAttribute === true && value.itemSize <= 4) {
      this.attribute = value;
      this.usage = value.usage;
      this.instanced = value.isInstancedBufferAttribute;
    }
  }
  getHash(builder) {
    let id;
    if (this.bufferStride === 0 && this.bufferOffset === 0) {
      let bufferData = builder.globalCache.getData(this.value);
      if (bufferData === undefined) {
        bufferData = {
          node: this
        };
        builder.globalCache.setData(this.value, bufferData);
      }
      id = bufferData.node.id;
    } else {
      id = this.id;
    }
    return String(id);
  }
  generateNodeType(builder) {
    if (this.bufferType === null) {
      this.bufferType = builder.getTypeFromAttribute(this.attribute);
    }
    return this.bufferType;
  }
  setup(builder) {
    if (this.attribute !== null)
      return;
    const type = this.getNodeType(builder);
    const itemSize = builder.getTypeLength(type);
    const value = this.value;
    const stride = this.bufferStride || itemSize;
    const offset = this.bufferOffset;
    let buffer;
    if (value.isInterleavedBuffer === true) {
      buffer = value;
    } else if (value.isBufferAttribute === true) {
      buffer = _getBufferAttribute(value.array, stride);
    } else {
      buffer = _getBufferAttribute(value, stride);
    }
    const bufferAttribute = new InterleavedBufferAttribute(buffer, itemSize, offset);
    buffer.setUsage(this.usage);
    this.attribute = bufferAttribute;
    this.attribute.isInstancedBufferAttribute = this.instanced;
  }
  generate(builder) {
    const nodeType = this.getNodeType(builder);
    const nodeName = builder.context.nodeName;
    if (nodeName !== undefined)
      delete builder.context.nodeName;
    const nodeAttribute = builder.getBufferAttributeFromNode(this, nodeType, nodeName);
    const propertyName = builder.getPropertyName(nodeAttribute);
    let output = null;
    if (builder.shaderStage === "vertex" || builder.shaderStage === "compute") {
      this.name = propertyName;
      output = propertyName;
    } else {
      let varyingName;
      if (nodeName) {
        varyingName = nodeName + "Varying";
      }
      const nodeVarying = varying(this, varyingName);
      output = nodeVarying.build(builder, nodeType);
    }
    return output;
  }
  getInputType() {
    return "bufferAttribute";
  }
  setUsage(value) {
    this.usage = value;
    if (this.attribute && this.attribute.isBufferAttribute === true) {
      this.attribute.usage = value;
    }
    return this;
  }
  setInstanced(value) {
    this.instanced = value;
    return this;
  }
}
function createBufferAttribute(array, type = null, stride = 0, offset = 0, usage = StaticDrawUsage, instanced = false) {
  if (type === "mat3" || type === null && array.itemSize === 9) {
    return mat3(new BufferAttributeNode(array, "vec3", 9, 0).setUsage(usage).setInstanced(instanced), new BufferAttributeNode(array, "vec3", 9, 3).setUsage(usage).setInstanced(instanced), new BufferAttributeNode(array, "vec3", 9, 6).setUsage(usage).setInstanced(instanced));
  } else if (type === "mat4" || type === null && array.itemSize === 16) {
    return mat4(new BufferAttributeNode(array, "vec4", 16, 0).setUsage(usage).setInstanced(instanced), new BufferAttributeNode(array, "vec4", 16, 4).setUsage(usage).setInstanced(instanced), new BufferAttributeNode(array, "vec4", 16, 8).setUsage(usage).setInstanced(instanced), new BufferAttributeNode(array, "vec4", 16, 12).setUsage(usage).setInstanced(instanced));
  }
  return new BufferAttributeNode(array, type, stride, offset).setUsage(usage);
}
var bufferAttribute = (array, type = null, stride = 0, offset = 0) => createBufferAttribute(array, type, stride, offset);
addMethodChaining("toAttribute", (bufferNode) => bufferAttribute(bufferNode.value, bufferNode.bufferType));

class IndexNode extends Node {
  static get type() {
    return "IndexNode";
  }
  constructor(scope) {
    super("uint");
    this.scope = scope;
    this.isIndexNode = true;
  }
  generate(builder) {
    const nodeType = this.getNodeType(builder);
    const scope = this.scope;
    let propertyName;
    if (scope === IndexNode.VERTEX) {
      propertyName = builder.getVertexIndex();
    } else if (scope === IndexNode.INSTANCE) {
      propertyName = builder.getInstanceIndex();
    } else if (scope === IndexNode.DRAW) {
      propertyName = builder.getDrawIndex();
    } else if (scope === IndexNode.INVOCATION_LOCAL) {
      propertyName = builder.getInvocationLocalIndex();
    } else if (scope === IndexNode.INVOCATION_SUBGROUP) {
      propertyName = builder.getInvocationSubgroupIndex();
    } else if (scope === IndexNode.SUBGROUP) {
      propertyName = builder.getSubgroupIndex();
    } else {
      throw new Error("THREE.IndexNode: Unknown scope: " + scope);
    }
    let output;
    if (builder.shaderStage === "vertex" || builder.shaderStage === "compute") {
      output = propertyName;
    } else {
      const nodeVarying = varying(this);
      output = nodeVarying.build(builder, nodeType);
    }
    return output;
  }
}
IndexNode.VERTEX = "vertex";
IndexNode.INSTANCE = "instance";
IndexNode.SUBGROUP = "subgroup";
IndexNode.INVOCATION_LOCAL = "invocationLocal";
IndexNode.INVOCATION_SUBGROUP = "invocationSubgroup";
IndexNode.DRAW = "draw";
var vertexIndex = /* @__PURE__ */ nodeImmutable(IndexNode, IndexNode.VERTEX);
var instanceIndex = /* @__PURE__ */ nodeImmutable(IndexNode, IndexNode.INSTANCE);
var subgroupIndex = /* @__PURE__ */ nodeImmutable(IndexNode, IndexNode.SUBGROUP);
var invocationSubgroupIndex = /* @__PURE__ */ nodeImmutable(IndexNode, IndexNode.INVOCATION_SUBGROUP);
var invocationLocalIndex = /* @__PURE__ */ nodeImmutable(IndexNode, IndexNode.INVOCATION_LOCAL);
var drawIndex = /* @__PURE__ */ nodeImmutable(IndexNode, IndexNode.DRAW);

class ComputeNode extends Node {
  static get type() {
    return "ComputeNode";
  }
  constructor(computeNode, workgroupSize) {
    super("void");
    this.isComputeNode = true;
    this.computeNode = computeNode;
    this.workgroupSize = workgroupSize;
    this.count = null;
    this.dispatchSize = null;
    this.version = 1;
    this.name = "";
    this.onInitFunction = null;
    this.countNode = null;
    this.updateBeforeType = NodeUpdateType.FRAME;
  }
  setName(name) {
    this.name = name;
    return this;
  }
  label(name) {
    warn('TSL: "label()" has been deprecated. Use "setName()" instead.', new StackTrace);
    return this.setName(name);
  }
  onInit(callback) {
    this.onInitFunction = callback;
    return this;
  }
  getUpdateBeforeType(frame) {
    return frame.compute !== this ? this.updateBeforeType : NodeUpdateType.NONE;
  }
  updateBefore({ renderer }) {
    renderer.compute(this);
  }
  setup(builder) {
    if (this.count !== null && this.countNode === null) {
      this.countNode = uniform(this.count, "uint").onObjectUpdate(() => this.count);
    }
    const result = this.computeNode.build(builder);
    if (result) {
      const properties = builder.getNodeProperties(this);
      properties.outputComputeNode = result.outputNode;
      result.outputNode = null;
    }
    return result;
  }
  generate(builder, output) {
    const { shaderStage } = builder;
    if (shaderStage === "compute") {
      const snippet = this.computeNode.build(builder, "void");
      if (snippet !== "") {
        builder.addLineFlowCode(snippet, this);
      }
      if (this.count !== null && builder.allowEarlyReturns === true) {
        const countSnippet = this.countNode.build(builder, "uint");
        const indexSnippet = instanceIndex.build(builder, "uint");
        builder.flow.code = `${builder.tab}if ( ${indexSnippet} >= ${countSnippet} ) { return; }

${builder.flow.code}`;
      }
    } else {
      const properties = builder.getNodeProperties(this);
      const outputComputeNode = properties.outputComputeNode;
      if (outputComputeNode) {
        return outputComputeNode.build(builder, output);
      }
    }
  }
}
var computeKernel = (node, workgroupSize = [64]) => {
  if (workgroupSize.length === 0 || workgroupSize.length > 3) {
    error("TSL: compute() workgroupSize must have 1, 2, or 3 elements", new StackTrace);
  }
  for (let i = 0;i < workgroupSize.length; i++) {
    const val = workgroupSize[i];
    if (typeof val !== "number" || val <= 0 || !Number.isInteger(val)) {
      error(`TSL: compute() workgroupSize element at index [ ${i} ] must be a positive integer`, new StackTrace);
    }
  }
  while (workgroupSize.length < 3)
    workgroupSize.push(1);
  return new ComputeNode(nodeObject(node), workgroupSize);
};
var compute = (node, count, workgroupSize) => {
  const computeNode = computeKernel(node, workgroupSize);
  if (typeof count === "number") {
    computeNode.count = count;
  } else {
    computeNode.dispatchSize = count;
  }
  return computeNode;
};
addMethodChaining("compute", compute);
addMethodChaining("computeKernel", computeKernel);

class IsolateNode extends Node {
  static get type() {
    return "IsolateNode";
  }
  constructor(node, parent = true) {
    super();
    this.node = node;
    this.parent = parent;
    this.isIsolateNode = true;
  }
  generateNodeType(builder) {
    const previousCache = builder.getCache();
    const cache = builder.getCacheFromNode(this, this.parent);
    builder.setCache(cache);
    const nodeType = this.node.getNodeType(builder);
    builder.setCache(previousCache);
    return nodeType;
  }
  build(builder, ...params) {
    const previousCache = builder.getCache();
    const cache = builder.getCacheFromNode(this, this.parent);
    builder.setCache(cache);
    const data = this.node.build(builder, ...params);
    builder.setCache(previousCache);
    return data;
  }
  setParent(parent) {
    this.parent = parent;
    return this;
  }
  getParent() {
    return this.parent;
  }
}
var isolate = (node) => new IsolateNode(nodeObject(node));
function cache(node, parent = true) {
  warn('TSL: "cache()" has been deprecated. Use "isolate()" instead.');
  return isolate(node).setParent(parent);
}
addMethodChaining("cache", cache);
addMethodChaining("isolate", isolate);

class BypassNode extends Node {
  static get type() {
    return "BypassNode";
  }
  constructor(outputNode, callNode) {
    super();
    this.isBypassNode = true;
    this.outputNode = outputNode;
    this.callNode = callNode;
  }
  generateNodeType(builder) {
    return this.outputNode.getNodeType(builder);
  }
  generate(builder) {
    const snippet = this.callNode.build(builder, "void");
    if (snippet !== "") {
      builder.addLineFlowCode(snippet, this);
    }
    return this.outputNode.build(builder);
  }
}
var bypass = /* @__PURE__ */ nodeProxy(BypassNode).setParameterLength(2);
addMethodChaining("bypass", bypass);
var remap = /* @__PURE__ */ Fn(([node, inLowNode, inHighNode, outLowNode = float(0), outHighNode = float(1), doClamp = bool(false)]) => {
  let t = node.sub(inLowNode).div(inHighNode.sub(inLowNode));
  if (defined(doClamp))
    t = t.clamp();
  return t.mul(outHighNode.sub(outLowNode)).add(outLowNode);
});
function remapClamp(node, inLowNode, inHighNode, outLowNode = float(0), outHighNode = float(1)) {
  return remap(node, inLowNode, inHighNode, outLowNode, outHighNode, true);
}
addMethodChaining("remap", remap);
addMethodChaining("remapClamp", remapClamp);

class ExpressionNode extends Node {
  static get type() {
    return "ExpressionNode";
  }
  constructor(snippet = "", nodeType = "void") {
    super(nodeType);
    this.snippet = snippet;
  }
  generate(builder, output) {
    const type = this.getNodeType(builder);
    const snippet = this.snippet;
    if (type === "void") {
      builder.addLineFlowCode(snippet, this);
    } else {
      return builder.format(snippet, type, output);
    }
  }
}
var expression = /* @__PURE__ */ nodeProxy(ExpressionNode).setParameterLength(1, 2);
var Discard = (conditional) => (conditional ? select(conditional, expression("discard")) : expression("discard")).toStack();
addMethodChaining("discard", Discard);
var premultiplyAlpha = /* @__PURE__ */ Fn(([color]) => {
  return vec4(color.rgb.mul(color.a), color.a);
}, { color: "vec4", return: "vec4" });
var unpremultiplyAlpha = /* @__PURE__ */ Fn(([color]) => {
  return color.a.equal(0).select(vec4(0), vec4(color.rgb.div(color.a), color.a));
}, { color: "vec4", return: "vec4" });

class RenderOutputNode extends TempNode {
  static get type() {
    return "RenderOutputNode";
  }
  constructor(colorNode, toneMapping, outputColorSpace) {
    super("vec4");
    this.colorNode = colorNode;
    this._toneMapping = toneMapping;
    this.outputColorSpace = outputColorSpace;
    this.isRenderOutputNode = true;
  }
  setToneMapping(value) {
    this._toneMapping = value;
    return this;
  }
  getToneMapping() {
    return this._toneMapping;
  }
  setup({ context }) {
    let outputNode = this.colorNode || context.color;
    outputNode = vec4(outputNode.rgb, outputNode.a.clamp(0, 1));
    outputNode = unpremultiplyAlpha(outputNode);
    const toneMapping = (this._toneMapping !== null ? this._toneMapping : context.toneMapping) || NoToneMapping;
    const outputColorSpace = (this.outputColorSpace !== null ? this.outputColorSpace : context.outputColorSpace) || NoColorSpace;
    if (toneMapping !== NoToneMapping) {
      outputNode = outputNode.toneMapping(toneMapping);
    }
    if (outputColorSpace !== NoColorSpace && outputColorSpace !== ColorManagement.workingColorSpace) {
      outputNode = outputNode.workingToColorSpace(outputColorSpace);
    }
    outputNode = premultiplyAlpha(outputNode);
    return outputNode;
  }
}
var renderOutput = (color, toneMapping = null, outputColorSpace = null) => new RenderOutputNode(nodeObject(color), toneMapping, outputColorSpace);
addMethodChaining("renderOutput", renderOutput);

class DebugNode extends TempNode {
  static get type() {
    return "DebugNode";
  }
  constructor(node, callback = null) {
    super();
    this.node = node;
    this.callback = callback;
  }
  generateNodeType(builder) {
    return this.node.getNodeType(builder);
  }
  setup(builder) {
    return this.node.build(builder);
  }
  analyze(builder) {
    return this.node.build(builder);
  }
  generate(builder) {
    const callback = this.callback;
    const snippet = this.node.build(builder);
    if (callback !== null) {
      callback(builder, snippet);
    } else {
      const title = "--- TSL debug - " + builder.shaderStage + " shader ---";
      const border = "-".repeat(title.length);
      let code = "";
      code += "// #" + title + `#
`;
      code += builder.flow.code.replace(/^\t/mg, "") + `
`;
      code += "/* ... */ " + snippet + ` /* ... */
`;
      code += "// #" + border + `#
`;
      log(code);
    }
    return snippet;
  }
}
var debug = (node, callback = null) => new DebugNode(nodeObject(node), callback).toStack();
addMethodChaining("debug", debug);

class InspectorBase extends EventDispatcher {
  constructor() {
    super();
    this._renderer = null;
    this.currentFrame = null;
    this.isRunning = false;
    this.enabled = true;
  }
  get nodeFrame() {
    return this._renderer._nodes.nodeFrame;
  }
  setRenderer(renderer) {
    this._renderer = renderer;
    return this;
  }
  getRenderer() {
    return this._renderer;
  }
  begin() {
    this.isRunning = true;
  }
  finish() {
    this.isRunning = false;
  }
  inspect() {}
  computeAsync() {}
  beginCompute() {}
  finishCompute() {}
  beginRender() {}
  finishRender() {}
  copyTextureToTexture() {}
  copyFramebufferToTexture() {}
  dispose() {
    if (this.isRunning === true)
      this.finish();
    this.dispatchEvent({ type: "dispose" });
  }
}

class InspectorNode extends Node {
  static get type() {
    return "InspectorNode";
  }
  constructor(node, name = "", callback = null) {
    super();
    this.node = node;
    this.name = name;
    this.callback = callback;
    this.updateType = NodeUpdateType.FRAME;
    this.isInspectorNode = true;
  }
  getName() {
    return this.name || this.node.name;
  }
  update(frame) {
    frame.renderer.inspector.inspect(this);
  }
  generateNodeType(builder) {
    return this.node.getNodeType(builder);
  }
  setup(builder) {
    let node = this.node;
    if (builder.context.inspector === true && this.callback !== null) {
      node = this.callback(node);
    }
    if (builder.renderer.backend.isWebGPUBackend !== true && builder.renderer.inspector.constructor !== InspectorBase) {
      warnOnce('TSL: ".toInspector()" is only available with WebGPU.');
    }
    return node;
  }
}
function inspect(node, name = "", callback = null) {
  node = nodeObject(node);
  return node.before(new InspectorNode(node, name, callback));
}
addMethodChaining("toInspector", inspect);
class AttributeNode extends Node {
  static get type() {
    return "AttributeNode";
  }
  constructor(attributeName, nodeType = null) {
    super(nodeType);
    this.global = true;
    this._attributeName = attributeName;
  }
  getHash(builder) {
    return this.getAttributeName(builder);
  }
  generateNodeType(builder) {
    let nodeType = this.nodeType;
    if (nodeType === null) {
      const attributeName = this.getAttributeName(builder);
      if (builder.hasGeometryAttribute(attributeName)) {
        const attribute = builder.geometry.getAttribute(attributeName);
        nodeType = builder.getTypeFromAttribute(attribute);
      } else {
        nodeType = "float";
      }
    }
    return nodeType;
  }
  setAttributeName(attributeName) {
    this._attributeName = attributeName;
    return this;
  }
  getAttributeName() {
    return this._attributeName;
  }
  generate(builder) {
    const attributeName = this.getAttributeName(builder);
    const nodeType = this.getNodeType(builder);
    const geometryAttribute = builder.hasGeometryAttribute(attributeName);
    if (geometryAttribute === true) {
      const attribute = builder.geometry.getAttribute(attributeName);
      const attributeType = builder.getTypeFromAttribute(attribute);
      const nodeAttribute = builder.getAttribute(attributeName, attributeType);
      if (builder.shaderStage === "vertex") {
        return builder.format(nodeAttribute.name, attributeType, nodeType);
      } else {
        const nodeVarying = varying(this);
        return nodeVarying.build(builder, nodeType);
      }
    } else {
      warn(`AttributeNode: Vertex attribute "${attributeName}" not found on geometry.`);
      return builder.generateConst(nodeType);
    }
  }
  serialize(data) {
    super.serialize(data);
    data.global = this.global;
    data._attributeName = this._attributeName;
  }
  deserialize(data) {
    super.deserialize(data);
    this.global = data.global;
    this._attributeName = data._attributeName;
  }
}
var attribute = (name, nodeType = null) => new AttributeNode(name, nodeType);
var uv$1 = (index = 0) => attribute("uv" + (index > 0 ? index : ""), "vec2");

class TextureSizeNode extends Node {
  static get type() {
    return "TextureSizeNode";
  }
  constructor(textureNode, levelNode = null) {
    super("uvec2");
    this.isTextureSizeNode = true;
    this.textureNode = textureNode;
    this.levelNode = levelNode;
  }
  generate(builder) {
    const textureProperty = this.textureNode.build(builder, "property");
    const level = this.levelNode === null ? "0" : this.levelNode.build(builder, "int");
    const snippet = builder.generateTextureSize(this.textureNode.value, textureProperty, level);
    return builder.format(snippet, this.getNodeType(builder));
  }
}
var textureSize = /* @__PURE__ */ nodeProxy(TextureSizeNode).setParameterLength(1, 2);

class MaxMipLevelNode extends UniformNode {
  static get type() {
    return "MaxMipLevelNode";
  }
  constructor(textureNode) {
    super(0);
    this._textureNode = textureNode;
    this.updateType = NodeUpdateType.FRAME;
  }
  get textureNode() {
    return this._textureNode;
  }
  get texture() {
    return this._textureNode.value;
  }
  update() {
    const texture = this.texture;
    const images = texture.images;
    const image = images && images.length > 0 ? images[0] && images[0].image || images[0] : texture.image;
    if (image && image.width !== undefined) {
      const { width, height } = image;
      this.value = Math.log2(Math.max(width, height));
    }
  }
}
var maxMipLevel = /* @__PURE__ */ nodeProxy(MaxMipLevelNode).setParameterLength(1);

class NodeError extends Error {
  constructor(message, stackTrace = null) {
    super(message);
    this.name = "NodeError";
    this.stackTrace = stackTrace;
  }
}
var EmptyTexture$1 = /* @__PURE__ */ new Texture;

class TextureNode extends UniformNode {
  static get type() {
    return "TextureNode";
  }
  constructor(value = EmptyTexture$1, uvNode = null, levelNode = null, biasNode = null) {
    super(value);
    this.isTextureNode = true;
    this.uvNode = uvNode;
    this.levelNode = levelNode;
    this.biasNode = biasNode;
    this.compareNode = null;
    this.depthNode = null;
    this.gradNode = null;
    this.gatherNode = null;
    this.offsetNode = null;
    this.sampler = true;
    this.updateMatrix = false;
    this.updateType = NodeUpdateType.NONE;
    this.referenceNode = null;
    this._value = value;
    this._matrixUniform = null;
    this._flipYUniform = null;
    this._samplerComparison = false;
    this.setUpdateMatrix(uvNode === null);
  }
  set value(value) {
    if (this.referenceNode) {
      this.referenceNode.value = value;
    } else {
      this._value = value;
    }
  }
  get value() {
    return this.referenceNode ? this.referenceNode.value : this._value;
  }
  getUniformHash() {
    return this.value.uuid;
  }
  generateNodeType() {
    if (this.gatherNode !== null) {
      return "vec4";
    }
    return getTextureType(this.value);
  }
  getInputType() {
    return "texture";
  }
  getDefaultUV() {
    return uv$1(this.value.channel);
  }
  updateReference() {
    return this.value;
  }
  getTransformedUV(uvNode) {
    if (this._matrixUniform === null)
      this._matrixUniform = uniform(this.value.matrix);
    return this._matrixUniform.mul(vec3(uvNode, 1)).xy;
  }
  setUpdateMatrix(value) {
    this.updateMatrix = value;
    return this;
  }
  setupUV(builder, uvNode) {
    if (builder.isFlipY()) {
      if (this._flipYUniform === null)
        this._flipYUniform = uniform(false);
      uvNode = uvNode.toVar();
      if (this.sampler) {
        uvNode = this._flipYUniform.select(uvNode.flipY(), uvNode);
      } else {
        uvNode = this._flipYUniform.select(uvNode.setY(int(textureSize(this, this.levelNode).y).sub(uvNode.y).sub(1)), uvNode);
      }
    }
    return uvNode;
  }
  setup(builder) {
    const properties = builder.getNodeProperties(this);
    properties.referenceNode = this.referenceNode;
    const texture = this.value;
    if (!texture || texture.isTexture !== true) {
      throw new NodeError("THREE.TSL: `texture( value )` function expects a valid instance of THREE.Texture().", this.stackTrace);
    }
    const uvNode = Fn(() => {
      let uvNode = this.uvNode;
      if ((uvNode === null || builder.context.forceUVContext === true) && builder.context.getUV) {
        uvNode = builder.context.getUV(this, builder);
      }
      if (!uvNode)
        uvNode = this.getDefaultUV();
      if (this.updateMatrix === true) {
        uvNode = this.getTransformedUV(uvNode);
      }
      uvNode = this.setupUV(builder, uvNode);
      this.updateType = this._matrixUniform !== null || this._flipYUniform !== null ? NodeUpdateType.OBJECT : NodeUpdateType.NONE;
      return uvNode;
    })();
    let levelNode = this.levelNode;
    if (levelNode === null && builder.context.getTextureLevel) {
      levelNode = builder.context.getTextureLevel(this);
    }
    let compareNode = null;
    let compareStepNode = null;
    if (this.compareNode !== null) {
      if (builder.renderer.hasCompatibility(Compatibility.TEXTURE_COMPARE)) {
        compareNode = this.compareNode;
      } else {
        const compareFunction = texture.compareFunction;
        if (compareFunction === null || compareFunction === LessCompare || compareFunction === LessEqualCompare || compareFunction === GreaterCompare || compareFunction === GreaterEqualCompare) {
          compareStepNode = this.compareNode;
        } else {
          compareNode = this.compareNode;
          warnOnce('TSL: Only "LessCompare", "LessEqualCompare", "GreaterCompare" and "GreaterEqualCompare" are supported for depth texture comparison fallback.');
        }
      }
    }
    properties.uvNode = uvNode;
    properties.levelNode = levelNode;
    properties.biasNode = this.biasNode;
    properties.compareNode = compareNode;
    properties.compareStepNode = compareStepNode;
    properties.gradNode = this.gradNode;
    properties.gatherNode = this.gatherNode;
    properties.depthNode = this.depthNode;
    properties.offsetNode = this.offsetNode;
  }
  generateUV(builder, uvNode) {
    return uvNode.build(builder, this.sampler === true ? "vec2" : "ivec2");
  }
  generateOffset(builder, offsetNode) {
    return offsetNode.build(builder, "ivec2");
  }
  generateSnippet(builder, textureProperty, uvSnippet, levelSnippet, biasSnippet, depthSnippet, compareSnippet, gradSnippet, gatherSnippet, offsetSnippet, flipYSnippet) {
    const texture = this.value;
    let snippet;
    if (biasSnippet) {
      snippet = builder.generateTextureBias(texture, textureProperty, uvSnippet, biasSnippet, depthSnippet, offsetSnippet);
    } else if (gradSnippet) {
      snippet = builder.generateTextureGrad(texture, textureProperty, uvSnippet, gradSnippet, depthSnippet, offsetSnippet);
    } else if (gatherSnippet) {
      if (compareSnippet) {
        snippet = builder.generateTextureGatherCompare(texture, textureProperty, uvSnippet, compareSnippet, depthSnippet, offsetSnippet, flipYSnippet);
      } else {
        snippet = builder.generateTextureGather(texture, textureProperty, uvSnippet, gatherSnippet, depthSnippet, offsetSnippet, flipYSnippet);
      }
    } else if (compareSnippet) {
      snippet = builder.generateTextureCompare(texture, textureProperty, uvSnippet, compareSnippet, depthSnippet, offsetSnippet);
    } else if (this.sampler === false) {
      snippet = builder.generateTextureLoad(texture, textureProperty, uvSnippet, levelSnippet, depthSnippet, offsetSnippet);
    } else if (levelSnippet) {
      snippet = builder.generateTextureLevel(texture, textureProperty, uvSnippet, levelSnippet, depthSnippet, offsetSnippet);
    } else {
      snippet = builder.generateTexture(texture, textureProperty, uvSnippet, depthSnippet, offsetSnippet);
    }
    return snippet;
  }
  generate(builder, output) {
    const texture = this.value;
    const properties = builder.getNodeProperties(this);
    const textureProperty = super.generate(builder, "property");
    if (/^sampler/.test(output)) {
      if (output === "samplerComparison") {
        this._samplerComparison = true;
        const sharedNode = this.getSharedNode(builder);
        sharedNode._samplerComparison = true;
      }
      return textureProperty + "_sampler";
    } else if (builder.isReference(output)) {
      return textureProperty;
    } else {
      const nodeData = builder.getDataFromNode(this);
      const nodeType = this.getNodeType(builder);
      let propertyName = nodeData.propertyName;
      if (propertyName === undefined) {
        const { uvNode, levelNode, biasNode, compareNode, compareStepNode, depthNode, gradNode, gatherNode, offsetNode } = properties;
        const uvSnippet = this.generateUV(builder, uvNode);
        const levelSnippet = levelNode ? levelNode.build(builder, "float") : null;
        const biasSnippet = biasNode ? biasNode.build(builder, "float") : null;
        const depthSnippet = depthNode ? depthNode.build(builder, "int") : null;
        const compareSnippet = compareNode ? compareNode.build(builder, "float") : null;
        const compareStepSnippet = compareStepNode ? compareStepNode.build(builder, "float") : null;
        const gradSnippet = gradNode ? [gradNode[0].build(builder, "vec2"), gradNode[1].build(builder, "vec2")] : null;
        const gatherSnippet = gatherNode ? gatherNode.build(builder, "int") : null;
        const offsetSnippet = offsetNode ? this.generateOffset(builder, offsetNode) : null;
        const flipYSnippet = this._flipYUniform ? this._flipYUniform.build(builder, "bool") : null;
        let finalDepthSnippet = depthSnippet;
        if (finalDepthSnippet === null && texture.isArrayTexture && this.isTexture3DNode !== true) {
          finalDepthSnippet = "0";
        }
        const nodeVar = builder.getVarFromNode(this);
        propertyName = builder.getPropertyName(nodeVar);
        let snippet = this.generateSnippet(builder, textureProperty, uvSnippet, levelSnippet, biasSnippet, finalDepthSnippet, compareSnippet, gradSnippet, gatherSnippet, offsetSnippet, flipYSnippet);
        let snippetType;
        if (texture.isDepthTexture === true && gatherSnippet === null) {
          snippetType = "float";
        } else {
          snippetType = texture.type === UnsignedIntType ? "uvec4" : texture.type === IntType ? "ivec4" : "vec4";
        }
        snippet = builder.format(snippet, snippetType, nodeType);
        if (compareStepSnippet !== null) {
          const compareFunction = texture.compareFunction;
          if (compareFunction === GreaterCompare || compareFunction === GreaterEqualCompare) {
            snippet = step(expression(snippet, nodeType), expression(compareStepSnippet, "float")).build(builder, nodeType);
          } else {
            snippet = step(expression(compareStepSnippet, "float"), expression(snippet, nodeType)).build(builder, nodeType);
          }
        }
        builder.addLineFlowCode(`${propertyName} = ${snippet}`, this);
        nodeData.snippet = snippet;
        nodeData.propertyName = propertyName;
      }
      let snippet = propertyName;
      if (builder.needsToWorkingColorSpace(texture)) {
        snippet = colorSpaceToWorking(expression(snippet, nodeType), texture.colorSpace).setup(builder).build(builder, nodeType);
      }
      return builder.format(snippet, nodeType, output);
    }
  }
  setSampler(value) {
    this.sampler = value;
    return this;
  }
  getSampler() {
    return this.sampler;
  }
  sample(uvNode) {
    const textureNode = this.clone();
    textureNode.uvNode = nodeObject(uvNode);
    textureNode.referenceNode = this.getBase();
    return nodeObject(textureNode);
  }
  load(uvNode) {
    return this.sample(uvNode).setSampler(false);
  }
  blur(amountNode) {
    const textureNode = this.clone();
    textureNode.biasNode = nodeObject(amountNode).mul(maxMipLevel(textureNode));
    textureNode.referenceNode = this.getBase();
    const map = textureNode.value;
    if (textureNode.generateMipmaps === false && (map && map.generateMipmaps === false || map.minFilter === NearestFilter || map.magFilter === NearestFilter)) {
      warn("TSL: texture().blur() requires mipmaps and sampling. Use .generateMipmaps=true and .minFilter/.magFilter=THREE.LinearFilter in the Texture.");
      textureNode.biasNode = null;
    }
    return nodeObject(textureNode);
  }
  level(levelNode) {
    const textureNode = this.clone();
    textureNode.levelNode = nodeObject(levelNode);
    textureNode.referenceNode = this.getBase();
    return nodeObject(textureNode);
  }
  size(levelNode) {
    return textureSize(this, levelNode);
  }
  bias(biasNode) {
    const textureNode = this.clone();
    textureNode.biasNode = nodeObject(biasNode);
    textureNode.referenceNode = this.getBase();
    return nodeObject(textureNode);
  }
  getBase() {
    return this.referenceNode ? this.referenceNode.getBase() : this;
  }
  compare(compareNode) {
    const textureNode = this.clone();
    textureNode.compareNode = nodeObject(compareNode);
    textureNode.referenceNode = this.getBase();
    return nodeObject(textureNode);
  }
  grad(gradNodeX, gradNodeY) {
    const textureNode = this.clone();
    textureNode.gradNode = [nodeObject(gradNodeX), nodeObject(gradNodeY)];
    textureNode.referenceNode = this.getBase();
    return nodeObject(textureNode);
  }
  gather(gatherNode = 0) {
    const textureNode = this.clone();
    textureNode.gatherNode = nodeObject(gatherNode);
    textureNode.referenceNode = this.getBase();
    return nodeObject(textureNode);
  }
  isSampleCompare() {
    return this.compareNode !== null || this._samplerComparison === true;
  }
  depth(depthNode) {
    const textureNode = this.clone();
    textureNode.depthNode = nodeObject(depthNode);
    textureNode.referenceNode = this.getBase();
    return nodeObject(textureNode);
  }
  offset(offsetNode) {
    const textureNode = this.clone();
    textureNode.offsetNode = nodeObject(offsetNode);
    textureNode.referenceNode = this.getBase();
    return nodeObject(textureNode);
  }
  serialize(data) {
    super.serialize(data);
    data.value = this.value.toJSON(data.meta).uuid;
    data.sampler = this.sampler;
    data.updateMatrix = this.updateMatrix;
    data.updateType = this.updateType;
  }
  deserialize(data) {
    super.deserialize(data);
    this.value = data.meta.textures[data.value];
    this.sampler = data.sampler;
    this.updateMatrix = data.updateMatrix;
    this.updateType = data.updateType;
  }
  update() {
    const texture = this.value;
    const matrixUniform = this._matrixUniform;
    if (matrixUniform !== null)
      matrixUniform.value = texture.matrix;
    if (texture.matrixAutoUpdate === true) {
      texture.updateMatrix();
    }
    const flipYUniform = this._flipYUniform;
    if (flipYUniform !== null) {
      flipYUniform.value = texture.image instanceof ImageBitmap && texture.flipY === true || texture.isRenderTargetTexture === true || texture.isFramebufferTexture === true || texture.isDepthTexture === true;
    }
  }
  clone() {
    const newNode = new this.constructor(this.value, this.uvNode, this.levelNode, this.biasNode);
    newNode.sampler = this.sampler;
    newNode.depthNode = this.depthNode;
    newNode.compareNode = this.compareNode;
    newNode.gradNode = this.gradNode;
    newNode.gatherNode = this.gatherNode;
    newNode.offsetNode = this.offsetNode;
    return newNode;
  }
}
var textureBase = /* @__PURE__ */ nodeProxy(TextureNode).setParameterLength(1, 4).setName("texture");
var texture = (value = EmptyTexture$1, uvNode = null, levelNode = null, biasNode = null) => {
  let textureNode;
  if (value && value.isTextureNode === true) {
    textureNode = nodeObject(value.clone());
    textureNode.referenceNode = value.getBase();
    if (uvNode !== null)
      textureNode.uvNode = nodeObject(uvNode);
    if (levelNode !== null)
      textureNode.levelNode = nodeObject(levelNode);
    if (biasNode !== null)
      textureNode.biasNode = nodeObject(biasNode);
  } else {
    textureNode = textureBase(value, uvNode, levelNode, biasNode);
  }
  return textureNode;
};
class BufferNode extends UniformNode {
  static get type() {
    return "BufferNode";
  }
  constructor(value, bufferType, bufferCount = 0) {
    super(value, bufferType);
    this.isBufferNode = true;
    this.bufferType = bufferType;
    this.bufferCount = bufferCount;
    this.updateRanges = [];
  }
  addUpdateRange(start, count) {
    this.updateRanges.push({ start, count });
  }
  clearUpdateRanges() {
    this.updateRanges.length = 0;
  }
  getElementType(builder) {
    return this.getNodeType(builder);
  }
  getInputType() {
    return "buffer";
  }
}
var buffer = (value, type, count) => new BufferNode(value, type, count);

class UniformArrayElementNode extends ArrayElementNode {
  static get type() {
    return "UniformArrayElementNode";
  }
  constructor(uniformArrayNode, indexNode) {
    super(uniformArrayNode, indexNode);
    this.isArrayBufferElementNode = true;
  }
  generate(builder) {
    const snippet = super.generate(builder);
    const type = this.getNodeType(builder);
    const paddedType = this.node.getPaddedType();
    return builder.format(snippet, paddedType, type);
  }
}

class UniformArrayNode extends BufferNode {
  static get type() {
    return "UniformArrayNode";
  }
  constructor(value, elementType = null) {
    super(null);
    this.array = value;
    this.elementType = elementType === null ? getValueType(value[0]) : elementType;
    this.paddedType = this.getPaddedType();
    this.updateType = NodeUpdateType.RENDER;
    this.isArrayBufferNode = true;
  }
  generateNodeType() {
    return this.paddedType;
  }
  getElementType() {
    return this.elementType;
  }
  getPaddedType() {
    const elementType = this.elementType;
    let paddedType = "vec4";
    if (elementType === "mat2") {
      paddedType = "mat2";
    } else if (/mat/.test(elementType) === true) {
      paddedType = "mat4";
    } else if (elementType.charAt(0) === "i") {
      paddedType = "ivec4";
    } else if (elementType.charAt(0) === "u") {
      paddedType = "uvec4";
    }
    return paddedType;
  }
  update() {
    this.updateBuffer();
  }
  onUpdate(callback, updateType) {
    callback = callback.bind(this);
    return super.onUpdate((frame, self2) => {
      callback(frame, self2);
      this.updateBuffer();
    }, updateType);
  }
  updateBuffer() {
    const { array, value } = this;
    const elementType = this.elementType;
    if (elementType === "float" || elementType === "int" || elementType === "uint") {
      for (let i = 0;i < array.length; i++) {
        const index = i * 4;
        value[index] = array[i];
      }
    } else if (elementType === "color") {
      for (let i = 0;i < array.length; i++) {
        const index = i * 4;
        const vector = array[i];
        value[index] = vector.r;
        value[index + 1] = vector.g;
        value[index + 2] = vector.b || 0;
      }
    } else if (elementType === "mat2") {
      for (let i = 0;i < array.length; i++) {
        const index = i * 4;
        const matrix = array[i];
        value[index] = matrix.elements[0];
        value[index + 1] = matrix.elements[1];
        value[index + 2] = matrix.elements[2];
        value[index + 3] = matrix.elements[3];
      }
    } else if (elementType === "mat3") {
      for (let i = 0;i < array.length; i++) {
        const index = i * 16;
        const matrix = array[i];
        value[index] = matrix.elements[0];
        value[index + 1] = matrix.elements[1];
        value[index + 2] = matrix.elements[2];
        value[index + 4] = matrix.elements[3];
        value[index + 5] = matrix.elements[4];
        value[index + 6] = matrix.elements[5];
        value[index + 8] = matrix.elements[6];
        value[index + 9] = matrix.elements[7];
        value[index + 10] = matrix.elements[8];
        value[index + 15] = 1;
      }
    } else if (elementType === "mat4") {
      for (let i = 0;i < array.length; i++) {
        const index = i * 16;
        const matrix = array[i];
        for (let i = 0;i < matrix.elements.length; i++) {
          value[index + i] = matrix.elements[i];
        }
      }
    } else {
      for (let i = 0;i < array.length; i++) {
        const index = i * 4;
        const vector = array[i];
        value[index] = vector.x;
        value[index + 1] = vector.y;
        value[index + 2] = vector.z || 0;
        value[index + 3] = vector.w || 0;
      }
    }
  }
  setup(builder) {
    const length = this.array.length;
    const elementType = this.elementType;
    let arrayType = Float32Array;
    const paddedType = this.paddedType;
    const paddedElementLength = builder.getTypeLength(paddedType);
    if (elementType.charAt(0) === "i")
      arrayType = Int32Array;
    if (elementType.charAt(0) === "u")
      arrayType = Uint32Array;
    this.value = new arrayType(length * paddedElementLength);
    this.bufferCount = length;
    this.bufferType = paddedType;
    this.updateBuffer();
    return super.setup(builder);
  }
  element(indexNode) {
    return new UniformArrayElementNode(this, nodeObject(indexNode));
  }
}
var uniformArray = (values, nodeType) => new UniformArrayNode(values, nodeType);

class BuiltinNode extends Node {
  constructor(name) {
    super("float");
    this.name = name;
    this.isBuiltinNode = true;
  }
  generate() {
    return this.name;
  }
}
var builtin = /* @__PURE__ */ nodeProxy(BuiltinNode).setParameterLength(1);
var _screenSizeVec;
var _viewportVec;

class ScreenNode extends Node {
  static get type() {
    return "ScreenNode";
  }
  constructor(scope) {
    super();
    this.scope = scope;
    this.isViewportNode = true;
  }
  generateNodeType() {
    if (this.scope === ScreenNode.VIEWPORT)
      return "vec4";
    else
      return "vec2";
  }
  update({ renderer }) {
    const renderTarget = renderer.getRenderTarget();
    if (this.scope === ScreenNode.VIEWPORT) {
      if (renderTarget !== null) {
        _viewportVec.copy(renderTarget.viewport);
      } else {
        renderer.getViewport(_viewportVec);
        _viewportVec.multiplyScalar(renderer.getPixelRatio());
      }
    } else {
      if (renderTarget !== null) {
        _screenSizeVec.width = renderTarget.width;
        _screenSizeVec.height = renderTarget.height;
      } else {
        renderer.getDrawingBufferSize(_screenSizeVec);
      }
    }
  }
  setup() {
    const scope = this.scope;
    let output = null;
    if (scope === ScreenNode.SIZE) {
      output = uniform(_screenSizeVec || (_screenSizeVec = new Vector2)).setGroup(renderGroup);
    } else if (scope === ScreenNode.VIEWPORT) {
      output = uniform(_viewportVec || (_viewportVec = new Vector4)).setGroup(renderGroup);
    } else {
      output = vec2(screenCoordinate.div(screenSize));
    }
    let updateType = NodeUpdateType.NONE;
    if (this.scope === ScreenNode.SIZE || this.scope === ScreenNode.VIEWPORT) {
      updateType = NodeUpdateType.RENDER;
    }
    this.updateType = updateType;
    return output;
  }
  generate(builder) {
    if (this.scope === ScreenNode.COORDINATE) {
      let coord = builder.getFragCoord();
      if (builder.isFlipY()) {
        const size = builder.getNodeProperties(screenSize).outputNode.build(builder);
        coord = `${builder.getType("vec2")}( ${coord}.x, ${size}.y - ${coord}.y )`;
      }
      return coord;
    }
    return super.generate(builder);
  }
}
ScreenNode.COORDINATE = "coordinate";
ScreenNode.VIEWPORT = "viewport";
ScreenNode.SIZE = "size";
ScreenNode.UV = "uv";
var screenDPR = /* @__PURE__ */ uniform(1).setGroup(renderGroup).onRenderUpdate(({ renderer }) => renderer.getPixelRatio());
var screenUV = /* @__PURE__ */ nodeImmutable(ScreenNode, ScreenNode.UV);
var screenSize = /* @__PURE__ */ nodeImmutable(ScreenNode, ScreenNode.SIZE);
var screenCoordinate = /* @__PURE__ */ nodeImmutable(ScreenNode, ScreenNode.COORDINATE);
var viewport = /* @__PURE__ */ nodeImmutable(ScreenNode, ScreenNode.VIEWPORT);
var viewportSize = viewport.zw;
var viewportCoordinate = /* @__PURE__ */ screenCoordinate.sub(viewport.xy);
var _cameraProjectionMatrixBase = null;
var _cameraProjectionMatrixArray = null;
var _cameraProjectionMatrixInverseBase = null;
var _cameraProjectionMatrixInverseArray = null;
var _cameraViewMatrixBase = null;
var _cameraViewMatrixArray = null;
var _cameraWorldMatrixBase = null;
var _cameraWorldMatrixArray = null;
var cameraIndex = /* @__PURE__ */ uniform(0, "uint").setName("u_cameraIndex").setGroup(sharedUniformGroup("cameraIndex")).toVarying("v_cameraIndex");
var cameraNear = /* @__PURE__ */ uniform("float").setName("cameraNear").setGroup(renderGroup).onRenderUpdate(({ camera }) => camera.near);
var cameraFar = /* @__PURE__ */ uniform("float").setName("cameraFar").setGroup(renderGroup).onRenderUpdate(({ camera }) => camera.far);
var cameraProjectionMatrix = /* @__PURE__ */ Fn(({ camera }) => {
  let cameraProjectionMatrix;
  if (camera.isArrayCamera && camera.cameras.length > 0) {
    const matrices = [];
    for (const subCamera of camera.cameras) {
      matrices.push(subCamera.projectionMatrix);
    }
    if (_cameraProjectionMatrixArray === null) {
      _cameraProjectionMatrixArray = uniformArray(matrices).setGroup(renderGroup).setName("cameraProjectionMatrices");
    } else {
      _cameraProjectionMatrixArray.array = matrices;
    }
    cameraProjectionMatrix = _cameraProjectionMatrixArray.element(camera.isMultiViewCamera ? builtin("gl_ViewID_OVR") : cameraIndex);
  } else {
    if (_cameraProjectionMatrixBase === null) {
      _cameraProjectionMatrixBase = uniform(camera.projectionMatrix).setName("cameraProjectionMatrix").setGroup(renderGroup).onRenderUpdate(({ camera }) => camera.projectionMatrix);
    }
    cameraProjectionMatrix = _cameraProjectionMatrixBase;
  }
  return cameraProjectionMatrix;
}).once()();
var cameraProjectionMatrixInverse = /* @__PURE__ */ Fn(({ camera }) => {
  let cameraProjectionMatrixInverse;
  if (camera.isArrayCamera && camera.cameras.length > 0) {
    const matrices = [];
    for (const subCamera of camera.cameras) {
      matrices.push(subCamera.projectionMatrixInverse);
    }
    if (_cameraProjectionMatrixInverseArray === null) {
      _cameraProjectionMatrixInverseArray = uniformArray(matrices).setGroup(renderGroup).setName("cameraProjectionMatricesInverse");
    } else {
      _cameraProjectionMatrixInverseArray.array = matrices;
    }
    cameraProjectionMatrixInverse = _cameraProjectionMatrixInverseArray.element(camera.isMultiViewCamera ? builtin("gl_ViewID_OVR") : cameraIndex);
  } else {
    if (_cameraProjectionMatrixInverseBase === null) {
      _cameraProjectionMatrixInverseBase = uniform(camera.projectionMatrixInverse).setName("cameraProjectionMatrixInverse").setGroup(renderGroup).onRenderUpdate(({ camera }) => camera.projectionMatrixInverse);
    }
    cameraProjectionMatrixInverse = _cameraProjectionMatrixInverseBase;
  }
  return cameraProjectionMatrixInverse;
}).once()();
var cameraViewMatrix = /* @__PURE__ */ Fn(({ camera }) => {
  let cameraViewMatrix;
  if (camera.isArrayCamera && camera.cameras.length > 0) {
    const matrices = [];
    for (const subCamera of camera.cameras) {
      matrices.push(subCamera.matrixWorldInverse);
    }
    if (_cameraViewMatrixArray === null) {
      _cameraViewMatrixArray = uniformArray(matrices).setGroup(renderGroup).setName("cameraViewMatrices");
    } else {
      _cameraViewMatrixArray.array = matrices;
    }
    cameraViewMatrix = _cameraViewMatrixArray.element(camera.isMultiViewCamera ? builtin("gl_ViewID_OVR") : cameraIndex);
  } else {
    if (_cameraViewMatrixBase === null) {
      _cameraViewMatrixBase = uniform(camera.matrixWorldInverse).setName("cameraViewMatrix").setGroup(renderGroup).onRenderUpdate(({ camera }) => camera.matrixWorldInverse);
    }
    cameraViewMatrix = _cameraViewMatrixBase;
  }
  return cameraViewMatrix;
}).once()();
var cameraWorldMatrix = /* @__PURE__ */ Fn(({ camera }) => {
  let cameraWorldMatrix;
  if (camera.isArrayCamera && camera.cameras.length > 0) {
    const matrices = [];
    for (const subCamera of camera.cameras) {
      matrices.push(subCamera.matrixWorld);
    }
    if (_cameraWorldMatrixArray === null) {
      _cameraWorldMatrixArray = uniformArray(matrices).setGroup(renderGroup).setName("cameraWorldMatrices");
    } else {
      _cameraWorldMatrixArray.array = matrices;
    }
    cameraWorldMatrix = _cameraWorldMatrixArray.element(camera.isMultiViewCamera ? builtin("gl_ViewID_OVR") : cameraIndex);
  } else {
    if (_cameraWorldMatrixBase === null) {
      _cameraWorldMatrixBase = uniform(camera.matrixWorld).setName("cameraWorldMatrix").setGroup(renderGroup).onRenderUpdate(({ camera }) => camera.matrixWorld);
    }
    cameraWorldMatrix = _cameraWorldMatrixBase;
  }
  return cameraWorldMatrix;
}).once()();
var _sphere = /* @__PURE__ */ new Sphere;

class Object3DNode extends Node {
  static get type() {
    return "Object3DNode";
  }
  constructor(scope, object3d = null) {
    super();
    this.scope = scope;
    this.object3d = object3d;
    this.updateType = NodeUpdateType.OBJECT;
    this.uniformNode = new UniformNode(null);
  }
  generateNodeType() {
    const scope = this.scope;
    if (scope === Object3DNode.WORLD_MATRIX) {
      return "mat4";
    } else if (scope === Object3DNode.POSITION || scope === Object3DNode.VIEW_POSITION || scope === Object3DNode.DIRECTION || scope === Object3DNode.SCALE) {
      return "vec3";
    } else if (scope === Object3DNode.RADIUS) {
      return "float";
    }
  }
  update(frame) {
    const object = this.object3d;
    const uniformNode = this.uniformNode;
    const scope = this.scope;
    if (scope === Object3DNode.WORLD_MATRIX) {
      uniformNode.value = object.matrixWorld;
    } else if (scope === Object3DNode.POSITION) {
      uniformNode.value = uniformNode.value || new Vector3;
      uniformNode.value.setFromMatrixPosition(object.matrixWorld);
    } else if (scope === Object3DNode.SCALE) {
      uniformNode.value = uniformNode.value || new Vector3;
      uniformNode.value.setFromMatrixScale(object.matrixWorld);
    } else if (scope === Object3DNode.DIRECTION) {
      uniformNode.value = uniformNode.value || new Vector3;
      object.getWorldDirection(uniformNode.value);
    } else if (scope === Object3DNode.VIEW_POSITION) {
      const camera = frame.camera;
      uniformNode.value = uniformNode.value || new Vector3;
      uniformNode.value.setFromMatrixPosition(object.matrixWorld);
      uniformNode.value.applyMatrix4(camera.matrixWorldInverse);
    } else if (scope === Object3DNode.RADIUS) {
      const geometry = frame.object.geometry;
      if (geometry.boundingSphere === null)
        geometry.computeBoundingSphere();
      _sphere.copy(geometry.boundingSphere).applyMatrix4(object.matrixWorld);
      uniformNode.value = _sphere.radius;
    }
  }
  generate(builder) {
    const scope = this.scope;
    if (scope === Object3DNode.WORLD_MATRIX) {
      this.uniformNode.nodeType = "mat4";
    } else if (scope === Object3DNode.POSITION || scope === Object3DNode.VIEW_POSITION || scope === Object3DNode.DIRECTION || scope === Object3DNode.SCALE) {
      this.uniformNode.nodeType = "vec3";
    } else if (scope === Object3DNode.RADIUS) {
      this.uniformNode.nodeType = "float";
    }
    return this.uniformNode.build(builder);
  }
  serialize(data) {
    super.serialize(data);
    data.scope = this.scope;
  }
  deserialize(data) {
    super.deserialize(data);
    this.scope = data.scope;
  }
}
Object3DNode.WORLD_MATRIX = "worldMatrix";
Object3DNode.POSITION = "position";
Object3DNode.SCALE = "scale";
Object3DNode.VIEW_POSITION = "viewPosition";
Object3DNode.DIRECTION = "direction";
Object3DNode.RADIUS = "radius";
class ModelNode extends Object3DNode {
  static get type() {
    return "ModelNode";
  }
  constructor(scope) {
    super(scope);
  }
  update(frame) {
    this.object3d = frame.object;
    super.update(frame);
  }
}
var modelDirection = /* @__PURE__ */ nodeImmutable(ModelNode, ModelNode.DIRECTION);
var modelWorldMatrix = /* @__PURE__ */ nodeImmutable(ModelNode, ModelNode.WORLD_MATRIX);
var modelPosition = /* @__PURE__ */ nodeImmutable(ModelNode, ModelNode.POSITION);
var modelScale = /* @__PURE__ */ nodeImmutable(ModelNode, ModelNode.SCALE);
var modelViewPosition = /* @__PURE__ */ nodeImmutable(ModelNode, ModelNode.VIEW_POSITION);
var modelRadius = /* @__PURE__ */ nodeImmutable(ModelNode, ModelNode.RADIUS);
var modelNormalMatrix = /* @__PURE__ */ uniform(new Matrix3).onObjectUpdate(({ object }, self2) => self2.value.getNormalMatrix(object.matrixWorld));
var modelViewMatrix = /* @__PURE__ */ Fn((builder) => {
  return builder.context.modelViewMatrix || mediumpModelViewMatrix;
}).once()().toVar("modelViewMatrix");
var mediumpModelViewMatrix = /* @__PURE__ */ cameraViewMatrix.mul(modelWorldMatrix);
var clipSpace = /* @__PURE__ */ Fn((builder) => {
  if (builder.shaderStage !== "fragment") {
    warnOnce("TSL: `clipSpace` is only available in fragment stage.");
    return vec4();
  }
  return builder.context.clipSpace.toVarying("v_clipSpace");
}).once()();
var positionGeometry = /* @__PURE__ */ attribute("position", "vec3");
var positionView = /* @__PURE__ */ Fn((builder) => {
  if (builder.shaderStage === "fragment" && builder.material.vertexNode) {
    const viewPos = cameraProjectionMatrixInverse.mul(clipSpace);
    return viewPos.xyz.div(viewPos.w).toVar("positionView");
  }
  return builder.context.setupPositionView().toVarying("v_positionView");
}, "vec3").once(["POSITION", "VERTEX"])();
var positionViewDirection = /* @__PURE__ */ Fn((builder) => {
  let output;
  if (builder.camera.isOrthographicCamera) {
    output = vec3(0, 0, 1);
  } else {
    output = positionView.negate().toVarying("v_positionViewDirection").normalize();
  }
  return output.toVar("positionViewDirection");
}, "vec3").once(["POSITION"])();

class FrontFacingNode extends Node {
  static get type() {
    return "FrontFacingNode";
  }
  constructor() {
    super("bool");
    this.isFrontFacingNode = true;
  }
  generate(builder) {
    if (builder.shaderStage !== "fragment")
      return "true";
    const { material } = builder;
    if (material.side === BackSide) {
      return "false";
    }
    return builder.getFrontFacing();
  }
}
var frontFacing = /* @__PURE__ */ nodeImmutable(FrontFacingNode);
var faceDirection = /* @__PURE__ */ float(frontFacing).mul(2).sub(1);
var negateOnBackSide = /* @__PURE__ */ Fn(([vector], { material }) => {
  const side = material.side;
  if (side === BackSide) {
    vector = vector.mul(-1);
  } else if (side === DoubleSide) {
    vector = vector.mul(faceDirection);
  }
  return vector;
});
var normalGeometry = /* @__PURE__ */ attribute("normal", "vec3");
var normalLocal = /* @__PURE__ */ Fn((builder) => {
  if (builder.geometry.hasAttribute("normal") === false) {
    warn('TSL: Vertex attribute "normal" not found on geometry.');
    return vec3(0, 1, 0);
  }
  return normalGeometry;
}, "vec3").once()().toVar("normalLocal");
var normalFlat = /* @__PURE__ */ positionView.dFdx().cross(positionView.dFdy()).normalize().toVar("normalFlat");
var normalViewGeometry = /* @__PURE__ */ Fn((builder) => {
  let node;
  if (builder.isFlatShading()) {
    node = normalFlat;
  } else {
    node = transformNormalToView(normalLocal).toVarying("v_normalViewGeometry").normalize();
  }
  return node;
}, "vec3").once()().toVar("normalViewGeometry");
var normalView = /* @__PURE__ */ Fn((builder) => {
  let node;
  if (builder.subBuildFn === "NORMAL" || builder.subBuildFn === "VERTEX") {
    node = normalViewGeometry;
    if (builder.isFlatShading() !== true) {
      node = negateOnBackSide(node);
    }
  } else {
    node = builder.context.setupNormal().context({ getUV: null, getTextureLevel: null });
  }
  return node;
}, "vec3").once(["NORMAL", "VERTEX"])().toVar("normalView");
var normalWorld = /* @__PURE__ */ normalView.transformNormalByInverseViewMatrix(cameraViewMatrix).toVar("normalWorld");
var clearcoatNormalView = /* @__PURE__ */ Fn(({ subBuildFn, context }) => {
  let node;
  if (subBuildFn === "NORMAL" || subBuildFn === "VERTEX") {
    node = normalView;
  } else {
    node = context.setupClearcoatNormal().context({ getUV: null, getTextureLevel: null });
  }
  return node;
}, "vec3").once(["NORMAL", "VERTEX"])().toVar("clearcoatNormalView");
var transformNormal = /* @__PURE__ */ Fn(([normal, matrix = modelWorldMatrix]) => {
  const normalMatrix = mat3(matrix).inverse().transpose();
  return normalMatrix.mul(normal).normalize();
});
addMethodChaining("transformNormal", transformNormal);
var transformNormalToView = /* @__PURE__ */ Fn(([normal], builder) => {
  const modelNormalViewMatrix = builder.context.modelNormalViewMatrix;
  if (modelNormalViewMatrix) {
    return normal.transformNormalByViewMatrix(modelNormalViewMatrix);
  }
  const transformedNormal = modelNormalMatrix.mul(normal);
  return transformedNormal.transformNormalByViewMatrix(cameraViewMatrix);
});
var transformedNormalView = Fn(() => {
  warn('TSL: "transformedNormalView" is deprecated. Use "normalView" instead.');
  return normalView;
}).once(["NORMAL", "VERTEX"])();
var transformedNormalWorld = Fn(() => {
  warn('TSL: "transformedNormalWorld" is deprecated. Use "normalWorld" instead.');
  return normalWorld;
}).once(["NORMAL", "VERTEX"])();
var transformedClearcoatNormalView = Fn(() => {
  warn('TSL: "transformedClearcoatNormalView" is deprecated. Use "clearcoatNormalView" instead.');
  return clearcoatNormalView;
}).once(["NORMAL", "VERTEX"])();
var _m1$12 = /* @__PURE__ */ new Matrix4;
var materialRefractionRatio = /* @__PURE__ */ uniform(0).onReference(({ material }) => material).onObjectUpdate(({ material }) => material.refractionRatio);
var materialEnvRotation = /* @__PURE__ */ uniform(new Matrix4).onReference(function(frame) {
  return frame.material;
}).onObjectUpdate(function({ material, scene }) {
  const hasSceneEnvironment = scene.environment !== null || scene.environmentNode && scene.environmentNode.isNode;
  const rotation = hasSceneEnvironment && material.envMap === null ? scene.environmentRotation : material.envMapRotation;
  if (rotation) {
    _m1$12.makeRotationFromEuler(rotation).transpose();
  } else {
    _m1$12.identity();
  }
  return _m1$12;
});
var reflectView = /* @__PURE__ */ positionViewDirection.negate().reflect(normalView);
var refractView = /* @__PURE__ */ positionViewDirection.negate().refract(normalView, materialRefractionRatio);
var reflectVector = /* @__PURE__ */ reflectView.transformDirection(cameraWorldMatrix).toVar("reflectVector");
var refractVector = /* @__PURE__ */ refractView.transformDirection(cameraWorldMatrix).toVar("refractVector");
var EmptyTexture = /* @__PURE__ */ new CubeTexture;

class CubeTextureNode extends TextureNode {
  static get type() {
    return "CubeTextureNode";
  }
  constructor(value, uvNode = null, levelNode = null, biasNode = null) {
    super(value, uvNode, levelNode, biasNode);
    this.isCubeTextureNode = true;
  }
  getInputType() {
    if (this.value.isDepthTexture === true) {
      return "cubeDepthTexture";
    }
    return "cubeTexture";
  }
  getDefaultUV() {
    const texture = this.value;
    if (texture.mapping === CubeReflectionMapping) {
      return reflectVector;
    } else if (texture.mapping === CubeRefractionMapping) {
      return refractVector;
    } else {
      error('CubeTextureNode: Mapping "%s" not supported.', texture.mapping);
      return vec3(0, 0, 0);
    }
  }
  setUpdateMatrix() {}
  setupUV(builder, uvNode) {
    const texture = this.value;
    if (texture.isDepthTexture === true) {
      if (builder.renderer.coordinateSystem === WebGPUCoordinateSystem) {
        return vec3(uvNode.x, uvNode.y.negate(), uvNode.z);
      }
      return uvNode;
    }
    uvNode = materialEnvRotation.mul(uvNode);
    if (builder.renderer.coordinateSystem === WebGPUCoordinateSystem || !texture.isRenderTargetTexture) {
      uvNode = vec3(uvNode.x.negate(), uvNode.yz);
    }
    return uvNode;
  }
  generateUV(builder, cubeUV) {
    return cubeUV.build(builder, this.sampler === true ? "vec3" : "ivec3");
  }
}
var cubeTextureBase = /* @__PURE__ */ nodeProxy(CubeTextureNode).setParameterLength(1, 4).setName("cubeTexture");
var cubeTexture = (value = EmptyTexture, uvNode = null, levelNode = null, biasNode = null) => {
  let textureNode;
  if (value && value.isCubeTextureNode === true) {
    textureNode = nodeObject(value.clone());
    textureNode.referenceNode = value;
    if (uvNode !== null)
      textureNode.uvNode = nodeObject(uvNode);
    if (levelNode !== null)
      textureNode.levelNode = nodeObject(levelNode);
    if (biasNode !== null)
      textureNode.biasNode = nodeObject(biasNode);
  } else {
    textureNode = cubeTextureBase(value, uvNode, levelNode, biasNode);
  }
  return textureNode;
};
class ReferenceNode extends Node {
  static get type() {
    return "ReferenceNode";
  }
  constructor(property, uniformType, object = null, count = null) {
    super();
    this.property = property;
    this.uniformType = uniformType;
    this.object = object;
    this.count = count;
    this.properties = property.split(".");
    this.reference = object;
    this.node = null;
    this.group = null;
    this.name = null;
    this.updateType = NodeUpdateType.OBJECT;
  }
  element(indexNode) {
    return new ReferenceElementNode(this, nodeObject(indexNode));
  }
  setGroup(group) {
    this.group = group;
    return this;
  }
  setName(name) {
    this.name = name;
    return this;
  }
  label(name) {
    warn('TSL: "label()" has been deprecated. Use "setName()" instead.');
    return this.setName(name);
  }
  setNodeType(uniformType) {
    let node = null;
    if (this.count !== null) {
      node = buffer(null, uniformType, this.count);
    } else if (Array.isArray(this.getValueFromReference())) {
      node = uniformArray(null, uniformType);
      node.updateType = NodeUpdateType.OBJECT;
    } else if (uniformType === "texture") {
      node = texture(null);
    } else if (uniformType === "cubeTexture") {
      node = cubeTexture(null);
    } else {
      node = uniform(null, uniformType);
    }
    if (this.group !== null) {
      node.setGroup(this.group);
    }
    if (this.name !== null)
      node.setName(this.name);
    this.node = node;
  }
  generateNodeType(builder) {
    if (this.node === null) {
      this.updateReference(builder);
      this.updateValue();
    }
    return this.node.getNodeType(builder);
  }
  getValueFromReference(object = this.reference) {
    const { properties } = this;
    let value = object[properties[0]];
    for (let i = 1;i < properties.length; i++) {
      value = value[properties[i]];
    }
    return value;
  }
  updateReference(state) {
    this.reference = this.object !== null ? this.object : state.object;
    return this.reference;
  }
  setup() {
    this.updateValue();
    return this.node;
  }
  update() {
    this.updateValue();
  }
  updateValue() {
    if (this.node === null)
      this.setNodeType(this.uniformType);
    const value = this.getValueFromReference();
    if (Array.isArray(value)) {
      this.node.array = value;
    } else {
      this.node.value = value;
    }
  }
}
var reference = (name, type, object) => new ReferenceNode(name, type, object);
class MaterialReferenceNode extends ReferenceNode {
  static get type() {
    return "MaterialReferenceNode";
  }
  constructor(property, inputType, material = null) {
    super(property, inputType, material);
    this.material = material;
    this.isMaterialReferenceNode = true;
  }
  updateReference(state) {
    this.reference = this.material !== null ? this.material : state.material;
    return this.reference;
  }
}
var materialReference = (name, type, material = null) => new MaterialReferenceNode(name, type, material);
var uv = uv$1();
var q0 = positionView.dFdx();
var q1 = positionView.dFdy();
var st0 = uv.dFdx();
var st1 = uv.dFdy();
var N2 = normalView;
var q1perp = q1.cross(N2);
var q0perp = N2.cross(q0);
var T = q1perp.mul(st0.x).add(q0perp.mul(st1.x));
var B = q1perp.mul(st0.y).add(q0perp.mul(st1.y));
var det = T.dot(T).max(B.dot(B));
var scale$1 = det.equal(0).select(0, det.inverseSqrt());
var tangentViewFrame = /* @__PURE__ */ T.mul(scale$1).toVar("tangentViewFrame");
var bitangentViewFrame = /* @__PURE__ */ B.mul(scale$1).toVar("bitangentViewFrame");
var tangentGeometry = /* @__PURE__ */ attribute("tangent", "vec4");
var tangentLocal = /* @__PURE__ */ tangentGeometry.xyz.toVar("tangentLocal");
var tangentView = /* @__PURE__ */ Fn((builder) => {
  let node;
  if (builder.subBuildFn === "VERTEX" || builder.geometry.hasAttribute("tangent")) {
    node = modelViewMatrix.mul(vec4(tangentLocal, 0)).xyz.toVarying("v_tangentView").normalize();
  } else {
    node = tangentViewFrame;
  }
  if (builder.isFlatShading() !== true) {
    node = negateOnBackSide(node);
  }
  return node;
}, "vec3").once(["NORMAL", "VERTEX"])().toVar("tangentView");
var getBitangent = /* @__PURE__ */ Fn(([crossNormalTangent, varyingName], builder) => {
  let bitangent = crossNormalTangent.mul(tangentGeometry.w).xyz;
  if (builder.subBuildFn === "NORMAL" && builder.isFlatShading() !== true) {
    bitangent = bitangent.toVarying(varyingName);
  }
  return bitangent;
}).once(["NORMAL"]);
var bitangentView = /* @__PURE__ */ Fn((builder) => {
  let node;
  if (builder.subBuildFn === "VERTEX" || builder.geometry.hasAttribute("tangent")) {
    node = getBitangent(normalView.cross(tangentView), "v_bitangentView").normalize();
  } else {
    node = bitangentViewFrame;
  }
  if (builder.isFlatShading() !== true) {
    node = negateOnBackSide(node);
  }
  return node;
}, "vec3").once(["NORMAL", "VERTEX"])().toVar("bitangentView");
var TBNViewMatrix = /* @__PURE__ */ mat3(tangentView, bitangentView, normalView).toVar("TBNViewMatrix");
var unpackNormal = (xy) => vec3(xy, sqrt(saturate(float(1).sub(dot(xy, xy)))));
class NormalMapNode extends TempNode {
  static get type() {
    return "NormalMapNode";
  }
  constructor(node, scaleNode = null) {
    super("vec3");
    this.node = node;
    this.scaleNode = scaleNode;
    this.normalMapType = TangentSpaceNormalMap;
    this.unpackNormalMode = NoNormalPacking;
  }
  setup(builder) {
    const { normalMapType, scaleNode, unpackNormalMode } = this;
    let normalMap = this.node.mul(2).sub(1);
    if (normalMapType === TangentSpaceNormalMap) {
      if (unpackNormalMode === NormalRGPacking) {
        normalMap = unpackNormal(normalMap.xy);
      } else if (unpackNormalMode === NormalGAPacking) {
        normalMap = unpackNormal(normalMap.yw);
      } else if (unpackNormalMode !== NoNormalPacking) {
        error(`THREE.NodeMaterial: Unexpected unpack normal mode: ${unpackNormalMode}`);
      }
    } else {
      if (unpackNormalMode !== NoNormalPacking) {
        error(`THREE.NodeMaterial: Normal map type '${normalMapType}' is not compatible with unpack normal mode '${unpackNormalMode}'`);
      }
    }
    if (scaleNode !== null) {
      let scale = scaleNode;
      if (builder.isFlatShading() === true) {
        scale = negateOnBackSide(scale);
      }
      normalMap = vec3(normalMap.xy.mul(scale), normalMap.z);
    }
    let output = null;
    if (normalMapType === ObjectSpaceNormalMap) {
      output = transformNormalToView(normalMap);
    } else if (normalMapType === TangentSpaceNormalMap) {
      output = TBNViewMatrix.mul(normalMap).normalize();
    } else {
      error(`NodeMaterial: Unsupported normal map type: ${normalMapType}`);
      output = normalView;
    }
    return output;
  }
}
var normalMap = /* @__PURE__ */ nodeProxy(NormalMapNode).setParameterLength(1, 2);
var dHdxy_fwd = /* @__PURE__ */ Fn(({ textureNode, bumpScale }) => {
  const sampleTexture = (callback) => textureNode.isolate().context({ getUV: (texNode) => callback(texNode.uvNode || uv$1()), forceUVContext: true });
  const Hll = float(sampleTexture((uvNode) => uvNode));
  return vec2(float(sampleTexture((uvNode) => uvNode.add(uvNode.dFdx()))).sub(Hll), float(sampleTexture((uvNode) => uvNode.add(uvNode.dFdy()))).sub(Hll)).mul(bumpScale);
});
var perturbNormalArb = /* @__PURE__ */ Fn((inputs) => {
  const { surf_pos, surf_norm, dHdxy } = inputs;
  const vSigmaX = surf_pos.dFdx().normalize();
  const vSigmaY = surf_pos.dFdy().normalize();
  const vN = surf_norm;
  const R1 = vSigmaY.cross(vN);
  const R2 = vN.cross(vSigmaX);
  const fDet = vSigmaX.dot(R1).mul(faceDirection);
  const vGrad = fDet.sign().mul(dHdxy.x.mul(R1).add(dHdxy.y.mul(R2)));
  return fDet.abs().mul(surf_norm).sub(vGrad).normalize();
});

class BumpMapNode extends TempNode {
  static get type() {
    return "BumpMapNode";
  }
  constructor(textureNode, scaleNode = null) {
    super("vec3");
    this.textureNode = textureNode;
    this.scaleNode = scaleNode;
  }
  setup(builder) {
    if (builder.material.wireframe === true)
      return normalView;
    const bumpScale = this.scaleNode !== null ? this.scaleNode : 1;
    const dHdxy = dHdxy_fwd({ textureNode: this.textureNode, bumpScale });
    return perturbNormalArb({
      surf_pos: positionView,
      surf_norm: normalView,
      dHdxy
    });
  }
}
var bumpMap = /* @__PURE__ */ nodeProxy(BumpMapNode).setParameterLength(1, 2);
var _propertyCache = new Map;

class MaterialNode extends Node {
  static get type() {
    return "MaterialNode";
  }
  constructor(scope) {
    super();
    this.scope = scope;
  }
  getCache(property, type) {
    let node = _propertyCache.get(property);
    if (node === undefined) {
      node = materialReference(property, type);
      _propertyCache.set(property, node);
    }
    return node;
  }
  getFloat(property) {
    return this.getCache(property, "float");
  }
  getColor(property) {
    return this.getCache(property, "color");
  }
  getTexture(property) {
    return this.getCache(property === "map" ? "map" : property + "Map", "texture");
  }
  setup(builder) {
    const material = builder.context.material;
    const scope = this.scope;
    let node = null;
    if (scope === MaterialNode.COLOR) {
      const colorNode = material.color !== undefined ? this.getColor(scope) : vec3();
      if (material.map && material.map.isTexture === true) {
        node = colorNode.mul(this.getTexture("map"));
      } else {
        node = colorNode;
      }
    } else if (scope === MaterialNode.OPACITY) {
      const opacityNode = this.getFloat(scope);
      if (material.alphaMap && material.alphaMap.isTexture === true) {
        node = opacityNode.mul(this.getTexture("alpha"));
      } else {
        node = opacityNode;
      }
    } else if (scope === MaterialNode.SPECULAR_STRENGTH) {
      if (material.specularMap && material.specularMap.isTexture === true) {
        node = this.getTexture("specular").r;
      } else {
        node = float(1);
      }
    } else if (scope === MaterialNode.SPECULAR_INTENSITY) {
      const specularIntensityNode = this.getFloat(scope);
      if (material.specularIntensityMap && material.specularIntensityMap.isTexture === true) {
        node = specularIntensityNode.mul(this.getTexture(scope).a);
      } else {
        node = specularIntensityNode;
      }
    } else if (scope === MaterialNode.SPECULAR_COLOR) {
      const specularColorNode = this.getColor(scope);
      if (material.specularColorMap && material.specularColorMap.isTexture === true) {
        node = specularColorNode.mul(this.getTexture(scope).rgb);
      } else {
        node = specularColorNode;
      }
    } else if (scope === MaterialNode.ROUGHNESS) {
      const roughnessNode = this.getFloat(scope);
      if (material.roughnessMap && material.roughnessMap.isTexture === true) {
        node = roughnessNode.mul(this.getTexture(scope).g);
      } else {
        node = roughnessNode;
      }
    } else if (scope === MaterialNode.METALNESS) {
      const metalnessNode = this.getFloat(scope);
      if (material.metalnessMap && material.metalnessMap.isTexture === true) {
        node = metalnessNode.mul(this.getTexture(scope).b);
      } else {
        node = metalnessNode;
      }
    } else if (scope === MaterialNode.EMISSIVE) {
      const emissiveIntensityNode = this.getFloat("emissiveIntensity");
      const emissiveNode = this.getColor(scope).mul(emissiveIntensityNode);
      if (material.emissiveMap && material.emissiveMap.isTexture === true) {
        node = emissiveNode.mul(this.getTexture(scope));
      } else {
        node = emissiveNode;
      }
    } else if (scope === MaterialNode.NORMAL) {
      if (material.normalMap) {
        node = normalMap(this.getTexture("normal"), this.getCache("normalScale", "vec2"));
        node.normalMapType = material.normalMapType;
        if (material.normalMap.format == RGFormat || material.normalMap.format == RED_GREEN_RGTC2_Format || material.normalMap.format == RG11_EAC_Format) {
          node.unpackNormalMode = NormalRGPacking;
        }
      } else if (material.bumpMap) {
        node = bumpMap(this.getTexture("bump").r, this.getFloat("bumpScale"));
      } else {
        node = normalView;
      }
    } else if (scope === MaterialNode.CLEARCOAT) {
      const clearcoatNode = this.getFloat(scope);
      if (material.clearcoatMap && material.clearcoatMap.isTexture === true) {
        node = clearcoatNode.mul(this.getTexture(scope).r);
      } else {
        node = clearcoatNode;
      }
    } else if (scope === MaterialNode.CLEARCOAT_ROUGHNESS) {
      const clearcoatRoughnessNode = this.getFloat(scope);
      if (material.clearcoatRoughnessMap && material.clearcoatRoughnessMap.isTexture === true) {
        node = clearcoatRoughnessNode.mul(this.getTexture(scope).r);
      } else {
        node = clearcoatRoughnessNode;
      }
    } else if (scope === MaterialNode.CLEARCOAT_NORMAL) {
      if (material.clearcoatNormalMap) {
        node = normalMap(this.getTexture(scope), this.getCache(scope + "Scale", "vec2"));
      } else {
        node = normalView;
      }
    } else if (scope === MaterialNode.SHEEN) {
      const sheenNode = this.getColor("sheenColor").mul(this.getFloat("sheen"));
      if (material.sheenColorMap && material.sheenColorMap.isTexture === true) {
        node = sheenNode.mul(this.getTexture("sheenColor").rgb);
      } else {
        node = sheenNode;
      }
    } else if (scope === MaterialNode.SHEEN_ROUGHNESS) {
      const sheenRoughnessNode = this.getFloat(scope);
      if (material.sheenRoughnessMap && material.sheenRoughnessMap.isTexture === true) {
        node = sheenRoughnessNode.mul(this.getTexture(scope).a);
      } else {
        node = sheenRoughnessNode;
      }
      node = node.clamp(0.0001, 1);
    } else if (scope === MaterialNode.ANISOTROPY) {
      if (material.anisotropyMap && material.anisotropyMap.isTexture === true) {
        const anisotropyPolar = this.getTexture(scope);
        const anisotropyMat = mat2(materialAnisotropyVector.x, materialAnisotropyVector.y, materialAnisotropyVector.y.negate(), materialAnisotropyVector.x);
        node = anisotropyMat.mul(anisotropyPolar.rg.mul(2).sub(vec2(1)).normalize().mul(anisotropyPolar.b));
      } else {
        node = materialAnisotropyVector;
      }
    } else if (scope === MaterialNode.IRIDESCENCE_THICKNESS) {
      const iridescenceThicknessMaximum = reference("1", "float", material.iridescenceThicknessRange);
      if (material.iridescenceThicknessMap) {
        const iridescenceThicknessMinimum = reference("0", "float", material.iridescenceThicknessRange);
        node = iridescenceThicknessMaximum.sub(iridescenceThicknessMinimum).mul(this.getTexture(scope).g).add(iridescenceThicknessMinimum);
      } else {
        node = iridescenceThicknessMaximum;
      }
    } else if (scope === MaterialNode.TRANSMISSION) {
      const transmissionNode = this.getFloat(scope);
      if (material.transmissionMap) {
        node = transmissionNode.mul(this.getTexture(scope).r);
      } else {
        node = transmissionNode;
      }
    } else if (scope === MaterialNode.THICKNESS) {
      const thicknessNode = this.getFloat(scope);
      if (material.thicknessMap) {
        node = thicknessNode.mul(this.getTexture(scope).g);
      } else {
        node = thicknessNode;
      }
    } else if (scope === MaterialNode.IOR) {
      node = this.getFloat(scope);
    } else if (scope === MaterialNode.LIGHT_MAP) {
      if (material.lightMap) {
        node = this.getTexture(scope).rgb.mul(this.getFloat("lightMapIntensity"));
      } else {
        node = vec3(0);
      }
    } else if (scope === MaterialNode.AO) {
      if (material.aoMap) {
        node = this.getTexture(scope).r.sub(1).mul(this.getFloat("aoMapIntensity")).add(1);
      } else {
        node = float(1);
      }
    } else if (scope === MaterialNode.LINE_DASH_OFFSET) {
      node = material.dashOffset ? this.getFloat(scope) : float(0);
    } else {
      const outputType = this.getNodeType(builder);
      node = this.getCache(scope, outputType);
    }
    return node;
  }
}
MaterialNode.ALPHA_TEST = "alphaTest";
MaterialNode.COLOR = "color";
MaterialNode.OPACITY = "opacity";
MaterialNode.SHININESS = "shininess";
MaterialNode.SPECULAR = "specular";
MaterialNode.SPECULAR_STRENGTH = "specularStrength";
MaterialNode.SPECULAR_INTENSITY = "specularIntensity";
MaterialNode.SPECULAR_COLOR = "specularColor";
MaterialNode.REFLECTIVITY = "reflectivity";
MaterialNode.ROUGHNESS = "roughness";
MaterialNode.METALNESS = "metalness";
MaterialNode.NORMAL = "normal";
MaterialNode.CLEARCOAT = "clearcoat";
MaterialNode.CLEARCOAT_ROUGHNESS = "clearcoatRoughness";
MaterialNode.CLEARCOAT_NORMAL = "clearcoatNormal";
MaterialNode.EMISSIVE = "emissive";
MaterialNode.ROTATION = "rotation";
MaterialNode.SHEEN = "sheen";
MaterialNode.SHEEN_ROUGHNESS = "sheenRoughness";
MaterialNode.ANISOTROPY = "anisotropy";
MaterialNode.IRIDESCENCE = "iridescence";
MaterialNode.IRIDESCENCE_IOR = "iridescenceIOR";
MaterialNode.IRIDESCENCE_THICKNESS = "iridescenceThickness";
MaterialNode.IOR = "ior";
MaterialNode.TRANSMISSION = "transmission";
MaterialNode.THICKNESS = "thickness";
MaterialNode.ATTENUATION_DISTANCE = "attenuationDistance";
MaterialNode.ATTENUATION_COLOR = "attenuationColor";
MaterialNode.LINE_SCALE = "scale";
MaterialNode.LINE_DASH_SIZE = "dashSize";
MaterialNode.LINE_GAP_SIZE = "gapSize";
MaterialNode.LINE_WIDTH = "linewidth";
MaterialNode.LINE_DASH_OFFSET = "dashOffset";
MaterialNode.POINT_SIZE = "size";
MaterialNode.DISPERSION = "dispersion";
MaterialNode.RETROREFLECTIVITY = "retroreflectivity";
MaterialNode.LIGHT_MAP = "light";
MaterialNode.AO = "ao";
var materialAlphaTest = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.ALPHA_TEST);
var materialColor = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.COLOR);
var materialShininess = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.SHININESS);
var materialEmissive = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.EMISSIVE);
var materialOpacity = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.OPACITY);
var materialSpecular = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.SPECULAR);
var materialSpecularIntensity = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.SPECULAR_INTENSITY);
var materialSpecularColor = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.SPECULAR_COLOR);
var materialSpecularStrength = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.SPECULAR_STRENGTH);
var materialReflectivity = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.REFLECTIVITY);
var materialRoughness = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.ROUGHNESS);
var materialMetalness = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.METALNESS);
var materialNormal = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.NORMAL);
var materialClearcoat = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.CLEARCOAT);
var materialClearcoatRoughness = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.CLEARCOAT_ROUGHNESS);
var materialClearcoatNormal = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.CLEARCOAT_NORMAL);
var materialRotation = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.ROTATION);
var materialSheen = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.SHEEN);
var materialSheenRoughness = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.SHEEN_ROUGHNESS);
var materialAnisotropy = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.ANISOTROPY);
var materialIridescence = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.IRIDESCENCE);
var materialIridescenceIOR = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.IRIDESCENCE_IOR);
var materialIridescenceThickness = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.IRIDESCENCE_THICKNESS);
var materialTransmission = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.TRANSMISSION);
var materialThickness = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.THICKNESS);
var materialIOR = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.IOR);
var materialAttenuationDistance = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.ATTENUATION_DISTANCE);
var materialAttenuationColor = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.ATTENUATION_COLOR);
var materialLineScale = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.LINE_SCALE);
var materialLineDashSize = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.LINE_DASH_SIZE);
var materialLineGapSize = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.LINE_GAP_SIZE);
var materialLineWidth = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.LINE_WIDTH);
var materialLineDashOffset = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.LINE_DASH_OFFSET);
var materialPointSize = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.POINT_SIZE);
var materialDispersion = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.DISPERSION);
var materialRetroreflectivity = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.RETROREFLECTIVITY);
var materialLightMap = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.LIGHT_MAP);
var materialAO = /* @__PURE__ */ nodeImmutable(MaterialNode, MaterialNode.AO);
var materialAnisotropyVector = /* @__PURE__ */ uniform(new Vector2).onReference(function(frame) {
  return frame.material;
}).onRenderUpdate(function({ material }) {
  this.value.set(material.anisotropy * Math.cos(material.anisotropyRotation), material.anisotropy * Math.sin(material.anisotropyRotation));
});
class EventNode extends Node {
  static get type() {
    return "EventNode";
  }
  constructor(eventType, callback) {
    super("void");
    this.eventType = eventType;
    this.callback = callback;
    if (eventType === EventNode.OBJECT) {
      this.updateType = NodeUpdateType.OBJECT;
    } else if (eventType === EventNode.MATERIAL) {
      this.updateType = NodeUpdateType.RENDER;
    } else if (eventType === EventNode.FRAME) {
      this.updateType = NodeUpdateType.FRAME;
    } else if (eventType === EventNode.AFTER_OBJECT) {
      this.updateAfterType = NodeUpdateType.OBJECT;
    } else if (eventType === EventNode.BEFORE_OBJECT) {
      this.updateBeforeType = NodeUpdateType.OBJECT;
    } else if (eventType === EventNode.BEFORE_MATERIAL) {
      this.updateBeforeType = NodeUpdateType.RENDER;
    } else if (eventType === EventNode.BEFORE_FRAME) {
      this.updateBeforeType = NodeUpdateType.FRAME;
    }
  }
  setup(builder) {
    const { eventType, callback } = this;
    if (eventType === EventNode.BEFORE_RENDER_PIPELINE) {
      const callbacks = builder.context.onBeforePipelineCallbacks;
      if (callbacks) {
        callbacks.push(callback);
      }
    } else if (eventType === EventNode.AFTER_RENDER_PIPELINE) {
      const callbacks = builder.context.onAfterPipelineCallbacks;
      if (callbacks) {
        callbacks.push(callback);
      }
    }
    return super.setup(builder);
  }
  update(frame) {
    this.callback(frame);
  }
  updateBefore(frame) {
    this.callback(frame);
  }
  updateAfter(frame) {
    this.callback(frame);
  }
}
EventNode.OBJECT = "object";
EventNode.MATERIAL = "material";
EventNode.FRAME = "frame";
EventNode.AFTER_OBJECT = "afterObject";
EventNode.BEFORE_OBJECT = "beforeObject";
EventNode.BEFORE_MATERIAL = "beforeMaterial";
EventNode.BEFORE_FRAME = "beforeFrame";
EventNode.BEFORE_RENDER_PIPELINE = "beforeRenderPipeline";
EventNode.AFTER_RENDER_PIPELINE = "afterRenderPipeline";
class LoopNode extends Node {
  static get type() {
    return "LoopNode";
  }
  constructor(params = []) {
    super("void");
    this.params = params;
  }
  getVarName(index) {
    return String.fromCharCode(105 + index);
  }
  getProperties(builder) {
    const properties = builder.getNodeProperties(this);
    if (properties.stackNode !== undefined)
      return properties;
    const inputs = {};
    const params = this._getInternalParams();
    for (let i = 0, l = params.length - 1;i < l; i++) {
      const param = params[i];
      const name = param.isNode !== true && param.name || this.getVarName(i);
      const type = param.isNode !== true && param.type || "int";
      inputs[name] = expression(name, type);
    }
    const stack = builder.addStack();
    const fnCall = params[params.length - 1](inputs);
    properties.returnsNode = fnCall.context({ nodeLoop: fnCall });
    properties.stackNode = stack;
    const baseParam = params[0];
    if (baseParam.isNode !== true && typeof baseParam.update === "function") {
      const fnUpdateCall = Fn(baseParam.update)(inputs);
      properties.updateNode = fnUpdateCall.context({ nodeLoop: fnUpdateCall });
    }
    builder.removeStack();
    return properties;
  }
  _getInternalParams() {
    const params = this.params;
    if (typeof params[0] === "function") {
      return [bool(true), params[0]];
    }
    return params;
  }
  setup(builder) {
    this.getProperties(builder);
    if (builder.fnCall) {
      const shaderNodeData = builder.getDataFromNode(builder.fnCall.shaderNode);
      shaderNodeData.hasLoop = true;
    }
  }
  generate(builder) {
    const properties = this.getProperties(builder);
    const params = this._getInternalParams();
    const stackNode = properties.stackNode;
    for (let i = 0, l = params.length - 1;i < l; i++) {
      const param = params[i];
      let isWhile = false, start = null, end = null, name = null, type = null, condition = null, update = null;
      if (param.isNode) {
        if (param.getNodeType(builder) === "bool") {
          isWhile = true;
          type = "bool";
          end = param.build(builder, type);
        } else {
          type = "int";
          name = this.getVarName(i);
          start = "0";
          end = param.build(builder, type);
          condition = "<";
        }
      } else {
        type = param.type || "int";
        name = param.name || this.getVarName(i);
        start = param.start;
        end = param.end;
        condition = param.condition;
        update = param.update;
        if (typeof start === "number")
          start = builder.generateConst(type, start);
        else if (start && start.isNode)
          start = start.build(builder, type);
        if (typeof end === "number")
          end = builder.generateConst(type, end);
        else if (end && end.isNode)
          end = end.build(builder, type);
        if (start !== undefined && end === undefined) {
          start = start + " - 1";
          end = "0";
          condition = ">=";
        } else if (end !== undefined && start === undefined) {
          start = "0";
          condition = "<";
        }
        if (condition === undefined) {
          if (Number(start) > Number(end)) {
            condition = ">=";
          } else {
            condition = "<";
          }
        }
      }
      let loopSnippet;
      if (isWhile) {
        loopSnippet = `while ( ${end} )`;
      } else {
        const internalParam = { start, end };
        const startSnippet = internalParam.start;
        const endSnippet = internalParam.end;
        let updateSnippet;
        const deltaOperator = () => condition.includes("<") ? "+=" : "-=";
        if (update !== undefined && update !== null) {
          switch (typeof update) {
            case "function":
              const flow = builder.flowStagesNode(properties.updateNode, "void");
              const snippet = flow.code.replace(/\t|;/g, "");
              updateSnippet = snippet;
              break;
            case "number":
              updateSnippet = name + " " + deltaOperator() + " " + builder.generateConst(type, update);
              break;
            case "string":
              updateSnippet = name + " " + update;
              break;
            default:
              if (update.isNode) {
                updateSnippet = name + " " + deltaOperator() + " " + update.build(builder);
              } else {
                error("TSL: 'Loop( { update: ... } )' is not a function, string or number.", this.stackTrace);
                updateSnippet = "break /* invalid update */";
              }
          }
        } else {
          if (type === "int" || type === "uint") {
            update = condition.includes("<") ? "++" : "--";
          } else {
            update = deltaOperator() + " 1.";
          }
          updateSnippet = name + " " + update;
        }
        const declarationSnippet = builder.getVar(type, name) + " = " + startSnippet;
        const conditionalSnippet = name + " " + condition + " " + endSnippet;
        loopSnippet = `for ( ${declarationSnippet}; ${conditionalSnippet}; ${updateSnippet} )`;
      }
      builder.addFlowCode((i === 0 ? `
` : "") + builder.tab + loopSnippet + ` {

`).addFlowTab();
    }
    const stackSnippet = stackNode.build(builder, "void");
    properties.returnsNode.build(builder, "void");
    builder.removeFlowTab().addFlowCode(`
` + builder.tab + stackSnippet);
    for (let i = 0, l = params.length - 1;i < l; i++) {
      builder.addFlowCode((i === 0 ? "" : builder.tab) + `}

`).removeFlowTab();
    }
    builder.addFlowTab();
  }
}
var Loop = (...params) => new LoopNode(nodeArray(params, "int")).toStack();
var _size$5 = /* @__PURE__ */ new Vector2;

class ViewportTextureNode extends TextureNode {
  static get type() {
    return "ViewportTextureNode";
  }
  constructor(uvNode = screenUV, levelNode = null, framebufferTexture = null) {
    let defaultFramebuffer = null;
    if (framebufferTexture === null) {
      defaultFramebuffer = new FramebufferTexture;
      defaultFramebuffer.minFilter = LinearMipmapLinearFilter;
      framebufferTexture = defaultFramebuffer;
    } else {
      defaultFramebuffer = framebufferTexture;
    }
    super(framebufferTexture, uvNode, levelNode);
    this.generateMipmaps = false;
    this.defaultFramebuffer = defaultFramebuffer;
    this.isOutputTextureNode = true;
    this.updateBeforeType = NodeUpdateType.RENDER;
    this._cacheTextures = new WeakMap;
  }
  getTextureForReference(reference = null) {
    let defaultFramebuffer;
    let cacheTextures;
    if (this.referenceNode) {
      defaultFramebuffer = this.referenceNode.defaultFramebuffer;
      cacheTextures = this.referenceNode._cacheTextures;
    } else {
      defaultFramebuffer = this.defaultFramebuffer;
      cacheTextures = this._cacheTextures;
    }
    if (reference === null) {
      return defaultFramebuffer;
    }
    if (cacheTextures.has(reference) === false) {
      const framebufferTexture = defaultFramebuffer.clone();
      cacheTextures.set(reference, framebufferTexture);
    }
    return cacheTextures.get(reference);
  }
  updateReference(frame) {
    const renderer = frame.renderer;
    const renderTarget = renderer.getRenderTarget();
    const canvasTarget = renderer.getCanvasTarget();
    const reference = renderTarget ? renderTarget : canvasTarget;
    this.value = this.getTextureForReference(reference);
    return this.value;
  }
  updateBefore(frame) {
    const renderer = frame.renderer;
    const renderTarget = renderer.getRenderTarget();
    const canvasTarget = renderer.getCanvasTarget();
    const reference = renderTarget ? renderTarget : canvasTarget;
    if (reference === null) {
      renderer.getDrawingBufferSize(_size$5);
    } else if (reference.getDrawingBufferSize) {
      reference.getDrawingBufferSize(_size$5);
    } else {
      _size$5.set(reference.width, reference.height);
    }
    const framebufferTexture = this.getTextureForReference(reference);
    if (framebufferTexture.image.width !== _size$5.width || framebufferTexture.image.height !== _size$5.height) {
      framebufferTexture.image.width = _size$5.width;
      framebufferTexture.image.height = _size$5.height;
      framebufferTexture.needsUpdate = true;
    }
    const currentGenerateMipmaps = framebufferTexture.generateMipmaps;
    framebufferTexture.generateMipmaps = this.generateMipmaps;
    renderer.copyFramebufferToTexture(framebufferTexture);
    framebufferTexture.generateMipmaps = currentGenerateMipmaps;
  }
  clone() {
    const viewportTextureNode = new this.constructor(this.uvNode, this.levelNode, this.value);
    viewportTextureNode.generateMipmaps = this.generateMipmaps;
    return viewportTextureNode;
  }
}
var _sharedDepthbuffer = null;

class ViewportDepthTextureNode extends ViewportTextureNode {
  static get type() {
    return "ViewportDepthTextureNode";
  }
  constructor(uvNode = screenUV, levelNode = null, depthTexture = null) {
    if (depthTexture === null) {
      if (_sharedDepthbuffer === null) {
        _sharedDepthbuffer = new DepthTexture;
      }
      depthTexture = _sharedDepthbuffer;
    }
    super(uvNode, levelNode, depthTexture);
  }
}
var viewportDepthTexture = /* @__PURE__ */ nodeProxy(ViewportDepthTextureNode).setParameterLength(0, 3);

class ViewportDepthNode extends Node {
  static get type() {
    return "ViewportDepthNode";
  }
  constructor(scope, valueNode = null) {
    super("float");
    this.scope = scope;
    this.valueNode = valueNode;
    this.isViewportDepthNode = true;
  }
  generate(builder) {
    const { scope } = this;
    if (scope === ViewportDepthNode.DEPTH_BASE) {
      return builder.getFragDepth();
    }
    return super.generate(builder);
  }
  setup({ camera }) {
    const { scope } = this;
    const value = this.valueNode;
    let node = null;
    if (scope === ViewportDepthNode.DEPTH_BASE) {
      if (value !== null) {
        node = depthBase().assign(value);
      }
    } else if (scope === ViewportDepthNode.DEPTH) {
      if (camera.isPerspectiveCamera) {
        node = viewZToPerspectiveDepth(positionView.z, cameraNear, cameraFar);
      } else {
        node = viewZToOrthographicDepth(positionView.z, cameraNear, cameraFar);
      }
    } else if (scope === ViewportDepthNode.LINEAR_DEPTH) {
      if (value !== null) {
        if (camera.isPerspectiveCamera) {
          const viewZ = perspectiveDepthToViewZ(value, cameraNear, cameraFar);
          node = viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
        } else {
          node = value;
        }
      } else {
        node = viewZToOrthographicDepth(positionView.z, cameraNear, cameraFar);
      }
    }
    return node;
  }
}
ViewportDepthNode.DEPTH_BASE = "depthBase";
ViewportDepthNode.DEPTH = "depth";
ViewportDepthNode.LINEAR_DEPTH = "linearDepth";
var viewZToOrthographicDepth = (viewZ, near, far) => viewZ.add(near).div(near.sub(far));
var viewZToPerspectiveDepth = (viewZ, near, far) => near.add(viewZ).mul(far).div(far.sub(near).mul(viewZ));
var perspectiveDepthToViewZ = /* @__PURE__ */ Fn(([depth, near, far], builder) => {
  if (builder.renderer.reversedDepthBuffer === true) {
    return near.mul(far).div(near.sub(far).mul(depth).sub(near));
  } else {
    return near.mul(far).div(far.sub(near).mul(depth).sub(far));
  }
});
var depthBase = /* @__PURE__ */ nodeProxy(ViewportDepthNode, ViewportDepthNode.DEPTH_BASE);
var depth = /* @__PURE__ */ nodeImmutable(ViewportDepthNode, ViewportDepthNode.DEPTH);
var linearDepth = /* @__PURE__ */ nodeProxy(ViewportDepthNode, ViewportDepthNode.LINEAR_DEPTH).setParameterLength(0, 1);
var viewportLinearDepth = /* @__PURE__ */ linearDepth(viewportDepthTexture());
depth.assign = (value) => depthBase(value);

class ClippingNode extends Node {
  static get type() {
    return "ClippingNode";
  }
  constructor(scope = ClippingNode.DEFAULT) {
    super();
    this.scope = scope;
  }
  setup(builder) {
    super.setup(builder);
    const clippingContext = builder.clippingContext;
    const { intersectionPlanes, unionPlanes } = clippingContext;
    this.hardwareClipping = builder.hardwareClipping;
    if (this.scope === ClippingNode.ALPHA_TO_COVERAGE) {
      return this.setupAlphaToCoverage(intersectionPlanes, unionPlanes);
    } else if (this.scope === ClippingNode.HARDWARE) {
      return this.setupHardwareClipping(unionPlanes, builder);
    } else {
      return this.setupDefault(intersectionPlanes, unionPlanes);
    }
  }
  setupAlphaToCoverage(intersectionPlanes, unionPlanes) {
    return Fn(() => {
      const distanceToPlane = float().toVar("distanceToPlane");
      const distanceGradient = float().toVar("distanceToGradient");
      const clipOpacity = float(1).toVar("clipOpacity");
      const numUnionPlanes = unionPlanes.length;
      if (this.hardwareClipping === false && numUnionPlanes > 0) {
        const clippingPlanes = uniformArray(unionPlanes).setGroup(renderGroup);
        Loop(numUnionPlanes, ({ i }) => {
          const plane = clippingPlanes.element(i);
          distanceToPlane.assign(positionView.dot(plane.xyz).negate().add(plane.w));
          distanceGradient.assign(distanceToPlane.fwidth().div(2));
          clipOpacity.mulAssign(smoothstep2(distanceGradient.negate(), distanceGradient, distanceToPlane));
        });
      }
      const numIntersectionPlanes = intersectionPlanes.length;
      if (numIntersectionPlanes > 0) {
        const clippingPlanes = uniformArray(intersectionPlanes).setGroup(renderGroup);
        const intersectionClipOpacity = float(1).toVar("intersectionClipOpacity");
        Loop(numIntersectionPlanes, ({ i }) => {
          const plane = clippingPlanes.element(i);
          distanceToPlane.assign(positionView.dot(plane.xyz).negate().add(plane.w));
          distanceGradient.assign(distanceToPlane.fwidth().div(2));
          intersectionClipOpacity.mulAssign(smoothstep2(distanceGradient.negate(), distanceGradient, distanceToPlane).oneMinus());
        });
        clipOpacity.mulAssign(intersectionClipOpacity.oneMinus());
      }
      diffuseColor.a.mulAssign(clipOpacity);
      diffuseColor.a.equal(0).discard();
    })();
  }
  setupDefault(intersectionPlanes, unionPlanes) {
    return Fn(() => {
      const numUnionPlanes = unionPlanes.length;
      if (this.hardwareClipping === false && numUnionPlanes > 0) {
        const clippingPlanes = uniformArray(unionPlanes).setGroup(renderGroup);
        Loop(numUnionPlanes, ({ i }) => {
          const plane = clippingPlanes.element(i);
          positionView.dot(plane.xyz).greaterThan(plane.w).discard();
        });
      }
      const numIntersectionPlanes = intersectionPlanes.length;
      if (numIntersectionPlanes > 0) {
        const clippingPlanes = uniformArray(intersectionPlanes).setGroup(renderGroup);
        const clipped = bool(true).toVar("clipped");
        Loop(numIntersectionPlanes, ({ i }) => {
          const plane = clippingPlanes.element(i);
          clipped.assign(positionView.dot(plane.xyz).greaterThan(plane.w).and(clipped));
        });
        clipped.discard();
      }
    })();
  }
  setupHardwareClipping(unionPlanes, builder) {
    const numUnionPlanes = unionPlanes.length;
    builder.enableHardwareClipping(numUnionPlanes);
    return Fn(() => {
      const clippingPlanes = uniformArray(unionPlanes).setGroup(renderGroup);
      const hw_clip_distances = builtin(builder.getClipDistance());
      Loop(numUnionPlanes, ({ i }) => {
        const plane = clippingPlanes.element(i);
        const distance = positionView.dot(plane.xyz).sub(plane.w).negate();
        hw_clip_distances.element(i).assign(distance);
      });
    })();
  }
}
ClippingNode.ALPHA_TO_COVERAGE = "alphaToCoverage";
ClippingNode.DEFAULT = "default";
ClippingNode.HARDWARE = "hardware";
var worldStart = varyingProperty("vec3", "worldStart");
var worldEnd = varyingProperty("vec3", "worldEnd");
var lineDistance = varyingProperty("float", "lineDistance");
var worldPos = varyingProperty("vec4", "worldPos");
var trimSegmentAlpha = Fn(({ start, end }) => {
  const a = cameraProjectionMatrix.element(2).element(2);
  const b = cameraProjectionMatrix.element(3).element(2);
  const nearEstimate = a.greaterThan(0).select(b.negate().div(a.add(1)), b.mul(-0.5).div(a));
  return nearEstimate.sub(start.z).div(end.z.sub(start.z));
}, { start: "vec4", end: "vec4", return: "float" });
var closestLineToLine = Fn(({ p1, p2, p3, p4 }) => {
  const p13 = p1.sub(p3);
  const p43 = p4.sub(p3);
  const p21 = p2.sub(p1);
  const d1343 = p13.dot(p43);
  const d4321 = p43.dot(p21);
  const d1321 = p13.dot(p21);
  const d4343 = p43.dot(p43);
  const d2121 = p21.dot(p21);
  const denom = d2121.mul(d4343).sub(d4321.mul(d4321));
  const numer = d1343.mul(d4321).sub(d1321.mul(d4343));
  const mua = numer.div(denom).clamp();
  const mub = d1343.add(d4321.mul(mua)).div(d4343).clamp();
  return vec2(mua, mub);
}, { p1: "vec3", p2: "vec3", p3: "vec3", p4: "vec3", return: "vec2" });
var mvpLine = Fn(({ material }) => {
  const useDash = material._useDash;
  const useWorldUnits = material._useWorldUnits;
  const instanceStart = attribute("instanceStart");
  const instanceEnd = attribute("instanceEnd");
  const start = vec4(modelViewMatrix.mul(vec4(instanceStart, 1))).toVar("start");
  const end = vec4(modelViewMatrix.mul(vec4(instanceEnd, 1))).toVar("end");
  let distanceStart, distanceEnd;
  if (useDash) {
    distanceStart = float(attribute("instanceDistanceStart")).toVar("distanceStart");
    distanceEnd = float(attribute("instanceDistanceEnd")).toVar("distanceEnd");
  }
  if (useWorldUnits) {
    worldStart.assign(start.xyz);
    worldEnd.assign(end.xyz);
  }
  const aspect = viewport.z.div(viewport.w);
  const perspective = cameraProjectionMatrix.element(2).element(3).equal(-1);
  If(perspective, () => {
    If(start.z.lessThan(0).and(end.z.greaterThan(0)), () => {
      const alpha = trimSegmentAlpha({ start, end });
      end.assign(vec4(mix(start.xyz, end.xyz, alpha), end.w));
      if (useDash) {
        distanceEnd.assign(mix(distanceStart, distanceEnd, alpha));
      }
    }).ElseIf(end.z.lessThan(0).and(start.z.greaterThanEqual(0)), () => {
      const alpha = trimSegmentAlpha({ start: end, end: start });
      start.assign(vec4(mix(end.xyz, start.xyz, alpha), start.w));
      if (useDash) {
        distanceStart.assign(mix(distanceEnd, distanceStart, alpha));
      }
    });
  });
  if (useDash) {
    const dashScaleNode = material.dashScaleNode ? float(material.dashScaleNode) : materialLineScale;
    const offsetNode = material.offsetNode ? float(material.offsetNode) : materialLineDashOffset;
    let lineDist = positionGeometry.y.lessThan(0.5).select(dashScaleNode.mul(distanceStart), dashScaleNode.mul(distanceEnd));
    lineDist = lineDist.add(offsetNode);
    lineDistance.assign(lineDist);
  }
  const clipStart = cameraProjectionMatrix.mul(start);
  const clipEnd = cameraProjectionMatrix.mul(end);
  const ndcStart = clipStart.xyz.div(clipStart.w);
  const ndcEnd = clipEnd.xyz.div(clipEnd.w);
  const dir = ndcEnd.xy.sub(ndcStart.xy).toVar();
  dir.x.assign(dir.x.mul(aspect));
  dir.assign(dir.normalize());
  const clip = vec4().toVar();
  if (useWorldUnits) {
    const worldDir = end.xyz.sub(start.xyz).normalize();
    const tmpFwd = mix(start.xyz, end.xyz, 0.5).normalize();
    const worldUp = worldDir.cross(tmpFwd).normalize();
    const worldFwd = worldDir.cross(worldUp);
    worldPos.assign(positionGeometry.y.lessThan(0.5).select(start, end));
    const hw = materialLineWidth.mul(0.5);
    worldPos.addAssign(vec4(positionGeometry.x.lessThan(0).select(worldUp.mul(hw), worldUp.mul(hw).negate()), 0));
    if (!useDash) {
      worldPos.addAssign(vec4(positionGeometry.y.lessThan(0.5).select(worldDir.mul(hw).negate(), worldDir.mul(hw)), 0));
      worldPos.addAssign(vec4(worldFwd.mul(hw), 0));
      If(positionGeometry.y.greaterThan(1).or(positionGeometry.y.lessThan(0)), () => {
        worldPos.subAssign(vec4(worldFwd.mul(2).mul(hw), 0));
      });
    }
    clip.assign(cameraProjectionMatrix.mul(worldPos));
    const clipPose = vec3().toVar();
    clipPose.assign(positionGeometry.y.lessThan(0.5).select(ndcStart, ndcEnd));
    clip.z.assign(clipPose.z.mul(clip.w));
  } else {
    const offset = vec2(dir.y, dir.x.negate()).toVar("offset");
    dir.x.assign(dir.x.div(aspect));
    offset.x.assign(offset.x.div(aspect));
    offset.assign(positionGeometry.x.lessThan(0).select(offset.negate(), offset));
    If(positionGeometry.y.lessThan(0), () => {
      offset.assign(offset.sub(dir));
    }).ElseIf(positionGeometry.y.greaterThan(1), () => {
      offset.assign(offset.add(dir));
    });
    offset.assign(offset.mul(materialLineWidth));
    offset.assign(offset.div(viewport.w.div(screenDPR)));
    clip.assign(positionGeometry.y.lessThan(0.5).select(clipStart, clipEnd));
    offset.assign(offset.mul(clip.w));
    clip.assign(clip.add(vec4(offset, 0, 0)));
  }
  return clip;
})();
var alphaLine = Fn(({ material, renderer }) => {
  const useAlphaToCoverage = material._useAlphaToCoverage;
  const useDash = material._useDash;
  const useWorldUnits = material._useWorldUnits;
  const vUv = uv$1();
  if (useDash) {
    const dashSizeNode = material.dashSizeNode ? float(material.dashSizeNode) : materialLineDashSize;
    const gapSizeNode = material.gapSizeNode ? float(material.gapSizeNode) : materialLineGapSize;
    dashSize.assign(dashSizeNode);
    gapSize.assign(gapSizeNode);
    vUv.y.lessThan(-1).or(vUv.y.greaterThan(1)).discard();
    lineDistance.mod(dashSize.add(gapSize)).greaterThan(dashSize).discard();
  }
  const alpha = float(1).toVar("alpha");
  if (useWorldUnits) {
    const rayEnd = worldPos.xyz.normalize().mul(1e5);
    const lineDir = worldEnd.sub(worldStart);
    const params = closestLineToLine({ p1: worldStart, p2: worldEnd, p3: vec3(0, 0, 0), p4: rayEnd });
    const p1 = worldStart.add(lineDir.mul(params.x));
    const p2 = rayEnd.mul(params.y);
    const delta = p1.sub(p2);
    const len = delta.length();
    const norm = len.div(materialLineWidth);
    if (!useDash) {
      if (useAlphaToCoverage && renderer.currentSamples > 0) {
        const dnorm = norm.fwidth();
        alpha.assign(smoothstep2(dnorm.negate().add(0.5), dnorm.add(0.5), norm).oneMinus());
      } else {
        norm.greaterThan(0.5).discard();
      }
    }
  } else {
    if (useAlphaToCoverage && renderer.currentSamples > 0) {
      const a = vUv.x;
      const b = vUv.y.greaterThan(0).select(vUv.y.sub(1), vUv.y.add(1));
      const len2 = a.mul(a).add(b.mul(b));
      const dlen = float(len2.fwidth()).toVar("dlen");
      If(vUv.y.abs().greaterThan(1), () => {
        alpha.assign(smoothstep2(dlen.oneMinus(), dlen.add(1), len2).oneMinus());
      });
    } else {
      If(vUv.y.abs().greaterThan(1), () => {
        const a = vUv.x;
        const b = vUv.y.greaterThan(0).select(vUv.y.sub(1), vUv.y.add(1));
        const len2 = a.mul(a).add(b.mul(b));
        len2.greaterThan(1).discard();
      });
    }
  }
  return alpha;
})();
var _cache$1 = new WeakMap;
var RECIPROCAL_PI = /* @__PURE__ */ float(1 / Math.PI);
var DATA2 = new Uint16Array([
  12469,
  15057,
  12620,
  14925,
  13266,
  14620,
  13807,
  14376,
  14323,
  13990,
  14545,
  13625,
  14713,
  13328,
  14840,
  12882,
  14931,
  12528,
  14996,
  12233,
  15039,
  11829,
  15066,
  11525,
  15080,
  11295,
  15085,
  10976,
  15082,
  10705,
  15073,
  10495,
  13880,
  14564,
  13898,
  14542,
  13977,
  14430,
  14158,
  14124,
  14393,
  13732,
  14556,
  13410,
  14702,
  12996,
  14814,
  12596,
  14891,
  12291,
  14937,
  11834,
  14957,
  11489,
  14958,
  11194,
  14943,
  10803,
  14921,
  10506,
  14893,
  10278,
  14858,
  9960,
  14484,
  14039,
  14487,
  14025,
  14499,
  13941,
  14524,
  13740,
  14574,
  13468,
  14654,
  13106,
  14743,
  12678,
  14818,
  12344,
  14867,
  11893,
  14889,
  11509,
  14893,
  11180,
  14881,
  10751,
  14852,
  10428,
  14812,
  10128,
  14765,
  9754,
  14712,
  9466,
  14764,
  13480,
  14764,
  13475,
  14766,
  13440,
  14766,
  13347,
  14769,
  13070,
  14786,
  12713,
  14816,
  12387,
  14844,
  11957,
  14860,
  11549,
  14868,
  11215,
  14855,
  10751,
  14825,
  10403,
  14782,
  10044,
  14729,
  9651,
  14666,
  9352,
  14599,
  9029,
  14967,
  12835,
  14966,
  12831,
  14963,
  12804,
  14954,
  12723,
  14936,
  12564,
  14917,
  12347,
  14900,
  11958,
  14886,
  11569,
  14878,
  11247,
  14859,
  10765,
  14828,
  10401,
  14784,
  10011,
  14727,
  9600,
  14660,
  9289,
  14586,
  8893,
  14508,
  8533,
  15111,
  12234,
  15110,
  12234,
  15104,
  12216,
  15092,
  12156,
  15067,
  12010,
  15028,
  11776,
  14981,
  11500,
  14942,
  11205,
  14902,
  10752,
  14861,
  10393,
  14812,
  9991,
  14752,
  9570,
  14682,
  9252,
  14603,
  8808,
  14519,
  8445,
  14431,
  8145,
  15209,
  11449,
  15208,
  11451,
  15202,
  11451,
  15190,
  11438,
  15163,
  11384,
  15117,
  11274,
  15055,
  10979,
  14994,
  10648,
  14932,
  10343,
  14871,
  9936,
  14803,
  9532,
  14729,
  9218,
  14645,
  8742,
  14556,
  8381,
  14461,
  8020,
  14365,
  7603,
  15273,
  10603,
  15272,
  10607,
  15267,
  10619,
  15256,
  10631,
  15231,
  10614,
  15182,
  10535,
  15118,
  10389,
  15042,
  10167,
  14963,
  9787,
  14883,
  9447,
  14800,
  9115,
  14710,
  8665,
  14615,
  8318,
  14514,
  7911,
  14411,
  7507,
  14279,
  7198,
  15314,
  9675,
  15313,
  9683,
  15309,
  9712,
  15298,
  9759,
  15277,
  9797,
  15229,
  9773,
  15166,
  9668,
  15084,
  9487,
  14995,
  9274,
  14898,
  8910,
  14800,
  8539,
  14697,
  8234,
  14590,
  7790,
  14479,
  7409,
  14367,
  7067,
  14178,
  6621,
  15337,
  8619,
  15337,
  8631,
  15333,
  8677,
  15325,
  8769,
  15305,
  8871,
  15264,
  8940,
  15202,
  8909,
  15119,
  8775,
  15022,
  8565,
  14916,
  8328,
  14804,
  8009,
  14688,
  7614,
  14569,
  7287,
  14448,
  6888,
  14321,
  6483,
  14088,
  6171,
  15350,
  7402,
  15350,
  7419,
  15347,
  7480,
  15340,
  7613,
  15322,
  7804,
  15287,
  7973,
  15229,
  8057,
  15148,
  8012,
  15046,
  7846,
  14933,
  7611,
  14810,
  7357,
  14682,
  7069,
  14552,
  6656,
  14421,
  6316,
  14251,
  5948,
  14007,
  5528,
  15356,
  5942,
  15356,
  5977,
  15353,
  6119,
  15348,
  6294,
  15332,
  6551,
  15302,
  6824,
  15249,
  7044,
  15171,
  7122,
  15070,
  7050,
  14949,
  6861,
  14818,
  6611,
  14679,
  6349,
  14538,
  6067,
  14398,
  5651,
  14189,
  5311,
  13935,
  4958,
  15359,
  4123,
  15359,
  4153,
  15356,
  4296,
  15353,
  4646,
  15338,
  5160,
  15311,
  5508,
  15263,
  5829,
  15188,
  6042,
  15088,
  6094,
  14966,
  6001,
  14826,
  5796,
  14678,
  5543,
  14527,
  5287,
  14377,
  4985,
  14133,
  4586,
  13869,
  4257,
  15360,
  1563,
  15360,
  1642,
  15358,
  2076,
  15354,
  2636,
  15341,
  3350,
  15317,
  4019,
  15273,
  4429,
  15203,
  4732,
  15105,
  4911,
  14981,
  4932,
  14836,
  4818,
  14679,
  4621,
  14517,
  4386,
  14359,
  4156,
  14083,
  3795,
  13808,
  3437,
  15360,
  122,
  15360,
  137,
  15358,
  285,
  15355,
  636,
  15344,
  1274,
  15322,
  2177,
  15281,
  2765,
  15215,
  3223,
  15120,
  3451,
  14995,
  3569,
  14846,
  3567,
  14681,
  3466,
  14511,
  3305,
  14344,
  3121,
  14037,
  2800,
  13753,
  2467,
  15360,
  0,
  15360,
  1,
  15359,
  21,
  15355,
  89,
  15346,
  253,
  15325,
  479,
  15287,
  796,
  15225,
  1148,
  15133,
  1492,
  15008,
  1749,
  14856,
  1882,
  14685,
  1886,
  14506,
  1783,
  14324,
  1608,
  13996,
  1398,
  13702,
  1183
]);
var bC = 1 / 6;
var clearcoatF0 = vec3(0.04);
var clearcoatF90 = float(1);
var _uniformsMap = new WeakMap;
var _cache2 = new WeakMap;
var _rendererCache = new WeakMap;
var scatteringDensity = property("vec3");
var linearDepthRay = property("vec3");
var outgoingRayLight = property("vec3");
var _protoKeysCache = new WeakMap;
class OverrideContextNode extends ContextNode {
  static get type() {
    return "OverrideContextNode";
  }
  constructor(overrideNodes, flowNode = null) {
    super(flowNode, {
      overrideNodes
    });
    this.isOverrideContextNode = true;
  }
  getFlowContextData() {
    const children = [];
    this.traverse((node) => {
      if (node.isOverrideContextNode === true) {
        children.push(node.value.overrideNodes);
      }
    });
    const overrideNodes = new Map(children.flatMap((map) => Array.from(map.entries())));
    const data = super.getFlowContextData();
    data.overrideNodes = overrideNodes;
    return data;
  }
}
function overrideNode(targetNode, callback = null, flowNode = null) {
  if (callback && callback.isNode) {
    const node = callback;
    callback = () => node;
  }
  return new OverrideContextNode(new Map([[targetNode, callback]]), flowNode);
}
addMethodChaining("overrideNode", (flowNode, node, callback) => overrideNode(node, callback, flowNode));
function overrideNodes(overrides, flowNode = null) {
  const overrideNodesMap = new Map;
  for (const [node, value] of overrides) {
    const callback = value !== null ? typeof value === "function" ? value : () => value : null;
    overrideNodesMap.set(node, callback);
  }
  return new OverrideContextNode(overrideNodesMap, flowNode);
}
addMethodChaining("overrideNodes", (flowNode, overrides) => overrideNodes(overrides, flowNode));
var _reflectorPlane = new Plane;
var _normal = new Vector3;
var _reflectorWorldPosition = new Vector3;
var _cameraWorldPosition = new Vector3;
var _rotationMatrix = new Matrix4;
var _lookAtPosition = new Vector3(0, 0, -1);
var clipPlane = new Vector4;
var _view = new Vector3;
var _target2 = new Vector3;
var _q3 = new Vector4;
var _size$2 = new Vector2;
var _defaultRT = new RenderTarget;
var _defaultUV = screenUV.flipX();
_defaultRT.depthTexture = new DepthTexture(1, 1);
var _vertexNode = /* @__PURE__ */ vec4(array([-1, -1, 3]).element(vertexIndex), array([3, -1, -1]).element(vertexIndex), 0, 1);
var _objectData = new WeakMap;
var LINEAR_REC2020_TO_LINEAR_SRGB = /* @__PURE__ */ mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
var LINEAR_SRGB_TO_LINEAR_REC2020 = /* @__PURE__ */ mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.088), vec3(0.0433, 0.0113, 0.8956));
class CodeNode extends Node {
  static get type() {
    return "CodeNode";
  }
  constructor(code = "", includes = [], language = "") {
    super("code");
    this.isCodeNode = true;
    this.global = true;
    this.code = code;
    this.includes = includes;
    this.language = language;
  }
  setIncludes(includes) {
    this.includes = includes;
    return this;
  }
  getIncludes() {
    return this.includes;
  }
  generate(builder) {
    const includes = this.getIncludes(builder);
    for (const include of includes) {
      include.build(builder, "void");
    }
    const nodeCode = builder.getCodeFromNode(this, this.getNodeType(builder));
    nodeCode.code = this.code;
    return nodeCode.code;
  }
  serialize(data) {
    super.serialize(data);
    data.code = this.code;
    data.language = this.language;
  }
  deserialize(data) {
    super.deserialize(data);
    this.code = data.code;
    this.language = data.language;
  }
}
var totalDiffuse = property("vec3", "totalDiffuse");
var totalSpecular = property("vec3", "totalSpecular");
var outgoingLight = property("vec3", "outgoingLight");
var _bindingGroupsCache = new WeakMap;
var _functionNodeCache = new WeakMap;
var sharedNodeData = new WeakMap;
var typeFromArray = new Map([
  [Int8Array, "int"],
  [Int16Array, "int"],
  [Int32Array, "int"],
  [Uint8Array, "uint"],
  [Uint16Array, "uint"],
  [Uint32Array, "uint"],
  [Float32Array, "float"]
]);
class NodeFunctionInput {
  constructor(type, name, count = null, qualifier = "", isConst = false) {
    this.type = type;
    this.name = name;
    this.count = count;
    this.qualifier = qualifier;
    this.isConst = isConst;
  }
}
NodeFunctionInput.isNodeFunctionInput = true;
class NodeFunction {
  constructor(type, inputs, name = "", precision = "") {
    this.type = type;
    this.inputs = inputs;
    this.name = name;
    this.precision = precision;
  }
  getCode() {
    warn("Abstract function.");
  }
}
NodeFunction.isNodeFunction = true;
var _shadowSide = { [FrontSide]: BackSide, [BackSide]: FrontSide, [DoubleSide]: DoubleSide };
var glslPolyfills = {
  textureGather: new CodeNode(`
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
`),
  textureGatherArray: new CodeNode(`
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
`),
  textureGatherCompare: new CodeNode(`
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
`),
  textureGatherCompareArray: new CodeNode(`
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
`),
  floatpack_snorm_4x8: new CodeNode("uint tsl_packSnorm4x8( vec4 v ) { uvec4 u = uvec4( ivec4( round( clamp( v, -1.0, 1.0 ) * 127.0 ) ) & 0xff ); return u.x | u.y << 8 | u.z << 16 | u.w << 24; }"),
  floatpack_unorm_4x8: new CodeNode("uint tsl_packUnorm4x8( vec4 v ) { uvec4 u = uvec4( round( clamp( v, 0.0, 1.0 ) * 255.0 ) ); return u.x | u.y << 8 | u.z << 16 | u.w << 24; }"),
  floatunpack_snorm_4x8: new CodeNode("vec4 tsl_unpackSnorm4x8( uint x ) { return max( vec4( ivec4( x << 24, x << 16, x << 8, x ) >> 24 ) / 127.0, -1.0 ); }"),
  floatunpack_unorm_4x8: new CodeNode("vec4 tsl_unpackUnorm4x8( uint x ) { return vec4( uvec4( x, x >> 8, x >> 16, x >> 24 ) & 0xffu ) / 255.0; }")
};
var glslReservedKeywords = new Set([
  "const",
  "uniform",
  "buffer",
  "shared",
  "attribute",
  "varying",
  "coherent",
  "volatile",
  "restrict",
  "readonly",
  "writeonly",
  "atomic_uint",
  "layout",
  "centroid",
  "flat",
  "smooth",
  "noperspective",
  "patch",
  "sample",
  "invariant",
  "precise",
  "break",
  "continue",
  "do",
  "for",
  "while",
  "switch",
  "case",
  "default",
  "if",
  "else",
  "subroutine",
  "in",
  "out",
  "inout",
  "int",
  "void",
  "bool",
  "true",
  "false",
  "float",
  "double",
  "discard",
  "return",
  "vec2",
  "vec3",
  "vec4",
  "ivec2",
  "ivec3",
  "ivec4",
  "bvec2",
  "bvec3",
  "bvec4",
  "uint",
  "uvec2",
  "uvec3",
  "uvec4",
  "dvec2",
  "dvec3",
  "dvec4",
  "mat2",
  "mat3",
  "mat4",
  "mat2x2",
  "mat2x3",
  "mat2x4",
  "mat3x2",
  "mat3x3",
  "mat3x4",
  "mat4x2",
  "mat4x3",
  "mat4x4",
  "dmat2",
  "dmat3",
  "dmat4",
  "dmat2x2",
  "dmat2x3",
  "dmat2x4",
  "dmat3x2",
  "dmat3x3",
  "dmat3x4",
  "dmat4x2",
  "dmat4x3",
  "dmat4x4",
  "lowp",
  "mediump",
  "highp",
  "precision",
  "sampler2D",
  "sampler3D",
  "samplerCube",
  "sampler2DShadow",
  "samplerCubeShadow",
  "sampler2DArray",
  "sampler2DArrayShadow",
  "isampler2D",
  "isampler3D",
  "isamplerCube",
  "isampler2DArray",
  "usampler2D",
  "usampler3D",
  "usamplerCube",
  "usampler2DArray",
  "struct",
  "common",
  "partition",
  "active",
  "asm",
  "class",
  "union",
  "enum",
  "typedef",
  "template",
  "this",
  "resource",
  "goto",
  "inline",
  "noinline",
  "public",
  "static",
  "extern",
  "external",
  "interface",
  "long",
  "short",
  "half",
  "fixed",
  "unsigned",
  "superp",
  "input",
  "output",
  "hvec2",
  "hvec3",
  "hvec4",
  "fvec2",
  "fvec3",
  "fvec4",
  "sampler3DRect",
  "filter",
  "sizeof",
  "cast",
  "namespace",
  "using",
  "main"
]);
var GPUShaderStage = typeof self !== "undefined" && self.GPUShaderStage ? self.GPUShaderStage : { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };
class GPUBindGroupDescriptor {
  constructor() {
    this.label = "";
    this.layout = null;
    this.entries = [];
  }
  reset() {
    this.label = "";
    this.layout = null;
    this.entries.length = 0;
  }
}

class GPUBufferDescriptor {
  constructor() {
    this.label = "";
    this.size = 0;
    this.usage = 0;
    this.mappedAtCreation = false;
  }
  reset() {
    this.label = "";
    this.size = 0;
    this.usage = 0;
    this.mappedAtCreation = false;
  }
}

class GPUCommandEncoderDescriptor {
  constructor() {
    this.label = "";
  }
  reset() {
    this.label = "";
  }
}

class GPURenderBundleEncoderDescriptor {
  constructor() {
    this.label = "";
    this.colorFormats = null;
    this.depthStencilFormat = undefined;
    this.sampleCount = 1;
    this.depthReadOnly = false;
    this.stencilReadOnly = false;
  }
  reset() {
    this.label = "";
    this.colorFormats = null;
    this.depthStencilFormat = undefined;
    this.sampleCount = 1;
    this.depthReadOnly = false;
    this.stencilReadOnly = false;
  }
}

class GPURenderPassColorAttachment {
  constructor() {
    this.view = null;
    this.depthSlice = undefined;
    this.resolveTarget = undefined;
    this.clearValue = undefined;
    this.loadOp = undefined;
    this.storeOp = undefined;
  }
  reset() {
    this.view = null;
    this.depthSlice = undefined;
    this.resolveTarget = undefined;
    this.clearValue = undefined;
    this.loadOp = undefined;
    this.storeOp = undefined;
  }
}

class GPURenderPassDescriptor {
  constructor() {
    this.label = "";
    this.colorAttachments = [];
    this.depthStencilAttachment = undefined;
    this.occlusionQuerySet = undefined;
    this.timestampWrites = undefined;
    this.maxDrawCount = 50000000;
  }
  reset() {
    this.label = "";
    this.colorAttachments.length = 0;
    this.depthStencilAttachment = undefined;
    this.occlusionQuerySet = undefined;
    this.timestampWrites = undefined;
    this.maxDrawCount = 50000000;
  }
}

class GPURenderPipelineDescriptor {
  constructor() {
    this.label = "";
    this.layout = null;
    this.vertex = null;
    this.primitive = {};
    this.depthStencil = undefined;
    this.multisample = new GPUMultisampleState;
    this.fragment = null;
  }
  reset() {
    this.label = "";
    this.layout = null;
    this.vertex = null;
    this.primitive = {};
    this.depthStencil = undefined;
    this.multisample.reset();
    this.fragment = null;
  }
}

class GPUMultisampleState {
  constructor() {
    this.count = 1;
    this.mask = 4294967295;
    this.alphaToCoverageEnabled = false;
  }
  reset() {
    this.count = 1;
    this.mask = 4294967295;
    this.alphaToCoverageEnabled = false;
  }
}

class GPUShaderModuleDescriptor {
  constructor() {
    this.label = "";
    this.code = "";
    this.compilationHints = [];
  }
  reset() {
    this.label = "";
    this.code = "";
    this.compilationHints.length = 0;
  }
}

class GPUTextureDescriptor {
  constructor() {
    this.label = "";
    this.size = { width: 0, height: 1, depthOrArrayLayers: 1 };
    this.mipLevelCount = 1;
    this.sampleCount = 1;
    this.dimension = "2d";
    this.format = undefined;
    this.usage = undefined;
    this.viewFormats = [];
    this.textureBindingViewDimension = undefined;
  }
  reset() {
    this.label = "";
    this.size.width = 0;
    this.size.height = 1;
    this.size.depthOrArrayLayers = 1;
    this.mipLevelCount = 1;
    this.sampleCount = 1;
    this.dimension = "2d";
    this.format = undefined;
    this.usage = undefined;
    this.viewFormats.length = 0;
    this.textureBindingViewDimension = undefined;
  }
}

class GPUTextureViewDescriptor {
  constructor() {
    this.label = "";
    this.format = undefined;
    this.dimension = undefined;
    this.usage = 0;
    this.aspect = "all";
    this.baseMipLevel = 0;
    this.mipLevelCount = undefined;
    this.baseArrayLayer = 0;
    this.arrayLayerCount = undefined;
    this.swizzle = "rgba";
  }
  reset() {
    this.label = "";
    this.format = undefined;
    this.dimension = undefined;
    this.usage = 0;
    this.aspect = "all";
    this.baseMipLevel = 0;
    this.mipLevelCount = undefined;
    this.baseArrayLayer = 0;
    this.arrayLayerCount = undefined;
    this.swizzle = "rgba";
  }
}
var _bindGroupDescriptor$1 = new GPUBindGroupDescriptor;
var _bufferDescriptor$5 = new GPUBufferDescriptor;
var _commandEncoderDescriptor$4 = new GPUCommandEncoderDescriptor;
var _renderBundleEncoderDescriptor$1 = new GPURenderBundleEncoderDescriptor;
var _renderPassDescriptor = new GPURenderPassDescriptor;
var _renderPipelineDescriptor$1 = new GPURenderPipelineDescriptor;
var _colorAttachment = new GPURenderPassColorAttachment;
var _shaderModuleDescriptor$1 = new GPUShaderModuleDescriptor;
var _textureDescriptor$2 = new GPUTextureDescriptor;
var _viewDescriptor$2 = new GPUTextureViewDescriptor;
class GPUSamplerDescriptor {
  constructor() {
    this.label = "";
    this.addressModeU = "clamp-to-edge";
    this.addressModeV = "clamp-to-edge";
    this.addressModeW = "clamp-to-edge";
    this.magFilter = "nearest";
    this.minFilter = "nearest";
    this.mipmapFilter = "nearest";
    this.lodMinClamp = 0;
    this.lodMaxClamp = 32;
    this.compare = undefined;
    this.maxAnisotropy = 1;
  }
  reset() {
    this.label = "";
    this.addressModeU = "clamp-to-edge";
    this.addressModeV = "clamp-to-edge";
    this.addressModeW = "clamp-to-edge";
    this.magFilter = "nearest";
    this.minFilter = "nearest";
    this.mipmapFilter = "nearest";
    this.lodMinClamp = 0;
    this.lodMaxClamp = 32;
    this.compare = undefined;
    this.maxAnisotropy = 1;
  }
}

class GPUTexelCopyTextureInfo {
  constructor() {
    this.texture = null;
    this.mipLevel = 0;
    this.origin = { x: 0, y: 0, z: 0 };
    this.aspect = "all";
  }
  reset() {
    this.texture = null;
    this.mipLevel = 0;
    this.origin.x = 0;
    this.origin.y = 0;
    this.origin.z = 0;
    this.aspect = "all";
  }
}

class GPUTexelCopyBufferInfo {
  constructor() {
    this.buffer = null;
    this.offset = 0;
    this.bytesPerRow = undefined;
    this.rowsPerImage = undefined;
  }
  reset() {
    this.buffer = null;
    this.offset = 0;
    this.bytesPerRow = undefined;
    this.rowsPerImage = undefined;
  }
}

class GPUTexelCopyBufferLayout {
  constructor() {
    this.offset = 0;
    this.bytesPerRow = undefined;
    this.rowsPerImage = undefined;
  }
  reset() {
    this.offset = 0;
    this.bytesPerRow = undefined;
    this.rowsPerImage = undefined;
  }
}

class GPUCopyExternalImageSourceInfo {
  constructor() {
    this.source = null;
    this.origin = { x: 0, y: 0 };
    this.flipY = false;
  }
  reset() {
    this.source = null;
    this.origin.x = 0;
    this.origin.y = 0;
    this.flipY = false;
  }
}

class GPUCopyExternalImageDestInfo extends GPUTexelCopyTextureInfo {
  constructor() {
    super();
    this.colorSpace = "srgb";
    this.premultipliedAlpha = false;
  }
  reset() {
    super.reset();
    this.colorSpace = "srgb";
    this.premultipliedAlpha = false;
  }
}

class GPUExtent3D {
  constructor() {
    this.width = 0;
    this.height = 1;
    this.depthOrArrayLayers = 1;
  }
  reset() {
    this.width = 0;
    this.height = 1;
    this.depthOrArrayLayers = 1;
  }
}
var _bufferDescriptor$4 = new GPUBufferDescriptor;
var _commandEncoderDescriptor$3 = new GPUCommandEncoderDescriptor;
var _samplerDescriptor = new GPUSamplerDescriptor;
var _texelCopyTextureInfo = new GPUTexelCopyTextureInfo;
var _texelCopyBufferInfo = new GPUTexelCopyBufferInfo;
var _texelCopyBufferLayout = new GPUTexelCopyBufferLayout;
var _copyExternalImageSourceInfo = new GPUCopyExternalImageSourceInfo;
var _copyExternalImageDestInfo = new GPUCopyExternalImageDestInfo;
var _textureDescriptor$1 = new GPUTextureDescriptor;
var _extent3D$1 = new GPUExtent3D;
var _compareToWebGPU = {
  [NeverCompare]: "never",
  [LessCompare]: "less",
  [EqualCompare]: "equal",
  [LessEqualCompare]: "less-equal",
  [GreaterCompare]: "greater",
  [GreaterEqualCompare]: "greater-equal",
  [AlwaysCompare]: "always",
  [NotEqualCompare]: "not-equal"
};
var accessNames = {
  [NodeAccess.READ_ONLY]: "read",
  [NodeAccess.WRITE_ONLY]: "write",
  [NodeAccess.READ_WRITE]: "read_write"
};
var wrapNames = {
  [RepeatWrapping]: "repeat",
  [ClampToEdgeWrapping]: "clamp",
  [MirroredRepeatWrapping]: "mirror"
};
var gpuShaderStageLib = {
  vertex: GPUShaderStage.VERTEX,
  fragment: GPUShaderStage.FRAGMENT,
  compute: GPUShaderStage.COMPUTE
};
var wgslPolyfill = {
  tsl_xor: new CodeNode("fn tsl_xor( a : bool, b : bool ) -> bool { return ( a || b ) && !( a && b ); }"),
  mod_float: new CodeNode("fn tsl_mod_float( x : f32, y : f32 ) -> f32 { return x - y * floor( x / y ); }"),
  mod_vec2: new CodeNode("fn tsl_mod_vec2( x : vec2f, y : vec2f ) -> vec2f { return x - y * floor( x / y ); }"),
  mod_vec3: new CodeNode("fn tsl_mod_vec3( x : vec3f, y : vec3f ) -> vec3f { return x - y * floor( x / y ); }"),
  mod_vec4: new CodeNode("fn tsl_mod_vec4( x : vec4f, y : vec4f ) -> vec4f { return x - y * floor( x / y ); }"),
  equals_bool: new CodeNode("fn tsl_equals_bool( a : bool, b : bool ) -> bool { return a == b; }"),
  equals_bvec2: new CodeNode("fn tsl_equals_bvec2( a : vec2f, b : vec2f ) -> vec2<bool> { return vec2<bool>( a.x == b.x, a.y == b.y ); }"),
  equals_bvec3: new CodeNode("fn tsl_equals_bvec3( a : vec3f, b : vec3f ) -> vec3<bool> { return vec3<bool>( a.x == b.x, a.y == b.y, a.z == b.z ); }"),
  equals_bvec4: new CodeNode("fn tsl_equals_bvec4( a : vec4f, b : vec4f ) -> vec4<bool> { return vec4<bool>( a.x == b.x, a.y == b.y, a.z == b.z, a.w == b.w ); }"),
  repeatWrapping_float: new CodeNode("fn tsl_repeatWrapping_float( coord: f32 ) -> f32 { return fract( coord ); }"),
  mirrorWrapping_float: new CodeNode("fn tsl_mirrorWrapping_float( coord: f32 ) -> f32 { let mirrored = fract( coord * 0.5 ) * 2.0; return 1.0 - abs( 1.0 - mirrored ); }"),
  clampWrapping_float: new CodeNode("fn tsl_clampWrapping_float( coord: f32 ) -> f32 { return clamp( coord, 0.0, 1.0 ); }"),
  inverse_mat2: new CodeNode(`
fn tsl_inverse_mat2( m : mat2x2<f32> ) -> mat2x2<f32> {

	let det = m[ 0 ][ 0 ] * m[ 1 ][ 1 ] - m[ 0 ][ 1 ] * m[ 1 ][ 0 ];

	return mat2x2<f32>(
		m[ 1 ][ 1 ], - m[ 0 ][ 1 ],
		- m[ 1 ][ 0 ], m[ 0 ][ 0 ]
	) * ( 1.0 / det );

}
`),
  inverse_mat3: new CodeNode(`
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
`),
  inverse_mat4: new CodeNode(`
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
`),
  biquadraticTexture: new CodeNode(`
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
`),
  biquadraticTextureArray: new CodeNode(`
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
`)
};
var wgslReservedKeywords = new Set([
  "alias",
  "break",
  "case",
  "const",
  "const_assert",
  "continue",
  "continuing",
  "default",
  "diagnostic",
  "discard",
  "else",
  "enable",
  "false",
  "fn",
  "for",
  "if",
  "let",
  "loop",
  "override",
  "requires",
  "return",
  "struct",
  "switch",
  "true",
  "var",
  "while",
  "NULL",
  "Self",
  "abstract",
  "active",
  "alignas",
  "alignof",
  "as",
  "asm",
  "asm_fragment",
  "async",
  "attribute",
  "auto",
  "await",
  "become",
  "binding_array",
  "cast",
  "catch",
  "class",
  "co_await",
  "co_return",
  "co_yield",
  "coherent",
  "column_major",
  "common",
  "compile",
  "compile_fragment",
  "concept",
  "const_cast",
  "consteval",
  "constexpr",
  "constinit",
  "crate",
  "debugger",
  "decltype",
  "delete",
  "demote",
  "demote_to_helper",
  "do",
  "dynamic_cast",
  "enum",
  "explicit",
  "export",
  "extends",
  "extern",
  "external",
  "fallthrough",
  "filter",
  "final",
  "finally",
  "friend",
  "from",
  "fxgroup",
  "get",
  "goto",
  "groupshared",
  "highp",
  "impl",
  "implements",
  "import",
  "inline",
  "instanceof",
  "interface",
  "layout",
  "lowp",
  "macro",
  "macro_rules",
  "match",
  "mediump",
  "meta",
  "mod",
  "module",
  "move",
  "mut",
  "mutable",
  "namespace",
  "new",
  "nil",
  "noexcept",
  "noinline",
  "nointerpolation",
  "non_coherent",
  "noncoherent",
  "noperspective",
  "null",
  "nullptr",
  "of",
  "operator",
  "package",
  "packoffset",
  "partition",
  "pass",
  "patch",
  "pixelfragment",
  "precise",
  "precision",
  "premerge",
  "priv",
  "protected",
  "pub",
  "public",
  "readonly",
  "ref",
  "regardless",
  "register",
  "reinterpret_cast",
  "require",
  "resource",
  "restrict",
  "self",
  "set",
  "shared",
  "sizeof",
  "smooth",
  "snorm",
  "static",
  "static_assert",
  "static_cast",
  "std",
  "subroutine",
  "super",
  "target",
  "template",
  "this",
  "thread_local",
  "throw",
  "trait",
  "try",
  "type",
  "typedef",
  "typeid",
  "typename",
  "typeof",
  "union",
  "unless",
  "unorm",
  "unsafe",
  "unsized",
  "use",
  "using",
  "varying",
  "virtual",
  "volatile",
  "wgsl",
  "where",
  "with",
  "writeonly",
  "yield",
  "main"
]);
var diagnostics = "";
if ((typeof navigator !== "undefined" && /Firefox|Deno/g.test(navigator.userAgent)) !== true) {
  diagnostics += `diagnostic( off, derivative_uniformity );
`;
}
var _bufferDescriptor$3 = new GPUBufferDescriptor;
var _commandEncoderDescriptor$2 = new GPUCommandEncoderDescriptor;
var typedArraysToVertexFormatPrefix = new Map([
  [Int8Array, ["sint8", "snorm8"]],
  [Uint8Array, ["uint8", "unorm8"]],
  [Int16Array, ["sint16", "snorm16"]],
  [Uint16Array, ["uint16", "unorm16"]],
  [Int32Array, ["sint32"]],
  [Uint32Array, ["uint32"]],
  [Float32Array, ["float32"]]
]);
if (typeof Float16Array !== "undefined") {
  typedArraysToVertexFormatPrefix.set(Float16Array, ["float16"]);
}
var typedAttributeToVertexFormatPrefix = new Map([
  [Float16BufferAttribute, ["float16"]]
]);
var typeArraysToVertexFormatPrefixForItemSize1 = new Map([
  [Int32Array, "sint32"],
  [Uint32Array, "uint32"],
  [Float32Array, "float32"]
]);
var _bindGroupDescriptor = new GPUBindGroupDescriptor;
var _bufferDescriptor$2 = new GPUBufferDescriptor;
var _viewDescriptor$1 = new GPUTextureViewDescriptor;
class GPUComputePipelineDescriptor {
  constructor() {
    this.label = "";
    this.layout = null;
    this.compute = null;
  }
  reset() {
    this.label = "";
    this.layout = null;
    this.compute = null;
  }
}

class GPUPipelineLayoutDescriptor {
  constructor() {
    this.label = "";
    this.bindGroupLayouts = null;
  }
  reset() {
    this.label = "";
    this.bindGroupLayouts = null;
  }
}
var _computePipelineDescriptor = new GPUComputePipelineDescriptor;
var _pipelineLayoutDescriptor = new GPUPipelineLayoutDescriptor;
var _renderBundleEncoderDescriptor = new GPURenderBundleEncoderDescriptor;
var _renderPipelineDescriptor = new GPURenderPipelineDescriptor;
class GPUQuerySetDescriptor {
  constructor() {
    this.label = "";
    this.type = undefined;
    this.count = 0;
  }
  reset() {
    this.label = "";
    this.type = undefined;
    this.count = 0;
  }
}
var _bufferDescriptor$1 = new GPUBufferDescriptor;
var _commandEncoderDescriptor$1 = new GPUCommandEncoderDescriptor;
var _querySetDescriptor$1 = new GPUQuerySetDescriptor;
class GPUComputePassDescriptor {
  constructor() {
    this.label = "";
    this.timestampWrites = undefined;
  }
  reset() {
    this.label = "";
    this.timestampWrites = undefined;
  }
}
class GPURenderPassTimestampWrites {
  constructor() {
    this.querySet = null;
    this.beginningOfPassWriteIndex = undefined;
    this.endOfPassWriteIndex = undefined;
  }
  reset() {
    this.querySet = null;
    this.beginningOfPassWriteIndex = undefined;
    this.endOfPassWriteIndex = undefined;
  }
}
var _bufferDescriptor = new GPUBufferDescriptor;
var _commandEncoderDescriptor = new GPUCommandEncoderDescriptor;
var _computePassDescriptor = new GPUComputePassDescriptor;
var _querySetDescriptor = new GPUQuerySetDescriptor;
var _shaderModuleDescriptor = new GPUShaderModuleDescriptor;
var _renderPassTimestampWrites = new GPURenderPassTimestampWrites;
var _texelCopyTextureInfoSrc = new GPUTexelCopyTextureInfo;
var _texelCopyTextureInfoDst = new GPUTexelCopyTextureInfo;
var _textureDescriptor = new GPUTextureDescriptor;
var _viewDescriptor = new GPUTextureViewDescriptor;
var _extent3D = new GPUExtent3D;

// src/render/world/palette.ts
var SUN_DIRECTION = [0.28, 0.86, -0.43];
var SUN_COLOR = "#aebdbb";
var HEMI_SKY_COLOR = "#5a6865";
var HEMI_GROUND_COLOR = "#131a19";
var FOG_COLOR = "#303b38";
var SKY_ZENITH = "#1c2725";
var PALETTE = {
  sand: "#5d5849",
  sandWet: "#3f3c33",
  grass: "#2d4529",
  grassLight: "#365231",
  grassDeep: "#243a22",
  forestFloor: "#1f331d",
  rock: "#363a37",
  rockLight: "#464b47",
  rockDark: "#2a2d2b",
  snow: "#6c7471",
  seabed: "#2b302c",
  treeLight: "#22381f",
  treeMid: "#1d3220",
  treeDeep: "#16281a",
  trunk: "#221d19",
  palmLeaf: "#24391f",
  shallow: "#3a4d48",
  water: "#2e3b38",
  deep: "#1f2b2a",
  foam: "#b8c4c0",
  zenith: SKY_ZENITH,
  horizon: FOG_COLOR,
  offWhite: "#7d8380",
  concrete: "#6b6f6c",
  paving: "#5e6260",
  pavingDark: "#4c504e",
  marking: "#b8bdb9",
  glass: "#2c3438",
  roof: "#5a5f5c",
  sunLight: SUN_COLOR,
  hemiSky: HEMI_SKY_COLOR,
  hemiGround: HEMI_GROUND_COLOR
};
function rgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  const lin = (c) => {
    const s = c / 255;
    return Math.round((s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)) * 255);
  };
  return [lin(v >> 16 & 255), lin(v >> 8 & 255), lin(v & 255)];
}
var PALETTE_RGB = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, rgb(v)]));

// src/render/world/settings.ts
var SUN_DIRECTION2 = new Vector3(...SUN_DIRECTION).normalize();

// src/render/toon.ts
var envUsers = new Set;
// src/render/aircraft.ts
var CONFIG = {
  "astra-interceptor": {
    file: "astra-interceptor",
    pivots: [],
    stores: [],
    spinners: [],
    afterburners: [],
    anchors: [{ key: "gun", node: "gun_muzzle" }],
    placeholder: { length: 17.15, span: 12, heli: false },
    shadow: [12, 17.15]
  },
  "astra-trainer": {
    file: "astra-trainer",
    pivots: ["propeller"],
    stores: [],
    afterburners: [],
    spinners: [{ name: "propeller", axis: "z", speed: 40, driver: "engine" }],
    anchors: [{ key: "gun", node: "gun_muzzle" }],
    placeholder: { length: 9.55, span: 11.2, heli: false },
    shadow: [11.2, 9.55]
  },
  fighter: {
    file: "fa18",
    pivots: [
      "gear",
      "pilot_1",
      "pilot_2",
      "targeting_pod_head",
      "afterburner_L",
      "afterburner_R",
      "missile_L1",
      "missile_L2",
      "missile_R1",
      "missile_R2",
      "wingtip_missile_L",
      "wingtip_missile_R"
    ],
    stores: [
      { weapons: [[0, 1]], order: ["missile_L2", "missile_R2", "wingtip_missile_L", "wingtip_missile_R"] },
      { weapons: [[1, 0], [1, 1]], order: ["missile_L1", "missile_R1"] }
    ],
    spinners: [],
    afterburners: [
      { name: "afterburner_L", axis: "y", cone: { dir: "y", sign: -1, length: 1.5 } },
      { name: "afterburner_R", axis: "y", cone: { dir: "y", sign: -1, length: 1.5 } }
    ],
    ballPod: { name: "targeting_pod_head", seat: 1, maxUp: 0.15 },
    anchors: [
      { key: "gun", node: "gun_muzzle" },
      { key: "afterburner_L", node: "afterburner_L" },
      { key: "afterburner_R", node: "afterburner_R" },
      { key: "targeting_pod_head", node: "targeting_pod_head" }
    ],
    placeholder: { length: 17.5, span: 13, heli: false },
    shadow: [14, 18]
  },
  apache: {
    file: "apache",
    pivots: [
      "main_rotor",
      "tail_rotor",
      "turret_chin",
      "turret_chin_pitch",
      "pilot_1",
      "pilot_2",
      "gear",
      "hellfire_L1",
      "hellfire_L2",
      "hellfire_L3",
      "hellfire_L4",
      "hellfire_R1",
      "hellfire_R2",
      "hellfire_R3",
      "hellfire_R4"
    ],
    stores: [
      {
        weapons: [[1, 1]],
        order: ["hellfire_L4", "hellfire_R4", "hellfire_L3", "hellfire_R3", "hellfire_L2", "hellfire_R2", "hellfire_L1", "hellfire_R1"]
      }
    ],
    spinners: [
      { name: "main_rotor", axis: "y", speed: -30, driver: "rotor" },
      { name: "tail_rotor", axis: "x", speed: 70, driver: "rotor" }
    ],
    afterburners: [],
    turret: { yaw: "turret_chin", pitch: "turret_chin_pitch", seat: 1, yawMax: 1.92, pitchMin: -1.05, pitchMax: 0.19 },
    anchors: [
      { key: "gun", node: "turret_chin_barrel", tip: true },
      { key: "turret_chin_barrel", node: "turret_chin_barrel", tip: true },
      { key: "rocket_pod_L", node: "rocket_pod_L", tip: true },
      { key: "rocket_pod_R", node: "rocket_pod_R", tip: true },
      { key: "exhaust_L", node: "exhaust_L" },
      { key: "exhaust_R", node: "exhaust_R" },
      { key: "main_rotor", node: "main_rotor" }
    ],
    placeholder: { length: 16, span: 5.2, heli: true },
    shadow: [13, 16]
  },
  warthog: {
    file: "a10",
    pivots: ["gau8_barrels", "engine_fan_L", "engine_fan_R", "pilot_1", "pilot_2", "gear", "missile_L1", "missile_R1", "targeting_pod_head"],
    attach: { targeting_pod_window: "targeting_pod_head" },
    stores: [{ weapons: [[1, 0], [1, 1]], order: ["missile_R1", "missile_L1"] }],
    spinners: [
      { name: "gau8_barrels", axis: "z", speed: 45, driver: "gun" },
      { name: "engine_fan_L", axis: "z", speed: 40, driver: "engine" },
      { name: "engine_fan_R", axis: "z", speed: -40, driver: "engine" }
    ],
    afterburners: [],
    rollPod: { name: "targeting_pod_head", seat: 1 },
    anchors: [
      { key: "gun", node: "gau8_barrels", tip: true },
      { key: "exhaust_L", node: "engine_exhaust_cone_L" },
      { key: "exhaust_R", node: "engine_exhaust_cone_R" },
      { key: "rocket_pod_L", node: "rocket_pod_L1", tip: true },
      { key: "rocket_pod_R", node: "rocket_pod_R1", tip: true },
      { key: "flares_L", node: "flares_L" },
      { key: "flares_R", node: "flares_R" },
      { key: "targeting_pod_head", node: "targeting_pod_head" }
    ],
    placeholder: { length: 16.3, span: 17.5, heli: false },
    shadow: [18.5, 16.5]
  },
  blackbird: {
    file: "yf12",
    pivots: ["afterburner_L", "afterburner_R", "fin_L", "fin_R", "missile_1", "missile_2", "missile_3", "pilot_1", "pilot_2", "gear"],
    stores: [{ weapons: [[0, 0], [0, 1]], order: ["missile_3", "missile_2", "missile_1"] }],
    spinners: [],
    afterburners: [
      { name: "afterburner_L", axis: "z", cone: { dir: "z", sign: 1, length: 2.4 } },
      { name: "afterburner_R", axis: "z", cone: { dir: "z", sign: 1, length: 2.4 } }
    ],
    rudders: { names: ["fin_L", "fin_R"], gain: -0.9, max: 0.4 },
    anchors: [
      { key: "gun", node: "pitot_tube" },
      { key: "afterburner_L", node: "afterburner_L" },
      { key: "afterburner_R", node: "afterburner_R" },
      { key: "missile_bay_L", node: "missile_bay_L" },
      { key: "missile_bay_R", node: "missile_bay_R" }
    ],
    placeholder: { length: 31, span: 17, heli: false },
    shadow: [17, 30]
  },
  bomber: {
    file: "b2",
    pivots: [
      "pilot_1",
      "pilot_2",
      "gear",
      "bomb_bay_doors_L",
      "bomb_bay_doors_R",
      "bomb_1",
      "bomb_2",
      "bomb_3",
      "bomb_4",
      "bomb_5",
      "bomb_6",
      "bomb_7",
      "bomb_8"
    ],
    stores: [{ weapons: [[1, 0]], order: ["bomb_8", "bomb_7", "bomb_6", "bomb_5", "bomb_4", "bomb_3", "bomb_2", "bomb_1"] }],
    spinners: [],
    afterburners: [],
    doors: { names: [["bomb_bay_doors_L", 1.45], ["bomb_bay_doors_R", -1.45]], axis: "z", seat: 1 },
    anchors: [
      { key: "gun", node: "b2", tip: true },
      { key: "exhaust_L", node: "exhaust_1" },
      { key: "exhaust_R", node: "exhaust_4" },
      { key: "bomb_bay", node: "bombs" }
    ],
    placeholder: { length: 21, span: 52, heli: false },
    shadow: [52, 21]
  }
};
var templates = new Map;
var loading = new Map;
var readyListeners = new Map;
var baseUrlDefault = import.meta.env?.BASE_URL ?? "/";
var paintCache = new Map;
var liveryCache = new Map;
var placeholderGeoms = new Map;
var _v3 = new Vector3;
var _q4 = new Quaternion;
var _q22 = new Quaternion;
var _rootQ = new Quaternion;
var _aimBody = new Vector3;
var _fwd = new Vector3(0, 0, -1);
var AXES = { x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) };
var _axisQ = new Quaternion;
var CREASE_ANGLE = 55 * Math.PI / 180;
var _sn = new Vector3;
var _sb = new Vector3;
var _sr = new Vector3;
var _v22 = new Vector3;
var _shadowM = new Matrix4;
var _rootM = new Matrix4;

// src/sim/protocol.ts
var DEFAULT_ROOM_CONFIG = {
  teams: 2,
  bots: 0,
  maxPerTeam: 10,
  scoreLimit: 50,
  timeLimit: 10 * 60,
  listed: true,
  name: "Open Skies"
};
var RESPAWN_DELAY = 5;

// src/sim/types.ts
var TICK_RATE = 60;
var TICK_DT = 1 / TICK_RATE;
var SNAPSHOT_RATE = 20;

// src/sim/flight.ts
var NEUTRAL_INPUT = { aim: null, throttle: 0, roll: 0, yaw: 0, pitch: 0, boost: false, brake: false };
var GRAVITY = 9.81;
var DEG = Math.PI / 180;
var CAT_DECK_MIN_HEIGHT = 10;
var CAT_END_SPEED = 1.3;
var CAT_STROKE_TIME = 2.2;
var YAW_TURN_GRIP = 25;
var DIRECT_LEVEL_GAIN = 1.5;
var AIRBRAKE_TURN_BONUS = 1.25;
var PARK_BRAKE = 6;
var HELI_STRAFE_ROLL = 0.45;
var HELI_FLIP_ROLL = 0.7;
var HOVER_COLLECTIVE = 0.5;
var ORIGINAL_JET = {
  fighter: {
    thrust: 20,
    throttleRate: 0.7,
    cornerSpeed: 92,
    cornerRate: 1.1,
    minRateFrac: 0.35,
    pushFrac: 0.6,
    rollRate: 4,
    yawRate: 0.44,
    rollRef: 70,
    yawTurnRate: 0.96,
    yawBank: 30 * DEG,
    pitchResponse: 11,
    rollResponse: 15,
    yawResponse: 8,
    pitchGain: 2.8,
    rollGain: 4,
    yawGain: 1.8,
    grip: 8,
    induced: 0.035,
    pathGravity: 0.5,
    airbrake: 3.5,
    wheelBrake: 10,
    sideLift: 0.6,
    bankTurn: 0.5,
    maxGroundPitch: 13 * DEG,
    gearHeight: 2,
    bellyHeight: 1
  },
  warthog: {
    thrust: 11,
    throttleRate: 0.55,
    cornerSpeed: 70,
    cornerRate: 1,
    minRateFrac: 0.4,
    pushFrac: 0.6,
    rollRate: 2.6,
    yawRate: 0.44,
    rollRef: 50,
    yawTurnRate: 0.79,
    yawBank: 28 * DEG,
    pitchResponse: 8,
    rollResponse: 11,
    yawResponse: 7,
    pitchGain: 2.2,
    rollGain: 3,
    yawGain: 1.7,
    grip: 8,
    induced: 0.04,
    pathGravity: 0.85,
    airbrake: 3.5,
    wheelBrake: 9,
    sideLift: 0.65,
    bankTurn: 0.5,
    maxGroundPitch: 12 * DEG,
    gearHeight: 2,
    bellyHeight: 1
  },
  blackbird: {
    thrust: 28,
    throttleRate: 0.5,
    cornerSpeed: 140,
    cornerRate: 0.46,
    minRateFrac: 0.35,
    pushFrac: 0.5,
    rollRate: 1.9,
    yawRate: 0.26,
    rollRef: 170,
    yawTurnRate: 0.44,
    yawBank: 22 * DEG,
    pitchResponse: 6,
    rollResponse: 8,
    yawResponse: 5,
    pitchGain: 1.5,
    rollGain: 2,
    yawGain: 0.9,
    grip: 7,
    induced: 0.06,
    pathGravity: 0.4,
    airbrake: 3,
    wheelBrake: 9,
    sideLift: 0.5,
    bankTurn: 0.5,
    maxGroundPitch: 12 * DEG,
    gearHeight: 2,
    bellyHeight: 1
  },
  bomber: {
    thrust: 9,
    throttleRate: 0.35,
    cornerSpeed: 110,
    cornerRate: 0.23,
    minRateFrac: 0.4,
    pushFrac: 0.5,
    rollRate: 0.8,
    yawRate: 0.09,
    rollRef: 100,
    yawTurnRate: 0.21,
    yawBank: 15 * DEG,
    pitchResponse: 3.5,
    rollResponse: 4.5,
    yawResponse: 3,
    pitchGain: 0.9,
    rollGain: 1.1,
    yawGain: 0.6,
    grip: 6,
    induced: 0.12,
    pathGravity: 0.7,
    airbrake: 2.5,
    wheelBrake: 8,
    sideLift: 0.5,
    bankTurn: 0.5,
    maxGroundPitch: 10 * DEG,
    gearHeight: 2.5,
    bellyHeight: 1.2
  }
};
var JET = {
  ...ORIGINAL_JET,
  "astra-interceptor": {
    ...ORIGINAL_JET.fighter,
    cornerSpeed: 99.36,
    cornerRate: 1.034,
    rollRate: 3.76,
    yawTurnRate: 0.9024,
    pitchResponse: 10.34,
    rollResponse: 14.1,
    yawResponse: 7.52
  },
  "astra-trainer": {
    ...ORIGINAL_JET.fighter,
    cornerSpeed: 82.8,
    cornerRate: 1.188,
    rollRate: 4.32,
    yawTurnRate: 1.0368,
    pitchResponse: 11.88,
    rollResponse: 16.2,
    yawResponse: 8.64
  }
};
var HELI = {
  apache: {
    collectiveRate: 0.8,
    collectiveReturn: 1.5,
    altitudeHold: 1.5,
    cushion: 3,
    cushionHeight: 10,
    maxTilt: 25 * DEG,
    boostTilt: 36 * DEG,
    backTilt: 18 * DEG,
    sideTilt: 22 * DEG,
    cyclicRate: 0.9,
    driftKill: 0.35,
    tiltGain: 4,
    maxTiltRate: 1.6,
    tiltResponse: 9,
    flipRate: 2.2,
    yawRate: 1.7,
    yawGain: 3,
    yawResponse: 7,
    cyclicGain: 1.8,
    dragQuad: 0.001063,
    dragLin: 0.03,
    dragVert: 0.6,
    grip: 0.9,
    gearHeight: 2
  }
};
var HELI_DIRECT = {
  apache: {
    collectiveRate: 1.2,
    detentWidth: 0.1,
    detentRate: 0.3,
    pitchRate: 1.5,
    rollRate: 1.6,
    yawRate: 1.5,
    cyclicResponse: 12,
    yawResponse: 10,
    strafeGain: 4,
    coordBank: 0.8,
    maxCoordBank: 25 * DEG,
    rightGain: 1.6,
    rightCap: 1,
    rightInverted: 0.35,
    rightUnderInput: 0.5,
    highCollective: 0.6,
    highReturnRate: 0.35,
    cyclicGain: 1.3,
    dragQuad: 0.0016,
    dragLin: 0.08,
    dragVert: 0.55,
    brakeGain: 0.6,
    brakeTilt: 30 * DEG,
    brakeAttitudeGain: 3,
    brakeRecoverRate: 3,
    brakeVertical: 1.5,
    brakeCollectiveRate: 0.8,
    cushion: 2,
    cushionHeight: 8,
    gearHeight: 2
  }
};
var clamp3 = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
var axis = (v) => v > 1 ? 1 : v < -1 ? -1 : v === v ? v : 0;
var smoothstep3 = (a, b, x) => {
  const t = clamp3((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
var wrapAngle = (a) => {
  while (a > Math.PI)
    a -= 2 * Math.PI;
  while (a < -Math.PI)
    a += 2 * Math.PI;
  return a;
};
function rotInto(out, q, vx, vy, vz, inverse = false) {
  const qx = inverse ? -q[0] : q[0], qy = inverse ? -q[1] : q[1], qz = inverse ? -q[2] : q[2], qw = q[3];
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  out[0] = vx + qw * tx + (qy * tz - qz * ty);
  out[1] = vy + qw * ty + (qz * tx - qx * tz);
  out[2] = vz + qw * tz + (qx * ty - qy * tx);
}
function integrateOrientation(q, wx, wy, wz, dt) {
  const rate = Math.sqrt(wx * wx + wy * wy + wz * wz);
  if (rate < 0.000000001)
    return;
  const half = rate * dt * 0.5;
  const k = Math.sin(half) / rate;
  const bx = wx * k, by = wy * k, bz = wz * k, bw = Math.cos(half);
  const ax = q[0], ay = q[1], az = q[2], aw = q[3];
  let x = aw * bx + ax * bw + ay * bz - az * by;
  let y = aw * by - ax * bz + ay * bw + az * bx;
  let z = aw * bz + ax * by - ay * bx + az * bw;
  let w = aw * bw - ax * bx - ay * by - az * bz;
  const n = 1 / Math.sqrt(x * x + y * y + z * z + w * w);
  q[0] = x * n;
  q[1] = y * n;
  q[2] = z * n;
  q[3] = w * n;
}
function setYawPitchRoll(q, yaw, pitch, bank) {
  const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2);
  const cp = Math.cos(pitch / 2), sp = Math.sin(pitch / 2);
  const cr = Math.cos(-bank / 2), sr = Math.sin(-bank / 2);
  const ax = cy * sp, ay = sy * cp, az = -sy * sp, aw = cy * cp;
  q[0] = ax * cr + ay * sr;
  q[1] = ay * cr - ax * sr;
  q[2] = aw * sr + az * cr;
  q[3] = aw * cr - az * sr;
}
var F = [0, 0, 0];
var U = [0, 0, 0];
var R = [0, 0, 0];
var TMP = [0, 0, 0];
var AIM = [0, 0, 0];
function basis(q) {
  rotInto(F, q, 0, 0, -1);
  rotInto(U, q, 0, 1, 0);
  rotInto(R, q, 1, 0, 0);
}
function createFlightState(kind, spawn) {
  const heli = VEHICLES[kind].flight === "heli";
  const orientation = [0, 0, 0, 1];
  setYawPitchRoll(orientation, spawn.yaw, 0, 0);
  const airSpeed = heli ? 0 : VEHICLES[kind].cruise;
  return {
    kind,
    position: [spawn.position[0], spawn.position[1], spawn.position[2]],
    velocity: spawn.onGround ? [0, 0, 0] : [-Math.sin(spawn.yaw) * airSpeed, 0, -Math.cos(spawn.yaw) * airSpeed],
    orientation,
    angularVelocity: [0, 0, 0],
    throttle: heli ? spawn.onGround ? 0.35 : 0.5 : spawn.onGround ? 0 : 1,
    onGround: spawn.onGround,
    gearDown: spawn.onGround || heli,
    crashed: null,
    tick: 0
  };
}
function stepFlight(state, input, dt, world) {
  if (state.crashed)
    return;
  state.tick++;
  const spec = VEHICLES[state.kind];
  let hasAim = false;
  const a = input.aim;
  if (a) {
    const len = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    if (len > 0.000001) {
      AIM[0] = a[0] / len;
      AIM[1] = a[1] / len;
      AIM[2] = a[2] / len;
      hasAim = true;
    }
  }
  if (spec.flight === "heli") {
    if (hasAim)
      stepHeliAim(state, input, dt, world, HELI[state.kind]);
    else
      stepHeliDirect(state, input, dt, world, HELI_DIRECT[state.kind]);
  } else
    stepJet(state, input, hasAim, dt, world, spec, JET[state.kind]);
}
function airFactor(y, ceiling) {
  return clamp3((ceiling - y) / 400, 0, 1);
}
function stepJet(s, inp, hasAim, dt, world, spec, h) {
  const { orientation: q, velocity: v, angularVelocity: w, position: p } = s;
  s.throttle = clamp3(s.throttle + axis(inp.throttle) * h.throttleRate * dt, 0, 1);
  const inRoll = axis(inp.roll), inPitch = axis(inp.pitch), inYaw = axis(inp.yaw);
  basis(q);
  let speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  const vf = v[0] * F[0] + v[1] * F[1] + v[2] * F[2];
  const air = airFactor(p[1], world.ceiling);
  const stall = spec.stall;
  const lift = smoothstep3(0.7 * stall, stall, vf) * air;
  const corner = h.cornerSpeed;
  const slowFrac = clamp3(vf / corner, 0, 1);
  const pitchMax = h.cornerRate * Math.max(h.minRateFrac, vf <= corner ? slowFrac : corner / vf) * (inp.brake && !s.onGround ? AIRBRAKE_TURN_BONUS : 1);
  const yawMax = h.yawRate * Math.max(0.3, slowFrac);
  const rollMax = h.rollRate * (0.35 + 0.65 * clamp3(vf / h.rollRef, 0, 1));
  const bank = Math.atan2(-R[1], U[1]);
  const pitchAngle = Math.asin(clamp3(F[1], -1, 1));
  let pUp = 0, yRight = 0, rRight = 0;
  let yawTurn = 0;
  if (s.onGround) {
    const steerMax = 0.25 + 0.45 * (1 - clamp3(speed / stall, 0, 1));
    if (inYaw !== 0)
      yRight = inYaw * steerMax;
    else if (hasAim && AIM[0] * AIM[0] + AIM[2] * AIM[2] > 0.000001) {
      const heading = Math.atan2(-F[0], -F[2]);
      const aimHeading = Math.atan2(-AIM[0], -AIM[2]);
      yRight = clamp3(-wrapAngle(aimHeading - heading) * 2, -steerMax, steerMax);
    }
    let targetPitch = 0;
    if (vf > 0.88 * stall) {
      if (inPitch !== 0)
        targetPitch = Math.max(0, inPitch) * h.maxGroundPitch;
      else if (hasAim)
        targetPitch = clamp3(Math.asin(clamp3(AIM[1], -1, 1)), 0, h.maxGroundPitch);
      if (vf > stall && inPitch >= 0 && !inp.brake && (s.throttle > 0.6 || inp.boost) && !(hasAim && AIM[1] < -0.035))
        targetPitch = Math.max(targetPitch, 6 * DEG);
    }
    pUp = clamp3((targetPitch - pitchAngle) * 3, -0.4, 0.4);
  } else {
    if (hasAim) {
      rotInto(TMP, q, AIM[0], AIM[1], AIM[2], true);
      const lx = TMP[0], ly = TMP[1], fz = -TMP[2];
      const ang = Math.acos(clamp3(fz, -1, 1));
      const behind = fz < -0.6 ? (-0.6 - fz) * 2.5 : 0;
      const s2 = smoothstep3(25 * DEG, 60 * DEG, ang);
      const absLy = Math.abs(ly);
      const uRoll = absLy + (ly - absLy) * s2 + behind;
      const rollToTarget = Math.atan2(lx, uRoll);
      const aggressive = smoothstep3(4 * DEG, 20 * DEG, ang);
      const rollErr = aggressive * rollToTarget + (1 - aggressive) * -bank;
      const pitchErr = Math.atan2(ly + behind, fz);
      const yawErr = Math.atan2(lx, Math.max(fz, 0.2));
      pUp = h.pitchGain * pitchErr;
      rRight = h.rollGain * rollErr;
      yRight = h.yawGain * yawErr * (1 - aggressive);
      if (inPitch !== 0) {
        pUp = inPitch * pitchMax;
        if (inRoll === 0)
          rRight = 0;
        yRight = 0;
      }
      if (inYaw !== 0)
        yRight = inYaw * yawMax;
      if (inRoll !== 0)
        rRight = inRoll * rollMax;
      pUp = clamp3(pUp, -pitchMax * h.pushFrac, pitchMax);
      yRight = clamp3(yRight, -yawMax, yawMax);
      rRight = clamp3(rRight, -rollMax, rollMax);
    } else {
      pUp = clamp3(inPitch * pitchMax * (inPitch < 0 ? 0.75 : 1), -pitchMax, pitchMax);
      rRight = inRoll * rollMax;
      const absBank = Math.abs(bank), upright = absBank < 100 * DEG && Math.cos(pitchAngle) > 0.35;
      if (inYaw !== 0) {
        yawTurn = inYaw * h.yawTurnRate * Math.max(0.4, Math.min(1, vf / (0.7 * corner)));
        if (inRoll === 0 && upright)
          rRight = clamp3(h.rollGain * (inYaw * h.yawBank - bank), -rollMax, rollMax);
      } else if (inRoll === 0 && Math.abs(inPitch) < 0.05 && upright) {
        rRight = clamp3(-bank * DIRECT_LEVEL_GAIN, -rollMax, rollMax);
      }
    }
  }
  let tx = pUp, ty = -yRight, tz = -rRight;
  if (!s.onGround) {
    const turn = -h.bankTurn * GRAVITY * Math.sin(bank) * Math.max(0, Math.cos(pitchAngle)) * lift / Math.max(speed, stall);
    rotInto(TMP, q, 0, turn, 0, true);
    tx += TMP[0];
    ty += TMP[1];
    tz += TMP[2];
    if (yawTurn !== 0) {
      const uy = U[1], wy = smoothstep3(0, 0.18, Math.abs(uy)), k = 1 - wy;
      const axX = U[0] * k, axY = (uy < 0 ? -wy : wy) + U[1] * k, axZ = U[2] * k;
      const n = Math.sqrt(axX * axX + axY * axY + axZ * axZ);
      if (n > 0.000001) {
        rotInto(TMP, q, axX / n * -yawTurn, axY / n * -yawTurn, axZ / n * -yawTurn, true);
        tx += TMP[0];
        ty += TMP[1];
        tz += TMP[2];
      }
    }
    const unlift = 1 - lift;
    if (unlift > 0) {
      rotInto(TMP, q, 0, -1, 0, true);
      const fwdDown = -TMP[2];
      tx += clamp3(0.8 * Math.atan2(TMP[1], fwdDown), -0.6, 0.6) * unlift;
      ty += clamp3(0.8 * Math.atan2(-TMP[0], fwdDown), -0.6, 0.6) * unlift;
      if (speed > 5) {
        rotInto(TMP, q, v[0], v[1], v[2], true);
        const bf = -TMP[2];
        if (bf > 0) {
          tx += clamp3(Math.atan2(TMP[1], bf), -0.5, 0.5) * unlift;
          ty += clamp3(Math.atan2(-TMP[0], bf), -0.5, 0.5) * unlift;
        }
      }
    }
  }
  const rollStep = w[2] * dt, cr = Math.cos(rollStep), sr = Math.sin(rollStep);
  const wx0 = w[0], wy0 = w[1];
  w[0] = wx0 * cr + wy0 * sr;
  w[1] = -wx0 * sr + wy0 * cr;
  w[0] += (tx - w[0]) * (1 - Math.exp(-h.pitchResponse * dt));
  w[1] += (ty - w[1]) * (1 - Math.exp(-h.yawResponse * dt));
  w[2] += (tz - w[2]) * (1 - Math.exp(-h.rollResponse * dt));
  integrateOrientation(q, w[0], w[1], w[2], dt);
  basis(q);
  const engine = 0.35 + 0.65 * air;
  let thrust = (inp.boost ? h.thrust * (spec.boost / spec.cruise) ** 2 : s.throttle * h.thrust) * engine;
  if (s.onGround && !inp.brake && (s.throttle > 0.5 || inp.boost) && world.groundHeight(p[0], p[2]) > CAT_DECK_MIN_HEIGHT && world.onRunway(p[0], p[2])) {
    const deck = world.deckVelocity?.(p[0], p[2]);
    const vRel = deck ? vf - (deck[0] * F[0] + deck[1] * F[1] + deck[2] * F[2]) : vf;
    if (vRel < CAT_END_SPEED * stall)
      thrust += CAT_END_SPEED * stall / CAT_STROKE_TIME;
  }
  const dragK = h.thrust / (spec.cruise * spec.cruise) * (inp.brake ? h.airbrake : 1);
  const turnRate = Math.sqrt(w[0] * w[0] + w[1] * w[1]);
  const inducedDecel = h.induced * turnRate * turnRate * (h.cornerSpeed * h.cornerSpeed) / (GRAVITY * GRAVITY);
  const resist = speed > 0.000001 ? (dragK * speed * speed + inducedDecel) / speed : 0;
  const liftU = lift * GRAVITY * U[1], liftR = lift * GRAVITY * h.sideLift * R[1];
  const pathG = GRAVITY * F[1] * (1 - h.pathGravity) * lift;
  let ax = F[0] * (thrust + pathG) - v[0] * resist + U[0] * liftU + R[0] * liftR;
  let ay = F[1] * (thrust + pathG) - v[1] * resist + U[1] * liftU + R[1] * liftR - GRAVITY;
  let az = F[2] * (thrust + pathG) - v[2] * resist + U[2] * liftU + R[2] * liftR;
  if (p[1] > world.ceiling)
    ay -= (p[1] - world.ceiling) * 0.3;
  v[0] += ax * dt;
  v[1] += ay * dt;
  v[2] += az * dt;
  speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  const along = v[0] * F[0] + v[1] * F[1] + v[2] * F[2];
  if (speed > 1 && along > 0) {
    const k = 1 - Math.exp(-(h.grip + Math.abs(yawTurn) * YAW_TURN_GRIP) * (0.2 + 0.8 * lift) * dt);
    v[0] += (F[0] * speed - v[0]) * k;
    v[1] += (F[1] * speed - v[1]) * k;
    v[2] += (F[2] * speed - v[2]) * k;
    const n = speed / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    v[0] *= n;
    v[1] *= n;
    v[2] *= n;
  }
  if (p[1] > world.ceiling + 150 && v[1] > 0)
    v[1] = 0;
  p[0] += v[0] * dt;
  p[1] += v[1] * dt;
  p[2] += v[2] * dt;
  const wheelDecel = inp.brake ? h.wheelBrake : s.throttle < 0.05 && !inp.boost ? PARK_BRAKE : 0.4;
  const ground = resolveGround(s, world, false, h.gearHeight, h.bellyHeight, spec.stall, h.maxGroundPitch, wheelDecel, dt);
  if (s.crashed)
    return;
  const agl = p[1] - h.gearHeight - ground;
  const gs = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (s.onGround)
    s.gearDown = true;
  else if (s.gearDown && agl > 40)
    s.gearDown = false;
  else if (!s.gearDown && agl < 25 && gs < 1.4 * stall)
    s.gearDown = true;
  checkBoundary(s, world);
}
function stepHeliDirect(s, inp, dt, world, h) {
  const { orientation: q, velocity: v, angularVelocity: w, position: p } = s;
  const inCollective = axis(inp.throttle);
  const inRoll = axis(inp.roll), inPitch = axis(inp.pitch), inYaw = axis(inp.yaw);
  if (inCollective !== 0)
    s.throttle = clamp3(s.throttle + inCollective * h.collectiveRate * dt, 0, 1);
  else if (!s.onGround) {
    const d = HOVER_COLLECTIVE - s.throttle;
    const pull = inp.brake ? h.brakeCollectiveRate : Math.abs(d) < h.detentWidth ? h.detentRate : s.throttle > h.highCollective ? h.highReturnRate : 0;
    const step = pull * dt;
    s.throttle += d > step ? step : d < -step ? -step : d;
  }
  basis(q);
  const pitchAngle = Math.asin(clamp3(F[1], -1, 1));
  const bank = Math.atan2(-R[1], U[1]);
  let tx = inPitch * h.pitchRate;
  let ty = -inYaw * h.yawRate;
  let tz = -inRoll * h.rollRate;
  rotInto(TMP, q, 0, 1, 0, true);
  const tilt = Math.acos(clamp3(TMP[1], -1, 1));
  let axX = TMP[2], axZ = -TMP[0];
  let axN = Math.sqrt(axX * axX + axZ * axZ);
  if (axN < 0.0001) {
    axX = 0;
    axZ = 1;
    axN = 1;
  }
  axX /= axN;
  axZ /= axN;
  if (inp.brake && !s.onGround && tilt > h.brakeTilt * 1.5) {
    const r = Math.min(h.brakeAttitudeGain * tilt, h.brakeRecoverRate);
    if (inPitch === 0)
      tx = axX * r;
    if (inRoll === 0)
      tz = axZ * r;
  } else if (inp.brake && !s.onGround) {
    const heading = Math.atan2(-F[0], -F[2]);
    const vF = v[0] * -Math.sin(heading) + v[2] * -Math.cos(heading);
    const vR = v[0] * Math.cos(heading) + v[2] * -Math.sin(heading);
    const pitchT = clamp3(Math.atan(vF * h.brakeGain / GRAVITY), -h.brakeTilt, h.brakeTilt);
    const bankT = clamp3(Math.atan(-vR * h.brakeGain / GRAVITY), -h.brakeTilt, h.brakeTilt);
    if (inPitch === 0)
      tx = clamp3(h.brakeAttitudeGain * wrapAngle(pitchT - pitchAngle), -h.pitchRate, h.pitchRate);
    if (inRoll === 0)
      tz = -clamp3(h.brakeAttitudeGain * wrapAngle(bankT - bank), -h.rollRate, h.rollRate);
  } else if (!s.onGround) {
    const strength = Math.min(h.rightGain * tilt, h.rightCap) + (h.rightInverted - h.rightCap) * smoothstep3(100 * DEG, 170 * DEG, tilt);
    tx += axX * strength * (1 - h.rightUnderInput * Math.abs(inPitch));
    tz = -inRoll * h.rollRate + axZ * strength * (1 - h.rightUnderInput * Math.abs(inRoll));
    if (inRoll === 0 && inYaw !== 0) {
      const heading = Math.atan2(-F[0], -F[2]);
      const vF = v[0] * -Math.sin(heading) + v[2] * -Math.cos(heading);
      const coordBank = clamp3(Math.atan(vF * inYaw * h.yawRate / GRAVITY) * h.coordBank, -h.maxCoordBank, h.maxCoordBank);
      const turnW = Math.abs(inYaw) * smoothstep3(5, 30, vF);
      tz += (-clamp3(h.strafeGain * wrapAngle(coordBank - bank), -h.rollRate, h.rollRate) - tz) * turnW;
    }
  }
  if (s.onGround && s.throttle < 0.3)
    ty = 0;
  const kc = 1 - Math.exp(-h.cyclicResponse * dt);
  w[0] += (tx - w[0]) * kc;
  w[1] += (ty - w[1]) * (1 - Math.exp(-h.yawResponse * dt));
  w[2] += (tz - w[2]) * kc;
  integrateOrientation(q, w[0], w[1], w[2], dt);
  basis(q);
  const air = airFactor(p[1], world.ceiling);
  const lift = GRAVITY * (s.throttle / HOVER_COLLECTIVE) * air;
  const hs = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
  const hd = h.dragQuad * hs + h.dragLin;
  const ax = U[0] * lift * h.cyclicGain - v[0] * hd;
  let ay = U[1] * lift - GRAVITY - v[1] * h.dragVert;
  const az = U[2] * lift * h.cyclicGain - v[2] * hd;
  if (inp.brake)
    ay -= v[1] * h.brakeVertical;
  const agl = p[1] - h.gearHeight - world.groundHeight(p[0], p[2]);
  if (v[1] < 0 && agl < h.cushionHeight)
    ay -= v[1] * h.cushion * (1 - Math.max(agl, 0) / h.cushionHeight);
  if (p[1] > world.ceiling)
    ay -= (p[1] - world.ceiling) * 0.3;
  v[0] += ax * dt;
  v[1] += ay * dt;
  v[2] += az * dt;
  if (p[1] > world.ceiling + 150 && v[1] > 0)
    v[1] = 0;
  p[0] += v[0] * dt;
  p[1] += v[1] * dt;
  p[2] += v[2] * dt;
  s.gearDown = true;
  resolveGround(s, world, true, h.gearHeight, h.gearHeight, 0, 0, 0, dt);
  if (s.crashed)
    return;
  checkBoundary(s, world);
}
function stepHeliAim(s, inp, dt, world, h) {
  const hasAim = true;
  const { orientation: q, velocity: v, angularVelocity: w, position: p } = s;
  const inCollective = axis(inp.throttle);
  if (inCollective !== 0)
    s.throttle = clamp3(s.throttle + inCollective * h.collectiveRate * dt, 0, 1);
  else if (!s.onGround) {
    const d = HOVER_COLLECTIVE - s.throttle, step = h.collectiveReturn * dt;
    s.throttle += d > step ? step : d < -step ? -step : d;
  }
  const inRoll = axis(inp.roll), inPitch = axis(inp.pitch), inYaw = axis(inp.yaw);
  basis(q);
  const heading = Math.atan2(-F[0], -F[2]);
  const pitchAngle = Math.asin(clamp3(F[1], -1, 1));
  const bank = Math.atan2(-R[1], U[1]);
  const hfx = -Math.sin(heading), hfz = -Math.cos(heading);
  const hrx = Math.cos(heading), hrz = -Math.sin(heading);
  const vF = v[0] * hfx + v[2] * hfz;
  const vR = v[0] * hrx + v[2] * hrz;
  let yawLeft = 0;
  if (inYaw !== 0)
    yawLeft = -inYaw * h.yawRate;
  else if (hasAim) {
    const horiz = Math.sqrt(AIM[0] * AIM[0] + AIM[2] * AIM[2]);
    if (horiz > 0.0001) {
      const err = wrapAngle(Math.atan2(-AIM[0], -AIM[2]) - heading);
      yawLeft = clamp3(h.yawGain * err * Math.min(1, horiz * 3), -h.yawRate, h.yawRate);
    }
  }
  if (s.onGround && s.throttle < 0.3)
    yawLeft = 0;
  const tiltLimit = inp.boost ? h.boostTilt : h.maxTilt;
  let pitchT = 0, bankT = 0;
  let hold = inp.brake ? 1 : 0;
  let holdGain = 1.2;
  let driftKill = 0;
  const nearLevel = Math.abs(pitchAngle) < 4 * DEG;
  if (!inp.brake && inPitch === 0 && inRoll === 0 && !inp.boost) {
    if (hasAim) {
      hold = 1 - smoothstep3(2 * DEG, 6 * DEG, Math.abs(Math.asin(clamp3(AIM[1], -1, 1))));
      holdGain = 0.35;
    } else if (nearLevel)
      driftKill = h.driftKill;
  }
  const holdPitch = clamp3(Math.atan(vF * holdGain / (GRAVITY * h.cyclicGain)), -h.maxTilt, h.backTilt);
  const holdBank = clamp3(Math.atan(-vR * holdGain / (GRAVITY * h.cyclicGain)), -h.sideTilt, h.sideTilt);
  pitchT = hasAim ? Math.asin(clamp3(AIM[1], -1, 1)) : nearLevel ? 0 : pitchAngle;
  if (inp.boost)
    pitchT = Math.min(pitchT, -h.boostTilt);
  if (inPitch !== 0)
    pitchT = hasAim ? inPitch * (inPitch > 0 ? h.backTilt : h.maxTilt) : pitchAngle + inPitch * h.cyclicRate / h.tiltGain;
  pitchT = pitchT + (holdPitch - pitchT) * hold;
  bankT = holdBank * hold;
  const flipping = Math.abs(inRoll) > HELI_FLIP_ROLL;
  if (inRoll !== 0 && !flipping)
    bankT = clamp3(inRoll / HELI_STRAFE_ROLL, -1, 1) * h.sideTilt;
  else if (inRoll === 0)
    bankT += clamp3(-yawLeft * vF / GRAVITY * 0.7, -20 * DEG, 20 * DEG) * smoothstep3(10, 40, vF);
  pitchT = clamp3(pitchT, -tiltLimit, h.backTilt);
  let tx = clamp3(h.tiltGain * (pitchT - pitchAngle), -h.maxTiltRate, h.maxTiltRate);
  let tz = flipping ? -inRoll * h.flipRate : -clamp3(h.tiltGain * wrapAngle(bankT - bank), -h.maxTiltRate, h.maxTiltRate);
  rotInto(TMP, q, 0, yawLeft, 0, true);
  tx += TMP[0];
  const ty = TMP[1];
  tz += TMP[2];
  const kt = 1 - Math.exp(-h.tiltResponse * dt);
  w[0] += (tx - w[0]) * kt;
  w[1] += (ty - w[1]) * (1 - Math.exp(-h.yawResponse * dt));
  w[2] += (tz - w[2]) * kt;
  integrateOrientation(q, w[0], w[1], w[2], dt);
  basis(q);
  const air = airFactor(p[1], world.ceiling);
  const lift = GRAVITY * (s.throttle / HOVER_COLLECTIVE) * air / Math.max(U[1], 0.6);
  const hs = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
  const hd = h.dragQuad * hs + h.dragLin + driftKill;
  let ax = U[0] * lift * h.cyclicGain - v[0] * hd;
  let ay = U[1] * lift - GRAVITY - v[1] * h.dragVert;
  let az = U[2] * lift * h.cyclicGain - v[2] * hd;
  if (inp.brake || inCollective === 0 && !s.onGround)
    ay -= v[1] * h.altitudeHold;
  const agl = p[1] - h.gearHeight - world.groundHeight(p[0], p[2]);
  if (v[1] < 0 && agl < h.cushionHeight)
    ay -= v[1] * h.cushion * (1 - Math.max(agl, 0) / h.cushionHeight);
  if (p[1] > world.ceiling)
    ay -= (p[1] - world.ceiling) * 0.3;
  v[0] += ax * dt;
  v[1] += ay * dt;
  v[2] += az * dt;
  if (inRoll === 0 && vF > 0 && hs > 1) {
    const k = 1 - Math.exp(-h.grip * smoothstep3(15, 50, hs) * dt);
    if (k > 0) {
      const hs2 = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
      v[0] += (hfx * hs2 - v[0]) * k;
      v[2] += (hfz * hs2 - v[2]) * k;
      const n = hs2 / Math.max(0.000000001, Math.sqrt(v[0] * v[0] + v[2] * v[2]));
      v[0] *= n;
      v[2] *= n;
    }
  }
  if (p[1] > world.ceiling + 150 && v[1] > 0)
    v[1] = 0;
  p[0] += v[0] * dt;
  p[1] += v[1] * dt;
  p[2] += v[2] * dt;
  s.gearDown = true;
  resolveGround(s, world, true, h.gearHeight, h.gearHeight, 0, 0, 0, dt);
  if (s.crashed)
    return;
  checkBoundary(s, world);
}
function resolveGround(s, world, heli, gearHeight, bellyHeight, stall, maxGroundPitch, wheelDecel, dt) {
  const { position: p, velocity: v, orientation: q, angularVelocity: w } = s;
  const ground = world.groundHeight(p[0], p[2]);
  const clearance = s.gearDown ? gearHeight : bellyHeight;
  if (p[1] - clearance > ground + 0.02) {
    s.onGround = false;
    return ground;
  }
  const runway = world.onRunway(p[0], p[2]);
  const water = !runway && ground <= WATER_LEVEL + 0.01;
  const deck = world.deckVelocity?.(p[0], p[2]);
  const dvx = deck ? deck[0] : 0, dvy = deck ? deck[1] : 0, dvz = deck ? deck[2] : 0;
  basis(q);
  const sink = dvy - v[1];
  const pitch = Math.asin(clamp3(F[1], -1, 1));
  const bank = Math.atan2(-R[1], U[1]);
  const hs = Math.sqrt((v[0] - dvx) ** 2 + (v[2] - dvz) ** 2);
  if (water) {
    s.crashed = "water";
  } else if (heli) {
    if (sink > 7.5 || Math.abs(bank) > 35 * DEG || Math.abs(pitch) > 35 * DEG || hs > 30)
      s.crashed = "terrain";
  } else if (runway) {
    if (!s.gearDown || sink > 6 || Math.abs(bank) > 25 * DEG || pitch < -10 * DEG || pitch > 25 * DEG)
      s.crashed = "terrain";
  } else {
    if (!s.gearDown || sink > 4 || Math.abs(bank) > 20 * DEG || pitch < -8 * DEG || hs > 1.3 * stall)
      s.crashed = "terrain";
  }
  if (s.crashed) {
    p[1] = Math.max(p[1], ground);
    return ground;
  }
  s.onGround = true;
  p[1] = ground + gearHeight;
  if (v[1] < dvy)
    v[1] = dvy;
  const heading = Math.atan2(-F[0], -F[2]);
  const gp = heli ? 0 : clamp3(pitch, 0, maxGroundPitch);
  setYawPitchRoll(q, heading, gp, 0);
  w[2] = 0;
  if (heli || gp <= 0 && w[0] < 0 || gp >= maxGroundPitch && w[0] > 0)
    w[0] = 0;
  const hfx = -Math.sin(heading), hfz = -Math.cos(heading);
  const rvx = v[0] - dvx, rvz = v[2] - dvz;
  let along = rvx * hfx + rvz * hfz;
  let latX = rvx - hfx * along, latZ = rvz - hfz * along;
  const latKeep = Math.exp(-(heli ? 4 : 12) * dt);
  latX *= latKeep;
  latZ *= latKeep;
  if (heli) {
    along *= Math.exp(-4 * dt);
    if (Math.hypot(along, latX, latZ) < 1)
      along = latX = latZ = 0;
  } else {
    const dec = (wheelDecel + (runway ? 0 : 2)) * dt;
    along = along > dec ? along - dec : along < -dec ? along + dec : 0;
  }
  v[0] = hfx * along + latX + dvx;
  v[2] = hfz * along + latZ + dvz;
  return ground;
}
function checkBoundary(s, world) {
  const p = s.position;
  if (p[0] > world.half || p[0] < -world.half || p[2] > world.half || p[2] < -world.half)
    s.crashed = "boundary";
}
var BOMB_DRAG = 0.0004;
var BOMB_STEP = 1 / 60;
var BOMB_MAX_TIME = 60;
function stepBomb(pos, vel, dt) {
  const sp = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
  const k = BOMB_DRAG * sp;
  vel[0] -= vel[0] * k * dt;
  vel[1] -= (vel[1] * k + GRAVITY) * dt;
  vel[2] -= vel[2] * k * dt;
  pos[0] += vel[0] * dt;
  pos[1] += vel[1] * dt;
  pos[2] += vel[2] * dt;
}
var BP = [0, 0, 0];
var BV = [0, 0, 0];
function bombImpactPoint(pos, vel, out, world) {
  BP[0] = pos[0];
  BP[1] = pos[1];
  BP[2] = pos[2];
  BV[0] = vel[0];
  BV[1] = vel[1];
  BV[2] = vel[2];
  for (let t = 0;t < BOMB_MAX_TIME; t += BOMB_STEP) {
    const py = BP[1];
    stepBomb(BP, BV, BOMB_STEP);
    const g = world ? world.groundHeight(BP[0], BP[2]) : 0;
    if (BP[1] <= g) {
      const f = py - BP[1] > 0.000000001 ? (py - g) / (py - BP[1]) : 1;
      out[0] = BP[0] - BV[0] * BOMB_STEP * (1 - f);
      out[1] = g;
      out[2] = BP[2] - BV[2] * BOMB_STEP * (1 - f);
      return t + BOMB_STEP * f;
    }
  }
  out[0] = BP[0];
  out[1] = BP[1];
  out[2] = BP[2];
  return -1;
}

// src/sim/combat.ts
var MAX_PROJECTILES = 2000;
var MAX_MISSILES = 256;
var MAX_FLARES = 256;
var SPOTTED_DAMAGE_MULT = 1.2;
var ARMOR = { fighter: 1, apache: 1, warthog: 0.8, blackbird: 1, bomber: 1, "astra-interceptor": 1, "astra-trainer": 1 };
var WEAPON_DAMAGE_MULT = {
  cannon20: 1.35,
  chaingun30: 1.1,
  gau8: 0.8,
  rockets: 1,
  aim9: 1,
  tvmissile: 1,
  hellfire: 1,
  maverick: 1,
  aim47: 1,
  radarpulse: 0,
  bomb: 1
};
var BOMB_STEER_ACCEL = 25;
var BOMB_STEER_DV = 15;
var BOMB_STEER_STALE = 0.25;
var BOMB_NEAR_MISS = 0.5;
function isHiddenStealth(v, now) {
  return !!VEHICLES[v.kind].stealth && v.spottedUntil <= now;
}
var CLASS_BONUS = {
  chaingun30: { apache: 1.6, warthog: 1.4 }
};
var MISSILE_TUNING = {
  aim9: { maxSpeed: 650, burn: 2, accel: 200, coastDecel: 35, fuse: 6, gimbal: 0.8, flareNear: 0.8, flareFar: 0.9, farDist: 600 },
  tvmissile: { maxSpeed: 620, burn: 2.5, accel: 150, coastDecel: 30, fuse: 6, gimbal: 0.8, flareNear: 0.6, flareFar: 0.7, farDist: 800 },
  hellfire: { maxSpeed: 420, burn: 3, accel: 100, coastDecel: 20, fuse: 4, gimbal: 0.9, flareNear: 0.75, flareFar: 0.85, farDist: 800 },
  maverick: { maxSpeed: 440, burn: 3, accel: 100, coastDecel: 20, fuse: 4, gimbal: 0.9, flareNear: 0.7, flareFar: 0.8, farDist: 800 },
  aim47: { maxSpeed: 750, burn: 4, accel: 110, coastDecel: 10, fuse: 10, gimbal: 0.9, flareNear: 0.7, flareFar: 0.9, farDist: 0 }
};
var TURRET_ARCS = {
  chaingun30: { yaw: 110 * Math.PI / 180, minEl: -85 * Math.PI / 180, maxEl: 12 * Math.PI / 180 }
};
var VIEW_DELAY_DEFAULT = 0.12;
var VIEW_DELAY_MAX = 0.3;
var HISTORY_TICKS = 24;
var HITBOX = { fuselageHalf: 1.1, fuselageRadius: 0.55, wingHalf: 1.1, wingRadius: 0.35 };
var GUN_FULL_RANGE = 800;
var GUN_MIN_DAMAGE = 0.4;
var BULLET_IMPACT_EVERY = 3;
var WATER_SPLASH_RADIUS = 4;
var WATER_SPLASH_DAMAGE = 0.3;
var GUN_GIMBAL = 15 * Math.PI / 180;
var PROPORTIONAL_NAV_GAIN = 4;
var MISSILE_MIN_SPEED = 120;
var MISSILE_LOAL_TIME = 1;
var ROCKET_GRAVITY = 9.81;
var SCANNER_CONE_MARGIN = 1.3;
var SCANNER_GRACE = 1.5;
var SCANNER_FLARE_CLOSE = 1000;
var FLARE_COOLDOWN = 2.5;
var FLARES_PER_BURST = 3;
var FLARE_TTL = 3.5;
var FLARE_TARGET_PREFIX = "flare:";
var RECON_KINDS = new Set(["blackbird"]);
var SPOT_CONE = 5 * Math.PI / 180;
var SPOT_RANGE = 6000;
var SPOT_TIME = 1.5;
var SPOT_DECAY = 1 / 0.4;
var SPOT_DURATION = 12;
var SPOT_COOLDOWN = 3;
var MARK_COOLDOWN = 10;
var MARK_DURATION = 8;
var MARK_RANGE = 4000;
var MARK_CONE = 0.08;
function createCombatState() {
  return {
    projectiles: [],
    missiles: [],
    flares: [],
    nextId: 1,
    turrets: createTurretStates(),
    bursts: [],
    ships: createShips(),
    shipDamageBy: [0, 0, 0, 0],
    craters: [],
    shells: []
  };
}
function markSpawned(vehicle, now) {
  vehicle.spawnedAt = now;
}
function isSpawnProtected(vehicle, now) {
  const t = vehicle.spawnedAt;
  return t !== undefined && now - t < SPAWN_PROTECTION;
}
function createWeapons(kind) {
  const seats = VEHICLES[kind].seatWeapons;
  const mk = (id) => {
    const ammo = id ? WEAPONS[id].ammo : 0;
    const rt = { ammo: Number.isFinite(ammo) ? ammo : -1, readyAt: 0, lockTarget: null, lock: 0, firedAt: -1e9, regen: 0 };
    return rt;
  };
  const out = [seats[0].map(mk), seats[1].map(mk)];
  for (let a = 0;a < 2; a++) {
    for (let b = 0;b < 2; b++) {
      const id = seats[0][a];
      if (id && seats[1][b] === id && WEAPONS[id].kind === "bomb")
        out[1][b] = out[0][a];
    }
  }
  return out;
}
function sharedWithPilot(v, rt) {
  return v.weapons[0][0] === rt || v.weapons[0][1] === rt;
}
function magazine(weapon) {
  const a = WEAPONS[weapon].ammo;
  return Number.isFinite(a) ? a : -1;
}
function launchedHardpoint(weapon, ammoAfter) {
  return ((WEAPONS[weapon].ammo - ammoAfter - 1) % 2 + 2) % 2;
}
function isHostile(a, b) {
  return a.team !== b.team;
}
function isLockKind(spec) {
  return spec.kind === "missile_lock" || spec.kind === "missile_scanner";
}
function rotate(q, x, y, z, out) {
  const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
  out[0] = x + qw * tx + (qy * tz - qz * ty);
  out[1] = y + qw * ty + (qz * tx - qx * tz);
  out[2] = z + qw * tz + (qx * ty - qy * tx);
  return out;
}
function rotateInv(q, x, y, z, out) {
  const qx = -q[0], qy = -q[1], qz = -q[2], qw = q[3];
  const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
  out[0] = x + qw * tx + (qy * tz - qz * ty);
  out[1] = y + qw * ty + (qz * tx - qx * tz);
  out[2] = z + qw * tz + (qx * ty - qy * tx);
  return out;
}
function len(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
function normalizeInto(v, out) {
  const l = len(v);
  if (!(l > 0.000000001))
    return false;
  out[0] = v[0] / l;
  out[1] = v[1] / l;
  out[2] = v[2] / l;
  return true;
}
function dist(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function turnToward(dir, target, maxAngle) {
  let c = dir[0] * target[0] + dir[1] * target[1] + dir[2] * target[2];
  if (c > 1)
    c = 1;
  else if (c < -1)
    c = -1;
  const theta = Math.acos(c);
  if (theta <= maxAngle) {
    dir[0] = target[0];
    dir[1] = target[1];
    dir[2] = target[2];
    return;
  }
  let px = target[0] - dir[0] * c, py = target[1] - dir[1] * c, pz = target[2] - dir[2] * c;
  let pl = Math.sqrt(px * px + py * py + pz * pz);
  if (pl < 0.000001) {
    if (Math.abs(dir[1]) < 0.9) {
      px = -dir[2];
      py = 0;
      pz = dir[0];
    } else {
      px = 0;
      py = dir[2];
      pz = -dir[1];
    }
    pl = Math.sqrt(px * px + py * py + pz * pz);
  }
  const cs = Math.cos(maxAngle), sn = Math.sin(maxAngle) / pl;
  dir[0] = dir[0] * cs + px * sn;
  dir[1] = dir[1] * cs + py * sn;
  dir[2] = dir[2] * cs + pz * sn;
  const l = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
  dir[0] /= l;
  dir[1] /= l;
  dir[2] /= l;
}
function hash01(a, b) {
  let h = Math.imul(a ^ 2654435769, 2246822507) ^ Math.imul(b + 1663821227, 3266489909);
  h = Math.imul(h ^ h >>> 16, 2146121005);
  h = Math.imul(h ^ h >>> 15, 2221713035);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function applySpread(dir, spread, seed) {
  if (spread <= 0)
    return;
  const r = spread * Math.sqrt(hash01(seed, 1)), a = 2 * Math.PI * hash01(seed, 2);
  let ux = 0, uy = 1, uz = 0;
  if (Math.abs(dir[1]) > 0.99) {
    ux = 1;
    uy = 0;
  }
  let rx = dir[1] * uz - dir[2] * uy, ry = dir[2] * ux - dir[0] * uz, rz = dir[0] * uy - dir[1] * ux;
  const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
  rx /= rl;
  ry /= rl;
  rz /= rl;
  const vx = ry * dir[2] - rz * dir[1], vy = rz * dir[0] - rx * dir[2], vz = rx * dir[1] - ry * dir[0];
  const ca = Math.cos(a) * r, sa = Math.sin(a) * r;
  dir[0] += rx * ca + vx * sa;
  dir[1] += ry * ca + vy * sa;
  dir[2] += rz * ca + vz * sa;
  const l = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
  dir[0] /= l;
  dir[1] /= l;
  dir[2] /= l;
}
function sweptSphere(p0, p1, c1, cv, dt, r) {
  const sx = p0[0] - (c1[0] - cv[0] * dt), sy = p0[1] - (c1[1] - cv[1] * dt), sz = p0[2] - (c1[2] - cv[2] * dt);
  const dx = p1[0] - c1[0] - sx, dy = p1[1] - c1[1] - sy, dz = p1[2] - c1[2] - sz;
  const c = sx * sx + sy * sy + sz * sz - r * r;
  if (c <= 0)
    return 0;
  const a = dx * dx + dy * dy + dz * dz;
  if (a < 0.000000000001)
    return -1;
  const b = 2 * (sx * dx + sy * dy + sz * dz);
  if (b >= 0)
    return -1;
  const disc = b * b - 4 * a * c;
  if (disc < 0)
    return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t <= 1 ? t : -1;
}
function damageFor(weapon, target, now) {
  const bonus = CLASS_BONUS[weapon]?.[target.kind] ?? 1;
  const spotted = target.spottedUntil > now ? SPOTTED_DAMAGE_MULT : 1;
  return WEAPONS[weapon].damage * WEAPON_DAMAGE_MULT[weapon] * ARMOR[target.kind] * bonus * spotted;
}
var _gim = [0, 0, 0];
function weaponDirection(vehicle, weapon, aim, out) {
  const q = vehicle.flight.orientation;
  const spec = WEAPONS[weapon];
  if (!spec.turret && aim && (spec.kind === "gun" || spec.kind === "rockets")) {
    rotate(q, 0, 0, -1, out);
    if (!normalizeInto(aim, _gim))
      return out;
    turnToward(out, _gim, GUN_GIMBAL);
    return out;
  }
  if (!spec.turret || !aim || spec.kind !== "gun")
    return rotate(q, 0, 0, -1, out);
  rotateInv(q, aim[0], aim[1], aim[2], out);
  if (!normalizeInto(out, out))
    return rotate(q, 0, 0, -1, out);
  const arc = TURRET_ARCS[weapon];
  if (arc) {
    let yaw = Math.atan2(out[0], -out[2]);
    let el = Math.asin(Math.max(-1, Math.min(1, out[1])));
    yaw = Math.max(-arc.yaw, Math.min(arc.yaw, yaw));
    el = Math.max(arc.minEl, Math.min(arc.maxEl, el));
    const ce = Math.cos(el);
    out[0] = Math.sin(yaw) * ce;
    out[1] = Math.sin(el);
    out[2] = -Math.cos(yaw) * ce;
  }
  return rotate(q, out[0], out[1], out[2], out);
}
function muzzlePosition(vehicle, seat, weapon, out, hardpoint = 0) {
  const r = VEHICLES[vehicle.kind].radius;
  const spec = WEAPONS[weapon];
  const p = vehicle.flight.position;
  if (spec.kind === "gun") {
    if (spec.turret)
      rotate(vehicle.flight.orientation, 0, -1.6, -r * 0.55, out);
    else
      rotate(vehicle.flight.orientation, 0, 0, -r * 0.8, out);
  } else {
    const side = hardpoint % 2 === 0 ? -1 : 1;
    rotate(vehicle.flight.orientation, side * r * 0.35, -1, -r * 0.1, out);
  }
  out[0] += p[0];
  out[1] += p[1];
  out[2] += p[2];
  return out;
}
function leadPoint(shooterPos, shooterVel, muzzleSpeed, targetPos, targetVel, out) {
  const rx = targetPos[0] - shooterPos[0], ry = targetPos[1] - shooterPos[1], rz = targetPos[2] - shooterPos[2];
  const vx = targetVel[0] - shooterVel[0], vy = targetVel[1] - shooterVel[1], vz = targetVel[2] - shooterVel[2];
  const a = vx * vx + vy * vy + vz * vz - muzzleSpeed * muzzleSpeed;
  const b = 2 * (rx * vx + ry * vy + rz * vz);
  const c = rx * rx + ry * ry + rz * rz;
  let t;
  if (Math.abs(a) < 0.000000001) {
    if (b >= 0)
      return -1;
    t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0)
      return -1;
    const s = Math.sqrt(disc);
    const t1 = (-b - s) / (2 * a), t2 = (-b + s) / (2 * a);
    t = t1 > 0 && t2 > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
    if (!(t > 0))
      return -1;
  }
  out[0] = shooterPos[0] + rx + vx * t;
  out[1] = shooterPos[1] + ry + vy * t;
  out[2] = shooterPos[2] + rz + vz * t;
  return t;
}
var _lc = [0, 0, 0];
function seekerAngle(from, axis, to, outDist) {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  outDist.d = d;
  if (d < 0.000001)
    return 0;
  const c = (dx * axis[0] + dy * axis[1] + dz * axis[2]) / d;
  return Math.acos(Math.max(-1, Math.min(1, c)));
}
var _sd = { d: 0 };
function lockValid(vehicle, spec, axis, target, coneScale, now) {
  if (!target.alive || target === vehicle || !isHostile(vehicle, target))
    return -1;
  const range = spec.range ?? 2500;
  const cone = (spec.lockCone ?? 0.3) * coneScale;
  const tp = target.flight.position;
  const ang = seekerAngle(vehicle.flight.position, axis, tp, _sd);
  if (_sd.d > range || ang > cone)
    return -1;
  if (isSpawnProtected(target, now))
    return -1;
  return ang;
}
function seekerAxis(vehicle, seat, weapon, aim, out) {
  if (seat !== 0 && WEAPONS[weapon].turret && aim && normalizeInto(aim, out))
    return out;
  return rotate(vehicle.flight.orientation, 0, 0, -1, out);
}
function lockCandidate(vehicle, seat, weapon, aim, vehicles, now = 0) {
  const spec = WEAPONS[weapon];
  if (!isLockKind(spec))
    return null;
  const axis = seekerAxis(vehicle, seat, weapon, aim, _lc);
  let best = null;
  let bestAng = Infinity;
  for (let i = 0;i < vehicles.length; i++) {
    const ang = lockValid(vehicle, spec, axis, vehicles[i], 1, now);
    if (ang >= 0 && ang < bestAng) {
      bestAng = ang;
      best = vehicles[i];
    }
  }
  return best;
}
function findVehicle(vehicles, id) {
  for (let i = 0;i < vehicles.length; i++)
    if (vehicles[i].id === id)
      return vehicles[i];
  return null;
}
function killVehicle(vehicle, reason, killer, events, killerTeam) {
  if (!vehicle.alive)
    return false;
  vehicle.alive = false;
  vehicle.hp = 0;
  const p = vehicle.flight.position;
  const kill = {
    type: "kill",
    victim: vehicle.id,
    victimTeam: vehicle.team,
    killer: killer === undefined ? vehicle.lastDamagedBy : killer,
    weapon: reason,
    position: [p[0], p[1], p[2]]
  };
  if (killerTeam !== undefined)
    kill.killerTeam = killerTeam;
  events.push(kill);
  const low = p[1] - groundHeight(p[0], p[2]) < 15;
  pushExplosion(events, p, VEHICLES[vehicle.kind].radius * 3, low ? surfaceAt(p) : "air");
  return true;
}
function dealDamage(target, amount, weapon, owner, pos, now, events) {
  if (!target.alive || amount <= 0)
    return 0;
  if (isSpawnProtected(target, now))
    return 0;
  target.hp -= amount;
  target.lastDamagedBy = owner;
  events.push({ type: "hit", target: target.id, by: owner, weapon, damage: amount, position: [pos[0], pos[1], pos[2]] });
  if (target.hp <= 0)
    killVehicle(target, weapon, owner, events);
  return amount;
}
function splash(pos, weapon, owner, team, shooterId, direct, vehicles, now, events, radiusCap = Infinity, scale = 1) {
  const radius = Math.min(WEAPONS[weapon].splash, radiusCap);
  if (radius <= 0 || scale <= 0)
    return;
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (v === direct || !v.alive || v.team === team || v.id === shooterId)
      continue;
    const d = Math.max(0, dist(pos, v.flight.position) - VEHICLES[v.kind].radius);
    if (d >= radius)
      continue;
    dealDamage(v, damageFor(weapon, v, now) * scale * (1 - d / radius), weapon, owner, pos, now, events);
  }
}
function surfaceAt(p) {
  return isWater(p[0], p[2]) ? "water" : "ground";
}
function pushExplosion(events, p, size, surface, flak = false) {
  const e = { type: "explosion", position: [p[0], p[1], p[2]], size, surface };
  if (flak)
    e.kind = "flak";
  events.push(e);
}
function gunRangeFactor(weapon, age) {
  const spec = WEAPONS[weapon];
  const d = Math.max(0, age) * spec.speed;
  if (d <= GUN_FULL_RANGE)
    return 1;
  const max = Math.max(spec.speed * spec.ttl, GUN_FULL_RANGE + 1);
  return Math.max(GUN_MIN_DAMAGE, 1 - (1 - GUN_MIN_DAMAGE) * (d - GUN_FULL_RANGE) / (max - GUN_FULL_RANGE));
}
var _dir = [0, 0, 0];
var _muz = [0, 0, 0];
var _aim = [0, 0, 0];
function applySeatInput(cs, vehicle, seat, input, vehicles, now, events) {
  if (!vehicle.alive)
    return;
  const aim = input.aim && normalizeInto(input.aim, _aim) ? _aim : null;
  if (aim) {
    const stored = vehicle.aim[seat];
    if (stored) {
      stored[0] = aim[0];
      stored[1] = aim[1];
      stored[2] = aim[2];
    } else
      vehicle.aim[seat] = [aim[0], aim[1], aim[2]];
  }
  const kinds = VEHICLES[vehicle.kind].seatWeapons[seat];
  const runtimes = vehicle.weapons[seat];
  for (let slot = 0;slot < 2; slot++) {
    const id = kinds[slot];
    if (id && runtimes[slot] && isLockKind(WEAPONS[id]))
      updateLock(cs, vehicle, seat, WEAPONS[id], runtimes[slot], aim, vehicles, now, events);
  }
  if (input.steerBomb && aim)
    steerBomb(cs, vehicle, seat, aim, now);
  if (seat === 0 && RECON_KINDS.has(vehicle.kind))
    updateSpotting(vehicle, aim, vehicles, now, events);
  if (input.flares)
    deployFlares(cs, vehicle, vehicles, now, events);
  if (input.ability)
    triggerAbility(vehicle, seat, aim, vehicles, now, events);
  const protectedNow = isSpawnProtected(vehicle, now);
  for (let slot = 0;slot < 2; slot++) {
    if (!(slot === 0 ? input.firePrimary : input.fireSecondary))
      continue;
    const id = kinds[slot];
    const rt = runtimes[slot];
    if (!id || !rt)
      continue;
    const spec = WEAPONS[id];
    if (spec.kind === "pulse") {
      radarPulse(vehicle, seat, vehicles, now, events);
      continue;
    }
    if (protectedNow)
      continue;
    if (spec.kind === "gun" || spec.kind === "rockets")
      fireBallistic(cs, vehicle, seat, spec, rt, aim, now, events, viewDelayOf(input));
    else if (spec.kind === "bomb")
      fireBomb(cs, vehicle, seat, spec, rt, now, events);
    else
      fireMissile(cs, vehicle, seat, spec, rt, now, events);
  }
}
function spotValid(vehicle, axis, target, cone, now) {
  if (!target.alive || !isHostile(vehicle, target))
    return -1;
  if ((target.spotCooldownUntil ?? 0) > now)
    return -1;
  const ang = seekerAngle(vehicle.flight.position, axis, target.flight.position, _sd);
  if (ang > cone || _sd.d > SPOT_RANGE)
    return -1;
  if (segmentHitsGround(vehicle.flight.position, target.flight.position) !== null)
    return -1;
  return ang;
}
function markSpotted(spotter, target, until, events) {
  target.spottedUntil = Math.max(target.spottedUntil, until);
  events.push({ type: "spotted", by: spotter.id, team: spotter.team, target: target.id, until: target.spottedUntil });
}
function updateSpotting(vehicle, aim, vehicles, now, events) {
  let progress = vehicle.spotProgress ?? 0;
  let candidate = vehicle.spotCandidate ? findVehicle(vehicles, vehicle.spotCandidate) : null;
  let inView = false;
  if (aim) {
    if (candidate && spotValid(vehicle, aim, candidate, SPOT_CONE * 1.2, now) >= 0)
      inView = true;
    else {
      let best = null;
      let bestAng = Infinity;
      for (let i = 0;i < vehicles.length; i++) {
        const ang = spotValid(vehicle, aim, vehicles[i], SPOT_CONE, now);
        if (ang >= 0 && ang < bestAng) {
          bestAng = ang;
          best = vehicles[i];
        }
      }
      if (best) {
        if (best !== candidate)
          progress = 0;
        candidate = best;
        inView = true;
      }
    }
  }
  if (inView && candidate) {
    progress += TICK_DT / SPOT_TIME;
    if (progress >= 1 - 0.000000001) {
      markSpotted(vehicle, candidate, now + SPOT_DURATION, events);
      candidate.spotCooldownUntil = now + SPOT_COOLDOWN;
      progress = 0;
      candidate = null;
    }
  } else {
    progress = Math.max(0, progress - SPOT_DECAY * TICK_DT);
    if (progress === 0)
      candidate = null;
  }
  vehicle.spotProgress = progress;
  vehicle.spotCandidate = candidate ? candidate.id : null;
}
function viewDelayOf(input) {
  const d = input.viewDelay;
  if (d === undefined || !Number.isFinite(d))
    return VIEW_DELAY_DEFAULT;
  return Math.min(VIEW_DELAY_MAX, Math.max(0, d));
}
function updateLock(cs, vehicle, seat, spec, rt, aim, vehicles, now, events) {
  const axis = seekerAxis(vehicle, seat, spec.id, aim, _lc);
  let target = null;
  let shipTarget = null;
  if (rt.lockTarget) {
    if (rt.lockTarget.startsWith(SHIP_TARGET_PREFIX)) {
      if (shipLockAngle(cs, vehicle, spec, axis, rt.lockTarget.slice(SHIP_TARGET_PREFIX.length)) >= 0)
        shipTarget = rt.lockTarget;
    } else {
      const cur = findVehicle(vehicles, rt.lockTarget);
      if (cur && lockValid(vehicle, spec, axis, cur, 1, now) >= 0)
        target = cur;
    }
  }
  if (!target && !shipTarget)
    target = lockCandidate(vehicle, seat, spec.id, aim, vehicles, now);
  if (!target && !shipTarget && spec.kind === "missile_lock") {
    const sh = shipLockCandidate(cs, vehicle, spec, axis);
    if (sh)
      shipTarget = SHIP_TARGET_PREFIX + sh;
  }
  const newId = target ? target.id : shipTarget;
  if (newId !== rt.lockTarget) {
    if (rt.lockTarget && rt.lock >= 1)
      events.push({ type: "lock", vehicle: vehicle.id, target: rt.lockTarget, locked: false });
    rt.lockTarget = newId;
    rt.lock = 0;
  }
  if (!newId)
    return;
  const was = rt.lock;
  const stealthy = target !== null && isHiddenStealth(target, now);
  rt.lock = Math.min(1, rt.lock + TICK_DT / (stealthy ? Math.max(STEALTH_LOCK_TIME, spec.lockTime ?? 1) : spec.lockTime ?? 1));
  if (rt.lock > 1 - 0.000000001)
    rt.lock = 1;
  if (stealthy && rt.lock >= 1)
    markSpotted(vehicle, target, now + STEALTH_LOCK_SPOT, events);
  if (was < 1 && rt.lock >= 1)
    events.push({ type: "lock", vehicle: vehicle.id, target: newId, locked: true });
  else if (was === 0 || was < 0.5 && rt.lock >= 0.5)
    events.push({ type: "lock", vehicle: vehicle.id, target: newId, locked: false });
}
function ownerOf(vehicle, seat) {
  return vehicle.seats[seat] ?? vehicle.id;
}
function fireBallistic(cs, vehicle, seat, spec, rt, aim, now, events, viewDelay = VIEW_DELAY_DEFAULT) {
  const interval = 1 / spec.rate;
  const burstStart = rt.readyAt < now - interval;
  if (rt.readyAt < now - TICK_DT)
    rt.readyAt = now;
  const sv = vehicle.flight.velocity;
  let fired = 0;
  while (rt.readyAt <= now + 0.000000001 && (rt.ammo < 0 || rt.ammo >= 1) && fired < 8 && cs.projectiles.length < MAX_PROJECTILES) {
    const id = cs.nextId++;
    weaponDirection(vehicle, spec.id, aim, _dir);
    applySpread(_dir, spec.spread ?? 0, id);
    const hp = spec.kind === "rockets" ? launchedHardpoint(spec.id, rt.ammo - 1) : 0;
    muzzlePosition(vehicle, seat, spec.id, _muz, hp);
    const vx = sv[0] + _dir[0] * spec.speed, vy = sv[1] + _dir[1] * spec.speed, vz = sv[2] + _dir[2] * spec.speed;
    const back = now - rt.readyAt - TICK_DT;
    const proj = {
      id,
      weapon: spec.id,
      owner: ownerOf(vehicle, seat),
      vehicle: vehicle.id,
      team: vehicle.team,
      position: [_muz[0] + vx * back, _muz[1] + vy * back, _muz[2] + vz * back],
      velocity: [vx, vy, vz],
      age: back,
      ttl: spec.ttl
    };
    if (viewDelay > 0)
      proj.rewind = viewDelay;
    cs.projectiles.push(proj);
    consumeAmmo(rt, now);
    rt.readyAt += interval;
    fired++;
    if (spec.kind === "rockets")
      events.push({ type: "fire", vehicle: vehicle.id, seat, weapon: spec.id, hardpoint: hp });
  }
  if (fired > 0 && spec.kind === "gun" && (burstStart || Math.floor(now * 4) !== Math.floor((now - TICK_DT) * 4))) {
    events.push({ type: "fire", vehicle: vehicle.id, seat, weapon: spec.id });
  }
}
function fireBomb(cs, vehicle, seat, spec, rt, now, events) {
  if (rt.readyAt > now || rt.ammo >= 0 && rt.ammo < 1 || cs.projectiles.length >= MAX_PROJECTILES)
    return;
  rotate(vehicle.flight.orientation, 0, -3, 0, _muz);
  const p = vehicle.flight.position, v = vehicle.flight.velocity;
  const id = cs.nextId++;
  cs.projectiles.push({
    id,
    weapon: spec.id,
    owner: ownerOf(vehicle, seat),
    vehicle: vehicle.id,
    team: vehicle.team,
    position: [p[0] + _muz[0], p[1] + _muz[1], p[2] + _muz[2]],
    velocity: [v[0], v[1], v[2]],
    age: 0,
    ttl: spec.ttl
  });
  const ext = vehicle;
  if (!ext.lastBomb)
    ext.lastBomb = [-1, -1];
  ext.lastBomb[seat] = id;
  consumeAmmo(rt, now);
  rt.readyAt = now + 1 / spec.rate;
  events.push({ type: "fire", vehicle: vehicle.id, seat, weapon: spec.id });
}
function bombImpact(cs, p, pos, directShip, vehicles, now, events) {
  const spec = WEAPONS[p.weapon];
  const full = shipDamageFor(p.weapon);
  if (directShip) {
    if (directShip.team !== p.team)
      damageShip(cs, directShip.id, full, p.owner, p.team, pos, now, events);
  } else {
    const fleet = posedFleet();
    for (let i = 0;i < fleet.length; i++) {
      const sh = fleet[i];
      if (sh.team === p.team)
        continue;
      const sp = SHIP_SPECS[sh.kind];
      toShipLocal(sh, pos, _sl0);
      const dx = Math.max(0, Math.abs(_sl0[0]) - sp.halfWidth), dz = Math.max(0, Math.abs(_sl0[2]) - sp.halfLength);
      const dy = Math.max(0, _sl0[1] - sp.deckHeight);
      const d = Math.hypot(dx, dy, dz);
      if (d < spec.splash)
        damageShip(cs, sh.id, full * BOMB_NEAR_MISS * (1 - d / spec.splash), p.owner, p.team, pos, now, events);
    }
  }
  const surface = directShip ? "ground" : surfaceAt(pos);
  splash(pos, p.weapon, p.owner, p.team, p.vehicle, null, vehicles, now, events, surface === "water" ? spec.splash * 0.6 : Infinity);
  pushExplosion(events, pos, surface === "water" ? spec.splash * 0.5 : spec.splash, surface);
  if (!directShip && surface === "ground")
    addCrater(cs, pos, 15, events);
}
function consumeAmmo(rt, now) {
  const x = rt;
  if (rt.ammo > 0)
    rt.ammo--;
  x.firedAt = now;
  x.regen = 0;
}
function fireMissile(cs, vehicle, seat, spec, rt, now, events) {
  if (rt.readyAt > now || rt.ammo >= 0 && rt.ammo < 1 || cs.missiles.length >= MAX_MISSILES)
    return;
  if (rt.lockTarget && rt.lock < 1)
    return;
  const target = rt.lockTarget && rt.lock >= 1 ? rt.lockTarget : null;
  const hp = launchedHardpoint(spec.id, rt.ammo - 1);
  muzzlePosition(vehicle, seat, spec.id, _muz, hp);
  rotate(vehicle.flight.orientation, 0, 0, -1, _dir);
  const sv = vehicle.flight.velocity;
  const vx = sv[0] + _dir[0] * spec.speed, vy = sv[1] + _dir[1] * spec.speed, vz = sv[2] + _dir[2] * spec.speed;
  const scanner = spec.kind === "missile_scanner";
  const m = {
    id: cs.nextId++,
    weapon: spec.id,
    owner: ownerOf(vehicle, seat),
    vehicle: vehicle.id,
    team: vehicle.team,
    position: [_muz[0] - vx * TICK_DT, _muz[1] - vy * TICK_DT, _muz[2] - vz * TICK_DT],
    velocity: [vx, vy, vz],
    target,
    steered: scanner,
    seat,
    age: -TICK_DT,
    ttl: spec.ttl
  };
  if (scanner) {
    m.scanTarget = target;
    m.scanOff = 0;
  }
  cs.missiles.push(m);
  consumeAmmo(rt, now);
  rt.readyAt = now + 1 / spec.rate;
  events.push({ type: "fire", vehicle: vehicle.id, seat, weapon: spec.id, hardpoint: hp });
}
function deployFlares(cs, vehicle, vehicles, now, events) {
  if (vehicle.flaresReadyAt > now || vehicle.flareCount <= 0)
    return;
  vehicle.flareCount--;
  vehicle.flaresReadyAt = now + FLARE_COOLDOWN;
  const p = vehicle.flight.position, v = vehicle.flight.velocity, q = vehicle.flight.orientation;
  let firstId = -1;
  for (let i = 0;i < FLARES_PER_BURST && cs.flares.length < MAX_FLARES; i++) {
    const id = cs.nextId++;
    if (firstId < 0)
      firstId = id;
    const side = (i - (FLARES_PER_BURST - 1) / 2) * 18;
    rotate(q, side, -12, 8, _dir);
    cs.flares.push({
      id,
      vehicle: vehicle.id,
      position: [p[0], p[1] - 1, p[2]],
      velocity: [v[0] * 0.6 + _dir[0], v[1] * 0.6 + _dir[1], v[2] * 0.6 + _dir[2]],
      age: 0,
      ttl: FLARE_TTL
    });
  }
  events.push({ type: "flares", vehicle: vehicle.id });
  if (firstId < 0)
    return;
  for (let i = 0;i < cs.missiles.length; i++) {
    const m = cs.missiles[i];
    const t = MISSILE_TUNING[m.weapon];
    if (!t)
      continue;
    const d = dist(m.position, p);
    let chance;
    if (m.steered) {
      if (m.scanTarget !== vehicle.id)
        continue;
      const painted = m.target !== null && (m.scanOff ?? 0) === 0;
      chance = d <= SCANNER_FLARE_CLOSE ? t.flareNear : painted ? 0 : t.flareFar;
    } else {
      if (m.target !== vehicle.id)
        continue;
      chance = d > t.farDist ? t.flareFar : t.flareNear;
    }
    if (hash01(m.id, firstId) < chance) {
      m.target = FLARE_TARGET_PREFIX + firstId;
      if (m.steered)
        m.scanTarget = null;
    }
  }
  for (let i = 0;i < vehicles.length; i++) {
    const o = vehicles[i];
    for (let s = 0;s < 2; s++) {
      const rts = o.weapons[s];
      for (let k = 0;k < rts.length; k++) {
        const rt = rts[k];
        if (rt.lockTarget !== vehicle.id)
          continue;
        if (rt.lock >= 1)
          events.push({ type: "lock", vehicle: o.id, target: vehicle.id, locked: false });
        rt.lock = 0;
      }
    }
  }
}
function hasPulse(vehicle, seat) {
  const k = VEHICLES[vehicle.kind].seatWeapons[seat];
  return k[0] === "radarpulse" || k[1] === "radarpulse";
}
function triggerAbility(vehicle, seat, aim, vehicles, now, events) {
  if (hasPulse(vehicle, seat)) {
    radarPulse(vehicle, seat, vehicles, now, events);
    return;
  }
  if (seat !== 1 || !aim || vehicle.abilityReadyAt > now)
    return;
  let best = null;
  let bestAng = MARK_CONE;
  for (let i = 0;i < vehicles.length; i++) {
    const o = vehicles[i];
    if (!o.alive || !isHostile(vehicle, o))
      continue;
    const ang = seekerAngle(vehicle.flight.position, aim, o.flight.position, _sd);
    if (_sd.d <= MARK_RANGE && ang < bestAng) {
      bestAng = ang;
      best = o;
    }
  }
  if (!best)
    return;
  best.spottedUntil = Math.max(best.spottedUntil, now + MARK_DURATION);
  vehicle.abilityReadyAt = now + MARK_COOLDOWN;
}
function radarPulse(vehicle, seat, vehicles, now, events) {
  if (vehicle.abilityReadyAt > now)
    return;
  const spec = WEAPONS.radarpulse;
  vehicle.abilityReadyAt = now + 1 / spec.rate;
  const p = vehicle.flight.position;
  for (let i = 0;i < vehicles.length; i++) {
    const o = vehicles[i];
    if (!o.alive || !isHostile(vehicle, o))
      continue;
    if (dist(p, o.flight.position) <= spec.splash)
      markSpotted(vehicle, o, now + spec.ttl, events);
  }
  events.push({ type: "pulse", vehicle: vehicle.id, team: vehicle.team, position: [p[0], p[1], p[2]], radius: spec.splash });
  events.push({ type: "fire", vehicle: vehicle.id, seat, weapon: "radarpulse" });
}
var _p0 = [0, 0, 0];
var _p1 = [0, 0, 0];
var _hit = [0, 0, 0];
var _des = [0, 0, 0];
var _tp = [0, 0, 0];
var _tv = [0, 0, 0];
var _scan = [0, 0, 0];
var _sh = { t: 2, vehicle: null };
function sweepVehicles(p0, p1, team, shooterId, extra, vehicles, dt) {
  _sh.t = 2;
  _sh.vehicle = null;
  const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5, mz = (p0[2] + p1[2]) * 0.5;
  const halfSeg = dist(p0, p1) * 0.5;
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v.alive || v.team === team || v.id === shooterId)
      continue;
    const c = v.flight.position, cv = v.flight.velocity;
    const r = VEHICLES[v.kind].radius + extra;
    const dx = c[0] - mx, dy = c[1] - my, dz = c[2] - mz;
    const reach = r + halfSeg + Math.sqrt(cv[0] * cv[0] + cv[1] * cv[1] + cv[2] * cv[2]) * dt;
    if (dx * dx + dy * dy + dz * dz > reach * reach)
      continue;
    const t = sweptSphere(p0, p1, c, cv, dt, r);
    if (t >= 0 && t < _sh.t) {
      _sh.t = t;
      _sh.vehicle = v;
    }
  }
  return _sh;
}
function lerpInto(a, b, t, out) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}
function stepCombat(cs, vehicles, dt, now, events) {
  regenAmmo(vehicles, dt, now);
  recordHistory(vehicles);
  stepProjectiles(cs, vehicles, dt, now, events);
  stepMissiles(cs, vehicles, dt, now, events);
  stepFlares(cs, dt);
  stepShells(cs, vehicles, dt, now, events);
  stepFleetAA(cs, vehicles, dt, now, events);
}
function regenAmmo(vehicles, dt, now) {
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v.alive)
      continue;
    const kinds = VEHICLES[v.kind].seatWeapons;
    for (let s = 0;s < 2; s++) {
      for (let k = 0;k < 2; k++) {
        const id = kinds[s][k];
        const rt = v.weapons[s][k];
        if (!id || !rt || s === 1 && sharedWithPilot(v, rt))
          continue;
        const spec = WEAPONS[id];
        const max = magazine(id);
        if (max < 0 || spec.refill <= 0)
          continue;
        if (rt.ammo >= max) {
          rt.ammo = max;
          rt.regen = 0;
          continue;
        }
        if (now - (rt.firedAt ?? -1e9) < spec.refillDelay - 0.000000001)
          continue;
        let acc = (rt.regen ?? 0) + max / spec.refill * dt;
        const whole = Math.floor(acc + 0.000001);
        if (whole > 0) {
          rt.ammo = Math.min(max, rt.ammo + whole);
          acc = Math.max(0, acc - whole);
        }
        rt.regen = rt.ammo >= max ? 0 : acc;
      }
    }
  }
}
function stepProjectiles(cs, vehicles, dt, now, events) {
  const list = cs.projectiles;
  let w = 0;
  for (let i = 0;i < list.length; i++) {
    const p = list[i];
    p.age += dt;
    if (p.age > p.ttl)
      continue;
    const spec = WEAPONS[p.weapon];
    if (spec.kind === "bomb") {
      stepBombProjectile(cs, p, vehicles, dt, now, events);
      if (p.age >= 0)
        list[w++] = p;
      continue;
    }
    const gun = spec.kind === "gun";
    if (!gun)
      p.velocity[1] -= ROCKET_GRAVITY * dt;
    const { position: pos, velocity: vel } = p;
    _p0[0] = pos[0];
    _p0[1] = pos[1];
    _p0[2] = pos[2];
    _p1[0] = pos[0] + vel[0] * dt;
    _p1[1] = pos[1] + vel[1] * dt;
    _p1[2] = pos[2] + vel[2] * dt;
    const hit = sweepRewound(_p0, _p1, p.team, p.vehicle, vehicles, dt, p.rewind ?? 0, gun);
    let g = segmentHitsGround(_p0, _p1);
    if (p.ship && g !== null) {
      const own = shipSegmentT(p.ship, _p0, _p1);
      if (own !== null && Math.abs(own - g) < 0.0001)
        g = null;
    }
    const sh = g !== null ? segmentHitsShipEx(cs, _p0, _p1, now, p.ship ?? null) : null;
    if (hit.vehicle && (g === null || hit.t <= g)) {
      const target = hit.vehicle;
      lerpInto(_p0, _p1, hit.t, _hit);
      const dmg = damageFor(p.weapon, target, now) * (gun ? gunRangeFactor(p.weapon, p.age) : 1);
      dealDamage(target, dmg, p.weapon, p.owner, _hit, now, events);
      splash(_hit, p.weapon, p.owner, p.team, p.vehicle, target, vehicles, now, events);
      if (!gun)
        pushExplosion(events, _hit, spec.splash, "air");
      continue;
    }
    if (g !== null && sh && sh.t <= g + 0.0001) {
      lerpInto(_p0, _p1, sh.t, _hit);
      const base = WEAPONS[p.weapon].damage * (gun ? gunRangeFactor(p.weapon, p.age) : 1);
      if (sh.ship.team !== p.team)
        damageShip(cs, sh.ship.id, base * shipScale(p.weapon), p.owner, p.team, _hit, now, events);
      if (!gun || p.id % BULLET_IMPACT_EVERY === 0)
        pushExplosion(events, _hit, gun ? 1 : spec.splash, "ground");
      continue;
    }
    if (g !== null) {
      lerpInto(_p0, _p1, g, _hit);
      const surface = surfaceAt(_hit);
      if (!gun && surface === "ground")
        addCrater(cs, _hit, craterRadius(p.weapon), events);
      if (gun) {
        if (surface === "ground")
          splash(_hit, p.weapon, p.owner, p.team, p.vehicle, null, vehicles, now, events);
        if (p.id % BULLET_IMPACT_EVERY === 0)
          pushExplosion(events, _hit, 1, surface);
      } else if (surface === "water") {
        splash(_hit, p.weapon, p.owner, p.team, p.vehicle, null, vehicles, now, events, WATER_SPLASH_RADIUS, WATER_SPLASH_DAMAGE);
        pushExplosion(events, _hit, spec.splash * 0.3, "water");
      } else {
        splash(_hit, p.weapon, p.owner, p.team, p.vehicle, null, vehicles, now, events);
        pushExplosion(events, _hit, spec.splash, "ground");
      }
      continue;
    }
    pos[0] = _p1[0];
    pos[1] = _p1[1];
    pos[2] = _p1[2];
    list[w++] = p;
  }
  list.length = w;
}
function steerableBomb(cs, vehicle, seat) {
  const id = vehicle.lastBomb?.[seat] ?? -1;
  if (id < 0)
    return null;
  for (let i = cs.projectiles.length - 1;i >= 0; i--)
    if (cs.projectiles[i].id === id)
      return cs.projectiles[i];
  return null;
}
var _sb2 = [0, 0, 0];
var _bi = [0, 0, 0];
function steerBomb(cs, vehicle, seat, aim, now) {
  const b = steerableBomb(cs, vehicle, seat);
  if (!b || aim[1] >= -0.02)
    return;
  const p = b.position;
  _sb2[0] = p[0] + aim[0] * 20000;
  _sb2[1] = p[1] + aim[1] * 20000;
  _sb2[2] = p[2] + aim[2] * 20000;
  const t = segmentHitsGround(p, _sb2);
  if (t === null)
    return;
  const target = b.steerTo ?? (b.steerTo = [0, 0, 0]);
  lerpInto(p, _sb2, t, target);
  b.steerAt = now;
}
function bombGuidance(b, h, now) {
  const to = b.steerTo;
  if (!to || b.steerAt === undefined || now - b.steerAt > BOMB_STEER_STALE)
    return;
  const used = b.steerDv ?? 0;
  if (used >= BOMB_STEER_DV)
    return;
  const { position: p, velocity: v } = b;
  const tf = bombImpactPoint(p, v, _bi, worldQuery);
  if (!(tf > 0.2))
    return;
  const ex = to[0] - _bi[0], ez = to[2] - _bi[2];
  let ax = ex / tf / 0.5, az = ez / tf / 0.5;
  const a = Math.hypot(ax, az);
  const cap = Math.min(BOMB_STEER_ACCEL, (BOMB_STEER_DV - used) / h);
  if (a > cap) {
    ax *= cap / a;
    az *= cap / a;
  }
  v[0] += ax * h;
  v[2] += az * h;
  b.steerDv = used + Math.min(a, cap) * h;
}
function stepBombProjectile(cs, p, vehicles, dt, now, events) {
  const pos = p.position;
  _p0[0] = pos[0];
  _p0[1] = pos[1];
  _p0[2] = pos[2];
  let left = dt;
  while (left > 0.000000001) {
    const h = Math.min(BOMB_STEP, left);
    bombGuidance(p, h, now);
    stepBomb(pos, p.velocity, h);
    left -= h;
  }
  _p1[0] = pos[0];
  _p1[1] = pos[1];
  _p1[2] = pos[2];
  const g = segmentHitsGround(_p0, _p1);
  if (g === null && p.age <= p.ttl)
    return;
  if (g === null) {
    p.age = -1;
    return;
  }
  const sh = segmentHitsShipEx(cs, _p0, _p1, now, null);
  const direct = sh && sh.t <= g + 0.0001 ? sh.ship : null;
  lerpInto(_p0, _p1, direct ? sh.t : g, _hit);
  bombImpact(cs, p, _hit, direct, vehicles, now, events);
  p.age = -1;
}
function recordHistory(vehicles) {
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v.alive) {
      v.histCount = 0;
      continue;
    }
    const h = v.hist ?? (v.hist = new Float64Array(HISTORY_TICKS * 3));
    const head = v.histCount ? ((v.histHead ?? 0) + 1) % HISTORY_TICKS : 0;
    const p = v.flight.position;
    h[head * 3] = p[0];
    h[head * 3 + 1] = p[1];
    h[head * 3 + 2] = p[2];
    v.histHead = head;
    v.histCount = Math.min(HISTORY_TICKS, (v.histCount ?? 0) + 1);
  }
}
function rewoundPosition(v, back, out) {
  const x = v;
  const p = v.flight.position;
  const n = x.histCount ?? 0;
  if (!x.hist || n === 0 || back <= 0) {
    const u = v.flight.velocity, b = Math.max(0, back);
    out[0] = p[0] - u[0] * b;
    out[1] = p[1] - u[1] * b;
    out[2] = p[2] - u[2] * b;
    return out;
  }
  const k = Math.min(back / TICK_DT, n - 1);
  const i0 = Math.floor(k), f = k - i0, i1 = Math.min(i0 + 1, n - 1);
  const h = x.hist, head = x.histHead ?? 0;
  const a = ((head - i0) % HISTORY_TICKS + HISTORY_TICKS) % HISTORY_TICKS * 3;
  const b = ((head - i1) % HISTORY_TICKS + HISTORY_TICKS) % HISTORY_TICKS * 3;
  out[0] = h[a] + (h[b] - h[a]) * f;
  out[1] = h[a + 1] + (h[b + 1] - h[a + 1]) * f;
  out[2] = h[a + 2] + (h[b + 2] - h[a + 2]) * f;
  return out;
}
var _c0 = [0, 0, 0];
var _c1 = [0, 0, 0];
var _cv = [0, 0, 0];
var _ls0 = [0, 0, 0];
var _ls1 = [0, 0, 0];
var _segS = 0;
function segSegDist2(a, b, c, d) {
  const d1x = b[0] - a[0], d1y = b[1] - a[1], d1z = b[2] - a[2];
  const d2x = d[0] - c[0], d2y = d[1] - c[1], d2z = d[2] - c[2];
  const rx = a[0] - c[0], ry = a[1] - c[1], rz = a[2] - c[2];
  const A = d1x * d1x + d1y * d1y + d1z * d1z, E = d2x * d2x + d2y * d2y + d2z * d2z;
  const F = d2x * rx + d2y * ry + d2z * rz;
  let s, t;
  if (A <= 0.000000000001 && E <= 0.000000000001) {
    s = 0;
    t = 0;
  } else if (A <= 0.000000000001) {
    s = 0;
    t = clamp01(F / E);
  } else {
    const C = d1x * rx + d1y * ry + d1z * rz;
    if (E <= 0.000000000001) {
      t = 0;
      s = clamp01(-C / A);
    } else {
      const B = d1x * d2x + d1y * d2y + d1z * d2z;
      const den = A * E - B * B;
      s = den > 0.000000000001 ? clamp01((B * F - C * E) / den) : 0;
      t = (B * s + F) / E;
      if (t < 0) {
        t = 0;
        s = clamp01(-C / A);
      } else if (t > 1) {
        t = 1;
        s = clamp01((B - C) / A);
      }
    }
  }
  _segS = s;
  const px = a[0] + d1x * s - (c[0] + d2x * t), py = a[1] + d1y * s - (c[1] + d2y * t), pz = a[2] + d1z * s - (c[2] + d2z * t);
  return px * px + py * py + pz * pz;
}
function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
var _capA = [0, 0, 0];
var _capB = [0, 0, 0];
function hitboxSweep(s0, s1, R) {
  const segLen = dist(s0, s1);
  let best = 2;
  for (let k = 0;k < 2; k++) {
    const half = R * (k === 0 ? HITBOX.fuselageHalf : HITBOX.wingHalf);
    const r = R * (k === 0 ? HITBOX.fuselageRadius : HITBOX.wingRadius);
    if (k === 0) {
      _capA[0] = 0;
      _capA[1] = 0;
      _capA[2] = -half;
      _capB[0] = 0;
      _capB[1] = 0;
      _capB[2] = half;
    } else {
      _capA[0] = -half;
      _capA[1] = 0;
      _capA[2] = 0;
      _capB[0] = half;
      _capB[1] = 0;
      _capB[2] = 0;
    }
    const d2 = segSegDist2(s0, s1, _capA, _capB);
    if (d2 > r * r)
      continue;
    const t = segLen > 0.000000001 ? Math.max(0, _segS - Math.sqrt(r * r - d2) / segLen) : 0;
    if (t < best)
      best = t;
  }
  return best <= 1 ? best : -1;
}
function sweepRewound(p0, p1, team, shooterId, vehicles, dt, rewind, capsule) {
  _sh.t = 2;
  _sh.vehicle = null;
  const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5, mz = (p0[2] + p1[2]) * 0.5;
  const halfSeg = dist(p0, p1) * 0.5;
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v.alive || v.team === team || v.id === shooterId)
      continue;
    const R = VEHICLES[v.kind].radius;
    rewoundPosition(v, rewind, _c1);
    rewoundPosition(v, rewind + dt, _c0);
    const dx = _c1[0] - mx, dy = _c1[1] - my, dz = _c1[2] - mz;
    const reach = R * 1.7 + halfSeg + dist(_c0, _c1);
    if (dx * dx + dy * dy + dz * dz > reach * reach)
      continue;
    let t;
    if (capsule) {
      const q = v.flight.orientation;
      rotateInv(q, p0[0] - _c0[0], p0[1] - _c0[1], p0[2] - _c0[2], _ls0);
      rotateInv(q, p1[0] - _c1[0], p1[1] - _c1[1], p1[2] - _c1[2], _ls1);
      t = hitboxSweep(_ls0, _ls1, R);
    } else {
      _cv[0] = (_c1[0] - _c0[0]) / dt;
      _cv[1] = (_c1[1] - _c0[1]) / dt;
      _cv[2] = (_c1[2] - _c0[2]) / dt;
      t = sweptSphere(p0, p1, _c1, _cv, dt, R);
    }
    if (t >= 0 && t < _sh.t) {
      _sh.t = t;
      _sh.vehicle = v;
    }
  }
  return _sh;
}
function findFlare(cs, id) {
  for (let i = 0;i < cs.flares.length; i++)
    if (cs.flares[i].id === id)
      return cs.flares[i];
  return null;
}
function missileDirectDamage(weapon, target, now) {
  const k = WEAPONS[weapon].kind;
  if (k === "missile_lock" || k === "missile_scanner")
    return Math.max(target.hp, target.maxHp) + 1;
  return damageFor(weapon, target, now);
}
function detonate(m, pos, direct, vehicles, now, events, surface = "air") {
  const size = WEAPONS[m.weapon].splash;
  if (direct)
    dealDamage(direct, missileDirectDamage(m.weapon, direct, now), m.weapon, m.owner, pos, now, events);
  if (surface === "water") {
    splash(pos, m.weapon, m.owner, m.team, m.vehicle, direct, vehicles, now, events, WATER_SPLASH_RADIUS, WATER_SPLASH_DAMAGE);
    pushExplosion(events, pos, size * 0.3, "water");
    return;
  }
  splash(pos, m.weapon, m.owner, m.team, m.vehicle, direct, vehicles, now, events);
  pushExplosion(events, pos, size, surface);
}
function scannerOnTarget(m, target, vehicles) {
  const shooter = findVehicle(vehicles, m.vehicle);
  if (!shooter || !shooter.alive || !target.alive)
    return false;
  const seat = m.seat ?? 1;
  if (shooter.seats[seat] !== m.owner)
    return false;
  const aim = shooter.aim[seat];
  if (!aim || !normalizeInto(aim, _scan))
    return false;
  const spec = WEAPONS[m.weapon];
  const ang = seekerAngle(shooter.flight.position, _scan, target.flight.position, _sd);
  return ang <= (spec.lockCone ?? 0.12) * SCANNER_CONE_MARGIN && _sd.d <= (spec.range ?? 8000) * 1.1;
}
function scannerGuidance(m, vehicles, tune, dt, events) {
  if (!m.scanTarget)
    return null;
  const target = findVehicle(vehicles, m.scanTarget);
  if (!target || !target.alive) {
    m.scanTarget = null;
    m.target = null;
    return null;
  }
  if (scannerOnTarget(m, target, vehicles)) {
    m.scanOff = 0;
    if (m.target === null) {
      _dir[0] = m.velocity[0];
      _dir[1] = m.velocity[1];
      _dir[2] = m.velocity[2];
      if (normalizeInto(_dir, _dir) && seekerAngle(m.position, _dir, target.flight.position, _sd) <= tune.gimbal) {
        m.target = target.id;
        events.push({ type: "guidance", missile: m.id, vehicle: m.vehicle, target: target.id, guided: true });
      }
    }
  } else {
    m.scanOff = (m.scanOff ?? 0) + dt;
    if (m.scanOff > SCANNER_GRACE && m.target !== null) {
      m.target = null;
      events.push({ type: "guidance", missile: m.id, vehicle: m.vehicle, target: target.id, guided: false });
    }
  }
  return m.target === target.id ? target : null;
}
function stepMissiles(cs, vehicles, dt, now, events) {
  const list = cs.missiles;
  let w = 0;
  for (let i = 0;i < list.length; i++) {
    const m = list[i];
    const spec = WEAPONS[m.weapon];
    const tune = MISSILE_TUNING[m.weapon];
    m.age += dt;
    if (m.age > m.ttl) {
      detonate(m, m.position, null, vehicles, now, events);
      continue;
    }
    const { velocity: vel, position: pos } = m;
    let speed = len(vel);
    if (speed < 0.000001)
      speed = 0.000001;
    if (m.age <= tune.burn) {
      if (speed < tune.maxSpeed)
        speed = Math.min(tune.maxSpeed, speed + tune.accel * dt);
    } else
      speed = Math.max(MISSILE_MIN_SPEED, speed - tune.coastDecel * dt);
    const maxTurn = (spec.turnRate ?? 1) * dt;
    let flareTarget = null;
    let ok = false;
    if (m.target && m.target.startsWith(FLARE_TARGET_PREFIX)) {
      flareTarget = findFlare(cs, Number(m.target.slice(FLARE_TARGET_PREFIX.length)));
      if (flareTarget) {
        _tp[0] = flareTarget.position[0];
        _tp[1] = flareTarget.position[1];
        _tp[2] = flareTarget.position[2];
        _tv[0] = flareTarget.velocity[0];
        _tv[1] = flareTarget.velocity[1];
        _tv[2] = flareTarget.velocity[2];
        ok = true;
      } else
        m.target = null;
    } else if (m.target && m.target.startsWith(SHIP_TARGET_PREFIX)) {
      if (shipAimPoint(cs, m.target.slice(SHIP_TARGET_PREFIX.length), _tp)) {
        const dv = deckVelocity(_tp[0], _tp[2]);
        _tv[0] = dv ? dv[0] : 0;
        _tv[1] = 0;
        _tv[2] = dv ? dv[2] : 0;
        ok = true;
      } else
        m.target = null;
    } else {
      const t = m.steered ? scannerGuidance(m, vehicles, tune, dt, events) : m.target ? findVehicle(vehicles, m.target) : null;
      if (t && t.alive) {
        const fp = t.flight.position, fv = t.flight.velocity;
        _tp[0] = fp[0];
        _tp[1] = fp[1];
        _tp[2] = fp[2];
        _tv[0] = fv[0];
        _tv[1] = fv[1];
        _tv[2] = fv[2];
        ok = true;
      } else if (!m.steered)
        m.target = null;
    }
    _dir[0] = vel[0] / len(vel);
    _dir[1] = vel[1] / len(vel);
    _dir[2] = vel[2] / len(vel);
    if (ok && m.age > MISSILE_LOAL_TIME && seekerAngle(pos, _dir, _tp, _sd) > tune.gimbal) {
      ok = false;
      m.target = null;
      if (m.steered)
        m.scanTarget = null;
    }
    if (ok)
      proNav(pos, _dir, speed, _tp, _tv, dt, maxTurn);
    vel[0] = _dir[0] * speed;
    vel[1] = _dir[1] * speed;
    vel[2] = _dir[2] * speed;
    _p0[0] = pos[0];
    _p0[1] = pos[1];
    _p0[2] = pos[2];
    _p1[0] = pos[0] + vel[0] * dt;
    _p1[1] = pos[1] + vel[1] * dt;
    _p1[2] = pos[2] + vel[2] * dt;
    const hit = sweepVehicles(_p0, _p1, m.team, m.vehicle, tune.fuse, vehicles, dt);
    const g = segmentHitsGround(_p0, _p1);
    if (hit.vehicle && (g === null || hit.t <= g)) {
      detonate(m, lerpInto(_p0, _p1, hit.t, _hit), hit.vehicle, vehicles, now, events);
      continue;
    }
    if (g !== null) {
      const sh = segmentHitsShipEx(cs, _p0, _p1, now, null);
      if (sh && sh.t <= g + 0.0001) {
        lerpInto(_p0, _p1, sh.t, _hit);
        if (sh.ship.team !== m.team)
          damageShip(cs, sh.ship.id, shipDamageFor(m.weapon), m.owner, m.team, _hit, now, events);
        detonate(m, _hit, null, vehicles, now, events, "ground");
        continue;
      }
      lerpInto(_p0, _p1, g, _hit);
      const surface = surfaceAt(_hit);
      detonate(m, _hit, null, vehicles, now, events, surface);
      if (surface === "ground")
        addCrater(cs, _hit, craterRadius(m.weapon), events);
      continue;
    }
    if (flareTarget && dist(_p1, flareTarget.position) < tune.fuse + 4) {
      detonate(m, _p1, null, vehicles, now, events);
      continue;
    }
    pos[0] = _p1[0];
    pos[1] = _p1[1];
    pos[2] = _p1[2];
    list[w++] = m;
  }
  list.length = w;
}
function proNav(mp, dir, speed, tp, tv, dt, maxTurn) {
  const rx = tp[0] - mp[0], ry = tp[1] - mp[1], rz = tp[2] - mp[2];
  const r2 = rx * rx + ry * ry + rz * rz;
  if (r2 < 0.000001)
    return;
  const vmx = dir[0] * speed, vmy = dir[1] * speed, vmz = dir[2] * speed;
  const vrx = tv[0] - vmx, vry = tv[1] - vmy, vrz = tv[2] - vmz;
  const ox = (ry * vrz - rz * vry) / r2, oy = (rz * vrx - rx * vrz) / r2, oz = (rx * vry - ry * vrx) / r2;
  const n = PROPORTIONAL_NAV_GAIN;
  const ax = n * (oy * vmz - oz * vmy), ay = n * (oz * vmx - ox * vmz), az = n * (ox * vmy - oy * vmx);
  _des[0] = vmx + ax * dt;
  _des[1] = vmy + ay * dt;
  _des[2] = vmz + az * dt;
  if (rx * dir[0] + ry * dir[1] + rz * dir[2] < 0) {
    _des[0] = rx;
    _des[1] = ry;
    _des[2] = rz;
  }
  if (normalizeInto(_des, _des))
    turnToward(dir, _des, maxTurn);
}
function stepFlares(cs, dt) {
  const list = cs.flares;
  let w = 0;
  const drag = Math.exp(-1.2 * dt);
  for (let i = 0;i < list.length; i++) {
    const f = list[i];
    f.age += dt;
    if (f.age > f.ttl)
      continue;
    const { velocity: v, position: p } = f;
    v[0] *= drag;
    v[1] = v[1] * drag - 9.81 * dt;
    v[2] *= drag;
    p[0] += v[0] * dt;
    p[1] += v[1] * dt;
    p[2] += v[2] * dt;
    list[w++] = f;
  }
  list.length = w;
}
var SHIP_TARGET_PREFIX = "ship:";
var SHIP_LOCK_CONE_SCALE = 1.6;
var TURRET_HIT_RADIUS = 12;
var SHIP_DAMAGE_POINTS = 16;
var SHIP_SINK_COLLISION_TIME = 20;
var MAX_CRATERS = 300;
var MANNED_CIWS_RATE = 20;
var MANNED_GUN_RELOAD = 1.5;
var MANNED_GUN_FUSE = 18;
var SHELL_TTL = 3.5;
function createShips() {
  const out = {};
  for (const sh of FLEET) {
    const spec = SHIP_SPECS[sh.kind];
    const turrets = {};
    for (const t of spec.turrets)
      turrets[t.id] = { hp: TURRET_HP, manned: null, readyAt: 0 };
    out[sh.id] = { id: sh.id, team: sh.team, kind: sh.kind, hp: spec.maxHp, maxHp: spec.maxHp, sunk: false, sunkAt: 0, turrets, damage: [], damageCount: 0 };
  }
  return out;
}
function shipRuntime(cs, id) {
  if (!cs.ships)
    cs.ships = createShips();
  return cs.ships[id] ?? null;
}
function shipScale(weapon) {
  const spec = WEAPONS[weapon];
  return spec ? SHIP_DAMAGE_SCALE[spec.kind] ?? 0 : 0;
}
function shipDamageFor(weapon) {
  return (WEAPONS[weapon]?.damage ?? 0) * shipScale(weapon);
}
function craterRadius(weapon) {
  if (weapon === "flak")
    return 6;
  return Math.min(15, Math.max(6, (WEAPONS[weapon]?.splash ?? 8) * 0.8));
}
function addCrater(cs, p, radius, events) {
  if (!cs.craters)
    cs.craters = [];
  if (cs.craters.length >= MAX_CRATERS || isWater(p[0], p[2]) || shipAt(p[0], p[2]))
    return;
  const position = [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.round(p[2] * 10) / 10];
  const r = Math.round(radius * 10) / 10;
  cs.craters.push({ position, radius: r });
  events.push({ type: "crater", position: [position[0], position[1], position[2]], radius: r });
}
var _sl0 = [0, 0, 0];
var _sl1 = [0, 0, 0];
function boxT(a, b, cx, cy, cz, hx, hy, hz) {
  let t0 = 0, t1 = 1;
  for (let k = 0;k < 3; k++) {
    const pa = a[k], d = b[k] - pa;
    const c = k === 0 ? cx : k === 1 ? cy : cz, h = k === 0 ? hx : k === 1 ? hy : hz;
    const lo = c - h, hi = c + h;
    if (Math.abs(d) < 0.000000001) {
      if (pa < lo || pa > hi)
        return null;
      continue;
    }
    let u0 = (lo - pa) / d, u1 = (hi - pa) / d;
    if (u0 > u1) {
      const x = u0;
      u0 = u1;
      u1 = x;
    }
    if (u0 > t0)
      t0 = u0;
    if (u1 < t1)
      t1 = u1;
    if (t0 > t1)
      return null;
  }
  return t0;
}
function toShipLocal(ship, p, out) {
  const dx = p[0] - ship.position[0], dz = p[2] - ship.position[2];
  const c = Math.cos(ship.heading), s = Math.sin(ship.heading);
  out[0] = dx * c - dz * s;
  out[1] = p[1] - ship.position[1];
  out[2] = dx * s + dz * c;
  return out;
}
function shipBoxesT(ship, a, b) {
  const sp = SHIP_SPECS[ship.kind];
  const r = Math.hypot(sp.halfLength, sp.halfWidth) + 5;
  const P = ship.position;
  if (Math.max(a[0], b[0]) < P[0] - r || Math.min(a[0], b[0]) > P[0] + r || Math.max(a[2], b[2]) < P[2] - r || Math.min(a[2], b[2]) > P[2] + r)
    return null;
  toShipLocal(ship, a, _sl0);
  toShipLocal(ship, b, _sl1);
  const hull = boxT(_sl0, _sl1, 0, (sp.deckHeight - 15) / 2, 0, sp.halfWidth, (sp.deckHeight + 15) / 2, sp.halfLength);
  const I = sp.island;
  const isl = boxT(_sl0, _sl1, I.center[0], I.center[1], I.center[2], I.half[0], I.half[1], I.half[2]);
  return hull === null ? isl : isl === null ? hull : Math.min(hull, isl);
}
function shipSegmentT(id, a, b) {
  const ship = posedShip(id);
  return ship ? shipBoxesT(ship, a, b) : null;
}
var _shipHit = { t: 2, ship: null };
function segmentHitsShipEx(cs, a, b, now, skip) {
  const fleet = posedFleet();
  let best = null;
  let bestT = 2;
  for (let i = 0;i < fleet.length; i++) {
    const ship = fleet[i];
    if (ship.id === skip)
      continue;
    const rt = shipRuntime(cs, ship.id);
    if (rt && rt.sunk && now - rt.sunkAt > SHIP_SINK_COLLISION_TIME)
      continue;
    const t = shipBoxesT(ship, a, b);
    if (t !== null && t < bestT) {
      bestT = t;
      best = ship;
    }
  }
  if (!best)
    return null;
  _shipHit.t = bestT;
  _shipHit.ship = best;
  return _shipHit;
}
function shipAimPoint(cs, id, out) {
  const ship = posedShip(id);
  const rt = shipRuntime(cs, id);
  if (!ship || !rt || rt.sunk || ship.team >= fleetState().teams)
    return false;
  out[0] = ship.position[0];
  out[1] = SHIP_SPECS[ship.kind].deckHeight * 0.6;
  out[2] = ship.position[2];
  return true;
}
var _sap = [0, 0, 0];
function shipLockAngle(cs, vehicle, spec, axis, id) {
  const ship = posedShip(id);
  if (!ship || ship.team === vehicle.team || !shipAimPoint(cs, id, _sap))
    return -1;
  const ang = seekerAngle(vehicle.flight.position, axis, _sap, _sd);
  const range = spec.range ?? 2500;
  return _sd.d > range || ang > (spec.lockCone ?? 0.3) * SHIP_LOCK_CONE_SCALE ? -1 : ang;
}
function shipLockCandidate(cs, vehicle, spec, axis) {
  const fleet = posedFleet();
  let best = null;
  let bestAng = Infinity;
  for (let i = 0;i < fleet.length; i++) {
    const ang = shipLockAngle(cs, vehicle, spec, axis, fleet[i].id);
    if (ang >= 0 && ang < bestAng) {
      bestAng = ang;
      best = fleet[i].id;
    }
  }
  return best;
}
function damageShip(cs, id, amount, by, byTeam, worldPos, now, events) {
  const rt = shipRuntime(cs, id);
  const ship = posedShip(id);
  if (!rt || !ship || rt.sunk || amount <= 0 || rt.team === byTeam)
    return;
  const dealt = Math.min(amount, rt.hp);
  rt.hp -= dealt;
  if (!cs.shipDamageBy)
    cs.shipDamageBy = [0, 0, 0, 0];
  if (byTeam >= 0 && byTeam < 4)
    cs.shipDamageBy[byTeam] += dealt;
  const local = toShipLocal(ship, worldPos, [0, 0, 0]);
  const decal = [Math.round(local[0] * 10) / 10, Math.round(local[1] * 10) / 10, Math.round(local[2] * 10) / 10];
  if (rt.damage.length < SHIP_DAMAGE_POINTS)
    rt.damage.push(decal);
  else
    rt.damage[rt.damageCount % SHIP_DAMAGE_POINTS] = decal;
  rt.damageCount++;
  let hitTurret = null;
  let bestD = TURRET_HIT_RADIUS;
  for (const t of SHIP_SPECS[rt.kind].turrets) {
    const tr = rt.turrets[t.id];
    if (!tr || tr.hp <= 0)
      continue;
    const d = Math.hypot(local[0] - t.offset[0], local[1] - t.offset[1], local[2] - t.offset[2]);
    if (d <= bestD) {
      bestD = d;
      hitTurret = t.id;
    }
  }
  const e = { type: "ship-hit", ship: id, by, damage: Math.round(dealt * 10) / 10, position: [worldPos[0], worldPos[1], worldPos[2]] };
  if (hitTurret)
    e.turret = hitTurret;
  events.push(e);
  if (hitTurret) {
    const tr = rt.turrets[hitTurret];
    tr.hp = Math.max(0, tr.hp - amount);
    if (tr.hp <= 0)
      events.push({ type: "turret-destroyed", ship: id, turret: hitTurret, by });
  }
  if (rt.hp <= 0) {
    rt.hp = 0;
    rt.sunk = true;
    rt.sunkAt = now;
    events.push({ type: "ship-sunk", ship: id, team: rt.team, by, position: [ship.position[0], 0, ship.position[2]] });
  }
}
function turretOperational(cs, shipId, turretId) {
  const rt = shipRuntime(cs, shipId);
  if (!rt || rt.sunk)
    return false;
  const tr = rt.turrets[turretId];
  return !!tr && tr.hp > 0;
}
var _ta = [0, 0, 0];
var _tm = [0, 0, 0];
function findTurret(shipId, turretId) {
  for (let i = 0;i < AA_TURRETS.length; i++)
    if (AA_TURRETS[i].ship.id === shipId && AA_TURRETS[i].turret === turretId)
      return AA_TURRETS[i];
  return null;
}
function turretMuzzle(t, dir, out) {
  out[0] = t.position[0] + dir[0] * 3;
  out[1] = t.position[1] + dir[1] * 3;
  out[2] = t.position[2] + dir[2] * 3;
  return out;
}
function applyTurretInput(cs, shipId, turretId, player, input, now, events) {
  const t = findTurret(shipId, turretId);
  const rt = shipRuntime(cs, shipId);
  if (!t || !rt || !turretOperational(cs, shipId, turretId) || t.team >= fleetState().teams)
    return;
  const tr = rt.turrets[turretId];
  refreshTurret(t);
  if (!input.firePrimary || !input.aim || !normalizeInto(input.aim, _ta))
    return;
  if (tr.readyAt < now - TICK_DT)
    tr.readyAt = now;
  if (t.kind === "ciws") {
    const spec = WEAPONS.cannon20;
    let fired = 0;
    while (tr.readyAt <= now + 0.000000001 && fired < 4 && cs.projectiles.length < MAX_PROJECTILES) {
      const id = cs.nextId++;
      _dir[0] = _ta[0];
      _dir[1] = _ta[1];
      _dir[2] = _ta[2];
      applySpread(_dir, 0.004, id);
      turretMuzzle(t, _dir, _tm);
      const vx = _dir[0] * spec.speed, vy = _dir[1] * spec.speed, vz = _dir[2] * spec.speed;
      const proj = {
        id,
        weapon: "cannon20",
        owner: player,
        vehicle: shipId,
        team: t.team,
        position: [_tm[0] - vx * TICK_DT, _tm[1] - vy * TICK_DT, _tm[2] - vz * TICK_DT],
        velocity: [vx, vy, vz],
        age: -TICK_DT,
        ttl: spec.ttl,
        ship: shipId
      };
      cs.projectiles.push(proj);
      tr.readyAt += 1 / MANNED_CIWS_RATE;
      fired++;
    }
    if (fired && Math.floor(now * 4) !== Math.floor((now - TICK_DT) * 4))
      emitAa(t, null, aimPointAlong(t.position, _ta, 800), events);
  } else if (tr.readyAt <= now + 0.000000001) {
    tr.readyAt = now + MANNED_GUN_RELOAD;
    if (!cs.shells)
      cs.shells = [];
    turretMuzzle(t, _ta, _tm);
    cs.shells.push({
      id: cs.nextId++,
      owner: player,
      ship: shipId,
      team: t.team,
      position: [_tm[0], _tm[1], _tm[2]],
      velocity: [_ta[0] * AA_GUN_SHELL_SPEED, _ta[1] * AA_GUN_SHELL_SPEED, _ta[2] * AA_GUN_SHELL_SPEED],
      age: 0
    });
    emitAa(t, null, aimPointAlong(t.position, _ta, 1500), events);
  }
}
var _apa = [0, 0, 0];
function aimPointAlong(p, dir, d) {
  _apa[0] = p[0] + dir[0] * d;
  _apa[1] = p[1] + dir[1] * d;
  _apa[2] = p[2] + dir[2] * d;
  return _apa;
}
function stepShells(cs, vehicles, dt, now, events) {
  const list = cs.shells;
  if (!list || !list.length)
    return;
  let w = 0;
  for (let i = 0;i < list.length; i++) {
    const sh = list[i];
    sh.age += dt;
    const { position: pos, velocity: vel } = sh;
    _p0[0] = pos[0];
    _p0[1] = pos[1];
    _p0[2] = pos[2];
    _p1[0] = pos[0] + vel[0] * dt;
    _p1[1] = pos[1] + vel[1] * dt;
    _p1[2] = pos[2] + vel[2] * dt;
    let burstT = -1;
    for (let k = 0;k < vehicles.length; k++) {
      const v = vehicles[k];
      if (!v.alive || v.team === sh.team)
        continue;
      const t = sweptSphere(_p0, _p1, v.flight.position, v.flight.velocity, dt, MANNED_GUN_FUSE + VEHICLES[v.kind].radius);
      if (t >= 0 && (burstT < 0 || t < burstT))
        burstT = t;
    }
    let g = segmentHitsGround(_p0, _p1);
    if (g !== null) {
      const own = shipSegmentT(sh.ship, _p0, _p1);
      if (own !== null && Math.abs(own - g) < 0.0001 && sh.age < 0.5)
        g = null;
    }
    const impact = g !== null && (burstT < 0 || g < burstT);
    if (burstT < 0 && !impact && sh.age < SHELL_TTL) {
      pos[0] = _p1[0];
      pos[1] = _p1[1];
      pos[2] = _p1[2];
      list[w++] = sh;
      continue;
    }
    lerpInto(_p0, _p1, impact ? g : burstT >= 0 ? burstT : 1, _hit);
    if (impact) {
      const shp = segmentHitsShipEx(cs, _p0, _p1, now, sh.ship);
      if (shp && Math.abs(shp.t - g) < 0.001) {
        if (shp.ship.team !== sh.team)
          damageShip(cs, shp.ship.id, AA_GUN_DAMAGE * (SHIP_DAMAGE_SCALE.rockets ?? 1), sh.owner, sh.team, _hit, now, events);
        pushExplosion(events, _hit, AA_GUN_SPLASH * 0.5, "ground");
      } else {
        const surface = surfaceAt(_hit);
        pushExplosion(events, _hit, AA_GUN_SPLASH * 0.5, surface);
        if (surface === "ground")
          addCrater(cs, _hit, craterRadius("flak"), events);
      }
    } else
      pushExplosion(events, _hit, AA_GUN_SPLASH * 0.5, "air", true);
    for (let k = 0;k < vehicles.length; k++) {
      const v = vehicles[k];
      if (!v.alive || v.team === sh.team)
        continue;
      const dd = Math.max(0, dist(_hit, v.flight.position) - VEHICLES[v.kind].radius);
      if (dd >= AA_GUN_SPLASH)
        continue;
      dealDamage(v, aaDamage(v, AA_GUN_DAMAGE * (1 - dd / AA_GUN_SPLASH), now), AA_WEAPON, sh.owner, _hit, now, events);
    }
  }
  list.length = w;
}
var AA_WEAPON = "aa";
var AA_ACQUIRE = 1;
var AA_SCAN_INTERVAL = 0.1;
var CIWS_DPS = 52;
var CIWS_FULL_RANGE = 400;
var CIWS_MAX_RANGE = 900;
var AA_CROSSING_SCALE = 0.3;
var AA_MANEUVER_SCALE = 35;
var AA_SPEED_SCALE = 450;
var AA_EVENT_INTERVAL = 0.1;
var CIWS_TRACER_SPEED = 1100;
var AA_GUN_SHELL_SPEED = 800;
var AA_GUN_RELOAD = 2;
var AA_GUN_DAMAGE = 70;
var AA_GUN_SPLASH = 25;
var AA_GUN_DISPERSION = 0.035;
function ciwsFactor(d) {
  if (d >= CIWS_MAX_RANGE)
    return 0;
  if (d <= CIWS_FULL_RANGE)
    return 1;
  return 1 - (d - CIWS_FULL_RANGE) / (CIWS_MAX_RANGE - CIWS_FULL_RANGE);
}
function aaAccuracy(turretPos, targetPos, v, accel) {
  const dx = targetPos[0] - turretPos[0], dy = targetPos[1] - turretPos[1], dz = targetPos[2] - turretPos[2];
  const d = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz));
  const radial = (v[0] * dx + v[1] * dy + v[2] * dz) / d;
  const speed2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const crossing = Math.sqrt(Math.max(0, speed2 - radial * radial)) / d;
  const c = crossing / AA_CROSSING_SCALE, a = accel / AA_MANEUVER_SCALE, sp = Math.sqrt(speed2) / AA_SPEED_SCALE;
  return 1 / (1 + c * c + a * a + sp * sp);
}
var AA_TURRETS = FLEET.flatMap((ship) => SHIP_SPECS[ship.kind].turrets.map((t) => ({ ship, turret: t.id, kind: t.kind, team: ship.team, position: shipToWorld(ship, t.offset), offset: t.offset })));
function poseOf(ship) {
  return posedShip(ship.id) ?? ship;
}
function refreshTurret(t) {
  if (!t.offset)
    return;
  const ship = poseOf(t.ship);
  const c = Math.cos(ship.heading), s = Math.sin(ship.heading), o = t.offset;
  t.position[0] = ship.position[0] + o[0] * c + o[2] * s;
  t.position[1] = ship.position[1] + o[1];
  t.position[2] = ship.position[2] - o[0] * s + o[2] * c;
}
function createTurretStates() {
  return AA_TURRETS.map((_, i) => ({
    target: null,
    track: 0,
    pending: 0,
    nextEventAt: 0,
    readyAt: 0,
    nextScanAt: i % 6 * (AA_SCAN_INTERVAL / 6)
  }));
}
var _ls = [0, 0, 0];
var _lead = [0, 0, 0];
var _zero2 = [0, 0, 0];
function turretHasLOS(t, p) {
  const spec = SHIP_SPECS[t.ship.kind];
  refreshTurret(t);
  const ship = poseOf(t.ship);
  const a = worldToShip(ship, t.position), b = worldToShip(ship, p);
  const top = Math.max(spec.deckHeight, spec.island.center[1] + spec.island.half[1]) + 2;
  const lo = [-spec.halfWidth - 2, -5, -spec.halfLength - 2], hi = [spec.halfWidth + 2, top, spec.halfLength + 2];
  let tExit = 0;
  let tEnter = 0, tOut = 1, hits = true;
  for (let k = 0;k < 3; k++) {
    const d = b[k] - a[k];
    if (Math.abs(d) < 0.000000001) {
      if (a[k] < lo[k] || a[k] > hi[k]) {
        hits = false;
        break;
      }
      continue;
    }
    let t0 = (lo[k] - a[k]) / d, t1 = (hi[k] - a[k]) / d;
    if (t0 > t1) {
      const x = t0;
      t0 = t1;
      t1 = x;
    }
    if (t0 > tEnter)
      tEnter = t0;
    if (t1 < tOut)
      tOut = t1;
    if (tEnter > tOut) {
      hits = false;
      break;
    }
  }
  if (hits && tEnter <= 0)
    tExit = Math.min(1, tOut + 0.0001);
  if (tExit >= 1)
    return true;
  lerpInto(t.position, p, tExit, _ls);
  return segmentHitsGround(_ls, p) === null;
}
function aaEligible(t, v, now) {
  if (!v.alive || v.team === t.team || isSpawnProtected(v, now))
    return false;
  const p = v.flight.position;
  if (VEHICLES[v.kind].stealth && p[1] > STEALTH_AA_CEILING)
    return false;
  const dx = p[0] - t.position[0], dy = p[1] - t.position[1], dz = p[2] - t.position[2];
  return dx * dx + dy * dy + dz * dz <= AA_RANGE * AA_RANGE;
}
function aaScan(t, vehicles, now) {
  let lastD = -1;
  for (let attempt = 0;attempt < 3; attempt++) {
    let best = null;
    let bestD = Infinity;
    for (let i = 0;i < vehicles.length; i++) {
      const v = vehicles[i];
      if (!aaEligible(t, v, now))
        continue;
      const d = dist(t.position, v.flight.position);
      if (d > lastD && d < bestD) {
        bestD = d;
        best = v;
      }
    }
    if (!best)
      return null;
    if (turretHasLOS(t, best.flight.position))
      return best;
    lastD = bestD;
  }
  return null;
}
function aaDamage(v, amount, now) {
  const spotted = v.spottedUntil > now ? SPOTTED_DAMAGE_MULT : 1;
  return amount * ARMOR[v.kind] * spotted;
}
function applyAaDamage(t, v, amount, pos, now, events) {
  if (!v.alive || amount <= 0 || isSpawnProtected(v, now))
    return;
  v.hp -= amount;
  events.push({ type: "hit", target: v.id, by: t.ship.id, weapon: AA_WEAPON, damage: amount, position: [pos[0], pos[1], pos[2]] });
  if (v.hp <= 0)
    killVehicle(v, "aa", null, events, t.team);
}
function emitAa(t, target, aim, events) {
  events.push({
    type: "aa",
    ship: t.ship.id,
    turret: t.turret,
    kind: t.kind,
    target: target ? target.id : "",
    position: [t.position[0], t.position[1], t.position[2]],
    aim: [aim[0], aim[1], aim[2]]
  });
}
function stepFleetAA(cs, vehicles, dt, now, events) {
  if (!cs.turrets || cs.turrets.length !== AA_TURRETS.length)
    cs.turrets = createTurretStates();
  if (!cs.bursts)
    cs.bursts = [];
  const states = cs.turrets;
  const teams = fleetState().teams;
  for (let i = 0;i < AA_TURRETS.length; i++) {
    const t = AA_TURRETS[i], st = states[i];
    if (t.offset && t.team >= teams) {
      st.target = null;
      st.track = 0;
      st.pending = 0;
      continue;
    }
    const srt = t.offset ? shipRuntime(cs, t.ship.id) : null;
    const trt = srt ? srt.turrets[t.turret] : null;
    if (srt && (srt.sunk || !trt || trt.hp <= 0 || trt.manned)) {
      st.target = null;
      st.track = 0;
      st.pending = 0;
      continue;
    }
    refreshTurret(t);
    let target = st.target ? findVehicle(vehicles, st.target) : null;
    if (target && !aaEligible(t, target, now))
      target = null;
    if (now >= st.nextScanAt) {
      st.nextScanAt = now + AA_SCAN_INTERVAL;
      if (!target || !turretHasLOS(t, target.flight.position))
        target = aaScan(t, vehicles, now);
    }
    const id = target ? target.id : null;
    if (id !== st.target) {
      st.target = id;
      st.track = 0;
      st.pending = 0;
      st.accel = 0;
      st.lastVel = undefined;
    }
    if (!target)
      continue;
    const tp = target.flight.position, tv = target.flight.velocity;
    if (st.lastVel) {
      const ax = (tv[0] - st.lastVel[0]) / dt, ay = (tv[1] - st.lastVel[1]) / dt, az = (tv[2] - st.lastVel[2]) / dt;
      const sp = Math.max(0.000001, Math.sqrt(tv[0] * tv[0] + tv[1] * tv[1] + tv[2] * tv[2]));
      const along = (ax * tv[0] + ay * tv[1] + az * tv[2]) / sp;
      const lat = Math.sqrt(Math.max(0, ax * ax + ay * ay + az * az - along * along));
      st.accel = (st.accel ?? 0) + (Math.min(lat, 200) - (st.accel ?? 0)) * Math.min(1, dt / 0.3);
      st.lastVel[0] = tv[0];
      st.lastVel[1] = tv[1];
      st.lastVel[2] = tv[2];
    } else
      st.lastVel = [tv[0], tv[1], tv[2]];
    st.track += dt;
    if (st.track < AA_ACQUIRE * (isHiddenStealth(target, now) ? 2 : 1))
      continue;
    const d = dist(t.position, tp);
    const acc = aaAccuracy(t.position, tp, tv, st.accel ?? 0);
    if (t.kind === "ciws") {
      st.pending += aaDamage(target, CIWS_DPS * ciwsFactor(d) * acc, now) * dt;
      if (now >= st.nextEventAt) {
        st.nextEventAt = now + AA_EVENT_INTERVAL;
        if (leadPoint(t.position, _zero2, CIWS_TRACER_SPEED, tp, tv, _lead) < 0) {
          _lead[0] = tp[0];
          _lead[1] = tp[1];
          _lead[2] = tp[2];
        }
        emitAa(t, target, _lead, events);
        const dmg = st.pending;
        st.pending = 0;
        applyAaDamage(t, target, dmg, tp, now, events);
      }
    } else if (now >= st.readyAt) {
      st.readyAt = now + AA_GUN_RELOAD;
      const tof = leadPoint(t.position, _zero2, AA_GUN_SHELL_SPEED, tp, tv, _lead);
      if (tof < 0)
        continue;
      const seed = (i + 1) * 7919 + Math.floor(now * 60);
      const spread = AA_GUN_DISPERSION * d / Math.sqrt(acc);
      const ox = (hash01(seed, 11) * 2 - 1) * spread, oy = (hash01(seed, 12) * 2 - 1) * spread, oz = (hash01(seed, 13) * 2 - 1) * spread;
      emitAa(t, target, _lead, events);
      cs.bursts.push({ at: now + tof, position: [_lead[0] + ox, _lead[1] + oy, _lead[2] + oz], ship: t.ship.id, team: t.team });
    }
  }
  const bursts = cs.bursts;
  let w = 0;
  for (let i = 0;i < bursts.length; i++) {
    const b = bursts[i];
    if (b.at > now) {
      bursts[w++] = b;
      continue;
    }
    pushExplosion(events, b.position, AA_GUN_SPLASH * 0.5, "air", true);
    const t = AA_TURRETS.find((x) => x.ship.id === b.ship);
    if (!t)
      continue;
    for (let k = 0;k < vehicles.length; k++) {
      const v = vehicles[k];
      if (!v.alive || v.team === b.team)
        continue;
      const dd = Math.max(0, dist(b.position, v.flight.position) - VEHICLES[v.kind].radius);
      if (dd >= AA_GUN_SPLASH)
        continue;
      applyAaDamage(t, v, aaDamage(v, AA_GUN_DAMAGE * (1 - dd / AA_GUN_SPLASH), now), b.position, now, events);
    }
  }
  bursts.length = w;
}

// src/sim/bots.ts
var BOT_VISUAL_RANGE = 4500;
var BOT_PULSE_RANGE = 4000;
var HELI_LIFTOFF_ALT = 95;
var BOMBER_CRUISE_ALT = 1800;
var BOMBER_REATTACK_RANGE = 4000;
var STRIKE_LAUNCH_RANGE = 1500;
var STRIKE_BREAK_RANGE = 600;
var STRIKE_REATTACK_RANGE = 2600;
var DEFEND_FLEET_RANGE = 3000;
var STRIKE_SELF_DEFENSE = 1200;
function emptySeat(aim) {
  const seat = { aim, firePrimary: false, fireSecondary: false, flares: false, ability: false, viewDelay: 0 };
  return seat;
}
function createBotBrain(seed, skill) {
  const flightAim = [0, 0, -1], pilotAim = [0, 0, -1], gunnerAim = [0, 0, -1];
  const flight = { aim: flightAim, throttle: 0, roll: 0, yaw: 0, pitch: 0, boost: false, brake: false };
  const pilotSeat = emptySeat(pilotAim), gunnerSeat = emptySeat(gunnerAim);
  const brain = {
    memory: {},
    state: {
      rng: seed ^ 2654435769 | 0,
      skill: 0.5,
      vehicleId: null,
      phase: "takeoff",
      runwayDir: [0, -1],
      spawnPos: [0, 0, 0],
      targetId: null,
      retargetAt: 0,
      waypoint: [0, 1000, 0],
      waypointUntil: 0,
      jitterYaw: 0,
      jitterPitch: 0,
      jitterUntil: 0,
      threatId: -1,
      threatSeenAt: 0,
      breakSign: 1,
      extendUntil: 0,
      lastMissileAt: -1e9,
      guideTargetId: null,
      guideUntil: 0,
      engagedSince: -1,
      threatDelay: 1,
      burstUntil: 0,
      burstPauseUntil: 0,
      lastHp: -1,
      evadeUntil: 0,
      evadeCooldownUntil: 0,
      gunAimSet: false,
      steer: [0, 0, -1],
      steerAt: -1,
      role: "fighter",
      defender: false,
      strikeShip: null,
      strikePhase: "approach",
      strikeUntil: 0
    },
    out: {
      flight,
      pilotSeat,
      gunnerSeat,
      flightAim,
      pilotAim,
      gunnerAim,
      pilot: { flight, seat: pilotSeat },
      gunner: { seat: gunnerSeat }
    }
  };
  brain.state.skill = clamp4(skill ?? 0.35 + botRandom(brain) * 0.3, 0, 1);
  return brain;
}
function jitterAmp(skill) {
  return 0.11 - 0.1 * skill;
}
function reactionMin(skill) {
  return 1 - 0.8 * skill;
}
function missileInterval(skill) {
  return 11 - 6 * skill;
}
function gunRange(skill, w) {
  return Math.min(effectiveRange(w), 600 + 500 * skill);
}
function leadFactor(skill) {
  return 0.5 + 0.5 * skill;
}
function steerRate(skill) {
  return 0.8 + 1.2 * skill;
}
function steerLag(skill) {
  return 0.6 - 0.45 * skill;
}
function crewMissileAt(v) {
  return v.botMissileAt ?? -1e9;
}
var MAX_BOTS_PER_TARGET = 2;
var CLAIM_TTL = 1.5;
function botRandom(brain) {
  let t = brain.state.rng = brain.state.rng + 1831565813 | 0;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
var KIND_WEIGHT = { fighter: 3, apache: 2, warthog: 2, blackbird: 1.2, bomber: 0.9, "astra-interceptor": 0, "astra-trainer": 0 };
var KINDS = Object.keys(KIND_WEIGHT);
function chooseBotVehicle(bot, teammates, vehicles, rng) {
  const counts = { fighter: 0, apache: 0, warthog: 0, blackbird: 0, bomber: 0, "astra-interceptor": 0, "astra-trainer": 0 };
  for (const v of vehicles)
    if (v.alive && v.team === bot.team)
      counts[v.kind]++;
  let total = 0;
  for (const k of KINDS)
    total += kindWeight(k, counts);
  let r = clamp4(rng(), 0, 0.999999) * total;
  for (const k of KINDS) {
    r -= kindWeight(k, counts);
    if (r < 0)
      return k;
  }
  return KINDS[0];
}
function kindWeight(k, counts) {
  return KIND_WEIGHT[k] / (1 + counts[k] * 1.5) * ((k === "blackbird" || k === "bomber") && counts[k] >= 2 ? 0.1 : 1);
}
function clamp4(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function set3(o, x, y, z) {
  o[0] = x;
  o[1] = y;
  o[2] = z;
  return o;
}
function copy3(o, v) {
  o[0] = v[0];
  o[1] = v[1];
  o[2] = v[2];
  return o;
}
function norm(v) {
  const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (!(l > 0.000000001) || !Number.isFinite(l))
    return set3(v, 0, 0, -1);
  v[0] /= l;
  v[1] /= l;
  v[2] /= l;
  return v;
}
function dist2(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function speedOf(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
function angleTo(u, from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const l = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (l < 0.000001)
    return 0;
  return Math.acos(clamp4((u[0] * dx + u[1] * dy + u[2] * dz) / l, -1, 1));
}
function angleBetween(a, b) {
  const la = speedOf(a), lb = speedOf(b);
  if (la < 0.000000001 || lb < 0.000000001)
    return Math.PI;
  return Math.acos(clamp4((a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb), -1, 1));
}
function noseInto(q, out) {
  const [x, y, z, w] = q;
  return set3(out, -(2 * (x * z + w * y)), -(2 * (y * z - w * x)), -(1 - 2 * (x * x + y * y)));
}
function headingPitch(hx, hz, pitch, out) {
  let h = Math.sqrt(hx * hx + hz * hz);
  if (h < 0.000001) {
    hx = 0;
    hz = -1;
    h = 1;
  }
  const c = Math.cos(pitch);
  return set3(out, hx / h * c, Math.sin(pitch), hz / h * c);
}
function pitchOf(v) {
  return Math.atan2(v[1], Math.sqrt(v[0] * v[0] + v[2] * v[2]));
}
function setPitch(v, pitch) {
  return headingPitch(v[0], v[2], pitch, v);
}
function interceptTime(dx, dy, dz, vx, vy, vz, speed) {
  const a = vx * vx + vy * vy + vz * vz - speed * speed;
  const b = 2 * (dx * vx + dy * vy + dz * vz);
  const c = dx * dx + dy * dy + dz * dz;
  const straight = Math.sqrt(c) / Math.max(speed, 1);
  let t;
  if (Math.abs(a) < 0.000001)
    t = b < 0 ? -c / b : straight;
  else {
    const disc = b * b - 4 * a * c;
    if (disc < 0)
      return straight;
    const s = Math.sqrt(disc);
    const t1 = (-b - s) / (2 * a), t2 = (-b + s) / (2 * a);
    t = t1 > 0 && t2 > 0 ? Math.min(t1, t2) : t1 > 0 ? t1 : t2 > 0 ? t2 : straight;
  }
  return Math.min(t, 20);
}
function leadDirection(shooterPos, shooterVel, targetPos, targetVel, speed, gravity, out) {
  const dx = targetPos[0] - shooterPos[0], dy = targetPos[1] - shooterPos[1], dz = targetPos[2] - shooterPos[2];
  const vx = targetVel[0] - shooterVel[0], vy = targetVel[1] - shooterVel[1], vz = targetVel[2] - shooterVel[2];
  const t = interceptTime(dx, dy, dz, vx, vy, vz, speed);
  set3(out, dx + vx * t, dy + vy * t + 0.5 * gravity * t * t, dz + vz * t);
  norm(out);
  return t;
}
function terrainMinPitch(pos, vel, ground, clearance, lookahead, fallbackDir) {
  let hx = vel[0], hz = vel[2];
  const hs = Math.sqrt(hx * hx + hz * hz);
  if (hs < 20 && fallbackDir) {
    hx = fallbackDir[0];
    hz = fallbackDir[2];
  }
  const h = Math.sqrt(hx * hx + hz * hz);
  const dx = h > 0.000001 ? hx / h : 0, dz = h > 0.000001 ? hz / h : -1;
  const speed = Math.max(hs, 40);
  const sink = Math.min(vel[1], 0);
  let need = -1.2;
  const agl = pos[1] - ground.groundHeight(pos[0], pos[2]);
  if (agl < clearance)
    need = clamp4(0.15 + (1 - agl / clearance) * 0.45, 0.15, 0.6);
  for (let i = 1;i <= 6; i++) {
    const t = lookahead * i / 6;
    const d = speed * t;
    const g = ground.groundHeight(pos[0] + dx * d, pos[2] + dz * d);
    const y = pos[1] + sink * Math.min(t, 1.5);
    const n = Math.atan2(g + clearance - y, d);
    if (n > need)
      need = n;
  }
  return clamp4(need, -1.2, 1.2);
}
function groundAhead(pos, dir, speed, ground, lookahead) {
  const h = Math.sqrt(dir[0] * dir[0] + dir[2] * dir[2]);
  const dx = h > 0.000001 ? dir[0] / h : 0, dz = h > 0.000001 ? dir[2] / h : 0;
  const reach = Math.max(speed * lookahead, 300);
  let max = ground.groundHeight(pos[0], pos[2]);
  for (let i = 1;i <= 5; i++) {
    const d = reach * i / 5;
    const g = ground.groundHeight(pos[0] + dx * d, pos[2] + dz * d);
    if (g > max)
      max = g;
  }
  return max;
}
var BOT_NO_FLY_RADIUS = AA_RANGE + 300;
var NO_FLY_BUFFER = 500;
function hostileFleetDistance(team, x, z) {
  let best = Infinity;
  const fleet = posedFleet();
  for (let i = 0;i < fleet.length; i++) {
    const sh = fleet[i];
    if (sh.team === team)
      continue;
    const dx = x - sh.position[0], dz = z - sh.position[2];
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < best)
      best = d;
  }
  return best;
}
function shipClearanceAlt(pos, dx, dz, reach, margin) {
  const h = Math.sqrt(dx * dx + dz * dz);
  if (h < 0.000001) {
    dx = 0;
    dz = 0;
  } else {
    dx /= h;
    dz /= h;
  }
  let need = -Infinity;
  const fleet = posedFleet();
  for (let i = 0;i < fleet.length; i++) {
    const sh = fleet[i];
    const sp = SHIP_SPECS[sh.kind];
    const top = sp.island.center[1] + sp.island.half[1];
    if (pos[1] > top + margin + 60)
      continue;
    const rx = sh.position[0] - pos[0], rz = sh.position[2] - pos[2];
    const along = rx * dx + rz * dz;
    const lateral = Math.abs(rx * dz - rz * dx);
    const hit = sp.halfLength + 40;
    if (along < -0.3 * hit || along > reach + hit || lateral > hit)
      continue;
    if (top + margin > need)
      need = top + margin;
  }
  return need;
}
function applyAimSafety(aim, pos, vel, world, clearance, lookahead, team, jet = true) {
  norm(aim);
  const margin = Math.min(1200, world.half * 0.15);
  const edge = Math.max(Math.abs(pos[0]), Math.abs(pos[2])) - (world.half - margin);
  if (edge > 0) {
    const cl = Math.sqrt(pos[0] * pos[0] + pos[2] * pos[2]) || 1;
    const w = clamp4(edge / margin + 0.3, 0, 1);
    headingPitch(aim[0] * (1 - w) - pos[0] / cl * w, aim[2] * (1 - w) - pos[2] / cl * w, pitchOf(aim), aim);
  }
  if (team !== null) {
    const fleet = posedFleet();
    for (let i = 0;i < fleet.length; i++) {
      const sh = fleet[i];
      if (sh.team === team)
        continue;
      const bx = pos[0] - sh.position[0], bz = pos[2] - sh.position[2];
      const r = Math.sqrt(bx * bx + bz * bz);
      const reach = BOT_NO_FLY_RADIUS + NO_FLY_BUFFER;
      if (r >= reach || r < 0.001)
        continue;
      const ox = bx / r, oz = bz / r;
      const h = Math.sqrt(aim[0] * aim[0] + aim[2] * aim[2]) || 1;
      const inward = -(aim[0] * ox + aim[2] * oz) / h;
      const w = clamp4((reach - r) / NO_FLY_BUFFER, 0, 1);
      if (r < BOT_NO_FLY_RADIUS)
        headingPitch(ox, oz, pitchOf(aim), aim);
      else if (inward > -0.3 * w) {
        const push = (Math.max(inward, 0) + 0.3 * w) * (0.5 + w);
        headingPitch(aim[0] / h + ox * push, aim[2] / h + oz * push, pitchOf(aim), aim);
      }
    }
  }
  let minPitch = terrainMinPitch(pos, vel, world, clearance, lookahead, aim);
  const reach = Math.max(Math.sqrt(vel[0] * vel[0] + vel[2] * vel[2]) * lookahead, 300);
  const shipAlt = shipClearanceAlt(pos, aim[0], aim[2], reach, 40);
  if (shipAlt > pos[1])
    minPitch = Math.max(minPitch, Math.atan2(shipAlt - pos[1], 250));
  const p0 = pitchOf(aim);
  let p = p0 < minPitch ? minPitch : p0;
  if (pos[1] > world.ceiling - 350)
    p = Math.min(p, -0.08);
  else if (pos[1] > world.ceiling - 800)
    p = Math.min(p, 0.05);
  if (p !== p0)
    setPitch(aim, p);
  if (jet)
    jetEnvelope(aim, pos, vel, world);
  return aim;
}
function jetEnvelope(aim, pos, vel, world) {
  const hs = Math.sqrt(vel[0] * vel[0] + vel[2] * vel[2]);
  if (hs < 20)
    return;
  const agl = pos[1] - Math.max(world.groundHeight(pos[0], pos[2]), 0);
  const sink = -vel[1];
  if (sink > 20 && agl < 250 + sink * 6) {
    headingPitch(vel[0], vel[2], 0.35, aim);
    return;
  }
  if (agl > 700)
    return;
  const maxOff = 0.5 + agl / 700 * 0.6;
  const vh = Math.atan2(vel[0], vel[2]), ah = Math.atan2(aim[0], aim[2]);
  let d = ah - vh;
  d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
  if (Math.abs(d) <= maxOff)
    return;
  const h = vh + Math.sign(d) * maxOff;
  headingPitch(Math.sin(h), Math.cos(h), Math.max(pitchOf(aim), 0.05), aim);
}
var _t0 = [0, 0, 0];
var _t1 = [0, 0, 0];
var _t2 = [0, 0, 0];
var _nose = [0, 0, 0];
var _lead2 = [0, 0, 0];
function canEngage(target, myTeam, now) {
  if (!target.alive || target.team === myTeam || target.flight.crashed || isSpawnProtected(target, now))
    return false;
  if (VEHICLES[target.kind].stealth && target.spottedUntil <= now)
    return false;
  const p = target.flight.position;
  return !inSafeZone(target.team, p) && hostileFleetDistance(myTeam, p[0], p[2]) > BOT_NO_FLY_RADIUS;
}
function findVehicle2(vehicles, id) {
  if (!id)
    return null;
  for (let i = 0;i < vehicles.length; i++)
    if (vehicles[i].id === id)
      return vehicles[i];
  return null;
}
function selectTarget(self2, vehicles, now, maxRange, currentId) {
  const me = self2.flight.position;
  const heli = VEHICLES[self2.kind].flight === "heli";
  let best = null;
  let bestScore = Infinity;
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (v === self2 || !canEngage(v, self2.team, now))
      continue;
    if (v.id !== currentId && claimCount(v, self2.id, now) >= MAX_BOTS_PER_TARGET)
      continue;
    const d = dist2(me, v.flight.position);
    const spotted = v.spottedUntil > now;
    if (d > maxRange || !spotted && d > BOT_VISUAL_RANGE)
      continue;
    let score = d;
    if (spotted)
      score *= 0.75;
    if (v.id === currentId)
      score *= 0.6;
    score *= 0.6 + 0.4 * (v.hp / Math.max(v.maxHp, 1));
    if (d < 1800 && angleTo(noseInto(v.flight.orientation, _t0), v.flight.position, me) < 0.45)
      score *= 0.5;
    if (heli && speedOf(v.flight.velocity) > 150)
      score *= 1.6;
    if (score < bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}
function claimCount(target, selfId, now) {
  const c = target.botClaims;
  if (!c)
    return 0;
  let n = 0;
  for (const k in c)
    if (k !== selfId && c[k] > now)
      n++;
  return n;
}
function claimTarget(target, selfId, now) {
  const t = target;
  const c = t.botClaims ?? (t.botClaims = {});
  for (const k in c)
    if (c[k] <= now)
      delete c[k];
  c[selfId] = now + CLAIM_TTL;
}
function findThreat(self2, missiles) {
  if (!missiles)
    return null;
  const me = self2.flight.position;
  let best = null;
  let bestD = Infinity;
  for (let i = 0;i < missiles.length; i++) {
    const m = missiles[i];
    if (m.team === self2.team)
      continue;
    if (m.target !== self2.id && !(m.steered && m.scanTarget === self2.id))
      continue;
    const d = dist2(me, m.position);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}
function updateJitter(brain, now) {
  const s = brain.state;
  if (now < s.jitterUntil)
    return;
  const amp = jitterAmp(s.skill);
  s.jitterYaw = (botRandom(brain) * 2 - 1) * amp;
  s.jitterPitch = (botRandom(brain) * 2 - 1) * amp;
  s.jitterUntil = now + 0.3 + botRandom(brain) * 0.5;
}
function applyJitter(brain, aim, scale = 1) {
  const s = brain.state;
  const jy = s.jitterYaw * scale;
  const c = Math.cos(jy), sn = Math.sin(jy);
  const x = aim[0] * c + aim[2] * sn, z = -aim[0] * sn + aim[2] * c;
  aim[0] = x;
  aim[2] = z;
  return setPitch(aim, clamp4(pitchOf(aim) + s.jitterPitch * scale, -1.5, 1.5));
}
var GUN_AIM_JITTER_SCALE = 0.6;
function smoothSteer(brain, desired, now, from) {
  const s = brain.state;
  const dt = s.steerAt < 0 ? 0 : clamp4(now - s.steerAt, 0, 0.25);
  if (s.steerAt < 0 || now - s.steerAt > 0.5)
    copy3(s.steer, from);
  s.steerAt = now;
  const st = s.steer;
  const ang = angleBetween(st, desired);
  if (ang < 0.000001 || dt === 0) {
    if (dt === 0)
      copy3(desired, st);
    else
      copy3(st, desired);
    return;
  }
  const step = Math.min(ang, ang * (1 - Math.exp(-dt / steerLag(s.skill))), steerRate(s.skill) * dt);
  const t = step / ang;
  set3(st, st[0] + (desired[0] - st[0]) * t, st[1] + (desired[1] - st[1]) * t, st[2] + (desired[2] - st[2]) * t);
  norm(st);
  copy3(desired, st);
}
function burstAllowed(brain, now) {
  const s = brain.state;
  if (now < s.burstUntil)
    return true;
  if (now < s.burstPauseUntil)
    return false;
  s.burstUntil = now + 0.35 + 0.4 * s.skill + botRandom(brain) * 0.3;
  s.burstPauseUntil = s.burstUntil + (1.2 - 0.9 * s.skill) + botRandom(brain) * 0.5;
  return true;
}
function weaponReady(rt, now) {
  return !!rt && (rt.ammo < 0 || rt.ammo >= 1) && rt.readyAt <= now;
}
function effectiveRange(w) {
  switch (w.kind) {
    case "gun":
      return Math.min(w.speed * w.ttl * 0.8, GUN_FULL_RANGE);
    case "rockets":
      return Math.min(w.speed * w.ttl * 0.45, 1200);
    case "missile_lock":
      return (w.range ?? 2500) * 0.95;
    case "missile_scanner":
      return (w.range ?? 8000) * 0.9;
    case "pulse":
      return BOT_PULSE_RANGE;
    case "bomb":
      return 0;
  }
}
function resetSeat(seat, aimBuf, aim) {
  seat.aim = aim ? copy3(aimBuf, aim) : null;
  seat.firePrimary = false;
  seat.fireSecondary = false;
  seat.flares = false;
  seat.ability = false;
  seat.steerBomb = false;
  return seat;
}
function resetForVehicle(brain, vehicle) {
  const s = brain.state;
  s.vehicleId = vehicle.id;
  s.phase = vehicle.flight.onGround ? "takeoff" : "transit";
  noseInto(vehicle.flight.orientation, _t0);
  if (vehicle.flight.onGround) {
    const hd = carrierOf(vehicle.team).heading;
    set3(_t0, -Math.sin(hd), 0, -Math.cos(hd));
  }
  const h = Math.sqrt(_t0[0] * _t0[0] + _t0[2] * _t0[2]);
  s.runwayDir[0] = h > 0.000001 ? _t0[0] / h : 0;
  s.runwayDir[1] = h > 0.000001 ? _t0[2] / h : -1;
  copy3(s.spawnPos, vehicle.flight.position);
  s.targetId = null;
  s.retargetAt = 0;
  s.waypointUntil = 0;
  s.threatId = -1;
  s.extendUntil = 0;
  s.guideTargetId = null;
  s.guideUntil = 0;
  s.engagedSince = -1;
  s.breakSign = botRandom(brain) < 0.5 ? -1 : 1;
  s.role = hasAntiShip(vehicle.kind, 0) && botRandom(brain) < 0.65 ? "strike" : "fighter";
  s.defender = botRandom(brain) < 0.35;
  s.strikeShip = null;
  s.strikePhase = "approach";
  s.strikeUntil = 0;
}
function hasAntiShip(kind, seat) {
  for (const id of VEHICLES[kind].seatWeapons[seat]) {
    const k = id ? WEAPONS[id].kind : null;
    if (k === "rockets" || k === "missile_lock")
      return true;
  }
  return false;
}
function pickStrikeShip(team, pos, ships, preferEscort) {
  const fleet = posedFleet();
  let best = null;
  let bestScore = Infinity;
  for (let i = 0;i < fleet.length; i++) {
    const sh = fleet[i];
    if (sh.team === team || ships?.[sh.id]?.sunk)
      continue;
    let score = Math.hypot(sh.position[0] - pos[0], sh.position[2] - pos[2]);
    if (sh.kind === "carrier" === preferEscort)
      score *= 1.6;
    if (score < bestScore) {
      bestScore = score;
      best = sh;
    }
  }
  return best;
}
function fleetThreatened(team, target) {
  const fleet = posedFleet();
  const p = target.flight.position;
  for (let i = 0;i < fleet.length; i++) {
    const sh = fleet[i];
    if (sh.team === team && Math.hypot(sh.position[0] - p[0], sh.position[2] - p[2]) < DEFEND_FLEET_RANGE)
      return true;
  }
  return false;
}
function strike(brain, vehicle, ship, now, aim, heli) {
  const s = brain.state;
  const o = brain.out;
  const { flight, pilotSeat: seat } = o;
  const fs = vehicle.flight;
  const pos = fs.position;
  const sp = SHIP_SPECS[ship.kind];
  const tx = ship.position[0] - pos[0], tz = ship.position[2] - pos[2], ty = sp.deckHeight * 0.6 - pos[1];
  const hd = Math.sqrt(tx * tx + tz * tz);
  if (s.strikePhase === "egress") {
    if (hd > STRIKE_REATTACK_RANGE && now >= s.strikeUntil)
      s.strikePhase = "approach";
    else {
      const c = Math.cos(0.5 * s.breakSign), sn = Math.sin(0.5 * s.breakSign);
      headingPitch((-tx * c - tz * sn) / hd, (tx * sn - tz * c) / hd, heli ? -0.2 : 0.12, aim);
      flight.boost = !heli;
      return 1;
    }
  }
  if (hd < STRIKE_BREAK_RANGE) {
    s.strikePhase = "egress";
    s.strikeUntil = now + 6;
    s.breakSign = botRandom(brain) < 0.5 ? -1 : 1;
    headingPitch(-tx, -tz, 0.1, aim);
    return 1;
  }
  const cruiseAlt = heli ? 120 : 380;
  if (hd > STRIKE_LAUNCH_RANGE + 600) {
    headingPitch(tx, tz, clamp4(Math.atan2(cruiseAlt - pos[1], 1500), -0.3, 0.3), aim);
    flight.boost = !heli && hd > 4000;
    return heli ? 0.9 : 1;
  }
  norm(set3(aim, tx, ty, tz));
  const nose = noseInto(fs.orientation, _nose);
  const spec = VEHICLES[vehicle.kind];
  let fired = false;
  for (let slot = 0;slot < 2; slot++) {
    const id = spec.seatWeapons[0][slot];
    if (!id)
      continue;
    const w = WEAPONS[id];
    const rt = vehicle.weapons[0][slot];
    if (!weaponReady(rt, now))
      continue;
    if (w.kind === "missile_lock" && rt.lock >= 1 && rt.lockTarget?.startsWith("ship:") && now - crewMissileAt(vehicle) > 1.5)
      fired = true;
    else if (w.kind === "rockets" && hd < 1100 && angleBetween(nose, aim) < 0.06)
      fired = true;
    else
      continue;
    if (slot === 0)
      seat.firePrimary = true;
    else
      seat.fireSecondary = true;
    s.lastMissileAt = now;
    vehicle.botMissileAt = now;
  }
  if (fired && hd < STRIKE_LAUNCH_RANGE - 200 && botRandom(brain) < 0.05) {
    s.strikePhase = "egress";
    s.strikeUntil = now + 6;
  }
  return heli ? 0.8 : 0.55;
}
var _bomb = [0, 0, 0];
function bomberRun(brain, vehicle, ship, now, aim, world) {
  const s = brain.state;
  const fs = vehicle.flight, { position: pos, velocity: vel } = fs;
  const altPitch = clamp4(Math.atan2(BOMBER_CRUISE_ALT - pos[1], 1500), -0.25, 0.3);
  const tx = ship.position[0] - pos[0], tz = ship.position[2] - pos[2];
  const hd = Math.hypot(tx, tz);
  if (s.strikePhase === "egress") {
    if (hd > BOMBER_REATTACK_RANGE)
      s.strikePhase = "approach";
    else {
      headingPitch(vel[0] - tz * 0.15 * s.breakSign, vel[2] + tx * 0.15 * s.breakSign, altPitch, aim);
      return 0.9;
    }
  }
  const fall = bombImpactPoint(pos, vel, _bomb, world);
  const throwX = fall > 0 ? _bomb[0] - pos[0] : 0, throwZ = fall > 0 ? _bomb[2] - pos[2] : 0;
  const ax = tx - throwX, az = tz - throwZ;
  headingPitch(ax, az, altPitch, aim);
  if (Math.hypot(ax, az) < 250 && ax * vel[0] + az * vel[2] < 0) {
    s.strikePhase = "egress";
    s.breakSign = botRandom(brain) < 0.5 ? -1 : 1;
  }
  return 0.9;
}
function botInput(brain, bot, vehicle, vehicles, now, missiles, world = worldQuery, ships, projectiles) {
  const o = brain.out;
  if (!vehicle.alive || vehicle.flight.crashed || bot.seat !== 0 && bot.seat !== 1) {
    const f = o.flight;
    f.aim = null;
    f.throttle = 0;
    f.roll = 0;
    f.yaw = 0;
    f.pitch = 0;
    f.boost = false;
    f.brake = false;
    resetSeat(o.pilotSeat, o.pilotAim, null);
    resetSeat(o.gunnerSeat, o.gunnerAim, null);
    return bot.seat === 0 ? o.pilot : o.gunner;
  }
  if (brain.state.vehicleId !== vehicle.id)
    resetForVehicle(brain, vehicle);
  updateJitter(brain, now);
  if (bot.seat === 0) {
    const out = pilotInput(brain, bot, vehicle, vehicles, now, missiles, world, ships);
    if (!vehicle.seats[1])
      steerOwnBomb(bot, out.seat, o.pilotAim, projectiles, ships);
    return out;
  }
  gunnerInput(brain, bot, vehicle, vehicles, now, missiles, ships);
  steerOwnBomb(bot, o.gunnerSeat, o.gunnerAim, projectiles, ships);
  return o.gunner;
}
function pickWaypoint(brain, now, heli, half) {
  const s = brain.state;
  const ang = botRandom(brain) * Math.PI * 2;
  const r = botRandom(brain) * half * (heli ? 0.3 : 0.45);
  set3(s.waypoint, Math.cos(ang) * r, heli ? 180 : 900 + botRandom(brain) * 700, Math.sin(ang) * r);
  s.waypointUntil = now + 20 + botRandom(brain) * 20;
}
function pilotInput(brain, bot, vehicle, vehicles, now, missiles, world, ships) {
  const s = brain.state;
  const o = brain.out;
  const spec = VEHICLES[vehicle.kind];
  const heli = spec.flight === "heli";
  const fs = vehicle.flight;
  const { position: pos, velocity: vel } = fs;
  const nose = noseInto(fs.orientation, _nose);
  const speed = speedOf(vel);
  const ground = world.groundHeight(pos[0], pos[2]);
  const agl = pos[1] - ground;
  const flight = o.flight;
  flight.roll = 0;
  flight.yaw = 0;
  flight.pitch = 0;
  flight.boost = false;
  flight.brake = false;
  const seat = resetSeat(o.pilotSeat, o.pilotAim, null);
  s.gunAimSet = false;
  const aim = copy3(o.flightAim, nose);
  let desiredThrottle = 0.85;
  let heliAlt = pos[1];
  let clearance = heli ? 45 : 150;
  const lookahead = heli ? 4 : 7;
  let lookTarget = null;
  if (fs.onGround && s.phase !== "takeoff") {
    s.phase = "takeoff";
    copy3(s.spawnPos, pos);
  }
  if (s.phase === "takeoff" && !fs.onGround) {
    const fromSpawn = Math.hypot(pos[0] - s.spawnPos[0], pos[2] - s.spawnPos[2]);
    if (heli ? pos[1] > HELI_LIFTOFF_ALT : fromSpawn > LAUNCH_LANE_LENGTH * 0.5 && agl > 150 || fromSpawn > LAUNCH_LANE_LENGTH)
      s.phase = "transit";
  }
  if (s.phase === "takeoff") {
    const rd = s.runwayDir;
    if (heli) {
      headingPitch(rd[0], rd[1], 0, aim);
      heliAlt = HELI_LIFTOFF_ALT + 15;
      flight.brake = true;
    } else {
      const pitch = fs.onGround ? 0 : speed > spec.stall * 1.6 ? 0.15 : 0.07;
      headingPitch(rd[0], rd[1], pitch, aim);
      desiredThrottle = 1;
      flight.boost = fs.onGround || speed < spec.stall * 1.5;
      clearance = 25;
      if (!fs.onGround)
        applyAimSafety(aim, pos, vel, world, clearance, lookahead, null);
    }
    s.engagedSince = -1;
    return finishPilot(brain, vehicle, aim, heli, desiredThrottle, heliAlt, ground, world, null);
  }
  const threat = findThreat(vehicle, missiles);
  if (threat) {
    if (s.threatId !== threat.id) {
      s.threatId = threat.id;
      s.threatSeenAt = now;
      s.breakSign = botRandom(brain) < 0.5 ? -1 : 1;
      s.threatDelay = reactionMin(s.skill) + botRandom(brain) * 0.6;
    }
  } else
    s.threatId = -1;
  const defending = threat !== null && now >= s.threatSeenAt + s.threatDelay;
  const pressing = s.phase === "strike" && s.strikePhase === "approach";
  if (!pressing && s.lastHp >= 0 && vehicle.hp < s.lastHp - 0.5 && now >= s.evadeCooldownUntil && botRandom(brain) < 1 - 0.5 * s.skill) {
    s.evadeUntil = now + 2 + botRandom(brain) * 2;
    s.evadeCooldownUntil = s.evadeUntil + 4;
    s.breakSign = botRandom(brain) < 0.5 ? -1 : 1;
  }
  s.lastHp = vehicle.hp;
  const evading = now < s.evadeUntil;
  let target = findVehicle2(vehicles, s.targetId);
  if (now >= s.retargetAt || target && !canEngage(target, vehicle.team, now)) {
    const maxRange = vehicle.kind === "blackbird" ? 12000 : heli ? 5000 : 9000;
    target = selectTarget(vehicle, vehicles, now, maxRange, s.targetId);
    s.targetId = target ? target.id : null;
    s.retargetAt = now + 0.6 + (1 - s.skill) * 1.5 + botRandom(brain) * 0.4;
  }
  if (target && !canEngage(target, vehicle.team, now))
    target = null;
  if (target)
    claimTarget(target, vehicle.id, now);
  const inOwnSafe = inSafeZone(vehicle.team, pos);
  let striking = null;
  if (s.role === "strike" && !defending && !evading && !(target && (dist2(pos, target.flight.position) < STRIKE_SELF_DEFENSE || s.defender && fleetThreatened(vehicle.team, target)))) {
    const cur = s.strikeShip ? posedFleet().find((sh) => sh.id === s.strikeShip) ?? null : null;
    striking = cur && !ships?.[cur.id]?.sunk ? cur : pickStrikeShip(vehicle.team, pos, ships, botRandom(brain) < 0.3);
    s.strikeShip = striking ? striking.id : null;
  }
  if (vehicle.kind === "bomber" && !defending) {
    s.phase = "strike";
    const ship = pickStrikeShip(vehicle.team, pos, ships, false);
    if (ship)
      desiredThrottle = bomberRun(brain, vehicle, ship, now, aim, world);
    else
      headingPitch(-pos[0], -pos[2], 0, aim);
    const pilotBomb = spec.seatWeapons[0][0];
    if (!vehicle.seats[1] && pilotBomb && WEAPONS[pilotBomb].kind === "bomb")
      bombardier(vehicle, seat, null, ships, now, 0);
    flight.boost = false;
    lookTarget = null;
  } else if (striking) {
    s.phase = "strike";
    desiredThrottle = strike(brain, vehicle, striking, now, aim, heli);
    if (heli)
      heliAlt = ground + (s.strikePhase === "egress" ? 150 : 110);
    lookTarget = null;
  } else if (defending && threat) {
    s.phase = "defend";
    const lx = pos[0] - threat.position[0], lz = pos[2] - threat.position[2];
    headingPitch(-lz * s.breakSign, lx * s.breakSign, agl > 600 ? -0.2 : 0.1, aim);
    desiredThrottle = 1;
    flight.boost = true;
    const md = dist2(pos, threat.position);
    const flareAt = threat.steered ? SCANNER_FLARE_CLOSE : 1000 + 1500 * s.skill;
    if (md < flareAt && vehicle.flareCount > 0 && vehicle.flaresReadyAt <= now)
      seat.flares = true;
    heliAlt = Math.max(ground + 40, pos[1] - 30);
    lookTarget = target;
  } else if (evading) {
    s.phase = "defend";
    const hx = vel[0], hz = vel[2];
    headingPitch(hx * 0.3 - hz * s.breakSign, hz * 0.3 + hx * s.breakSign, agl > 700 ? -0.15 : 0.2, aim);
    desiredThrottle = 1;
    flight.boost = true;
    heliAlt = Math.max(ground + 50, pos[1] - 20);
    lookTarget = target;
  } else if (target) {
    if (s.phase !== "engage")
      s.engagedSince = now;
    s.phase = "engage";
    desiredThrottle = engage(brain, vehicle, target, now, aim, inOwnSafe);
    if (heli)
      heliAlt = clamp4(target.flight.position[1], ground + 60, ground + 600);
    lookTarget = target;
  } else {
    s.phase = "transit";
    if (now >= s.waypointUntil || Math.hypot(pos[0] - s.waypoint[0], pos[2] - s.waypoint[2]) < (heli ? 400 : 1000))
      pickWaypoint(brain, now, heli, world.half);
    const wp = s.waypoint;
    const dx = wp[0] - pos[0], dz = wp[2] - pos[2];
    const hd = Math.sqrt(dx * dx + dz * dz);
    if (heli) {
      heliAlt = ground + wp[1];
      headingPitch(dx, dz, hd > 300 ? -0.3 : 0, aim);
      flight.boost = hd > 3000;
    } else {
      const alt = Math.max(wp[1], ground + 450);
      headingPitch(dx, dz, clamp4(Math.atan2(alt - pos[1], 2000), -0.3, 0.35), aim);
      flight.boost = hd > 5000 && speed < spec.cruise * 1.2;
    }
  }
  if (s.phase !== "engage")
    s.engagedSince = -1;
  if ((s.phase === "engage" || s.phase === "strike") && vehicle.kind !== "blackbird")
    applyJitter(brain, aim, s.phase === "strike" ? 0.4 : 1);
  const runIn = s.phase === "strike" && (s.strikePhase === "approach" || vehicle.kind === "bomber");
  applyAimSafety(aim, pos, vel, world, runIn ? Math.min(clearance, 60) : clearance, lookahead, runIn ? null : bot.team, !heli);
  if (!heli && speed < spec.stall * 1.3) {
    desiredThrottle = 1;
    flight.boost = true;
  }
  return finishPilot(brain, vehicle, aim, heli, desiredThrottle, heliAlt, ground, world, lookTarget);
}
function finishPilot(brain, vehicle, aim, heli, desiredThrottle, heliAlt, ground, world, lookTarget) {
  const o = brain.out;
  const { flight, pilotSeat: seat } = o, fs = vehicle.flight, vel = fs.velocity;
  norm(aim);
  if (heli) {
    const hs = Math.hypot(vel[0], vel[2]);
    const floor = Math.max(groundAhead(fs.position, aim, hs, world, 4) + 45, shipClearanceAlt(fs.position, aim[0], aim[2], Math.max(hs * 5, 300), 30));
    const alt = clamp4(Math.max(heliAlt, floor), ground + 10, world.ceiling - 300);
    const err = alt - fs.position[1];
    flight.throttle = Math.abs(err) < 6 && Math.abs(vel[1]) < 1.5 ? 0 : clamp4(err * 0.03 - vel[1] * 0.2, -1, 1);
  } else {
    flight.throttle = clamp4((desiredThrottle - fs.throttle) * 4, -1, 1);
  }
  if (!Number.isFinite(flight.throttle))
    flight.throttle = 0;
  flight.aim = aim;
  if (brain.state.gunAimSet)
    seat.aim = o.pilotAim;
  else if (lookTarget) {
    const tp = lookTarget.flight.position, p = fs.position;
    seat.aim = norm(set3(o.pilotAim, tp[0] - p[0], tp[1] - p[1], tp[2] - p[2]));
  } else
    seat.aim = copy3(o.pilotAim, aim);
  return o.pilot;
}
function engage(brain, vehicle, target, now, aim, inOwnSafe) {
  const s = brain.state;
  const o = brain.out;
  const { flight, pilotSeat: seat } = o;
  const spec = VEHICLES[vehicle.kind];
  const heli = spec.flight === "heli";
  const fs = vehicle.flight;
  const { position: pos, velocity: vel } = fs;
  const tp = target.flight.position, tv = target.flight.velocity;
  const nose = _nose;
  const d = dist2(pos, tp);
  const tx = tp[0] - pos[0], ty = tp[1] - pos[1], tz = tp[2] - pos[2];
  const closing = -((tv[0] - vel[0]) * tx + (tv[1] - vel[1]) * ty + (tv[2] - vel[2]) * tz) / Math.max(d, 1);
  let throttle = 0.85;
  const pId = spec.seatWeapons[0][0], sId = spec.seatWeapons[0][1];
  const primary = pId ? WEAPONS[pId] : null;
  const steerW = primary && (primary.kind === "gun" || primary.kind === "rockets") ? primary : null;
  const lead = _lead2;
  if (steerW && d < 2500) {
    leadDirection(pos, vel, tp, tv, steerW.speed, steerW.kind === "rockets" ? ROCKET_GRAVITY : 0, lead);
    const f = leadFactor(s.skill);
    norm(set3(lead, tx / d * (1 - f) + lead[0] * f, ty / d * (1 - f) + lead[1] * f, tz / d * (1 - f) + lead[2] * f));
  } else
    norm(set3(lead, tx, ty, tz));
  smoothSteer(brain, lead, now, nose);
  if (vehicle.kind === "blackbird") {
    const hd = Math.sqrt(tx * tx + tz * tz);
    if (now < s.extendUntil || d < 2200) {
      if (now >= s.extendUntil)
        s.extendUntil = now + 6 + botRandom(brain) * 3;
      headingPitch(-tx, -tz, 0.05, aim);
      flight.boost = true;
      throttle = 1;
    } else if (d > 6500) {
      copy3(aim, lead);
      throttle = 1;
      flight.boost = d > 9000;
    } else {
      const c = Math.cos(0.7 * s.breakSign), sn = Math.sin(0.7 * s.breakSign);
      headingPitch((tx * c + tz * sn) / hd, (-tx * sn + tz * c) / hd, clamp4(Math.atan2(ty, hd), -0.25, 0.25), aim);
      throttle = 0.9;
    }
    return throttle;
  }
  if (heli) {
    const hd = Math.sqrt(tx * tx + tz * tz);
    if (hd > 1400) {
      headingPitch(tx, tz, -0.3, aim);
      flight.boost = hd > 3000;
    } else if (hd < 550) {
      headingPitch(-tz * s.breakSign - tx, tx * s.breakSign - tz, -0.3, aim);
    } else {
      copy3(aim, lead);
      setPitch(aim, clamp4(pitchOf(aim), -0.35, 0.3));
    }
    throttle = 0.8;
  } else {
    copy3(aim, lead);
    if (d < 200 && closing > 0)
      headingPitch(-tz * s.breakSign, tx * s.breakSign, 0.4, aim);
    if (d > 3000) {
      throttle = 1;
      flight.boost = true;
    } else if (d > 1200)
      throttle = 1;
    else if (d < 600 && closing > 40) {
      throttle = 0.35;
      flight.brake = closing > 80;
    } else
      throttle = 0.8;
  }
  if (steerW && d <= gunRange(s.skill, steerW)) {
    leadDirection(pos, vel, tp, tv, steerW.speed, steerW.kind === "rockets" ? ROCKET_GRAVITY : 0, o.pilotAim);
    applyJitter(brain, o.pilotAim, GUN_AIM_JITTER_SCALE);
    s.gunAimSet = true;
  }
  if (inOwnSafe)
    return throttle;
  for (let slot = 0;slot < 2; slot++) {
    const id = slot === 0 ? pId : sId;
    if (!id)
      continue;
    const w = WEAPONS[id];
    const rt = vehicle.weapons[0][slot];
    if (!weaponReady(rt, now))
      continue;
    if (w.kind === "gun" || w.kind === "rockets") {
      if (d > gunRange(s.skill, w) || !s.gunAimSet)
        continue;
      leadDirection(pos, vel, tp, tv, w.speed, w.kind === "rockets" ? ROCKET_GRAVITY : 0, _t1);
      const tol = Math.atan2(VEHICLES[target.kind].radius * (1.4 + 0.6 * s.skill), d);
      if (angleBetween(nose, _t1) < GUN_GIMBAL * 0.95 && angleBetween(o.pilotAim, _t1) < tol && burstAllowed(brain, now)) {
        if (slot === 0)
          seat.firePrimary = true;
        else
          seat.fireSecondary = true;
      }
    } else if (w.kind === "missile_lock") {
      if (rt.lock < 1 || !rt.lockTarget || now - crewMissileAt(vehicle) < missileInterval(s.skill))
        continue;
      if (slot === 0)
        seat.firePrimary = true;
      else
        seat.fireSecondary = true;
      s.lastMissileAt = now;
      vehicle.botMissileAt = now;
    }
  }
  return throttle;
}
function bombardier(vehicle, seat, aim, ships, now, crewSeat = 1) {
  const fs = vehicle.flight, pos = fs.position;
  if (bombImpactPoint(pos, fs.velocity, _bomb, worldQuery) < 0)
    return;
  if (aim)
    norm(set3(aim, _bomb[0] - pos[0], _bomb[1] - pos[1], _bomb[2] - pos[2]));
  if (!weaponReady(vehicle.weapons[crewSeat][0], now))
    return;
  const fleet = posedFleet();
  for (let i = 0;i < fleet.length; i++) {
    const sh = fleet[i];
    if (sh.team === vehicle.team || ships?.[sh.id]?.sunk)
      continue;
    const sp = SHIP_SPECS[sh.kind];
    const dx = _bomb[0] - sh.position[0], dz = _bomb[2] - sh.position[2];
    const c = Math.cos(sh.heading), sn = Math.sin(sh.heading);
    const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
    if (Math.abs(lx) <= sp.halfWidth * 0.9 && Math.abs(lz) <= sp.halfLength * 0.9) {
      seat.firePrimary = true;
      return;
    }
  }
}
function steerOwnBomb(bot, seat, aimBuf, projectiles, ships) {
  if (!projectiles)
    return;
  let bomb = null;
  for (let i = 0;i < projectiles.length; i++) {
    const p = projectiles[i];
    if (p.weapon === "bomb" && p.owner === bot.id && (!bomb || p.id > bomb.id))
      bomb = p;
  }
  if (!bomb)
    return;
  const bp = bomb.position;
  if (bombImpactPoint(bp, bomb.velocity, _bomb, worldQuery) < 0)
    return;
  const ship = pickStrikeShip(bot.team, _bomb, ships, false);
  if (!ship || Math.hypot(ship.position[0] - _bomb[0], ship.position[2] - _bomb[2]) > 600)
    return;
  norm(set3(aimBuf, ship.position[0] - bp[0], SHIP_SPECS[ship.kind].deckHeight - bp[1], ship.position[2] - bp[2]));
  seat.aim = aimBuf;
  seat.steerBomb = true;
}
function myScannerMissile(bot, vehicle, missiles) {
  for (let i = 0;i < missiles.length; i++) {
    const m = missiles[i];
    if (m.steered && m.vehicle === vehicle.id && m.owner === bot.id && m.scanTarget)
      return m;
  }
  return null;
}
function gunnerInput(brain, bot, vehicle, vehicles, now, missiles, ships) {
  const s = brain.state;
  const o = brain.out;
  const spec = VEHICLES[vehicle.kind];
  const fs = vehicle.flight;
  const { position: pos, velocity: vel } = fs;
  const nose = noseInto(fs.orientation, _nose);
  const seat = resetSeat(o.gunnerSeat, o.gunnerAim, nose);
  const aim = o.gunnerAim;
  const ids = spec.seatWeapons[1];
  const inOwnSafe = inSafeZone(vehicle.team, pos);
  if (ids[0] && WEAPONS[ids[0]].kind === "bomb") {
    bombardier(vehicle, seat, aim, ships, now);
    return;
  }
  let hasPulse = false;
  let maxRange = 0;
  for (let slot = 0;slot < 2; slot++) {
    const id = ids[slot];
    if (!id)
      continue;
    if (WEAPONS[id].kind === "pulse")
      hasPulse = true;
    maxRange = Math.max(maxRange, effectiveRange(WEAPONS[id]));
  }
  if (hasPulse && vehicle.abilityReadyAt <= now) {
    for (let i = 0;i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.alive && v.team !== vehicle.team && v.spottedUntil <= now && dist2(pos, v.flight.position) < BOT_PULSE_RANGE) {
        seat.ability = true;
        break;
      }
    }
  }
  let scanning = null;
  if (missiles) {
    const m = myScannerMissile(bot, vehicle, missiles);
    if (m) {
      s.guideTargetId = m.scanTarget ?? null;
      s.guideUntil = now + 0.5;
    } else if (now - s.lastMissileAt > 0.5)
      s.guideUntil = Math.min(s.guideUntil, now);
  }
  if (now < s.guideUntil) {
    scanning = findVehicle2(vehicles, s.guideTargetId);
    if (scanning && !scanning.alive)
      scanning = null;
  }
  if (scanning) {
    const tp = scanning.flight.position;
    applyJitter(brain, norm(set3(aim, tp[0] - pos[0], tp[1] - pos[1], tp[2] - pos[2])));
    return;
  }
  let target = findVehicle2(vehicles, s.targetId);
  if (now >= s.retargetAt || target && !canEngage(target, vehicle.team, now)) {
    target = selectTarget(vehicle, vehicles, now, maxRange, s.targetId);
    s.targetId = target ? target.id : null;
    s.retargetAt = now + 0.6 + (1 - s.skill) * 1.5 + botRandom(brain) * 0.4;
  }
  if (!target || !canEngage(target, vehicle.team, now)) {
    if (!hasAntiShip(vehicle.kind, 1))
      return;
    const ship = pickStrikeShip(vehicle.team, pos, ships, false);
    if (!ship)
      return;
    const sx = ship.position[0] - pos[0], sz = ship.position[2] - pos[2];
    if (Math.hypot(sx, sz) > STRIKE_LAUNCH_RANGE + 300)
      return;
    norm(set3(aim, sx, SHIP_SPECS[ship.kind].deckHeight * 0.6 - pos[1], sz));
    smoothSteer(brain, aim, now, nose);
    for (let slot = 0;slot < 2; slot++) {
      const id = ids[slot];
      const rt = vehicle.weapons[1][slot];
      if (!id || WEAPONS[id].kind !== "missile_lock" || inOwnSafe)
        continue;
      if (weaponReady(rt, now) && rt.lock >= 1 && rt.lockTarget?.startsWith("ship:") && angleTo(nose, pos, ship.position) < 1.1 && now - crewMissileAt(vehicle) > 1.5) {
        if (slot === 0)
          seat.firePrimary = true;
        else
          seat.fireSecondary = true;
        s.lastMissileAt = now;
        vehicle.botMissileAt = now;
      }
    }
    return;
  }
  claimTarget(target, vehicle.id, now);
  const tp = target.flight.position, tv = target.flight.velocity;
  const d = dist2(pos, tp);
  const canFire = !inOwnSafe;
  const noseAngle = angleTo(nose, pos, tp);
  let aimed = false;
  for (let slot = 0;slot < 2; slot++) {
    const id = ids[slot];
    if (!id)
      continue;
    const w = WEAPONS[id];
    const rt = vehicle.weapons[1][slot];
    const range = effectiveRange(w);
    if (w.kind === "gun" && d <= gunRange(s.skill, w) && !aimed) {
      leadDirection(pos, vel, tp, tv, w.speed, 0, aim);
      smoothSteer(brain, aim, now, nose);
      applyJitter(brain, aim);
      aimed = true;
      leadDirection(pos, vel, tp, tv, w.speed, 0, _t1);
      weaponDirection(vehicle, id, aim, _t2);
      const tol = Math.atan2(VEHICLES[target.kind].radius * (0.8 + 0.4 * s.skill), d);
      if (canFire && weaponReady(rt, now) && angleBetween(_t2, _t1) < tol && burstAllowed(brain, now)) {
        if (slot === 0)
          seat.firePrimary = true;
        else
          seat.fireSecondary = true;
      }
    } else if ((w.kind === "missile_lock" || w.kind === "missile_scanner") && d <= range && d > 300) {
      if (!aimed) {
        norm(set3(aim, tp[0] - pos[0], tp[1] - pos[1], tp[2] - pos[2]));
        smoothSteer(brain, aim, now, nose);
        applyJitter(brain, aim);
        aimed = true;
      }
      if (canFire && weaponReady(rt, now) && rt.lock >= 1 && rt.lockTarget === target.id && noseAngle < (w.kind === "missile_scanner" ? 0.9 : 1.1) && now - crewMissileAt(vehicle) > missileInterval(s.skill)) {
        if (slot === 0)
          seat.firePrimary = true;
        else
          seat.fireSecondary = true;
        s.lastMissileAt = now;
        vehicle.botMissileAt = now;
        if (w.kind === "missile_scanner") {
          s.guideTargetId = target.id;
          s.guideUntil = now + Math.min(w.ttl, d / w.speed * 2 + 2);
        }
      }
    }
  }
  if (!aimed) {
    norm(set3(aim, tp[0] - pos[0], tp[1] - pos[1], tp[2] - pos[2]));
    smoothSteer(brain, aim, now, nose);
    applyJitter(brain, aim);
  }
  if (!hasPulse && vehicle.abilityReadyAt <= now && target.spottedUntil <= now && d < 4000 && angleTo(aim, pos, tp) < 0.06)
    seat.ability = true;
}

// src/sim/room-engine.ts
var MAX_CATCH_UP = 0.25;
var TICKS_PER_SNAPSHOT = Math.round(TICK_RATE / SNAPSHOT_RATE);
var WRECK_LINGER = 3;
var ABANDONED_DESTROY_DELAY = 20;
var PARKED_REMOVE_DELAY = 60;
var CRASH_CREDIT_WINDOW = 8;
var MATCH_RESTART_DELAY = 15;
var INPUT_QUEUE_MAX = 8;
var JITTER_TARGET_INITIAL = 2;
var JITTER_TARGET_MIN = 1;
var JITTER_TARGET_MAX = 4;
var JITTER_CATCHUP_MARGIN = 2;
var JITTER_WINDOW = 180;
var JITTER_MAX_SYNTH = 4;
var JITTER_STREAM_MIN = 10;
var PLAYERS_RESEND = 1;
var STALE_INPUT = 1;
var CHAT_MAX = 200;
var CHAT_BURST = 4;
var CHAT_REFILL = 1.5;
var NAME_MAX = 16;
var STEALTH_VISUAL_RANGE = 800;
var MAX_VIEW_DELAY = 0.3;
var SPAWN_SLOTS = 16;
function newJitterBuffer() {
  return {
    target: JITTER_TARGET_INITIAL,
    offset: 0,
    primed: false,
    streak: 0,
    starveRun: 0,
    windowTicks: 0,
    windowMinSlack: Infinity,
    windowUnderruns: 0,
    synthesized: 0,
    caughtUp: 0,
    dropped: 0,
    late: 0
  };
}
var BOT_GUNNER_DELAY = 5;
var BOT_SKILL_DEFAULT = 0.5;
var BOT_SYNC_INTERVAL = 1;
var BOT_NAMES = [
  "Viper",
  "Maverick",
  "Iceman",
  "Goose",
  "Phoenix",
  "Hangman",
  "Rooster",
  "Payback",
  "Fanboy",
  "Jester",
  "Cougar",
  "Merlin",
  "Slider",
  "Hollywood",
  "Wolfman",
  "Sundown",
  "Chipper",
  "Stinger",
  "Ghost",
  "Raven",
  "Talon",
  "Havoc",
  "Nomad",
  "Reaper",
  "Saber",
  "Banshee",
  "Comet",
  "Falcon",
  "Outlaw",
  "Spectre"
];
var worldQuery2 = worldQuery.deckVelocity ? worldQuery : { ...worldQuery, deckVelocity };
var NEUTRAL_SEAT = { aim: null, firePrimary: false, fireSecondary: false, flares: false, ability: false };
function sanitizeConfig(input, base = DEFAULT_ROOM_CONFIG) {
  const c = input && typeof input === "object" ? input : {};
  const int = (v, min, max, fallback) => typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
  const name = typeof c.name === "string" ? cleanText(c.name, 32) : "";
  return {
    teams: int(c.teams, 2, 4, base.teams),
    bots: int(c.bots, 0, 10, base.bots),
    maxPerTeam: int(c.maxPerTeam, 1, 16, base.maxPerTeam),
    scoreLimit: int(c.scoreLimit, 1, 1000, base.scoreLimit),
    timeLimit: int(c.timeLimit, 60, 7200, base.timeLimit),
    listed: typeof c.listed === "boolean" ? c.listed : base.listed,
    name: name || base.name,
    ...extras(c, base)
  };
}
function extras(c, base) {
  const out = {};
  const skill = typeof c.botSkill === "number" && Number.isFinite(c.botSkill) ? c.botSkill : base.botSkill;
  if (skill !== undefined)
    out.botSkill = Math.min(1, Math.max(0, skill));
  const fill = typeof c.botFill === "number" && Number.isFinite(c.botFill) ? c.botFill : base.botFill;
  if (fill !== undefined)
    out.botFill = Math.min(16, Math.max(0, Math.round(fill)));
  return out;
}
function hashString2(s) {
  let h = 2166136261;
  for (let i = 0;i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function cleanText(text, max) {
  return text.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function isTeam(v, teams) {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < teams;
}
function isSeat(v) {
  return v === 0 || v === 1;
}
var clampAxis = (v) => typeof v === "number" && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : null;
function readAim(v) {
  if (v === null || v === undefined)
    return null;
  if (!Array.isArray(v) || v.length !== 3)
    return;
  const [x, y, z] = v;
  if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number")
    return;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z))
    return;
  const len = Math.hypot(x, y, z);
  if (len < 0.000001)
    return;
  return [x / len, y / len, z / len];
}
function readFlight(v) {
  if (!v || typeof v !== "object")
    return;
  const m = v;
  const aim = readAim(m.aim);
  const throttle = clampAxis(m.throttle ?? 0), roll = clampAxis(m.roll ?? 0), yaw = clampAxis(m.yaw ?? 0), pitch = clampAxis(m.pitch ?? 0);
  if (aim === undefined || throttle === null || roll === null || yaw === null || pitch === null)
    return;
  return { aim, throttle, roll, yaw, pitch, boost: m.boost === true, brake: m.brake === true };
}
function readSeat(v) {
  if (!v || typeof v !== "object")
    return;
  const m = v;
  const aim = readAim(m.aim);
  if (aim === undefined)
    return;
  const out = { aim, firePrimary: m.firePrimary === true, fireSecondary: m.fireSecondary === true, flares: m.flares === true, ability: m.ability === true };
  if (typeof m.viewDelay === "number" && Number.isFinite(m.viewDelay))
    out.viewDelay = Math.min(MAX_VIEW_DELAY, Math.max(0, m.viewDelay));
  if (m.steerBomb === true)
    out.steerBomb = true;
  return out;
}
function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

class RoomEngine {
  code;
  config;
  hooks;
  time = 0;
  tick = 0;
  vehicles = [];
  players = new Map;
  scores;
  combat = createCombatState();
  matchStartedAt = 0;
  matchEndedAt = null;
  winner = null;
  accumulator = 0;
  nextId = 1;
  meta = new Map;
  events = [];
  lastPlayersJson = "";
  lastPlayersAt = -Infinity;
  decoders = new Map;
  teamKills;
  cratersSent = 0;
  lastShipsJson = "";
  lastShipsAt = -Infinity;
  rng;
  botNames = 0;
  lastBotSync = -Infinity;
  constructor(code, config, hooks) {
    this.code = code;
    this.config = config;
    this.hooks = hooks;
    this.config = sanitizeConfig(config);
    this.scores = new Array(this.config.teams).fill(0);
    this.teamKills = new Array(this.config.teams).fill(0);
    this.rng = createRng(hashString2(code));
    this.syncBots();
  }
  addPlayer(name, beforeWelcome) {
    const id = `p${this.nextId++}`;
    const team = this.balancedTeam(null);
    this.players.set(id, this.newPlayer(id, cleanText(String(name ?? ""), NAME_MAX) || "Pilot", team, false));
    beforeWelcome?.(id);
    this.hooks.send(id, { type: "welcome", playerId: id, room: this.code, config: { ...this.config } });
    this.syncBots();
    this.hooks.onChange?.();
    return id;
  }
  removePlayer(playerId) {
    const p = this.players.get(playerId);
    if (!p)
      return;
    this.leaveTurret(p.info);
    this.vacate(p.info);
    this.players.delete(playerId);
    this.decoders.delete(playerId);
    if (!p.info.bot) {
      this.syncBots();
      this.hooks.onChange?.();
    }
  }
  newPlayer(id, name, team, bot) {
    return {
      info: { id, name, team, vehicleId: null, seat: null, kills: 0, deaths: 0, bot, respawnAt: 0, turret: null },
      flight: NEUTRAL_INPUT,
      seat: NEUTRAL_SEAT,
      queue: [],
      jitter: newJitterBuffer(),
      seq: -1,
      ack: -1,
      lastInputAt: -Infinity,
      chatTokens: CHAT_BURST,
      chatAt: this.time,
      needsPlayers: !bot,
      brain: null,
      leaving: false
    };
  }
  humanCount() {
    let n = 0;
    for (const p of this.players.values())
      if (!p.info.bot)
        n++;
    return n;
  }
  playerCount() {
    return this.players.size;
  }
  botCount() {
    return this.players.size - this.humanCount();
  }
  summary() {
    return {
      code: this.code,
      name: this.config.name,
      teams: this.config.teams,
      players: this.playerCount(),
      humans: this.humanCount(),
      maxPlayers: this.config.teams * this.config.maxPerTeam
    };
  }
  isFull() {
    return this.humanCount() >= this.config.teams * this.config.maxPerTeam;
  }
  teamCounts(exclude) {
    const counts = new Array(this.config.teams).fill(0);
    for (const p of this.players.values())
      if (!p.info.bot && p.info.id !== exclude)
        counts[p.info.team]++;
    return counts;
  }
  balancedTeam(exclude) {
    const counts = this.teamCounts(exclude);
    let best = 0;
    for (let t = 1;t < counts.length; t++)
      if (counts[t] < counts[best])
        best = t;
    return best;
  }
  wantedBots(team, humans) {
    const room = Math.max(0, this.config.maxPerTeam - humans[team]);
    const fill = this.config.botFill;
    if (fill !== undefined && fill > 0) {
      const total = humans.reduce((a, b) => a + b, 0);
      return total >= fill ? 0 : Math.min(room, Math.max(0, fill - humans[team]));
    }
    return Math.min(room, this.config.bots);
  }
  addBot(team) {
    const id = `b${this.nextId++}`;
    const p = this.newPlayer(id, `${BOT_NAMES[this.botNames++ % BOT_NAMES.length]} [AI]`, team, true);
    p.brain = createBotBrain(Math.floor(this.rng() * 4294967296), this.config.botSkill ?? BOT_SKILL_DEFAULT);
    p.info.respawnAt = this.time + 0.5 + this.rng() * 2;
    this.players.set(id, p);
    return id;
  }
  syncBots() {
    this.lastBotSync = this.time;
    const humans = this.teamCounts(null);
    for (let t = 0;t < this.config.teams; t++) {
      const want = this.wantedBots(t, humans);
      const bots = [...this.players.values()].filter((p) => p.info.bot && p.info.team === t);
      const staying = bots.filter((b) => !b.leaving);
      if (staying.length < want) {
        let need = want - staying.length;
        for (const b of bots)
          if (b.leaving && need > 0) {
            b.leaving = false;
            need--;
          }
        for (let i = 0;i < need; i++)
          this.addBot(t);
      } else if (staying.length > want) {
        const rank = (b) => b.info.vehicleId === null ? 0 : b.info.seat === 1 ? 1 : 2;
        staying.sort((a, b) => rank(a) - rank(b));
        for (let i = 0;i < staying.length - want; i++)
          staying[i].leaving = true;
      }
    }
    this.retireBots();
  }
  retireBots() {
    for (const p of [...this.players.values()]) {
      if (!p.info.bot || !p.leaving)
        continue;
      const v = this.vehicleOf(p.info);
      if (!v || !v.alive) {
        this.removePlayer(p.info.id);
        continue;
      }
      if (!this.canLeave(v))
        continue;
      const otherId = v.seats[p.info.seat === 0 ? 1 : 0];
      this.removePlayer(p.info.id);
      if (!otherId)
        this.removeVehicleQuietly(v);
    }
  }
  removeVehicleQuietly(v) {
    const meta = this.meta.get(v.id);
    v.alive = false;
    if (meta)
      meta.diedAt = -Infinity;
  }
  evictBot(bot) {
    this.vacate(bot.info);
    bot.info.respawnAt = Math.max(bot.info.respawnAt, this.time + 1);
  }
  updateBots() {
    if (this.time - this.lastBotSync >= BOT_SYNC_INTERVAL)
      this.syncBots();
    else
      this.retireBots();
    if (this.matchEndedAt !== null)
      return;
    const now = this.time;
    for (const p of this.players.values()) {
      const bot = p.info;
      if (!bot.bot || p.leaving || bot.vehicleId || now < bot.respawnAt)
        continue;
      const ride = this.vehicles.find((v) => {
        if (!v.alive || v.team !== bot.team || v.seats[1] || !v.seats[0])
          return false;
        const pilot = this.players.get(v.seats[0]);
        return !!pilot && !pilot.info.bot && now - this.meta.get(v.id).gunnerEmptySince >= BOT_GUNNER_DELAY;
      });
      if (ride) {
        this.seatPlayer(bot, ride, 1);
        continue;
      }
      const teammates = [];
      for (const x of this.players.values())
        if (x.info.team === bot.team && x.info.id !== bot.id)
          teammates.push(x.info);
      let kind = chooseBotVehicle(bot, teammates, this.vehicles, this.rng);
      if (!VEHICLES[kind])
        kind = VEHICLE_KINDS[Math.floor(this.rng() * VEHICLE_KINDS.length)];
      this.spawnVehicle(bot, kind);
    }
  }
  canJoinTeam(playerId, team) {
    const counts = this.teamCounts(playerId);
    return counts[team] < this.config.maxPerTeam && counts[team] <= Math.min(...counts);
  }
  handle(playerId, message) {
    const p = this.players.get(playerId);
    if (!p || p.info.bot || !message || typeof message !== "object")
      return;
    const m = message;
    switch (m.type) {
      case "ping":
        if (typeof m.t === "number" && Number.isFinite(m.t))
          this.hooks.send(playerId, { type: "pong", t: m.t });
        return;
      case "input":
        return this.onInput(p, m);
      case "hello": {
        if (typeof m.name === "string")
          p.info.name = cleanText(m.name, NAME_MAX) || p.info.name;
        if (isTeam(m.team, this.config.teams) && m.team !== p.info.team && this.canJoinTeam(playerId, m.team))
          this.setTeam(p, m.team);
        this.hooks.onChange?.();
        return;
      }
      case "team":
        if (!isTeam(m.team, this.config.teams) || m.team === p.info.team)
          return;
        if (!this.canJoinTeam(playerId, m.team))
          return this.error(playerId, "That team is full.");
        this.setTeam(p, m.team);
        this.hooks.onChange?.();
        return;
      case "spawn":
        return this.onSpawn(p, m.kind);
      case "man-turret":
        return this.onManTurret(p, m.ship, m.turret);
      case "board":
        return this.onBoard(p, m.vehicle, m.seat);
      case "switch-seat":
        return this.onSwitchSeat(p, m.seat);
      case "leave-vehicle": {
        if (p.info.turret) {
          this.leaveTurret(p.info);
          return;
        }
        const v = this.vehicleOf(p.info);
        if (v && v.alive && !this.canLeave(v))
          return this.error(playerId, "You can only bail out at base.");
        this.vacate(p.info);
        return;
      }
      case "chat":
        return this.onChat(p, m.text);
    }
  }
  error(playerId, message) {
    this.hooks.send(playerId, { type: "error", message });
  }
  onInput(p, m) {
    const seq = m.seq;
    if (typeof seq !== "number" || !Number.isSafeInteger(seq) || seq < 0 || seq <= p.seq)
      return;
    if (seq <= p.ack) {
      p.jitter.streak = seq === p.seq + 1 ? p.jitter.streak + 1 : 0;
      p.seq = seq;
      p.jitter.late++;
      return;
    }
    const input = { seq, at: this.tick };
    if (m.flight !== undefined) {
      input.flight = readFlight(m.flight);
      if (!input.flight)
        return;
    }
    if (m.seat !== undefined) {
      input.seat = readSeat(m.seat);
      if (!input.seat)
        return;
    }
    p.jitter.streak = seq === p.seq + 1 ? p.jitter.streak + 1 : 0;
    p.seq = seq;
    p.lastInputAt = this.time;
    p.queue.push(input);
    while (p.queue.length > INPUT_QUEUE_MAX) {
      this.consume(p, p.queue.shift());
      p.jitter.dropped++;
    }
  }
  consumeTick(p) {
    const jb = p.jitter;
    const q = p.queue;
    while (q.length && q[0].seq <= p.ack) {
      q.shift();
      jb.late++;
    }
    if (!jb.primed) {
      if (!q.length)
        return;
      jb.offset = q[0].at - q[0].seq + jb.target;
      jb.primed = true;
      jb.starveRun = 0;
    }
    if (++jb.windowTicks >= JITTER_WINDOW) {
      if (jb.windowUnderruns === 0 && jb.windowMinSlack >= 1 && jb.windowMinSlack !== Infinity) {
        if (jb.target > JITTER_TARGET_MIN)
          jb.target--;
        jb.offset--;
      }
      jb.windowTicks = 0;
      jb.windowMinSlack = Infinity;
      jb.windowUnderruns = 0;
    }
    if (q.length > jb.target + JITTER_CATCHUP_MARGIN) {
      jb.offset--;
      jb.caughtUp++;
    }
    const due = this.tick - jb.offset;
    let consumed = 0;
    while (consumed < 2 && q.length && q[0].seq <= due) {
      const next = q.shift();
      const after = q[0];
      if (consumed === 0 && after && after.seq <= due && next.seat && after.seat) {
        after.seat = { ...after.seat, flares: after.seat.flares || next.seat.flares, ability: after.seat.ability || next.seat.ability };
      }
      this.consume(p, next);
      consumed++;
    }
    if (consumed) {
      jb.starveRun = 0;
      if (q.length < jb.windowMinSlack)
        jb.windowMinSlack = q.length;
      return;
    }
    if (p.ack >= due)
      return;
    if (jb.starveRun === 0)
      jb.windowUnderruns++;
    if (jb.starveRun < JITTER_MAX_SYNTH && p.ack >= 0 && jb.streak >= JITTER_STREAM_MIN && this.time - p.lastInputAt <= STALE_INPUT) {
      jb.starveRun++;
      jb.synthesized++;
      p.ack++;
      jb.windowMinSlack = 0;
      if ((jb.starveRun >= 2 || jb.windowUnderruns >= 2) && jb.target < JITTER_TARGET_MAX) {
        jb.target++;
        jb.offset++;
        jb.windowUnderruns = 0;
      }
    } else {
      jb.starveRun = 0;
      jb.primed = false;
    }
  }
  consume(p, input) {
    if (input.flight)
      p.flight = input.flight;
    if (input.seat)
      p.seat = input.seat;
    p.ack = input.seq;
  }
  onChat(p, text) {
    if (typeof text !== "string")
      return;
    const clean = cleanText(text, CHAT_MAX);
    if (!clean)
      return;
    p.chatTokens = Math.min(CHAT_BURST, p.chatTokens + (this.time - p.chatAt) / CHAT_REFILL);
    p.chatAt = this.time;
    if (p.chatTokens < 1)
      return this.error(p.info.id, "You're sending messages too fast.");
    p.chatTokens -= 1;
    this.events.push({ type: "chat", player: p.info.id, text: clean });
  }
  setTeam(p, team) {
    this.vacate(p.info);
    this.leaveTurret(p.info);
    p.info.team = team;
    this.syncBots();
  }
  onSpawn(p, kind) {
    if (typeof kind !== "string" || !VEHICLE_KINDS.includes(kind))
      return this.error(p.info.id, "Unknown aircraft kind.");
    if (this.matchEndedAt !== null)
      return this.error(p.info.id, "Match over — next round starting soon.");
    if (this.time < p.info.respawnAt)
      return this.error(p.info.id, "Respawn not ready.");
    const current = this.vehicleOf(p.info);
    if (current && current.alive && !this.canLeave(current))
      return this.error(p.info.id, "Return to base to change aircraft.");
    if (!this.spawnCarrier(p.info.team))
      return this.error(p.info.id, "Your carriers have been sunk.");
    this.vacate(p.info);
    this.leaveTurret(p.info);
    this.spawnVehicle(p.info, kind);
  }
  onManTurret(p, shipId, turretId) {
    if (typeof shipId !== "string" || typeof turretId !== "string")
      return;
    const ship = FLEET.find((s) => s.id === shipId);
    const mount = ship ? SHIP_SPECS[ship.kind].turrets.find((t) => t.id === turretId) : undefined;
    if (!ship || !mount || ship.team !== p.info.team || ship.team >= this.config.teams || !mount.mannable)
      return this.error(p.info.id, "Can't man that turret.");
    if (this.matchEndedAt !== null)
      return this.error(p.info.id, "Match over — next round starting soon.");
    if (this.time < p.info.respawnAt)
      return this.error(p.info.id, "Respawn not ready.");
    if (!turretOperational(this.combat, shipId, turretId))
      return this.error(p.info.id, "That turret is knocked out.");
    const tr = shipRuntime(this.combat, shipId).turrets[turretId];
    if (tr.manned && tr.manned !== p.info.id)
      return this.error(p.info.id, "That turret is already manned.");
    const current = this.vehicleOf(p.info);
    if (current && current.alive && !this.canLeave(current))
      return this.error(p.info.id, "Return to base first.");
    this.vacate(p.info);
    this.leaveTurret(p.info);
    tr.manned = p.info.id;
    p.info.turret = { ship: shipId, turret: turretId };
    p.seat = NEUTRAL_SEAT;
  }
  leaveTurret(player) {
    const t = player.turret;
    if (!t)
      return;
    const tr = shipRuntime(this.combat, t.ship)?.turrets[t.turret];
    if (tr && tr.manned === player.id)
      tr.manned = null;
    player.turret = null;
  }
  spawnCarrier(team) {
    for (const sh of FLEET) {
      if (sh.team !== team || sh.kind !== "carrier")
        continue;
      const rt = shipRuntime(this.combat, sh.id);
      if (rt && !rt.sunk)
        return sh.id;
    }
    return null;
  }
  spawnAt(team, kind, index) {
    const sp = spawnPoint(team, kind, index);
    const id = this.spawnCarrier(team);
    const primary = carrierOf(team);
    if (!id || id === primary.id)
      return sp;
    const other = posedShip(id);
    if (!other)
      return sp;
    const local = worldToShip(primary, sp.position);
    return { ...sp, position: shipToWorld(other, local), yaw: sp.yaw + other.heading - primary.heading };
  }
  spawnVehicle(player, kind) {
    this.syncFleet();
    const team = player.team;
    let index = 0;
    for (let i = 0;i < SPAWN_SLOTS; i++) {
      const sp = this.spawnAt(team, kind, i).position;
      const blocked = this.vehicles.some((v) => v.alive && Math.hypot(v.flight.position[0] - sp[0], v.flight.position[1] - sp[1], v.flight.position[2] - sp[2]) < 25);
      if (!blocked) {
        index = i;
        break;
      }
      index = i + 1;
    }
    const spec = VEHICLES[kind];
    const v = {
      id: `v${this.nextId++}`,
      kind,
      team,
      flight: createFlightState(kind, this.spawnAt(team, kind, index % SPAWN_SLOTS)),
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      seats: [player.id, null],
      aim: [null, null],
      weapons: createWeapons(kind),
      flaresReadyAt: 0,
      flareCount: spec.flares,
      abilityReadyAt: 0,
      spottedUntil: 0,
      lastDamagedBy: null,
      alive: true
    };
    this.vehicles.push(v);
    this.meta.set(v.id, { emptySince: null, lastHp: v.hp, lastHitAt: -Infinity, diedAt: null, gunnerEmptySince: this.time });
    markSpawned(v, this.time);
    player.vehicleId = v.id;
    player.seat = 0;
    const ps = this.players.get(player.id);
    if (ps) {
      ps.flight = NEUTRAL_INPUT;
      ps.seat = NEUTRAL_SEAT;
    }
    return v;
  }
  onBoard(p, vehicleId, seat) {
    if (typeof vehicleId !== "string" || !isSeat(seat))
      return;
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!v || !v.alive || v.team !== p.info.team)
      return this.error(p.info.id, "Can't board that aircraft.");
    if (this.time < p.info.respawnAt)
      return this.error(p.info.id, "Respawn not ready.");
    if (p.info.vehicleId === v.id)
      return this.onSwitchSeat(p, seat);
    const current = this.vehicleOf(p.info);
    if (current && current.alive && !this.canLeave(current))
      return;
    const occupant = v.seats[seat] ? this.players.get(v.seats[seat]) : undefined;
    if (v.seats[seat] && !occupant?.info.bot)
      return this.error(p.info.id, "Seat taken.");
    this.vacate(p.info);
    if (occupant) {
      this.evictBot(occupant);
      const other = 1 - seat;
      if (seat === 0 && !v.seats[other] && !occupant.leaving)
        this.seatPlayer(occupant.info, v, other);
    }
    this.seatPlayer(p.info, v, seat);
  }
  onSwitchSeat(p, seat) {
    if (!isSeat(seat))
      return;
    const v = this.vehicleOf(p.info);
    if (!v || !v.alive || p.info.seat === seat)
      return;
    const occupant = v.seats[seat] ? this.players.get(v.seats[seat]) : undefined;
    if (v.seats[seat] && !occupant?.info.bot)
      return this.error(p.info.id, "Seat taken.");
    const from = p.info.seat;
    v.seats[from] = null;
    v.aim[from] = null;
    if (from === 1)
      this.meta.get(v.id).gunnerEmptySince = this.time;
    if (occupant) {
      this.evictBot(occupant);
      if (from === 1)
        this.seatPlayer(occupant.info, v, 1);
    }
    this.seatPlayer(p.info, v, seat);
  }
  seatPlayer(player, v, seat) {
    v.seats[seat] = player.id;
    player.vehicleId = v.id;
    player.seat = seat;
    if (seat === 1) {
      const meta = this.meta.get(v.id);
      if (meta)
        meta.gunnerEmptySince = Infinity;
    }
    const ps = this.players.get(player.id);
    if (ps) {
      ps.flight = NEUTRAL_INPUT;
      ps.seat = NEUTRAL_SEAT;
    }
  }
  vacate(player) {
    const v = this.vehicleOf(player);
    if (v && player.seat !== null && v.seats[player.seat] === player.id) {
      v.seats[player.seat] = null;
      v.aim[player.seat] = null;
      if (player.seat === 1) {
        const meta = this.meta.get(v.id);
        if (meta)
          meta.gunnerEmptySince = this.time;
      }
    }
    player.vehicleId = null;
    player.seat = null;
    const ps = this.players.get(player.id);
    if (ps) {
      ps.flight = NEUTRAL_INPUT;
      ps.seat = NEUTRAL_SEAT;
    }
  }
  vehicleOf(player) {
    return player.vehicleId ? this.vehicles.find((v) => v.id === player.vehicleId) : undefined;
  }
  canLeave(v) {
    return this.onOwnDeck(v) || this.time - (v.spawnedAt ?? -Infinity) < SPAWN_PROTECTION;
  }
  onOwnDeck(v) {
    if (!v.flight.onGround)
      return false;
    const spec = SHIP_SPECS.carrier;
    this.syncFleet();
    for (const sh of FLEET) {
      if (sh.team !== v.team || sh.kind !== "carrier")
        continue;
      const rt = shipRuntime(this.combat, sh.id);
      const posed = posedShip(sh.id);
      if (!posed || rt && rt.sunk)
        continue;
      const l = worldToShip(posed, v.flight.position);
      if (Math.abs(l[0]) <= spec.halfWidth + 2 && Math.abs(l[2]) <= spec.halfLength + 2 && l[1] >= spec.deckHeight - 2 && l[1] <= spec.deckHeight + 10)
        return true;
    }
    return false;
  }
  advance(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed <= 0)
      return;
    this.accumulator += Math.min(elapsed, MAX_CATCH_UP);
    while (this.accumulator >= TICK_DT - 0.000000001) {
      this.accumulator -= TICK_DT;
      this.step();
      if (this.events.length)
        this.flushEvents();
      if (this.tick % TICKS_PER_SNAPSHOT === 0)
        this.broadcastSnapshot();
    }
    if (this.accumulator < 0)
      this.accumulator = 0;
  }
  step() {
    this.tick++;
    this.time = this.tick * TICK_DT;
    this.syncFleet();
    const now = this.time;
    const events = this.events;
    const vehicles = this.vehicles;
    for (const p of this.players.values()) {
      if (p.info.bot)
        continue;
      this.consumeTick(p);
    }
    for (const v of vehicles) {
      if (!v.alive)
        continue;
      for (let i = 0;i < 2; i++) {
        const id = v.seats[i];
        const p = id ? this.players.get(id) : undefined;
        if (!p || !p.brain)
          continue;
        const out = botInput(p.brain, p.info, v, vehicles, now, this.combat.missiles, worldQuery2, this.combat.ships, this.combat.projectiles);
        p.seat = { ...out.seat, aim: out.seat.aim && [out.seat.aim[0], out.seat.aim[1], out.seat.aim[2]] };
        if (i === 0)
          p.flight = out.flight ? { ...out.flight, aim: out.flight.aim && [out.flight.aim[0], out.flight.aim[1], out.flight.aim[2]] } : NEUTRAL_INPUT;
        p.lastInputAt = now;
      }
    }
    for (const v of vehicles) {
      if (!v.alive)
        continue;
      const pilot = v.seats[0] ? this.players.get(v.seats[0]) : undefined;
      stepFlight(v.flight, pilot ? pilot.flight : NEUTRAL_INPUT, TICK_DT, worldQuery2);
      for (let i = 0;i < 2; i++) {
        const s = i;
        const id = v.seats[s];
        const p = id ? this.players.get(id) : undefined;
        if (!p)
          continue;
        const input = now - p.lastInputAt > STALE_INPUT ? { ...p.seat, firePrimary: false, fireSecondary: false, flares: false, ability: false } : p.seat;
        v.aim[s] = input.aim;
        applySeatInput(this.combat, v, s, input, vehicles, now, events);
      }
    }
    for (const p of this.players.values()) {
      const t = p.info.turret;
      if (!t)
        continue;
      const input = now - p.lastInputAt > STALE_INPUT ? { ...p.seat, firePrimary: false } : p.seat;
      applyTurretInput(this.combat, t.ship, t.turret, p.info.id, input, now, events);
    }
    const eventStart = events.length;
    stepCombat(this.combat, vehicles, TICK_DT, now, events);
    for (const p of this.players.values()) {
      const t = p.info.turret;
      if (!t || turretOperational(this.combat, t.ship, t.turret))
        continue;
      this.leaveTurret(p.info);
      p.info.deaths++;
      p.info.respawnAt = now + RESPAWN_DELAY;
      p.seat = NEUTRAL_SEAT;
    }
    for (const v of vehicles) {
      const meta = this.meta.get(v.id);
      if (v.hp < meta.lastHp)
        meta.lastHitAt = now;
      meta.lastHp = v.hp;
      if (v.alive && v.flight.crashed)
        killVehicle(v, "crash", this.crashCredit(v, meta), events);
    }
    for (const v of vehicles) {
      const meta = this.meta.get(v.id);
      if (v.alive || meta.diedAt !== null)
        continue;
      meta.diedAt = now;
      let killEvent;
      for (let i = eventStart;i < events.length; i++) {
        const e = events[i];
        if (e.type === "kill" && e.victim === v.id) {
          killEvent = e;
          break;
        }
      }
      const killer = killEvent ? killEvent.killer : this.crashCredit(v, meta);
      if (!killEvent) {
        v.alive = true;
        killVehicle(v, "crash", killer, events);
      }
      this.onVehicleDestroyed(v, killer, killEvent?.killerTeam);
    }
    this.cleanupVehicles();
    this.updateBots();
    if (this.matchEndedAt === null)
      this.updateScores();
    this.updateMatch();
  }
  crashCredit(v, meta) {
    return v.lastDamagedBy && this.time - meta.lastHitAt <= CRASH_CREDIT_WINDOW ? v.lastDamagedBy : null;
  }
  onVehicleDestroyed(v, killer, aaTeam) {
    for (let s = 0;s < 2; s++) {
      const id = v.seats[s];
      const p = id ? this.players.get(id) : undefined;
      if (p) {
        p.info.deaths++;
        p.info.vehicleId = null;
        p.info.seat = null;
        p.info.respawnAt = this.time + RESPAWN_DELAY;
        p.flight = NEUTRAL_INPUT;
        p.seat = NEUTRAL_SEAT;
      }
      v.seats[s] = null;
    }
    const kp = killer ? this.players.get(killer) : undefined;
    const killerTeam = kp ? kp.info.team : killer ? this.vehicles.find((x) => x.id === killer)?.team : aaTeam;
    if (killerTeam === undefined || killerTeam === v.team)
      return;
    if (kp)
      kp.info.kills++;
    if (this.matchEndedAt !== null)
      return;
    this.teamKills[killerTeam]++;
  }
  enemyFleetHp(team) {
    let hp = 0;
    for (const sh of FLEET)
      if (sh.team !== team && sh.team < this.config.teams)
        hp += SHIP_SPECS[sh.kind].maxHp;
    return hp;
  }
  updateScores() {
    const dealt = this.combat.shipDamageBy ?? [];
    let changed = false;
    for (let t = 0;t < this.config.teams; t++) {
      const pct = Math.round(1000 * (dealt[t] ?? 0) / Math.max(1, this.enemyFleetHp(t))) / 10;
      if (pct !== this.scores[t]) {
        this.scores[t] = pct;
        changed = true;
      }
    }
    if (changed)
      this.events.push({ type: "score", scores: [...this.scores] });
  }
  cleanupVehicles() {
    const now = this.time;
    let removed = false;
    for (const v of this.vehicles) {
      const meta = this.meta.get(v.id);
      if (!v.alive) {
        if (meta.diedAt !== null && now - meta.diedAt >= WRECK_LINGER)
          removed = true;
        continue;
      }
      if (!v.seats[0] && v.seats[1]) {
        const gunner = this.players.get(v.seats[1]);
        if (gunner?.info.bot)
          this.evictBot(gunner);
      }
      if (v.seats[0] || v.seats[1]) {
        meta.emptySince = null;
        continue;
      }
      if (meta.emptySince === null)
        meta.emptySince = now;
      const idle = now - meta.emptySince;
      if (this.onOwnDeck(v)) {
        if (idle >= PARKED_REMOVE_DELAY) {
          v.alive = false;
          meta.diedAt = -Infinity;
          removed = true;
        }
      } else if (idle >= ABANDONED_DESTROY_DELAY) {
        const killer = this.crashCredit(v, meta);
        killVehicle(v, "crash", killer, this.events);
        meta.diedAt = now;
        this.onVehicleDestroyed(v, killer);
      }
    }
    if (!removed)
      return;
    for (let i = this.vehicles.length - 1;i >= 0; i--) {
      const v = this.vehicles[i];
      const meta = this.meta.get(v.id);
      if (!v.alive && meta.diedAt !== null && now - meta.diedAt >= WRECK_LINGER) {
        for (const id of v.seats)
          if (id) {
            const p = this.players.get(id);
            if (p)
              this.vacate(p.info);
          }
        this.vehicles.splice(i, 1);
        this.meta.delete(v.id);
      }
    }
  }
  updateMatch() {
    const now = this.time;
    if (this.matchEndedAt !== null) {
      if (now - this.matchEndedAt >= MATCH_RESTART_DELAY)
        this.resetMatch();
      return;
    }
    const alive = [];
    for (let t = 0;t < this.config.teams; t++)
      if (this.spawnCarrier(t))
        alive.push(t);
    if (alive.length <= 1)
      return this.endMatch(alive.length === 1 ? alive[0] : null, "carriers-sunk");
    if (now - this.matchStartedAt >= this.config.timeLimit) {
      const dealt = this.combat.shipDamageBy ?? [];
      let best = null;
      let tie = false;
      for (const t of alive) {
        if (best === null) {
          best = t;
          continue;
        }
        const a = dealt[t] ?? 0, b = dealt[best] ?? 0;
        if (a > b + 0.000001 || Math.abs(a - b) <= 0.000001 && this.teamKills[t] > this.teamKills[best]) {
          best = t;
          tie = false;
        } else if (Math.abs(a - b) <= 0.000001 && this.teamKills[t] === this.teamKills[best])
          tie = true;
      }
      this.endMatch(tie ? null : best, "time");
    }
  }
  endMatch(winner, reason) {
    this.matchEndedAt = this.time;
    this.winner = winner;
    this.events.push({ type: "match-end", winner, reason });
    this.hooks.onChange?.();
  }
  resetMatch() {
    for (const p of this.players.values()) {
      p.info.vehicleId = null;
      p.info.seat = null;
      p.info.kills = 0;
      p.info.deaths = 0;
      p.info.respawnAt = p.info.bot ? this.time + 0.5 + this.rng() * 2 : 0;
      p.info.turret = null;
      p.flight = NEUTRAL_INPUT;
      p.seat = NEUTRAL_SEAT;
    }
    this.vehicles.length = 0;
    this.meta.clear();
    this.combat = createCombatState();
    this.scores = new Array(this.config.teams).fill(0);
    this.teamKills = new Array(this.config.teams).fill(0);
    this.cratersSent = 0;
    this.lastShipsJson = "";
    this.matchStartedAt = this.time;
    this.matchEndedAt = null;
    this.winner = null;
    this.events.push({ type: "score", scores: [...this.scores] });
    this.hooks.onChange?.();
  }
  matchTime() {
    return this.matchEndedAt !== null ? 0 : Math.max(0, this.time - this.matchStartedAt);
  }
  syncFleet() {
    setFleetState(this.matchTime(), this.config.teams);
    setShipStates(this.shipStates(), this.time);
  }
  matchEndsAt() {
    return this.matchEndedAt !== null ? this.matchEndedAt + MATCH_RESTART_DELAY : this.matchStartedAt + this.config.timeLimit;
  }
  flushEvents() {
    const batch = this.events;
    this.events = [];
    const message = { type: "events", events: batch };
    if (this.hooks.sendText) {
      const text = JSON.stringify(message);
      for (const p of this.players.values())
        if (!p.info.bot)
          this.hooks.sendText(p.info.id, text);
    } else {
      for (const p of this.players.values())
        if (!p.info.bot)
          this.hooks.send(p.info.id, message);
    }
  }
  snapshotFor(playerId) {
    const decode = createSnapshotDecoder();
    const p = this.players.get(playerId);
    const shared = this.wireShared(true);
    if (p)
      shared.vehicles = shared.vehicles.filter((_, i) => this.visibleTo(p.info.team, this.vehicles[i]));
    return decode({ ...shared, ...this.wirePersonal(p ?? null, false) });
  }
  visibleTo(team, v) {
    if (v.team === team || !isHiddenStealth(v, this.time))
      return true;
    const p = v.flight.position, r2 = STEALTH_VISUAL_RANGE * STEALTH_VISUAL_RANGE;
    for (const o of this.vehicles) {
      if (!o.alive || o.team !== team)
        continue;
      const q = o.flight.position;
      const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
      if (dx * dx + dy * dy + dz * dz < r2)
        return true;
    }
    for (const sh of posedFleet()) {
      if (sh.team !== team || shipRuntime(this.combat, sh.id)?.sunk)
        continue;
      const dx = p[0] - sh.position[0], dy = p[1] - 20, dz = p[2] - sh.position[2];
      if (dx * dx + dy * dy + dz * dz < r2)
        return true;
    }
    return false;
  }
  wireShared(withPlayers) {
    const cs = this.combat;
    const now = this.time;
    const shared = {
      type: "snapshot",
      wire: 1,
      time: r3(now),
      tick: this.tick,
      vehicles: this.vehicles.map((v) => packVehicle(v, now)),
      projectiles: cs.projectiles.map(packProjectile),
      missiles: cs.missiles.map(packMissile),
      flares: cs.flares.map(packFlare),
      scores: this.scores,
      matchEndsAt: r3(this.matchEndsAt()),
      matchStartedAt: r3(this.matchStartedAt),
      intermission: this.matchEndedAt !== null
    };
    if (withPlayers) {
      shared.players = this.playerList();
      shared.ships = this.shipStates();
      shared.craters = (cs.craters ?? []).slice();
    }
    return shared;
  }
  shipStates() {
    const out = [];
    for (const sh of FLEET) {
      if (sh.team >= this.config.teams)
        continue;
      const rt = shipRuntime(this.combat, sh.id);
      if (!rt)
        continue;
      const turrets = {};
      for (const k in rt.turrets)
        turrets[k] = { hp: Math.round(rt.turrets[k].hp), manned: rt.turrets[k].manned };
      out.push({ id: sh.id, hp: Math.round(rt.hp), maxHp: rt.maxHp, sunk: rt.sunk, sunkAt: r2(rt.sunkAt), turrets, damage: rt.damage.map((d) => [d[0], d[1], d[2]]) });
    }
    return out;
  }
  playerList() {
    return [...this.players.values()].map((p) => ({ ...p.info, respawnAt: r2(p.info.respawnAt) }));
  }
  wirePersonal(p, full) {
    const out = { ack: p ? p.ack : -1 };
    const v = p ? this.vehicleOf(p.info) : undefined;
    if (v)
      out.own = packOwn(v);
    if (full) {
      out.players = this.playerList();
      out.ships = this.shipStates();
      out.craters = (this.combat.craters ?? []).slice();
    }
    return out;
  }
  broadcastSnapshot() {
    if (this.humanCount() === 0)
      return;
    const list = this.playerList();
    const listJson = JSON.stringify(list);
    const includePlayers = listJson !== this.lastPlayersJson || this.time - this.lastPlayersAt >= PLAYERS_RESEND;
    if (includePlayers) {
      this.lastPlayersJson = listJson;
      this.lastPlayersAt = this.time;
    }
    const shared = this.wireShared(false);
    if (includePlayers)
      shared.players = list;
    const ships = this.shipStates();
    const shipsJson = JSON.stringify(ships);
    if (shipsJson !== this.lastShipsJson || this.time - this.lastShipsAt >= PLAYERS_RESEND) {
      this.lastShipsJson = shipsJson;
      this.lastShipsAt = this.time;
      shared.ships = ships;
    }
    const craters = this.combat.craters ?? [];
    if (craters.length > this.cratersSent) {
      shared.craters = craters.slice(this.cratersSent);
      this.cratersSent = craters.length;
    }
    const parts = shared.vehicles.map((v) => JSON.stringify(v));
    const { vehicles: _omit, ...rest } = shared;
    const head = `${JSON.stringify(rest).slice(0, -1)},"vehicles":`;
    const all = `[${parts.join(",")}]`;
    const anyHidden = this.vehicles.some((v) => isHiddenStealth(v, this.time));
    const perTeam = new Map;
    const vehiclesFor = (team) => {
      if (!anyHidden)
        return all;
      let json = perTeam.get(team);
      if (json === undefined) {
        json = `[${parts.filter((_, i) => this.visibleTo(team, this.vehicles[i])).join(",")}]`;
        perTeam.set(team, json);
      }
      return json;
    };
    for (const p of this.players.values()) {
      if (p.info.bot)
        continue;
      const personal = this.wirePersonal(p, p.needsPlayers);
      p.needsPlayers = false;
      const text = `${head}${vehiclesFor(p.info.team)},${JSON.stringify(personal).slice(1)}`;
      if (this.hooks.sendText)
        this.hooks.sendText(p.info.id, text);
      else {
        let decode = this.decoders.get(p.info.id);
        if (!decode)
          this.decoders.set(p.info.id, decode = createSnapshotDecoder());
        this.hooks.send(p.info.id, decode(JSON.parse(text)));
      }
    }
  }
}
var r2 = (n) => Math.round(n * 100) / 100;
var r3 = (n) => Math.round(n * 1000) / 1000;
var r4 = (n) => Math.round(n * 1e4) / 1e4;
var v2 = (v) => [r2(v[0]), r2(v[1]), r2(v[2])];
var v3 = (v) => [r3(v[0]), r3(v[1]), r3(v[2])];
function packVehicle(v, now) {
  const f = v.flight;
  const q = f.orientation;
  const out = {
    id: v.id,
    k: v.kind,
    t: v.team,
    p: v2(f.position),
    v: v2(f.velocity),
    q: [r4(q[0]), r4(q[1]), r4(q[2]), r4(q[3])],
    w: v2(f.angularVelocity),
    th: r2(f.throttle),
    hp: Math.round(v.hp * 10) / 10,
    s: v.seats,
    am: [v.weapons[0].map((w) => w.ammo), v.weapons[1].map((w) => w.ammo)],
    fc: v.flareCount
  };
  if (f.onGround)
    out.g = 1;
  if (f.gearDown)
    out.gd = 1;
  if (f.crashed)
    out.c = f.crashed;
  if (v.aim[0] || v.aim[1])
    out.a = [v.aim[0] && v3(v.aim[0]), v.aim[1] && v3(v.aim[1])];
  if (v.spottedUntil > now)
    out.su = r2(v.spottedUntil);
  if (!v.alive)
    out.d = 1;
  return out;
}
function packOwn(v) {
  const pack = (w) => ({ ammo: w.ammo, readyAt: r3(w.readyAt), lockTarget: w.lockTarget, lock: r3(w.lock) });
  return {
    vehicle: v.id,
    ft: v.flight.tick,
    weapons: [v.weapons[0].map(pack), v.weapons[1].map(pack)],
    fr: r3(v.flaresReadyAt),
    ar: r3(v.abilityReadyAt),
    ld: v.lastDamagedBy,
    ...v.spotProgress !== undefined ? { sp: r3(v.spotProgress) } : {},
    ...v.spotCandidate !== undefined ? { sc: v.spotCandidate } : {}
  };
}
function packProjectile(x) {
  return { id: x.id, w: x.weapon, o: x.owner, vh: x.vehicle, t: x.team, p: v2(x.position), v: v2(x.velocity), a: r3(x.age), l: r3(x.ttl) };
}
function packMissile(x) {
  const out = {
    id: x.id,
    w: x.weapon,
    o: x.owner,
    vh: x.vehicle,
    t: x.team,
    p: v2(x.position),
    v: v2(x.velocity),
    a: r3(x.age),
    l: r3(x.ttl),
    tg: x.target
  };
  if (x.steered)
    out.st = 1;
  if (x.seat !== undefined)
    out.se = x.seat;
  return out;
}
function packFlare(x) {
  return { id: x.id, vh: x.vehicle, p: v2(x.position), v: v2(x.velocity), a: r3(x.age), l: r3(x.ttl) };
}
function createSnapshotDecoder() {
  let players = [];
  let ships;
  return (message) => {
    if (message.type !== "snapshot" || !("wire" in message))
      return message;
    const m = message;
    if (m.players)
      players = m.players;
    if (m.ships)
      ships = m.ships;
    const own = m.own;
    return {
      type: "snapshot",
      time: m.time,
      tick: m.tick,
      vehicles: m.vehicles.map((w) => {
        const mine = own && own.vehicle === w.id ? own : null;
        const v = {
          id: w.id,
          kind: w.k,
          team: w.t,
          flight: {
            kind: w.k,
            position: w.p,
            velocity: w.v,
            orientation: w.q,
            angularVelocity: w.w,
            throttle: w.th,
            onGround: w.g === 1,
            gearDown: w.gd === 1,
            crashed: w.c ?? null,
            tick: mine ? mine.ft : m.tick
          },
          hp: w.hp,
          maxHp: VEHICLES[w.k]?.maxHp ?? w.hp,
          seats: w.s,
          aim: w.a ?? [null, null],
          weapons: mine ? mine.weapons : [
            w.am[0].map((ammo) => ({ ammo, readyAt: 0, lockTarget: null, lock: 0 })),
            w.am[1].map((ammo) => ({ ammo, readyAt: 0, lockTarget: null, lock: 0 }))
          ],
          flaresReadyAt: mine ? mine.fr : 0,
          flareCount: w.fc,
          abilityReadyAt: mine ? mine.ar : 0,
          spottedUntil: w.su ?? 0,
          lastDamagedBy: mine ? mine.ld : null,
          alive: w.d !== 1
        };
        if (mine?.sp !== undefined)
          v.spotProgress = mine.sp;
        if (mine?.sc !== undefined)
          v.spotCandidate = mine.sc;
        return v;
      }),
      players,
      ...ships ? { ships } : {},
      ...m.craters ? { craters: m.craters } : {},
      projectiles: m.projectiles.map((x) => ({ id: x.id, weapon: x.w, owner: x.o, vehicle: x.vh, team: x.t, position: x.p, velocity: x.v, age: x.a, ttl: x.l })),
      missiles: m.missiles.map((x) => {
        const out = {
          id: x.id,
          weapon: x.w,
          owner: x.o,
          vehicle: x.vh,
          team: x.t,
          position: x.p,
          velocity: x.v,
          target: x.tg,
          steered: x.st === 1,
          age: x.a,
          ttl: x.l
        };
        if (x.se !== undefined)
          out.seat = x.se;
        return out;
      }),
      flares: m.flares.map((x) => ({ id: x.id, vehicle: x.vh, position: x.p, velocity: x.v, age: x.a, ttl: x.l })),
      scores: m.scores,
      matchEndsAt: m.matchEndsAt,
      matchStartedAt: m.matchStartedAt,
      intermission: m.intermission,
      ack: m.ack
    };
  };
}

// src/sim/loopback.ts
function createLoopbackRoom(config, name, handlers, options = {}) {
  const now = options.now ?? (() => performance.now());
  let open = true;
  const outbox = [];
  let flushing = false;
  const decode = createSnapshotDecoder();
  const flush = () => {
    flushing = false;
    const batch = outbox.splice(0);
    for (const raw of batch)
      if (open)
        handlers.onMessage(decode(JSON.parse(raw)));
  };
  const enqueue = (text) => {
    if (!open)
      return;
    outbox.push(text);
    if (!flushing) {
      flushing = true;
      queueMicrotask(flush);
    }
  };
  const engine = new RoomEngine(options.code ?? "local", sanitizeConfig({ ...DEFAULT_ROOM_CONFIG, listed: false, ...config }), {
    send: (_id, message) => enqueue(JSON.stringify(message)),
    sendText: (_id, text) => enqueue(text)
  });
  handlers.onStatus?.("connecting");
  const playerId = engine.addPlayer(name);
  queueMicrotask(() => {
    if (open)
      handlers.onStatus?.("open");
  });
  let last = now();
  const timer = options.manual ? undefined : setInterval(() => {
    const t = now();
    engine.advance((t - last) / 1000);
    last = t;
  }, options.intervalMs ?? 1000 / 60);
  return {
    engine,
    playerId,
    send(message) {
      if (!open)
        return;
      engine.handle(playerId, JSON.parse(JSON.stringify(message)));
    },
    close() {
      if (!open)
        return;
      open = false;
      if (timer !== undefined)
        clearInterval(timer);
      engine.removePlayer(playerId);
      handlers.onStatus?.("closed");
    },
    rtt: () => 0,
    step(seconds) {
      engine.advance(seconds);
    }
  };
}

// astra-check.ts
var models = resolve(process.argv[2] ?? "Games/Wings/models");
assert.deepEqual(VEHICLE_KINDS, ["fighter", "apache", "warthog", "blackbird", "bomber", "astra-interceptor", "astra-trainer"]);
assert.deepEqual(VEHICLE_KINDS.slice(0, 5).map((k) => [VEHICLES[k].cruise, VEHICLES[k].boost]), [[135, 185], [75, 98], [105, 135], [190, 260], [150, 180]]);
var hashes = ["4b718b8b7fe0c32c85adb373b421dc08e4500bef4ae87f82c62fcba5ca4bf83e", "98f01e24c65201e70da94ceaf3638555880ed9ecea1595dcb082e2ed490c7b1d"];
var results = [];
for (const [index, kind] of ["astra-interceptor", "astra-trainer"].entries()) {
  const messages = [];
  const config = { ...DEFAULT_ROOM_CONFIG, bots: 0, listed: false };
  const room = createLoopbackRoom(config, "Astra check", { onMessage: (m) => messages.push(m) }, { manual: true });
  await Promise.resolve();
  assert.equal(room.engine.config.listed, false);
  assert.equal(room.engine.config.bots, 0);
  room.send({ type: "spawn", kind: "__proto__" });
  await Promise.resolve();
  assert.equal(room.engine.vehicles.length, 0);
  assert(messages.some((m) => m.type === "error" && m.message === "Unknown aircraft kind."));
  room.send({ type: "spawn", kind });
  const vehicle = room.engine.vehicles.find((v) => v.seats[0] === room.playerId);
  assert.equal(vehicle.kind, kind);
  assert.equal(vehicle.flight.kind, kind);
  const start = [...vehicle.flight.position];
  for (let i = 1;i <= 900; i++) {
    room.send({ type: "input", seq: i, flight: { aim: null, throttle: 1, roll: 0, yaw: i > 780 ? 0.15 : 0, pitch: i > 120 ? 0.35 : 0, boost: true, brake: false } });
    room.step(TICK_DT);
  }
  await Promise.resolve();
  assert(vehicle.alive && !vehicle.flight.onGround);
  assert(vehicle.flight.position[1] > start[1] + 50);
  assert(vehicle.flight.position.every(Number.isFinite));
  assert(messages.some((m) => m.type === "snapshot" && m.vehicles.some((v) => v.kind === kind)));
  const desc = CONFIG[kind];
  assert.equal(VEHICLES[kind].model, `models/${desc.file}.glb`);
  const bytes = readFileSync(resolve(models, `${desc.file}.glb`));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), hashes[index]);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const names = gltf.nodes.map((n) => n.name);
  for (const name of [...desc.pivots, ...desc.anchors.map((a) => a.node)])
    assert(names.includes(name), name);
  assert(!desc.pivots.includes("gear"));
  assert.deepEqual(desc.spinners, index ? [{ name: "propeller", axis: "z", speed: 40, driver: "engine" }] : []);
  const rig = new CameraRig(new PerspectiveCamera);
  rig.cockpitBody(TICK_DT, kind, [0, 100, 0], [0, 0, 0, 1], 0, 0);
  assert(rig.pos.toArray().every(Number.isFinite));
  assert(Math.abs(rig.pos.y - 101.35) < 0.000001);
  results.push({ kind, start, end: vehicle.flight.position, speed: Math.hypot(...vehicle.flight.velocity), cockpit: rig.pos.toArray(), pitchQuaternionX: rig.quat.x, bytes: bytes.length });
  room.close();
}
assert.notEqual(results[0].speed, results[1].speed);
assert.notEqual(results[0].pitchQuaternionX, results[1].pitchQuaternionX);
console.log(JSON.stringify(results));
console.log("PASS: both selectable Astra kinds, offline config, validated spawn, wire snapshots, ordinary-input takeoff/turn, immutable GLBs, rig descriptors and cockpit math. No rendered flight/material/thumbnail acceptance.");
