#!/usr/bin/env python3
"""Execute the live texture loaders and their Image callbacks in Node's VM.

Run: python3 scripts/test_ovo_texture_fallback.py (also works when Games is sparse).
"""
from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def source(path):
    file = ROOT / path
    return file.read_text() if file.exists() else subprocess.check_output(
        ['git', 'show', 'HEAD:' + path], cwd=ROOT, text=True)


ovo = source('Games/Ovo/src/modloaders/util/ovo.js')
community = source('Games/Ovo/src/mods/modloader/community.js')
# Extract whole named loaders, not a rewritten callback or a text-only assertion.
loaders = [
    ('Modloader', ovo[ovo.index('let addModloaderButtonTexture ='):]
     + '\naddModloaderButtonTexture();'),
    ('CommunityLevels', 'const utils = {' + community[
        community.index('    addButtonTexture() {'):
        community.index('    async playLevel(level) {')]
     + '}; utils.addButtonTexture();'),
]
subprocess.run(['node', '-'], cwd=ROOT, input=r'''
const assert = require('node:assert/strict');
const vm = require('node:vm');
const loaders = LOADERS;
for (const [name, source] of loaders) {
  for (const gpu of [false, true]) {
    const images = [], uploads = [], draws = [];
    class Sprite {}
    class Image {
      constructor() { images.push(this); }
    }
    const layer = name => ({name, initial_instances: [], startup_initial_instances: []});
    const menu = {sheetname: 'Main Menu', layers: [layer('Layer 1')]};
    const levels = {name: 'Level Menu', sheetname: 'Main Menu', layers: [layer('Layer 0')]};
    const pause = {layers: [layer('Pause'), layer('End Game'), layer('End Card')]};
    const sprite = {plugin: new Sprite(), index: 7, animations: [],
      all_frames: [{texture_file: 'menubutton.png'}], instances: [{uiType: 'button'}]};
    const runtime = {
      glwrap: gpu ? {loadTexture(...args) { uploads.push(args); return {gpu: true}; }} : null,
      linearSampling: true, types_by_index: [sprite], findWaitingTexture: () => null,
      layouts: {'Level 1': {layers: [{name: 'Overlay', initial_instances: [[[20], 'Reload']]}]}},
      layouts_by_index: [menu, levels, pause], running_layout: menu, changelayout: null
    };
    vm.runInNewContext(source, {runtime, Image, cr: {plugins_: {Sprite}, seal: Object.seal},
      console: {log() {}, error(text) {throw Error(text);}},
      document: {createElement(tag) {
        assert.equal(tag, 'canvas');
        return {getContext: () => ({drawImage: (...args) => draws.push(args)}),
          toDataURL: () => 'data:image/png;base64,test'};
      }}}, {timeout: 1000});
    assert.equal(images.length, 3);
    const animation = sprite.animations[0];
    assert.equal(animation.name, name);
    assert.equal(animation.frames.length, 3);
    animation.frames.forEach((frame, i) => {
      assert.equal(frame.texture_img, images[i]);
      assert.equal(images[i].src, frame.texture_file);
      assert.equal(frame.width, 64);
      assert.equal(frame.height, 64);
      assert.equal(frame.offx, i === 1 ? 66 : 0);
      assert.equal(frame.spritesheeted, true);
      images[i].onload(); // Run the actual callback after frame construction, like the browser.
      assert.equal(!!frame.webGL_texture, gpu);
      assert.equal(frame.getDataUri(), 'data:image/png;base64,test');
      frame.getDataUri(); // Cached Canvas2D data URI must not draw twice.
      assert.equal(draws[i][0], images[i]);
      assert.deepEqual(draws[i].slice(1), [frame.offx, 0, 64, 64, 0, 0, 64, 64]);
      assert.equal(runtime.changelayout, menu);
      if (gpu) assert.deepEqual(uploads[i], [images[i], true, true, 0]);
    });
    assert.equal(draws.length, 3);
    assert.equal(uploads.length, gpu ? 3 : 0);
    for (const layout of [menu, levels, pause]) for (const l of layout.layers) {
      assert.equal(l.initial_instances.length, 3);
      assert.equal(l.startup_initial_instances.length, 3);
      assert.equal(l.initial_instances[0][5][1], name);
    }
  }
}
console.log('Ovo: 12 actual image callbacks OK; Canvas2D frames/layout refresh preserved; WebGL uploads OK');
'''.replace('LOADERS', json.dumps(loaders)), text=True, check=True)
