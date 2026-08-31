import { DetailAppelOffre } from "@/components/detail-appel-offre";

export default async function Page({ params }: PageProps<"/appelsoffres/[id]">) {
  const { id } = await params;
  return <DetailAppelOffre id={Number(id)} />;
}