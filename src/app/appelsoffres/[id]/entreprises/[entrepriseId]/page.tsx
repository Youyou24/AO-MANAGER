import { DetailEntrepriseAO } from "@/components/detail-entreprise-ao";

export default async function Page({
  params,
}: PageProps<"/appelsoffres/[id]/entreprises/[entrepriseId]">) {
  const { id, entrepriseId } = await params;
  return <DetailEntrepriseAO appelOffreId={Number(id)} entrepriseId={Number(entrepriseId)} />;
}