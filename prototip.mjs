import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Local prototype: callers supply the fetch implementation. No live execution path exists in this CLI.
export function mapSale(sale) {
  if (!sale || typeof sale !== 'object') throw Error('Invalid sale');
  for(const field of ['id','email','created_at','currency','product_id']) {
    if(typeof sale[field]!=='string' || !sale[field].trim()) throw Error(`Missing or invalid ${field}`);
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sale.email)) throw Error('Invalid email');
  if(!/^\d{4}-\d{2}-\d{2}T/.test(sale.created_at) || !Number.isFinite(Date.parse(sale.created_at))) throw Error('Invalid date');
  if(!Number.isSafeInteger(sale.price) || sale.price<0) throw Error('Invalid price');
  if(!/^[a-z]{3}$/i.test(sale.currency)) throw Error('Invalid currency');
  if(sale.refunded!==undefined && typeof sale.refunded!=='boolean') throw Error('Invalid refunded flag');
  const fields={
    'Sale ID':sale.id,
    'Customer email':sale.email.trim(),
    'Transaction date':new Date(sale.created_at).toISOString(),
    'Amount (minor units)':sale.price,
    'Currency':sale.currency.toUpperCase(),
    'Product ID':sale.product_id,
  };
  if(sale.refunded!==undefined) fields.Refunded=sale.refunded;
  return {fields};
}

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function requestJson(url,options,{fetcher,sleep=pause,maxRetries=3,minimumRateDelayMs=30000,now=()=>Date.now()}={}) {
  if(typeof fetcher!=='function') throw Error('Explicit fetch implementation required');
  for(let attempt=0;;attempt++) {
    let response;
    try {
      response=await fetcher(url,options);
    } catch {
      // Do not automatically retry unknown writes after network failures without a confirmed idempotent policy.
      throw Error('Network failure; write outcome may be unknown');
    }
    if(response.ok) {
      try { return await response.json(); }
      catch { throw Error('Invalid API JSON response; write outcome may be unknown'); }
    }
    const retryable=response.status===429 || [500,502,503,504].includes(response.status);
    if(!retryable || attempt>=maxRetries) throw Error(`API HTTP ${response.status}`);
    const header=response.headers?.get?.('retry-after');
    let retryMs=0;
    if(header && /^\d+(\.\d+)?$/.test(header)) retryMs=Number(header)*1000;
    else if(header && Number.isFinite(Date.parse(header))) retryMs=Math.max(0,Date.parse(header)-now());
    await sleep(Math.max(retryMs,response.status===429?minimumRateDelayMs:0,1000*(2**attempt)));
  }
}

export async function collectSales({fetcher,token,after,maxPages=100,sleep}) {
  if(typeof after!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(after)) throw Error('Explicit after date required');
  const sales=[],seenPages=new Set();
  let key;
  for(let page=0;page<maxPages;page++) {
    const url=new URL('https://api.gumroad.com/v2/sales');
    url.searchParams.set('after',after);
    if(key) url.searchParams.set('page_key',key);
    // Auth headers and query support must be confirmed against the buyer's account before deployment.
    const data=await requestJson(url.toString(),{method:'GET',headers:{Authorization:`Bearer ${token}`}}, {fetcher,sleep});
    if(data.success!==true || !Array.isArray(data.sales)) throw Error('Invalid Gumroad response');
    sales.push(...data.sales);
    if(!data.next_page_key) {
      if(data.next_page_url) throw Error('Pagination URL supplied without expected key; adapter review required');
      return sales;
    }
    key=data.next_page_key;
    if(typeof key!=='string' || seenPages.has(key)) throw Error('Invalid or repeated page key');
    seenPages.add(key);
  }
  throw Error('Page limit reached; no complete sync claimed');
}

export async function syncSales(sales,{fetcher,token,baseId,tableId,sleep=pause}) {
  if(!Array.isArray(sales)) throw Error('Expected sales array');
  // Validate all entries before the first write. Use the last observed record for a repeated sale ID.
  const unique=new Map();
  for(const sale of sales) { const record=mapSale(sale); unique.set(record.fields['Sale ID'],record); }
  const records=[...unique.values()];
  let written=0;
  for(let i=0;i<records.length;i+=10) {
    if(i>0) await sleep(250);
    const batch=records.slice(i,i+10);
    const result=await requestJson(`https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`,{
      method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({performUpsert:{fieldsToMergeOn:['Sale ID']},records:batch,typecast:false})
    },{fetcher,sleep});
    if(!Array.isArray(result.records)||result.records.length!==batch.length) throw Error('Unexpected Airtable response; partial write outcome needs reconciliation');
    written+=batch.length;
  }
  return {input_sales:sales.length,unique_sales:records.length,acknowledged_records:written};
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const dir=path.dirname(fileURLToPath(import.meta.url));
  const sales=JSON.parse(fs.readFileSync(path.join(dir,'vendes-ficticies.json'),'utf8'));
  const rows=new Map();
  const mockFetch=async(_url,options)=>{
    const body=JSON.parse(options.body);
    for(const record of body.records) rows.set(record.fields['Sale ID'],record.fields);
    return {ok:true,status:200,json:async()=>({records:body.records.map((r,i)=>({id:`rec-demo-${i}`,...r}))})};
  };
  const config={fetcher:mockFetch,token:'DEMO_ONLY',baseId:'demo',tableId:'demo',sleep:async()=>{}};
  const first=await syncSales(sales,config),second=await syncSales(sales,config);
  process.stdout.write(JSON.stringify({mode:'LOCAL_MOCK_ONLY',first_run:first,second_run:second,final_row_count:rows.size,rows:[...rows.values()]},null,2)+'\n');
}
