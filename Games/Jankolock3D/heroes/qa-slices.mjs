import {odometerSlice} from './odometer-slice.mjs';
import {whitespaceSlice} from './whitespace-slice.mjs';
import {laminateSlice} from './laminate-slice.mjs';
import {cassetteSlice} from './cassette-slice.mjs';
import {officePlantsSlice} from './office-plants-slice.mjs';

export function selectExpansionSlice(hostname,qa,hero) {
  if(qa!=='jank40-slice')return null;
  if(!['localhost','127.0.0.1','[::1]'].includes(hostname))throw new RangeError('Experimental QA profiles are available only on loopback.');
  if(hero===null||hero===undefined||hero===''||hero==='odometer')return odometerSlice;
  if(hero==='whitespace')return whitespaceSlice;
  if(hero==='laminate')return laminateSlice;
  if(hero==='cassette')return cassetteSlice;
  if(hero==='office-plants')return officePlantsSlice;
  throw new RangeError('Experimental QA supports only odometer and whitespace, plus laminate, cassette and office-plants.');
}
