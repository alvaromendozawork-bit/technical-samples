import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

// Lightweight JSON-string checks; not an ICU, HTML or linguistic validator.
function flatten(value, prefix = '', out = {}) {
  if (typeof value === 'string') out[prefix] = value;
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      // JSON Pointer escaping keeps literal keys and nested paths distinct.
      flatten(item, `${prefix}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`, out);
    }
  } else throw new Error(`Expected string or object at ${prefix || '/'}`);
  return out;
}

function variables(text) {
  return (text.match(/\{\{\s*[\w.]+\s*\}\}|\{[\w.]+\}|%\d*\$?[sdif]|:[A-Za-z_]\w*/g) || [])
    .map(x => x.replace(/\s+/g, '')).sort();
}

function tags(text) {
  return (text.match(/<\/?[A-Za-z][^>]*>/g) || []).sort();
}

export function audit(source, target) {
  const a = flatten(source), b = flatten(target), findings = [];
  for (const [key, value] of Object.entries(a)) {
    if (!Object.hasOwn(b, key)) {
      findings.push({key, type: 'MISSING_KEY'});
      continue;
    }
    if (!b[key].trim()) findings.push({key, type: 'EMPTY_VALUE'});
    if (JSON.stringify(variables(value)) !== JSON.stringify(variables(b[key]))) {
      findings.push({key, type: 'VARIABLE_MISMATCH'});
    }
    if (JSON.stringify(tags(value)) !== JSON.stringify(tags(b[key]))) {
      findings.push({key, type: 'HTML_TAG_DIFFERENCE'});
    }
  }
  for (const key of Object.keys(b)) {
    if (!Object.hasOwn(a, key)) findings.push({key, type: 'EXTRA_KEY'});
  }
  return findings;
}

function selfTest() {
  assert.deepEqual(audit({x:'Hello {name}'},{x:'Hola {name}'}), []);
  assert.equal(audit({x:'{name} {name}'},{x:'{name}'})[0].type,'VARIABLE_MISMATCH');
  assert.equal(audit({x:'{{ user.name }}'},{x:'{{user.other}}'})[0].type,'VARIABLE_MISMATCH');
  assert.equal(audit({a:{b:'one'}},{'a/b':'one'}).length,2);
  assert.equal(audit({x:'<b>Buy</b>'},{x:'Compra'})[0].type,'HTML_TAG_DIFFERENCE');
  assert.equal(audit({x:'Buy'},{x:' '})[0].type,'EMPTY_VALUE');
  assert.equal(audit({x:'Buy'},{} )[0].type,'MISSING_KEY');
  assert.equal(audit({}, {x:'Buy'})[0].type,'EXTRA_KEY');
  assert.throws(() => audit({x:5},{x:'5'}));
  process.stdout.write('9 checks passed\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
if (process.argv[2] === '--self-test') selfTest();
else if (process.argv.length >= 4) {
  const sourcePath = process.argv[2];
  const source = JSON.parse(fs.readFileSync(sourcePath,'utf8'));
  const result = process.argv.slice(3).map(file => ({
    file:path.basename(file), findings:audit(source,JSON.parse(fs.readFileSync(file,'utf8')))
  }));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
} else {
  process.stderr.write('Usage: node eines/qa-localitzacio.mjs source.json target.json [...]\n');
  process.exitCode = 1;
}
}
