// Small original exchanges keyed to progress the mission owner has accepted.
// The radio follows the current attempt and never advances an objective.
const BEATS = {
  'student-paper-chase': [
    [['Kit','They sent us a picture of the new club speakers. I zoomed in. It was the box from last year.']],
    [['Mara','I found the refund in a stock ledger. Do you know anyone working at Coals?'],['Kit','Give me ten minutes and an apron.']],
  ],
  'student-extra-credit': [
    [['Kit','My CV says I work well under pressure. It means I carried a drum kit onto the 59.']],
    [['Mara','Look at the order reference when you finish the shift. Keep your copy.']],
  ],
  'corporate-present-tense': [
    [['Jules','How did the practice run go?'],['Rowan','The finance director liked slide eight. There were seven slides.']],
    [['Jules','Congratulations. Your blank presentation already has three requests for the template.'],['Rowan','Put me down as unavailable until lunch.']],
  ],
  'corporate-lunch-breakpoint': [
    [['Rowan','If anyone from the office calls, I am in a meeting with a large bowl of noodles.']],
    [['Dot','Whose bag is that? Every time I get this booth there is a bag under my feet.'],['Rowan','Hang on. Mine is still on my shoulder.']],
    [['Jules','You left for a quiet lunch. Why is my group chat full of pictures of your shirt?']],
  ],
  'basement-touch-grass': [
    [['Mara','That case comes with a handle, Milo. The dining chair stays home this time.']],
    [['Milo','Case packed. Keys in hand. For once those are two separate achievements.']],
    [['Mara','You still have my old car key. See what happens when you turn it.'],['Milo','Oh. That is considerably faster than walking.']],
    [['Milo','There’s a depot stamp under the shipping label. Why would they label a label?']],
  ],
  'basement-first-delivery': [
    [['Mara','If two labels come off that parcel, hang onto both.']],
    [['Milo','Same parcel number on both. One says delivered yesterday. I am literally holding it.']],
    [['Mara','Over here. Show me that bottom label before anyone peels it off.']],
  ],
  'three-receipts': [
    [['Kit','Mine says the club spent the money.'],['Rowan','Mine says I approved that spend.'],['Milo','Mine says I owe it. So who actually got paid?']],
    [['Mara','I can take the originals on the Crescent. Or make a backup at Milo’s. Your call.']],
    [['Milo','Clear a corner on the case table. One copy for each name on the bill.'],['Kit','Give me the club copy. I promised them something they could hold.']],
  ],
  'late-parcel': [
    [['Mara','The paperwork has the same collector against all three accounts. Milo, you have the wheel.']],
    [['Rowan','That is my approval number on the case. They even kept the typo.'],['Kit','Frame that typo. It might be the first useful thing your office made.']],
  ],
  'home-by-the-lake': [
    [['Milo','Three of us in one car. My passenger seat used to be for takeaway.']],
    [['Kit','You never told us about this place.'],['Milo','You never needed three sets of the same ledger before.']],
    [['Rowan','I recognise that signature. I was in the room when he signed it.']],
  ],
  'across-the-water': [
    [['Rowan','I can see the bridge. My office looks very small from this side.']],
  ],
  'three-clean-copies': [
    [['Kit','I told the club to hold off selling raffle tickets. I would quite like to be right about that.']],
    [['Rowan','I signed the correction in ink. PowerPunt is going to have to live with that.']],
    [['Milo','Three copies. The last one is mine.']],
  ],
};
const BACKUP = [['Milo','Bring the originals to my place. The case table is already clear.'],['Rowan','I spent a year approving things without keeping a copy. I am coming with you.']];
const DIRECT = [['Kit','Mara gets the originals. If she signs for them, we keep the receipt.']];
const HEAT = {
  'late-parcel':[['Kit','The case is here. Whatever happens to the car, that is the part we came for.']],
  'student-paper-chase':[['Kit','I can hear that alarm from here. Remind me never to sit next to it at assembly.']],
};

export function createCampaignRadio(panel) {
  const [speaker,text] = panel.children;
  let owner=null, stage=-1, route=null, lines=null, cursor=0, remaining=0, spokenHeat=false, shown=null;
  function show(line) {
    const conceal=!line;
    if (panel.hidden !== conceal) panel.hidden=conceal;
    if (!line || shown===line) return;
    shown=line;
    speaker.textContent=line[0];
    text.textContent=line[1];
  }
  function update(dt,mission,{paused=false,wanted=0}={}) {
    if (!mission || mission.developer) {
      owner=null;stage=-1;route=null;shown=null;lines=null;spokenHeat=false;
      if (!panel.hidden) panel.hidden=true;
      return;
    }
    if (paused) {
      if (!panel.hidden) panel.hidden=true;
      return;
    }
    if (owner!==mission || stage!==mission.stage || route!==mission.meetingRoute) {
      const routeChanged=owner===mission && stage===mission.stage && route!==mission.meetingRoute;
      if (owner!==mission) spokenHeat=false;
      owner=mission;stage=mission.stage;route=mission.meetingRoute;cursor=0;remaining=0;shown=null;
      lines=BEATS[mission.id]?.[stage];
      if (mission.id==='three-receipts' && stage===1) {
        if (route==='backup') lines=BACKUP;
        else if (routeChanged) lines=DIRECT;
      }
    }
    if (remaining>0) {
      remaining-=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.25));
      if (remaining>0) { show(shown); return; }
    }
    if ((!lines || cursor>=lines.length) && !spokenHeat && stage===1 && wanted>0 && Object.hasOwn(HEAT,mission.id) &&
        (mission.id!=='late-parcel' || mission.escapeReached)) {
      lines=HEAT[mission.id];cursor=0;spokenHeat=true;
    }
    if (!lines || cursor>=lines.length) { show(null); return; }
    const line=lines[cursor++];
    remaining=Math.max(3.2,Math.min(6.5,1.25+line[1].length/17));
    show(line);
  }
  return {update};
}
