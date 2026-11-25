import { createSkillTrees } from './skill-trees.js';

const MODES = ['street', 'campaign'];
const NEUTRAL = createSkillTrees().effects({ mode: 'free' });
const COMPLETIONS = {
  'job-complete': ['job', 'jobId'],
  'work-complete': ['work', 'serviceId'],
  'workout-complete': ['workout', 'serviceId'],
  'complete': ['mission', 'id'],
};

// Own only the progression of training. Jobs, activities and missions validate
// their own completion before delivering the corresponding event here.
export function createCareerTraining(saved) {
  const profiles = Object.fromEntries(MODES.map(mode => [mode, createSkillTrees(saved?.[mode])]));
  function account(mode) { return Object.hasOwn(profiles, mode) ? profiles[mode] : null; }
  function effects(mode, preview = false, crewPresent = false) {
    return preview ? NEUTRAL : account(mode)?.effects({mode, crewPresent}) ?? NEUTRAL;
  }
  function award(event, ctx) {
    if (!ctx || !Object.hasOwn(COMPLETIONS, event?.type) || ctx.inMission || ctx.preview || ctx.practice) return false;
    const rule = COMPLETIONS[event.type];
    const [kind, key] = rule;
    return account(ctx.mode)?.award({kind, id:event[key], success:true}, ctx) ?? false;
  }
  function describe(mode) {
    const tree = account(mode);
    return tree ? {player:tree.describe('player'), crew:tree.describe('crew')} : null;
  }
  function purchase(track, id, ctx) {
    if (!ctx || ctx.inMission || ctx.practice || ctx.preview) return {ok:false,message:'Finish the current activity before spending training points.'};
    return account(ctx.mode)?.purchase(track,id,ctx) ?? {ok:false,message:'Training is available in Street Life and Campaign.'};
  }
  const serialize = () => Object.fromEntries(MODES.map(mode => [mode, profiles[mode].serialize()]));
  return {effects, award, describe, purchase, serialize};
}
