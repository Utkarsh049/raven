import { getPayload } from "payload";
import config from "../payload.config";
async function main(){
  const payload = await getPayload({ config });
  const all = await payload.find({ collection: "nodes", pagination:false, depth:0, overrideAccess:true } as never);
  console.log("Deleting", all.docs.length, "nodes");
  for(const d of all.docs as any[]) {
    await payload.delete({ collection:"nodes", id:d.id, overrideAccess:true } as never);
  }
  console.log("Deleted");
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});
