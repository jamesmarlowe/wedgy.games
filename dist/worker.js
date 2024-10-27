/*! For license information please see worker.js.LICENSE.txt */
(()=>{"use strict";var e={d:(t,s)=>{for(var i in s)e.o(s,i)&&!e.o(t,i)&&Object.defineProperty(t,i,{enumerable:!0,get:s[i]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}},t={};async function s(e,t){try{return await t()}catch(t){if("websocket"==e.headers.get("Upgrade")){let e=new WebSocketPair;return e[1].accept(),e[1].send(JSON.stringify({error:t.stack})),e[1].close(1011,"Uncaught exception during session setup"),new Response(null,{status:101,webSocket:e[0]})}return new Response(t.stack,{status:500})}}e.r(t),e.d(t,{ChatRoom:()=>r,RateLimiter:()=>n,default:()=>i});const i={fetch:async(e,t)=>await s(e,(async()=>{let s=new URL(e.url).pathname.slice(1).split("/");return"api"===s[0]?async function(e,t,s){if("room"===e[0]){if(!e[1]){if("POST"==t.method){let e=s.rooms.newUniqueId();return new Response(e.toString(),{headers:{"Access-Control-Allow-Origin":"*"}})}return new Response("Method not allowed",{status:405})}let i,r=e[1];if(r.match(/^[0-9a-f]{64}$/))i=s.rooms.idFromString(r);else{if(!(r.length<=32))return new Response("Name too long",{status:404});i=s.rooms.idFromName(r)}let n=s.rooms.get(i),a=new URL(t.url);return a.pathname="/"+e.slice(2).join("/"),n.fetch(a,t)}return new Response("Not found",{status:404})}(s.slice(1),e,t):new Response("Not found",{status:404})}))};class r{constructor(e,t){this.state=e,this.storage=e.storage,this.env=t,this.sessions=new Map,this.state.getWebSockets().forEach((e=>{let t=e.deserializeAttachment(),s=this.env.limiters.idFromString(t.limiterId),i=new a((()=>this.env.limiters.get(s)),(t=>e.close(1011,t.stack)));this.sessions.set(e,{...t,limiter:i,blockedMessages:[]})})),this.lastTimestamp=0}async fetch(e){return await s(e,(async()=>{if("/websocket"===new URL(e.url).pathname){if("websocket"!=e.headers.get("Upgrade"))return new Response("expected websocket",{status:400});let t=e.headers.get("CF-Connecting-IP"),s=new WebSocketPair;return await this.handleSession(s[1],t),new Response(null,{status:101,webSocket:s[0]})}return new Response("Not found",{status:404})}))}async handleSession(e,t){this.state.acceptWebSocket(e);let s=this.env.limiters.idFromName(t),i=new a((()=>this.env.limiters.get(s)),(t=>e.close(1011,t.stack))),r={limiterId:s,limiter:i,blockedMessages:[]};e.serializeAttachment({...e.deserializeAttachment(),limiterId:s.toString()}),this.sessions.set(e,r);for(let e of this.sessions.values())e.name&&r.blockedMessages.push(JSON.stringify({joined:e.name}));let n=[...(await this.storage.list({reverse:!0,limit:100})).values()];n.reverse(),n.forEach((e=>{r.blockedMessages.push(e)}))}async webSocketMessage(e,t){try{let s=this.sessions.get(e);if(s.quit)return void e.close(1011,"WebSocket broken.");if(!s.limiter.checkLimit())return void e.send(JSON.stringify({error:"Your IP is being rate-limited, please try again later."}));let i=JSON.parse(t);if(!s.name)return s.name=""+(i.name||"anonymous"),e.serializeAttachment({...e.deserializeAttachment(),name:s.name}),s.name.length>32?(e.send(JSON.stringify({error:"Name too long."})),void e.close(1009,"Name too long.")):(s.blockedMessages.forEach((t=>{e.send(t)})),delete s.blockedMessages,this.broadcast({joined:s.name}),void e.send(JSON.stringify({ready:!0})));if(i={name:s.name,message:""+i.message},i.message.length>256)return void e.send(JSON.stringify({error:"Message too long."}));i.timestamp=Math.max(Date.now(),this.lastTimestamp+1),this.lastTimestamp=i.timestamp;let r=JSON.stringify(i);this.broadcast(r);let n=new Date(i.timestamp).toISOString();await this.storage.put(n,r)}catch(t){e.send(JSON.stringify({error:t.stack}))}}async closeOrErrorHandler(e){let t=this.sessions.get(e)||{};t.quit=!0,this.sessions.delete(e),t.name&&this.broadcast({quit:t.name})}async webSocketClose(e,t,s,i){this.closeOrErrorHandler(e)}async webSocketError(e,t){this.closeOrErrorHandler(e)}broadcast(e){"string"!=typeof e&&(e=JSON.stringify(e));let t=[];this.sessions.forEach(((s,i)=>{if(s.name)try{i.send(e)}catch(e){s.quit=!0,t.push(s),this.sessions.delete(i)}else s.blockedMessages.push(e)})),t.forEach((e=>{e.name&&this.broadcast({quit:e.name})}))}}class n{constructor(e,t){this.nextAllowedTime=0}async fetch(e){return await s(e,(async()=>{let t=Date.now()/1e3;this.nextAllowedTime=Math.max(t,this.nextAllowedTime),"POST"==e.method&&(this.nextAllowedTime+=5);let s=Math.max(0,this.nextAllowedTime-t-20);return new Response(s)}))}}class a{constructor(e,t){this.getLimiterStub=e,this.reportError=t,this.limiter=e(),this.inCooldown=!1}checkLimit(){return!this.inCooldown&&(this.inCooldown=!0,this.callLimiter(),!0)}async callLimiter(){try{let e;try{e=await this.limiter.fetch("https://dummy-url",{method:"POST"})}catch(t){this.limiter=this.getLimiterStub(),e=await this.limiter.fetch("https://dummy-url",{method:"POST"})}let t=+await e.text();await new Promise((e=>setTimeout(e,1e3*t))),this.inCooldown=!1}catch(e){this.reportError(e)}}}})();
//# sourceMappingURL=worker.js.map