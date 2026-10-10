#!/usr/bin/env python3
"""Group pip-audit aliases; this is inventory, not exploitability analysis."""
import json, sys

def summarize(data):
    deps = data.get('dependencies', [])
    parents = {}
    def find(key):
        parents.setdefault(key, key)
        if parents[key] != key:
            parents[key] = find(parents[key])
        return parents[key]
    for dep in deps:
        for vuln in dep.get('vulns', []):
            keys = [vuln['id'], *vuln.get('aliases', [])]
            for key in keys:
                parents[find(key)] = find(keys[0])
    return {
        'packagesScanned': len(deps),
        'affectedPackageCount': sum(bool(d.get('vulns')) for d in deps),
        'advisoryRows': sum(len(d.get('vulns', [])) for d in deps),
        'distinctAdvisoryGroups': len({find(v['id']) for d in deps for v in d.get('vulns', [])}),
        'notAnExploitabilityCount': True,
        'perPackage': [{'name':d['name'],'version':d['version'],'rows':len(d['vulns']),
                        'uniqueAdvisoryGroups':len({find(v['id']) for v in d['vulns']})}
                       for d in deps if d.get('vulns')],
    }

if __name__ == '__main__':
    # Transitive aliases must merge even when the connecting row arrives last.
    check = {'dependencies':[{'name':'fixture','version':'1','vulns':[
        {'id':'A','aliases':['C']},{'id':'B','aliases':['D']},{'id':'C','aliases':['D']}]}]}
    assert summarize(check)['distinctAdvisoryGroups'] == 1
    with open(sys.argv[1]) as source:
        print(json.dumps(summarize(json.load(source)), indent=2))
