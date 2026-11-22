# Reproducible technical samples

Independent demonstrations for Validune / Álvaro Mendoza, produced with code and AI. These use fictional data and are not previous client deployments or customer results.

[Live checker and current downloadable samples](https://alvaro-mendoza-json-data-qa.idbskdna.chatgpt.site).

## JSON localization QA

- [Interactive browser demonstration](index.html): download this HTML file and open it in a browser. It runs locally without sending the entered JSON to a server or storing it.
- [Sample report (PDF)](alvaro-mendoza-json-qa-sample-report.pdf).
- [Source, fictional fixtures and reports (ZIP)](alvaro-mendoza-json-qa-sample.zip).

The deliberately broken Spanish fixture produces five findings; a corrected fixture produces none under the supported checks. The Node.js checker has nine self-checks. It compares string paths, empty strings, simple placeholders and literal HTML-tag differences. It does not certify translations, parse ICU syntax, validate HTML structure or detect duplicate JSON object keys. Zero findings is not proof of complete correctness.

## Sales-to-Airtable integration prototype

- [Source, mock tests and reproduction instructions (ZIP)](alvaro-mendoza-integration-sample.zip).

The independent JavaScript prototype covers pagination, stable sale IDs, batched upserts and bounded retry cases. Twelve tests use simulated APIs. Transaction timestamps require a valid calendar date and an explicit timezone; regression cases cover impossible dates, leap days and timezone offsets. Replaying the sample events preserves two rows in the local simulator. This does not demonstrate a live production integration: scheduling, concurrency, recovery, credentials, schema and real-service behavior still require project-specific validation. Unknown or partial write outcomes require reconciliation; a recent-sales window alone does not guarantee detection of old refunds.

## Reproduction and integrity

The source files can also be inspected directly: [JSON checker](qa-localitzacio.mjs), [integration prototype](prototip.mjs), [integration tests](prototip.test.mjs) and [fictional sales](vendes-ficticies.json).

```sh
node qa-localitzacio.mjs --self-test
node --test prototip.test.mjs
node prototip.mjs
```

Unzip a sample and follow its included README. The browser demonstration requires no installation. The code samples require Node.js as specified in their instructions. `manifest.json` records each bundled sample's SHA-256 digest.

Please use fictional or anonymized data for initial evaluation. Tool permissions, data handling, scope and acceptance criteria must be agreed before any client work.

Contact: alvaromendoza.work@gmail.com
