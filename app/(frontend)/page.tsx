import { getPayload } from "payload";
import config from "@payload-config";
import { HomeView, type BranchItem, type YearItem } from "@/components/home/HomeView";

export const dynamicParams = true;
export const revalidate = 3600;

export default async function HomePage() {
  const payload = await getPayload({ config });

  // 1. Fetch published branches
  const branchesRes = await payload.find({
    collection: "nodes",
    where: { type: { equals: "branch" }, status: { equals: "published" } },
    sort: "orderIndex",
    pagination: false,
    depth: 0,
    select: { id: true, slug: true, title: true },
    overrideAccess: false,
  });
  const branches = (branchesRes.docs ?? []) as unknown as BranchItem[];

  // 2. Fetch published academic years for instant offline browsing
  const yearsRes = await payload.find({
    collection: "nodes",
    where: { type: { equals: "year" }, status: { equals: "published" } },
    sort: "orderIndex",
    pagination: false,
    depth: 0,
    select: { id: true, slug: true, title: true, parent: true },
    overrideAccess: false,
  });
  const years = (yearsRes.docs ?? []) as unknown as YearItem[];

  return <HomeView initialBranches={branches} initialYears={years} />;
}
