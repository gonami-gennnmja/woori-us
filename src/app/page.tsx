import { redirect } from "next/navigation";

export default function RootPage() {
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  const groupId = `woori-${suffix}`;
  redirect(`/${groupId}`);
}
