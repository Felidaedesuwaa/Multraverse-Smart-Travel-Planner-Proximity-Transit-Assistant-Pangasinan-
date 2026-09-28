// Read-only coverage audit; reports no user data or credentials.
const path = require('node:path')
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true})
const {MongoClient}=require('mongodb')
async function main(){
 const c=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000})
 try{ await c.connect(); const db=c.db();
 for(const name of ['places','localfoods']) console.log(name, JSON.stringify(await db.collection(name).aggregate([{$group:{_id:'$municipality',count:{$sum:1}}},{$sort:{_id:1}}]).toArray()))
 for(const name of ['plannerdrafts','trips','tripstops']) { const info=await db.listCollections({name}).toArray(); console.log(name,JSON.stringify({exists:!!info.length,count:info.length?await db.collection(name).countDocuments({}):0,hasGuidedSchema:!!info[0]?.options?.validator?.$jsonSchema?.properties?.plan?.properties?.guided})) }
 }finally{await c.close()}
}
main().catch(e=>{console.error(e.name);process.exitCode=1})
