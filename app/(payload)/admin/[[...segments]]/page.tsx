import config from "@payload-config";
import { RootPage, generatePageMetadata } from "@payloadcms/next/views";
import { redirect } from "next/navigation";
import { importMap } from "../importMap.js";

type Args = {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
};

export const generateMetadata = ({ params, searchParams }: Args) =>
  generatePageMetadata({ config, params: params as never, searchParams });

export default async function AdminPage({ params, searchParams }: Args) {
  const resolvedParams = await params;
  if (!resolvedParams.segments || resolvedParams.segments.length === 0) {
    redirect("/admin/collections/nodes");
  }
  return RootPage({ config, params: params as never, searchParams, importMap });
}
