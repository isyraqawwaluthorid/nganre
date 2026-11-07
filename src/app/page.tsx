import Explorer from "@/components/Explorer";
import { getPlaces } from "@/lib/places";

export default async function Home() {
  const { places, source } = await getPlaces();
  return <Explorer places={places} source={source} />;
}
