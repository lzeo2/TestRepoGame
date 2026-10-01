import { baseEngine } from '../base/index.js';
import { bitmapTextToImageData } from './bitmap.js';
export * from './bitmap.js';
export const imageDataEngine = () => {
    const game = baseEngine();
    let legendImages = {};
    let background = '.';
    const timeouts = [];
    const intervals = [];
    const keyHandlers = {
        w: [],
        s: [],
        a: [],
        d: [],
        i: [],
        j: [],
        k: [],
        l: []
    };
    const afterInputs = [];
    const cleanup = () => {
        timeouts.forEach(clearTimeout);
        intervals.forEach(clearInterval);
    };
    const api = {
        ...game.api,
        onInput: (key, fn) => keyHandlers[key].push(fn),
        afterInput: (fn) => afterInputs.push(fn),
        setLegend: (...bitmaps) => {
            game.state.legend = bitmaps;
            legendImages = {};
            for (const [id, desc] of bitmaps)
                legendImages[id] = bitmapTextToImageData(id, desc);
        },
        setBackground: (kind) => background = kind,
        setTimeout: (fn, ms) => {
            const timer = setTimeout(fn, ms);
            timeouts.push(timer);
            return timer;
        },
        setInterval: (fn, ms) => {
            const timer = setInterval(fn, ms);
            intervals.push(timer);
            return timer;
        },
        playTune: () => ({ end() { }, isPlaying() { return false; } })
    };
    return {
        api,
        button(key) {
            for (const fn of keyHandlers[key])
                fn();
            for (const fn of afterInputs)
                fn();
            game.state.sprites.forEach((s) => {
                s.dx = 0;
                s.dy = 0;
            });
        },
        render() {
            const width = () => game.state.dimensions.width;
            const height = () => game.state.dimensions.height;
            const tSize = () => 16;
            const sw = width() * tSize();
            const sh = height() * tSize();
            const out = new ImageData(sw, sh);
            out.data.fill(255);
            for (const t of game.api.getGrid().flat()) {
                const img = legendImages[t.type ?? background];
                if (!img)
                    continue;
                for (let x = 0; x < tSize(); x++)
                    for (let y = 0; y < tSize(); y++) {
                        const tx = t.x * tSize() + x;
                        const ty = t.y * tSize() + y;
                        const src_alpha = img.data[(y * 16 + x) * 4 + 3];
                        if (!src_alpha)
                            continue;
                        out.data[(ty * sw + tx) * 4 + 0] = img.data[(y * 16 + x) * 4 + 0];
                        out.data[(ty * sw + tx) * 4 + 1] = img.data[(y * 16 + x) * 4 + 1];
                        out.data[(ty * sw + tx) * 4 + 2] = img.data[(y * 16 + x) * 4 + 2];
                        out.data[(ty * sw + tx) * 4 + 3] = img.data[(y * 16 + x) * 4 + 3];
                    }
            }
            return out;
        },
        cleanup,
        state: game.state
    };
};
//# sourceMappingURL=index.js.map