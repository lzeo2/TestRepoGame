// One absolute room clock drives world lighting on every quality preset.
import { Color, DirectionalLight, Group, HemisphereLight, Vector3, type Camera, type Scene } from 'three'
import type { Quality } from '../../sim/types'
import { sampleTimeOfDay } from '../../sim/time-of-day'
import { STORM } from './atmosphere'
import { SUN_DIRECTION } from './settings'
import { setAircraftDaylight } from '../toon'
import { createRealismShadows } from '../realism-shadows'

export function createDaylight(scene: Scene, quality: Quality) {
  const root = new Group()
  root.name = 'World · time of day'
  let key = new DirectionalLight('#ffffff', 0)
  key.name = 'sun'
  key.castShadow = quality !== 'low'
  key.shadow.mapSize.set(1024, 1024)
  Object.assign(key.shadow.camera, { left: -700, right: 700, top: 700, bottom: -700, near: 1, far: 5000 })
  key.shadow.camera.updateProjectionMatrix()
  key.shadow.bias = -0.0002
  key.shadow.normalBias = 1.5
  let shadows = createRealismShadows(key, quality)
  let shadowQuality = quality
  const hemi = new HemisphereLight('#ffffff', '#ffffff', 1)
  hemi.name = 'daylight ambient'
  root.add(key, key.target, hemi)
  const focus = new Vector3()
  const night = {
    zenith: new Color('#020511'), fog: new Color('#070c18'), horizon: new Color('#101a2c'),
    cloudDark: new Color('#030610'), cloudLight: new Color('#10182a'), ground: new Color('#090c15'),
  }
  const day = {
    zenith: new Color('#457bb4'), fog: new Color('#8eabba'), horizon: new Color('#d0d8cd'),
    cloudDark: new Color('#566875'), cloudLight: new Color('#c0cbd0'), ground: new Color('#414537'),
  }
  const sunset = new Color('#cf7846'), sunColor = new Color('#fff4d8'), warmSun = new Color('#ff9e58')
  let state = sampleTimeOfDay(0)
  const positionSun = () => {
    key.target.position.copy(focus)
    key.position.copy(focus).addScaledVector(SUN_DIRECTION, 2400)
    key.target.updateMatrixWorld()
    key.updateMatrixWorld()
  }
  const setTime = (seconds: number) => {
    state = sampleTimeOfDay(seconds)
    const { daylight, twilight } = state
    SUN_DIRECTION.set(...state.sun)
    STORM.sunDirection.value.copy(SUN_DIRECTION)
    STORM.daylight.value = daylight
    STORM.ambient.value = state.ambientIntensity * 0.55
    key.color.copy(sunColor).lerp(warmSun, twilight)
    key.intensity = state.sunIntensity
    STORM.sunLight.value.copy(key.color).multiplyScalar(key.intensity * 0.35)
    hemi.color.copy(night.horizon).lerp(day.horizon, daylight).lerp(sunset, twilight * 0.3)
    hemi.groundColor.copy(night.ground).lerp(day.ground, daylight)
    hemi.intensity = state.ambientIntensity
    STORM.zenith.value.copy(night.zenith).lerp(day.zenith, daylight)
    STORM.fogColor.value.copy(night.fog).lerp(day.fog, daylight)
    STORM.fogBreak.value.copy(night.horizon).lerp(day.horizon, daylight).lerp(sunset, twilight * 0.65)
    STORM.cloudDark.value.copy(night.cloudDark).lerp(day.cloudDark, daylight)
    STORM.cloudLight.value.copy(night.cloudLight).lerp(day.cloudLight, daylight).lerp(sunset, twilight * 0.25)
    // Rotate the bright horizon with the sun. Its XZ projection is never zero on this inclined arc.
    STORM.breakDir.value.set(SUN_DIRECTION.x, SUN_DIRECTION.z).normalize()
    STORM.fogBase.value = state.fogBase
    STORM.fogSea.value = state.fogSea
    scene.environmentIntensity = 0.03 + daylight * 0.97
    if (scene.background instanceof Color) scene.background.copy(STORM.fogColor.value)
    setAircraftDaylight(daylight)
    positionSun()
  }
  setTime(0)
  return {
    root, get key() { return key }, hemi,
    setTime,
    prepareShadows(camera: Camera) { shadows.update(camera) },
    setFocus(position: Vector3) { focus.copy(position); positionSun() },
    setQuality(q: Quality) {
      if (q === shadowQuality) return
      // A new light ID invalidates Three's cached lighting graph; replacing shadowNode alone does not.
      shadows.dispose()
      const previous = key
      key = previous.clone()
      root.remove(previous, previous.target)
      previous.dispose()
      root.add(key, key.target)
      shadows = createRealismShadows(key, q)
      shadowQuality = q
      positionSun()
    },
    flash(intensity: number) { hemi.intensity = state.ambientIntensity * (1 + intensity * 0.5) },
    dispose() { shadows.dispose(); key.dispose(); root.removeFromParent() },
  }
}
