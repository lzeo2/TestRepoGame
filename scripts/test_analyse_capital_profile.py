#!/usr/bin/env python3
"""Small parser regression: variable sample weights, recursion and escaped HTML."""
from analyse_capital_profile import analyse, render

frame = lambda name: dict(functionName=name, url='a.js', lineNumber=0, columnNumber=1)
p = dict(startTime=0, endTime=10000, nodes=[
    dict(id=1, callFrame=frame('(root)'), children=[2]),
    dict(id=2, callFrame=frame('recur'), children=[3]),
    dict(id=3, callFrame=frame('recur'))], samples=[2, 3, 3], timeDeltas=[1000, 2000, 4000])
r = analyse(p)
assert r['sampled_ms'] == r['self_sum_ms'] == 7
assert [x['inclusive_ms'] for x in r['rows']] == [7, 7, 6]
assert r['bottom_up'][0]['self_ms'] == 7 and r['bottom_up'][0]['inclusive_ms'] == 13
p['nodes'][1]['callFrame']['functionName'] = '</script><script>bad()'
assert '</script><script>bad()' not in render(analyse(p), '<unsafe>')
p['timeDeltas'].pop()
try:
    analyse(p)
except ValueError:
    pass
else:
    raise AssertionError('mismatched sample weights accepted')
print('PASS CPU profile weights, recursive inclusive totals, HTML escaping and malformed samples')
