/*
song form

[
    [duration, instrument, pitch, duration, ...],
]

Syntax:
500: 64.4~500 + c5~1000
[500, 'sine', 64.4, 500, 'sine', 'c5', 1000]
Comma between each tune element. Whitespace ignored.
*/
import { instrumentKey, reverseInstrumentKey } from '../api.js';
export const textToTune = (text) => {
    const elements = text.replace(/\s/g, '').split(',');
    const tune = [];
    for (const element of elements) {
        if (!element)
            continue;
        const [durationRaw, notesRaw] = element.split(':');
        const duration = Math.round(parseInt(durationRaw ?? '0', 10));
        const notes = (notesRaw || '').split('+').map((noteRaw) => {
            if (!noteRaw)
                return [];
            const [, pitchRaw, instrumentRaw, durationRaw] = noteRaw.match(/^(.+)([~\-^\/])(.+)$/);
            return [
                instrumentKey[instrumentRaw] ?? 'sine',
                isNaN(parseInt(pitchRaw ?? '', 10)) ? pitchRaw : parseInt(pitchRaw, 10),
                parseInt(durationRaw ?? '0', 10)
            ];
        });
        tune.push([duration, ...notes].flat());
    }
    return tune;
};
export const tuneToText = (tune) => {
    const groupNotes = (notes) => {
        const groups = [];
        for (let i = 0; i < notes.length; i++) {
            if (i % 3 === 0) {
                groups.push([notes[i]]);
            }
            else {
                groups[groups.length - 1].push(notes[i]);
            }
        }
        return groups;
    };
    const notesToString = ([duration, ...notes]) => (notes.length === 0
        ? duration
        : `${duration}: ${groupNotes(notes).map(notesToStringHelper).join(' + ')}`);
    const notesToStringHelper = ([instrument, duration, note]) => (`${duration}${reverseInstrumentKey[instrument]}${note}`);
    return tune.map(notesToString).join(',\n');
};
//# sourceMappingURL=tune.js.map