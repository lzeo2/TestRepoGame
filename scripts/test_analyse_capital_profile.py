#!/usr/bin/env python3
"""Small parser regression: variable sample weights, recursion and escaped HTML."""
from analyse_capital_profile import analyse, render, sample_weights

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
# Actual failure shape: a -2 us reversal between 1468 and 1143 us.
w, c = sample_weights([1468, -2, 1143])
assert w == [1468, 0, 1141] and sum(w) == 2609
assert c['negative_delta_count'] == 1 and c['negative_delta_magnitude_us'] == 2
assert c['raw_delta_sum_us'] == c['weighted_delta_sum_us'] == 2609
assert sample_weights([100, -2, 1, 0, 3])[0] == [100, 0, 0, 0, 2]
assert sample_weights([100, -2, -3, 10])[0] == [100, 0, 0, 5]
assert sample_weights([100, -10, 10])[0] == [100, 0, 0]
for invalid in ([100, -11, 100], [1000]+[-10, 10]*11, [100, -2, 1], [float('nan')], [float('inf')], [True]):
    try:
        sample_weights(invalid)
    except ValueError:
        pass
    else:
        raise AssertionError(f'invalid timestamp weights accepted: {invalid}')
p['timeDeltas'] = [1468, -2, 1143]
r = analyse(p)
assert abs(r['self_sum_ms'] - 2.609) < 1e-12
assert r['rows'][1]['self_ms'] == 1.468 and r['rows'][2]['self_ms'] == 1.141
assert 'Timestamp correction:' in render(r, 'repaired')
print('PASS CPU profile weights, recursion, HTML escaping, bounded timestamp debt and strict invalid-input rejection')
