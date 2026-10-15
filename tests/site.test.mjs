import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:4175';
let browser, server;
before(async()=>{
  server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4175','--strictPort'],{stdio:'pipe'});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Preview did not start')),15000);server.stdout.on('data',d=>{if(d.toString().includes('4175')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',code=>{if(code)reject(new Error(`Preview exited ${code}`));});});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  await mkdir('/tmp/dragonbornink-review',{recursive:true});
});
after(async()=>{await browser?.close();server?.kill();});
async function newPage(viewport={width:1440,height:1000}){const context=await browser.newContext({viewport});const page=await context.newPage();await page.goto(base);await page.evaluate(()=>document.fonts.ready);return page;}

test('desktop page loads local media without errors and has no horizontal overflow',async()=>{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const failures=[];
 page.on('pageerror',e=>failures.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
 await page.goto(base);await page.evaluate(()=>document.fonts.ready);
 for(const img of await page.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});}));assert.equal(await img.evaluate(img=>img.naturalWidth>0),true);}
 assert.deepEqual(failures,[]);assert.equal(await page.title(),'Dragonbornink | Blackwork & Realism Tattoo Artist, Los Angeles');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/dragonbornink-review/desktop.png',fullPage:true});await page.screenshot({path:'/tmp/dragonbornink-review/hero.png'});await page.close();
});

test('portfolio filtering, image viewer, escape key and enquiry handoff work',async()=>{
 const page=await newPage();await page.getByRole('button',{name:'Realism',exact:true}).click();assert.equal(await page.locator('.work-card:visible').count(),1);assert.match(await page.locator('#work-count').innerText(),/01 PIECE/);
 await page.getByRole('button',{name:'All work',exact:true}).click();assert.equal(await page.locator('.work-card:visible').count(),4);
 const card=page.getByRole('button',{name:'View Higher ground'});await card.click();assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);assert.equal(await card.evaluate(el=>el===document.activeElement),true);
 await card.click();await page.getByRole('button',{name:'Enquire about a piece'}).click();assert.match(await page.locator('[name=idea]').inputValue(),/Higher ground/);assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);await page.close();
});

test('form validates, prepares correct email and WhatsApp messages, downloads and edits',async()=>{
 const page=await newPage();await page.getByRole('button',{name:'Prepare my enquiry'}).click();assert.equal(await page.locator('#enquiry-form').evaluate(f=>f.checkValidity()),false);assert.equal(await page.locator('#enquiry-ready').isVisible(),false);
 await page.getByLabel('Your name',{exact:true}).fill('Jamie Example');await page.getByLabel('Your email',{exact:true}).fill('jamie@example.com');await page.getByLabel('Placement',{exact:true}).fill('Forearm');await page.getByLabel('Approximate size',{exact:true}).fill('15 × 20 cm');await page.getByLabel('Tattoo style',{exact:true}).selectOption('Realism');await page.getByLabel('Your idea',{exact:true}).fill('A detailed botanical piece & personal lettering.');await page.locator('[name=consent]').check();await page.getByRole('button',{name:'Prepare my enquiry'}).click();
 assert.equal(await page.locator('#enquiry-ready').isVisible(),true);const mail=new URL(await page.locator('#email-enquiry').getAttribute('href'));assert.equal(mail.pathname,'scottemmy717@gmail.com');assert.match(mail.searchParams.get('body'),/Jamie Example/);assert.match(mail.searchParams.get('body'),/botanical piece & personal lettering/);assert.match(mail.searchParams.get('subject'),/Jamie Example/);
 const whatsapp=new URL(await page.locator('#whatsapp-enquiry').getAttribute('href'));assert.equal(whatsapp.pathname,'/2349064203870');assert.equal(whatsapp.searchParams.get('text'),mail.searchParams.get('body'));
 const downloadPromise=page.waitForEvent('download');await page.locator('#download-brief').click();const download=await downloadPromise;assert.match(await readFile(await download.path(),'utf8'),/Jamie Example/);
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.locator('#copy-brief').click();await page.waitForFunction(()=>document.querySelector('#brief-status').textContent.length>0);assert.match(await page.locator('#brief-status').innerText(),/copied/);assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/Jamie Example/);
 await page.locator('#edit-brief').click();assert.equal(await page.getByLabel('Your name',{exact:true}).inputValue(),'Jamie Example');assert.equal(await page.locator('#enquiry-form').isVisible(),true);await page.close();
});

test('all five films decode and play; closing a viewer stops playback',async()=>{
 const page=await newPage();const options=await page.locator('[data-select-film]').all();assert.equal(options.length,5);
 for(const option of options){await option.click();const video=page.locator('#feature-video');await video.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#feature-video').currentTime>0.1);assert.equal(await video.evaluate(v=>v.error===null&&v.videoWidth>0),true);await video.evaluate(v=>v.pause());}
 await page.locator('[data-film="in-session"]').click();await page.locator('dialog video').evaluate(async v=>{v.muted=true;await v.play();});await page.getByRole('button',{name:'Close portfolio viewer'}).click();assert.equal(await page.locator('dialog video').evaluate(v=>v.paused),true);await page.close();
});

test('mobile navigation and responsive layouts work at 320, 390, 768 and 1024 pixels',async()=>{
 for(const width of [320,390,768,1024]){const page=await newPage({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow at ${width}`);
 if(width<680){await page.getByRole('button',{name:'Open navigation'}).click();await page.locator('#navigation').getByRole('link',{name:'The work',exact:true}).click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');await page.getByRole('button',{name:'Open navigation'}).click();await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');}
 if(width===390){for(const img of await page.locator('img').all())await img.scrollIntoViewIfNeeded();await page.locator('h1').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/dragonbornink-review/mobile.png',fullPage:true});await page.screenshot({path:'/tmp/dragonbornink-review/mobile-hero.png'});}
 await page.close();}
});

test('FAQ, policy routes, contact links and designer credit are present and correct',async()=>{
 const page=await newPage();await page.locator('summary').first().click();assert.equal(await page.locator('details').first().getAttribute('open'),'');
 assert.equal(await page.locator('.designer-credit').getAttribute('href'),'https://northbridgelogic.com');assert.ok(await page.locator('a[href="tel:+2349064203870"]').count()>0);
 for(const route of ['privacy','terms']){await page.goto(`${base}/${route}/`);assert.equal(await page.locator('h1').count(),1);assert.ok(await page.locator('.legal section').count()>=6);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await page.goto(`${base}/missing-page`);assert.match(await page.locator('h1').innerText(),/BACK TO/);await page.close();
});

test('automated accessibility checks pass on home, portfolio viewer, and policy pages',async()=>{
 const page=await newPage();let result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
 await page.getByRole('button',{name:'View Higher ground'}).click();result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
 await page.goto(`${base}/privacy/`);result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);await page.close();
});


test('desktop and mobile videos load on demand, autoplay in view, and pause outside it',async()=>{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:844}});
  const requests=[];page.on('request',r=>requests.push(r.url()));
  await page.goto(base);await page.evaluate(()=>document.fonts.ready);
  assert.equal(requests.some(url=>url.endsWith('.mp4')),false,'No video bytes on initial load');
  const video=page.locator('#feature-video');
  await video.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{const v=document.querySelector('#feature-video');return !v.paused&&v.currentTime>0.1;});
  assert.equal(await video.evaluate(v=>v.muted),true);
  assert.equal(await video.evaluate(v=>v.currentSrc.endsWith('-mobile.mp4')),width===390);
  await page.evaluate(()=>scrollTo(0,0));
  await page.waitForFunction(()=>document.querySelector('#feature-video').paused);
  await video.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>!document.querySelector('#feature-video').paused);
  await video.evaluate(v=>v.pause());
  // Native pause remains effective while the section stays in view.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await video.evaluate(v=>v.paused),true);
  await page.evaluate(()=>scrollTo(0,0));
  await page.waitForFunction(()=>document.querySelector('#feature-video').getBoundingClientRect().top>innerHeight);
  await video.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>!document.querySelector('#feature-video').paused);
  await page.evaluate(()=>document.querySelector('#work-dialog').showModal());
  await page.waitForFunction(()=>document.querySelector('#feature-video').paused);
  await page.evaluate(()=>document.querySelector('#work-dialog').close());
  await page.waitForFunction(()=>!document.querySelector('#feature-video').paused);
  await page.close();
 }
});

test('reduced motion and data saving keep playback under manual control',async()=>{
 for(const setting of ['motion','data']){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:setting==='motion'?'reduce':'no-preference'});
  if(setting==='data')await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true}}));
  await page.goto(base);const video=page.locator('#feature-video');await video.scrollIntoViewIfNeeded();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await video.evaluate(v=>v.paused),true);
  await video.evaluate(v=>v.play());
  await page.waitForFunction(()=>document.querySelector('#feature-video').currentTime>0.1);
  await page.evaluate(()=>scrollTo(0,0));
  await page.waitForFunction(()=>document.querySelector('#feature-video').paused);
  await page.close();
 }
});


test('all five mobile film choices play and switching while offscreen stays paused',async()=>{
 const page=await newPage({width:390,height:844});
 for(const option of await page.locator('[data-select-film]').all()){
  await option.click();
  const video=page.locator('#feature-video');await video.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{const v=document.querySelector('#feature-video');return !v.paused&&v.currentTime>0.1&&v.videoWidth>0;});
  assert.equal(await video.evaluate(v=>v.error),null);
 }
 await page.evaluate(()=>{scrollTo(0,0);});
 await page.waitForFunction(()=>document.querySelector('#feature-video').paused);
 await page.locator('[data-select-film]').first().evaluate(b=>b.click());
 assert.equal(await page.locator('#feature-video').evaluate(v=>v.paused),true);
 await page.close();
});
