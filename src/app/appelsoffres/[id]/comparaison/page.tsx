import { Comparaison } from "@/components/comparaison";

export default async function Page({ params }: PageProps<"/appelsoffres/[id]/comparaison">) {
  const { id } = await params;
  return <Comparaison id={Number(id)} />;
}