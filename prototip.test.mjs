import test from 'node:test';
import assert from 'node:assert/strict';
import {mapSale,syncSales,collectSales,requestJson} from './prototip.mjs';

const sale=(id='A')=>({id,email:'test@example.invalid',created_at:'2026-11-17T10:00:00Z',price:2500,currency:'usd',product_id:'P',refunded:false});
const good=data=>({ok:true,status:200,json:async()=>data});
test('preserves minor units, currency and a zero-price sale',()=>{
  const row=mapSale({...sale(),price:0});
  assert.equal(row.fields['Amount (minor units)'],0);
  assert.equal(row.fields.Currency,'USD');
});
test('rejects invalid dates, amounts, emails and boolean flags',()=>{
  for(const patch of [{created_at:'yesterday'},{price:2.5},{email:'broken'},{refunded:'false'}]) assert.throws(()=>mapSale({...sale(),...patch}));
});
test('replaying sales does not duplicate the mock Airtable rows',async()=>{
  const rows=new Map();
  const fetcher=async(_url,options)=>{
    const body=JSON.parse(options.body);
    assert.deepEqual(body.performUpsert.fieldsToMergeOn,['Sale ID']);
    for(const r of body.records)rows.set(r.fields['Sale ID'],r);
    return good({records:body.records});
  };
  const opts={fetcher,token:'demo',baseId:'demo',tableId:'demo',sleep:async()=>{}};
  await syncSales([sale(),sale(),sale('B')],opts);
  await syncSales([sale(),sale('B')],opts);
  assert.equal(rows.size,2);
});
test('batches at ten records and spaces writes',async()=>{
  const lengths=[],waits=[];
  await syncSales(Array.from({length:23},(_,i)=>sale(String(i))),{
    fetcher:async(_url,options)=>{const b=JSON.parse(options.body);lengths.push(b.records.length);return good({records:b.records});},
    token:'demo',baseId:'demo',tableId:'demo',sleep:async ms=>waits.push(ms)
  });
  assert.deepEqual(lengths,[10,10,3]);assert.deepEqual(waits,[250,250]);
});
test('rate limit waits and retries; permissions fail immediately',async()=>{
  let calls=0;const waits=[];
  const fetcher=async()=>++calls===1?{ok:false,status:429,headers:{get:()=> '31'}}:good({ok:true});
  await requestJson('mock',{}, {fetcher,sleep:async ms=>waits.push(ms)});
  assert.equal(calls,2);assert.deepEqual(waits,[31000]);
  let denied=0;
  await assert.rejects(requestJson('mock',{}, {fetcher:async()=>{denied++;return {ok:false,status:401};},sleep:async()=>{}}),/401/);
  assert.equal(denied,1);
});
test('pagination follows keys without following arbitrary next-page URLs',async()=>{
  const urls=[];
  const result=await collectSales({fetcher:async url=>{
    urls.push(url);return good(urls.length===1?{success:true,sales:[sale()],next_page_key:'next'}:{success:true,sales:[sale('B')]});
  },token:'demo',after:'2026-11-16',sleep:async()=>{}});
  assert.equal(result.length,2);assert.equal(new URL(urls[1]).searchParams.get('page_key'),'next');
});
test('repeated pagination keys stop incomplete sync',async()=>{
  await assert.rejects(collectSales({fetcher:async()=>good({success:true,sales:[],next_page_key:'same'}),token:'demo',after:'2026-11-16',sleep:async()=>{}}),/repeated/);
});
test('invalid source data produces no writes',async()=>{
  let writes=0;
  await assert.rejects(syncSales([sale(),{...sale('B'),price:'bad'}],{fetcher:async()=>{writes++;return good({records:[]});},sleep:async()=>{}}));
  assert.equal(writes,0);
});
test('unexpected API response is not reported as successful',async()=>{
  await assert.rejects(syncSales([sale()],{fetcher:async()=>good({records:[]}),sleep:async()=>{}}),/partial write/);
});
