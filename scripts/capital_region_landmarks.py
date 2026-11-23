"""Pinned real source selections for the three offline Canberra region overlays.

Source receipts live in each external capital-regions cache. Runtime models are
original archetypes, not observed architecture or verified public entrances.
Tuple fields: slug, display name, source reference, visual design or None,
ordered promoted building references. Grounds-only pins promote no building.
"""

REGIONS = {
    'belconnen': {
        'title': 'Belconnen',
        'places': {'Belconnen', 'Bruce', 'Aranda', 'Cook', 'Macquarie', 'Page',
                   'Scullin', 'Florey', 'Weetangera', 'Hawker', 'McKellar',
                   'Lawson', 'Kaleen'},
        'sites': (
            ('westfield-belconnen', 'Westfield Belconnen', 'way/27795123', 'mall',
             ('way/27795123',)),
            ('belconnen-library', 'Belconnen Library', 'way/41309997', 'library',
             ('way/41309997',)),
            ('belconnen-arts-centre', 'Belconnen Arts Centre', 'way/50619204', 'exhibition',
             ('way/50619204', 'way/781147923')),
            ('university-of-canberra', 'University of Canberra', 'relation/13292766', 'campus',
             ('way/22942732',)),
            ('ais-arena', 'AIS Arena', 'way/57767858', 'arena', ('way/57767858',)),
            ('canberra-stadium', 'GIO Stadium Canberra', 'way/57769299', None,
             ('way/57769381', 'way/57769631', 'way/57769638', 'way/57769717')),
            ('cisac', 'Canberra International Sports and Aquatic Centre', 'node/664202713', 'arena',
             ('way/52123012',)),
            ('university-of-canberra-hospital', 'University of Canberra Hospital', 'way/569916788', None, ()),
        ),
        'waters': (('lake-ginninderra', 'Lake Ginninderra', 'relation/409874'),),
    },
    'north': {
        'title': 'North Canberra',
        'places': {'Ainslie', 'Downer', 'Hackett', 'Watson', 'Mitchell', 'Gungahlin',
                   'Franklin', 'Harrison', 'Palmerston', 'Ngunnawal'},
        'sites': (
            ('epic', 'Exhibition Park in Canberra (EPIC)', 'way/31802192', 'exhibition',
             ('way/57787114', 'way/57786943')),
            ('gungahlin-library', 'Gungahlin Public Library', 'way/219848276', 'library',
             ('way/219848276',)),
            ('gungahlin-leisure', 'Gungahlin Leisure Centre', 'way/387307803', 'arena',
             ('way/387307803',)),
            ('marketplace-gungahlin', 'Marketplace Gungahlin', 'relation/9505276', 'mall',
             ('way/50638379', 'way/50638376')),
            ('watson-shops', 'Watson Shops', 'way/543790961', None, ('way/543790961',)),
            ('hackett-shops', 'Hackett Shops', 'way/51537737', None, ('way/256143627',)),
        ),
        'waters': (('yerrabi-pond', 'Yerrabi Pond', 'relation/331482'),
                   ('gungahlin-pond', 'Gungahlin Pond', 'relation/1222')),
    },
    'south': {
        'title': 'South Canberra',
        'places': {'Woden', 'Phillip', 'Deakin', 'Hughes', 'Garran', 'Chifley',
                   'Pearce', 'Mawson', "O'Malley", 'Torrens', 'Waramanga',
                   'Wanniassa', 'Oxley', 'Greenway'},
        'sites': (
            ('woden-library', 'Woden Library', 'node/9536031503', 'library', ('way/172242833',)),
            ('woden-town-square', 'Woden Town Square', 'way/157065616', None, ()),
            ('canberra-hospital', 'Canberra Hospital', 'way/179102074', 'hospital',
             ('way/179102072', 'way/1280405305')),
            ('south-point-tuggeranong', 'South Point Tuggeranong', 'way/30162796', 'mall',
             ('way/213581450',)),
            ('tuggeranong-library', 'Tuggeranong Library', 'node/9536028924', 'library', ('way/213808085',)),
            ('tuggeranong-town-park', 'Tuggeranong Town Park', 'way/31927943', None, ()),
        ),
        'waters': (('lake-tuggeranong', 'Lake Tuggeranong', 'relation/67720'),),
    },
}
