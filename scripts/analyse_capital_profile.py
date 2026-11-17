#!/usr/bin/env python3
"""Standalone, sample-weighted Chrome/Node CPU flamegraph and bottom-up report."""
import argparse
import html
import json
from pathlib import Path


def analyse(profile):
    nodes = {n['id']: n for n in profile['nodes']}
    parents = {c: n['id'] for n in nodes.values() for c in n.get('children', [])}
    samples, deltas = profile.get('samples', []), profile.get('timeDeltas', [])
    if len(samples) != len(deltas):
        raise ValueError('samples and timeDeltas must have equal lengths')
    own = dict.fromkeys(nodes, 0.0)
    inclusive = dict.fromkeys(nodes, 0.0)
    counts = dict.fromkeys(nodes, 0)
    for sample, delta in zip(samples, deltas):
        if sample not in nodes or delta < 0:
            raise ValueError('Unknown sample node or negative sample duration')
        own[sample] += delta / 1000
        counts[sample] += 1
        seen = set()
        while sample is not None:
            if sample in seen:
                raise ValueError('CPU profile contains a parent cycle')
            seen.add(sample)
            inclusive[sample] += delta / 1000
            sample = parents.get(sample)
    rows = []
    for key, node in nodes.items():
        f = node['callFrame']
        rows.append(dict(id=key, parent=parents.get(key), function=f.get('functionName') or '(anonymous)',
                         url=f.get('url', ''), line=f.get('lineNumber', -1)+1,
                         column=f.get('columnNumber', -1)+1, self_ms=own[key],
                         inclusive_ms=inclusive[key], samples=counts[key]))
    groups = {}
    for row in rows:
        key = tuple(row[k] for k in ('function', 'url', 'line', 'column'))
        group = groups.setdefault(key, dict(zip(('function', 'url', 'line', 'column'), key), self_ms=0, inclusive_ms=0, samples=0))
        group['self_ms'] += row['self_ms']
        # Recursive frames can overlap: grouped inclusive is explicitly a frame sum.
        group['inclusive_ms'] += row['inclusive_ms']
        group['samples'] += row['samples']
    total = sum(deltas)/1000
    return dict(sample_count=len(samples), sampled_ms=total,
                profile_elapsed_ms=(profile.get('endTime', 0)-profile.get('startTime', 0))/1000,
                self_sum_ms=sum(own.values()), rows=rows,
                bottom_up=sorted(groups.values(), key=lambda r: r['self_ms'], reverse=True))


def render(report, title):
    payload = json.dumps(report).replace('<', '\\u003c')
    return '''<!doctype html><meta charset="utf-8"><title>''' + html.escape(title) + '''</title>
<style>body{font:15px system-ui;margin:24px;color:#17212b}input,button{padding:10px}svg{width:100%;border:1px solid #aaa}text{pointer-events:none;font:12px monospace}rect{cursor:pointer;stroke:white;stroke-width:.5}table{border-collapse:collapse;width:100%}th,td{padding:7px;text-align:left;border-bottom:1px solid #ddd}td:first-child{overflow-wrap:anywhere}p{max-width:1000px}</style>
<h1>''' + html.escape(title) + '''</h1>
<p>Sample-weighted CPU call tree: width is summed timeDeltas, not wall-time duration, GPU work or frame latency. Sampling is statistical. (program), idle, native and garbage-collector samples may be unattributed; do not assign them to JavaScript callers without evidence. Inclusive times overlap; grouped inclusive values sum frame appearances and can double-count recursion.</p>
<p id="totals"></p><label>Search function or source <input id="search" type="search"></label> <button id="reset">Reset zoom</button><p>Click a frame to zoom. Hover for the full source and call stack. Search highlights frames and filters bottom-up rows.</p><svg id="flame" role="img" aria-label="CPU flamegraph"></svg><h2>Bottom-up function totals</h2><table><thead><tr><th>Function / source</th><th>Self ms</th><th>Inclusive frame sum ms</th><th>Samples</th></tr></thead><tbody id="rows"></tbody></table>
<script>
const data=''' + payload + ''';
const byId=new Map(data.rows.map(r=>[r.id,r])),children=new Map();for(const r of data.rows){const a=children.get(r.parent)||[];a.push(r);children.set(r.parent,a)}
let zoom=null;const svg=document.getElementById('flame'),search=document.getElementById('search');
const label=r=>`${r.function} (${r.url}:${r.line}:${r.column})`;
const stack=r=>{let a=[];while(r){a.push(label(r));r=byId.get(r.parent)}return a.reverse().join(' → ')};
function draw(){svg.replaceChildren();const roots=zoom?[byId.get(zoom)]:(children.get(null)||[]),total=roots.reduce((s,r)=>s+r.inclusive_ms,0)||1;let depth=0;
function node(r,x,w,d){if(!r.inclusive_ms)return;depth=Math.max(depth,d);const g=document.createElementNS('http://www.w3.org/2000/svg','g'),rect=document.createElementNS(g.namespaceURI,'rect'),t=document.createElementNS(g.namespaceURI,'title');rect.setAttribute('x',x);rect.setAttribute('y',d*24);rect.setAttribute('width',w);rect.setAttribute('height',23);const match=label(r).toLowerCase().includes(search.value.toLowerCase());rect.setAttribute('fill',search.value&&match?'#ecbb48':`hsl(${(r.id*37)%65+5} 65% ${search.value?85:72}%)`);t.textContent=`${stack(r)}\nself ${r.self_ms.toFixed(3)} ms; inclusive ${r.inclusive_ms.toFixed(3)} ms`;rect.append(t);rect.onclick=()=>{zoom=r.id;draw()};g.append(rect);if(w>45){const txt=document.createElementNS(g.namespaceURI,'text');txt.setAttribute('x',x+3);txt.setAttribute('y',d*24+16);txt.textContent=r.function.slice(0,Math.floor(w/7)-1);g.append(txt)}svg.append(g);let cx=x;for(const c of children.get(r.id)||[]){const cw=w*c.inclusive_ms/r.inclusive_ms;node(c,cx,cw,d+1);cx+=cw}}
let x=0;for(const r of roots){const w=1200*r.inclusive_ms/total;node(r,x,w,0);x+=w}svg.setAttribute('viewBox',`0 0 1200 ${(depth+1)*24}`);
const tbody=document.getElementById('rows');tbody.replaceChildren();for(const r of data.bottom_up.filter(r=>label(r).toLowerCase().includes(search.value.toLowerCase()))){const tr=document.createElement('tr');for(const v of [label(r),r.self_ms.toFixed(3),r.inclusive_ms.toFixed(3),r.samples]){const td=document.createElement('td');td.textContent=v;tr.append(td)}tbody.append(tr)}}
document.getElementById('totals').textContent=`${data.sample_count} samples; ${data.sampled_ms.toFixed(3)} ms sampled; ${data.profile_elapsed_ms.toFixed(3)} ms profile interval; self sum ${data.self_sum_ms.toFixed(3)} ms.`;
search.oninput=draw;document.getElementById('reset').onclick=()=>{zoom=null;draw()};draw();
</script>'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('profile', type=Path)
    parser.add_argument('--output', type=Path, required=True, help='HTML destination; JSON uses same stem')
    args = parser.parse_args()
    result = analyse(json.loads(args.profile.read_text()))
    args.output.write_text(render(result, args.profile.name))
    args.output.with_suffix('.json').write_text(json.dumps(result, indent=2)+'\n')
    print(f'{result["sample_count"]} samples, {result["sampled_ms"]:.3f} sampled ms; wrote {args.output.name}')


if __name__ == '__main__':
    main()
