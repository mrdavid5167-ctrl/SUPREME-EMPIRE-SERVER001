const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const PORT=Number(process.env.PORT||3000), ROOT=__dirname, DATA=path.join(ROOT,"data"), CONFIG=path.join(ROOT,"config");
fs.mkdirSync(DATA,{recursive:true}); fs.mkdirSync(CONFIG,{recursive:true});
const files={players:"players.json",nextPlayer:"nextPlayerId.json",nextCharacter:"nextCharacterId.json"};
const read=(f,d)=>{try{return fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8")):d}catch{return d}};
const write=(f,d)=>fs.writeFileSync(f+".tmp",JSON.stringify(d,null,2))||fs.renameSync(f+".tmp",f);
const cfg=(n,d)=>read(path.join(CONFIG,n),d);
let players=read(path.join(DATA,files.players),[]);
let nextPlayerId=Number(read(path.join(DATA,files.nextPlayer),{nextId:1}).nextId||1);
let nextCharacterId=Number(read(path.join(DATA,files.nextCharacter),{nextId:1}).nextId||1);
function save(){write(path.join(DATA,files.players),players);write(path.join(DATA,files.nextPlayer),{nextId:nextPlayerId});write(path.join(DATA,files.nextCharacter),{nextId:nextCharacterId})}
function uuid(){return crypto.randomUUID()}
function account(id){return players.find(x=>x.accountId===id)}
function character(a,id){return a&&a.characters.find(x=>String(x.characterId)===String(id))}
function taken(name,except){const n=name.toLowerCase();return players.some(a=>a.characters.some(c=>c.name.toLowerCase()===n&&String(c.characterId)!==String(except)))}
function newChar(name,skinId){return{characterId:nextCharacterId++,name,skinId:skinId||"skin_001",level:1,experience:0,money:0,seCoins:0,health:100,maxHealth:100,armor:0,maxArmor:100,hunger:100,food:100,faction:null,factionRank:0,vehicles:[],inventory:[],bankAccounts:[],properties:[],businesses:[],pets:[],jobs:[],missions:[],eventHistory:[],position:{x:0,y:0,z:0},statistics:{playSeconds:0,jobsCompleted:0,eventsCompleted:0,kills:0,deaths:0},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}
function charOut(c){return {...c}}
function accOut(a){return{accountId:a.accountId,playerId:a.playerId,maxCharacters:5,activeCharacterId:a.activeCharacterId,characters:a.characters.map(charOut)}}
const banks=cfg("banks.json",[]),factions=cfg("factions.json",[]),events=cfg("events.json",[]),vehicles=cfg("vehicles.json",[]),properties=cfg("properties.json",[]),businesses=cfg("businesses.json",[]),pets=cfg("pets.json",[]),shops=cfg("shops.json",[]);
const start=Date.now(),online=new Set();
save();
function send(res,status,obj){res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"GET,POST,PUT,OPTIONS","Cache-Control":"no-store"});res.end(JSON.stringify(obj))}
function body(req){return new Promise((ok,bad)=>{let s="";req.on("data",x=>s+=x);req.on("end",()=>{try{ok(s?JSON.parse(s):{})}catch{bad(Error("Invalid JSON"))}});req.on("error",bad)})}
async function route(req,res){
 if(req.method==="OPTIONS"){res.writeHead(204);return res.end()}
 const u=new URL(req.url,"http://localhost"),p=u.pathname;
 if(req.method==="GET"&&p==="/")return send(res,200,{name:"Supreme Empire",status:"online"});
 if(req.method==="GET"&&p==="/health")return send(res,200,{status:"ok",uptimeSeconds:Math.floor((Date.now()-start)/1000)});
 if(req.method==="GET"&&p==="/api/status")return send(res,200,{name:"Supreme Empire",status:"online",serverTime:new Date().toISOString(),uptimeSeconds:Math.floor((Date.now()-start)/1000),onlinePlayers:online.size,totalPlayers:players.length,banks:banks.length,factions:factions.length,missionsOptional:true,events});
 if(req.method==="GET"&&p==="/api/config")return send(res,200,{banks,factions,events,vehicles,properties,businesses,pets,shops});
 let m=p.match(/^\/api\/account\/([^/]+)$/);
 if(req.method==="POST"&&p==="/api/account"){const a={accountId:"acct_"+uuid(),playerId:nextPlayerId++,maxCharacters:5,activeCharacterId:null,characters:[],createdAt:new Date().toISOString()};players.push(a);save();return send(res,201,accOut(a))}
 if(req.method==="GET"&&m){const a=account(decodeURIComponent(m[1]));return a?send(res,200,accOut(a)):send(res,404,{error:"Account not found"})}
 m=p.match(/^\/api\/account\/([^/]+)\/characters$/);
 if(m&&req.method==="GET"){const a=account(decodeURIComponent(m[1]));return a?send(res,200,accOut(a)):send(res,404,{error:"Account not found"})}
 if(m&&req.method==="POST"){const a=account(decodeURIComponent(m[1]));if(!a)return send(res,404,{error:"Account not found"});let b;try{b=await body(req)}catch(e){return send(res,400,{error:e.message})};const name=String(b.name||"").trim();if(a.characters.length>=5)return send(res,409,{error:"Character limit reached",maxCharacters:5});if(!/^[A-Za-z0-9_ ]{2,24}$/.test(name))return send(res,400,{error:"Nickname must be 2-24 characters and use letters, numbers, spaces or underscores"});if(taken(name))return send(res,409,{error:"Nickname already taken"});const c=newChar(name,b.skinId);a.characters.push(c);if(!a.activeCharacterId)a.activeCharacterId=c.characterId;save();return send(res,201,{success:true,character:charOut(c),account:accOut(a)})}
 m=p.match(/^\/api\/account\/([^/]+)\/characters\/([^/]+)$/);
 if(m&&req.method==="GET"){const a=account(decodeURIComponent(m[1])),c=character(a,decodeURIComponent(m[2]));if(!a)return send(res,404,{error:"Account not found"});return c?send(res,200,{accountId:a.accountId,playerId:a.playerId,character:charOut(c)}):send(res,404,{error:"Character not found"})}
 m=p.match(/^\/api\/account\/([^/]+)\/characters\/([^/]+)\/data$/);
 if(m&&req.method==="GET"){const a=account(decodeURIComponent(m[1])),c=character(a,decodeURIComponent(m[2]));if(!a)return send(res,404,{error:"Account not found"});return c?send(res,200,{accountId:a.accountId,playerId:a.playerId,character:charOut(c)}):send(res,404,{error:"Character not found"})}
 m=p.match(/^\/api\/account\/([^/]+)\/characters\/([^/]+)\/select$/);
 if(m&&req.method==="POST"){const a=account(decodeURIComponent(m[1])),c=character(a,decodeURIComponent(m[2]));if(!a)return send(res,404,{error:"Account not found"});if(!c)return send(res,404,{error:"Character not found"});a.activeCharacterId=c.characterId;save();return send(res,200,{success:true,activeCharacterId:c.characterId,character:charOut(c)})}
 m=p.match(/^\/api\/account\/([^/]+)\/characters\/([^/]+)\/save$/);
 if(m&&(req.method==="POST"||req.method==="PUT")){const a=account(decodeURIComponent(m[1])),c=character(a,decodeURIComponent(m[2]));if(!a)return send(res,404,{error:"Account not found"});if(!c)return send(res,404,{error:"Character not found"});let b;try{b=await body(req)}catch(e){return send(res,400,{error:e.message})}if(b.name!==undefined){const n=String(b.name).trim();if(!/^[A-Za-z0-9_ ]{2,24}$/.test(n))return send(res,400,{error:"Invalid nickname"});if(n.toLowerCase()!==c.name.toLowerCase()&&taken(n,c.characterId))return send(res,409,{error:"Nickname already taken"});c.name=n}const allowed=["skinId","level","experience","money","seCoins","health","maxHealth","armor","maxArmor","hunger","food","faction","factionRank","vehicles","inventory","bankAccounts","properties","businesses","pets","jobs","missions","eventHistory","position","statistics"];for(const k of allowed)if(Object.prototype.hasOwnProperty.call(b,k))c[k]=b[k];c.updatedAt=new Date().toISOString();save();return send(res,200,{success:true,savedAt:c.updatedAt,character:charOut(c)})}
 return send(res,404,{error:"Not Found"})
}
http.createServer((q,r)=>route(q,r).catch(e=>send(r,500,{error:"Internal Server Error"}))).listen(PORT,"0.0.0.0",()=>console.log(`Supreme Empire server listening on 0.0.0.0:${PORT}`));
