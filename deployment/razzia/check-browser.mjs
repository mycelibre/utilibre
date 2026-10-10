import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '/home/ubuntu/freetools/portal/node_modules/playwright/index.mjs';
const r='/opt/utilibre/reports/new-services-20261009';const password=JSON.parse(fs.readFileSync('/opt/utilibre/razzia-data/game.json','utf8')).managerPassword;
const browser=await chromium.launch();const context=await browser.newContext();const hosts=new Set(),errors=[];
context.on('request',q=>{if(q.url().startsWith('http'))hosts.add(new URL(q.url()).hostname)});context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
try{
 const p=await context.newPage();await p.goto('https://quiz.utilibre.org/manager');await p.getByPlaceholder('Password').fill(password);await p.getByRole('button',{name:'Submit',exact:true}).click();await p.getByRole('button',{name:'Quizz',exact:true}).click();
 const row=p.locator('div.border-accent').filter({has:p.getByText('Fictional workshop quiz',{exact:true})});
 const download=p.waitForEvent('download');await row.getByTitle('Export quizz as JSON').click();const file=await download;await file.saveAs(r+'/razzia-fictional-export.json');const data=JSON.parse(fs.readFileSync(r+'/razzia-fictional-export.json','utf8'));assert.equal(data.subject,'Fictional workshop quiz');assert.equal(data.questions[0].question,'Which number follows one?');assert(!('id' in data));
 await p.getByRole('button',{name:'Results',exact:true}).click();const own=p.getByRole('button').filter({has:p.getByText('Fictional isolated restore quiz',{exact:true})});await own.first().click();await p.getByText('Which number follows one?',{exact:true}).waitFor();
 assert.deepEqual([...hosts],['quiz.utilibre.org']);assert.deepEqual(errors,[]);
 const result={realPublicHttps:true,nativeBrowserJsonDownload:true,quizIdOmittedFromExport:true,nativeResultsView:true,externalBrowserHosts:[],javascriptErrors:[],managerLogin:true};fs.writeFileSync(r+'/razzia-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close()}
