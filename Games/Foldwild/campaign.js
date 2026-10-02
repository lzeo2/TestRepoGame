// Frozen return lessons use only the existing original roster and authored camps.
export const RIVALS = Object.freeze([
  { id: 0, name: 'Maren', dialogue: 'A meadow lesson: watch your energy before you strike.',
    winDialogue: 'Good timing. The reach is ready for you.', team: [{ speciesId: 'shardip', level: 8 }] },
  { id: 1, name: 'Sola', dialogue: 'We train on the banks. Change partners when the current turns.',
    winDialogue: 'Your partners work well together. Take the quarry path.',
    team: [{ speciesId: 'chimeford', level: 14 }, { speciesId: 'duskcurl', level: 13 }] },
  { id: 2, name: 'Neri', dialogue: 'Keep pressure on the field, but leave energy for recovery.',
    winDialogue: 'You kept your team steady. The ridge route is open.',
    team: [{ speciesId: 'briknudge', level: 20 }, { speciesId: 'vinchew', level: 19 }] },
  { id: 3, name: 'Iven', dialogue: 'The ridge lesson: leave room for every partner and time your shields.',
    winDialogue: 'You have several answers. Follow the path to the hollow.',
    team: [{ speciesId: 'geodelve', level: 27 }, { speciesId: 'trellisect', level: 26 }, { speciesId: 'catarill', level: 26 }] },
  { id: 4, name: 'Oren', dialogue: 'A pause can change the field. Adapt before your next command.',
    winDialogue: 'You have reopened the five routes. Return with your partners.',
    team: [{ speciesId: 'velvetorque', level: 34 }, { speciesId: 'aurelvane', level: 33 }, { speciesId: 'hearthol', level: 33 }] }
].map(rival => Object.freeze({ ...rival, team: Object.freeze(rival.team.map(Object.freeze)) })));

export const FINALE_STAGES = Object.freeze([
  { id: 0, region: 0, pointId: 'camp', name: 'Maren: Energy on the return trail', host: 'Maren',
    lesson: 'Conserve energy, shield when threatened, change partners before exhaustion.',
    team: [{ speciesId: 'geodelve', level: 30 }, { speciesId: 'trellisect', level: 30 }] },
  { id: 1, region: 1, pointId: 'camp', name: 'Sola: Partners on the return trail', host: 'Sola',
    lesson: 'Switch into useful coverage, watch incoming energy and status.',
    team: [{ speciesId: 'catarill', level: 32 }, { speciesId: 'velvetorque', level: 31 }] },
  { id: 2, region: 4, pointId: 'camp', name: 'Oren: The final field record', host: 'Oren',
    lesson: 'Adapt to disruption and protect the team.',
    team: [{ speciesId: 'velvetorque', level: 35 }, { speciesId: 'aurelvane', level: 34 }, { speciesId: 'hearthol', level: 34 }] }
].map(stage => Object.freeze({ ...stage, team: Object.freeze(stage.team.map(Object.freeze)) })));

export const ENDING = 'Your partners brought the route notes home. The trailkeepers add the final pages to the shared field record. All five routes are open. Keep exploring, meet new allies, and complete your own ledger.';
