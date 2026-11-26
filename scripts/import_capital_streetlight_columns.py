#!/usr/bin/env python3
"""Regenerate the local ACT streetlight column subset from its reviewed source response."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from build_capital_drive_map import xy

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'Games/Capital Drive/streetlight-columns.js'
LAYER = 'https://services1.arcgis.com/E5n4f1VY84i0xSjy/arcgis/rest/services/ACTGOV_Streetlight_Column_Assets/FeatureServer/1'
DIGEST = '75caf2ca7bfaf0410a12d01b5d26c3fdf1666b3bd9ab21d3daf213b2ef01753d'
ROADS = ('FRANKLIN STREET','BOUGAINVILLE STREET','FURNEAUX STREET','GILES STREET','EYRE STREET',
         'TELOPEA PARK EAST','BUNDA STREET','ALINGA STREET','WOOLLEY STREET','CHALLIS STREET','EMU BANK','CORINNA STREET')
SUBURBS = ('GRIFFITH','KINGSTON','BARTON','CITY','BRADDON','DICKSON','BELCONNEN','PHILLIP')
FIELDS = 'ASSET_ID,SUBURB,ADDRESS,COLUMN_TYPE,COLUMN_HEIGHT,COLUMN_HEIGHT_UNIT,OUTREACH_ARM_LENGTH,OUTREACH_ARM_LENGTH_UNIT,LAMP_TYPE,LAMP_COUNT'
WHERE = ("OPERATIONAL_STATE='ACTIVE' AND OWNERSHIP='ROADS ACT' AND SUBURB IN ("+
         ','.join(repr(s) for s in SUBURBS)+") AND ("+' OR '.join("ADDRESS LIKE '"+r+",%'" for r in ROADS)+')')

def build(raw):
    if hashlib.sha256(raw).hexdigest() != DIGEST:
        raise ValueError('ACT survey changed. Review it before updating the pinned digest.')
    data = json.loads(raw)
    if data.get('exceededTransferLimit'):
        raise ValueError('Incomplete ACT streetlight response')
    rows=[]
    for feature in data['features']:
        p=feature['properties']
        if feature['geometry']['type'] != 'Point' or p['COLUMN_TYPE'] in {'BUS SHELTER','IN GROUND','STRUCTURE'}: continue
        if p['LAMP_COUNT'] not in {1,2} or p['COLUMN_HEIGHT_UNIT']!='Metre' or not 3<=p['COLUMN_HEIGHT']<=14: continue
        x,z=xy(*feature['geometry']['coordinates'][:2])
        arm=p['OUTREACH_ARM_LENGTH'] if p['OUTREACH_ARM_LENGTH_UNIT']=='Metre' else None
        lamp=p['LAMP_TYPE'] or ''
        tint='led' if lamp=='LIGHT EMITTING DIODE' else 'sodium' if 'SODIUM' in lamp else 'other'
        column='heritage' if 'HERITAGE' in p['COLUMN_TYPE'] else 'timber' if 'WOODEN' in p['COLUMN_TYPE'] else 'concrete' if 'CONCRETE' in p['COLUMN_TYPE'] else 'steel'
        street=p['ADDRESS'].split(',')[0].title()
        rows.append([p['ASSET_ID'],x,z,p['COLUMN_HEIGHT'],arm,tint,column,street])
    rows.sort()
    if len({row[0] for row in rows}) != len(rows): raise ValueError('Duplicate ACT column')
    return ('// Generated from ACT Government Streetlight Column Assets, CC BY 4.0.\n'
            '// [ACT ID, x, z, column metres, recorded outreach metres, lamp, column family, street].\n'
            'export const STREETLIGHT_COLUMNS = Object.freeze([\n'+
            ''.join('  '+json.dumps(row,separators=(',',':'))+',\n' for row in rows)+'].map(Object.freeze));\n')

def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--source',type=Path,required=True,help='External pinned GeoJSON response')
    cli.add_argument('--fetch',action='store_true',help='Fetch the response if the cache file is absent')
    cli.add_argument('--check',action='store_true')
    args=cli.parse_args()
    if args.fetch and not args.source.exists():
        query=urlencode({'where':WHERE,'orderByFields':'ASSET_ID','outFields':FIELDS,'outSR':'4326','f':'geojson'})
        with urlopen(Request(LAYER+'/query?'+query,headers={'User-Agent':'CapitalDriveGeoImporter/1.0'}),timeout=30) as response: raw=response.read()
        content=build(raw)
        args.source.write_bytes(raw)
    else: content=build(args.source.read_bytes())
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text()!=content: raise SystemExit('Stale streetlight column source')
    else: OUTPUT.write_text(content)
    print('PASS reviewed ACT streetlight column snapshot',DIGEST)

if __name__=='__main__': main()
